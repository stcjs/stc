'use strict';

require('babel-runtime/core-js/promise').default = require('bluebird');
global.Promise = require('bluebird');

import Config from './config.js';
import Task from './task.js';
import {isObject, extend} from 'stc-helper';

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
   * translate config
   */
  transConf(options = {}){
    if(isObject(options)){
      return Object.keys(options).map(item => {
        let val = options[item];
        val.name = item;
        return val;
      });
    }
    return options;
  }
  /**
   * set transpile config
   */
  transpile(options){
    return this.config({'transpile': this.transConf(options)});
  }
  /**
   * set dependence config
   */
  dependence(options = {}){
    return this.config({'dependence': this.transConf(options)});
  }
  /**
   * set workflow config
   */
  workflow(options = {}){
    return this.config({'workflow': this.transConf(options)});
  }
  /**
   * set preset config
   */
  preset(preset, options = {}){
    let list = ['common', 'template', 'static', 'transpile', 'dependence', 'workflow'];
    let flag = list.some(item => {
      return item in options;
    });
    if(!flag){
      options = {workflow: options};
    }
    options.transpile = this.transConf(options.transpile);
    options.dependence = this.transConf(options.dependence);
    options.workflow = this.transConf(options.workflow);
    
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