var stc = require('stc');

stc.config({
  template: {
    engine: 'smarty',
    adapter: '',
    ld: ['<%', '{='],
    rd: ['%>', '=}'],
    include: [],
    exclude: [],
    jsTpl: {
      type: [],
      engine: [],
      adapter: '',
      ld: '',
      rd: ''
    }
  },
  static: {
    include: ['static'],
    exclude: []
  }
});

//转译
stc.transpile([
  {include: /\.sass$/, exclude: '', plugin: sassPlugin},
  {include: /\.ts/, exclude: '', plugin: tsPlugin},
]);

//额外分析依赖
stc.dependence([
  {include: /module\/(\d+)\.js$/, exclude: '', plugin: sassPlugin},
]);

//stc.env('dev'); //设置执行环境

//配置工作流
stc.workflow({
  compressJS: {plugin: compressJS, options: {}, include: '', exclude: ''},
  CDN: {plugin: CDN, options: {}, include: '', exclude: ''},
  copyFile: {plugin: copyFile, options: {}, include: ''},
  compressHTML: {plugin: compressHTML, options: {}, include: '', exclude: ''}
});

//直接使用预设
stc.preset(qiwutuan, {
  compressJS: {on: false, options: ''}
}); 