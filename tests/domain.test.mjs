import test from 'node:test';
import assert from 'node:assert/strict';
import {newProperty,editField,validateUrl,ready} from '../src/model.js';
import {parsePages} from '../src/parser.js';
import {generatePrompt,SAFETY} from '../src/prompt.js';
import {parseResults} from '../src/results.js';
import {validateBackup} from '../src/backup.js';
import {FIELDS} from '../src/fields.js';
const parse=(text,method='PDF TEXT')=>parsePages(newProperty('sample.pdf'),[{number:1,text,method}]);
const confirm=(p,id)=>{p.fields[id].status='confirmed';p.fields[id].confirmedAt=new Date().toISOString();};
test('Japanese labels, units and original source are preserved',()=>{
 const p=parse('物件名：草加市テスト\n号棟：1号棟\n販売価格：4,290万円\n土地面積：112.34㎡（33.98坪） 建物面積：98.53㎡\n専有面積：80.1㎡\nバルコニー面積：9㎡\n私道負担面積：12㎡\nセットバック面積：2㎡');
 assert.equal(p.fields.price.value,'4,290万円');assert.equal(p.fields.land.value,'112.34㎡（33.98坪）');assert.equal(p.fields.buildingArea.value,'98.53㎡');
 assert.equal(p.fields.exclusive.value,'80.1㎡');assert.equal(p.fields.privateArea.value,'12㎡');assert.equal(p.fields.setbackArea.value,'2㎡');assert.equal(p.fields.gas.status,'unknown');
 assert.equal(p.fields.price.sources[0].page,1);assert.equal(p.fields.price.status,'unreviewed');
});
test('all dictionary fields parse their labels',()=>{for(const f of FIELDS.filter(f=>f.id!=='unclassified'))assert.equal(parse(`${f.label}：テスト値`).fields[f.id].value,'テスト値',f.id);});
test('conflicting values and multiple routes stay reviewable',()=>{
 const p=parsePages(newProperty(),[{number:1,method:'PDF TEXT',text:'価格：4,290万円\n交通：東武線 草加駅 徒歩12分\n接道：南側公道4m'},{number:2,method:'PDF TEXT',text:'価格：4,390万円\n交通：別路線 別駅 徒歩15分\n接道：東側公道6m'}]);
 for(const id of ['price','transport','roads']){assert.equal(p.fields[id].status,'review');assert.equal(p.fields[id].sources.length,2);}
 assert.equal(p.fields.price.value,'4,290万円\n4,390万円');
});
test('OCR fields never automatically become confirmed',()=>{const p=parse('価格：4290万円','OCR');assert.equal(p.fields.price.status,'review');assert.equal(p.fields.price.sources[0].method,'OCR');});
test('OCR inter-character whitespace in labels remains parseable',()=>{const p=parse('土 地 面積：112.34㎡\n建 物 面 積：98.53㎡','OCR');assert.equal(p.fields.land.value,'112.34㎡');assert.equal(p.fields.buildingArea.value,'98.53㎡');});
test('manual edits revoke confirmation and final check',()=>{const p=parse('価格：4290万円');confirm(p,'price');p.progress.final='完了';editField(p,'price','4390万円');assert.equal(p.fields.price.status,'unreviewed');assert.equal(p.fields.price.originalValue,'4290万円');assert.equal(p.progress.final,'未確認');});
test('prompt excludes all unconfirmed values, filenames and source texts',()=>{
 const p=parse('物件名：確認済み物件\n価格：UNCONFIRMED_SECRET\n所在地：REVIEW_SECRET\nガス：UNKNOWN_SECRET');p.sourceFile='FILENAME_SECRET';confirm(p,'name');p.fields.address.status='review';p.fields.gas.status='unknown';
 const output=generatePrompt([p],'TEST',{});assert.match(output,/確認済み物件/);for(const x of ['UNCONFIRMED_SECRET','REVIEW_SECRET','UNKNOWN_SECRET','FILENAME_SECRET'])assert.ok(!output.includes(x));assert.ok(output.includes(SAFETY));
});
test('TEST restricts to one and BATCH separates IDs',()=>{const a=parse('物件名：1号棟'),b=parse('物件名：2号棟');confirm(a,'name');confirm(b,'name');assert.throws(()=>generatePrompt([a,b],'TEST',{}));const output=generatePrompt([a,b],'BATCH',{});assert.ok(output.includes(a.id)&&output.includes(b.id));assert.throws(()=>generatePrompt([newProperty()],'TEST',{}));});
test('URLs reject credential-bearing forms',()=>{assert.equal(validateUrl('https://example.com/entry'),'https://example.com/entry');for(const u of ['javascript:alert(1)','http://example.com','https://u:p@example.com','https://example.com/?token=123','https://example.com/#secret','https://example.com/session/123'])assert.throws(()=>validateUrl(u));});
test('result import matches ID and never imports publication or photos',()=>{const p=newProperty();const r=parseResults(JSON.stringify({results:[{id:p.id,suumo:'下書き完了',athome:'要確認',notes:'引渡時期',publication:'公開済み',photo:'完了'}]}),[p])[0];assert.deepEqual(Object.keys(r),['id','suumo','athome','notes']);assert.throws(()=>parseResults('{"results":[{"id":"absent"}]}',[p]));assert.throws(()=>parseResults(JSON.stringify({results:[{id:p.id,suumo:'公開済み',athome:'未着手',notes:''}]}),[p]));});
test('free text import needs explicit target and rejects ambiguous statuses',()=>{const p=newProperty();assert.throws(()=>parseResults('SUUMO：下書き完了',[p]));const [r]=parseResults('SUUMO：下書き完了\nSUUMO：要確認\nat home：下書き完了',[p],p.id);assert.equal(r.suumo,'未着手');assert.equal(r.athome,'下書き完了');assert.ok(r.notes);});
test('backup validates every field and cannot inject credentials or invalid status',()=>{
 const p=parse('物件名：物件');confirm(p,'name');const b={schemaVersion:1,exportedAt:new Date().toISOString(),properties:[p],settings:{id:'portal',suumo:'',athome:''},pdfs:{}};
 assert.equal(validateBackup(b).properties[0].fields.name.status,'confirmed');
 for(const mutate of [x=>x.schemaVersion=2,x=>x.properties.push(x.properties[0]),x=>x.properties[0].fields.price.status='confirmed',x=>x.settings.password='secret',x=>x.properties[0].progress.publication='公開',x=>x.pdfs.bad='abc',x=>delete x.properties[0].fields.gas]){const copy=structuredClone(b);mutate(copy);assert.throws(()=>validateBackup(copy));}
});
test('ready status requires human work and resolved notes',()=>{const p=newProperty();p.progress={suumo:'下書き完了',athome:'下書き完了',photo:'完了',floorplan:'完了',final:'完了',publication:'未公開'};assert.equal(ready(p),true);p.workNotes='未解決';assert.equal(ready(p),false);});
