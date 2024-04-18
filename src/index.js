const { run: jscodeshift } = require('jscodeshift/src/Runner');
const path = require('node:path');

const transformPath = path.resolve('src/transform.js');
const paths = ['test/example2.js'];
const options = {
  dry: true,
  print: true,
  verbose: 1,
};

jscodeshift(transformPath, paths, options);
