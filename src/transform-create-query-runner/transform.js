/**
 * Transforms the source code in the given file.
 *
 * @param {import('jscodeshift').FileInfo} fileInfo - Information about the file being transformed.
 * @param {import('jscodeshift').API} api - The jscodeshift API.
 * @param {import('jscodeshift').Options} options - Options for the transformation.
 * @returns {string} The transformed source code.
 */
module.exports = function (fileInfo, api, options) {
  // transform `fileInfo.source` here
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  // find all `const runner = createQueryRunner(t, [` variable declarations
  updateCreateQueryRunnerStatements(j, root);

  return root.toSource(); // return the updated source code
};

/**
 * Updates the `createQueryRunner` statements in the given file/AST.
 *
 * finds all:
 * ```
 * const runner = createQueryRunner(t, [
 *  (query) => {
 *    // everything except the return statement should be removed
 *    t.is(query.sql, 'select distinct `address_documents`.* from `address_documents` where `deleted` = ? and `address_documents`.`address_id` in (?, ?, ?)');
 *    return query.response([1, 2, 3]);
 *  }
 * ]);
 * ```
 *
 * and updates them to:
 * ```
 * const runner = createQueryRunner(t, [
 *  (query) => {
 *    return query.response([1, 2, 3]);
 *  }
 * ]);
 *
 * @param {import('jscodeshift').JSCodeshift} j - The jscodeshift API.
 * @param {import('jscodeshift').Collection<any>} root - The root node of the AST.
 *
 */
function updateCreateQueryRunnerStatements(j, root) {
  // 1. find all `const runner = createQueryRunner(t, [` variable declarations
  root.find(j.VariableDeclaration).forEach((runnerDeclarationPath) => {
    if (
      runnerDeclarationPath.value.declarations.length !== 1 ||
      runnerDeclarationPath.value.declarations[0].id.name !== 'runner'
    ) {
      // don't process if the variable declaration is not `const runner = ...`
      return;
    }

    const callExpressionCollection = j(runnerDeclarationPath).find(j.CallExpression);

    if (callExpressionCollection.length === 0) {
      throw new Error('Variable declaration is not `const runner = anyFunction(...)`');
    }
    const callExpressionPath = callExpressionCollection.paths()[0];
    if (callExpressionPath.value.callee.name !== 'createQueryRunner') {
      throw new Error('Variable declaration is not `const runner = createQueryRunner(...)`.');
    }

    const arrayExpression = callExpressionPath.value.arguments[1];

    // loop through all elements in the array expression
    arrayExpression.elements.forEach((element) => {
      if (element.type !== 'ArrowFunctionExpression') {
        return;
      }

      // check if `query => query.response(...)`
      if (
        element.body.type === 'CallExpression' &&
        element.body.callee.object.name === 'query' &&
        element.body.callee.property.name === 'response'
      ) {
        return;
      }

      // check if `query => { ... }`
      if (element.body.type !== 'BlockStatement') {
        return;
      }

      // find return statement
      const returnStatementCollection = j(element.body).find(j.ReturnStatement);

      if (returnStatementCollection.length) {
        // remove all statements except the return statement
        element.body = j.blockStatement([returnStatementCollection.paths()[0].value]);
      } else {
        element.body = j.blockStatement([j.returnStatement(getDefaultQueryResponse(j))]);
      }
    });
  });
}

/**
 * Returns a `query.response([])` call expression.
 * @param {import('jscodeshift').JSCodeshift} j - The jscodeshift API.
 * @returns {import('jscodeshift').CallExpression} The `query.response([])` call expression.
 */
function getDefaultQueryResponse(j) {
  return j.callExpression(j.identifier('query.response'), [j.arrayExpression([])]);
}
