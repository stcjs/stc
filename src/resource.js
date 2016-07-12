import {getFiles, isArray, isRegExp, isObject, isString, isBuffer} from 'stc-helper';
import stcFile from 'stc-file';
import path from 'path';
import {isMaster} from 'cluster';

/**
 * look file cache
 */
let lookFileCache = {};

/**
 * get init files
 */
const getInitFiles = instance => {
  let files = [];
  let {include, exclude, defaultExclude} = instance.config;
  if(!isArray(include)){
    include = include ? [include] : [];
  }
  include.forEach(itemPath => {
    if(itemPath){
      let tFiles = getFiles(itemPath, itemPath);
      files = files.concat(tFiles);
    }
  });
  return files.filter(item => {
    return !instance.match(item, defaultExclude) && !instance.match(item, exclude);
  }).map(item => {
    let file = new stcFile({
      path: item,
      astHandle: instance.astHandle
    });
    if(instance.isTpl(item)){
      file.prop('tpl', true);
    }
    return file;
  }).sort((a, b) => {
    return a.path.split(path.sep).length > b.path.split(path.sep).length ? -1 : 1;
  });
};

/**
 * update file property
 */
const updateFile = (file, content, virtual) => {
  if(content === true){
    virtual = true;
    content = undefined;
  }
  if(content !== undefined){
    if(isString(content) || isBuffer(content)){
      file.setContent(content);
    }else{
      file.setAst(content);
    }
  }
  if(virtual){
    file.prop('virtual', true);
  }
  return file;
};

/**
 * get file by path
 */
const getFileByPath = (instance, filepath) => {
  let file;
  instance.files.some(item => {
    if(item.isPath(filepath)){
      return (file = item);
    }
  });
  if(file){
    lookFileCache[filepath] = file;
    return file;
  }
};

/**
 * get file by path handle 
 */
const getFileByPathHandle = (instance, linkpath) => {
  let filepath = instance.config.pathHandle(linkpath);
  if(filepath){
    let file;
    instance.files.some(item => {
      if(item.isPath(filepath) > -1){
        return (file = item);
      }
    });
    if(file){
      lookFileCache[linkpath] = file;
      return file;
    }
  }
}
/**
 * search File
 */
const searchFile = (instance, linkpath) => {
  // linkpath is longer than filepath
  let file;
  instance.files.some(item => {
    let pathHistory = item.pathHistory, length = pathHistory.length;
    for(let i = 0; i < length; i++){
      let pos = pathHistory[i].indexOf(linkpath);
      if(pos > -1 && pathHistory[i].slice(pos) === linkpath){
        file = item;
        return true;
      }
    }
  });
  if(file){
    lookFileCache[linkpath] = file;
    return file;
  }
}

/**
 * look file
 */
const lookFile = (instance, linkpath) => {
  if(instance.config.pathHandle){
    return getFileByPathHandle(instance, linkpath);
  }
  return searchFile(instance, linkpath);
}

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
    this.files = isMaster ? getInitFiles(this) : [];
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
    let filepath = file.path || file;
    let matches = null;
    let flag = pattern.some(item => {
      // /\w/
      if(isRegExp(item)){
        matches = filepath.match(item);
        if(matches){
          return true;
        }
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
      return item === filepath;
    });
    if(flag && !matches){
      matches = [filepath];
    }
    return matches;
  }
  /**
   * get files
   */
  getFiles(include = [], exclude = []){
    return this.files.filter(item => {
      if(item.prop('virtual')){
        return false;
      }
      if(!!this.match(item, include) && !this.match(item, exclude)){
        return true;
      }
    });
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
  createFile(filepath, content, virtual){
    if(filepath[0] === '/'){
      filepath = filepath.slice(1);
    }
    let instance = new stcFile({
      path: filepath,
      astHandle: this.astHandle
    });
    if(this.isTpl(filepath)){
      instance.prop('tpl', true);
    }
    return updateFile(instance, content, virtual);
  }
  /**
   * add file
   */
  addFile(filepath, content, virtual){
    let file;
    this.files.some(item => {
      if(item.isPath(filepath)){
        file = item;
        return true;
      }
    });
    if(file){
      return updateFile(file, content, virtual);
    }
    let instance = this.createFile(filepath, content, virtual);
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
    if(filepath[0] === '/'){
      filepath = filepath.slice(1);
    }
    if(lookFileCache[filepath]){
      return lookFileCache[filepath];
    }
    let file = getFileByPath(this, filepath);
    if(!file){
      file = lookFile(this, filepath);
    }
    if(file){
      return file;
    }
    let message = `can not find file \`${filepath}\``;
    if(parentFile){
      message += ` in \`${parentFile}\``;
    }
    throw new Error(message);
  }
}