const defineSnapshotTestFromFixture = require('jscodeshift/dist/testUtils').defineSnapshotTestFromFixture;
const transform = require('../transform');
const transformOptions = {};

defineSnapshotTestFromFixture(__dirname, transform, transformOptions, 'test-case-1', 'should work as expected');
