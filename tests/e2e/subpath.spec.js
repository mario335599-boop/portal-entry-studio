import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
test('GitHub Pages repository subpath loads app and local PDF worker',async({page})=>{
 const root=path.resolve('dist');
 const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.gz':'application/gzip'};
 const requests=[];
 const server=createServer(async(req,res)=>{
   requests.push(req.url);
   const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(!name.startsWith('/portal-entry-studio/')){res.writeHead(404).end();return;}
   const file=path.resolve(root,name.slice('/portal-entry-studio/'.length)||'index.html');
   if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
   try{res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
   await page.goto(`http://127.0.0.1:${server.address().port}/portal-entry-studio/`);
   await expect(page.locator('#dropzone')).toBeVisible();await page.locator('#pdf-files').setInputFiles('tests/fixtures/japanese-text.pdf');
   await expect(page.getByRole('heading',{name:'PDF登録の結果'})).toBeVisible();await expect(page.locator('.import-log')).toContainText('保存完了');
   expect(requests).toContain('/portal-entry-studio/vendor/pdf.worker.min.mjs');expect(requests.some(r=>r.startsWith('/portal-entry-studio/assets/'))).toBeTruthy();
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
