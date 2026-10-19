'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {initialWindowBounds,initialZoomFactor,fitPanelWidths}=require('../renderer/window-layout.js');
const specs=require('./test-support/window-scenarios.cjs');
for(const {width:w,height:h,scale:dpi} of specs) {
  test(w+'x'+h+' at '+dpi*100+'% fits its Windows work area',()=>{
    const display={width:w/dpi,height:h/dpi},area={x:-Math.round(w/dpi),y:24,width:Math.round(w/dpi),height:Math.round(h/dpi)-48};
    const b=initialWindowBounds(area,display,dpi),zoom=initialZoomFactor(display,dpi);
    assert(b.x>area.x&&b.y>area.y&&b.x+b.width<area.x+area.width&&b.y+b.height<area.y+area.height);
    assert(b.minWidth<=b.width&&b.minHeight<=b.height);
    assert(Math.abs((b.x-area.x)-(area.x+area.width-b.x-b.width))<=1);
    assert(Math.abs((b.y-area.y)-(area.y+area.height-b.y-b.height))<=1);
    const width=b.width/zoom,[left,right]=fitPanelWidths(null,width);
    assert(width-left-right-14>=Math.min(420,width*.46)-1);
    assert(left>0&&right>0);
  });
}
test('The approved reference composition stays the same',()=>{
 assert.deepEqual(initialWindowBounds({width:1920,height:1032},{width:1920,height:1080}),{x:216,y:57,width:1488,height:918,minWidth:960,minHeight:540});
 assert.deepEqual(fitPanelWidths(null,1488),[259,416]);
 for(const width of [1240,1600,2200,3200]){const [l,r]=fitPanelWidths(null,width);assert(Math.abs(l/width-259/1488)<.001);assert(Math.abs(r/width-416/1488)<.001);}
});
test('Small desktops open wider and taller; taller aspect ratios use more width',()=>{
 const low=initialWindowBounds({width:1366,height:720},{width:1366,height:768});assert(low.width/1366>.93&&low.height/720>.94);
 const area={width:1440,height:912},wide=initialWindowBounds(area,{width:1600,height:900}),tall=initialWindowBounds(area,{width:1440,height:960});assert(tall.width>wide.width);
});
test('Only compact HD monitors receive the slight interface scale adjustment',()=>{
 for(const scale of [1,1.25,1.5])for(const width of [1360,1366])assert.equal(initialZoomFactor({width:width/scale,height:768/scale},scale),.9);
 for(const [width,height]of [[1920,1080],[1920,1200],[2160,1440],[2880,1920],[3840,2160],[1280,1024]])assert.equal(initialZoomFactor({width,height}),1);
});
test('Work area translation, taskbar position and DPI do not get applied twice',()=>{
 const a=initialWindowBounds({x:0,y:0,width:1440,height:912},{width:1440,height:960},1);
 const b=initialWindowBounds({x:-1920,y:37,width:1440,height:912},{width:1440,height:960},2);
 assert.equal(b.width,a.width);assert.equal(b.height,a.height);assert.equal(b.x,a.x-1920);assert.equal(b.y,a.y+37);
});
test('Saved panel proportions survive temporary constraints and return on a wide window',()=>{
 const p=[300,600],copy=[...p],reference=1800;
 assert.deepEqual(fitPanelWidths(p,1800,reference),p);
 const compact=fitPanelWidths(p,1000,reference);assert(compact[0]+compact[1]<=566);
 assert.deepEqual(fitPanelWidths(p,2400,reference),[400,800]);
 assert.deepEqual(fitPanelWidths(p,1800,reference),p);assert.deepEqual(p,copy);
});
test('A manually closed sidebar remains closed during resize',()=>{
 for(let width=320;width<=4000;width+=7){const [left,right]=fitPanelWidths([0,416],width);assert.equal(left,0);assert(right>=0);assert(width-right-7>0);}
});
test('Continuous widths and arbitrary aspect ratios keep all three panes visible',()=>{
 for(let w=360;w<=4800;w+=113)for(let h=240;h<=2400;h+=137){
   const a={x:-w,y:29,width:w,height:h},b=initialWindowBounds(a,{width:w,height:h+48});
   assert(b.width<=w&&b.height<=h&&b.x>=-w&&b.y>=29&&b.x+b.width<=0&&b.y+b.height<=h+29);
   for(const p of [null,[380,1150],[null,'invalid']]){const [l,r]=fitPanelWidths(p,b.width);assert(l>0&&r>0&&Number.isFinite(l+r));assert(l+r+14<b.width);}
 }
});
test('Invalid work areas fail; invalid saved widths fall back to the reference proportions',()=>{
 for(const area of [null,{}, {width:0,height:700},{width:1000,height:NaN}])assert.throws(()=>initialWindowBounds(area));
 assert.deepEqual(fitPanelWidths([null,'bad'],1488),[259,416]);
});
