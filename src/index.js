'use strict';

import Config from './config.js';
import Task from './task.js';
/**
 * all configs
 */
let configs = {};
/**
 * STC class
 */
const STC = class {
  /**
   * constructor
   */
  constructor(){
    this._env = '';
    this._config = null;
    
    this.env('default');
  }
  /**
   * get or set config
   */
  config(options){
    if(!options){
      return this._config.get();
    }
    this._config.set(options);
    return this;
  }
  /**
   * get or set env
   */
  env(env){
    if(env){
      if(!(env in configs)){
        configs[env] = new Config();
      }
      this._config = configs[env];
      this._env = env;
    }else{
      return this._env;
    }
    return this;
  }
  /**
   * set transpile config
   */
  transpile(options = {}){
    return this.config('transpile', options);
  }
  /**
   * set dependence config
   */
  dependence(options = {}){
    return this.config('dependence', options);
  }
  /**
   * set workflow config
   */
  workflow(options = {}){
    return this.config('workflow', options);
  }
  /**
   * set preset config
   */
  preset(preset, options = {}){
    preset = extend(preset, options);
    return this.config(preset);
  }
  /**
   * start workflow
   */
  start(){
    const instance = new Task(this.config());
    instance.run();
  }
};

module.exports = new STC();