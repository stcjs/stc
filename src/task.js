import FileManage from './file_manage.js';
import {isObject, mkdir, isFunction} from 'stc-helper';
import debug from 'debug';
import cluster from 'cluster';
import os from 'os';
import StcCluster from 'stc-cluster';
import StcPlugin from 'stc-plugin';
import astHandle from './ast_handle.js';

const clusterDebug = debug('cluster');

/**
 * task class
 */
export default class {
  /**
   * constructor
   */
  constructor(config){
    this.config = config;
    this.fileManage = null;
    this.cluster = new StcCluster({
      workers: config.common.workers,
      taskHandler: this.taskHandler.bind(this),
      invokeHandler: this.invokeHandler.bind(this),
      logger: msg => {
        clusterDebug(msg);
      }
    });
  }
  /**
   * task handler, invoked in worker
   */
  taskHandler(config){
    let {type, pluginIndex, file, options} = config;
    //get file ast
    if(type === 'getAst'){
      file = this.fileManage.getFileByPath(file);
      file.setContent(config.content);
      return file.getAst();
    }
    
    //invoke plugin
    let plugin = this.config[type][pluginIndex].plugin;
    if(!plugin){
      throw new Error(`plugin not found type: ${type}, pluginIndex: ${pluginIndex}`);
    }
    file = this.fileManage.getFileByPath(file);
    return this.invokePlugin(plugin, file, options);
  }
  /**
   * invoke handler, invoked in master
   */
  invokeHandler(config){
    let {method, args, options, file} = config;
    file = this.fileManage.getFileByPath(file);
    let cls = this.getPluginClass(StcPlugin);
    let instance = new cls(file, options, this.config, this.cluster);
    return instance[method](...args);
  }
  /**
   * get plugin class
   */
  getPluginClass(plugin){
    if(plugin && plugin.__esModule){
      return plugin.default;
    }
    return plugin;
  }
  /**
   * invokePlugin
   */
  invokePlugin(plugin, file, options, useCluster, config = {}){
    let cls = this.getPluginClass(plugin);
    if(cluster.isMaster){
      if(!useCluster){
        useCluster = cls.cluster;
        if(isFunction(useCluster)){
          useCluster = useCluster();
        }
      }
      if(useCluster){
        return this.cluster.doTask({
          type: config.type,
          pluginIndex: config.pluginIndex,
          file: file.path,
          options
        });
      }
    }
    return file.promise.then(() => {
      let instance = new cls(file, options, this.config, this.cluster);
      let promise = Promise.resolve(instance.run());
      file.promise = promise;
      return promise;
    });
  }
  /**
   * parallel
   */
  parallel(type, callback){
    let config = this.config[type];
    if(!config){
      return;
    }
    let promises = config.map((item, pluginIndex) => {
      //close task for temporary
      if(item.on === false){
        return;
      }
      let files = this.fileManage.getFiles(item.include, item.exclude);
      if(!files.length){
        return;
      }
      let {plugin, options} = item;
      let promises = files.map(file => {
        return this.invokePlugin(plugin, file, options, false, {
          pluginIndex,
          type
        }).then(data => {
          let cls = this.getPluginClass(plugin);
          //plugin callback in master
          if(cls.prototype.update){
            let instance = new cls(file, options, this.config);
            return instance.update(data);
          }
          return callback && callback(file, data);
        });
      });
      return Promise.all(promises);
    });
    return Promise.all(promises);
  }
  /**
   * serial
   */
  async serial(type){
    let config = this.config[type];
    if(!config){
      return;
    }
    let keys = [];
    if(isObject(config)){
      keys = Object.keys(config);
      config = keys.map(key => config[key]);
    }
    for(let i = 0, length = config.length; i < length; i++){
      let item = config[i];
      if(item.on === false){
        continue;
      }
      let files = this.fileManage.getFiles(item.include, item.exclude);
      if(!files.length){
        return;
      }
      let {plugin, options} = item;
      let promises = files.map(file => {
        return file.promise.then(() => {
          let instance = new plugin(file, options, this.config);
          let promise = instance.run();
          file.promise = promise;
          return promise;
        });
      });
      await Promise.all(promises);
    }
  }
  /**
   * transpile callback
   */
  transpileCallback(file, ret){
    console.log(file, ret)
  }
  /**
   * run
   */
  async run(){
    this.fileManage = new FileManage(this.config, astHandle);
    if(cluster.isMaster){
      try{
        await this.parallel('transpile', this.transpileCallback.bind(this));
        //await this.parallel('dependence');
        //await this.serial('workflow');
      }catch(err){
        console.log(err);
        process.exit(100);
      }
      this.cluster.stop();
    }
  }
}