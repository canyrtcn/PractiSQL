/* Keep the complete result in memory; render the rows visible in its scrollport. */
(function(root){
 'use strict';
 const live=new WeakMap();
 function mount(container,result,{cellHtml,headingHtml,cellText}){
  let start=-1,end=-1,rowHeight=34,frame=0,destroyed=false,headerHeight=34;
  const table=document.createElement('table');table.className='virtual-result-table';table.setAttribute('aria-rowcount',String(result.values.length+1));table.setAttribute('aria-colcount',String(result.columns.length));
  table.innerHTML='<colgroup>'+result.columns.map(()=>'<col>').join('')+'</colgroup><thead><tr aria-rowindex="1">'+result.columns.map(headingHtml).join('')+'</tr></thead><tbody></tbody>';
  container.appendChild(table);container.classList.add('virtual-results');container.tabIndex=0;
  const body=table.tBodies[0],columns=table.querySelectorAll('col'),canvas=document.createElement('canvas'),context=canvas.getContext('2d');
  context.font=getComputedStyle(table).font;
  const widths=result.columns.map((name,column)=>{
   let longest=String(name);
   for(const row of result.values){const text=cellText(row[column]);if(text.length>longest.length)longest=text.slice(0,120);}
   return Math.max(88,Math.min(320,Math.ceil(context.measureText(longest).width)+26));
  });
  widths.forEach((width,i)=>{columns[i].style.width=width+'px';});table.style.width=widths.reduce((a,b)=>a+b,0)+'px';
  const spacer=height=>height>0?'<tr class="result-spacer" aria-hidden="true"><td colspan="'+result.columns.length+'" style="height:'+height+'px"></td></tr>':'';
  function render(force=false){
   if(destroyed)return;
   const count=result.values.length,offset=Math.max(0,container.scrollTop-headerHeight),visible=Math.ceil((container.clientHeight||400)/rowHeight),nextStart=Math.max(0,Math.floor(offset/rowHeight)-8),nextEnd=Math.min(count,nextStart+visible+17);
   if(!force&&nextStart===start&&nextEnd===end)return;
   start=nextStart;end=nextEnd;
   body.innerHTML=spacer(start*rowHeight)+result.values.slice(start,end).map((row,i)=>'<tr class="result-row" aria-rowindex="'+(start+i+2)+'">'+row.map(cellHtml).join('')+'</tr>').join('')+spacer((count-end)*rowHeight);
  }
  function measure(){
   if(destroyed)return;
   const row=body.querySelector('.result-row'),height=row?.getBoundingClientRect().height,head=table.tHead.getBoundingClientRect().height;
   if(height>0&&Math.abs(height-rowHeight)>.1){const index=container.scrollTop/rowHeight;rowHeight=height;container.scrollTop=index*rowHeight;start=-1;}
   headerHeight=head||headerHeight;render();
  }
  const schedule=()=>{if(frame||destroyed)return;frame=requestAnimationFrame(()=>{frame=0;render();});};
  container.addEventListener('scroll',schedule,{passive:true});
  const observer=new ResizeObserver(()=>{if(frame||destroyed)return;frame=requestAnimationFrame(()=>{frame=0;measure();});});observer.observe(container);
  render(true);frame=requestAnimationFrame(()=>{frame=0;measure();});
  const controller={destroy(){destroyed=true;cancelAnimationFrame(frame);observer.disconnect();container.removeEventListener('scroll',schedule);live.delete(container);}};
  live.set(container,controller);return controller;
 }
 function disposeWithin(container){for(const table of container.querySelectorAll('.virtual-results'))live.get(table)?.destroy();}
 root.PractiResultTable={mount,disposeWithin};
})(globalThis);
