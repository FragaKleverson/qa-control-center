const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const React = require('../../backend/node_modules/react');
const babel = require('../../backend/node_modules/@babel/core');
const same = (a,b) => a && b && a.length === b.length && a.every((v,i) => Object.is(v,b[i]));
function runtime() {
  const state=[], effects=[], memo=[]; let cursor=0, queued=[];
  return {
    begin(){cursor=0;queued=[];}, flush(){queued.forEach(fn=>fn());}, stop(){effects.forEach(e=>e?.cleanup?.());},
    useState(initial){const id=cursor++;if(!(id in state))state[id]=typeof initial==='function'?initial():initial;return [state[id],value=>{state[id]=typeof value==='function'?value(state[id]):value;}];},
    useRef(value){const id=cursor++;return state[id] ||= {current:value};},
    useCallback(fn,deps){const id=cursor++;if(!same(memo[id]?.deps,deps))memo[id]={deps,fn};return memo[id].fn;},
    useEffect(fn,deps){const id=cursor++;if(!same(effects[id]?.deps,deps))queued.push(()=>{effects[id]?.cleanup?.();effects[id]={deps,cleanup:fn()};});},
  };
}
function transform(code) {
  return babel.transformSync(code,{configFile:false,babelrc:false,parserOpts:{plugins:['jsx']},plugins:[({types:t})=>{
    const tag=n=>n.type==='JSXMemberExpression'?t.memberExpression(tag(n.object),t.identifier(n.property.name)):/^[a-z]/.test(n.name)?t.stringLiteral(n.name):t.identifier(n.name);
    return {visitor:{JSXElement:{exit(p){const n=p.node;const props=n.openingElement.attributes.map(a=>a.type==='JSXSpreadAttribute'?t.spreadElement(a.argument):t.objectProperty(t.stringLiteral(a.name.name),a.value?(a.value.type==='JSXExpressionContainer'?a.value.expression:a.value):t.booleanLiteral(true)));
      const children=n.children.flatMap(c=>c.type==='JSXText'?(c.value.trim()?[t.stringLiteral(c.value.replace(/\s+/g,' ').trim())]:[]):c.type==='JSXExpressionContainer'?(c.expression.type==='JSXEmptyExpression'?[]:[c.expression]):[c]);
      p.replaceWith(t.callExpression(t.identifier('__jsx'),[tag(n.openingElement.name),t.objectExpression(props),...children]));}}}};
  }]}).code;
}
async function load(file,imports,globals={}) {
  const context=vm.createContext({__jsx:React.createElement,AbortController,setTimeout:()=>1,clearTimeout(){},console,...globals});
  const code=fs.readFileSync(path.join(__dirname,'../src',file),'utf8');
  const module=new vm.SourceTextModule(file.endsWith('.jsx')?transform(code):code,{context});
  await module.link(name=>{if(!(name in imports))throw Error('Unexpected import '+name);const exports=imports[name];return new vm.SyntheticModule(Object.keys(exports),function(){Object.entries(exports).forEach(([k,v])=>this.setExport(k,v));},{context});});await module.evaluate();return module.namespace;
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const nodes=e=>!e||typeof e!=='object'?[]:[e,...React.Children.toArray(e.props?.children).flatMap(nodes)];
const text=e=>React.Children.toArray(e?.props?.children).map(c=>typeof c==='object'?text(c):c).join('');
const defer=()=>{let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j;});return {promise,resolve,reject};};
it('shared auth context is initialized with the same null fallback',async()=>{
  const createContext=jest.fn(()=>({Provider:'Provider'}));const shared=await load('contexts/authContextValue.js',{react:{createContext}});
  expect(createContext).toHaveBeenCalledWith(null);expect(shared.AuthContext.Provider).toBe('Provider');
});
async function auth(stored={}) {
  const hooks=runtime(), context={Provider:'Provider'}, values=new Map(Object.entries(stored));
  const storage={getItem:k=>values.get(k)??null,setItem:jest.fn((k,v)=>values.set(k,v)),removeItem:jest.fn(k=>values.delete(k))};
  const login=jest.fn();const component=await load('contexts/AuthProvider.jsx',{react:{useState:hooks.useState,useCallback:hooks.useCallback},'../services/api':{authAPI:{login}},'./authContextValue':{AuthContext:context}},{localStorage:storage});
  const render=()=>{hooks.begin();return component.AuthProvider({children:'Child'}).props.value;};return {render,storage,login};
}
it('provider preserves stored token/user and authenticated contract',async()=>{
  const p=await auth({qa_token:'old',qa_user:JSON.stringify({id:7,role:'qa'})});expect(p.render()).toMatchObject({token:'old',user:{id:7,role:'qa'},isAuthenticated:true});
});
it('login and logout preserve API payload and localStorage keys',async()=>{
  const p=await auth();p.login.mockResolvedValue({token:'new',user:{id:7,role:'reader'}});
  await p.render().login('email','password');expect(p.login).toHaveBeenCalledWith('email','password');
  expect(p.storage.setItem).toHaveBeenCalledWith('qa_token','new');expect(p.storage.setItem).toHaveBeenCalledWith('qa_user',JSON.stringify({id:7,role:'reader'}));
  expect(p.render().isAuthenticated).toBe(true);p.render().logout();expect(p.render()).toMatchObject({token:null,user:null,isAuthenticated:false});expect(p.storage.removeItem.mock.calls).toEqual([['qa_token'],['qa_user']]);
});
it('failed login does not change token/user or persist data',async()=>{
  const p=await auth();p.login.mockResolvedValue({error:'Denied'});await expect(p.render().login('e','p')).rejects.toThrow('Denied');expect(p.storage.setItem).not.toHaveBeenCalled();expect(p.render().isAuthenticated).toBe(false);
});
it('useAuth reads shared context and keeps missing-provider error',async()=>{
  const context={};let value=null;const useContext=jest.fn(()=>value);const module=await load('contexts/AuthContext.jsx',{react:{useContext},'./authContextValue':{AuthContext:context}});
  expect(()=>module.useAuth()).toThrow('AuthProvider');value={user:{id:7},logout:jest.fn()};expect(module.useAuth()).toBe(value);expect(useContext).toHaveBeenCalledWith(context);
});
async function dashboard(api) {
  const hooks=runtime();const module=await load('pages/Dashboard.jsx',{react:hooks,'../components/Modal':{default:'Modal'},'../components/GherkinDisplay':{default:'Gherkin'},'../services/api':{statsAPI:{getDashboard:api}},'./Dashboard.css':{}});
  const render=()=>{hooks.begin();const tree=module.default();hooks.flush();return tree;};return {render,hooks};
}
it('Dashboard loads original stats endpoint once and keeps data mapping',async()=>{
  const api=jest.fn().mockResolvedValue({stats:{totalProjects:3,totalExecutions:2,testCases:{total:0}},recentProjects:[{id:42,titulo:'Legacy title'}],recentExecutions:[]});
  const p=await dashboard(api);p.render();await tick();const tree=p.render();expect(api).toHaveBeenCalledTimes(1);expect(text(tree)).toContain('Legacy title');expect(text(tree)).toContain('3 projects');p.render();expect(api).toHaveBeenCalledTimes(1);
});
it('Dashboard retains error toast for initial load failure',async()=>{
  const api=jest.fn().mockRejectedValue(new Error('offline'));const log=jest.spyOn(console,'error').mockImplementation(()=>{});
  try{const p=await dashboard(api);p.render();await tick();expect(text(p.render())).toContain('Erro ao carregar dashboard');}finally{log.mockRestore();}
});
async function reports(overrides={},role='qa') {
  const hooks=runtime();let history;
  const apis={executionsAPI:{getStats:jest.fn().mockResolvedValue({total:0,passed:0,failed:0,pending:0})},testSuitesAPI:{list:jest.fn().mockResolvedValue([])},reportsAPI:{list:jest.fn().mockResolvedValue({executions:{data:[],total:0,page:1,limit:20},suiteStats:[]}),generate:jest.fn().mockResolvedValue({summary:{total:0,passed:0,failed:0,pending:0,blocked:0,skipped:0},executions:[]})},parsePaginationResponse:jest.fn(),...overrides};
  const list={data:[],page:1,pageSize:20,total:0,isLoading:false,error:'',reload:jest.fn(),setPage:jest.fn(),setPageSize:jest.fn()};
  const module=await load('pages/Reports.jsx',{react:hooks,'../contexts/AuthContext':{useAuth:()=>({user:{role}})},'../services/api':apis,'../components/Pagination':{default:'Pagination'},'../hooks/usePaginatedList':{default:fn=>{history=fn;return list;}},'./Pages.css':{}});
  const render=()=>{hooks.begin();const tree=module.default();hooks.flush();return tree;};return {render,hooks,apis,getHistory:()=>history};
}
it('Reports auxiliary loading stays stable across renders without changing requests',async()=>{
  const p=await reports();p.render();await tick();p.render();p.render();expect(p.apis.executionsAPI.getStats).toHaveBeenCalledTimes(1);expect(p.apis.testSuitesAPI.list).toHaveBeenCalledWith(undefined,{signal:expect.any(AbortSignal)});
  await p.getHistory()({page:2,limit:20},{signal:new AbortController().signal});expect(p.apis.reportsAPI.list).toHaveBeenCalledWith({page:2,limit:20},{signal:expect.any(AbortSignal)});
});
it('Reports retains error notification from auxiliary request',async()=>{
  const p=await reports({executionsAPI:{getStats:jest.fn().mockRejectedValue(new Error('Stats unavailable'))}});p.render();await tick();expect(text(p.render())).toContain('Stats unavailable');
});
it('Reports ignores auxiliary completion after unmount',async()=>{
  const delayed=defer();const p=await reports({executionsAPI:{getStats:jest.fn(()=>delayed.promise)}});p.render();p.hooks.stop();delayed.reject(new Error('Late stats'));await tick();expect(text(p.render())).not.toContain('Late stats');
});
it('Reports generation preserves payload filters and user-action error message',async()=>{
  const p=await reports();p.render();await tick();let tree=p.render();
  const start=nodes(tree).find(n=>n.type==='input'&&n.props.type==='date');start.props.onChange({target:{value:'2026-10-30'}});
  p.apis.reportsAPI.generate.mockRejectedValue(new Error('Failure'));const log=jest.spyOn(console,'error').mockImplementation(()=>{});
  try{tree=p.render();await nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});expect(p.apis.reportsAPI.generate).toHaveBeenCalledWith({startDate:'2026-10-30'});expect(text(p.render())).toContain('Erro ao gerar');}finally{log.mockRestore();}
});

it('Reader cannot generate or export Reports even by invoking handlers',async()=>{const p=await reports({},'reader');p.apis.reportsAPI.exportDocx=jest.fn();p.render();await tick();const tree=p.render();await nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});const exportButton=nodes(tree).find(n=>n.type==='button'&&n.props.onClick?.name==='handleExportDocx');expect(exportButton.props.disabled).toBe(true);await exportButton.props.onClick({preventDefault(){}});expect(p.apis.reportsAPI.generate).not.toHaveBeenCalled();expect(p.apis.reportsAPI.exportDocx).not.toHaveBeenCalled();});
