import {test,expect} from '@playwright/test';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import fs from 'node:fs/promises';
async function textPDF(){const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);for(let n=0;n<2;n++){const page=pdf.addPage([600,800]);page.drawText(`Property brochure ${n+1} Price 4290 Area 112.34`,{x:30,y:730,size:20,font});}return Buffer.from(await pdf.save());}
const upload=async(page,files)=>{await page.locator('#pdf-files').setInputFiles(files);await expect(page.getByRole('heading',{name:'PDF登録の結果'})).toBeVisible({timeout:90000});};
test('full local workflow, reload, prompt, results, backup and restore',async({page})=>{
 const remote=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173')&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))remote.push(r.url());});
 await page.goto('/');await expect(page.getByRole('heading',{name:/案件ダッシュボード/})).toBeVisible();
 await page.screenshot({path:'tmp/dashboard.png',fullPage:true});
 await upload(page,[{name:'multi-page.pdf',mimeType:'application/pdf',buffer:await textPDF()},{name:'second.pdf',mimeType:'application/pdf',buffer:await textPDF()}]);
 await expect(page.locator('.import-log')).toContainText('保存完了');await page.getByRole('button',{name:'閉じる',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(2);
 await page.getByRole('button',{name:'multi-page.pdf',exact:true}).click();await expect(page.locator('#page-info')).toHaveText('1 / 2');await page.getByRole('button',{name:'次のページ',exact:true}).click();await expect(page.locator('#page-info')).toHaveText('2 / 2');
 await page.locator('#field-name').fill('草加市テスト');await page.locator('[data-confirm="name"]').click();await page.locator('#field-price').fill('4,290万円');await page.locator('[data-confirm="price"]').click();await page.locator('#field-gas').fill('渡してはいけない未確認値');await expect(page.locator('#save-state')).toHaveText('✓ ブラウザに保存済み');
 await page.screenshot({path:'tmp/review.png',fullPage:true});
 await page.reload();await page.getByRole('button',{name:'草加市テスト',exact:true}).click();await expect(page.locator('[data-field="price"] .field-state')).toHaveText('✓ 確定');await page.locator('#back').click();
 await page.locator('input[data-select]').first().check();await page.locator('#generate').click();await page.locator('#confirm-generate').click();const prompt=await page.locator('#prompt-output').inputValue();expect(prompt).toContain('4,290万円');expect(prompt).not.toContain('渡してはいけない');expect(prompt).not.toContain('Property brochure');await page.getByRole('button',{name:'閉じる',exact:true}).click();
 await page.getByRole('button',{name:'草加市テスト',exact:true}).click();await page.locator('#editor-results').click();await page.locator('#result-input').fill('SUUMO：下書き完了\nat home：下書き完了\n要確認：引渡時期');await page.locator('#parse-results').click();await expect(page.locator('#result-preview')).toContainText('下書き完了');await page.locator('#apply-results').click();await expect(page.locator('[data-progress="suumo"]')).toHaveValue('下書き完了');await expect(page.locator('[data-progress="publication"]')).toHaveValue('未公開');await expect(page.locator('[data-progress="photo"]')).toHaveValue('未登録');
 await page.getByRole('button',{name:/設定・バックアップ/}).click();const downloadEvent=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadEvent;const backup=await fs.readFile(await download.path());const parsed=JSON.parse(backup);expect(parsed.properties).toHaveLength(2);expect(Object.keys(parsed.pdfs)).toHaveLength(2);
 await page.locator('#backup-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"schemaVersion":99}')});await expect(page.locator('#notice')).toContainText('既存データ');
 await page.getByRole('button',{name:/案件ダッシュボード/}).click();await page.getByRole('button',{name:'草加市テスト',exact:true}).click();await page.locator('#delete').click();await page.locator('#confirm-delete').click();await expect(page.locator('tbody tr')).toHaveCount(1);
 await page.getByRole('button',{name:/設定・バックアップ/}).click();await page.locator('#backup-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:backup});await page.locator('#confirm-import').click();await page.getByRole('button',{name:/案件ダッシュボード/}).click();await expect(page.locator('tbody tr')).toHaveCount(2);await page.getByRole('button',{name:'草加市テスト',exact:true}).click();await expect(page.locator('#page-info')).toHaveText('1 / 2');expect(remote).toEqual([]);
});
test('invalid PDF does not prevent next file from being stored',async({page})=>{await page.goto('/');await upload(page,[{name:'bad.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-this is broken')},{name:'good.pdf',mimeType:'application/pdf',buffer:await textPDF()}]);await expect(page.locator('.import-log')).toContainText('失敗');await expect(page.locator('.import-log')).toContainText('good.pdf: 保存完了');});
test('Japanese image PDF uses local OCR',async({page})=>{
 await page.goto('/');
 const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=800;const c=canvas.getContext('2d');c.fillStyle='white';c.fillRect(0,0,1200,800);c.fillStyle='black';c.font='38px sans-serif';['販売価格：4,290万円','土地面積：112.34㎡','建物面積：98.53㎡','所在地：埼玉県草加市','間取り：4LDK'].forEach((s,i)=>c.fillText(s,60,100+i*100));return canvas.toDataURL();});
 const pdf=await PDFDocument.create();const image=await pdf.embedPng(png);pdf.addPage([600,400]).drawImage(image,{x:0,y:0,width:600,height:400});
 await upload(page,[{name:'japanese-image.pdf',mimeType:'application/pdf',buffer:Buffer.from(await pdf.save())}]);await expect(page.locator('.import-log')).toContainText('保存完了');await page.getByRole('button',{name:'閉じる',exact:true}).click();await page.getByRole('button',{name:'japanese-image.pdf',exact:true}).click();await expect(page.locator('.raw-text')).toContainText('OCR');await expect(page.locator('.raw-text')).toContainText('4,290');await expect(page.locator('[data-field="price"] .field-state')).toHaveText('⚠ 要確認');await expect(page.locator('#page-info')).toHaveText('1 / 1');await page.screenshot({path:'tmp/ocr.png',fullPage:true});
});
test('OCR failure preserves PDF and records error',async({page})=>{await page.route('**/vendor/lang/**',r=>r.abort());await page.goto('/');const pdf=await PDFDocument.create();pdf.addPage();await upload(page,[{name:'ocr-failure.pdf',mimeType:'application/pdf',buffer:Buffer.from(await pdf.save())}]);await expect(page.locator('.import-log')).toContainText('読取エラー');await page.getByRole('button',{name:'閉じる',exact:true}).click();await page.getByRole('button',{name:'ocr-failure.pdf',exact:true}).click();await expect(page.locator('.inline-warning')).toContainText('OCR失敗');});
test('mobile layout has no page overflow',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('#dropzone')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.screenshot({path:'tmp/mobile.png',fullPage:true});});

