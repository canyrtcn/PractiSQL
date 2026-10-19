/* Align the active tab surface only when navigation or its size changes. */
(() => {
  let pending = 0;
  function init() {
    const bar = document.querySelector('#colRight > .tabs');
    if (!bar) return;
    const sync = () => {
      pending = 0;
      for (const button of bar.querySelectorAll('button')) button.title = button.textContent.trim();
      const active = bar.querySelector('[aria-selected="true"]');
      if (!active || !bar.clientWidth) return;
      bar.style.setProperty('--tab-x', active.offsetLeft + 'px');
      bar.style.setProperty('--tab-width', active.offsetWidth + 'px');
      bar.classList.add('tabs-ready');
    };
    const schedule = () => { if (!pending) pending = requestAnimationFrame(sync); };
    new ResizeObserver(schedule).observe(bar);
    new MutationObserver(schedule).observe(bar, {subtree:true,attributes:true,attributeFilter:['aria-selected'],childList:true,characterData:true});
    sync();
  }
  document.addEventListener('DOMContentLoaded', init, {once:true});
})();
