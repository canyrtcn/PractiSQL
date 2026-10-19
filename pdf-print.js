const { BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const brandFont = fs.readFileSync(path.join(__dirname,'renderer/assets/fonts/practisql-display/PractiSQLDisplay-Regular.ttf')).toString('base64');
const brandMark = fs.readFileSync(path.join(__dirname,'renderer/assets/wordmark.svg')).toString('base64');
const brandMascot = 'data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'renderer/assets/mascot.png')).toString('base64');
function brandPdfHtml(html) {
  const style='<style data-practisql-print-brand>@font-face{font-family:"PractiSQL Print Brand";src:url("data:font/ttf;base64,'+brandFont+'") format("truetype");font-style:normal;font-weight:400}.doc-brand,.pdf-brand-name{font-family:"PractiSQL Print Brand",sans-serif!important;font-weight:400!important;font-kerning:none;letter-spacing:0}.doc-brand .brand-sql,.pdf-brand-name .brand-sql{color:#518f00}</style>';
  const source=String(html||'').replace(/(<header\b[^>]*class="hdr"[^>]*>)(?!\s*<img\b)/i,'$1<img class="pdf-mascot" src="'+brandMascot+'" width="48" height="48" alt="PractiSQL mascot">');
  return /<\/head>/i.test(source)?source.replace(/<\/head>/i,style+'</head>'):style+source;
}

// The same print pipeline is used by the app and by document render checks.
async function printStudyPdf(html) {
  const window = new BrowserWindow({ show:false, webPreferences:{offscreen:true,backgroundThrottling:false,javascript:false} });
  try {
    await window.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(brandPdfHtml(html)));
    return await window.webContents.printToPDF({
      printBackground:true, pageSize:'A4', preferCSSPageSize:true, displayHeaderFooter:true,
      headerTemplate:'<div></div>',
      footerTemplate:'<div style="width:100%;font:9px Arial,sans-serif;color:#728076;padding:0 15mm;display:flex;align-items:center;justify-content:space-between"><img alt="PractiSQL" src="data:image/svg+xml;base64,'+brandMark+'" style="width:65px;height:13px"><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>'
    });
  } finally { try { window.close(); } catch {} }
}
module.exports = { printStudyPdf, brandPdfHtml };
