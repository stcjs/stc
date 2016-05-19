import {getFiles, isArray, isRegExp} from 'stc-helper';
import stcFile from 'stc-file';
/**
 * file manage
 */
export default class {
  /**
   * constructor
   */
  constructor(config = {}){
    this.config = config;
    this.files = this._getContainFiles();
  }
  /**
   * get init contain files
   */
  _getContainFiles(){
    let list = ['template', 'static'];
    let totalFiles = [];
    list.forEach(type => {
      let files = [];
      let {include, exclude} = this.config[type];
      if(!isArray(include)){
        include = [include];
      }
      include.forEach(itemPath => {
        if(!itemPath){
          return;
        }
        let tFiles = getFiles(itemPath, itemPath);
        files = files.concat(tFiles);
      });
      files = files.filter(item => {
        return !this.match(item, exclude);
      }).map(item => {
        let instance = new stcFile({
          path: item
        });
        instance.type = type;
        return instance;
      });
      totalFiles = totalFiles.concat(files);
    });
    return totalFiles;
  }
  /**
   * test file match pattern
   */
  match(file, pattern = []){
    if(!pattern){
      return false;
    }
    if(!isArray(pattern)){
      pattern = [pattern];
    }
    let filePath = file.path || file;
    return pattern.some(item => {
      if(isRegExp(item)){
        return item.test(filePath);
      }
      //@TODO support glob pattern?
      return item === filePath;
    });
  }
  /**
   * get files
   */
  getFiles(include = [], exclude = []){
    return this.files.filter(item => {
      if(this.match(item, include) && !this.match(item, exclude)){
        return true;
      }
    })
  }
}