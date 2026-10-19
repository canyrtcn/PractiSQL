// Run before stylesheets so the saved theme is present on the first paint.
try{
  let requested=null,language='en';
  try{const params=new URLSearchParams(location.search);requested=params.get('theme');language=params.get('lang')==='tr'?'tr':'en';}catch{}
  document.documentElement.lang=language;
  window.PractiInitialAppearance={language};
  if(localStorage.getItem('sqlpg-anim')==='0')document.documentElement.dataset.startupMotion='off';
  let typeface=null;
  try{typeface=localStorage.getItem('sqlpg-typeface');}catch{}
  if(['brand','nunito','manrope'].includes(typeface))document.documentElement.dataset.uiFont=typeface;
  const theme=requested||localStorage.getItem('sqlpg-theme');
  if(/^(dark|light|leaf)$/.test(theme||''))document.documentElement.dataset.theme=theme;
}catch{}
