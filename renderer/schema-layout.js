/* Schema geometry is independent of DOM/SQL. ELK runs in a dedicated worker in
 * Electron; the same graph is exercised with the real engine in Node tests. */
(function (root) {
  const HEADER = 36, ROW = 21, FOOTER = 26;
  function graph(infos, relations, allColumns) {
    const required = new Map(infos.map(b => [b.t, new Set(b.cols.filter(c => c.pk).map(c => c.name))]));
    relations.forEach(r => { required.get(r.from)?.add(r.column); required.get(r.to)?.add(r.targetColumn); });
    const visible = infos.map(b => {
      const keep = required.get(b.t);
      const chosen = new Set(b.cols.filter(c => keep.has(c.name)).map(c => c.name));
      for (const c of b.cols) { if (allColumns || chosen.size < 8) chosen.add(c.name); }
      return { ...b, visible: b.cols.filter(c => chosen.has(c.name)) };
    });
    const width = Math.max(248, Math.min(320, Math.max(...infos.map(b => b.t.length * 7 + 78))));
    const rows = Math.max(1, ...visible.map(b => b.visible.length));
    const height = HEADER + rows * ROW + FOOTER;
    const nodes = visible.map((b, i) => ({ id: 'n' + i, width, height,
      layoutOptions: { 'elk.portConstraints': 'FIXED_POS' }, ports: [], data: b }));
    const byName = new Map(nodes.map(n => [n.data.t, n]));
    const used = new Map();
    function port(n, column, side, id) {
      const row = Math.max(0, n.data.visible.findIndex(c => c.name === column));
      const key = n.id + ':' + side + ':' + row;
      // One column has one attachment point. Artificial two-pixel offsets made
      // eight-pixel arrowheads overlap, and eventually repeated the same offset.
      if (used.has(key)) return used.get(key);
      used.set(key, id);
      n.ports.push({ id, width: 0, height: 0, x: side === 'EAST' ? width : 0,
        y: HEADER + row * ROW + ROW / 2,
        layoutOptions: { 'elk.port.side': side } });
      return id;
    }
    const edges = relations.map((r, i) => {
      const parent = byName.get(r.to), child = byName.get(r.from);
      const source = 'p' + i + 's', target = 'p' + i + 't';
      const parentPort=port(parent, r.targetColumn, 'EAST', source),childPort=port(child, r.column, 'WEST', target);
      return { id: 'e' + i, sources: [parentPort], targets: [childPort], data: r };
    });
    return { id: 'schema', layoutOptions: {
      'elk.algorithm': 'layered', 'elk.direction': 'RIGHT', 'elk.edgeRouting': 'ORTHOGONAL',
      'elk.padding': '[top=36,left=36,bottom=36,right=36]',
      'elk.spacing.nodeNode': '40', 'elk.spacing.edgeNode': '20', 'elk.spacing.edgeEdge': '12',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'elk.layered.spacing.edgeEdgeBetweenLayers': '12',
      'elk.layered.mergeEdges': 'false', 'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.layering.strategy': 'COFFMAN_GRAHAM',
      'elk.layered.layering.coffmanGraham.layerBound': String(Math.max(3, Math.round(Math.sqrt(infos.length / 1.4)))),
      'elk.layered.nodePlacement.favorStraightEdges': 'false',
      'elk.layered.compaction.postCompaction.strategy': 'LEFT',
      'elk.aspectRatio': '1.6', 'elk.randomSeed': '7'
    }, children: nodes, edges };
  }
  const api = { graph, HEADER, ROW, FOOTER };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SchemaLayout = api;
})(typeof window !== 'undefined' ? window : globalThis);
