import {extend, mkdir} from 'stc-helper';
import os from 'os';
import path from 'path';

const homePath = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
const tmpPath = os.tmpdir();
//import stcDepParser from 'stc-dep-parser';
/**
 * config class
 */
export default class {
  /**
   * constructor
   */
  constructor(){
    /**
     * default config
     */
    this._config = {
      //product: 'default',
      workers: 0,
      cluster: true,
      cache: true,
      cachePath: '', //cache path
      include: '.',
      exclude: '',
      defaultExclude: [/Thumbs\.db$/i, /\.svn|\.git/, /\.DS_Store$/i],
      outputPath: 'output',
      pathHandle: undefined,
      tpl: {
        extname: 'html',
        engine: '',
        adapter: undefined,
        ld: '',
        rd: ''
      },
      jsTpl: {
        type: ['text/html', 'text/template'],
        engine: '',
        adapter: undefined,
        ld: '',
        rd: ''
      },
      dependence: [
        //{plugin: stcDepParser, name: 'defaultDepParser', include: [{type: 'tpl'}]}
      ]
    };
  }
  /**
   * get config
   */
  get(name){
    if(!name){
      return this.parseConfig(this._config);
    }
    return this._config[name];
  }
  /**
   * parse config
   */
  parseConfig(config){
    // verify config.product
    if(!config.product || !/^[\w\.]+$/.test(config.product)){
      console.error('config.product must be set, pattern is /^[\w\.]+$/');
      process.exit(100);
      return;
    }

    const {ld, rd} = config.tpl;
    if(!Array.isArray(ld)){
      config.tpl.ld = [ld];
    }
    if(!Array.isArray(rd)){
      config.tpl.rd = [rd];
    }
    // make config.include be array
    if(!Array.isArray(config.include)){
      config.include = [config.include];
    }
    // for calculate cache key
    config._tplCacheKey = JSON.stringify(config.tpl) + JSON.stringify(config.jsTpl);
    config.cachePath = this.getCachePath(config.cachePath);
    return config;
  }
  /**
   * get cache path
   */
  getCachePath(cachePath){
    let list = [
      path.join(homePath, '.stc/'),
      path.join(tmpPath, '.stc/')
    ];
    if(cachePath){
      list.unshift(cachePath);
    }
    for(let i = 0, length = list.length; i < length; i++){
      let item = list[i];
      if(mkdir(item)){
        return item;
      }
    }
  }
  /**
   * set config
   */
  set(name, value){
   if(typeof name === 'object'){
     this._config = extend(this._config, name);
     return this;
   }
   this._config[name] = extend(this._config[name], value);
   return this; 
  }
}