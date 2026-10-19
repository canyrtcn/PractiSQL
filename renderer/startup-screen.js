/* One painted splash, then one transition into the ready application. */
(() => {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const language=window.PractiInitialAppearance?.language==='tr'?'tr':'en';
  document.querySelectorAll('[data-i18n="slogan"]').forEach(el=>{el.textContent=language==='tr'?'Yapay zekâ destekli sade SQL playground':'A simple, AI-powered SQL playground';});
  const state = window.__startupSplash = { phase: 'painting', startedAt: performance.now() };
  const frame = () => new Promise(resolve => {
    const fallback=setTimeout(resolve,80);
    requestAnimationFrame(()=>{clearTimeout(fallback);resolve();});
  });
  const painted = (async () => {
    const logo = splash.querySelector('img');
    // Preloaded local image; a missing asset must not block the app handoff.
    let timeout;
    try {
      await Promise.race([logo?.decode?.().catch(() => {}), new Promise(resolve => { timeout = setTimeout(resolve, 1200); })]);
    } finally { clearTimeout(timeout); }
    state.logoDecoded = !!logo?.naturalWidth;
    try{await document.fonts.load('34px "PractiSQL Display"');}catch{}
    state.preparedAt = performance.now();
    // Paint the complete local surface before allowing the native window to show.
    await frame();
    await frame();
    try { await window.electronAPI?.startupPainted?.(); } catch {}
    state.revealedAt = performance.now();
    splash.classList.add('splash-playing');
    await frame();
    state.paintedAt = performance.now();
    state.phase = 'visible';
  })();
  let finishing;
  window.PractiStartup = {
    painted,
    finish() {
      if (finishing) return finishing;
      state.readyAt = performance.now();
      finishing = (async () => {
        await painted;
        const duration=document.body.classList.contains('no-anim')?0:2600;
        const remaining=duration-(performance.now()-state.revealedAt);
        if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));
        // Let the fully bound application paint beneath the overlay before fading it.
        await frame();
        state.exitAt = performance.now();
        state.phase = 'exiting';
        await new Promise(resolve => {
          let fallback;
          const done = () => { clearTimeout(fallback); splash.removeEventListener('transitionend', ended); resolve(); };
          const ended = event => { if (event.target === splash && event.propertyName === 'opacity') done(); };
          splash.addEventListener('transitionend', ended);
          splash.classList.add('ready');
          if (getComputedStyle(splash).transitionDuration.split(',').every(value => parseFloat(value) === 0)) done();
          else fallback = setTimeout(done, 450);
        });
        splash.classList.add('hidden');
        state.dismissedAt = performance.now();
        state.phase = 'hidden';
        window.dispatchEvent(new Event('practisql:ready'));
      })();
      return finishing;
    }
  };
})();
