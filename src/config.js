import {extend} from 'stc-helper';
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
      return this._config;
    }
    return this._config[name];
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