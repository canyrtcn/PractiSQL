/* A shared, bounded notification stack for information, welcomes and rewards. */
(() => {
  const records=new Map(),byElement=new WeakMap(),active=[],queue=[];
  let dockElement=null,nextButton=null,serial=0,dialogObserver=null,observedDialog=null;
  const words=(tr,en)=>document.documentElement.lang==='tr'?tr:en;
  const iconSvg='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v5m0-8v.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const closeSvg='<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  const motionOn=()=>!document.hidden&&!document.body.classList.contains('no-anim');
  function syncLayout(){
    if(!dockElement)return;
    const header=document.querySelector('.titlebar'),bar=header.getBoundingClientRect(),center=bar.left+bar.width/2;
    header.classList.toggle('has-notification',active.length>0);
    if(!active.length)return;
    const right=document.querySelector('.tb-btns').getBoundingClientRect().left-8;
    const left=Math.max(...[header.querySelector('.tb-brandmark'),document.getElementById('ver')].filter(Boolean).map(e=>e.getBoundingClientRect().right))+8;
    const width=Math.floor(Math.max(96,Math.min(440,2*(center-left),2*(right-center))));
    const slogan=header.querySelector('.slogan');if(slogan)header.style.setProperty('--notification-slogan-width',Math.max(0,center-width/2-12-slogan.getBoundingClientRect().left)+'px');
    dockElement.style.width=width+'px';dockElement.style.top=bar.top+4+'px';dockElement.style.setProperty('--notice-height',Math.min(40,bar.height-8)+'px');
    for(const copy of dockElement.querySelectorAll('.notice-card:not(.hidden) :is(.toast-copy,.notice-copy,.bt-tx)'))copy.tabIndex=copy.scrollHeight>copy.clientHeight?0:-1;
  }
  function syncQueue(){
    if(!nextButton)return;
    nextButton.hidden=!queue.length;
    nextButton.firstElementChild.textContent=String(queue.length);
    const label=words('Sıradaki bildirim · '+queue.length+' bekliyor','Next notification · '+queue.length+' waiting');
    nextButton.title=label;nextButton.setAttribute('aria-label',label);nextButton.setAttribute('aria-disabled',String(active[0]?.state!=='active'));syncLayout();
  }
  function ensureHost(){
    if(!dockElement)return;
    const dialog=[...document.querySelectorAll('dialog[open]')].at(-1),host=dialog||document.body;
    if(dockElement.parentElement!==host){if(dockElement.matches(':popover-open'))dockElement.hidePopover();host.appendChild(dockElement);}
    if(dialog!==observedDialog){dialogObserver?.disconnect();observedDialog=dialog;if(dialog){dialogObserver ||= new MutationObserver(ensureHost);dialogObserver.observe(dialog,{attributes:true,attributeFilter:['open']});}}
    if(active.length){dockElement.hidden=false;try{if(dockElement.showPopover&&!dockElement.matches(':popover-open'))dockElement.showPopover();}catch{}}
    syncLayout();
  }
  function dock(){
    if(dockElement)return dockElement;
    dockElement=document.getElementById('badgeToasts')||document.createElement('div');dockElement.id='badgeToasts';dockElement.className='badge-toasts notification-center';dockElement.hidden=true;
    dockElement.setAttribute('role','region');dockElement.setAttribute('aria-label',words('Bildirimler','Notifications'));dockElement.setAttribute('aria-live','polite');dockElement.setAttribute('aria-relevant','additions text');
    nextButton=document.createElement('button');nextButton.type='button';nextButton.className='notice-next';nextButton.hidden=true;nextButton.innerHTML='<span></span><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 4 4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';nextButton.onclick=()=>{if(queue.length&&active[0]?.state==='active')yieldCurrent(active[0]);};dockElement.appendChild(nextButton);
    if(typeof dockElement.showPopover==='function')dockElement.setAttribute('popover','manual');document.body.appendChild(dockElement);
    const sizeObserver=new ResizeObserver(syncLayout);for(const element of [document.querySelector('.titlebar'),document.querySelector('.tb-btns'),document.querySelector('.tb-brandmark')])sizeObserver.observe(element);window.addEventListener('resize',syncLayout);document.fonts.ready.then(syncLayout);
    new MutationObserver(ensureHost).observe(document.body,{childList:true});document.addEventListener('close',ensureHost,true);ensureHost();return dockElement;
  }
  function pause(record){if(record.timer){clearTimeout(record.timer);record.timer=null;record.remaining=Math.max(0,record.remaining-(performance.now()-record.started));}}
  function resume(record){
    if(record.state!=='active'||record.timer||record.persistent||document.hidden||record.element.matches(':hover,:focus-within'))return;
    record.started=performance.now();record.timer=setTimeout(()=>dismiss(record.element),Math.max(1,record.remaining));
  }
  function remove(record){
    record.state='closed';
    clearTimeout(record.timer);clearTimeout(record.transitionTimer);record.events.abort();records.delete(record.key);byElement.delete(record.element);
    const index=active.indexOf(record);if(index>=0)active.splice(index,1);const pending=queue.indexOf(record);if(pending>=0)queue.splice(pending,1);
    if(record.element.id==='toast'){record.element.className='toast hidden';record.element.replaceChildren();record.element.removeAttribute('role');document.body.appendChild(record.element);}else record.element.remove();
    promote();
  }
  function dismiss(element,{immediate=false}={}){
    const record=byElement.get(element);if(!record||(record.state==='closing'&&!immediate))return;
    pause(record);clearTimeout(record.transitionTimer);if(immediate||record.state==='queued'||!motionOn()){remove(record);return;}
    record.state='closing';record.element.classList.add('notice-out');record.transitionTimer=setTimeout(()=>remove(record),160);syncQueue();
  }
  function yieldCurrent(record){
    if(record.state!=='active')return;pause(record);
    const complete=()=>{record.transitionTimer=null;if(record.state!=='switching')return;active.splice(active.indexOf(record),1);record.state='queued';record.element.classList.add('hidden');queue.push(record);promote();};
    record.state='switching';record.element.classList.add('notice-out');if(motionOn())record.transitionTimer=setTimeout(complete,160);else complete();syncQueue();
  }
  function activate(record){record.state='active';active.push(record);dock().prepend(record.element);record.element.classList.remove('hidden','notice-out');ensureHost();resume(record);}
  function promote(){
    if(document.getElementById('splash')&&!document.getElementById('splash').classList.contains('hidden')){syncQueue();return;}
    while(active.length<1&&queue.length)activate(queue.shift());
    if(!active.length&&dockElement){try{if(dockElement.matches(':popover-open'))dockElement.hidePopover();}catch{}dockElement.hidden=true;}
    syncQueue();
  }
  function adopt(element,{key='notice-'+(++serial),duration=6000,kind='info',urgent=false}={}){
    const existing=records.get(key);if(existing){pause(existing);existing.remaining=duration||6000;existing.persistent=duration===0;if(existing.state==='closing'){clearTimeout(existing.transitionTimer);existing.transitionTimer=null;existing.state='active';existing.element.classList.remove('notice-out');syncQueue();}resume(existing);return existing.element;}
    const record={element,key,state:'queued',remaining:duration||6000,persistent:duration===0,timer:null,transitionTimer:null,started:0,events:new AbortController()};records.set(key,record);byElement.set(element,record);
    element.classList.add('notice-card','hidden');element.dataset.kind=kind;dock().appendChild(element);
    const options={signal:record.events.signal};element.addEventListener('mouseenter',()=>pause(record),options);element.addEventListener('mouseleave',()=>resume(record),options);element.addEventListener('focusin',()=>pause(record),options);element.addEventListener('focusout',()=>queueMicrotask(()=>resume(record)),options);
    urgent?queue.unshift(record):queue.push(record);if(urgent){const previous=active.find(item=>item.state==='active'&&!item.element.matches(':hover,:focus-within'));if(previous)yieldCurrent(previous);}promote();return element;
  }
  function closeButton(className,element){const button=document.createElement('button');button.type='button';button.className=className;button.setAttribute('aria-label',words('Bildirimi kapat','Dismiss notification'));button.innerHTML=closeSvg;button.onclick=()=>dismiss(element);return button;}
  function toast(message,duration,kind='info'){
    const text=String(message),key='toast:'+kind+':'+text,existing=records.get(key);
    if(existing)return adopt(existing.element,{key,duration:duration===undefined?4500:duration,kind});
    let card=document.getElementById('toast');if(card&&byElement.has(card)){card.id='toast-history-'+(++serial);card=null;}
    if(!card){card=document.createElement('div');card.id='toast';}card.className='toast';card.setAttribute('role',kind==='error'?'alert':'status');
    const icon=document.createElement('span');icon.className='notice-icon';icon.innerHTML=iconSvg;
    const copy=document.createElement('span');copy.className='toast-copy';copy.textContent=text;card.title=text;card.replaceChildren(icon,copy,closeButton('toast-close',card));
    return adopt(card,{key,duration:duration===undefined?4500:duration,kind,urgent:true});
  }
  function welcome({title,message,duration=5900}={}){
    const key='welcome';if(records.has(key))return records.get(key).element;
    const card=document.createElement('div');card.className='welcome-mini';card.setAttribute('role','status');
    const image=document.createElement('img');image.src='./assets/icon.png';image.alt='';image.width=image.height=40;
    const copy=document.createElement('div');copy.className='notice-copy';const heading=document.createElement('strong'),detail=document.createElement('span');heading.textContent=title;detail.textContent=message;card.title=title+' — '+message;copy.append(heading,detail);card.append(image,copy,closeButton('toast-close',card));return adopt(card,{key,duration,kind:'welcome'});
  }
  function update(options){
    const key='application-update';let card=records.get(key)?.element;
    if(!options){if(card)dismiss(card,{immediate:true});return;}
    if(!card){
      card=document.createElement('div');card.className='update-mini';card.setAttribute('role','status');
      const icon=document.createElement('span');icon.className='notice-icon';icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V4m-4 4 4-4 4 4M5 15v5h14v-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      const copy=document.createElement('div');copy.className='notice-copy';copy.append(document.createElement('strong'),document.createElement('span'));
      const action=document.createElement('button');action.type='button';action.className='update-action';
      const progress=document.createElement('span');progress.className='update-progress';progress.setAttribute('role','progressbar');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');progress.appendChild(document.createElement('span'));
      card.append(icon,copy,action,closeButton('toast-close',card),progress);
      adopt(card,{key,duration:0,kind:'update',urgent:true});
    }
    card.querySelector('strong').textContent=options.title;card.querySelector('.notice-copy>span').textContent=options.message;card.title=options.title+' — '+options.message;
    const action=card.querySelector('.update-action');action.textContent=options.actionLabel;action.disabled=!!options.busy;action.onclick=options.onAction;
    card.querySelector('.toast-close').onclick=()=>{options.onDismiss?.();dismiss(card);};
    const progress=card.querySelector('.update-progress'),value=Number.isFinite(options.progress)?Math.max(0,Math.min(100,options.progress)):null;
    progress.hidden=value===null;progress.setAttribute('aria-label',options.message);if(value!==null){progress.setAttribute('aria-valuenow',String(value));progress.firstElementChild.style.width=value+'%';}
    syncLayout();return card;
  }
  document.addEventListener('visibilitychange',()=>{for(const record of active)document.hidden?pause(record):resume(record);});
  window.addEventListener('practisql:ready',promote,{once:true});
  window.PractiNotifications={dock,adopt,toast,welcome,update,dismiss,clear(){for(const record of [...records.values()])dismiss(record.element,{immediate:true});},inspect:()=>({active:active.map(record=>({key:record.key,state:record.state})),queued:queue.map(record=>record.key),total:records.size})};
})();
