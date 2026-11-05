const { loadActionButton } = require("./actionButtonLoader.cjs");
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const React = require('../../backend/node_modules/react');
const root = path.join(__dirname, '../src');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function hooks() {
  const state = []; let cursor = 0; const effects = []; let queued = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
  return {
    begin() { cursor = 0; queued = []; },
    flush() { queued.forEach(run => run()); },
    stop() { effects.forEach(effect => effect?.cleanup?.()); },
    useState(initial) { const id = cursor++; if (!(id in state)) state[id] = typeof initial === 'function' ? initial() : initial; return [state[id], value => { state[id] = typeof value === 'function' ? value(state[id]) : value; }]; },
    useRef(value) { const id = cursor++; return state[id] ||= { current: value }; },
    useCallback(fn) { return fn; },
    useEffect(fn, deps) { const id = cursor++; if (!same(effects[id]?.deps, deps)) queued.push(() => { effects[id]?.cleanup?.(); effects[id] = { deps, cleanup: fn() }; }); },
  };
}
async function load(file, imports, globals = {}) {
  const context = vm.createContext({ AbortController, URLSearchParams, ...globals });
  const module = new vm.SourceTextModule(read(file), { context, initializeImportMeta(meta) { meta.env = {}; } });
  const modules = new Map();
  await module.link(async specifier => {
    if (["../components/ActionButton", "./ActionButton"].includes(specifier)) return loadActionButton(context);
    if (modules.has(specifier)) return modules.get(specifier);
    if (!(specifier in imports)) throw new Error(`Unexpected import ${specifier}`);
    const exports = imports[specifier];
    const synthetic = new vm.SyntheticModule(Object.keys(exports), function () { Object.entries(exports).forEach(([key, value]) => this.setExport(key, value)); }, { context });
    modules.set(specifier, synthetic); return synthetic;
  });
  await module.evaluate(); return module.namespace;
}
function nodes(element) {
  if (element?.type?.name === "ActionButton") return nodes(element.type(element.props));
  if (!element || typeof element !== 'object') return [];
  if (element.type === 'Modal' && !element.props.isOpen) return [];
  return [element, ...React.Children.toArray(element.props?.children).flatMap(nodes)];
}
const text = element => React.Children.toArray(element?.props?.children).map(child => typeof child === 'object' ? text(child) : child).join('');
const button = (tree, label) => nodes(tree).find(node => node.type === 'button' && text(node) === label);
const defer = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
let pageModule, runtime, catalog, legacy, lists, viewers, render;
beforeEach(async () => {
  runtime = hooks();
  const api = () => ({ list: jest.fn(), getById: jest.fn(), create: jest.fn().mockResolvedValue({ id: 1 }), update: jest.fn().mockResolvedValue({ id: 1 }), delete: jest.fn().mockResolvedValue({}) });
  catalog = api(); legacy = api();
  const list = (data) => ({ data, page: 3, pageSize: 20, total: 100, isLoading: false, error: '', mounted: { current: true }, reload: jest.fn(), setPage: jest.fn(), setPageSize: jest.fn() });
  lists = new Map([[catalog.list, list([{ id: 1, nome: 'Novo', descricao: null }])], [legacy.list, list([{ id: 1, titulo: 'Antigo', descricao: 'Texto', feature: 'Login' }])]]);
  viewers = new Map([[catalog.getById, { open: jest.fn() }], [legacy.getById, { open: jest.fn() }]]);
  pageModule = await load('pages/Projects.jsx', {
    react: { default: React, createElement: React.createElement, useState: runtime.useState, useRef: runtime.useRef, useCallback: runtime.useCallback },
    '../contexts/AuthContext': { useAuth: () => ({ user: { role: 'admin' } }) },
    '../services/api': { projectCatalogAPI: catalog, projectsAPI: legacy },
    '../hooks/usePaginatedList': { default: fn => lists.get(fn) },
    '../hooks/useRecordDetails': { default: fn => viewers.get(fn) },
    '../components/RecordDetails': { default: 'Details', ViewRecordButton: 'View' },
    '../components/Modal': { default: 'Modal' }, '../components/Pagination': { default: 'Pagination' }, './Pages.css': {},
  });
  render = (props = { role: 'admin' }) => { runtime.begin(); return pageModule.ProjectArea(props); };
});
it.each(['admin', 'qa', 'reader'])('%s sees the correct catalog actions', role => {
  const tree = render({ role });
  expect(Boolean(button(tree, 'Novo Project'))).toBe(role !== 'reader');
  expect(Boolean(button(tree, 'Editar'))).toBe(role !== 'reader');
  expect(Boolean(button(tree, 'Excluir'))).toBe(role === 'admin');
  expect(nodes(tree).some(node => node.type === 'View')).toBe(true);
});
it.each(['admin', 'qa', 'reader'])('legacy is read-only for %s and uses its own viewer', role => {
  const tree = render({ role, legacy: true });
  expect(button(tree, 'Novo Project')).toBeUndefined(); expect(button(tree, 'Editar')).toBeUndefined(); expect(button(tree, 'Excluir')).toBeUndefined();
  const view = nodes(tree).find(node => node.type === 'View'); view.props.onView(view.props.record);
  expect(viewers.get(legacy.getById).open).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Antigo' }));
  expect(text(tree)).toContain('revisados posteriormente');
  for (const method of ['create', 'update', 'delete']) expect(legacy[method]).not.toHaveBeenCalled();
});
function fill(tree, name, value) { nodes(tree).find(node => node.props?.name === name).props.onChange({ target: { value } }); }
it('creates trimmed Project with optional description and refreshes only catalog', async () => {
  button(render(), 'Novo Project').props.onClick(); fill(render(), 'nome', '  Project  ');
  await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  expect(catalog.create).toHaveBeenCalledWith({ nome: 'Project', descricao: null });
  expect(lists.get(catalog.list).reload).toHaveBeenCalledTimes(1); expect(lists.get(legacy.list).reload).not.toHaveBeenCalled();
  expect(nodes(render()).find(node => node.type === 'form')).toBeUndefined();
});
it('rejects whitespace-only name without a write', async () => {
  button(render(), 'Novo Project').props.onClick(); fill(render(), 'nome', '   ');
  await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  expect(catalog.create).not.toHaveBeenCalled(); expect(nodes(render()).some(node => node.props?.role === 'alert')).toBe(true);
});
it('edits only nome/descricao and does not expose legacy fields', async () => {
  button(render(), 'Editar').props.onClick(); const tree = render();
  expect(nodes(tree).filter(node => ['input', 'textarea'].includes(node.type)).map(node => node.props.name).filter(Boolean)).toEqual(['nome', 'descricao']);
  fill(tree, 'descricao', 'Updated');
  await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  expect(catalog.update).toHaveBeenCalledWith(1, { nome: 'Novo', descricao: 'Updated' });
});
it('views the catalog with the catalog details kind and no list reload', () => {
  const tree = render(); const view = nodes(tree).find(node => node.type === 'View'); view.props.onView(view.props.record);
  expect(viewers.get(catalog.getById).open).toHaveBeenCalledWith({ id: 1, nome: 'Novo', descricao: null });
  expect(nodes(tree).find(node => node.type === 'Details').props.kind).toBe('catalog');
  expect(lists.get(catalog.list).reload).not.toHaveBeenCalled();
});
it('requires confirmation before deleting; cancel performs no write', async () => {
  button(render(), 'Excluir').props.onClick(); expect(catalog.delete).not.toHaveBeenCalled();
  button(render(), 'Cancelar').props.onClick(); expect(catalog.delete).not.toHaveBeenCalled();
  button(render(), 'Excluir').props.onClick(); await button(render(), 'Confirmar exclusão').props.onClick();
  expect(catalog.delete).toHaveBeenCalledWith(1); expect(legacy.delete).not.toHaveBeenCalled();
});
it('suppresses duplicate submissions while pending', async () => {
  const delayed = defer(); catalog.create.mockReturnValue(delayed.promise);
  button(render(), 'Novo Project').props.onClick(); fill(render(), 'nome', 'P');
  const save = nodes(render()).find(node => node.type === 'form').props.onSubmit;
  const first = save({ preventDefault() {} }); await save({ preventDefault() {} });
  expect(catalog.create).toHaveBeenCalledTimes(1); expect(button(render(), 'Salvando...').props.disabled).toBe(true);
  delayed.resolve({ id: 1 }); await first;
});
it.each(['create', 'delete'])('shows %s failure and preserves retry target', async method => {
  catalog[method].mockRejectedValue(new Error('Offline'));
  if (method === 'create') { button(render(), 'Novo Project').props.onClick(); fill(render(), 'nome', 'P'); await nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); }
  else { button(render(), 'Excluir').props.onClick(); await button(render(), 'Confirmar exclusão').props.onClick(); }
  expect(text(render())).toContain('Offline'); expect(lists.get(catalog.list).reload).not.toHaveBeenCalled();
});
it('ignores write completion after unmount', async () => {
  const delayed = defer(); catalog.create.mockReturnValue(delayed.promise);
  button(render(), 'Novo Project').props.onClick(); fill(render(), 'nome', 'P');
  const pending = nodes(render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  lists.get(catalog.list).mounted.current = false; delayed.resolve({ id: 1 }); await pending;
  expect(lists.get(catalog.list).reload).not.toHaveBeenCalled();
});
it('keeps both areas mounted when switching, with independent pagination props', () => {
  runtime.begin(); let tree = pageModule.default();
  const sections = nodes(tree).filter(node => node.type === 'section');
  expect(sections.map(node => node.props.hidden)).toEqual([false, true]);
  button(tree, 'Registros legados').props.onClick(); runtime.begin(); tree = pageModule.default();
  expect(nodes(tree).filter(node => node.type === 'section').map(node => node.props.hidden)).toEqual([true, false]);
  expect(nodes(tree).filter(node => node.type === pageModule.ProjectArea)).toHaveLength(2);
});
it('filter and page controls stay scoped to the current area', () => {
  let tree = render(); nodes(tree).find(node => node.props?.type === 'search').props.onChange({ target: { value: 'Absent' } }); tree = render();
  expect(nodes(tree).some(node => node.type === 'View')).toBe(false);
  nodes(tree).find(node => node.type === 'Pagination').props.onPageChange(4);
  expect(lists.get(catalog.list).setPage).toHaveBeenCalledWith(4); expect(lists.get(legacy.list).setPage).not.toHaveBeenCalled();
});
it.each(['loading', 'error', 'empty'])('renders list state %s', state => {
  const list = lists.get(catalog.list); if (state === 'loading') list.isLoading = true; if (state === 'error') list.error = 'Unavailable'; if (state === 'empty') list.data = [];
  const tree = render(); expect(nodes(tree).some(node => node.type === 'View')).toBe(false);
  if (state === 'error') { button(tree, 'Tentar novamente').props.onClick(); expect(list.reload).toHaveBeenCalledTimes(1); }
});

it('real API client separates URLs and preserves opt-in and legacy requests', async () => {
  const fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
  const api = await load('services/api.js', {}, { fetch, localStorage: { getItem: () => 'token' }, window: { location: {} } });
  await api.projectCatalogAPI.list(); await api.projectCatalogAPI.list({ page: 2, limit: 20, sort_by: 'id' });
  await api.projectsAPI.list({ page: 3, limit: 50, sort_by: 'id' });
  await api.projectCatalogAPI.create({ nome: 'P' }); await api.projectCatalogAPI.update(1, { nome: 'Q' }); await api.projectCatalogAPI.delete(1); await api.projectCatalogAPI.getById(1);
  expect(fetch.mock.calls.map(([url]) => url.replace('http://localhost:3001', ''))).toEqual(['/projects', '/projects?page=2&limit=20', '/projetos?page=3&limit=50&sort_by=id', '/projects', '/projects/1', '/projects/1', '/projects/1']);
  expect(fetch.mock.calls.map(([, options]) => options.method || 'GET')).toEqual(['GET','GET','GET','POST','PUT','DELETE','GET']);
});
it('real pagination hook rejects stale responses and keeps its current page/query', async () => {
  const runtime = hooks();
  const hook = await load('hooks/usePaginatedList.js', {
    react: { useState: runtime.useState, useRef: runtime.useRef, useCallback: runtime.useCallback, useEffect: runtime.useEffect },
    '../services/api': { parsePaginationResponse: response => ({ data: response.data, total: response.total }) },
  });
  const old = defer(), latest = defer(); const list = jest.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
  const render = () => { runtime.begin(); const result = hook.default(list, { sort_by: 'id' }); runtime.flush(); return result; };
  let state = render(); state.setPage(2); state = render();
  expect(list.mock.calls[0][1].signal.aborted).toBe(true);
  latest.resolve({ data: [{ id: 2 }], total: 80 }); await new Promise(resolve => setImmediate(resolve));
  old.resolve({ data: [{ id: 1 }], total: 80 }); await new Promise(resolve => setImmediate(resolve));
  state = render(); expect(state.page).toBe(2); expect(state.data).toEqual([{ id: 2 }]); expect(state.query).toEqual({ sort_by: 'id' }); runtime.stop();
});
it('renders catalog details using nome, without feature or cenarios', async () => {
  const { renderToStaticMarkup } = require('../../backend/node_modules/react-dom/server');
  const components = await load('components/RecordDetails.jsx', { react: { createElement: React.createElement }, './Modal': { default: 'Modal' }, './RecordDetails.css': {} });
  const record = { id: 1, nome: 'Catalogo novo', descricao: null, feature: 'Must not render', cenarios: ['Must not render'] };
  const html = renderToStaticMarkup(React.createElement(components.RecordDetailsBody, { record, kind: 'catalog' }));
  expect(html).toContain('Catalogo novo'); expect(html).toContain('Nome'); expect(html).not.toContain('Feature'); expect(html).not.toContain('Must not render');
  expect(components.ViewRecordButton({ record, onView: jest.fn() }).props['aria-label']).toBe('Visualizar Catalogo novo');
});
it('real detail viewer discards a delayed catalog lookup after close', async () => {
  const { createRecordViewer } = await load('domain/recordDetails.js', {});
  const delayed = defer(), changes = jest.fn();
  const viewer = createRecordViewer(() => delayed.promise, changes);
  const request = viewer.open({ id: 1, nome: 'P' }); viewer.close(); delayed.resolve({ id: 1, nome: 'P' }); await request;
  expect(changes.mock.calls.at(-1)[0]).toMatchObject({ selected: null, record: null, loading: false });
});
it.each([403, 422, 503])('catalog API preserves HTTP failure %s', async status => {
  const fetch = jest.fn().mockResolvedValue({ ok: false, status, json: async () => ({ error: 'Failure' }) });
  const api = await load('services/api.js', {}, { fetch, localStorage: { getItem: () => 'token' }, window: { location: {} } });
  await expect(api.projectCatalogAPI.list()).rejects.toMatchObject({ status, message: 'Failure' });
});
