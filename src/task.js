import {getFiles} from 'stc-helper';
import FileManage from './file_manage.js';

/**
 * task class
 */
export default class {
  /**
   * constructor
   */
  constructor(instance){
    this.stc = instance;
    this.fileManage = new FileManage(instance._config.get());
  }
  /**
   * run
   */
  run(){
    console.log(this.fileManage.files);
  }
}