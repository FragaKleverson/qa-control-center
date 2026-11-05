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
  if (['pages/TestCases.jsx', 'components/Modal.jsx'].includes(file)) code = jsx(code);
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
let runtime, catalog, render, open, state;
beforeEach(async () => {
  runtime = hooks(); catalog = jest.fn().mockResolvedValue([]); open = false;
  const hook = await load('hooks/useProjectLink.js', { react: { useState: runtime.useState, useEffect: runtime.useEffect }, '../services/api': { projectCatalogAPI: { list: catalog }, parsePaginationResponse: response => Array.isArray(response) ? { data: response, total: response.length } : response } });
  render = () => { runtime.begin(); state = hook.default(open); runtime.flush(); return state; }; render();
});
async function start(record = null) { state.reset(record); open = true; render(); await tick(); return render(); }
it('creation without selection omits project_id and never auto-selects first', async () => {
  catalog.mockResolvedValue([{ id: 9, nome: 'P' }]); await start(); expect(state.selection).toBe(''); expect(state.payload()).toEqual({});
});
it('creation with active Project sends numeric ID', async () => {
  catalog.mockResolvedValue([{ id: 9, nome: 'P' }]); await start(); state.select('9'); render(); expect(state.payload()).toEqual({ project_id: 9 });
});
it.each(['empty', 'error'])('catalog %s allows saving without a link', async mode => {
  if (mode === 'error') catalog.mockRejectedValue(new Error('Offline')); await start();
  expect(state.payload()).toEqual({}); expect(state.selection).toBe(''); expect(state.data).toEqual([]);
  if (mode === 'error') expect(state.error).toBe('Offline');
});
it.each([null, '2026-10-30'])('unchanged existing Project %j is omitted even if catalog fails', async project_deleted_at => {
  catalog.mockRejectedValue(new Error('Offline')); await start({ project_id: 5, project_nome: 'Existing', project_deleted_at });
  expect(state.selection).toBe('5'); expect(state.payload()).toEqual({});
});
it('explicit removal sends null even on catalog failure', async () => {
  catalog.mockRejectedValue(new Error('Offline')); await start({ project_id: 5 }); state.select(''); render(); expect(state.payload()).toEqual({ project_id: null });
});
it('switching Project and switching back preserve exact update semantics', async () => {
  catalog.mockResolvedValue([{ id: 9, nome: 'P' }, { id: 5, nome: 'Original' }]); await start({ project_id: 5 });
  state.select('9'); render(); expect(state.payload()).toEqual({ project_id: 9 }); state.select('5'); render(); expect(state.payload()).toEqual({});
});
it.each(['0', '-1', '1.5', '999', 'abc'])('rejects invalid or unavailable selection %s', async id => {
  await start(); state.select(id); render(); expect(() => state.payload()).toThrow();
});
it('never offers a deleted Project as a new link', async () => {
  catalog.mockResolvedValue([{ id: 9, nome: 'Deleted', deleted_at: '2026-10-30' }]); await start();
  expect(state.data).toEqual([]); state.select('9'); render(); expect(() => state.payload()).toThrow();
});
it('late catalog result does not overwrite explicit removal', async () => {
  const delayed = deferred(); catalog.mockReturnValue(delayed.promise); state.reset({ project_id: 5 }); open = true; render(); state.select(''); render();
  delayed.resolve([{ id: 9, nome: 'P' }]); await tick(); render(); expect(state.selection).toBe(''); expect(state.payload()).toEqual({ project_id: null });
});
it('older form catalog response is aborted and ignored after reopen', async () => {
  const old = deferred(), latest = deferred(); catalog.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
  state.reset({ project_id: 5 }); open = true; render(); open = false; render(); state.reset({ project_id: 8 }); open = true; render();
  latest.resolve([{ id: 8, nome: 'Latest' }]); await tick(); render(); old.resolve([{ id: 5, nome: 'Old' }]); await tick(); render();
  expect(catalog.mock.calls[0][1].signal.aborted).toBe(true); expect(state.selection).toBe('8'); expect(state.data.map(p => p.id)).toEqual([8]);
});
it('rejects incomplete catalog safely instead of offering a partial selection', async () => {
  catalog.mockResolvedValue({ data: [{ id: 1, nome: 'P' }], total: 2 }); await start(); expect(state.error).toBeTruthy(); expect(state.payload()).toEqual({});
});
it('loads catalog only while form opens, not on viewing/pagination', () => { render(); render(); expect(catalog).not.toHaveBeenCalled(); });
it.each([[{}, 'Sem projeto vinculado'], [{ project_id: 3, project_nome: 'P' }, 'P'], [{ project_id: 3, project_nome: 'P', project_deleted_at: '2026-10-30' }, 'P — Exclu\u00eddo']])('renders project info without network %j', async (record, expected) => {
  const component = await load('components/TestCaseProject.jsx', { react: { createElement: React.createElement } });
  expect((await load('domain/projectText.js')).projectText(record)).toBe(expected); expect(text(component.TestCaseProjectValue({ record }))).toContain(expected); expect(catalog).not.toHaveBeenCalled();
});
it('field shows deleted current Project as disabled option and has accessible label', async () => {
  await start({ project_id: 5, project_nome: 'Old', project_deleted_at: '2026-10-30' });
  const component = await load('components/TestCaseProject.jsx', { react: { createElement: React.createElement } }); const tree = component.default({ link: state });
  expect(nodes(tree).find(n => n.type === 'label')).toBeTruthy(); expect(nodes(tree).find(n => n.type === 'select').props.name).toBe('project_id');
  const current = nodes(tree).find(n => n.type === 'option' && n.props.value === '5'); expect(current.props.disabled).toBe(true); expect(text(current)).toContain('Exclu\u00eddo');
});

