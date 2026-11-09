/* BBB CLUB — «Звіти по магазинах»: блок «Оплата, викуп та повернення» і «Допродажі» ПО ОБРАНИХ МАГАЗИНАХ.
 * Підключається ПІСЛЯ основного <script> index.html і rep-orders.js. Перевизначає repRenderPayStats,
 * upsellFilteredOrders, renderUpsellStats, repEnsurePayData.
 * Джерело: shop-reports/mydrop-orders/<src>/<day>/<oid> (статуси MyDrop: approved / notCounted / sales / refused)
 *          + shop-reports/ads-pay-cache2/<oid> (тип оплати зі збирача: pay/dep/dn).
 * Картки: n = апрув + «Не учитываем»; апрув = апрув-статуси; не апрув = «Не учитываем»;
 *         забрали = продажа; не забрали = відмова; в дорозі = решта апрувнутих.
 *         Задаток = «завдаток + сума» АБО (слово «завдаток» і статус «Не учитываем»).
 * Допродажі прив'язуються до магазину через id заказу MyDrop (авто) або телефон/ТТН (ручні).
 */
var REP_PAY_SRC = {
  "Black-street|Google": "Сайт-Black-street", "Bonna-shop|Google": "Сайт-Bonna-shop", "Blink|Google": "Хор-Blink",
  "Black-street - FB|Facebook": "Black-facebook", "Blink-FB|Facebook": "Blink-facebook",
  "Prom Black-street|Prom": "Prom-Black-street", "Prom Bonna-shop|Prom": "Prom-Bonna-shop", "Prom Core22|Prom": "Prom-Core22",
  "Prom-Street Code|Prom": "Prom-Street Code", "Промокод|Промо": "Промокод", "(без джерела)|—": "(не указан)"
};
var repPayMd = {}, repPayC2 = null, repPayRet2 = null, repPaySkip = false, repPayLoadedNew = false;
// ── Контроль версій серверних скриптів (shop-reports/versions/<job> пишуть самі скрипти при запуску) ──
var REP_REQ_VER = { ads: "2026-11-07.1", mydrop: "2026-11-07.1" };
async function repPayVersionBanner(el){
  var v = (await fbRestGet("shop-reports/versions")) || {};
  var bad = [];
  if (!v.ads || v.ads.ver < REP_REQ_VER.ads) bad.push("збирач реклами (ads): " + (v.ads ? v.ads.ver : "версія не пишеться — стара копія") + ", потрібна " + REP_REQ_VER.ads);
  if (!v.mydrop || v.mydrop.ver < REP_REQ_VER.mydrop) bad.push("статистика MyDrop (stats.py): " + (v.mydrop ? v.mydrop.ver : "версія не пишеться — стара копія") + ", потрібна " + REP_REQ_VER.mydrop);
  var old = document.getElementById("rep-ver-banner"); if (old) old.remove();
  if (!bad.length) return;
  var b = document.createElement("div"); b.id = "rep-ver-banner";
  b.style.cssText = "margin:0 0 12px;padding:10px 14px;border-radius:10px;background:#FDECEC;border:1px solid #F3B4B4;color:#B91C1C;font-size:13px;font-weight:600";
  b.innerHTML = "⚠ На сервері стоїть СТАРА версія: " + bad.join("; ") + ". Цифри нижче неповні, доки не встановлено актуальний пакет (⚙ → «Обновить приложение»).";
  el.parentNode.insertBefore(b, el);
}
function repPaySelSrcs(){ var out = []; repSelKeys.forEach(function(k){ var s = REP_PAY_SRC[k] || k.split("|")[0]; if (out.indexOf(s) < 0) out.push(s); }); return out; }
function repPayAllSelected(){ return (repSources || []).every(function(s){ return repSelKeys.has(s.name + "|" + s.ch); }); }
window.repEnsurePayData = async function(force){ if (force){ repPayMd = {}; repPayC2 = null; repPayRet2 = null; } };
async function repPayLoad(srcs){
  if (!repPayC2) repPayC2 = (await fbRestGet("shop-reports/ads-pay-cache2")) || {};
  if (!repPayRet2) repPayRet2 = (await fbRestGet("shop-reports/returns")) || {};
  await Promise.all(srcs.map(async function(s){
    if (repPayMd[s]) return;
    repPayMd[s] = (await fbRestGet("shop-reports/mydrop-orders/" + encodeURIComponent(s))) || {};
    repPayLoadedNew = true;
  }));
}
window.repRenderPayStats = async function(){
  if (repPaySkip) return;
  var el = document.getElementById("rep-paytype-kpis"); if (!el) return;
  var srcs = repPaySelSrcs();
  try{ await repPayVersionBanner(el); }catch(e){}
  await repPayLoad(srcs);
  var rg = repGetDateRange() || [null, null];
  var f = rg[0] ? repYmd(rg[0]) : "0000-00-00", t = rg[1] ? repYmd(rg[1]) : "9999-99-99";
  var G = { deposit: { n: 0, ap: 0, sold: 0, ref: 0, dep: 0 }, full: { n: 0, ap: 0, sold: 0, ref: 0 }, cod: { n: 0, ap: 0, sold: 0, ref: 0 } };
  srcs.forEach(function(s){
    var tree = repPayMd[s] || {};
    for (var day in tree){ if (day < f || day > t) continue; var ords = tree[day] || {};
      for (var oid in ords){ var o = ords[oid]; if (!o) continue;
        var c = repPayC2[oid] || {}; var pay = c.pay || "cod"; var dn = +c.dn || 0;
        var dep = +c.dep || (o.info && +o.info.dep) || 0;
        var ap = +o.approved ? 1 : 0, nc = +o.notCounted ? 1 : 0, sold = +o.sales ? 1 : 0, ref = +o.refused ? 1 : 0;
        if (!ap && !nc) continue;                     // новий / недозвон / в роботі — у картки не входять
        var isDep = (pay === "deposit") || (dn && nc);
        var g = isDep ? G.deposit : (pay === "full" ? G.full : G.cod);
        g.n++; g.ap += ap; g.sold += sold; g.ref += ref; if (isDep && ap) g.dep += dep;
      } }
  });
  var bo = function(g){ return g.ap ? Math.round((g.ap - (g.ref || 0)) / g.ap * 100) : 0; };
  var boCol = function(g){ var v = bo(g); return v >= 60 ? "#0E7C5A" : (v ? "#C2453B" : "#999"); };
  var rCount = 0, rSum = 0;
  for (var day in (repPayRet2 || {})){ if (day < f || day > t) continue; var cc = repPayRet2[day] || {}; rCount += +cc.count || 0; rSum += +cc.sum || 0; }
  var cell = function(v, l, c){ return '<div class="pay-cell"><div class="pay-cell-v"' + (c ? ' style="color:' + c + '"' : '') + '>' + v + '</div><div class="pay-cell-l">' + l + '</div></div>'; };
  var pp = function(a, b){ return b ? ' <span style="font-size:11px;font-weight:500;color:var(--text-muted)">' + Math.round(a / b * 100) + '%</span>' : ''; };
  var totAp = G.deposit.ap + G.full.ap + G.cod.ap;
  var card = function(title, g, extra){
    var ref = g.ref || 0, tr = Math.max(0, g.ap - g.sold - ref), pc = function(n){ return g.ap ? Math.max(0, n / g.ap * 100) : 0; };
    return '<div class="kpi"><div class="pay-head"><div><div class="kpi-lbl">' + title + '</div><div class="kpi-val">' + fmt(g.n) + ' <span style="font-size:12px;color:var(--text-muted)">зак.</span></div></div>'
      + '<div class="pay-bo"><div class="pay-bo-v" style="color:' + boCol(g) + '">' + (g.ap ? bo(g) + '%' : '—') + '</div><div class="pay-bo-l">викуп від апрув' + (g.ap ? ' (' + fmt(g.ap - ref) + ' / ' + fmt(g.ap) + ')' : '') + '</div>'
      + '<div class="pay-bo-l" style="margin-top:2px;text-transform:none;letter-spacing:0">по завершених: <b style="color:var(--text)">' + ((g.sold + ref) ? Math.round(g.sold / (g.sold + ref) * 100) + '%' : '—') + '</b> (' + fmt(g.sold) + ' / ' + fmt(g.sold + ref) + ')</div></div></div>'
      + '<div class="pay-bar" title="забрали / в дорозі / не забрали"><span style="width:' + pc(g.sold) + '%;background:var(--green)"></span><span style="width:' + pc(tr) + '%;background:var(--yellow)"></span><span style="width:' + pc(ref) + '%;background:var(--red)"></span></div>'
      + '<div class="pay-grid">' + cell(fmt(g.ap) + pp(g.ap, g.n), 'апрув') + cell(fmt(g.n - g.ap) + pp(g.n - g.ap, g.n), 'не апрув')
      + (totAp ? cell(Math.round(g.ap / totAp * 100) + '%', 'частка від усіх апрувів') : '')
      + cell(fmt(g.sold), 'забрали', 'var(--green)') + cell(fmt(tr), 'в дорозі', 'var(--yellow)') + cell(fmt(ref), 'не забрали', 'var(--red)') + (extra || '') + '</div></div>';
  };
  el.innerHTML =
    card('Задаток', G.deposit, G.deposit.dep ? cell(fmt(G.deposit.dep) + ' ₴', 'сума задатків') : '') +
    card('Повна оплата', G.full, '') +
    card('Накладений платіж', G.cod, '') +
    '<div class="kpi"><div class="pay-head"><div><div class="kpi-lbl">Повернення</div><div class="kpi-val" style="color:var(--red)">' + fmt(rCount) + ' <span style="font-size:12px;color:var(--text-muted)">зак.</span></div></div></div><div class="pay-grid" style="margin-top:28px">' + cell(fmt(rSum) + ' ₴', 'сума повернень') + cell(rCount ? fmt(Math.round(rSum / rCount)) + ' ₴' : '—', 'середній чек') + cell('Google', 'джерело') + '</div></div>';
  var hint = document.getElementById("rep-paytype-hint");
  if (hint) hint.textContent = "По обраних магазинах (статуси MyDrop). Апрув = апрув-статуси; «не апрув» = «Не учитываем»; забрали = продажа; «не забрали» = відмова; в дорозі = решта апрувнутих. Викуп від апрув = (апрув − не забрали) ÷ апрув («в дорозі» рахуються як забрані); по завершених = забрали ÷ (забрали + не забрали). Задаток — «завдаток» + сума, або слово «завдаток» і статус «Не учитываем». Повна оплата — поле «Оплачено» в SalesDrive, решта — накладений платіж. Повернення — з Google-таблиці (усі магазини).";
  // після першого завантаження даних магазинів — перемалювати основні картки (ЗП за допродажі залежить від фільтра)
  if (repPayLoadedNew && !repPayAllSelected()){ repPayLoadedNew = false; setTimeout(function(){ try{ repRenderAll(); }catch(e){} }, 0); }
  repPayLoadedNew = false;
};
// ── Допродажі по обраних магазинах ──
var repPayOrigUpsellFiltered = window.upsellFilteredOrders;
window.upsellFilteredOrders = function(){
  var base = repPayOrigUpsellFiltered();
  if (repPayAllSelected()) return base;
  var byOid = {}, byPh = {}, byTtn = {};
  repPaySelSrcs().forEach(function(s){ var tree = repPayMd[s] || {};
    for (var day in tree){ var ords = tree[day] || {}; for (var oid in ords){ var o = ords[oid]; if (!o) continue; byOid[String(oid)] = 1; var i = o.info || {}; if (i.ph) byPh[String(i.ph)] = 1; if (i.ttn) byTtn[String(i.ttn)] = 1; } } });
  return base.filter(function(u){
    var ph = String(u.phone || "").replace(/\D/g, "").slice(-9), ttn = String(u.ttn || "").trim();
    return (u.mydropOrderId && byOid[String(u.mydropOrderId)]) || (ph && byPh[ph]) || (ttn && byTtn[ttn]);
  });
};
var repPayOrigRenderUpsell = window.renderUpsellStats;
window.renderUpsellStats = function(){
  window.repRenderPayStats().then(function(){ repPaySkip = true; try{ repPayOrigRenderUpsell(); } finally { repPaySkip = false; } });
};
