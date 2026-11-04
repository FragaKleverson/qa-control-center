const { loadActionButton } = require("./actionButtonLoader.cjs");
﻿const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const React = require('../../backend/node_modules/react');
const babel = require('../../backend/node_modules/@babel/core');
function hooks() {
  const state = [], effects = []; let cursor = 0, queued = [];
  return {
    begin() { cursor = 0; queued = []; }, flush() { queued.forEach(run => run()); }, stop() { effects.forEach(effect => effect?.cleanup?.()); },
    useCallback(fn) { cursor++; return fn; },
    useState(initial) { const id = cursor++; if (!(id in state)) state[id] = typeof initial === 'function' ? initial() : initial; return [state[id], value => { state[id] = typeof value === 'function' ? value(state[id]) : value; }]; },
    useRef(value) { const id = cursor++; return state[id] ||= { current: value }; },
    useEffect(fn, deps) { const id = cursor++; const old = effects[id]; if (!old || !deps || deps.some((value, i) => value !== old.deps[i])) queued.push(() => { old?.cleanup?.(); effects[id] = { deps, cleanup: fn() }; }); },
  };
}
// Local test transform only; does not write generated files or install tooling.
function jsx(code) {
  return babel.transformSync(code, { configFile: false, babelrc: false, parserOpts: { plugins: ['jsx'] }, plugins: [({ types: t }) => ({ visitor: {
    JSXElement: { exit(p) {
      const opening = p.node.openingElement;
      const tag = /^[a-z]/.test(opening.name.name) ? t.stringLiteral(opening.name.name) : t.identifier(opening.name.name);
      const props = opening.attributes.map(attr => t.objectProperty(t.stringLiteral(attr.name.name), attr.value ? (attr.value.type === 'JSXExpressionContainer' ? attr.value.expression : attr.value) : t.booleanLiteral(true)));
      const children = p.node.children.flatMap(child => child.type === 'JSXText' ? (child.value.trim() ? [t.stringLiteral(child.value.replace(/\s+/g, ' ').trim())] : []) : child.type === 'JSXExpressionContainer' ? (child.expression.type === 'JSXEmptyExpression' ? [] : [child.expression]) : [child]);
      p.replaceWith(t.callExpression(t.identifier('__jsx'), [tag, t.objectExpression(props), ...children]));
    } },
  } })] }).code;
}
async function load(file, imports = {}, globals = {}) {
  const context = vm.createContext({ AbortController, URLSearchParams, __jsx: React.createElement, console, setTimeout: () => 1, clearTimeout() {}, ...globals });
  let code = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
  if (['pages/Requirements.jsx','pages/TestSuites.jsx','pages/Executions.jsx'].includes(file)) code = jsx(code);
  const module = new vm.SourceTextModule(code, { context }); const modules = new Map();
  await module.link(async specifier => {
    if (specifier === "../components/ActionButton") return loadActionButton(context);
    if (modules.has(specifier)) return modules.get(specifier);
    if (specifier === '../domain/projectText') {
      const utility = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, '../src/domain/projectText.js'), 'utf8'), { context });
      await utility.link(() => { throw new Error('Unexpected utility import'); });
      return utility;
    }
    if (!(specifier in imports)) throw new Error('Unexpected import ' + specifier);
    const values = imports[specifier]; const synthetic = new vm.SyntheticModule(Object.keys(values), function () { Object.entries(values).forEach(([key, value]) => this.setExport(key, value)); }, { context });
    modules.set(specifier, synthetic); return synthetic;
  }); await module.evaluate(); return module.namespace;
}
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
function nodes(element) {
  if (element?.type?.name === "ActionButton") return nodes(element.type(element.props));
  if (!element || typeof element !== 'object') return [];
  if (element.type === 'Modal' && !element.props.isOpen) return [];
  return [element, ...React.Children.toArray(element.props?.children).flatMap(nodes)];
}
const text = element => React.Children.toArray(element?.props?.children).map(child => typeof child === 'object' ? text(child) : child).join('');
const button = (tree, label) => nodes(tree).find(node => node.type === 'button' && text(node) === label);

async function page(name,role){const rt=hooks(),api=Object.fromEntries(['list','getCases','getResults','getById','create','delete','finalize','updateResult','addCase','removeCase'].map(k=>[k,jest.fn().mockResolvedValue([])]));api.getCases.mockResolvedValue([{id:9,titulo:'Linked'}]);api.getResults.mockResolvedValue([{id:1,projeto_id:9,titulo:'Result',status:'pending',comentario:'Note'}]);
const list={data:[{id:1,nome:'Suite',titulo:'Requirement',status:'pending',suite_id:1,total_cases:1,created_at:'2026-11-04'}],page:1,pageSize:10,total:1,isLoading:false,error:'',reload:jest.fn(),mounted:{current:true},query:{},setQuery:jest.fn()};
const ns=await load('pages/'+name+'.jsx',{react:rt,'../contexts/AuthContext':{useAuth:()=>({user:{role}})},'../components/Modal':{default:'Modal'},'../components/ConfirmDialog':{default:'ConfirmDialog'},'../components/Pagination':{default:'Pagination'},'../components/GherkinDisplay':{default:'GherkinDisplay'},'../components/RecordDetails':{default:'Details',ViewRecordButton:'View'},'../hooks/useRecordDetails':{default:()=>({})},'../hooks/usePaginatedList':{default:()=>list},'../domain/environments':{ENVIRONMENTS:['staging']},'../services/api':{requirementsAPI:api,testSuitesAPI:api,executionsAPI:api,projectsAPI:{list:jest.fn().mockResolvedValue([{id:2,titulo:'Available'}])},parsePaginationResponse:data=>({data})},'./Pages.css':{}});const render=()=>{rt.begin();const tree=ns.default();rt.flush();return tree;};render();await tick();return{render,api};}
const action=(tree,fragment)=>nodes(tree).find(n=>n.type==='button'&&n.props.onClick?.toString().includes(fragment));
it.each(['Requirements','TestSuites','Executions'].flatMap(name=>['admin','qa','reader'].map(role=>[name,role])))('%s deletion/create visibility for %s',async(name,role)=>{const p=await page(name,role);expect(Boolean(action(p.render(),'handleDelete'))).toBe(role==='admin');expect(Boolean(action(p.render(),'setIsModalOpen(true)'))).toBe(role!=='reader');if(role==='reader')expect(p.api.create).not.toHaveBeenCalled();expect(p.api.delete).not.toHaveBeenCalled();});
it.each(['admin','qa','reader'])('suite unlink is Admin-only, links editable only by writers: %s',async role=>{const p=await page('TestSuites',role);await action(p.render(),'openCasesModal').props.onClick();expect(Boolean(action(p.render(),'handleRemoveCase'))).toBe(role==='admin');expect(Boolean(action(p.render(),'handleAddCase'))).toBe(role!=='reader');expect(p.api.removeCase).not.toHaveBeenCalled();});
it.each(['admin','qa','reader'])('execution result controls respect %s',async role=>{const p=await page('Executions',role);await action(p.render(),'toggleExpand').props.onClick();const tree=p.render();expect(nodes(tree).some(n=>n.type==='select'&&n.props.onChange?.toString().includes('handleUpdateResultStatus'))).toBe(role!=='reader');expect(nodes(tree).some(n=>n.type==='input'&&n.props.onBlur)).toBe(role!=='reader');expect(Boolean(action(tree,'handleFinalize'))).toBe(role!=='reader');expect(p.api.updateResult).not.toHaveBeenCalled();});
