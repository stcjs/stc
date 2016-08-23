'use strict';

require('babel-runtime/core-js/promise').default = require('bluebird');
global.Promise = require('bluebird');

import {isObject, extend} from 'stc-helper';

import Config from './config.js';
import Task from './task.js';

import sourceMapSuppert from 'source-map-support';

sourceMapSuppert.install({
  environment: 'node',
  emptyCacheBetweenOperations: true
});

/**
 * all configs
 */
let configs = {};
/**
 * Application class
 */
const Application = class Application {
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
   * lint
   */
  lint(options){
    return this.config({lint: this.transConf(options)});
  }
  /**
   * set transpile config
   */
  transpile(options){
    return this.config({transpile: this.transConf(options)});
  }
  /**
   * set dependence config
   */
  dependence(options = {}){
    return this.config({dependence: this.transConf(options)});
  }
  /**
   * set workflow config
   */
  workflow(options = {}){
    return this.config({workflow: this.transConf(options)});
  }
  /**
   * set preset config
   */
  preset(preset, options = {}){
    if(preset.default && preset.__esModule) {
      preset = preset.default;
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
    let config = this.config();
    const {ld, rd} = config.tpl;
    if(!Array.isArray(ld)){
      config.tpl.ld = [ld];
    }
    if(!Array.isArray(rd)){
      config.tpl.rd = [rd];
    }
    // for calculate cache key
    config._tplCacheKey = JSON.stringify(config.tpl) + JSON.stringify(config.jsTpl);
    
    let instance = new Task(config);
    instance.run();
  }
};

module.exports = new Application();