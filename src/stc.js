import debug from 'debug';
import StcCluster from 'stc-cluster';
import StcPlugin from 'stc-plugin';
import PluginInvoke from 'stc-plugin-invoke';
import StcCache from 'stc-cache';
import {TokenType} from 'flkit';

import {parse, stringify} from './ast.js';
import Resource from './resource.js';

const clusterLog = debug('cluster');
const pluginFileTime = debug('pluginFileTime');

/**
 * STC class
 */
export default class STC {
  /**
   * constructor
   */
  constructor(config){
    this.config = config;
    this.resource = this.getResourceInstance();
    this.cluster = this.getClusterInstance();
    this.cache = StcCache;
    this.TokenType = TokenType;
  }
  /**
   * get cluster instance
   */
  getClusterInstance(){
    let instance = new StcCluster({
      workers: this.config.workers,
      taskHandler: this.taskHandler.bind(this),
      invokeHandler: this.invokeHandler.bind(this),
      logger: clusterLog
    });
    if(this.config.cluster !== false){
      instance.start();
    }
    return instance;
  }
  /**
   * get resource instance
   */
  getResourceInstance(){
    let instance = new Resource(this.config, {
      parse: (...args) => {
        return parse(...args, this.config);
      },
      stringify: (...args) => {
        return stringify(...args, this.config);
      }
    });
    return instance;
  }
  /**
   * task handler, invoked in worker
   */
  async taskHandler(config){
    let {type, pluginIndex, file} = config;
    
    //get file ast
    if(type === 'getAst'){
      file = await this.getFileInWorker(file);
      file.setContent(config.content);
      return file.getAst();
    }
    
    //invoke plugin
    let plugin = this.config[type][pluginIndex];
    if(!plugin){
      throw new Error(`plugin not found type: ${type}, pluginIndex: ${pluginIndex}`);
    }
    
    file = await this.getFileInWorker(file);
    let instance = new PluginInvoke(plugin.plugin, file, {
      stc: this,
      options: plugin.options,
      logger: pluginFileTime,
      ext: {
        type,
        pluginIndex
      }
    });
    return instance.run();
  }
  /**
   * invoke handler, invoked in master
   */
  invokeHandler(config){
    let {method, args, options, file} = config;
    file = this.resource.getFileByPath(file);
    if(method === 'getFileByPath'){
      return file.pathHistory;
    }
    let instance = new PluginInvoke(StcPlugin, file, {
      stc: this,
      options: options
    });
    return instance.invokePluginMethod(method, args);
  }
  /**
   * get file in worker
   */
  async getFileInWorker(filepath){
    let file = this.resource.getFileByPath(filepath);
    if(file){
      return file;
    }
    let pathHistory = await this.cluster.invoke({
      method: 'getFileByPath',
      file: filepath
    });
    file = this.resource.getFileByPathHistory(pathHistory);
    return file;
  }
}