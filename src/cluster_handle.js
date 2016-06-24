/**
 * special handle in cluster
 */
export const master = {
  getFileByPath: (config, stc) => {
    let file = stc.resource.getFileByPath(config.file);
    return file.pathHistory;
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

