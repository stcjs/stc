import {
  HtmlTokenize,
  CssTokenize,
  TokenType,
  htmlToken2Text,
  cssToken2Text
} from 'flkit';

import {isArray, extend} from 'stc-helper';

//babylon can not use import
let babylon = null;
let babelGenerator = null;

/**
 * get attr value in attrs
 */
const getAttrValue = (attrs, name) => {
  let value;
  attrs.some(item => {
    if(item.nameLowerCase === name){
      value = item.value;
      return true;
    }
  });
  return value;
};

/**
 * parse content
 */
const parseContent = (parser, content, config, options = {}) => {
  config = extend({}, config);
  config.tpl = config.engine;
  let instance = new parser(content, config);
  if(config.adapter){
    instance.registerTpl(config.engine, config.adapter);
  }
  for(let key in options){
    instance[key] = options[key];
  }
  let tokens = instance.run();
  return tokens;
};

/**
 * parse html
 */
const parseHtml = (content, config, options) => {
  let opts = extend({}, config.tpl);
  opts.jsTplTypes = config.jsTpl && config.jsTpl.type;
  let tokens = parseContent(HtmlTokenize, content, opts, options);
  tokens.forEach(token => {
    // tag start
    // parse style in tag
    // if(token.type === TokenType.HTML_TAG_START) {
    //   let attrs = token.ext.attrs;
    //   let styleValue = getAttrValue(attrs, 'style');
    //   if(styleValue){
    //     let tokens = parseCss(`*{${styleValue}}`, config, options);
    //     tokens = tokens.slice(2, tokens.length - 1);
    //     token.ext.styleTokens = tokens;
    //   }
    // }

    // style
    if(token.type === TokenType.HTML_TAG_STYLE){
      let contentToken = token.ext.content;
      let cssTokens = parseCss(contentToken.value, config.tpl, {
        line: contentToken.loc.start.line,
        col: contentToken.loc.start.col
      });
     contentToken.ext.tokens = cssTokens;
     return;
    }

    // js tpl
    if(token.type === TokenType.HTML_TAG_SCRIPT){
      let startToken = token.ext.start;
      if(startToken.ext.isTpl){
        let contentToken = token.ext.content;
        let htmlTokens = parseHtml(contentToken.value, {tpl: config.jsTpl}, {
          line: contentToken.loc.start.line,
          col: contentToken.loc.start.col
        });
        contentToken.ext.tokens = htmlTokens;
      }
    }
  });
  return tokens;
};

/**
 * parse css
 */
const parseCss = (content, config, options) => {
  config = {...config};
  config.parseSelector = true;
  return parseContent(CssTokenize, content, config, options);
};

/**
 * parse content to ast
 */
export function parse(content, fileInstance, config){
  let extname = fileInstance.extname.toLowerCase();
  switch(extname){
    case 'js':
      if(!babylon){
        babylon = require('babylon');
      }
      return babylon.parse(content).program;
    case 'css':
      return parseCss(content, config);
  }
  if(fileInstance.prop('tpl')){
    return parseHtml(content, config);
  }
  throw new Error(`file ${fileInstance.path} can not get AST`);
}

/**
 * stringify js
 */
const stringifyJS = (ast, fileInstance) => {
  if(!babelGenerator){
    babelGenerator = require('babel-generator');
    if(babelGenerator.default){
      babelGenerator = babelGenerator.default;
    }
  }
  let data = babelGenerator(ast, {
    comments: false,
    sourceMaps: false,
    filename: fileInstance && fileInstance.path || ''
  });
  return data.code;
}

/**
 * stringify css
 */
const stringifyCSS = (ast, fileInstance, delimiters) => {
  return cssToken2Text(ast, delimiters);
}

/**
 * convert ast to content
 */
export function stringify(ast, fileInstance, config){
  let extname = fileInstance.extname.toLowerCase();
  if(extname === 'js'){
    return stringifyJS(ast, fileInstance);
  }
  if(extname === 'css'){
    return stringifyCSS(ast, fileInstance);
  }
  if(fileInstance.prop('tpl')){
    return htmlToken2Text(ast, {
      js: stringifyJS,
      css: ast => {
        let delimiters = [].concat(config.tpl.ld).concat(config.tpl.rd);
        return stringifyCSS(ast, fileInstance, delimiters);
      }
    });
  }
  throw new Error(`can not convert file ${fileInstance.path} AST to string`);
}