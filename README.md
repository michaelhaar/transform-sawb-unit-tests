TODO

Useful links:

- [jscodeshift Readme](https://github.com/facebook/jscodeshift)
- [AST Explorer](https://astexplorer.net/)

## Migration Plan

1. Run unit tests (should pass)
2. Run `npm run lint:fix:tests`
3. Run unit tests (should pass)
4. Update helper.js
5. Run unit tests (should pass)
6. Run switch-case transformation script `npm run start:transform-switch-statements`
7. Run unit tests (should pass)
8. Run `npm run lint:fix:tests`
9. Run unit tests (should pass)
10. Run create-query-runner transformation script `npm run start:transform-create-query-runner`
11. Run unit tests with `--update-snapshots` (most should pass, approx. 10 tests will fail?)
12. Manually update the following files (`Attempted to wrap default which is already wrapped` => remove sinon uuid stubs):

    1. wb-core/test/controllers/Groups/handleGlnAddress.test.js
    2. wb-core/test/controllers/BillingDocuments/generate/utils/persistIndividualBillingDocumentPositions.test.js
    3. wb-core/test/controllers/MergeRuns/startMergeRun.test.js
    4. wb-core/test/controllers/Addresses/document/addDocument.test.js
    5. wb-core/test/controllers/WasteWhereaboutCertificate/generate/generateWasteWhereaboutCertificate.test.js
    6. test/controllers/WasteWhereaboutCertificate/generate/cancelWasteWhereaboutCertificate.test.js
    7. wb-core/test/index.test.js

13. Run unit tests `--update-snapshots` (should pass)
14. Run unit tests without updating snapshots (most should pass, some will fail)
    1. wb-core/test/controllers/Item/put/checkDangerousWasteLimit.test.js
    2. wb-core/test/controllers/Cron/dangerousWasteLimits/fetchGroupsAndSendEmails.test.js
    3. wb-core/test/controllers/Groups/setDefaultPriceImpacts.test.js
    4. wb-core/test/controllers/Groups/attachDangerousWasteLimit.test.js
    5. wb-core/test/utils/getPossibleRecyclerUtils.test.js
15. Run `npm run lint:fix:tests`
16. Run unit tests (should pass)
