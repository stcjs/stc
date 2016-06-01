import {extend} from 'stc-helper';
import stcDep from 'stc-dep';
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
      common: {
        exclude: [/Thumbs\.db$/i, /\.svn|\.git/, /\.DStore/i],
        outputPath: 'output'
      },
      template: {
        engine: '',
        adapter: '',
        ld: [],
        rd: [],
        include: [],
        exclude: [],
        jsTpl: {
          type: ['text/html', 'text/template'],
          engine: '',
          adapter: '',
          ld: '',
          rd: ''
        }
      },
      static: {
        include: [],
        exclude: []
      },
      dependence: [
        {plugin: stcDep, name: 'defaultDepParser', include: [{type: 'template'}]}
      ]
    };
  }
  /**
   * get config
   */
  get(name){
    if(!name){
      return this._config;
    }
    return this._config[name];
  }
  /**
   * set config
   */
  set(name, value){
   if(typeof name === 'object'){
     for(let key in name){
       this._config[key] = extend(this._config[key], name[key]);
     }
     return this;
   }
   this._config[name] = extend(this._config[name], value);
   return this; 
  }
}