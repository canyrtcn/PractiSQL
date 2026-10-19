/* Static, clothed previews from the existing character. No animation loop or rewards. */
(function(){
 let serial=0;
 function figure(gear=[]){
  const original=document.querySelector('#roamFace > .mascot-model');if(!original)return null;
  const wrap=document.createElement('span');wrap.className='mascot-look';wrap.setAttribute('aria-hidden','true');
  const base=original.cloneNode(true),prefix='look-'+(++serial)+'-';
  for(const definition of base.querySelectorAll('[id]')){const old=definition.id;definition.id=prefix+old;for(const item of base.querySelectorAll('[fill],[stroke],[filter],[clip-path],[mask]'))for(const attribute of ['fill','stroke','filter','clip-path','mask']){const value=item.getAttribute(attribute);if(value?.includes('url(#'+old+')'))item.setAttribute(attribute,value.replaceAll('url(#'+old+')','url(#'+definition.id+')'));}}
  base.removeAttribute('id');wrap.appendChild(base);
  const order={body:0,neck:1,head:2,eyes:3,side:4};
  for(const g of gear.slice().sort((a,b)=>(order[a.slot]??9)-(order[b.slot]??9))){if(!g?.svg)continue;const layer=document.createElement('span');layer.className='gear-svg'+(g.back?' gear-back':'');layer.dataset.gear=g.id;layer.innerHTML=g.svg;wrap.appendChild(layer);if(g.frontSvg){const front=document.createElement('span');front.className='gear-svg';front.dataset.gear=g.id;front.innerHTML=g.frontSvg;wrap.appendChild(front);}}
  return wrap;
 }
 window.PractiMascot={figure};
})();
