/* BBB CLUB — ручні FB-кампанії для трекера реклами.
 * Джерела з MANUAL_FB рендеряться окремою карткою, де все вводиться вручну:
 * назва кампанії, заявки, апрув, маржа, бюджет. Зверху — підказка з MyDrop (той заказ).
 * Залежить від глобалів основного скрипта (FB, enc, inRange, fmt, SETTINGS, render, CURF, CURT),
 * тому підключається ПЕРЕД основним <script>. Дані: shop-reports/ads-fb-manual/<src>/<campKey>/...
 */
var MANUAL_FB = ["Сайт-Black-street-FB"];
var FB_MDKEY  = {"Сайт-Black-street-FB":"Black-facebook","Хор-Blink-FB":"Blink-facebook"};
var MFB = {}, MDROP = {};

function isManualFb(s){ return MANUAL_FB.indexOf(s) >= 0; }

function mdTot(src,f,t){
  var k=FB_MDKEY[src], o=(MDROP&&MDROP[k])||{}, r={leads:0,approved:0,margin:0};
  for(var d in o){ if(d==="name"||!inRange(d,f,t)) continue; var c=o[d]||{};
    r.leads+=+c.leads||0; r.approved+=+c.approved||0; r.margin+=+c.margin||0; }
  return r;
}
function mfbCamps(src){ var o=MFB[src]||{}; return Object.keys(o).map(function(k){ return {key:k,name:(o[k]&&o[k].name)||"Без назви"}; }); }
function mfbVals(src,key,f,t){ return ((MFB[src]||{})[key]||{})[(f||"")+"_"+(t||"")]||{}; }

async function mfbAdd(src){
  var id="c"+Date.now(); MFB[src]=MFB[src]||{}; MFB[src][id]={name:"Нова кампанія"};
  try{ await fetch(FB+"/shop-reports/ads-fb-manual/"+enc(src)+"/"+enc(id)+"/name.json",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify("Нова кампанія")}); }catch(e){}
  render();
}
async function mfbDel(src,key){
  if(!confirm("Видалити кампанію?")) return;
  if(MFB[src]) delete MFB[src][key];
  try{ await fetch(FB+"/shop-reports/ads-fb-manual/"+enc(src)+"/"+enc(key)+".json",{method:"DELETE"}); }catch(e){}
  render();
}
async function mfbName(src,key,val){
  MFB[src]=MFB[src]||{}; MFB[src][key]=MFB[src][key]||{}; MFB[src][key].name=val;
  try{ await fetch(FB+"/shop-reports/ads-fb-manual/"+enc(src)+"/"+enc(key)+"/name.json",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(val)}); }catch(e){}
}
async function mfbSet(src,key,f,t,field,val){
  var pk=(f||"")+"_"+(t||""); MFB[src]=MFB[src]||{}; MFB[src][key]=MFB[src][key]||{}; MFB[src][key][pk]=MFB[src][key][pk]||{};
  var v=parseFloat(val); v=isNaN(v)?0:v; MFB[src][key][pk][field]=v;
  try{ await fetch(FB+"/shop-reports/ads-fb-manual/"+enc(src)+"/"+enc(key)+"/"+enc(pk)+"/"+field+".json",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(v)}); }catch(e){}
  render();
}

