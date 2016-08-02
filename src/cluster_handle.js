'use strict';

import StcPlugin from 'stc-plugin';
import PluginInvoke from 'stc-plugin-invoke';

/**
 * special handle in cluster
 */
export const master = {
  /**
   * get file by path
   */
  // getFileByPath: (config, stc) => {
  //   let file = stc.resource.getFileByPath(config.file);
  //   return file.pathHistory;
  // },
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
  getAstIfExist: (config, stc) => {
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
  },
  /**
   * get file content
   */
  getContent: async(config, stc) => {
    let file = stc.resource.getFileByPath(config.file);
    let content = await file.getContent(config.encoding);
    if(Buffer.isBuffer(content)){
      return content.toString('base64');
    }
    return content;
  },
  /**
   * exec plugin update method
   */
  update: async(config, stc) => {
    let file = stc.resource.getFileByPath(config.file);
    let instance = new PluginInvoke(StcPlugin, file, {
      stc,
      options: {}
    });
    instance.prop('__isRun__', true);
    return instance.update(data);
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

