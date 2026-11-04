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
  if (['pages/TestPlan.jsx'].includes(file)) code = jsx(code);
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

async function page(role = 'admin') {
 const runtime=hooks(); const api=Object.fromEntries(['list','getSuites','getById','addSuite','removeSuite','create','execute'].map(k=>[k,jest.fn().mockResolvedValue([])]));
 const executions={getById:jest.fn(),getResults:jest.fn().mockResolvedValue([])};
 const plans=[{id:1,titulo:'Plan A',ambiente:'staging',legacy_classification:'eligible',execution_id:10},{id:2,titulo:'Plan B',ambiente:'staging',legacy_classification:'eligible',execution_id:20}];
 const list={data:plans,page:1,pageSize:10,total:2,setPage:jest.fn(),setPageSize:jest.fn(),isLoading:false,error:'',reload:jest.fn(),mounted:{current:true}};
 const ns=await load('pages/TestPlan.jsx',{
 react:{useState:runtime.useState,useEffect:runtime.useEffect,useRef:runtime.useRef},
 '../contexts/AuthContext':{useAuth:()=>({user:{role}})},
 '../domain/planExecution':{planExecutionView:()=>({available:true}),executionLookupMessage:e=>e.message},
 '../domain/environments':{ENVIRONMENTS:['staging','production','development','homologa??o']},
 '../components/Modal':{default:'Modal'},'../components/ConfirmDialog':{default:'ConfirmDialog'},'../components/Pagination':{default:'Pagination'},
 '../hooks/usePaginatedList':{default:()=>list},'../services/api':{testPlansAPI:api,testSuitesAPI:{list:jest.fn().mockResolvedValue([{id:5,nome:'Suite'}])},executionsAPI:executions,parsePaginationResponse:data=>({data:Array.isArray(data)?data:[],total:data.length||0})},'./Pages.css':{}
 });
 const render=()=>{runtime.begin();const tree=ns.default();runtime.flush();return tree};render();await tick();
 return {render,api,executions,list};
}
const modal=(tree,title)=>nodes(tree).find(n=>n.type==='Modal'&&n.props.title===title);
it.each(['success','error'])('late creation %s cannot close or alter a new form',async outcome=>{
 const p=await page(),a=deferred();p.api.create.mockReturnValueOnce(a.promise);
 button(p.render(),'+ New Plan').props.onClick();let tree=p.render();nodes(tree).find(n=>n.props.placeholder==='Plan Title').props.onChange({target:{value:'A'}});nodes(p.render()).find(n=>n.type==='select').props.onChange({target:{value:'staging'}});
 const pending=nodes(p.render()).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
 button(p.render(),'Cancel').props.onClick();button(p.render(),'+ New Plan').props.onClick();nodes(p.render()).find(n=>n.props.placeholder==='Plan Title').props.onChange({target:{value:'B'}});
 if(outcome==='success')a.resolve({id:1});else a.reject(new Error('old error'));await pending;
 expect(modal(p.render(),'Create New Test Plan')).toBeTruthy();expect(nodes(p.render()).find(n=>n.props.placeholder==='Plan Title').props.value).toBe('B');expect(button(p.render(),'Create Plan').props.disabled).toBe(false);expect(text(p.render())).not.toContain('old error');
});
it.each(['addSuite','removeSuite'].flatMap(action=>['success','error'].map(outcome=>[action,outcome])))('late %s %s does not replace or close suites for B',async(action,outcome)=>{
 const p=await page(),a=deferred();p.api.getSuites.mockResolvedValue([{id:5,nome:'A suite'}]);const manage=()=>nodes(p.render()).filter(n=>n.type==='button'&&text(n)==='Gerenciar suítes');
 await manage()[0].props.onClick();const label=action==='addSuite'?'+ Adicionar':'Excluir vínculo';if(action==='addSuite'){p.api.getSuites.mockResolvedValueOnce([]);await manage()[0].props.onClick();}
 p.api[action].mockReturnValueOnce(a.promise);const pending=button(p.render(),label).props.onClick();modal(p.render(),'Suites - Plan A').props.onClose();p.api.getSuites.mockResolvedValueOnce([{id:8,nome:'B suite'}]);await manage()[1].props.onClick();
 if(outcome==='success')a.resolve({});else a.reject(Object.assign(new Error('old conflict'),{status:409}));await pending;
 expect(modal(p.render(),'Suites - Plan B')).toBeTruthy();expect(text(p.render())).toContain('B suite');expect(text(p.render())).not.toContain('old conflict');
});
it.each(['success','error'])('late execution lookup %s cannot overwrite a newer lookup',async outcome=>{
 const p=await page(),a=deferred();p.executions.getById.mockReturnValueOnce(a.promise).mockResolvedValueOnce({id:20,status:'passed',ambiente:'staging'});
 const view=()=>nodes(p.render()).filter(n=>n.type==='button'&&text(n).startsWith('Visualizar execução'));
 const old=view()[0].props.onClick();await view()[1].props.onClick();if(outcome==='success')a.resolve({id:10,status:'failed'});else a.reject(new Error('old lookup'));await old;
 expect(text(p.render())).toContain('#20');expect(text(p.render())).not.toContain('old lookup');expect(text(p.render())).not.toContain('#10 -');
});
it('Reader cannot create, execute or mutate links',async()=>{const p=await page('leitor');expect(button(p.render(),'+ New Plan')).toBeUndefined();expect(button(p.render(),'Gerenciar suítes')).toBeUndefined();expect(p.api.create).not.toHaveBeenCalled();});
it.each(['admin','qa','reader'])('Test Plans deletion and unlink visibility for %s', async role => {
 const p=await page(role); expect(Boolean(button(p.render(),'Excluir'))).toBe(role==='admin');
 p.api.getSuites.mockResolvedValue([{id:8,nome:'Linked suite'}]);
 await nodes(p.render()).find(n=>n.type==='button'&&n.props.onClick?.toString().includes('openSuitesModal')).props.onClick();
 expect(Boolean(button(p.render(),'Excluir'))).toBe(role==='admin');
 expect(Boolean(button(p.render(),'+ Adicionar'))).toBe(role!=='reader');
 expect(p.api.removeSuite).not.toHaveBeenCalled();
});
it('duplicate creation submits only once before rerender', async () => {
 const p=await page(),a=deferred();p.api.create.mockReturnValue(a.promise);
 button(p.render(),'+ New Plan').props.onClick();nodes(p.render()).find(n=>n.props.placeholder==='Plan Title').props.onChange({target:{value:'A'}});nodes(p.render()).find(n=>n.type==='select').props.onChange({target:{value:'staging'}});
 const submit=nodes(p.render()).find(n=>n.type==='form').props.onSubmit;
 const first=submit({preventDefault(){}});await submit({preventDefault(){}});
 expect(p.api.create).toHaveBeenCalledTimes(1);a.resolve({id:1});await first;
});
it('duplicate suite mutations are blocked before rerender',async()=>{
 const p=await page(),a=deferred();p.api.getSuites.mockResolvedValue([{id:5,nome:'Suite'}]);
 await button(p.render(),'Gerenciar suítes').props.onClick();p.api.removeSuite.mockReturnValue(a.promise);
 const remove=button(p.render(),'Excluir vínculo').props.onClick;const first=remove();await remove();
 expect(p.api.removeSuite).toHaveBeenCalledTimes(1);a.resolve({});await first;
});
