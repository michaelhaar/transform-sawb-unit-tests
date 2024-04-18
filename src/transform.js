const j = require('jscodeshift');

module.exports = function (fileInfo, api, options) {
  // transform `fileInfo.source` here

  const root = j(fileInfo.source);

  // find all `switch (step)` statements
  root.find(j.SwitchStatement).forEach((path) => {
    if (path.value.discriminant.name !== 'step') {
      return;
    }

    // loop through each `case` statements
    const arrayExpression = j.arrayExpression(
      path.value.cases.map((caseStatement) => {
        if (caseStatement.consequent.length !== 1 || caseStatement.consequent[0].type !== 'BlockStatement') {
          console.log('Invalid case statement found. Skipping...');
          return;
        }

        return j.arrowFunctionExpression([j.identifier('query')], caseStatement.consequent[0]);
      }),
    );

    // build `const runner = createQueryRunner(t, [ ... ])`
    const runnerDeclaration = j.variableDeclaration('const', [
      j.variableDeclarator(
        j.identifier('runner'),
        j.callExpression(j.identifier('createQueryRunner'), [j.identifier('t'), arrayExpression]),
      ),
    ]);

    j(path).replaceWith(runnerDeclaration); // replace the `switch` statement with the updated `switch` statement
  });

  return root.toSource(); // return the updated source code
};
