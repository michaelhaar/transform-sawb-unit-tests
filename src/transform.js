const j = require('jscodeshift');

module.exports = function (fileInfo, api, options) {
  // transform `fileInfo.source` here

  const root = j(fileInfo.source);

  const changedSource = root.findVariableDeclarators('foo').renameTo('bar').toSource();

  // return the updated source code
  return changedSource;
};
