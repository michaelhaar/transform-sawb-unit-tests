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
        // find return statement
        const returnStatementCollection = j(element.body).find(j.ReturnStatement);
        if (returnStatementCollection.length === 0) {
          // return query.response([]);
          element.body = j.blockStatement([
            j.returnStatement(j.callExpression(j.identifier('query.response'), [j.arrayExpression([])])),
          ]);
        } else {
          element.body = j.blockStatement([returnStatementCollection.paths()[0].value]);
        }
      }
    });
  });

  return root.toSource(); // return the updated source code
};
