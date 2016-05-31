import babelGenerator from 'babel-generator';
import flkit from 'flkit';

//babylon can not use import
const babylon = require('babylon');

/**
 * parse content to ast
 */
export function parse(content, fileInstance){
  let extname = fileInstance.extname.toLowerCase();
  switch(extname){
    case '.js':
      return babylon.parse(content);
    case '.css':
      return [];
  }
  let type = fileInstance.type;
  if(type === 'template' || extname === '.html'){
    return [];
  }
}
/**
 * convert ast to content
 */
export function stringify(ast, fileInstance){
  let extname = fileInstance.extname.toLowerCase();
  switch(extname){
    case '.js':
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