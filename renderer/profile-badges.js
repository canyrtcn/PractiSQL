/* Keep four badge rows visible; expanding affects presentation, not ownership. */
(() => {
  let expanded=false,signature='',grid,button;
  function refresh() {
    if (!grid?.clientWidth) return;
    const columns=getComputedStyle(grid).gridTemplateColumns.split(/\s+/).length;
    const cards=[...grid.children],limit=columns*4,language=document.documentElement.lang;
    const next=[columns,cards.length,expanded,language].join(':');
    if (next===signature) return;
    signature=next;
    cards.forEach((card,index)=>{card.hidden=!expanded&&index>=limit;});
    button.classList.toggle('hidden',cards.length<=limit);
    button.setAttribute('aria-expanded',String(expanded));
    button.textContent=expanded?(language==='tr'?'Daha az göster':'Show less'):(language==='tr'?'Devamını göster':'Show more')+' ('+Math.max(0,cards.length-limit)+')';
  }
  function reset() {
    if (!grid) {
      grid=document.getElementById('badgeGrid');button=document.getElementById('badgeToggle');
      if (!grid||!button) return;
      button.onclick=()=>{expanded=!expanded;refresh();};
      new ResizeObserver(refresh).observe(grid);
    }
    expanded=false;signature='';refresh();requestAnimationFrame(refresh);
  }
  window.PractiProfileBadges={reset};
})();
