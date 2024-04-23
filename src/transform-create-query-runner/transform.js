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
        // find query.response call expressions
        const queryResponseCollection = j(element.body).find(j.CallExpression, {
          callee: { object: { name: 'query' }, property: { name: 'response' } },
        });

        if (queryResponseCollection.length === 0) {
          // return `query.response([])`
          element.body = j.blockStatement([
            j.returnStatement(j.callExpression(j.identifier('query.response'), [j.arrayExpression([])])),
          ]);
        } else {
          // return the last `query.response` call expression
          const lastQueryResponseCallExpression = queryResponseCollection.paths().pop();
          element.body = j.blockStatement([j.expressionStatement(lastQueryResponseCallExpression.value)]);
        }
      }
    });
  });

  return root.toSource(); // return the updated source code
};
