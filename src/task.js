import FileManage from './file_manage.js';
import {isObject} from 'stc-helper';
import debug from 'debug';

/**
 * task class
 */
export default class {
  /**
   * constructor
   */
  constructor(config){
    this.config = config;
    this.fileManage = new FileManage(config);
  }
  /**
   * parallel
   */
  parallel(type){
    let config = this.config[type];
    if(!config){
      return;
    }
    let promises = config.map(item => {
      //close task for temporary
      if(item.on === false){
        return;
      }
      let files = this.fileManage.getFiles(item.include, item.exclude);
      if(!files.length){
        return;
      }
      //@TODO add log files
      let {plugin, options} = item;
      let promises = files.map(file => {
        return file.promise.then(() => {
          let instance = new plugin(file, options, this.config);
          let promise = instance.run();
          file.promise = promise;
          return promise;
        });
      });
      return Promise.all(promises);
    });
    return Promise.all(promises);
  }
  /**
   * serial
   */
  async serial(type){
    let config = this.config[type];
    if(!config){
      return;
    }
    let keys = [];
    if(isObject(config)){
      keys = Object.keys(config);
      config = keys.map(key => config[key]);
    }
    for(let i = 0, length = config.length; i < length; i++){
      let item = config[i];
      if(!item.on){
        continue;
      }
      let files = this.fileManage.getFiles(item.include, item.exclude);
      if(!files.length){
        return;
      }
      let {plugin, options} = item;
      let promises = files.map(file => {
        return file.promise.then(() => {
          let instance = new plugin(file, options, this.config);
          let promise = instance.run();
          file.promise = promise;
          return promise;
        });
      });
      await Promise.all(promises);
    }
  }
  /**
   * run
   */
  async run(){
    try{
      await this.parallel('transpile');
      await this.parallel('dependence');
      await this.serial('workflow');
    }catch(err){
      console.log(err);
      process.exit(100);
    }
  }
}