function manualFbCard(src,f,t){
  var camps=mfbCamps(src), md=mdTot(src,f,t), tot={leads:0,approved:0,margin:0,budget:0};
  var inp=function(val,field,key){ return '<input type="number" min="0" style="width:72px;text-align:right" value="'+(val||"")+'" onclick="event.stopPropagation()" onchange="mfbSet(\''+src+'\',\''+key+'\',CURF,CURT,\''+field+'\',this.value)">'; };
  var rows="";
  for(var i=0;i<camps.length;i++){ var c=camps[i], v=mfbVals(src,c.key,f,t);
    var L=+v.leads||0, A=+v.approved||0, M=+v.margin||0, B=+v.budget||0;
    tot.leads+=L; tot.approved+=A; tot.margin+=M; tot.budget+=B;
    var zp=A*(SETTINGS.zpRate||0), net=M-B-zp, roi=B?Math.round(net/B*100):0, roas=B?(M/B):0;
    rows+='<tr><td class="name"><input style="width:96%" value="'+String(c.name).replace(/"/g,"&quot;")+'" onclick="event.stopPropagation()" onchange="mfbName(\''+src+'\',\''+c.key+'\',this.value)"></td>'
      +'<td>'+inp(L,"leads",c.key)+'</td><td>'+inp(A,"approved",c.key)+'</td><td>'+inp(M,"margin",c.key)+'</td>'
      +'<td>'+(L?Math.round(A/L*100):0)+'%</td><td>'+inp(B,"budget",c.key)+'</td>'
      +'<td>'+(L?fmt(B/L):"—")+'</td><td>'+(A?fmt(B/A):"—")+'</td><td>'+fmt(zp)+'</td><td>—</td>'
      +'<td>'+(roas?roas.toFixed(2)+"×":"—")+'</td><td>'+(B?roi+"%":"—")+'</td><td class="'+(net>=0?"g":"r")+'">'+fmt(net)+'</td>'
      +'<td><button class="ghost" style="padding:2px 8px" onclick="mfbDel(\''+src+'\',\''+c.key+'\')">✕</button></td></tr>';
  }
  var tpct=tot.leads?Math.round(tot.approved/tot.leads*100):0, tzp=tot.approved*(SETTINGS.zpRate||0), tnet=tot.margin-tot.budget-tzp, troi=tot.budget?Math.round(tnet/tot.budget*100):0, troas=tot.budget?(tot.margin/tot.budget):0;
  var totRow='<tr style="font-weight:700;border-top:2px solid var(--line)"><td class="name">Разом</td><td>'+fmt(tot.leads)+'</td><td>'+fmt(tot.approved)+' '+tpct+'%</td><td class="g">'+fmt(tot.margin)+'</td><td>'+tpct+'%</td><td class="bd">'+fmt(tot.budget)+'</td><td>'+(tot.leads?fmt(tot.budget/tot.leads):"—")+'</td><td>'+(tot.approved?fmt(tot.budget/tot.approved):"—")+'</td><td>'+fmt(tzp)+'</td><td>—</td><td>'+(troas?troas.toFixed(2)+"×":"—")+'</td><td>'+(tot.budget?troi+"%":"—")+'</td><td class="'+(tnet>=0?"g":"r")+'">'+fmt(tnet)+'</td><td>—</td></tr>';
  var banner='<div class="note" style="margin:8px 2px 4px">📥 З MyDrop (Black-facebook) за період: заявок <b>'+fmt(md.leads)+'</b> · апрув <b>'+fmt(md.approved)+'</b> · маржа <b>'+fmt(md.margin)+' ₴</b>. Внеси кампанії вручну нижче (назва, заявки, апрув, маржа, бюджет).</div>';
  var addBtn='<div style="margin:10px 2px"><button class="ghost" onclick="mfbAdd(\''+src+'\')">+ Додати кампанію</button></div>';
  var empty=camps.length?"":'<tr><td class="empty" colspan="14">Ще немає кампаній. Натисни «+ Додати кампанію».</td></tr>';
  return '<div class="shop"><h2>'+shopTitle(src)+'<span class="t">заявок <b>'+fmt(tot.leads)+'</b> · апрув <b>'+fmt(tot.approved)+'</b> <span class="pct">'+tpct+'%</span> · маржа <b class="g">'+fmt(tot.margin)+' ₴</b> · бюджет <b class="bd">'+fmt(tot.budget)+' ₴</b></span></h2>'+banner
    +'<table><thead><tr><th class="name">Кампанія (вручну)</th><th>Заявки</th><th>Апрув</th><th>Маржа ₴</th><th>Викуп %</th><th>Бюджет ₴</th><th>Ціна заявки</th><th>Ціна заказу</th><th>ЗП ₴</th><th>Повернення ₴</th><th>ROAS</th><th>ROI</th><th>Чистими ₴</th><th>Допрод ₴</th></tr></thead><tbody>'+empty+rows+(camps.length?totRow:"")+'</tbody></table>'+addBtn+'</div>';
}

// Ручне призначення категорії по КОНКРЕТНОМУ заказу (по номеру заказу). Працює навіть якщо
// в даних заказу немає артикулу. Зберігається в shop-reports/ads-ord-cat[src][ext]=advCatKey.
async function setOrdCat(src,ext,val){
  ORDCAT[src]=ORDCAT[src]||{};
  if(val) ORDCAT[src][ext]=val; else delete ORDCAT[src][ext];
  try{ await fetch(FB+"/shop-reports/ads-ord-cat/"+enc(src)+"/"+enc(ext)+".json",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(val||null)}); }catch(e){}
  render();
}

// Ручне призначення РЕКЛАМНОЇ КАМПАНІЇ по КОНКРЕТНОМУ заказу (по номеру заказу).
// Зберігається в shop-reports/ads-ord-camp[src][ext]=назва кампанії. Якщо раптом заказ
// залетів не в ту кампанію — обираєш правильну, і він переноситься туди.
async function setOrdCamp(src,ext,val){
  ORDCAMP[src]=ORDCAMP[src]||{};
  if(val) ORDCAMP[src][ext]=val; else delete ORDCAMP[src][ext];
  try{ await fetch(FB+"/shop-reports/ads-ord-camp/"+enc(src)+"/"+enc(ext)+".json",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(val||null)}); }catch(e){}
  render();
}
// Опції селекта кампаній для магазину (з поточною вибраною).
function campOptsSel(src,sel){
  var o='<option value="">— перенести в кампанію —</option>';
  (typeof ALLCAMPS!=="undefined"?ALLCAMPS:[]).forEach(function(c){ if(c.src===src){ var nm=String(c.camp).replace(/"/g,'&quot;'); var s=(c.camp===sel)?' selected':''; o+='<option value="'+nm+'"'+s+'>'+c.camp+'</option>'; } });
  return o;
}

// Авто-ініціалізація: цей файл підключається ПІСЛЯ основного <script>, тому FB/render уже існують.
// Тягнемо ручні кампанії + дані MyDrop + ручні призначення категорій/кампаній по заказу і перемальовуємо.
(async function(){
  try{ ORDCAT = await fetch(FB+"/shop-reports/ads-ord-cat.json").then(function(r){return r.json();})||{}; }catch(e){ ORDCAT={}; }
  try{ ORDCAMP = await fetch(FB+"/shop-reports/ads-ord-camp.json").then(function(r){return r.json();})||{}; }catch(e){ ORDCAMP={}; }
  try{ MFB   = await fetch(FB+"/shop-reports/ads-fb-manual.json").then(function(r){return r.json();})||{}; }catch(e){ MFB={}; }
  try{ MDROP = await fetch(FB+"/shop-reports/mydrop.json").then(function(r){return r.json();})||{}; }catch(e){ MDROP={}; }
  if(typeof render==="function") render();
})();
