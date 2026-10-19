(function(){
 'use strict';
 let ctx,dialog,record=null,selected=null,items=[],drafts={},busy=false,applying=false,control=null,job=null,session=null,reviewToken=null,view=0,edits=0,saveTimer,saveTail=Promise.resolve(),lastOutput=null;
 let discussion=null,discussionLoadError=null,projectContext,awards=null,profileVersion=0;
 const conversation=()=>window.ProjectConversation;
 function remember(value=discussion){const saved=conversation().save(localStorage,value);discussion=saved;return saved;}
 function discussionInput(){const n=dialog?.querySelector('#discovery-request');if(n&&discussion)discussion.input=n.value;}
 function discussionView(){return discussion?.history.length?'<section class="discovery-discussion" aria-label="'+words('Proje görüşmesi','Project discussion')+'">'+discussion.history.map(m=>'<article class="discovery-turn '+m.role+'"><strong>'+words(m.role==='user'?'Sen':'AI',m.role==='user'?'You':'AI')+'</strong><p>'+escape(m.content)+'</p></article>').join('')+'</section>':'';}
 function newIdea(){if(busy)return;remember(conversation().state());discussionLoadError=null;render();}
 async function refine(){if(busy||!record)return;await flush();const next=conversation().refine(record,discussion);remember(next);record=null;drafts={};selected=null;lastOutput=null;render();if(!discussion.history.length)status(words('Bu eski kayıtta ilk istek bulunmuyor. Yeni isteğini tam olarak yazabilirsin.','The original request is missing from this older record. You can write your new request in full.'));dialog.querySelector('#discovery-request')?.focus();}
 const words=(tr,en)=>ctx.language()==='en'?en:tr,escape=value=>ctx.esc(String(value??''));
 const uid=()=>crypto.randomUUID();
 async function api(operation,input={}){const response=await window.electronAPI.projectExplore(operation,input);if(!response?.ok)throw window.ProjectErrors.unpack(response);return response.result;}
 function errorText(error){
  const code=String(error?.message||error);
  if(error?.aiCancelled===true||/ABORT|CANCEL|CLOSED|STALE/.test(code))return words('İşlem iptal edildi veya taslak değişti. Güncel taslağın korundu.','The operation was cancelled or the draft changed. Your current draft was preserved.');
  if(code==='PROJECT_AWARD_SAVE')return words('Proje tamamlanması kaydedildi. XP profil kaydına henüz yazılamadı; yeniden açtığında aynı ödül tekrar denenir.','Project completion was saved. XP could not yet be saved to your profile; reopening retries the same reward.');
  if(code==='PROJECT_COMPLETION_QUALITY')return words('Tamamlamak için her raporun iş yorumu en az 14/20 olmalı. Geri bildirimle yorumlarını geliştirebilirsin.','Each report needs at least 14/20 for its business interpretation. Use the feedback to improve your notes.');
  if(code==='PROJECT_COMPLETION_ASSIGNMENT')return words('Önce ödevin kapsamını netleştir. Uygun olmayan ödev için öğrenciye başarısızlık yazılmaz.','Clarify the assignment scope first. An unsuitable assignment does not count as a student failure.');
  if(code==='PROJECT_COMPLETION_REVIEW_REQUIRED')return words('Tamamlamadan önce bütün raporlarını değerlendir.','Review all reports before completing the project.');
  if(code==='PROJECT_COMPLETION_WORKSPACE_CHANGED')return words('Veriler değerlendirmeden sonra değişmiş. Güncel raporlarını yeniden değerlendir.','The data changed after review. Review the current reports again.');
  if(/SOURCE_CHANGED/.test(code))return words('Özgün kaynak kayıtları değişmiş. Proje çalışma alanındaki source_data kayıtlarını koruyup türetilmiş tablolarla çalış.','The original source records changed. Preserve source_data in the project workspace and use derived tables.');
  if(/MISMATCH|SOURCE_INTEGRITY/.test(code))return words('Seçilen dosya bu projede incelenen kaynakla eşleşmiyor. Aşağıdaki CSV bağlantısından indirilen dosyayı seç.','The selected file does not match this project’s inspected source. Choose the file from the CSV link below.');
  if(/WORKSPACE/.test(code))return words('Bu raporun bağlı olduğu çalışma alanını açıp tekrar dene.','Open the workspace linked to this project and try again.');
  if(/REPORT_ONLY/.test(code))return words('Rapor alanına tek bir SELECT veya WITH…SELECT sorgusu yaz.','Enter one SELECT or WITH…SELECT query in the report field.');
  if(code==='PROJECT_REPORT_SQL')return words('Sorgu çalıştırılamadı. Atölyeye aktararak SQL hatasının ayrıntısını görebilirsin.','The query could not run. Send it to the workshop to see the SQL error details.');
  if(/TIMEOUT/.test(code))return words('İşlem bekleme sınırında tamamlanmadı. Taslağın korundu; yanlış cevap olarak puanlanmadı.','The operation did not finish within its time limit. Your draft was preserved; it was not graded as incorrect.');
  if(/REVIEW_INCOMPLETE|NOTE_REQUIRED/.test(code))return words('Değerlendirmeden önce bütün raporlara SQL ve iş yorumunu ekle.','Add SQL and a business interpretation to every report before requesting a review.');
  if(/NUMERIC_REQUIRED/.test(code))return words('En az bir raporun sonucu ölçütlerle eşleşmiyor. Önce raporları ayrı ayrı denetle. AI değerlendirmesi başlatılmadı.','At least one report does not match its requirements. Check each report first. The AI review was not started.');
  if(/NETWORK|DATASET/.test(code))return words('Kaynak şu anda okunamadı veya dosya desteklenmiyor. Başka bir kaynakla devam edebilirsin.','The source could not be read or the file is unsupported. You can continue with another source.');
  if(/PROJECT_/.test(code))return words('Proje işlemi tamamlanamadı. Kaydedilmiş çalışmaların korunuyor.','The project operation could not be completed. Saved work is preserved.');
  return code;
 }
 function status(value,error=false){const n=dialog?.querySelector('#discovery-status');if(n){n.textContent=value;n.classList.toggle('error',error);}}
 function buttons(){dialog?.querySelectorAll('[data-disable-busy]').forEach(b=>b.disabled=busy);const cancel=dialog?.querySelector('#discovery-cancel');if(cancel)cancel.hidden=!busy;}
 function fields(){if(!record)return;const sql=dialog?.querySelector('#discovery-sql'),note=dialog?.querySelector('#discovery-note');if(sql&&note)Object.defineProperty(drafts,selected,{value:{sql:sql.value,note:note.value},enumerable:true,configurable:true,writable:true});}
 function flush(){
  clearTimeout(saveTimer);fields();if(!record)return saveTail;
  const id=record.id,copy=structuredClone(drafts);
  saveTail=saveTail.catch(()=>{}).then(async()=>{
   if(record?.id!==id)throw Error('PROJECT_UI_STALE');
   for(const task of record.draft.tasks){const value=Object.hasOwn(copy,task.id)?copy[task.id]:{sql:'',note:''},saved=Object.hasOwn(record.reports,task.id)?record.reports[task.id]:{sql:'',note:''};if(value.sql===saved.sql&&value.note===saved.note)continue;
    record=await api('save',{id,revision:record.revision,taskId:task.id,value});
   }
  });return saveTail;
 }
 function clearResult(){lastOutput=null;dialog?.querySelector('.project-feedback')?.remove();dialog?.querySelector('.project-output')?.remove();}
 function cancelReview(){if(reviewToken)void api('review-cancel',{token:reviewToken}).catch(()=>{});reviewToken=null;}
 function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{if(!busy)void flush().catch(e=>status(errorText(e),true));},500);}
 function dirty(){fields();edits++;clearResult();dialog?.querySelector('.discovery-review')?.remove();if(record)delete record.review;if(!record?.completion)dialog?.querySelector('.discovery-completion')?.remove();control?.cancel();cancelReview();if(job)void api('cancel-job',{job}).catch(()=>{});if(!busy)scheduleSave();}
 function cancel(){if(applying)return;control?.cancel();cancelReview();if(job)void api('cancel-job',{job}).catch(()=>{});if(session)void api('cancel').catch(()=>{});session=null;view++;if(busy)status(words('İptal ediliyor…','Cancelling…'));}
 async function close(){if(applying){status(words('Çalışma alanı kaydı tamamlanıyor…','Finishing workspace setup…'));return;}cancel();try{discussionInput();if(!record)remember();await flush();dialog.close();}catch(error){status(errorText(error),true);}}
 function header(){return '<header class="project-head"><img src="./assets/mascot.png" alt=""><div><h2>'+words('Kendi veri projen','Your data project')+'</h2><p>'+words('Bir iş sorusu seç. Veriyi incele. Raporunu hazırla.','Choose a business question. Explore the data. Prepare your report.')+'</p></div><button id="discovery-close" class="btn project-close" aria-label="'+words('Kapat','Close')+'"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg></button></header>';}
 function history(){return items.length?'<section class="discovery-history"><h3>'+words('Kaydedilmiş projeler','Saved projects')+'</h3>'+items.map((r,i)=>'<button class="discovery-record" data-open="'+i+'" data-disable-busy><span><b>'+escape(r.title||words('Okunamayan kayıt','Unavailable record'))+'</b><small>'+escape(r.workspace?.name||words('Veri kurulumu bekliyor','Awaiting data import'))+'</small></span><span>'+words('Aç','Open')+'</span></button>').join('')+'</section>':'';}
 function landing(){return '<div class="discovery-intro"><span class="discovery-step">'+words('İş fikrin','Your brief')+'</span><h3>'+words('Hangi konuda analist olmak istersin?','What would you like to analyse?')+'</h3><p>'+words('Merak ettiğin bir sektör veya iş sorusunu anlat. AI, UCI kaynaklarından indirilebilir bir veri kümesi ve ona uygun rapor görevleri arasın.','Describe an industry or a business question. AI will look for a downloadable UCI dataset and suitable reporting tasks.')+'</p><label for="discovery-request">'+words('Veri projesi isteğin','Your project request')+'</label><textarea id="discovery-request" class="project-note" placeholder="'+words('Örneğin: Bir mağazanın satışlarını ve müşteri alışkanlıklarını incelemek istiyorum.','For example: I want to explore a store’s sales and customer patterns.')+'"></textarea><div class="project-actions"><button id="discovery-generate" class="btn primary" data-disable-busy>'+words('Proje fikri bul','Find a project')+'</button><button id="discovery-prepared" class="btn" data-disable-busy>'+words('Hazır bisiklet projesini aç','Open the prepared bike project')+'</button></div><p class="hint">'+words('Seçili AI modelini kullanır. Raporlarını tamamla, iş yorumunu geliştir; 300 XP ve 3 yıldız kazan.','Uses the selected AI model. Complete your reports, develop your interpretation and earn 300 XP and 3 stars.')+'</p></div>'+history();}
 function source(){const s=record.draft.source;return '<section class="discovery-source"><span class="discovery-step">'+words('Kaynak','Source')+'</span><h3>'+escape(s.name)+'</h3><div class="discovery-source-facts"><span>'+s.rowCount.toLocaleString(ctx.language()==='en'?'en-GB':'tr-TR')+' '+words('kayıt','records')+'</span><span>'+s.columns.length+' '+words('sütun','columns')+'</span><span>UCI</span></div><p>'+escape(record.draft.observationUnit)+'</p><div class="project-actions"><button id="discovery-source" class="btn" data-disable-busy>'+words('Kaynak sayfası','Source page')+'</button><button id="discovery-csv" class="btn" data-disable-busy>'+words('CSV dosyasını indir','Download CSV')+'</button></div><p class="hint">'+words('Kaynak sayfasındaki açıklama ve lisansı incele. Bu proje, doğrulanan CSV dosyasını kullanır.','Review the description and licence on the source page. This project uses the verified CSV file.')+'</p></section>';}
 function setupPanel(){return '<section class="discovery-setup"><h3>'+words('Veriyi çalışma alanına kur','Import into a workspace')+'</h3><p>'+words('CSV bağlantısından indirdiğin dosyayı seç. Kayıtlar doğrulanır ve ayrı bir çalışma alanı hazırlanır.','Choose the file downloaded from the CSV link. Its records will be verified and imported into a separate workspace.')+'</p><label class="btn primary" for="discovery-file" tabindex="0" role="button" id="discovery-file-label">'+words('CSV seç ve kur','Choose CSV and import')+'</label><input id="discovery-file" type="file" accept=".csv" hidden><p class="hint">'+words('Bu genel proje bir AI taslağıdır. Sayısal eşleşme iş yorumunun doğruluğunu tek başına kanıtlamaz.','This general project is an AI draft. Numeric agreement alone does not verify a business interpretation.')+'</p></section>';}
 function brief(task){const b=task.brief[ctx.language()==='en'?'en':'tr'];return '<details class="discovery-criteria"><summary>'+words('Raporun ölçütleri','Report requirements')+'</summary>'+(b.rowMeasures||[]).map(r=>'<p><b>'+escape(r.name)+'</b>: '+escape(r.request)+(r.format?' · '+escape(r.format):'')+'<br><small>'+escape(r.meaning)+'</small></p>').join('')+b.stages.map(s=>'<section><p>'+escape(s.scope)+' · '+escape(s.oneRow)+'</p><ul>'+s.measures.map(m=>'<li><b>'+escape(m.name)+'</b>: '+escape(m.request)+'<br><small>'+escape(m.scope)+' · '+escape(m.missing)+(m.identity?' '+escape(m.identity):'')+'</small></li>').join('')+'</ul></section>').join('')+b.derived.map(r=>'<p><b>'+escape(r.name)+'</b>: '+escape(r.request)+'<br><small>'+escape(r.missing)+'</small></p>').join('')+'<p>'+escape(b.order)+'</p><p>'+words('Sütun sırası: ','Column order: ')+b.columns.map(escape).join(' · ')+'</p></details>';}
 function output(){if(!lastOutput)return '';const result=lastOutput.actual;return '<div class="project-feedback'+(lastOutput.numericCorrect?'':' error')+'">'+(lastOutput.numericCorrect?words('Sayısal çıktı, verilen rapor ölçütleriyle eşleşti.','The numeric output matches the report requirements.'):words('Çıktı henüz rapor ölçütleriyle eşleşmiyor.','The output does not yet match the report requirements.'))+'</div>'+(result?'<div class="project-output"><strong>'+result.values.length+' '+words('satır · sorgunun gerçek sonucu','rows · actual query output')+'</strong><div class="project-output-scroll"><table><thead><tr>'+result.columns.map(c=>'<th>'+escape(c)+'</th>').join('')+'</tr></thead><tbody>'+result.values.slice(0,80).map(r=>'<tr>'+r.map(v=>'<td>'+escape(v===null?'NULL':v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></div>':'');}
 function businessReview(){
  const review=record?.review;if(!review)return '';
  const item=review.reports.find(r=>r.id===selected);if(!item)return '';
  const labels={evidence:words('Kanıt kullanımı','Evidence'),interpretation:words('Yorum','Interpretation'),businessUse:words('İş sorusuna katkı','Business use'),limitations:words('Verinin sınırları','Data limitations')};
  const anchors=(item.student?.evidence||item.assignment.evidence).map(e=>e.kind==='cell'?words('Satır ','Row ')+e.row+' · '+e.columnName+': '+String(e.value??'NULL'):e.kind==='result-shape'?words('Sonuç: ','Result: ')+e.rowCount+words(' satır',' rows'):e.path+': '+String(e.value??'NULL'));
  return '<section class="discovery-review"><h4>'+words('AI değerlendirmesi','AI review')+'</h4><p>'+escape(item.assignment.feedback)+'</p>'+(item.student?'<dl>'+Object.entries(labels).map(([key,label])=>'<div><dt>'+label+'</dt><dd>'+item.student.scores[key]+'/5</dd></div>').join('')+'</dl><p>'+escape(item.student.feedback)+'</p>':'<p class="discovery-review-unresolved">'+words('Ödevin kapsamı netleşmeli. Bu raporda öğrenciye puan verilmedi.','The assignment scope needs clarification. This report was not scored against the student.')+'</p>')+'<details><summary>'+words('Dayandığı veriler','Supporting data')+'</summary><ul>'+anchors.map(v=>'<li>'+escape(v)+'</li>').join('')+'</ul></details><p class="hint">'+words('Bu yorum kaydedildiği andaki teslimine aittir. AI geri bildirimidir; kesin doğruluk garantisi değildir.','This feedback belongs to the submission as it was saved. It is an AI review, not a guarantee of correctness.')+'</p></section>';
 }
 const medal='<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 3 3 8m13-8-3 8M9 3h10"/><circle cx="14" cy="17" r="8"/><path d="m10 17 3 3 5-6"/></svg>';
 function completionView(){
  if(!awards||!record?.workspace)return;
  const section=dialog.querySelector('.discovery-work > section');if(!section)return;
  const holder=document.createElement('section');holder.className='discovery-completion';const done=record.completion?.receipt;
  if(done){
   holder.innerHTML='<div class="project-score"><i class="project-complete-mark">'+medal+'</i><b>'+escape(done.score)+'/100</b><span>'+words('Tamamlanan teslim','Completed submission')+'<br>'+words('SQL: ','SQL: ')+done.numericPoints+'/80 · '+words('AI iş yorumu: ','AI business review: ')+escape(done.aiPoints)+'/20</span></div><p>'+words('Profilinde kayıtlı: ','Saved in your profile: ')+'+300 XP · +3 '+words('yıldız','stars')+'</p><p class="hint">'+escape(new Date(done.at).toLocaleDateString(ctx.language()==='en'?'en-GB':'tr-TR'))+' · '+words('Sonraki düzenlemeler bu başarılı teslimin kaydını değiştirmez.','Later edits do not change this successful submission record.')+'</p>';
  }else if(record.review?.allAssignmentsSupportedByReviewer&&record.review.reports.every(r=>r.student?.points>=14)){
   holder.innerHTML='<div class="project-actions"><button id="discovery-complete" class="btn primary" data-disable-busy>'+words('Tamamla ve ödülü kaydet','Complete and save reward')+'</button></div><p class="hint">'+words('İlk tamamlamada 300 XP ve 3 yıldız. Aynı proje tekrar ödül vermez.','First completion: 300 XP and 3 stars. The same project does not reward twice.')+'</p>';
   holder.querySelector('button').onclick=()=>void completeProject();
  }else return;
  section.append(holder);
 }
 async function syncAwards(list){if(!awards)return;const result=await awards.sync(list.filter(r=>r.completion).map(r=>r.completion));if(result.saved.length)ctx.refresh?.();return result;}
 async function profile(){
  if(!ctx||!awards)return;const mine=++profileVersion;
  try{
   const list=await api('list');await syncAwards(list);if(mine!==profileVersion)return;
   let section=document.getElementById('project-discovery-history');
   if(!section){section=document.createElement('section');section.id='project-discovery-history';section.className='project-history';(document.getElementById('project-history')||document.getElementById('quizHist'))?.after(section);}
   section.innerHTML='<h3>'+words('Kendi veri projelerin','Your own data projects')+'</h3>'+(list.length?list.map((r,i)=>'<div class="project-history-item">'+(r.completion?'<i class="project-complete-mark">'+medal+'</i>':'')+'<div><b>'+escape(r.title||words('Okunamayan kayıt','Unavailable record'))+'</b><small>'+escape(r.completion?r.completion.sourceName+' · '+r.completion.score+'/100 · +300 XP · '+new Date(r.completion.at).toLocaleDateString(ctx.language()==='en'?'en-GB':'tr-TR'):words('Taslak · Devam edebilirsin','Draft · Ready to continue'))+'</small></div><button class="btn small" data-project-open="'+i+'">'+words('Aç','Open')+'</button></div>').join(''):'<p class="hint">'+words('İş fikrinden ilk veri projeni hazırla.','Start your first data project from a business question.')+'</p>');
   section.querySelectorAll('[data-project-open]').forEach(b=>b.onclick=()=>open(list[Number(b.dataset.projectOpen)].id).catch(e=>ctx.toast?.(errorText(e))));
  }catch(error){ctx.toast?.(errorText(error));}
 }
 function work(){const task=record.draft.tasks.find(t=>t.id===selected),value=Object.hasOwn(drafts,selected)?drafts[selected]:{sql:'',note:''};return '<div class="discovery-work"><nav class="project-report-nav" aria-label="'+words('Raporlar','Reports')+'">'+record.draft.tasks.map((t,i)=>'<button class="project-report-tab" data-task="'+i+'" aria-current="'+(t.id===selected?'step':'false')+'" data-disable-busy><b>'+escape(t.title)+'</b><small>'+words('Rapor ','Report ')+(i+1)+'</small></button>').join('')+'<p class="project-workspace-name">'+escape(record.workspace.name)+'</p><button id="discovery-workspace" class="btn" data-disable-busy>'+words('Çalışma alanını aç','Open workspace')+'</button></nav><section><h3>'+escape(task.title)+'</h3><p class="project-brief">'+escape(task.businessRequest)+'</p>'+brief(task)+'<label for="discovery-sql">SQL</label><textarea id="discovery-sql" class="project-sql" spellcheck="false" maxlength="100000">'+escape(value.sql)+'</textarea><div class="project-actions"><button id="discovery-check" class="btn primary" data-disable-busy>'+words('Raporumu denetle','Check my report')+'</button><button id="discovery-editor" class="btn" data-disable-busy>'+words('Atölyeye aktar','Send to workshop')+'</button></div>'+output()+'<label for="discovery-note">'+words('İş yorumun','Your business interpretation')+'</label><textarea id="discovery-note" class="project-note" maxlength="12000">'+escape(value.note)+'</textarea><div class="project-actions"><button id="discovery-review" class="btn" data-disable-busy>'+words('Projemi değerlendir','Review my project')+'</button></div><p class="hint">'+words('SQL sonuçları rapor ölçütleriyle karşılaştırılır; iş yorumlarını AI değerlendirir. Tamamlamak için her rapor doğru sonuç ve en az 14/20 iş yorumu puanı gerektirir.','SQL outputs are checked against report requirements; AI reviews your interpretations. Completion requires correct output and at least 14/20 for every report’s interpretation.')+'</p>'+businessReview()+'</section></div>';}
 function render(){
  dialog.innerHTML=header()+'<div class="project-content">'+(record?'<button id="discovery-back" class="btn small" data-disable-busy>'+words('Tüm projeler','All projects')+'</button><div class="discovery-title"><h3>'+escape(record.draft.title)+'</h3><p>'+escape(record.draft.businessContext)+'</p></div>'+(record.workspace?work():source()+setupPanel()):landing())+'<div id="discovery-status" class="project-status" role="status" aria-live="polite"></div><button id="discovery-cancel" class="btn" hidden>'+words('İptal et','Cancel')+'</button></div>';
  const on=(id,fn)=>{const n=dialog.querySelector('#'+id);if(n)n.onclick=async()=>{try{await fn();}catch(e){status(errorText(e),true);}};};
  if(!record){
   const intro=dialog.querySelector('.discovery-intro'),input=dialog.querySelector('#discovery-request');
   dialog.querySelector('label[for="discovery-request"]').insertAdjacentHTML('beforebegin',discussionView());input.value=discussion.input;
   input.oninput=()=>{discussionInput();try{remember();}catch(error){status(words('Görüşme yerel olarak kaydedilemedi. Yazdıkların bu pencerede duruyor.','The discussion could not be saved locally. Your text is still in this window.'),true);}};
   if(discussion.history.length){dialog.querySelector('label[for="discovery-request"]').textContent=words('Yanıtın veya düzeltmen','Your reply or correction');dialog.querySelector('#discovery-generate').textContent=words('Devam et','Continue');}
   const reset=document.createElement('button');reset.id='discovery-new';reset.className='btn';reset.dataset.disableBusy='';reset.textContent=words('Yeni proje fikri','New project idea');intro.querySelector('.project-actions').append(reset);on('discovery-new',newIdea);
   if(discussion.originId){const back=document.createElement('button');back.id='discovery-original';back.className='btn';back.dataset.disableBusy='';back.textContent=words('Önceki projeye dön','Back to previous project');intro.querySelector('.project-actions').append(back);on('discovery-original',()=>load(discussion.originId));}
   if(discussionLoadError)status(words('Önceki görüşme okunamadı. Yeni proje fikri ile yeniden başlayabilirsin.','The previous discussion could not be read. You can start a new project idea.'),true);
  }else{
   const change=document.createElement('button');change.id='discovery-refine';change.className='btn';change.dataset.disableBusy='';change.textContent=words('İsteğimi netleştir','Refine my request');dialog.querySelector('.discovery-title').append(change);on('discovery-refine',refine);
  }
  on('discovery-close',close);on('discovery-cancel',cancel);on('discovery-generate',generate);on('discovery-back',()=>load(null));on('discovery-prepared',async()=>{await close();await ctx.prepared();});
  on('discovery-source',()=>api('source',{id:record.id,kind:'page'}));on('discovery-csv',()=>api('source',{id:record.id,kind:'csv'}));
  on('discovery-workspace',()=>openWorkspace(false));
  on('discovery-editor',()=>openWorkspace(true));on('discovery-check',checkReport);on('discovery-review',reviewProject);
  dialog.querySelectorAll('[data-open]').forEach(n=>n.onclick=()=>load(items[Number(n.dataset.open)].id).catch(e=>status(errorText(e),true)));
  dialog.querySelectorAll('[data-task]').forEach(n=>n.onclick=async()=>{try{if(busy)return;await flush();selected=record.draft.tasks[Number(n.dataset.task)].id;lastOutput=null;render();}catch(e){status(errorText(e),true);}});
  dialog.querySelectorAll('#discovery-sql,#discovery-note').forEach(n=>n.oninput=dirty);
  completionView();
  const file=dialog.querySelector('#discovery-file');if(file)file.onchange=()=>{if(file.files[0])void importFile(file.files[0]);};
  const label=dialog.querySelector('#discovery-file-label');if(label)label.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();file.click();}};buttons();
 }
 async function load(id){
  if(busy)return false;const mine=++view;busy=true;buttons();
  try{await flush();const [next,history]=await Promise.all([id?api('get',{id}):null,api('list')]);if(view!==mine)return false;
   await syncAwards(history);record=next;drafts=structuredClone(record?.reports||{});selected=record?.draft.tasks[0]?.id||null;lastOutput=null;items=history;render();return true;
  }finally{busy=false;buttons();}
 }
 async function open(id=null){if(!ctx)return;if(await load(id)){if(!dialog.open)dialog.showModal();}}
 async function openWorkspace(transfer){
  if(busy)return;busy=true;buttons();const mine=view,id=record.id,workspaceId=record.workspace.id;
  try{await flush();if(ctx.isBusy())throw Error(words('Diğer işlem bitince tekrar dene.','Try again when the other operation finishes.'));
   const found=ctx.findWorkspace(workspaceId);if(!found)throw Error('PROJECT_WORKSPACE_MISSING');await ctx.switchWorkspace(found);
   if(view!==mine||record?.id!==id||ctx.workspace().id!==workspaceId)throw Error('PROJECT_UI_STALE');
   if(transfer)ctx.editor(Object.hasOwn(drafts,selected)?drafts[selected].sql:'');await close();
  }finally{busy=false;buttons();}
 }
 async function generate(){
  if(busy)return;if(ctx.isBusy())throw Error(words('Diğer işlem bitince tekrar dene.','Try again when the other operation finishes.'));if(!ctx.connected())throw Error(words('Önce Ayarlar’dan bir AI sağlayıcısı bağla.','Connect an AI provider in Settings first.'));
  discussionInput();const typedInput=discussion.input,request=typedInput.trim();if(!request)return;remember();const captured=conversation().state({...discussion,input:request}),mine=++view;busy=true;buttons();status(words('Uygun kaynaklar ve rapor görevleri hazırlanıyor…','Preparing suitable sources and reporting tasks…'));control=window.AiRequestControl.create();
  try{
   const begun=await api('begin',{discussion:captured});if(view!==mine)throw Error('PROJECT_UI_STALE');session=begun.session;
   const proxy={definitions:begun.definitions,invoke:(name,args)=>api('tool',{session:begun.session,name,args}),propose:args=>api('tool',{session:begun.session,name:'propose_project',args})};
   const toolContext=window.ProjectRequest.createToolContext(proxy,control,()=>{if(view!==mine)throw Error('PROJECT_UI_STALE');});
   const answer=await window.ProjectRequest.run({request,history:captured.history,language:ctx.language(),localized:ctx.localized(),route:ctx.route(),control,tools:toolContext,invoke:ctx.invoke,prepare:projectContext.prepare});if(view!==mine)throw Error('PROJECT_UI_STALE');
   job=uid();let saved;
   try{saved=await api('capture',{session:begun.session,job,answer,observations:toolContext.observations});}
   catch(error){
    // A supported source need not exist for every business question. Preserve
    // the model's explanation; absence of a draft is not a storage failure.
    if(error.message!=='PROJECT_DRAFT_REQUIRED')throw error;
    if(view!==mine)throw Error('PROJECT_UI_STALE');
    const reply=typeof answer==='string'&&answer.trim()?answer:words('Bu istek için uygun bir proje taslağı hazırlanamadı. İsteğini düzenleyebilir veya hazır projeyle devam edebilirsin.','No suitable project draft was prepared for this request. You can edit your request or continue with the prepared project.');
    const next=conversation().complete(captured,request,reply,toolContext.observations);if(discussion.input!==typedInput)next.input=discussion.input;remember(next);render();status(words('Yanıtını veya düzeltmeni aşağıya yazabilirsin.','You can write your reply or correction below.'));return;
   }
   if(view!==mine)throw Error('PROJECT_UI_STALE');remember({...captured,history:saved.studentConversation,input:discussion.input===typedInput?'':discussion.input,originId:saved.id});record=saved;drafts={};selected=saved.draft.tasks[0].id;session=null;render();status(words('Proje taslağı kaydedildi. Kaynağı inceleyip veriyi kurabilirsin.','Project draft saved. Review the source and import the data.'));
  }catch(error){status(errorText(error),true);}finally{if(session)await api('cancel').catch(()=>{});session=null;control?.finish();control=null;job=null;busy=false;buttons();}
 }
 async function importFile(file){
  if(busy)return;busy=true;buttons();const mine=view,id=record.id;job=uid();status(words('Dosya doğrulanıyor…','Verifying the file…'));
  try{if(file.size>64*1024*1024)throw Error('DATASET_RESOURCE_TOO_LARGE');const imported=await api('import',{id,bytes:new Uint8Array(await file.arrayBuffer()),job});if(view!==mine)throw Error('PROJECT_UI_STALE');
   job=null;applying=true;dialog.querySelector('#discovery-cancel').hidden=true;status(words('Yeni çalışma alanı kuruluyor…','Creating a new workspace…'));await ctx.adopt(imported.database,'Veri_Projesi');const workspace=ctx.workspace();record=await api('bind',{id,revision:imported.projectRevision,workspace});if(view!==mine)return;render();status(words('Veri hazır. İlk raporundan başlayabilirsin.','Data is ready. Start with your first report.'));
  }catch(error){status(errorText(error),true);}finally{applying=false;job=null;busy=false;buttons();}
 }
 async function checkReport(){
  if(busy)return;busy=true;buttons();const mine=view,id=record.id,editStamp=edits;clearResult();
  try{await flush();if(view!==mine||edits!==editStamp)throw Error('PROJECT_UI_STALE');if(ctx.isBusy())throw Error(words('Diğer işlem bitince tekrar dene.','Try again when the other operation finishes.'));
   const scope=ctx.workspace(),revision=ctx.revision();if(scope.id!==record.workspace.id)throw Error('PROJECT_WORKSPACE_MISSING');
   const taskId=selected,database=ctx.snapshot();job=uid();status(words('Kaynak kayıtları ve raporun gerçek sonucu denetleniyor…','Checking source records and your actual report result…'));
   const r=await api('check',{id,revision:record.revision,taskId,workspaceId:scope.id,database,job});if(view!==mine||edits!==editStamp||ctx.workspace().id!==scope.id||ctx.revision()!==revision)throw Error('PROJECT_UI_STALE');record=r.record;lastOutput=r.assessment;render();status(words('Rapor denetimi tamamlandı.','Report check complete.'));
  }catch(error){status(errorText(error),true);}finally{job=null;if(record?.id===id){try{record=await api('get',{id});if(edits!==editStamp)await flush();}catch(error){status(errorText(error),true);}}busy=false;buttons();if(edits!==editStamp)scheduleSave();}
 }
 async function reviewProject(){
  if(busy)return;if(ctx.isBusy())throw Error(words('Diğer işlem bitince tekrar dene.','Try again when the other operation finishes.'));if(!ctx.connected())throw Error(words('Önce Ayarlar’dan bir AI sağlayıcısı bağla.','Connect an AI provider in Settings first.'));
  busy=true;buttons();const mine=view,id=record.id,editStamp=edits,scope=ctx.workspace(),revision=ctx.revision();control=window.AiRequestControl.create();
  const assertScope=()=>{control.assertActive();if(view!==mine||edits!==editStamp||record?.id!==id||ctx.workspace().id!==scope.id||ctx.revision()!==revision)throw Error('PROJECT_UI_STALE');};
  try{await flush();assertScope();if(scope.id!==record.workspace.id)throw Error('PROJECT_WORKSPACE_MISSING');
   job=uid();status(words('Bütün raporların kaynak verisiyle karşılaştırılıyor…','Comparing all reports with their source data…'));
   const begun=await api('review-begin',{id,revision:record.revision,workspaceId:scope.id,database:ctx.snapshot(),job});job=null;reviewToken=begun.token;assertScope();
   const proxy={definitions:begun.definitions,context:()=>begun.context,read:args=>api('review-tool',{id,token:begun.token,name:'read_project_evidence',args}),submit:args=>api('review-tool',{id,token:begun.token,name:'submit_project_review',args})};
   const toolContext=window.ProjectBusinessReviewRequest.createToolContext(proxy,control,assertScope);
   status(words('Raporların, yorumların ve ödevin kaynakla uyumu değerlendiriliyor…','Reviewing your reports, interpretations and the assignment’s fit to its source…'));
   await window.ProjectBusinessReviewRequest.run({context:begun.context,language:ctx.language(),localized:ctx.localized(),route:ctx.route(),control,tools:toolContext,invoke:ctx.invoke,prepare:projectContext.prepare});assertScope();
   record=await api('get',{id});assertScope();render();status(words('AI değerlendirmesi kaydedildi. Her rapordaki geri bildirimi inceleyebilirsin.','AI review saved. You can read the feedback on each report.'));
  }catch(error){status(errorText(error),true);}finally{cancelReview();control?.finish();control=null;job=null;if(record?.id===id){try{record=await api('get',{id});if(edits!==editStamp)await flush();}catch(error){status(errorText(error),true);}}busy=false;buttons();if(edits!==editStamp)scheduleSave();}
 }
 async function completeProject(){
  if(busy||!awards)return;busy=true;buttons();const mine=view,id=record.id,editStamp=edits;
  try{
   await flush();if(ctx.isBusy()||view!==mine||edits!==editStamp)throw Error('PROJECT_UI_STALE');
   const scope=ctx.workspace(),revision=ctx.revision();if(scope.id!==record.workspace.id&&!record.completion)throw Error('PROJECT_WORKSPACE_MISSING');
   job=uid();status(words('Başarılı teslimin kaydediliyor…','Saving your successful submission…'));
   const result=await api('complete',{id,revision:record.revision,workspaceId:scope.id,database:record.completion?undefined:ctx.snapshot(),job});job=null;
   if(view!==mine||edits!==editStamp||ctx.workspace().id!==scope.id||ctx.revision()!==revision)throw Error('PROJECT_UI_STALE');
   record=result.record;await syncAwards([{completion:result.completion}]);render();ctx.refresh?.();
   if(!result.alreadyCompleted){ctx.react?.('proud');ctx.reward?.();}
   status(words('Proje tamamlandı! +300 XP ve +3 yıldız profilinde.','Project completed! +300 XP and +3 stars are in your profile.'));void profile();
  }catch(error){status(errorText(error),true);}finally{job=null;busy=false;buttons();}
 }
 function init(context){
  ctx=context;if(!window.electronAPI.projectExplore||!window.ProjectRequest)return;
  if(window.ProjectAwards&&ctx.settings&&ctx.persist)awards=window.ProjectAwards.create({settings:ctx.settings,persist:ctx.persist});
  projectContext=window.ProjectContext.create({capacity:ctx.capacity,calibration:ctx.calibration,storage:localStorage,invoke:ctx.invoke});
  try{discussion=conversation().load(localStorage);}catch(error){discussion=conversation().state();discussionLoadError=error;}
  window.AiToolProtocol=window.ProjectRequest.scopedProtocol(window.AiToolProtocol);
  if(window.ProjectReviewCompletion){const adapted=window.ProjectReviewCompletion.adapt(window.ProjectBusinessReviewRequest,window.AiToolProtocol);window.ProjectBusinessReviewRequest=adapted.request;window.AiToolProtocol=adapted.protocol;}
  dialog=document.createElement('dialog');dialog.id='project-discovery-dialog';dialog.className='project-dialog discovery-dialog';dialog.setAttribute('aria-label',words('Kendi veri projen','Your data project'));document.body.appendChild(dialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();void close();});
  if(awards)void api('list').then(syncAwards).catch(error=>ctx.toast?.(errorText(error)));
 }
 window.ProjectDiscoveryUI={init,open,profile,enabled:()=>!!ctx,busy:()=>busy,inspect:()=>({record:structuredClone(record),selected,busy,job,session,view}),refreshLanguage(){if(dialog?.open){fields();render();}if(document.getElementById('project-discovery-history'))void profile();}};
})();
