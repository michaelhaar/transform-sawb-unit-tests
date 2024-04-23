const j = require('jscodeshift');

module.exports = function (fileInfo, api, options) {
  // transform `fileInfo.source` here

  const root = j(fileInfo.source);

  // find all `const runner = createQueryRunner(t, [` variable declarations
  root.find(j.VariableDeclaration).forEach((runnerDeclarationPath) => {
    if (
      runnerDeclarationPath.value.declarations.length !== 1 ||
      runnerDeclarationPath.value.declarations[0].id.name !== 'runner'
    ) {
      return;
    }

    const callExpressionCollection = j(runnerDeclarationPath).find(j.CallExpression);

    if (callExpressionCollection.length === 0) {
      return;
    }

    const callExpressionPath = callExpressionCollection.paths()[0];

    if (callExpressionPath.value.callee.name !== 'createQueryRunner') {
      throw new Error('Invalid `call` expression found...');
    }

    const arrayExpression = callExpressionPath.value.arguments[1];

    // loop through all elements in the array expression
    arrayExpression.elements.forEach((element) => {
      if (element.type === 'ArrowFunctionExpression') {
        // check if the arrow function is `query => query.response(...)` and return if it is
        if (
          element.body.type === 'CallExpression' &&
          element.body.callee.object.name === 'query' &&
          element.body.callee.property.name === 'response'
        ) {
          return;
        }

        if (element.body.type !== 'BlockStatement') {
          throw new Error('Invalid arrow function body found...');
        }

        // find query.response call expressions
        const returnStatementCollection = j(element.body).find(j.ReturnStatement);

        if (returnStatementCollection.length === 0) {
          // return `query.response([])`
          element.body = j.blockStatement([
            j.returnStatement(j.callExpression(j.identifier('query.response'), [j.arrayExpression([])])),
          ]);
        } else {
          // return the last `query.response` call expression
          element.body = j.blockStatement([returnStatementCollection.paths()[0].value]);
        }
      }
    });
  });

  return root.toSource(); // return the updated source code
};
