'use strict';
const fs=require('node:fs'),path=require('node:path');
const excluded=new Set(['.git','node_modules','release','dist','artifacts','output','tmp','.test-output']);
const rules=[
  ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g],
  ['google-api-key',/AIza[0-9A-Za-z_-]{30,}/g],
  ['provider-api-key',/\bsk-(?:proj-|ant-api\d+-)?[A-Za-z0-9_-]{24,}/g],
  ['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/g],
  ['credential-in-url',/https?:\/\/[^\s/"']+:[^\s/@"']+@/g],
  ['private-workstation-path',/[A-Z]:[\\/](?:Users|Hermes_Win|AgentWorkspace)[\\/][^\s"'<>]*/gi],
  ['unix-home-path',/\/(?:Users|home)\/[A-Za-z0-9._-]+\//g]
];
function scan(root){
 const findings=[],files=[];
 function walk(directory){for(const item of fs.readdirSync(directory,{withFileTypes:true})){if(excluded.has(item.name))continue;const absolute=path.join(directory,item.name),relative=path.relative(root,absolute).replaceAll('\\','/');if(item.isSymbolicLink()){findings.push({file:relative,rule:'unexpected-symlink'});continue;}if(item.isDirectory()){walk(absolute);continue;}files.push(relative);if(/(?:^|\/)(?:\.env(?:\..*)?|config\.json|Local State)$|\.(?:pfx|p12|key|sqlite(?:3)?|db|har|dmp|log)$/i.test(relative))findings.push({file:relative,rule:'private-or-generated-file'});const bytes=fs.readFileSync(absolute);if(bytes.includes(0))continue;const text=bytes.toString('utf8');for(const [rule,pattern]of rules){pattern.lastIndex=0;for(const match of text.matchAll(pattern))findings.push({file:relative,rule,line:text.slice(0,match.index).split('\n').length});}}}
 walk(root);return {files:files.length,findings};
}
if(require.main===module){const result=scan(path.resolve(process.argv[2]||'.'));console.log(JSON.stringify(result,null,2));if(result.findings.length)process.exitCode=1;}
module.exports={scan};
