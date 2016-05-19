import FileManage from './file_manage.js';

/**
 * task class
 */
export default class {
  /**
   * constructor
   */
  constructor(config){
    this.config = config;
    this.fileManage = new FileManage(config);
  }
  /**
   * transpile
   */
  transpile(){
    let config = this.config.transpile;
    if(!config){
      return;
    }
    let promises = config.map(item => {
      //close transpile for temporary
      if(item.on === false){
        return;
      }
      let files = this.fileManage.getFiles(item.include, item.exclude);
      if(!files.length){
        return;
      }
      //@TODO add log files
      
      let {plugin, options} = item;
      let promises = files.map(file => {
        let instance = new plugin(file, options);
        return instance.run();
      });
      return Promise.all(promises);
    });
    return Promise.all(promises);
  }
  /**
   * run
   */
  async run(){
    try{
      await this.transpile();
    }catch(err){
      console.log(err);
      process.exit(100);
    }
  }
}