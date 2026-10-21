/* Incremental SQL documents and viewport rendering; bundled locally for Electron. */
import {EditorState, EditorSelection, StateEffect, StateField, Prec, Compartment} from '@codemirror/state';
import {EditorView, Decoration, WidgetType, ViewPlugin, keymap, drawSelection, dropCursor, placeholder} from '@codemirror/view';
import {defaultKeymap, history, historyKeymap, undo, redo} from '@codemirror/commands';
import {bracketMatching} from '@codemirror/language';

let highlightWorker=null,nextDocument=0;
const highlightedViews=new Map(),highlightResult=StateEffect.define();
function worker(){
  if(!highlightWorker){
    highlightWorker=new Worker('./vendor/sql-highlight-worker.js');
    highlightWorker.onmessage=event=>{
      const result=event.data,plugin=highlightedViews.get(result.id);
      if(!plugin||plugin.revision!==result.revision||plugin.request!==result.request)return;
      const decorations=Decoration.set(result.spans.map(span=>Decoration.mark({class:span.style}).range(span.from,span.to)),true);
      plugin.view.dispatch({effects:highlightResult.of(decorations)});
    };
  }
  return highlightWorker;
}
const viewportHighlight=ViewPlugin.fromClass(class{
  constructor(view){
    this.view=view;this.id=++nextDocument;this.revision=0;this.request=0;this.frame=0;this.decorations=Decoration.none;
    highlightedViews.set(this.id,this);
    worker().postMessage({type:'open',id:this.id,text:view.state.doc.toString()});this.viewport();
  }
  viewport(){
    cancelAnimationFrame(this.frame);
    // Wait for CodeMirror's measurements, including gaps within very long lines.
    this.frame=requestAnimationFrame(()=>{this.frame=0;worker().postMessage({type:'viewport',id:this.id,request:++this.request,ranges:this.view.inView?this.view.visibleRanges:[]});});
  }
  update(update){
    if(update.docChanged){
      this.decorations=this.decorations.map(update.changes);
      const changes=[];update.changes.iterChanges((from,to,_fromB,_toB,insert)=>changes.push({from,to,insert:insert.toString()}));
      worker().postMessage({type:'change',id:this.id,revision:++this.revision,changes});this.viewport();
    }else if(update.viewportChanged||update.geometryChanged)this.viewport();
    for(const transaction of update.transactions)for(const effect of transaction.effects)if(effect.is(highlightResult))this.decorations=effect.value;
  }
  destroy(){cancelAnimationFrame(this.frame);highlightedViews.delete(this.id);worker().postMessage({type:'close',id:this.id});}
},{decorations:plugin=>plugin.decorations});
const setGhost = StateEffect.define();
class Ghost extends WidgetType {
  constructor(text) { super(); this.text = text; }
  eq(other) { return this.text === other.text; }
  toDOM() { const span = document.createElement('span'); span.className = 'ghost'; span.textContent = this.text; span.setAttribute('aria-hidden', 'true'); return span; }
}
const ghostField = StateField.define({
  create: () => Decoration.none,
  update(value, transaction) {
    if (transaction.docChanged || transaction.selection) value = Decoration.none;
    for (const effect of transaction.effects) if (effect.is(setGhost)) {
      value = effect.value ? Decoration.set([Decoration.widget({widget: new Ghost(effect.value.text), side: 1}).range(effect.value.position)]) : Decoration.none;
    }
    return value;
  },
  provide: field => EditorView.decorations.from(field)
});
function language() { return [viewportHighlight, EditorView.lineWrapping]; }
const views = new WeakMap();

