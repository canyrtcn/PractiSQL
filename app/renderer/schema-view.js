/* Worker-backed layout, cached between inline/fullscreen views and SQL reads. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const layouts = new Map(), versions = new WeakMap();
  let engine;
  function node(tag, attrs, text) {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function focus(el, name, edgeId) {
    const svg = el.querySelector('svg'); if (!svg) return;
    const related = new Set(name ? [name] : []),activeEdges=new Set();
    svg.querySelectorAll('.dg-fk').forEach(g => {
      const active = edgeId ? g.dataset.edge === edgeId : name && (g.dataset.from === name || g.dataset.to === name);
      g.classList.toggle('focus', !!active);
      if (active) { related.add(g.dataset.from); related.add(g.dataset.to);activeEdges.add(g.dataset.edge); }
    });
    svg.classList.toggle('focusing', !!(name || edgeId));
    svg.querySelectorAll('.dg-head').forEach(g => {
      const active=[...g._edgeIds].some(id=>activeEdges.has(id));
      g.classList.toggle('focus',active);
    });
    svg.querySelectorAll('.dg-halo').forEach(g=>g.classList.toggle('focus',activeEdges.has(g.dataset.edge)));
    svg.querySelectorAll('.dg-boxg').forEach(g => {
      g.classList.toggle('selected', g.dataset.table === name);
      g.classList.toggle('dim', !!(name || edgeId) && !related.has(g.dataset.table));
    });
  }
  async function render(el, infos, relations, opts) {
    const version = (versions.get(el) || 0) + 1; versions.set(el, version);
    const sig = JSON.stringify([infos.map(b => [b.t, b.cols]), relations, opts.allColumns]);
    const stamp = JSON.stringify([sig, infos.map(b => b.n), opts.labels]);
    el._dgOpts = opts;
    if (el._dgStamp === stamp && el.querySelector('svg')) { focus(el, opts.selected); return el._dgModel; }
    el.setAttribute('aria-busy', 'true');
    if (!el.querySelector('svg')) el.innerHTML = '<p class="hint dg-loading"></p>';
    const loading = el.querySelector('.dg-loading'); if (loading) loading.textContent = opts.labels.loading;
    try {
      if (!engine) engine = new window.ELK({ algorithms: ['layered'], workerUrl: new URL('./vendor/elk-worker.min.js', document.baseURI).href });
      let pending = layouts.get(sig);
      if (!pending) {
        const start = performance.now();
        pending = engine.layout(window.SchemaLayout.graph(infos, relations, opts.allColumns))
          .then(model => { model.layoutMs = performance.now() - start; return model; })
          .catch(error => { layouts.delete(sig); throw error; });
        layouts.set(sig, pending);
        while (layouts.size > 4) layouts.delete(layouts.keys().next().value);
      }
      const model = await pending;
      if (versions.get(el) !== version) return;
      const newGeometry = el._dgSig !== sig;
      const svg = node('svg', { width: model.width, height: model.height,
        viewBox: `0 0 ${model.width} ${model.height}`, role: 'group', 'aria-label': opts.labels.title });
      // Shared parent-column ports get one arrowhead; each FK keeps its own
      // path, title, hit target and inspector action.
      const heads=new Map(),halos=node('g',{class:'dg-halos','pointer-events':'none'});
      svg.appendChild(halos);
      // Edges precede nodes, so card text always stays unobstructed.
      for (const edge of model.edges || []) {
        const r = edge.data;
        const g = node('g', { class: 'dg-fk', 'data-from': r.from, 'data-to': r.to, 'data-edge': edge.id });
        const halo=node('g',{class:'dg-halo','data-edge':edge.id});halos.appendChild(halo);
        g.appendChild(node('title', {}, `${r.from}.${r.column} → ${r.to}.${r.targetColumn} (N:1) · ${r.real ? opts.labels.real : opts.labels.inferred}`));
        const points = [];
        for (const section of edge.sections || []) {
          const p = [section.startPoint, ...(section.bendPoints || []), section.endPoint].reverse();
          points.push(...p);
          const d = 'M ' + p.map(q => `${q.x} ${q.y}`).join(' L ');
          g.appendChild(node('path', { d, class: 'dg-hit' }));
          // All halos paint below all links, so one relationship cannot erase
          // another relationship at a shared port or branch junction.
          halo.appendChild(node('path', { d, class: 'dg-linkhalo' }));
          g.appendChild(node('path', { d, class: 'dg-link' + (r.real ? '' : ' inferred') }));
          const end = p[p.length - 1], prev = p[p.length - 2];
          if (prev) {
            const dx = Math.sign(end.x - prev.x), dy = Math.sign(end.y - prev.y);
            const x=end.x,y=end.y,key=[x,y,dx,dy].join(':');
            let head=heads.get(key);
            if(!head){head=node('g',{class:'dg-head'});head._edgeIds=new Set();head.appendChild(node('polygon',{class:'dg-arr',points:`${x},${y} ${x-dx*8-dy*4},${y-dy*8+dx*4} ${x-dx*8+dy*4},${y-dy*8-dx*4}`}));heads.set(key,head);}
            head._edgeIds.add(edge.id);
          }
        }
        g.addEventListener('pointerenter', () => focus(el, '', edge.id));
        g.addEventListener('pointerleave', () => focus(el, el._dgOpts.selected));
        g.addEventListener('click', e => { e.stopPropagation(); el._dgOpts.onSelect(r.from); });
        svg.appendChild(g);
      }
      for(const head of heads.values())svg.appendChild(head);
      const counts = new Map(infos.map(b => [b.t, b.n]));
      for (const box of model.children) {
        const b = box.data;
        const g = node('g', { class: 'dg-boxg', transform: `translate(${box.x},${box.y})`,
          'data-table': b.t, tabindex: 0, role: 'button', 'aria-label': b.t + '. ' + opts.labels.select });
        g.appendChild(node('title', {}, b.t + '\n' + b.cols.map(c => c.name + ' ' + c.type).join('\n')));
        g.appendChild(node('rect', { width: box.width, height: box.height, rx: 10, class: 'dg-box' }));
        const title = b.t.length > 32 ? b.t.slice(0, 31) + '…' : b.t;
        g.appendChild(node('text', { x: 12, y: 23, class: 'dg-title' }, title));
        g.appendChild(node('line', { x1: 1, x2: box.width - 1, y1: 35, y2: 35, class: 'dg-divider' }));
        b.visible.forEach((c, i) => {
          const foreign = relations.some(r => r.from === b.t && r.column === c.name);
          const y = window.SchemaLayout.HEADER + i * window.SchemaLayout.ROW + 15;
          g.appendChild(node('text', { x: 12, y, class: 'dg-key' }, c.pk ? 'PK' : foreign ? 'FK' : ''));
          g.appendChild(node('text', { x: 38, y, class: 'dg-col' }, c.name.length > 29 ? c.name.slice(0, 28) + '…' : c.name));
        });
        const hidden = b.cols.length - b.visible.length;
        const footer = `${counts.get(b.t)} ${opts.labels.rows}` + (hidden ? ` · +${hidden} ${opts.labels.fields}` : '');
        g.appendChild(node('text', { x: 12, y: box.height - 10, class: 'dg-count' }, footer));
        g.addEventListener('pointerenter', () => focus(el, b.t));
        g.addEventListener('pointerleave', () => focus(el, el._dgOpts.selected));
        g.addEventListener('click', e => { e.stopPropagation(); el._dgOpts.onSelect(b.t); });
        g.addEventListener('dblclick', e => { e.stopPropagation(); el._dgOpts.onPreview(b.t); });
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el._dgOpts.onSelect(b.t); } });
        svg.appendChild(g);
      }
      el.replaceChildren(svg);
      // Font weight can change without changing the user's layout. Fit text to
      // the existing cards and keep complete names in each card's title/inspector.
      const measure=document.createElement('canvas').getContext('2d');
      if(measure)svg.querySelectorAll('.dg-boxg').forEach(g=>{
        const width=Number(g.querySelector('.dg-box').getAttribute('width'));
        g.querySelectorAll('.dg-title,.dg-col').forEach(label=>{
          const text=label.textContent,available=width-Number(label.getAttribute('x'))-12;
          measure.font=getComputedStyle(label).font;
          if(measure.measureText(text).width<=available)return;
          let lo=0,hi=text.length;
          while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(measure.measureText(text.slice(0,mid)+'…').width<=available)lo=mid;else hi=mid-1;}
          label.textContent=text.slice(0,lo)+'…';
        });
      });
      el._dgStamp = stamp; el._dgSig = sig; el._dgModel = model;
      el.dataset.layoutMs = Math.round(model.layoutMs);
      focus(el, opts.selected); opts.onReady(newGeometry);
      return model;
    } catch (error) {
      if (versions.get(el) === version) {
        el.innerHTML = ''; const message = document.createElement('p'); message.className = 'hint dg-loading';
        message.textContent = opts.labels.error; el.appendChild(message);
        console.error('Schema layout:', error);
      }
    } finally { if (versions.get(el) === version) el.setAttribute('aria-busy', 'false'); }
  }
  window.SchemaDiagram = { render, focus, cancel(el) { versions.set(el, (versions.get(el) || 0) + 1); el._dgStamp = ''; el._dgSig = ''; } };
})();
