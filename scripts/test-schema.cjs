const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ELK = require('elkjs');
const { graph } = require('../app/renderer/schema-layout');
const qid = s => '"' + s.replaceAll('"', '""') + '"';
function guess(col, tables) {
  if (!/_id$/i.test(col)) return null;
  const stem = col.replace(/_id$/i, '').toLowerCase();
  if (stem.length < 2) return null;
  const low = tables.map(t => t.toLowerCase());
  for (const suf of ['', 'ler', 'lar', 's']) { const i = low.indexOf(stem + suf); if (i >= 0) return tables[i]; }
  return tables.find(t => t.toLowerCase().includes(stem) || stem.includes(t.toLowerCase())) || null;
}
async function read(file) {
  const SQL = await require('sql.js')({ locateFile: f => path.join(__dirname, '../node_modules/sql.js/dist', f) });
  const db = new SQL.Database(fs.readFileSync(file));
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")[0].values.flat();
  const infos = tables.map(t => ({ t, cols: db.exec(`PRAGMA table_info(${qid(t)})`)[0].values.map(r => ({ name: r[1], type: r[2], pk: r[5] })), n: db.exec(`SELECT COUNT(*) FROM ${qid(t)}`)[0].values[0][0] }));
  const relations = [];
  for (const b of infos) {
    const declared = db.exec(`PRAGMA foreign_key_list(${qid(b.t)})`)[0]?.values || [];
    for (const c of b.cols) {
      const real = declared.filter(r => r[3] === c.name);
      for (const f of real.length ? real : [[null, null, guess(c.name, tables), c.name, '', null, null, null, true]]) {
        const parent = infos.find(p => p.t === f[2]); if (!parent) continue;
        const pc = parent.cols.find(p => p.name === f[4]) || parent.cols.find(p => p.pk) || parent.cols.find(p => p.name === 'id') || parent.cols[0];
        if (pc) relations.push({ from: b.t, to: parent.t, column: c.name, targetColumn: pc.name, real: !f[8] });
      }
    }
  }
  db.close(); return { infos, relations };
}
function verify(model) {
  assert(model.width > 0 && model.height > 0);
  for (const a of model.children) for (const b of model.children) {
    if (a === b) continue;
    assert(!(a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y), 'Overlapping tables');
  }
  let segments = 0, crossings = 0;
  const allSegments = [];
  const ports = new Map(model.children.flatMap(n => n.ports.map(p=>[p.id,{x:n.x+p.x,y:n.y+p.y}])));
  for (const e of model.edges) {
    assert(e.sections?.length, 'Unrouted relationship ' + e.id);
    const source = ports.get(e.sources[0]), target = ports.get(e.targets[0]);
    assert(Math.hypot(source.x-e.sections[0].startPoint.x,source.y-e.sections[0].startPoint.y)<1, 'Detached source '+e.id);
    const end=e.sections[e.sections.length-1].endPoint;
    assert(Math.hypot(target.x-end.x,target.y-end.y)<1,'Detached target '+e.id);
    for (const s of e.sections) {
      const points = [s.startPoint, ...(s.bendPoints || []), s.endPoint];
      for (let i = 1; i < points.length; i++) {
        const a = points[i-1], b = points[i]; segments++;
        assert(Math.abs(a.x-b.x) < 1 || Math.abs(a.y-b.y) < 1, 'Non-orthogonal segment');
        for (const n of model.children) {
          const inside = Math.abs(a.x-b.x) < 1
            ? a.x > n.x+.1 && a.x < n.x+n.width-.1 && Math.max(a.y,b.y) > n.y+.1 && Math.min(a.y,b.y) < n.y+n.height-.1
            : a.y > n.y+.1 && a.y < n.y+n.height-.1 && Math.max(a.x,b.x) > n.x+.1 && Math.min(a.x,b.x) < n.x+n.width-.1;
          assert(!inside, 'Relationship crosses table ' + n.data.t);
        }
        allSegments.push({ a, b, id: e.id });
      }
    }
  }
  for (const h of allSegments.filter(s => s.a.y === s.b.y)) for (const v of allSegments.filter(s => s.a.x === s.b.x)) {
    if (h.id !== v.id && v.a.x > Math.min(h.a.x,h.b.x) && v.a.x < Math.max(h.a.x,h.b.x) && h.a.y > Math.min(v.a.y,v.b.y) && h.a.y < Math.max(v.a.y,v.b.y)) crossings++;
  }
  return { segments, crossings };
}
async function main() {
  const engine = new ELK();
  const fixtures = [{ name: 'cycle + self + disconnected + composite', infos: [
    { t: 'a', cols: [{name:'id',pk:1},{name:'b_id'}], n:0 },
    { t: 'b', cols: [{name:'id',pk:1},{name:'a_id'},{name:'parent_id'}], n:0 },
    { t: 'isolated "table"', cols: [{name:'id',pk:1}], n:0 }
  ], relations: [
    {from:'a',to:'b',column:'b_id',targetColumn:'id',real:true},
    {from:'b',to:'a',column:'a_id',targetColumn:'id',real:true},
    {from:'b',to:'b',column:'parent_id',targetColumn:'id',real:true}
  ] }];
  const realFile = process.argv[2];
  if (realFile) fixtures.push({ name: path.basename(realFile), ...await read(realFile) });
  const large = { name: '80 tables / 156 relationships', infos: [], relations: [] };
  for (let i=0;i<80;i++) {
    large.infos.push({t:'table_'+i,cols:[{name:'id',pk:1},{name:'parent_id'},{name:'group_id'},...Array.from({length:12},(_,j)=>({name:'field_'+j}))],n:i});
    if(i) large.relations.push({from:'table_'+i,to:'table_'+Math.floor((i-1)/2),column:'parent_id',targetColumn:'id',real:true});
    if(i>2) large.relations.push({from:'table_'+i,to:'table_'+(i%3),column:'group_id',targetColumn:'id',real:false});
  }
  fixtures.push(large);
  for (const fixture of fixtures) {
    for (const full of [false,true]) {
      const start = performance.now();
      const model = await engine.layout(graph(fixture.infos, fixture.relations, full));
      const geometry = verify(model);
      assert.equal(new Set(model.children.map(n=>n.width)).size,1);
      assert.equal(new Set(model.children.map(n=>n.height)).size,1);
      assert.equal(model.edges.length,fixture.relations.length);
      console.log(JSON.stringify({fixture:fixture.name,full,tables:model.children.length,edges:model.edges.length,width:model.width,height:model.height,ms:Math.round(performance.now()-start),...geometry}));
      if(realFile && fixture.name===path.basename(realFile) && !full) {
        fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});
        fs.writeFileSync(path.join(__dirname,'../artifacts/fintech-layout.json'),JSON.stringify(model,null,2));
      }
    }
  }
  console.log('SCHEMA TESTS PASSED');
}
if(require.main===module) main().catch(e=>{console.error(e);process.exitCode=1});
module.exports = { read, verify };
