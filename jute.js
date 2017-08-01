const jute = require('./jute/lib/jute.js');
const yaml = require("js-yaml");
const fs = require("fs");

var isBlank, removeBlanks;

isBlank = function(val) {
  return val === null || val === void 0 || val === '' || (Array.isArray(val) && val.length === 0);
};

removeBlanks = function(rootNode) {
  var atLeastOneKey, k, newNode, newV, trimmed, v;
  if (typeof rootNode === 'object') {
    if (Array.isArray(rootNode)) {
      newNode = rootNode.map(function(e) {
        return removeBlanks(e);
      });
      newNode = newNode.filter(function(e) {
        return !isBlank(e);
      });
      if (isBlank(newNode)) {
        return null;
      } else {
        return newNode;
      }
    } else if (rootNode instanceof Date) {
      return rootNode;
    } else {
      newNode = {};
      atLeastOneKey = false;
      for (k in rootNode) {
        v = rootNode[k];
        newV = removeBlanks(v);
        if (!isBlank(newV)) {
          atLeastOneKey = true;
          newNode[k] = newV;
        }
      }
      if (atLeastOneKey) {
        return newNode;
      } else {
        return null;
      }
    }
  } else {
    if (isBlank(rootNode)) {
      return null;
    } else {
      if (typeof rootNode === 'string') {
        trimmed = rootNode.trim();
        if (isBlank(trimmed)) {
          return null;
        } else {
          return trimmed;
        }
      } else {
        return rootNode;
      }
    }
  }
};

const AST_CACHE = {};

const transform = (data, templateFile) => {
  let ast = AST_CACHE[templateFile];

  if (!ast) {
    const tpl = yaml.safeLoad(fs.readFileSync(templateFile, 'utf8'));
    ast = jute.compile(tpl);
    AST_CACHE[templateFile] = ast;
  }

  return removeBlanks(jute.transform(data, ast));
};

module.exports = {
  transform
};
