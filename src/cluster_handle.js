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
  }
};

export const worker = {
  /**
   * get file ast
   */
  getAst: async (config, stc) => {
    let file = await stc.getFileInWorker(config.file);
    file.setContent(config.content);
    return file.getAst();
  }
};

