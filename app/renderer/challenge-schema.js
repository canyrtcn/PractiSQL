/* Read the challenge's own database; labels never replace SQL identifiers. */
(function(root){
  const quote=name=>'"'+String(name).replace(/"/g,'""')+'"';
  function read(db){
    const definitions=db.exec("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid")[0]?.values||[];
    return definitions.map(([name,sql])=>({
      name,sql,
      columns:(db.exec('PRAGMA table_info('+quote(name)+')')[0]?.values||[]).map(([,name,type,notnull,defaultValue,pk])=>({name,type,notnull:!!notnull,defaultValue,pk})),
      foreignKeys:(db.exec('PRAGMA foreign_key_list('+quote(name)+')')[0]?.values||[]).map(([id,seq,table,from,to])=>({id,seq,table,from,to})),
      sample:db.exec('SELECT * FROM '+quote(name))[0]||{columns:[],values:[]}
    }));
  }
  function render(tables,{say,esc,highlight=esc}){
    const names={customers:['Müşteriler','Customers'],products:['Ürünler','Products'],orders:['Siparişler','Orders'],lines:['Sipariş kalemleri','Order lines'],shipments:['Sevkiyatlar','Shipments'],tags:['Etiketler','Tags']};
    const fields={id:['Kimlik','ID'],name:['Ad','Name'],price:['Fiyat','Price'],customer_id:['Müşteri kimliği','Customer ID'],status:['Durum','Status'],order_id:['Sipariş kimliği','Order ID'],line_no:['Kalem numarası','Line number'],product_id:['Ürün kimliği','Product ID'],qty:['Adet','Quantity'],unit_price:['Birim fiyat','Unit price'],parent_id:['Üst etiket kimliği','Parent tag ID']};
    const types={INTEGER:['Tamsayı','Integer'],REAL:['Ondalıklı sayı','Decimal number'],TEXT:['Metin','Text']};
    const text=pair=>pair?say(...pair):'';
    const cell=value=>value===null?'<span class="challenge-null">NULL</span>':esc(value);
    return '<p class="challenge-schema-intro">'+esc(say('Sorgunda aşağıdaki İngilizce tablo ve sütun adlarını kullan. Bu deneme verileri çalışma alanını değiştirmez.','Use the English table and column names below in your query. This practice data does not change your workspace.'))+'</p><p class="hint">'+esc(say('Anahtar, kaydı tanımlayan sütunu gösterir. NULL, değerin eksik veya bilinmiyor olduğunu belirtir.','A key marks a column used to identify a record. NULL means the value is missing or unknown.'))+'</p><div class="challenge-tables">'+tables.map(table=>{
      const keys=table.columns.filter(c=>c.pk).sort((a,b)=>a.pk-b.pk),groups=new Map();
      for(const key of table.foreignKeys){if(!groups.has(key.id))groups.set(key.id,[]);groups.get(key.id).push(key);}
      const links=[...groups.values()].map(group=>{
        group.sort((a,b)=>a.seq-b.seq);
        const target=tables.find(t=>t.name===group[0].table),targetKeys=target?.columns.filter(c=>c.pk).sort((a,b)=>a.pk-b.pk)||[];
        const from=table.name+'.('+group.map(f=>f.from).join(', ')+')',to=group[0].table+'.('+group.map(f=>f.to||targetKeys[f.seq]?.name||'PRIMARY KEY').join(', ')+')';
        return '<li><code>'+esc(from)+'</code><span aria-hidden="true"> → </span><code>'+esc(to)+'</code>'+(group.length>1?'<small>'+esc(say('Bu sütunlar birlikte eşleşir.','These columns match together.'))+'</small>':'')+'</li>';
      }).join('');
      return '<article class="challenge-table"><h3><code>'+esc(table.name)+'</code><span>'+esc(text(names[table.name])||table.name)+'</span></h3><dl class="challenge-fields">'+table.columns.map(c=>'<div><dt><code>'+esc(c.name)+'</code>'+(c.pk?'<span class="challenge-key" title="'+esc(say('Birincil anahtar','Primary key'))+'">'+esc(say('Anahtar','Key'))+(keys.length>1?' '+c.pk+'/'+keys.length:'')+'</span>':'')+'</dt><dd>'+esc(text(fields[c.name])||c.name)+'<small>'+esc(text(types[c.type])||c.type)+(c.notnull?' · NOT NULL':'')+'</small></dd></div>').join('')+'</dl>'+(links?'<div class="challenge-links"><strong>'+esc(say('Bağlantılar','Relationships'))+'</strong><ul>'+links+'</ul></div>':'')+'<h4>'+esc(say('Örnek kayıtlar','Sample records'))+' <span>'+table.sample.values.length+'</span></h4><div class="challenge-data-scroll" role="region" tabindex="0" aria-label="'+esc(table.name+' · '+say('örnek kayıtlar','sample records'))+'"><table><thead><tr>'+table.sample.columns.map(c=>'<th scope="col">'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+table.sample.values.map(row=>'<tr>'+row.map(value=>'<td>'+cell(value)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><details class="challenge-ddl"><summary>'+esc(say('SQL tanımını gör','View SQL definition'))+'</summary><pre>'+highlight(table.sql)+'</pre></details></article>';
    }).join('')+'</div>';
  }
  root.ChallengeSchema={read,render};
})(typeof window==='undefined'?globalThis:window);
