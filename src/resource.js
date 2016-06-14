import {getFiles, isArray, isRegExp, isObject, isString} from 'stc-helper';
import stcFile from 'stc-file';
import path from 'path';

/**
 * look file cache
 */
let lookFileCache = {};

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
      if(this.isTpl(item)){
        instance.prop('tpl', true);
      }
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
          if(file.path){
            return file.prop('tpl') === true;
          }
          return this.isTpl(file);
        }
      }
      //@TODO support glob pattern?
      return item === filePath;
    });
  }
  /**
   * check file is template file
   */
  isTpl(extname){
    if(extname.indexOf('.') > -1){
      extname = path.extname(extname).slice(1);
    }
    let exts = this.config.tpl.extname;
    if(!isArray(exts)){
      exts = [exts];
    }
    return exts.indexOf(extname.toLowerCase()) > -1;
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
    this.files.some(item => {
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
    if(this.isTpl(filepath)){
      instance.prop('tpl', true);
    }
    this.files.push(instance);
    return instance;
  }
  /**
   * look file with linkpath
   */
  lookFile(linkpath, parentFile){
    if(lookFileCache[linkpath]){
      return lookFileCache[linkpath];
    }

    let filepath;
    if(this.config.pathHandle){
      filepath = this.config.pathHandle(linkpath);
      if(filepath){
        let file;
        this.files.some(item => {
          if(item.pathHistory.indexOf(filepath) > -1){
            file = item;
            return true;
          }
        });
        if(file){
          lookFileCache[linkpath] = file;
          return file;
        }
      }
    }else{
      let loop = 0;
      let linkpaths = linkpath.split('/');
      let file;
      while(loop++ < 5 && linkpaths.length){
        let currentpath = linkpaths.join('/');
        this.files.some(item => {
          if(item.pathHistory.indexOf(currentpath) > -1){
            file = item;
            return true;
          }
        });
        if(file){
          break;
        }
        linkpaths.shift();
      }
      if(file){
        lookFileCache[linkpath] = file;
        return file;
      }
    }
    throw new Error('can not find resource `' + linkpath + '` in file `' + parentFile + '`');
  }
}