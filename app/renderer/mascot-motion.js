/* Character performances share the existing roaming frame loop. */
(() => {
  const idleKinds=['wave','stretch','peek','toe-tap','sway','proud','sleepy','happy-hop','wink','double-hop','wiggle','balance','tiptoe','curious','breathe','shuffle','bow','shiver'];
  const aliases={jump:'happy-hop',laugh:'delight',spin:'twirl',lean:'sway',nod:'nod','ta-da':'celebrate',greet:'wave',blink:'blink'};
  const kinds=new Set([...idleKinds,'delight','twirl','nod','celebrate','blink']);
  let active=null,nextAt=0,idleSince=0,lastKind='',bag=[],cached=null;
  function parts(){
    if(cached?.element.isConnected)return cached;
    const element=document.getElementById('roamMascot'),face=document.getElementById('roamFace');if(!element||!face)return null;
    return cached={element,face,eyes:face.querySelector('.mascot-eyes'),pupils:face.querySelector('.mascot-pupils'),rightEye:face.querySelector('.mascot-eye-right'),feet:[face.querySelector('.mascot-foot-left'),face.querySelector('.mascot-foot-right')]};
  }
  const disabled=()=>document.hidden||document.body.classList.contains('no-anim');
  function choose(){
    if(!bag.length){bag=idleKinds.slice();for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.at(-1)===lastKind)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];}
    return bag.pop();
  }
  function stop(){
    const previous=active;active=null;
    if(previous){for(const animation of previous.animations)animation.cancel();previous.element.removeAttribute('data-motion');}
    idleSince=0;nextAt=performance.now()+3800+Math.random()*3500;
  }
  function play(request,{interactive=true}={}){
    const found=parts(),kind=aliases[request]||request;
    if(!found||disabled()||found.element.classList.contains('thinking')||!kinds.has(kind))return false;
    const {element,face,eyes,pupils,rightEye,feet}=found;
    stop();lastKind=kind;const record=active={element,kind,interactive,animations:[]};element.dataset.motion=kind;
    const animate=(target,keyframes,duration=1300,delay=0)=>{if(target)record.animations.push(target.animate(keyframes,{duration,delay,easing:'cubic-bezier(.3,0,.25,1)',fill:'none'}));};
    const tilt=(values,duration)=>animate(face,values.map(rotate=>({rotate:rotate+'deg'})),duration);
    const squash=(values,duration)=>animate(face,values.map(([x,y])=>({scale:x+' '+y})),duration);
    const blink=(target=eyes,duration=260,delay=0)=>animate(target,[{scale:'1 1'},{scale:'1 .12',offset:.45},{scale:'1 1'}],duration,delay);
    if(kind==='wave'){
      tilt([0,-6,5,-4,0],1450);squash([[1,1],[1.04,.96],[.98,1.025],[1,1]],1450);blink(eyes,260,850);
    }else if(kind==='stretch'){
      squash([[1,1],[1.07,.94],[.92,1.1],[.96,1.05],[1,1]],1700);blink(eyes,450,600);
    }else if(kind==='peek'||kind==='curious'){
      const curious=kind==='curious';tilt(curious?[0,8,8,0]:[0,-6,0,6,0],1850);
      animate(pupils,[{translate:'0px 0px'},{translate:curious?'7px 0px':'-8px 0px',offset:.25},{translate:curious?'7px 0px':'8px 0px',offset:.7},{translate:'0px 0px'}],1850);
      if(curious)blink(eyes,220,1250);
    }else if(kind==='toe-tap'){
      tilt([0,-3,-3,0],1700);animate(feet[1],[{translate:'0px 0px',rotate:'0deg'},{translate:'0px -8px',rotate:'-16deg',offset:.25},{translate:'0px 0px',rotate:'0deg',offset:.4},{translate:'0px -8px',rotate:'-16deg',offset:.65},{translate:'0px 0px',rotate:'0deg'}],1700);
    }else if(kind==='sway')tilt([0,-7,7,-5,4,0],1700);
    else if(kind==='proud')squash([[1,1],[1.06,1.035],[1.06,1.035],[1,1]],1550);
    else if(kind==='sleepy'){
      tilt([0,4,6,0],1900);animate(eyes,[{scale:'1 1'},{scale:'1 .4',offset:.35},{scale:'1 .2',offset:.65},{scale:'1 1'}],1900);squash([[1,1],[1.035,.97],[.99,1.025],[1,1]],1900);
    }else if(kind==='happy-hop'||kind==='celebrate'||kind==='double-hop'){
      const duration=kind==='celebrate'?1600:kind==='double-hop'?1750:1150;
      const frames=kind==='double-hop'?[{translate:'0px 0px',scale:'1 1'},{translate:'0px 0px',scale:'1.1 .9',offset:.12},{translate:'0px -13px',scale:'.97 1.04',offset:.26},{translate:'0px 0px',scale:'1.09 .91',offset:.42},{translate:'0px -21px',scale:'.96 1.06',offset:.63},{translate:'0px 0px',scale:'1.1 .9',offset:.82},{translate:'0px 0px',scale:'1 1'}]:[{translate:'0px 0px',scale:'1 1'},{translate:'0px 0px',scale:'1.12 .87',offset:.15},{translate:'0px -17px',scale:'.95 1.06',offset:.4},{translate:'0px 0px',scale:'1.1 .91',offset:.7},{translate:'0px 0px',scale:'1 1'}];
      animate(face,frames,duration);if(kind==='celebrate')tilt([0,-8,8,-4,0],duration);blink(eyes,300,duration*.6);
    }else if(kind==='delight'){
      squash([[1,1],[1.1,.87],[.95,1.06],[1.07,.92],[1,1]],1300);animate(eyes,[{scale:'1 1'},{scale:'1 .2',offset:.3},{scale:'1 .2',offset:.7},{scale:'1 1'}],1300);
    }else if(kind==='twirl'){
      animate(face,[{scale:'1 1',rotate:'0deg'},{scale:'.18 .98',rotate:'-5deg',offset:.25},{scale:'-1 1',rotate:'0deg',offset:.5},{scale:'-.18 .98',rotate:'5deg',offset:.75},{scale:'1 1',rotate:'0deg'}],1300);
    }else if(kind==='nod')squash([[1,1],[1.05,.91],[1,1],[1.04,.94],[1,1]],1050);
    else if(kind==='wink'){tilt([0,-4,0],1050);blink(rightEye,430,180);}
    else if(kind==='wiggle'){
      tilt([0,-5,5,-4,4,0],1300);squash([[1,1],[1.07,.96],[.96,1.04],[1.06,.97],[1,1]],1300);
    }else if(kind==='balance'){
      tilt([0,8,9,7,0],1850);animate(feet[0],[{translate:'0px 0px',rotate:'0deg'},{translate:'-4px -13px',rotate:'-18deg',offset:.3},{translate:'-3px -12px',rotate:'-14deg',offset:.7},{translate:'0px 0px',rotate:'0deg'}],1850);
    }else if(kind==='tiptoe'){
      animate(face,[{translate:'0px 0px'},{translate:'0px -4px',offset:.3},{translate:'0px -4px',offset:.65},{translate:'0px 0px'}],1650);animate(feet[0],[{scale:'1 1'},{scale:'.9 1.18'},{scale:'1 1'}],1650);animate(feet[1],[{scale:'1 1'},{scale:'.9 1.18'},{scale:'1 1'}],1650);
    }else if(kind==='breathe')squash([[1,1],[1.025,1.035],[1,1],[1.02,1.025],[1,1]],2300);
    else if(kind==='shuffle'){
      tilt([0,-4,4,-3,0],1700);animate(feet[0],[{translate:'0px 0px'},{translate:'-7px -3px'},{translate:'4px 0px'},{translate:'0px 0px'}],1700);animate(feet[1],[{translate:'0px 0px'},{translate:'4px 0px'},{translate:'-7px -3px'},{translate:'0px 0px'}],1700);
    }else if(kind==='bow'){squash([[1,1],[1.05,.88],[1.05,.88],[1,1]],1500);blink(eyes,400,480);}
    else if(kind==='shiver')animate(face,[0,-3,3,-3,3,-2,2,0].map(x=>({translate:x+'px 0px'})),1000);
    else blink();
    Promise.allSettled(record.animations.map(animation=>animation.finished)).then(()=>{if(active!==record)return;active=null;element.removeAttribute('data-motion');nextAt=performance.now()+4300+Math.random()*5000;});
    return true;
  }
  function tick(time,{stationary=false,blocked=false}={}){
    const found=parts();
    if(!found||disabled()||blocked||found.element.classList.contains('thinking')){if(active)stop();idleSince=0;return;}
    if(!stationary){idleSince=0;if(active&&!active.interactive)stop();return;}
    if(!idleSince)idleSince=time;if(!nextAt)nextAt=time+3200;
    if(active||time<nextAt||time-idleSince<950)return;play(choose(),{interactive:false});
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.PractiMascotMotion={play,stop,tick,kinds:Object.freeze([...kinds]),inspect:()=>({kind:active?.kind||null,interactive:!!active?.interactive,animations:active?.animations.length||0,lastKind,nextAt,remainingIdleKinds:bag.slice()})};
})();
