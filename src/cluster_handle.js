'use strict';

/**
 * special handle in cluster
 */
export const master = {
  /**
   * get file by path
   */
  getFileByPath: (config, stc) => {
    let file = stc.resource.getFileByPath(config.file);
    return file.pathHistory;
  },
  /**
   * get or set cache
   */
  cache: (config, stc) => {
    let {key, name, value} = config;
    if(!(stc.cacheInstances[key])){
      stc.cacheInstances[key] = new stc.cache({
        onlyMemory: true
      });
    }
    let instance = stc.cacheInstances[key];
    if(value === undefined){
      return instance.get(name);
    }
    return instance.set(name, value);
  },
  /**
   * get file promise key & value
   */
  getFilePromise: (config, stc) => {
    let file = stc.resource.getFileByPath(config.file);
    let ret = file.promise(config.key);
    if(ret !== undefined){
      return ret;
    }
    if(config.deferred){
      file.promise(config.key, undefined, 'set');
    }
    return ret;
  },
  /**
   * resolve file deferred
   */
  resolveFilePromise: (config, stc) => {
    let file = stc.resource.getFileByPath(config.file);
    file.promise(config.key, config.value, 'update');
  },
  /**
   * add file
   */
  addFile: (config, stc) => {
    stc.resource.addFile(config.file, config.content, config.virtual);
  },
  /**
   * return ast if have
   */
  getAst: (config, stc) => {
    let file = stc.resource.getFileByPath(config.file);
    if(file.hasAst()){
      return file.getAst();
    }
  },
  /**
   * update file ast
   */
  updateAst: (config, stc) => {
    let file = stc.resource.getFileByPath(config.file);
    file.setAst(config.ast);
  }
};
/**
 * special handle in worker
 */
export const worker = {
  /**
   * get file ast
   */
  getAst: (config, stc) => {
    let file = stc.resource.createFile(config.file, config.content);
    return file.getAst();
  }
};

