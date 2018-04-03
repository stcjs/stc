import debug from 'debug';
import StcCluster from 'stc-cluster';
import StcPlugin from 'stc-plugin';
import PluginInvoke from 'stc-plugin-invoke';
import StcCache from 'stc-cache';
import StcLog from 'stc-log';
//import {isMaster} from 'cluster';
import {extend} from 'stc-helper';

import {parse, stringify} from './ast.js';
import Resource from './resource.js';

import * as flkit from 'flkit';

import {
  master as masterHandles,
  worker as workerHandles
} from './cluster_handle.js';

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
    this.cache = StcCache; // cache class
    // store all cache instances
    this.cacheInstances = {};
    // flkit
    this.flkit = flkit;
    this.flkit.getFlkitInstance = this.getFlkitInstance.bind(this);
    this.log = new StcLog();
    this.debug = debug;
  }
  /**
   * get flkit instance
   */
  getFlkitInstance(type, text, options = {}){
    if(options.engine && !options.tpl){
      options.tpl = options.engine;
    }
    let cls = this.flkit[type];
    options = extend({}, this.config.tpl, options);
    let instance = new cls(text, options);
    if(options.adapter){
      instance.registerTpl(options.adapter);
    }
    return instance;
  }
  /**
   * get cluster instance
   */
  getClusterInstance(){
    let instance = new StcCluster({
      workers: this.config.workers,
      workerHandle: this.workerHandle.bind(this),
      masterHandle: this.masterHandle.bind(this),
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
   * invoked in master
   */
  masterHandle(config){
    let {method, type, pluginIndex, args, options, file} = config;

    let plugin = StcPlugin;
    // invoke plugin method if type & pluginIndex are specified
    if(type) {
      options = this.config[type][pluginIndex];
      if(!options){
        throw new Error(`plugin not found, type: ${type}, pluginIndex: ${pluginIndex}`);
      }
      plugin = options.plugin;
    } else if(masterHandles[method]){
      return masterHandles[method](config, this);
    }

    file = this.resource.getFileByPath(file);
    let instance = new PluginInvoke(plugin, file, {
      stc: this,
      options: options
    });
    return instance.invokePluginMethod(method, args);
  }
  /**
   * invoked in worker
   */
  workerHandle(config){
    let {type, pluginIndex, file} = config;

    if(workerHandles[type]){
      return workerHandles[type](config, this);
    }

    //invoke plugin
    let opts = this.config[type][pluginIndex];
    if(!opts){
      throw new Error(`plugin not found, type: ${type}, pluginIndex: ${pluginIndex}`);
    }

    let ie = this.getIncludeAndExclude(opts);
    file = this.resource.createFile(file);
    let {options, cluster, cache} = opts;
    let instance = new PluginInvoke(opts.plugin, file, {
      stc: this,
      options,
      include: ie.include,
      cluster,
      cache,
      logger: pluginFileTime,
      ext: {
        type,
        pluginIndex
      }
    });
    return instance.run();
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
}