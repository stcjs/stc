# stc

高性能前端工作流系统

*注*：该项目还在开发阶段，还不能在项目里直接使用。

## 改进编译性能的几种方式

* 充分利用多核 CPU
* 基于 AST/Token
* 分析依赖树
* 无感知的缓存策略

## 已有插件

* [x] [stc-uglify](https://github.com/stcjs/stc-uglify) - 使用 UglifyJS 压缩 JavaScript
* [x] [stc-typescript](https://github.com/stcjs/stc-typescript) - 编译 .ts 文件到 JavaScript
* [x] [stc-babel](https://github.com/stcjs/stc-babel) - 使用 Babel 编译 ES2015+ 特性的文件

## 需要开发的插件


* [ ] CSS 合并（@import url）
* [ ] CSS 压缩
* [ ] JS 合并（document.write）
* [ ] LocalStorage
* [ ] CDN
* [ ] 国际化
* [ ] CSS 自动补前缀
* [ ] CSS Sprite
* [ ] 图片优化 
* [ ] HTML 压缩
* [ ] JS 模块化合并
* [ ] 外联资源转为内联资源，小图片转为 base64
* [ ] 静态资源版本号 
* [ ] 代码替换功能 - welefen
* [ ] 模板 XSS 自动修复功能
* [ ] 编码规范检测

## 如何开发

下载 `stc-demo` 项目