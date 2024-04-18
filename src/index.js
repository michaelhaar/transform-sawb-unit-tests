const { run: jscodeshift } = require('jscodeshift/src/Runner');
const path = require('node:path');

const transformPath = path.resolve('src/transform.js');
const paths = ['src/__testfixtures__/sample-1.input.js'];
const options = {
  dry: true,
  print: true,
  verbose: 1,
};

jscodeshift(transformPath, paths, options);
