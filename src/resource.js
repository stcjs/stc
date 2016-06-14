import {getFiles, isArray, isRegExp, isObject, isString} from 'stc-helper';
import stcFile from 'stc-file';

/**
 * resource manage
 */
export default class Resource {
  /**
   * constructor
   */
  constructor(config = {}, astHandle){
    this.config = config;
    this.astHandle = astHandle;
    this.files = this.getInitFiles();
  }
  /**
   * get init contain files
   */
  getInitFiles(){
    let files = [];
    let {include, exclude} = this.config;
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
    return files.filter(item => {
      return !this.match(item, exclude);
    }).map(item => {
      let instance = new stcFile({
        path: item,
        astHandle: this.astHandle
      });
      return instance;
    });
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
      if(isObject(item)){
        // {type: 'tpl'}
        if(item.type === 'tpl'){
          let tplExts = this.config.tpl.extname;
          if(!isArray(tplExts)){
            tplExts = [tplExts];
          }
          let extname = file.extname || path.extname(file).slice(1);
          return tplExts.indexOf(extname) > -1;
        }
      }
      //@TODO support glob pattern?
      return item === filePath;
    });
  }
  /**
   * get file by path
   */
  getFileByPath(filepath){
    //is already stc-file instance
    if(!isString(filepath) && filepath.path){
      return filepath;
    }
    let file;
    this.files.some(item => {
      if(item.path === filepath || item.pathHistory.indexOf(filepath) > -1){
        file = item;
        return true;
      }
    });
    return file;
  }
  /**
   * get file by path history
   */
  getFileByPathHistory(pathHistory){
    let file;
    this.files.some(item => {
      if(pathHistory.indexOf(item.path) > -1){
        file = item;
        return true;
      }
    });
    return file;
  }
  /**
   * get files
   */
  getFiles(include = [], exclude = []){
    let files = this.files.filter(item => {
      if(this.match(item, include) && !this.match(item, exclude)){
        return true;
      }
    }).sort((a, b) => {
      //sort with file size
      return a.stat.size > b.stat.size ? 1 : -1;
    });
    return files;
  }
  /**
   * get console files
   */
  getConsoleFiles(files = this.files){
    let consoleFiles = files.map(file => file.path);
    return JSON.stringify(consoleFiles);
  }
  /**
   * add file
   */
  addFile(filepath, content){
    let file;
    this.file.some(item => {
      if(item.path === filepath){
        file = item;
        return true;
      }
    });
    if(file){
      if(content){
        file.setContent(content);
      }
      return file;
    }
    let instance = new stcFile({
      path: filepath,
      astHandle: this.astHandle
    });
    if(content){
      instance.setContent(content);
    }
    this.files.push(instance);
    return instance;
  }
  /**
   * look file with linkPath
   */
  lookFile(linkPath){
    
  }
}