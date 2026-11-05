const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const React = require('../../backend/node_modules/react');
async function loadActionButton(context) {
  const component = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, '../src/components/ActionButton.jsx'), 'utf8'), { context });
  await component.link(specifier => specifier === 'react'
    ? new vm.SyntheticModule(['createElement'], function () { this.setExport('createElement', React.createElement); }, { context })
    : new vm.SyntheticModule([], function () {}, { context }));
  return component;
}
module.exports = { loadActionButton };