async function page(role = 'qa') {
  const runtime = hooks(); let link = { reset: jest.fn(), payload: jest.fn(() => ({})) };
  const record = { id: 42, titulo: 'Case', descricao: 'D', feature: 'F', cenarios: [{ nome: 'C', tipo: 'Happy Path', passos: 'Given' }], project_id: 5, project_nome: 'Original' };
  const api = { list: jest.fn(), create: jest.fn().mockResolvedValue({}), update: jest.fn().mockResolvedValue({}), delete: jest.fn() };
  const list = { data: [record], page: 3, pageSize: 20, total: 80, mounted: { current: true }, query: { sort_dir: 'desc' }, reload: jest.fn(), setQuery: jest.fn(), setPage: jest.fn(), setPageSize: jest.fn() };
  const hook = jest.fn(() => link);
  const module = await load('pages/TestCases.jsx', {
    react: { useState: runtime.useState, useRef: runtime.useRef, useEffect: runtime.useEffect },
    '../contexts/AuthContext': { useAuth: () => ({ user: { role } }) }, '../services/api': { projectsAPI: api },
    '../hooks/useProjectLink': { default: hook }, '../hooks/usePaginatedList': { default: () => list },
    '../components/Modal': { default: 'Modal' }, '../components/ConfirmDialog': { default: 'ConfirmDialog' }, '../components/Pagination': { default: 'Pagination' },
    '../components/TestCaseProject': { default: 'ProjectField', TestCaseProjectValue: 'ProjectValue' }, './Pages.css': {},
  });
  const render = () => { runtime.begin(); const tree = module.default(); runtime.flush(); return tree; };
  return { render, api, list, link, record, hook };
}
it.each(['admin', 'qa', 'reader'])('Test Cases keeps role permissions for %s', async role => {
  const p = await page(role); const tree = p.render();
  expect(Boolean(button(tree, '+ New Test Case'))).toBe(role !== 'reader');
  expect(nodes(tree).some(n => n.props?.title === 'Editar')).toBe(role !== 'reader');
  expect(nodes(tree).some(n => n.props?.['aria-label'] === 'Excluir TC0042')).toBe(role === 'admin');
});
it.each([{}, { project_id: 9 }, { project_id: null }])('sends exact optional edit payload %j preserving existing fields', async payload => {
  const p = await page(); p.link.payload.mockReturnValue(payload);
  nodes(p.render()).find(n => n.props?.title === 'Editar').props.onClick(); expect(p.link.reset).toHaveBeenCalledWith(p.record);
  await button(p.render(), 'Atualizar').props.onClick();
  expect(p.api.update).toHaveBeenCalledWith(42, { titulo: 'Case', descricao: 'D', feature: 'F', ...payload });
  expect(p.list.setPage).not.toHaveBeenCalled(); expect(p.list.setQuery).not.toHaveBeenCalled();
});
it('failed update retains form, document, and Project selection', async () => {
  const p = await page(); p.link.payload.mockReturnValue({ project_id: 9 }); p.api.update.mockRejectedValue(new Error('Conflict'));
  nodes(p.render()).find(n => n.props?.title === 'Editar').props.onClick();
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try { await button(p.render(), 'Atualizar').props.onClick(); } finally { log.mockRestore(); }
  const tree = p.render(); expect(button(tree, 'Atualizar')).toBeTruthy(); expect(p.link.reset).toHaveBeenCalledTimes(1); expect(p.list.reload).not.toHaveBeenCalled();
  expect(nodes(tree).find(n => n.props?.placeholder === 'Feature').props.value).toBe('F');
});
it('view uses metadata from case and does not open catalog or reset paging', async () => {
  const p = await page('reader'); button(p.render(), 'TC0042').props.onClick(); const tree = p.render();
  expect(nodes(tree).find(n => n.type === 'ProjectValue').props.record).toEqual(p.record);
  expect(p.hook.mock.calls.at(-1)[0]).toBe(false); expect(p.link.reset).not.toHaveBeenCalled(); expect(p.list.reload).not.toHaveBeenCalled();
  expect(nodes(tree).find(n => n.type === 'Pagination').props.page).toBe(3);
});
it.each([[null, "legacy", { nome: { nested: true } }], { legacy: [1, 2] }, "historical scenarios"].map(value => [value]))("views legacy JSON scenarios safely: %j", async cenarios => {
  const p = await page('reader'); p.record.cenarios = cenarios;
  button(p.render(), 'TC0042').props.onClick();
  const tree = p.render();
  expect(nodes(tree).some(node => node.type === 'pre')).toBe(true);
  expect(p.api.update).not.toHaveBeenCalled();
});
it.each([{}, { project_id: 9 }])('creates a case with payload %j without altering existing document fields', async payload => {
  const p = await page(); p.link.payload.mockReturnValue(payload);
  button(p.render(), '+ New Test Case').props.onClick();
  const fields = [['T\u00edtulo', 'Case'], ['Descri\u00e7\u00e3o', 'D'], ['Feature', 'F'], ['Nome do cenario', 'C'], ['Given / When / Then', 'Given']];
  for (const [placeholder, value] of fields) nodes(p.render()).find(n => n.props?.placeholder === placeholder).props.onChange({ target: { value } });
  await button(p.render(), 'Salvar').props.onClick();
  expect(p.api.create).toHaveBeenCalledWith({ titulo: 'Case', descricao: 'D', feature: 'F', cenarios: [{ nome: 'C', tipo: 'Happy Path', passos: 'Given' }], ...payload });
  expect(p.list.setQuery).not.toHaveBeenCalled(); expect(p.list.setPage).not.toHaveBeenCalled();
});
it('loading/error/empty catalog messages do not disable the optional field', async () => {
  const component = await load('components/TestCaseProject.jsx', { react: { createElement: React.createElement } });
  for (const link of [{ data: [], selection: '', loading: true }, { data: [], selection: '', error: 'Offline' }, { data: [], selection: '' }]) {
    const tree = component.default({ link }); expect(nodes(tree).find(n => n.type === 'select').props.disabled).toBe(false);
    expect(nodes(tree).some(n => ['status', 'alert'].includes(n.props?.role))).toBe(true);
  }
});
function openCase(p, kind) {
  if (kind === 'edit') nodes(p.render()).find(n => n.props?.title === 'Editar').props.onClick();
  else {
    button(p.render(), '+ New Test Case').props.onClick();
    for (const [placeholder, value] of [['T\u00edtulo', 'New'], ['Descri\u00e7\u00e3o', 'D'], ['Feature', 'F'], ['Nome do cenario', 'C'], ['Given / When / Then', 'Given']]) nodes(p.render()).find(n => n.props?.placeholder === placeholder).props.onChange({ target: { value } });
  }
}
function saveCase(p) { return (button(p.render(), 'Atualizar') || button(p.render(), 'Salvar')).props.onClick(); }
it.each(['create', 'edit'].flatMap(a => ['create', 'edit'].flatMap(b => ['success', 'error'].map(outcome => [a, b, outcome]))))('late A %s followed by B %s: %s leaves B intact', async (a, b, outcome) => {
  const p = await page(); const delayed = deferred(); p.api[a === 'edit' ? 'update' : 'create'].mockReturnValueOnce(delayed.promise);
  openCase(p, a); const pending = saveCase(p);
  button(p.render(), 'Cancelar').props.onClick(); openCase(p, b);
  nodes(p.render()).find(n => n.props?.placeholder === 'Feature').props.onChange({ target: { value: 'B intact' } });
  const resets = p.link.reset.mock.calls.length; p.link.payload.mockReturnValue({ project_id: 9 });
  if (outcome === 'success') delayed.resolve({ id: 42 }); else delayed.reject(new Error('Old A error'));
  await pending; const tree = p.render();
  expect(button(tree, b === 'edit' ? 'Atualizar' : 'Salvar')).toBeTruthy();
  expect(nodes(tree).find(n => n.props?.placeholder === 'Feature').props.value).toBe('B intact');
  expect(p.link.reset).toHaveBeenCalledTimes(resets); expect(p.link.payload()).toEqual({ project_id: 9 });
  expect(p.list.reload).not.toHaveBeenCalled(); expect(text(tree)).not.toContain('Old A error');
});
it('A completion cannot unset B loading or overwrite B operation message', async () => {
  const p = await page(); const a = deferred(), b = deferred(); p.api.update.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  openCase(p, 'edit'); const pendingA = saveCase(p); button(p.render(), 'Cancelar').props.onClick(); openCase(p, 'edit');
  const pendingB = saveCase(p); a.resolve({}); await pendingA;
  expect(button(p.render(), 'Salvando...').props.disabled).toBe(true);
  b.resolve({}); await pendingB; expect(text(p.render())).toContain('Atualizado com sucesso'); expect(p.list.reload).toHaveBeenCalledTimes(1);
});
it('three consecutive operations retain newest success after older success/error', async () => {
  const p = await page(); const a = deferred(), b = deferred(); p.api.update.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  openCase(p, 'edit'); const pa = saveCase(p); button(p.render(), 'Cancelar').props.onClick();
  openCase(p, 'edit'); const pb = saveCase(p); button(p.render(), 'Cancelar').props.onClick();
  openCase(p, 'create'); await saveCase(p); b.reject(new Error('Old B')); a.resolve({}); await Promise.all([pa, pb]);
  expect(text(p.render())).toContain('Salvo com sucesso'); expect(text(p.render())).not.toContain('Old B'); expect(p.list.reload).toHaveBeenCalledTimes(1);
});
it('older response cannot clear error from a newer active operation', async () => {
  const p = await page(); const old = deferred(); p.api.update.mockReturnValueOnce(old.promise).mockRejectedValueOnce(new Error('Newest failure'));
  openCase(p, 'edit'); const pending = saveCase(p); button(p.render(), 'Cancelar').props.onClick(); openCase(p, 'edit');
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try { await saveCase(p); old.resolve({}); await pending; } finally { log.mockRestore(); }
  expect(text(p.render())).toContain('Newest failure'); expect(button(p.render(), 'Atualizar')).toBeTruthy();
});
it('edits first scenario while preserving additional scenarios and unknown fields', async () => {
  const p = await page(); p.record.cenarios = [{ nome: 'C', tipo: 'Happy Path', passos: 'Before', custom: { preserve: true } }, { nome: 'Second', extra: 7 }];
  openCase(p, 'edit'); nodes(p.render()).find(n => n.props?.placeholder === 'Given / When / Then').props.onChange({ target: { value: 'After' } });
  await saveCase(p);
  expect(p.api.update.mock.calls[0][1].cenarios).toEqual([{ nome: 'C', tipo: 'Happy Path', passos: 'After', custom: { preserve: true } }, { nome: 'Second', extra: 7 }]);
});
it.each([null, [], { old: 'shape' }])('does not rewrite untouched historical scenarios %j', async cenarios => {
  const p = await page(); p.record.cenarios = cenarios; openCase(p, 'edit'); await saveCase(p);
  expect(p.api.update.mock.calls[0][1]).not.toHaveProperty('cenarios'); expect(p.api.update.mock.calls[0][1]).not.toHaveProperty('project_id');
});
it('Test Case form opts into existing accessible modal semantics', async () => {
  const p = await page(); openCase(p, 'edit');
  const modal = nodes(p.render()).find(n => n.type === 'Modal' && n.props.isOpen);
  expect(modal.props.dialogLabel).toBeTruthy(); expect(typeof modal.props.onClose).toBe("function");
  modal.props.onClose(); expect(button(p.render(), 'Atualizar')).toBeUndefined();
});
it('real Modal enables dialog semantics, keyboard trap and focus return only when opted in', async () => {
  const runtime = hooks(); const previous = { isConnected: true, focus: jest.fn() };
  const document = { activeElement: previous, body: { style: {} }, addEventListener: jest.fn(), removeEventListener: jest.fn() };
  const component = await load('components/Modal.jsx', { react: { useRef: runtime.useRef, useEffect: runtime.useEffect, useId: () => 'test-case-dialog-title' }, './Modal.css': {} }, { document });
  const props = { isOpen: true, title: 'Editar Test Case', dialogLabel: 'Formulario de Test Case', onClose: jest.fn() };
  runtime.begin(); const tree = component.default(props);
  const dialog = nodes(tree).find(n => n.props?.role === 'dialog');
  expect(dialog.props['aria-modal']).toBe(true); expect(dialog.props['aria-labelledby']).toBe('test-case-dialog-title');
  const first = { focus: jest.fn() }, last = { focus: jest.fn() };
  dialog.props.ref.current = { querySelector: () => first, querySelectorAll: () => [first, last] };
  runtime.flush(); expect(first.focus).toHaveBeenCalledTimes(1);
  document.activeElement = last; const preventDefault = jest.fn(); dialog.props.onKeyDown({ key: 'Tab', shiftKey: false, preventDefault }); expect(preventDefault).toHaveBeenCalled();
  const escape = document.addEventListener.mock.calls.find(([type]) => type === 'keydown')[1]; escape({ key: 'Escape' }); expect(props.onClose).toHaveBeenCalledTimes(1);
  runtime.begin(); component.default({ ...props, isOpen: false }); runtime.flush(); expect(previous.focus).toHaveBeenCalledTimes(1);
});
