import debug from 'debug';
import cluster from 'cluster';
import StcCluster from 'stc-cluster';
import StcPlugin from 'stc-plugin';
import InvokePlugin from 'stc-plugin-invoke';
import path from 'path';
import fs from 'fs';
import {mkdir, promisify} from 'stc-helper';

import {parse, stringify} from './ast_handle.js';
import FileManage from './file_manage.js';

const clusterLog = debug('cluster');
const pluginTime = debug('pluginTime');
const pluginFileTime = debug('pluginFileTime');
const pluginFilesLog = debug('pluginFiles');

/**
 * task class
 */
export default class {
  /**
   * constructor
   */
  constructor(config){
    this.config = config;
    this.fileManage = new FileManage(this.config, {
      parse: (...args) => {
        return parse(...args, this.config);
      },
      stringify: (...args) => {
        return stringify(...args, this.config);
      }
    });
    this.cluster = this.getClusterInstance();
  }
  /**
   * get cluster instance
   */
  getClusterInstance(){
    let instance = new StcCluster({
      workers: this.config.common.workers,
      taskHandler: this.taskHandler.bind(this),
      invokeHandler: this.invokeHandler.bind(this),
      logger: clusterLog
    });
    if(this.config.common.cluster !== false){
      instance.start();
    }
    return instance;
  }
  /**
   * task handler, invoked in worker
   */
  async taskHandler(config){
    let {type, pluginIndex, file, forceInMaster} = config;
    //get file ast
    if(type === 'getAst'){
      file = await this.getFileInWorker(file);
      file.setContent(config.content);
      return file.getAst();
    }
    //invoke plugin
    let {plugin, options} = this.config[type][pluginIndex];
    if(!plugin){
      throw new Error(`plugin not found type: ${type}, pluginIndex: ${pluginIndex}`);
    }
    file = await this.getFileInWorker(file);
    let instance = new InvokePlugin(plugin, file, {
      config: this.config,
      options,
      fileManage: this.fileManage,
      cluster: this.cluster,
      logger: pluginFileTime,
      extConf: {
        forceInMaster
      }
    });
    return instance.run();
  }
  /**
   * invoke handler, invoked in master
   */
  invokeHandler(config){
    let {method, args, options, file} = config;
    file = this.fileManage.getFileByPath(file);
    if(method === 'getFileByPath'){
      return file.pathHistory;
    }
    let instance = new InvokePlugin(StcPlugin, file, {
      config: this.config,
      options: options,
      fileManage: this.fileManage,
      cluster: this.cluster
    });
    return instance.invokePluginMethod(method, args);
  }
  /**
   * get file in worker
   */
  async getFileInWorker(filepath){
    let file = this.fileManage.getFileByPath(filepath);
    if(file){
      return file;
    }
    let pathHistory = await this.cluster.invoke({
      method: 'getFileByPath',
      file: filepath
    });
    file = this.fileManage.getFileByPathHistory(pathHistory);
    return file;
  }
  /**
   * run plugin task
   */
  async runPluginTask(pluginOptions, extConf){
    //turn off plugin
    if(pluginOptions.on === false){
      return;
    }
    //no files matched
    let files = this.fileManage.getFiles(pluginOptions.include, pluginOptions.exclude);
    if(!files.length){
      return;
    }
    let pluginName = InvokePlugin.getPluginClass(pluginOptions.plugin).name;

    pluginFilesLog(`${pluginName}: length=${files.length}, files=${this.fileManage.getConsoleFiles(files)}`);
    let startTime = Date.now();
    let ret = await InvokePlugin.runAll(pluginOptions.plugin, files, {
      config: this.config,
      options: pluginOptions.options,
      cluster: this.cluster,
      fileManage: this.fileManage,
      extConf,
      logger: pluginFileTime
    });
    let endTime = Date.now();
    
    pluginTime(`${pluginName}: length=${files.length}, time=${endTime - startTime}ms`);
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
    let outputPath = this.config.common.outputPath;
    let files = this.fileManage.files;
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
    if(cluster.isMaster){
      let startTime = Date.now();
      try{
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