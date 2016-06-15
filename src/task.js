import {isMaster} from 'cluster';
import path from 'path';
import PluginInvoke from 'stc-plugin-invoke';
import debug from 'debug';
import fs from 'fs';
import {mkdir, promisify} from 'stc-helper';

import STC from './stc.js';

const pluginFilesLog = debug('pluginFiles');
const pluginFileTime = debug('pluginFileTime');
const pluginTime = debug('pluginTime');

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
  async runPluginTask(pluginOptions, ext){
    //turn off plugin
    if(pluginOptions.on === false){
      return;
    }
    let {include, exclude} = pluginOptions;
    //no files matched
    let files = this.stc.resource.getFiles(include, exclude);
    if(!files.length){
      return;
    }
    let pluginName = PluginInvoke.getPluginClass(pluginOptions.plugin).name;
    let consoleFiles = this.stc.resource.getConsoleFiles(files);
    pluginFilesLog(`${pluginName}: length=${files.length}, files=${consoleFiles}`);
    let startTime = Date.now();
    let ret = await PluginInvoke.runAll(pluginOptions.plugin, files, {
      stc: this.stc,
      options: pluginOptions.options,
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
      return this.runPluginTask(item, {
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
      await this.runPluginTask(config[i], {
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
        console.log(err);
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