test('Japanese text PDF extracts without OCR and retains provenance',async({page})=>{
 await page.route('**/vendor/lang/**',()=>{throw new Error('Text PDF must not load OCR dictionaries');});
 await page.goto('/');await upload(page,[{name:'japanese-text.pdf',mimeType:'application/pdf',buffer:await fs.readFile('tests/fixtures/japanese-text.pdf')}]);
 await page.getByRole('button',{name:'閉じる',exact:true}).click();await page.locator('.property-link').click();
 await expect(page.locator('#field-price')).toHaveValue('4,290万円');await expect(page.locator('#field-land')).toHaveValue('112.34㎡（33.98坪）');await expect(page.locator('[data-field="price"] .field-state')).toHaveText('未確認');await expect(page.locator('.raw-text')).toContainText('PDF TEXT');await expect(page.locator('#page-info')).toHaveText('1 / 1');await page.screenshot({path:'tmp/japanese-review.png',fullPage:true});
});

test('BATCH, archive, settings validation and publication record',async({page})=>{
 await page.goto('/');
 for(const name of ['テスト1号棟','テスト2号棟']){await page.locator('#manual').click();await page.locator('#field-name').fill(name);await page.locator('[data-confirm="name"]').click();await expect(page.locator('#save-state')).toHaveText('✓ ブラウザに保存済み');await page.locator('#back').click();}
 await page.locator('#select-all').check();await page.locator('#generate').click();await expect(page.locator('#notice')).toContainText('1案件');await page.locator('#mode').selectOption('BATCH');await page.locator('#generate').click();await page.locator('#confirm-generate').click();const text=await page.locator('#prompt-output').inputValue();expect(text).toContain('テスト1号棟');expect(text).toContain('テスト2号棟');await page.getByRole('button',{name:'閉じる',exact:true}).click();
 await page.getByRole('button',{name:'テスト1号棟',exact:true}).click();page.once('dialog',d=>d.accept());await page.locator('[data-progress="publication"]').selectOption('公開済み');await expect(page.locator('#save-state')).toHaveText('✓ ブラウザに保存済み');await page.locator('#archive').click();await expect(page.locator('tbody tr')).toHaveCount(1);await page.getByRole('button',{name:'アーカイブ',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(1);await page.getByRole('button',{name:'テスト1号棟',exact:true}).click();await expect(page.locator('[data-progress="publication"]')).toHaveValue('公開済み');await page.locator('#archive').click();
 await page.getByRole('button',{name:/設定・バックアップ/}).click();await page.locator('#suumo-url').fill('https://example.com/?token=secret');await page.getByRole('button',{name:'URLを保存',exact:true}).click();await expect(page.locator('#notice')).toContainText('認証情報');await page.locator('#suumo-url').fill('https://example.com/entry');await page.getByRole('button',{name:'URLを保存',exact:true}).click();await expect(page.locator('#notice')).toContainText('保存しました');await page.reload();await page.getByRole('button',{name:/設定・バックアップ/}).click();await expect(page.locator('#suumo-url')).toHaveValue('https://example.com/entry');
});

test('storage failure is visible and retry preserves the pending edit',async({page})=>{
 await page.goto('/');await page.locator('#manual').click();
 await page.evaluate(()=>{window.originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('Simulated full disk','QuotaExceededError');};});
 await page.locator('#field-name').fill('保存失敗後も保持');await expect(page.locator('#save-state')).toContainText('未保存');await expect(page.locator('#notice')).toContainText('保存容量');
 await page.evaluate(()=>{IDBObjectStore.prototype.put=window.originalPut;});await page.locator('#retry-save').click();await expect(page.locator('#save-state')).toHaveText('✓ ブラウザに保存済み');await page.reload();await expect(page.locator('.property-link')).toHaveText('保存失敗後も保持');
});

test('cancel OCR preparation returns controls without losing existing cases',async({page})=>{
 let release;
 const held=new Promise(resolve=>{release=resolve;});
 await page.route('**/vendor/lang/**',async route=>{await held;await route.abort().catch(()=>{});});
 try {
  await page.goto('/');await page.locator('#manual').click();await page.locator('#field-name').fill('保持する案件');
  await expect(page.locator('#save-state')).toHaveText('✓ ブラウザに保存済み');await page.locator('#back').click();
  const pdf=await PDFDocument.create();pdf.addPage();
  await page.locator('#pdf-files').setInputFiles({name:'cancel.pdf',mimeType:'application/pdf',buffer:Buffer.from(await pdf.save())});
  await expect(page.locator('#process-label')).toContainText('OCR準備中');
  await page.locator('#cancel-process').click();release();
  await expect(page.getByRole('heading',{name:'PDF登録の結果'})).toBeVisible();
  await page.getByRole('button',{name:'閉じる',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByRole('button',{name:/設定・バックアップ/})).toBeEnabled();
  await page.getByRole('button',{name:/設定・バックアップ/}).click();
  await expect(page.getByRole('heading',{name:'ポータル入稿ページ',exact:true})).toBeVisible();
 } finally {release();}
});
