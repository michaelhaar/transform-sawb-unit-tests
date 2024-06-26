const j = require('jscodeshift');

module.exports = function (fileInfo, api, options) {
  // transform `fileInfo.source` here

  const root = j(fileInfo.source);

  // find all `runner` variable declarations
  let didTransformSwitchStatement = false;
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
        .map((caseStatement, index) => {
          const isDefaultCase = caseStatement.test === null;
          if (isDefaultCase) {
            return;
          }

          const consequent = getSwitchCaseConsequent(switchStatementPath.value.cases, index);

          return j.arrowFunctionExpression([j.identifier('query')], consequent[0]);
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
    didTransformSwitchStatement = true;
  });

  // add `createQueryRunner` import
  if (didTransformSwitchStatement) {
    const doesHaveTestHelperImport = root.find(j.ImportDeclaration, { source: { value: 'test/helper' } }).length > 0;
    if (doesHaveTestHelperImport) {
      root.find(j.ImportDeclaration, { source: { value: 'test/helper' } }).forEach((importDeclarationPath) => {
        if (
          importDeclarationPath.value.specifiers.some((specifier) => specifier.imported.name === 'createQueryRunner')
        ) {
          return;
        }

        importDeclarationPath.value.specifiers.push(
          j.importSpecifier(j.identifier('createQueryRunner'), j.identifier('createQueryRunner')),
        );
      });
    } else {
      const importDeclarations = root.find(j.ImportDeclaration);
      const createQueryRunnerImportDeclaration = j.importDeclaration(
        [j.importSpecifier(j.identifier('createQueryRunner'), j.identifier('createQueryRunner'))],
        j.literal('test/helper'),
      );

      if (importDeclarations.length === 0) {
        root.get().node.program.body.unshift(createQueryRunnerImportDeclaration);
      }

      importDeclarations.at(importDeclarations.size() - 1).insertAfter(createQueryRunnerImportDeclaration);
    }
  }

  // fix template literals if filename is `getAddressItemsOnSite.test.js`
  if (fileInfo.path?.includes('getAddressItemsOnSite.test.js')) {
    const templateStringRegex = /`((?:[^`\\]|\\.)*)`/g;

    const originalSourceString = fileInfo.source;
    const originalTemplateStrings = originalSourceString.match(templateStringRegex);

    let updatedSourceString = root.toSource();
    const updatedTemplateStrings = updatedSourceString.match(templateStringRegex);

    if (originalTemplateStrings.length !== updatedTemplateStrings.length) {
      throw new Error('Template strings count mismatch...');
    }

    for (let i = 0; i < originalTemplateStrings.length; i++) {
      updatedSourceString = updatedSourceString.replace(updatedTemplateStrings[i], originalTemplateStrings[i]);
    }
    return updatedSourceString;
  }

  return root.toSource(); // return the updated source code
};

// needed to handle fall-through cases
// see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/switch#taking_advantage_of_fall-through
function getSwitchCaseConsequent(cases, index) {
  const caseStatement = cases[index];
  if (caseStatement.consequent.length === 1 && caseStatement.consequent[0].type === 'BlockStatement') {
    return caseStatement.consequent;
  }

  if (caseStatement.consequent.length === 0) {
    return getSwitchCaseConsequent(cases, index + 1);
  }

  throw new Error('Invalid case statement found...');
}