/** Preserve the application's textarea contract while CodeMirror owns editing. */
export function mount(textarea) {
  if (textarea.sqlEditor) return textarea.sqlEditor;
  const host = document.createElement('div'); host.id = 'sqlEditor'; host.className = 'sql-editor-host';
  textarea.after(host); textarea.classList.add('editor-bridge'); textarea.tabIndex = -1; textarea.setAttribute('aria-hidden', 'true');
  let cachedDoc, cachedText, view, ghost = '', ghostPosition = -1;
  const emit = (type, event) => {
    const options = {bubbles: false, cancelable: true};
    for (const key of ['key','code','ctrlKey','metaKey','shiftKey','altKey','repeat','isComposing','clientX','clientY','button','buttons','deltaX','deltaY','deltaMode','data']) if (event && key in event) options[key] = event[key];
    let clone;
    try { clone = event ? new event.constructor(type, options) : new Event(type, options); } catch { clone = new Event(type, options); }
    const allowed = textarea.dispatchEvent(clone);
    if (!allowed) event?.preventDefault();
    return !allowed;
  };
  const handlers = {};
  for (const type of ['keydown','keyup','mousedown','mouseup','wheel','compositionstart','compositionend']) handlers[type] = event => emit(type, event);
  const placeholderConfig = new Compartment();
  const extensions = [
    ...language(), history(), drawSelection(), dropCursor(), bracketMatching(), ghostField,
    // Application Tab, selection actions and Ctrl+Enter take precedence over keymaps.
    Prec.highest(EditorView.domEventHandlers(handlers)),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    EditorView.updateListener.of(update => {
      if (update.docChanged) { ghost = ''; ghostPosition = -1; textarea.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: 'insertText'})); }
      if (update.selectionSet) { ghost = ''; ghostPosition = -1; emit('select'); }
    }),
    EditorView.contentAttributes.of({spellcheck: 'false', 'aria-label': 'SQL', 'aria-multiline': 'true'}),
    placeholderConfig.of(placeholder(textarea.placeholder))
  ];
  const state = value => EditorState.create({doc: value, extensions});
  view = new EditorView({state: state(textarea.value), parent: host});
  const value = () => {
    if (cachedDoc !== view.state.doc) { cachedDoc = view.state.doc; cachedText = cachedDoc.toString(); }
    return cachedText;
  };
  const select = (start, end = start, direction = 'forward') => {
    const length = view.state.doc.length;
    start = Math.max(0, Math.min(length, Number(start) || 0)); end = Math.max(start, Math.min(length, Number(end) || 0));
    const backward = direction === 'backward';
    view.dispatch({selection: EditorSelection.single(backward ? end : start, backward ? start : end)});
  };
  Object.defineProperties(textarea, {
    value: {configurable: true, get: value, set: text => {
      text = String(text ?? ''); if (text === value()) return;
      // A loaded/replaced script starts a new undo history, as a native textarea does.
      view.setState(state(text)); ghost = ''; ghostPosition = -1; emit('select');
    }},
    selectionStart: {configurable: true, get: () => view.state.selection.main.from, set: start => select(start, Math.max(start, view.state.selection.main.to))},
    selectionEnd: {configurable: true, get: () => view.state.selection.main.to, set: end => select(Math.min(end, view.state.selection.main.from), end)},
    selectionDirection: {configurable: true, get: () => view.state.selection.main.anchor > view.state.selection.main.head ? 'backward' : 'forward'},
    scrollTop: {configurable: true, get: () => view.scrollDOM.scrollTop, set: top => { view.scrollDOM.scrollTop = top; }},
    scrollLeft: {configurable: true, get: () => view.scrollDOM.scrollLeft, set: left => { view.scrollDOM.scrollLeft = left; }}
  });
  textarea.setSelectionRange = select;
  textarea.setRangeText = (insert, start = textarea.selectionStart, end = textarea.selectionEnd, mode = 'preserve') => {
    insert = String(insert); const change = {from: start, to: end, insert};
    const from = mode === 'start' ? start : start + insert.length;
    const selection = mode === 'select' ? EditorSelection.single(start, start + insert.length) : mode === 'preserve' ? view.state.selection.map(view.state.changes(change)) : EditorSelection.cursor(from);
    view.dispatch({changes: change, selection, scrollIntoView: true, userEvent: 'input.complete'});
  };
  textarea.select = () => { select(0, view.state.doc.length); view.focus(); };
  textarea.focus = () => view.focus();
  textarea.blur = () => view.contentDOM.blur();
  textarea.scrollIntoView = options => host.scrollIntoView(options);
  view.scrollDOM.addEventListener('scroll', () => emit('scroll'), {passive: true});
  const attributes = new MutationObserver(() => {
    view.contentDOM.setAttribute('aria-label', textarea.getAttribute('aria-label') || 'SQL');
    view.dispatch({effects: placeholderConfig.reconfigure(placeholder(textarea.placeholder))});
  });
  attributes.observe(textarea, {attributes: true, attributeFilter: ['placeholder', 'aria-label']});
  const controller = {
    view,
    setGhost(text = '', position = view.state.selection.main.head) {
      if (text === ghost && position === ghostPosition) return;
      ghost = text; ghostPosition = position;
      view.dispatch({effects: setGhost.of(text ? {text, position} : null)});
    },
    setFontSize(size) { host.style.setProperty('--sql-editor-font-size', size + 'px'); view.requestMeasure(); },
    undo: () => undo(view), redo: () => redo(view),
    destroy() { attributes.disconnect(); view.destroy(); host.remove(); }
  };
  textarea.sqlEditor = controller;
  return controller;
}

/** A full, selectable SQL document whose DOM contains only the visible lines. */
export function readOnly(parent, code) {
  disposeWithin(parent); parent.classList.add('sql-code-view');
  const view = new EditorView({parent, state: EditorState.create({doc: code, extensions: [
    ...language(), EditorState.readOnly.of(true), drawSelection(), keymap.of(defaultKeymap),
    EditorView.contentAttributes.of({'aria-label': 'SQL', 'aria-readonly': 'true', spellcheck: 'false'})
  ]})});
  views.set(parent, view); return view;
}
/** Read the document selection, including lines outside the rendered viewport. */
export function selectedCodeWithin(container) {
  const element=document.activeElement?.closest('.sql-code-view');
  if(!element||!container?.contains(element))return null;
  const view=views.get(element),range=view?.state.selection.main;
  if(!range||range.empty)return null;
  return {element,text:view.state.sliceDoc(range.from,range.to),rect:view.coordsAtPos(range.to)||element.getBoundingClientRect()};
}
export function disposeWithin(parent) {
  const release = element => { const view = views.get(element); if (view) { view.destroy(); views.delete(element); } };
  release(parent); for (const element of parent.querySelectorAll('.sql-code-view')) release(element);
}
