'use strict';
const {build}=require('../package.json');
const publisher=String(process.env.PRACTISQL_PUBLISHER_NAME||'').trim();
if(!publisher)throw Error('A public signed release requires PRACTISQL_PUBLISHER_NAME and a trusted code-signing certificate. Use dist:win:unsigned for a local test installer.');
module.exports={...build,forceCodeSigning:true,extraMetadata:{...build.extraMetadata,practisqlSignedRelease:true},win:{...build.win,signtoolOptions:{publisherName:publisher,...(process.env.PRACTISQL_CERTIFICATE_SUBJECT?{certificateSubjectName:process.env.PRACTISQL_CERTIFICATE_SUBJECT}:{}),...(process.env.PRACTISQL_CERTIFICATE_SHA1?{certificateSha1:process.env.PRACTISQL_CERTIFICATE_SHA1}:{})}}};
