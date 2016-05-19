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
      template: {
        engine: '',
        adapter: '',
        ld: [],
        rd: [],
        include: [],
        exclude: [],
        jsTpl: {
          type: [],
          engine: [],
          adapter: '',
          ld: '',
          rd: ''
        }
      },
      static: {
        include: [],
        exclude: []
      }
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
       this._config[key] = name[key];
     }
     return this;
   }
   this._config[name] = value;
   return this; 
  }
}