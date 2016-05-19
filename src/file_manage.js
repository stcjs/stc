import {getFiles, isArray, isRegExp, isObject} from 'stc-helper';
import stcFile from 'stc-file';
import debug from 'debug';

const debugFile = debug('file');

/**
 * file manage
 */
export default class {
  /**
   * constructor
   */
  constructor(config = {}){
    this.config = config;
    debugFile('=== app match files ===');
    this.files = this._getContainFiles();
    this.files.forEach(item => debugFile(item.path));
  }
  /**
   * get init contain files
   */
  _getContainFiles(){
    let list = ['template', 'static'];
    let totalFiles = [];
    let commonExclude = this.config.common.exclude;
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
        return !this.match(item, exclude) && !this.match(item, commonExclude);
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
      // /\w/
      if(isRegExp(item)){
        return item.test(filePath);
      }
      // {type: 'template'}
      if(isObject(item)){
        return Object.keys(item).every(it => {
          return file[it] === item[it];
        });
      }
      //@TODO support glob pattern?
      return item === filePath;
    });
  }
  /**
   * get files
   */
  getFiles(include = [], exclude = []){
    let files = this.files.filter(item => {
      if(this.match(item, include) && !this.match(item, exclude)){
        return true;
      }
    });
    return files;
  }
}