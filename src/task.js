import {isMaster} from 'cluster';
import path from 'path';
import PluginInvoke from 'stc-plugin-invoke';
import debug from 'debug';
import fs from 'fs';
import {mkdir, promisify} from 'stc-helper';
import StcLog from 'stc-log';

import STC from './stc.js';

const pluginFileTime = debug('pluginFileTime');
const logInstance = new StcLog();

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
   * run plugin task
   */
  async runPlugin(pluginOptions, ext){
    //turn off plugin
    if(pluginOptions.on === false){
      return;
    }
    let pluginClass = PluginInvoke.getPluginClass(pluginOptions.plugin);
    let ie = this.stc.getIncludeAndExclude(pluginOptions);
    //no files matched
    let files = this.stc.resource.getFiles(ie.include, ie.exclude);
    if(!files.length){
      return;
    }
    
    let pluginName = pluginClass.name;
    
    let startTime = Date.now();
    let {options, cluster, cache} = pluginOptions;
    let ret = await PluginInvoke.run(pluginClass, files, {
      stc: this.stc,
      options,
      include: ie.include,
      cluster,
      cache,
      logger: pluginFileTime,
      ext
    });
    let endTime = Date.now();
    let aveTime = ((endTime - startTime) / files.length).toFixed(0);
    logInstance.display(colors => {
      return `${colors.green(pluginName)}: matchedFiles=${files.length}, totalTime=${endTime - startTime}ms, averageTime: ${aveTime}ms`;
    });

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
          console.error(err && err.stack || err);
        }
        process.exit(100);
        return;
      }
      this.stc.cluster.stop();
      let endTime = Date.now();
      console.log('Build finish, totalTime: ' + (endTime - startTime) + 'ms');
      process.exit(0);
    }
  }
}