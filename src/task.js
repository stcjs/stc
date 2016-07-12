import {isMaster} from 'cluster';
import path from 'path';
import PluginInvoke from 'stc-plugin-invoke';
import debug from 'debug';
import fs from 'fs';
import {mkdir, promisify} from 'stc-helper';

import STC from './stc.js';

const pluginFilesLog = debug('pluginMatchedFiles');
const pluginFileTime = debug('pluginFileTime');
const pluginTime = debug('pluginTotalTime');

/**
 * Task class
 */
export default class Task {
  /**
   * constructor
   */
  constructor(config){
    this.config = config;
    this.stc = new STC(config);
  }
  /**
   * get include and exclude
   */
  getIncludeAndExclude(pluginOptions){
    let {include, exclude} = pluginOptions;
    let pluginClass = PluginInvoke.getPluginClass(pluginOptions.plugin);
    if(!include){
      include = pluginClass.include;
      if(typeof include === 'function'){
        include = include();
      }
    }
    if(!exclude){
      exclude = pluginClass.exclude;
      if(typeof exclude === 'function'){
        exclude = exclude();
      }
    }
    return {include, exclude};
  }
  /**
   * run plugin task
   */
  async runPlugin(pluginOptions, ext){
    //turn off plugin
    if(pluginOptions.on === false){
      return;
    }
    let pluginClass = PluginInvoke.getPluginClass(pluginOptions.plugin);
    let ie = this.getIncludeAndExclude(pluginOptions);
    //no files matched
    let files = this.stc.resource.getFiles(ie.include, ie.exclude);
    if(!files.length){
      return;
    }
    
    let pluginName = pluginClass.name;
    let consoleFiles = JSON.stringify(files.map(file => file.path));
    pluginFilesLog(`${pluginName}: length=${files.length}, files=${consoleFiles}`);

    
    let startTime = Date.now();
    let {options, include, cluster, cache} = pluginOptions;
    let ret = await PluginInvoke.run(pluginClass, files, {
      stc: this.stc,
      options,
      include,
      cluster,
      cache,
      logger: pluginFileTime,
      ext
    });
    let endTime = Date.now();
    pluginTime(`${pluginName}: files=${files.length}, time=${endTime - startTime}ms`);

    return ret;
  }
  /**
   * parallel to execute
   */
  parallel(type){
    let config = this.config[type];
    if(!config){
      return;
    }
    let promises = config.map((item, pluginIndex) => {
      return this.runPlugin(item, {
        type,
        pluginIndex
      });
    });
    return Promise.all(promises);
  }
  /**
   * serial to execute
   */
  async serial(type){
    let config = this.config[type];
    if(!config){
      return;
    }
    let length = config.length;
    for(let i = 0; i < length; i++){
      await this.runPlugin(config[i], {
        type,
        pluginIndex: i
      });
    }
  }
  /**
   * output files
   */
  output(){
    let outputPath = this.config.outputPath;
    let files = this.stc.resource.files;
    let promises = files.map(async (file) => {
      // ignore virtual file
      if(file.prop('virtual')){
        return;
      }
      let savePath = path.join(outputPath, file.path);
      mkdir(path.dirname(savePath));
      let content = await file.getContent();
      let writeFile = promisify(fs.writeFile, fs);
      return writeFile(savePath, content);
    });
    return Promise.all(promises);
  }
  /**
   * run
   */
  async run(){
    if(isMaster){
      let startTime = Date.now();
      try{
        await this.parallel('lint');
        await this.parallel('transpile');
        await this.parallel('dependence');
        await this.serial('workflow');
        await this.output();
      }catch(err){
        // error message is json data
        if(err.message[err.message.length - 1] === '}'){
          try{
            err = JSON.parse(err.message.slice(err.message.indexOf('{')));
          }catch(e){}
        }

        if(err.className){
          this.stc.log.display(err, 'error');
        }else{
          console.error(err);
        }
        process.exit(100);
        return;
      }
      //this.cluster.stop();
      let endTime = Date.now();
      console.log('Build finish, Total time: ' + (endTime - startTime) + 'ms');
      process.exit(0);
    }
  }
}