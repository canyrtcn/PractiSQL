'use strict';
// Native page zoom keeps text, controls, SQL highlighting and hit targets aligned.
window.PractiInterfaceScale=(()=>{
  let context=null,current=null,busy=false;
  const select=()=>document.getElementById('setInterfaceScale');
  const reset=()=>document.getElementById('resetInterfaceScale');
  function refresh(){
    if(!context||!current)return;
    const element=select(),isTurkish=document.documentElement.lang==='tr';
    for(const option of element.options){
      const n=Math.round((option.value==='auto'?current.automaticZoomFactor:Number(option.value))*100);
      const label=option.value==='auto'?context.t('interfaceScaleAuto',{n}):(isTurkish?'%'+n:n+'%');
      if(option.textContent!==label)option.textContent=label;
    }
    element.value=String(current.preference);
    element.disabled=busy;
    reset().disabled=busy;
    context.syncDropdown(element);
    const button=element.nextElementSibling?.querySelector('.dd-btn');
    if(button){button.disabled=busy;button.setAttribute('aria-labelledby','interfaceScaleLabel');button.setAttribute('aria-describedby','interfaceScaleHint');}
    element.closest('.interface-scale-field').setAttribute('aria-busy',String(busy));
  }
  function accept(state){
    current=state;context.settings.uiScale=state.preference;refresh();
  }
  async function change(value){
    if(busy||!current)return;
    busy=true;refresh();
    try{accept(await window.electronAPI.setInterfaceScale(value));}
    catch{context.notify(context.t('interfaceScaleFailed'));}
    finally{busy=false;refresh();}
  }
  async function init(options){
    context=options;
    window.electronAPI.onInterfaceState(accept);
    select().onchange=()=>change(select().value==='auto'?'auto':Number(select().value));
    reset().onclick=()=>change('auto');
    // Also handles keyboard input delivered directly to the renderer.
    document.addEventListener('keydown',event=>{
      if(event.ctrlKey&&!event.altKey&&!event.shiftKey&&(event.key==='0'||event.code==='Numpad0')){
        event.preventDefault();change('auto');
      }
    });
    accept(await window.electronAPI.interfaceState());
  }
  return {init,refresh};
})();
