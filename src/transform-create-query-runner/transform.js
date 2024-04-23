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
  const didTransform = updateCreateQueryRunnerStatements(j, root);

  if (didTransform) {
    addStubUuidAndTimersImport(j, root);
    updateBeforeEachMethod(j, root);
    updateAfterEachAlwaysMethod(j, root);
  }

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
 * @returns {boolean} `true` AST has been updated, `false` otherwise.
 *
 */
function updateCreateQueryRunnerStatements(j, root) {
  let didTransform = false;

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
      didTransform = true;
    });
  });

  return didTransform;
}

/**
 * Returns a `query.response([])` call expression.
 * @param {import('jscodeshift').JSCodeshift} j - The jscodeshift API.
 * @returns {import('jscodeshift').CallExpression} The `query.response([])` call expression.
 */
function getDefaultQueryResponse(j) {
  return j.callExpression(j.identifier('query.response'), [j.arrayExpression([])]);
}

/**
 * add `import { restoreUuidAndTimers, stubUuidAndTimers } from 'test/helper';` after last import statement
 * @param {import('jscodeshift').JSCodeshift} j
 * @param {import('jscodeshift').Collection<any>} root
 */
function addStubUuidAndTimersImport(j, root) {
  let doesHaveTestHelperImport = false;

  root.find(j.ImportDeclaration).forEach((importDeclarationPath) => {
    if (importDeclarationPath.value.source.value === 'test/helper') {
      doesHaveTestHelperImport = true;

      const { specifiers } = importDeclarationPath.value;
      if (specifiers.every((specifier) => specifier.imported.name !== 'restoreUuidAndTimers')) {
        specifiers.push(j.importSpecifier(j.identifier('restoreUuidAndTimers')));
      }

      if (specifiers.every((specifier) => specifier.imported.name !== 'stubUuidAndTimers')) {
        specifiers.push(j.importSpecifier(j.identifier('stubUuidAndTimers')));
      }
    }
  });

  if (!doesHaveTestHelperImport) {
    const stubUuidAndTimersImport = j.importDeclaration(
      [j.importSpecifier(j.identifier('restoreUuidAndTimers')), j.importSpecifier(j.identifier('stubUuidAndTimers'))],
      j.literal('test/helper'),
    );

    const importDeclaration = root.find(j.ImportDeclaration);
    if (importDeclaration.length === 0) {
      root.get().node.program.body.unshift(stubUuidAndTimersImport);
    } else {
      importDeclaration.at(-1).insertAfter(stubUuidAndTimersImport);
    }
  }
}

/**
 * Add `stubUuidAndTimers` function to the `beforeEach` methods
 *
 * @param {import('jscodeshift').JSCodeshift} j - The jscodeshift API.
 * @param {import('jscodeshift').Collection<any>} root - The root node of the AST.
 */
function updateBeforeEachMethod(j, root) {
  const selectedTestLifeCycleCallExpression = root.find(j.CallExpression, {
    callee: {
      object: {
        name: 'test',
      },
      property: {
        name: 'beforeEach',
      },
    },
  });

  if (selectedTestLifeCycleCallExpression.length === 0) {
    throw new Error('No `test.beforeEach` method found.');
  }

  addFunctionToTestLifeCycleCallExpression(j, selectedTestLifeCycleCallExpression, 'stubUuidAndTimers');
}

/**
 * Add `restoreUuidAndTimers` function to the `test.afterEach.always` or `test.afterEach` methods.
 *
 * @param {import('jscodeshift').JSCodeshift} j - The jscodeshift API.
 * @param {import('jscodeshift').Collection<any>} root - The root node of the AST.
 */
function updateAfterEachAlwaysMethod(j, root) {
  const afterEachCallExpression = root.find(j.CallExpression, {
    callee: {
      object: {
        name: 'test',
      },
      property: {
        name: 'afterEach',
      },
    },
  });

  const afterEachAlwaysCallExpression = root.find(j.CallExpression, {
    callee: {
      object: {
        object: {
          name: 'test',
        },
        property: {
          name: 'afterEach',
        },
      },
      property: {
        name: 'always',
      },
    },
  });

  if (afterEachCallExpression.length === 0 && afterEachAlwaysCallExpression.length === 0) {
    throw new Error('No `test.afterEach` or `test.afterEach.always` methods found.');
  }

  addFunctionToTestLifeCycleCallExpression(j, afterEachCallExpression, 'restoreUuidAndTimers');
  addFunctionToTestLifeCycleCallExpression(j, afterEachAlwaysCallExpression, 'restoreUuidAndTimers');
}

function addFunctionToTestLifeCycleCallExpression(j, testLifeCycleCallExpression, functionNameToInsert) {
  testLifeCycleCallExpression.forEach((callExpressionPath) => {
    const argumentFunction = callExpressionPath.value.arguments[0];

    const stubUuidAndTimersCallExpression = j.expressionStatement(
      j.callExpression(j.identifier(functionNameToInsert), [
        j.memberExpression(j.identifier('t'), j.identifier('context')),
      ]),
    );

    const body = argumentFunction.body.body;
    if (body.some((statement) => statement.expression?.callee?.name === functionNameToInsert)) {
      return;
    }
    body.push(stubUuidAndTimersCallExpression);
  });
}
