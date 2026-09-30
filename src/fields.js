// Add aliases here; extraction never invents values or converts units.
const groups = [
  ['基本情報', [
    ['type','物件種別','種別'], ['name','物件名','名称'], ['unit','号棟','棟番号'], ['price','販売価格','物件価格','価格'], ['address','所在地','住所'], ['postal','郵便番号'],
    ['residential','住居表示'], ['lotAddress','地番'], ['prefecture','都道府県'], ['city','市区町村'], ['town','町名'], ['chome','丁目'], ['street','番地']
  ]],
  ['交通（複数経路を改行で保持）', [['transport','交通','アクセス'], ['line','路線名'], ['station','駅名'], ['walk','徒歩分数'], ['busMinutes','バス所要時間'], ['busStop','バス停名'], ['busWalk','バス停からの徒歩分数']]],
  ['面積', [['land','土地面積','敷地面積'], ['buildingArea','建物面積','延床面積','延べ床面積'], ['exclusive','専有面積'], ['balcony','バルコニー面積'], ['privateArea','私道負担面積'], ['setbackArea','セットバック面積']]],
  ['建物', [['layout','間取り'], ['built','築年月','建築年月'], ['completed','完成年月','完成時期'], ['structure','構造','建物構造'], ['floors','階数'], ['floor','所在階'], ['permit','建築確認番号']]],
  ['土地', [['rights','土地権利','権利'], ['category','地目']]],
  ['都市計画・法令', [['planning','都市計画'], ['zone','用途地域'], ['coverage','建ぺい率','建蔽率'], ['ratio','容積率'], ['fire','防火指定'], ['semiFire','準防火指定'], ['height','高度地区'], ['district','地区計画'], ['landscape','景観法'], ['readjustment','区画整理'], ['farmland','農地法'], ['laws','その他法令制限','法令制限','法令上の制限']]],
  ['道路（複数接道を改行で保持）', [['roads','接道','道路'], ['direction','接道方向'], ['roadType','道路種別'], ['width','道路幅員','幅員'], ['roadLength','接道長さ'], ['frontage','接道間口','間口'], ['privateRoad','私道負担'], ['setback','セットバック']]],
  ['設備', [['water','上水道'], ['sewer','下水道'], ['gas','ガス'], ['electricity','電気'], ['parking','駐車場','駐車スペース'], ['equipment','その他設備','設備']]],
  ['取引情報', [['current','現況'], ['handover','引渡時期','引渡し','引渡'], ['agency','取引態様']]],
  ['マンション', [['fee','管理費'], ['reserve','修繕積立金'], ['management','管理形態']]],
  ['その他', [['notes','備考'], ['unclassified','未分類情報']]]
];
export const FIELDS = groups.flatMap(([group, rows]) => rows.map(([id,label,...aliases]) => ({id,label,group,aliases:[label,...aliases]})));
export const STATUS = { unreviewed:'未確認', review:'⚠ 要確認', unknown:'？ 不明', confirmed:'✓ 確定' };
export const PORTAL_STATES = ['未着手','作業中','下書き完了','要確認'];
export const PROGRESS = { suumo:['SUUMO',PORTAL_STATES], athome:['at home',PORTAL_STATES], photo:['写真',['未登録','完了']], floorplan:['間取り',['未登録','完了']], final:['最終確認',['未確認','完了']], publication:['外部公開の記録',['未公開','公開済み']] };
export const NUMERIC = new Set(['price','land','buildingArea','exclusive','balcony','privateArea','setbackArea','built','completed','floors','floor','fee','reserve','coverage','ratio','width','roadLength','walk','busMinutes','busWalk']);
