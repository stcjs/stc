import debug from 'debug';
import cluster from 'cluster';
import StcCluster from 'stc-cluster';
import StcPlugin from 'stc-plugin';
import InvokePlugin from 'stc-plugin-invoke';

import astHandle from './ast_handle.js';
import FileManage from './file_manage.js';

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
    this.fileManage = new FileManage(this.config, astHandle);
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
      logger: msg => {
        clusterDebug(msg);
      }
    });
    if(this.config.common.cluster !== false){
      instance.start();
    }
    return instance;
  }
  /**
   * task handler, invoked in worker
   */
  taskHandler(config){
    let {type, pluginIndex, file} = config;
    //get file ast
    if(type === 'getAst'){
      file = this.fileManage.getFileByPath(file);
      file.setContent(config.content);
      return file.getAst();
    }
    
    //invoke plugin
    let {plugin, options} = this.config[type][pluginIndex];
    if(!plugin){
      throw new Error(`plugin not found type: ${type}, pluginIndex: ${pluginIndex}`);
    }
    file = this.fileManage.getFileByPath(file);
    let instance = new InvokePlugin(plugin, file, {
      config: this.config,
      options,
      fileManage: this.fileManage,
      cluster: this.cluster
    });
    return instance.run();
  }
  /**
   * invoke handler, invoked in master
   */
  invokeHandler(config){
    let {method, args, options, file} = config;
    file = this.fileManage.getFileByPath(file);
    let instance = new InvokePlugin(StcPlugin, file, {
      config: this.config,
      options: options,
      fileManage: this.fileManage,
      cluster: this.cluster
    });
    return instance.invokePluginMethod(method, args);
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
    return InvokePlugin.runAll(pluginOptions.plugin, files, {
      config: this.config,
      options: pluginOptions.options,
      cluster: this.cluster,
      fileManage: this.fileManage,
      extConf
    });
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
   * run
   */
  async run(){
    if(cluster.isMaster){
      console.time('task');
      try{
        await this.parallel('transpile');
        //await this.parallel('dependence');
        //await this.serial('workflow');
      }catch(err){
        console.log(err);
        process.exit(100);
      }
      this.cluster.stop();
      console.timeEnd('task');
    }
    
  }
}