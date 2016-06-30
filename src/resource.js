import {getFiles, isArray, isRegExp, isObject, isString} from 'stc-helper';
import stcFile from 'stc-file';
import path from 'path';
import {isMaster} from 'cluster';

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
    this.files = isMaster ? this._getInitFiles() : [];
  }
  /**
   * get init contain files
   */
  _getInitFiles(){
    let files = [];
    let {include, exclude, defaultExclude} = this.config;
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
      return !this.match(item, defaultExclude) && !this.match(item, exclude);
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
   * check file is template file
   */
  isTpl(extname){
    if(extname.indexOf('.') > -1){
      extname = path.extname(extname).slice(1);
    }
    if(extname === 'html'){
      return true;
    }
    let exts = this.config.tpl.extname;
    if(!isArray(exts)){
      exts = [exts];
    }
    return exts.indexOf(extname.toLowerCase()) > -1;
  }
  /**
   * create file
   */
  createFile(filepath, content){
    let instance = new stcFile({
      path: filepath,
      astHandle: this.astHandle
    });
    if(content !== undefined){
      instance.setContent(content);
    }
    if(this.isTpl(filepath)){
      instance.prop('tpl', true);
    }
    return instance;
  }
  /**
   * add file
   */
  addFile(filepath, content){
    let file;
    this.files.some(item => {
      if(item.isPath(filepath)){
        file = item;
        return true;
      }
    });
    if(file){
      if(content !== undefined){
        file.setContent(content);
      }
      return file;
    }
    let instance = this.createFile(filepath, content);
    this.files.push(instance);
    return instance;
  }
  /**
   * get file by path
   */
  getFileByPath(filepath, parentFile){
    //is already stc-file instance
    if(!isString(filepath) && filepath.path){
      return filepath;
    }
    if(isArray(filepath)){
      return this._getFileByPathHistory(filepath);
    }
    let file;
    this.files.some(item => {
      if(item.isPath(filepath)){
        file = item;
        return true;
      }
    });
    if(file){
      return file;
    }
    if(parentFile){
      return this._lookFile(filepath, parentFile);
    }
    if(!file){
      throw new Error('can not find file ' + filepath);
    }
  }
  /**
   * get file by path history
   */
  _getFileByPathHistory(pathHistory){
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
   * look file with linkpath
   */
  _lookFile(linkpath, parentFile){
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