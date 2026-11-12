import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const publicDir=path.join(root,'public');
const outDir=path.join(root,'dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.csv':'text/csv; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon'};
const assets={};
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);
    else if(entry.isFile()){
      const name=path.relative(publicDir,full).split(path.sep).join('/');
      assets[name]={type:mime[path.extname(name).toLowerCase()]||'application/octet-stream',body:fs.readFileSync(full).toString('base64')};
    }
  }
}
walk(publicDir);
fs.rmSync(outDir,{recursive:true,force:true});
fs.mkdirSync(path.join(outDir,'server'),{recursive:true});
fs.mkdirSync(path.join(outDir,'.openai'),{recursive:true});
fs.writeFileSync(path.join(outDir,'server','index.js'),`const STATIC_ASSETS=${JSON.stringify(assets)};\n`+fs.readFileSync(path.join(root,'worker','handler.js'),'utf8'));
fs.copyFileSync(path.join(root,'.openai','hosting.json'),path.join(outDir,'.openai','hosting.json'));
console.log(`Built ${Object.keys(assets).length} assets`);
