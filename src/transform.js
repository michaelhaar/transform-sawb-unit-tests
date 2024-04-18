const j = require('jscodeshift');

module.exports = function (fileInfo, api, options) {
  // transform `fileInfo.source` here

  const root = j(fileInfo.source);

  // find all `runner` variable declarations
  root.find(j.VariableDeclaration).forEach((runnerDeclarationPath) => {
    if (
      runnerDeclarationPath.value.declarations.length !== 1 ||
      runnerDeclarationPath.value.declarations[0].id.name !== 'runner'
    ) {
      return;
    }

    const switchStatementCollection = j(runnerDeclarationPath).find(j.SwitchStatement);

    if (switchStatementCollection.length === 0) {
      return;
    }

    if (switchStatementCollection.length > 1) {
      throw new Error('Multiple `switch` statements found...');
    }

    const switchStatementPath = switchStatementCollection.paths()[0];

    if (switchStatementPath.value.discriminant.name !== 'step') {
      throw new Error('Invalid `switch` statement found...');
    }

    // loop through each `case` statements
    const arrayExpression = j.arrayExpression(
      switchStatementPath.value.cases
        .map((caseStatement) => {
          if (caseStatement.consequent.length !== 1 || caseStatement.consequent[0].type !== 'BlockStatement') {
            throw new Error('Invalid case statement found...');
          }

          const isDefaultCase = caseStatement.test === null;
          if (isDefaultCase) {
            return;
          }

          return j.arrowFunctionExpression([j.identifier('query')], caseStatement.consequent[0]);
        })
        .filter(Boolean),
    );

    // build `const runner = createQueryRunner(t, [ ... ])`
    const runnerDeclaration = j.variableDeclaration('const', [
      j.variableDeclarator(
        j.identifier('runner'),
        j.callExpression(j.identifier('createQueryRunner'), [j.identifier('t'), arrayExpression]),
      ),
    ]);

    j(runnerDeclarationPath).replaceWith(runnerDeclaration); // replace the `switch` statement with the updated `switch` statement
  });

  return root.toSource(); // return the updated source code
};
