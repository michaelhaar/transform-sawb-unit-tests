const defineSnapshotTestFromFixture = require('jscodeshift/dist/testUtils').defineSnapshotTestFromFixture;
const transform = require('../transform');
const transformOptions = {};

defineSnapshotTestFromFixture(__dirname, transform, transformOptions, 'sample-1', 'should work as expected');
defineSnapshotTestFromFixture(__dirname, transform, transformOptions, 'sample-2', 'should work as expected');
