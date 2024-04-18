module.exports = function (fileInfo, api, options) {
  // transform `fileInfo.source` here

  // e.g. convert all `foo` function names to `bar`
  const changedSource = fileInfo.source.replace(/foo/g, "bar");

  // return the updated source code
  return changedSource;
};
