const { run: jscodeshift } = require('jscodeshift/src/Runner');
const path = require('node:path');
const { globSync } = require('glob');

const transformPath = path.resolve('src/transform.js');
const paths = globSync('/Users/michael/dev/sawb/wb-core/test/**/*.test.js');
const options = {
  dry: false,
  print: false,
  verbose: 1,
};

jscodeshift(transformPath, paths, options);
