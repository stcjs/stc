import {
  HtmlTokenize,
  CssTokenize,
  TokenType
} from 'flkit';

//babylon can not use import
let babylon = null;
let babelGenerator = null;

/**
 * parse content
 */
const parseContent = (parser, content, config, options = {}) => {
  let instance = new parser(content, {
    tpl: config.engine,
    ld: config.ld,
    rd: config.rd
  });
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
  let tokens = parseContent(HtmlTokenize, content, config, options);
  tokens.forEach(token => {
    //style
    if(token.type === TokenType.HTML_TAG_STYLE){
      let contentToken = token.ext.content;
      let cssTokens = parseCss(contentToken.value, config, {
        line: contentToken.loc.start.line,
        col: contentToken.loc.start.col
      });
     contentToken.ext.tokens = cssTokens;
     return;
    }
    //js tpl
    if(token.type === TokenType.HTML_TAG_SCRIPT){
      let startToken = token.ext.start;
      let {type} = startToken.ext;
      let jsTpl = config.jsTpl;
      if(type && jsTpl.type.indexOf(type) > -1){
        let contentToken = token.ext.content;
        let htmlTokens = parseHtml(contentToken.value, jsTpl, {
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
  return parseContent(CssTokenize, content, config, options);
};


/**
 * parse content to ast
 */
export function parse(content, fileInstance, config){
  let extname = fileInstance.extname.toLowerCase();
  switch(extname){
    case '.js':
      if(!babylon){
        babylon = require('babylon');
      }
      return babylon.parse(content);
    case '.css':
      return parseCss(content, config.template);
  }
  let type = fileInstance.type;
  if(type === 'template' || extname === '.html'){
    return parseHtml(content, config.template);
  }
  throw new Error(`file ${fileInstance.path} can not get AST`);
}

/**
 * convert ast to content
 */
export function stringify(ast, fileInstance, config){
  let extname = fileInstance.extname.toLowerCase();
  switch(extname){
    case '.js':
      if(!babelGenerator){
        babelGenerator = require('babel-generator');
        if(babelGenerator.default){
          babelGenerator = babelGenerator.default;
        }
      }
      return babelGenerator(ast, {
        comments: false,
        filename: fileInstance.path
      });
    case '.css':
      return '';
  }
  let type = fileInstance.type;
  if(type === 'template' || extname === '.html'){
    return '';
  }
}