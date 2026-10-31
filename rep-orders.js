/* BBB CLUB — «Звіти по магазинах»: список заказів магазину + перенос заказу в інший магазин.
 * Підключається ПІСЛЯ основного <script> index.html (використовує repRenderAll, repGetDateRange).
 * На кожній картці зʼявляється кнопка «📋 Заказы» → список заказів за період (№, товар, сума, статус,
 * дата) із селектом магазину. Вибір пише shop-reports/mydrop-order-src/<id> = ключ магазину.
 * Переопределення застосовують вебхук (при зміні заказу в MyDrop) та stats.py (щогодини) — заказ
 * переїжджає в обраний магазин. Сторінка при виборі НЕ перемальовується.
 */
var REP_SRC_MAP = {
  "Black-street|Google": "Сайт-Black-street",
  "Bonna-shop|Google": "Сайт-Bonna-shop",
  "Blink|Google": "Хор-Blink",
  "Black-street - FB|Facebook": "Black-facebook",
  "Blink-FB|Facebook": "Blink-facebook",
  "Prom Black-street|Prom": "Prom-Black-street",
  "Prom Bonna-shop|Prom": "Prom-Bonna-shop",
  "Prom Core22|Prom": "Prom-Core22",
  "Prom-Street Code|Prom": "Prom-Street Code",
  "Промокод|Промо": "Промокод"
};
var REP_FB = "https://owner-portal-1649e-default-rtdb.europe-west1.firebasedatabase.app";
var repOrdersOpen = new Set();
var REP_ORDSRC = null;   // oid -> src (ручні переноси), підвантажується один раз

function repSrcOfKey(key){
  var k = String(key || "");
  if (k.indexOf("(без джерела)") === 0 || k.indexOf("без джерела") >= 0) return "(не указан)";
  if (REP_SRC_MAP[k]) return REP_SRC_MAP[k];
  return k.split("|")[0];
}
function repShopNameOfSrc(src){
  var k = Object.keys(REP_SRC_MAP).find(function(x){ return REP_SRC_MAP[x] === src; });
  return k ? k.split("|")[0] : src;
}
function repShopOptions(curSrc, sel){
  var o = '<option value="">— перенести в магазин —</option>';
  Object.keys(REP_SRC_MAP).forEach(function(k){
    var src = REP_SRC_MAP[k]; if (src === curSrc) return;
    o += '<option value="' + src.replace(/"/g, "&quot;") + '"' + (src === sel ? " selected" : "") + ">" + k.split("|")[0] + "</option>";
  });
  return o;
}
function repToggleOrders(key){
  repOrdersOpen.has(key) ? repOrdersOpen.delete(key) : repOrdersOpen.add(key);
  repRenderAll();
}
async function repSetOrderSrc(oid, src, el){
  REP_ORDSRC = REP_ORDSRC || {};
  if (src) REP_ORDSRC[oid] = src; else delete REP_ORDSRC[oid];
  try{ await fetch(REP_FB + "/shop-reports/mydrop-order-src/" + encodeURIComponent(oid) + ".json",
    {method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(src || null)}); }catch(e){}
  // без перемалювання: лише мітка на рядку
  if (el){
    var row = el.closest(".rep-ord-row");
    var old = row && row.querySelector(".rep-ord-tag"); if (old) old.remove();
    if (src && row){ row.style.opacity = "0.55"; var t = document.createElement("span"); t.className = "rep-ord-tag";
      t.style.cssText = "margin-left:8px;color:#0E7C5A;font-weight:600"; t.textContent = "→ " + repShopNameOfSrc(src); el.parentNode.appendChild(t); }
    else if (row){ row.style.opacity = ""; }
  }
}
async function repFillOrders(key, box){
  var src = repSrcOfKey(key);
  var range = (typeof repGetDateRange === "function") ? repGetDateRange() : [null, null];
  var start = range[0], end = range[1];
  box.innerHTML = '<div class="hint">Завантаження заказів…</div>';
  try{
    if (!REP_ORDSRC){ try{ REP_ORDSRC = (await fetch(REP_FB + "/shop-reports/mydrop-order-src.json").then(function(r){ return r.json(); })) || {}; }catch(e){ REP_ORDSRC = {}; } }
    var tree = (await fetch(REP_FB + "/shop-reports/mydrop-orders/" + encodeURIComponent(src) + ".json").then(function(r){ return r.json(); })) || {};
    var rows = [];
    Object.keys(tree).sort().reverse().forEach(function(day){
      var d = new Date(day); if (start && d < start) return;
      if (end){ var e = new Date(end); e.setHours(23,59,59,999); if (d > e) return; }
      var ords = tree[day] || {};
      Object.keys(ords).forEach(function(oid){ var c = ords[oid]; if (!c) return; rows.push({oid:oid, day:day, c:c, info:c.info || {}}); });
    });
    if (!rows.length){ box.innerHTML = '<div class="hint">Заказів за період немає.</div>'; return; }
    var html = rows.map(function(r){
      var i = r.info, c = r.c, cur = REP_ORDSRC[r.oid] || "";
      var st = i.st || (c.approved ? "апрув" : (c.inWork ? "в роботі" : (c.notApproved ? "не апрув" : (c.novi ? "новий" : ""))));
      var money = i.total ? Math.round(i.total) : (c.revenue ? Math.round(c.revenue) : 0);
      return '<div class="rep-ord-row" style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;padding:7px 0;border-bottom:1px solid var(--border-2,#e5e5e3)">'
        + '<span style="font-family:JetBrains Mono,monospace;font-weight:600">№ ' + (i.no || r.oid) + '</span>'
        + '<span style="flex:1;min-width:220px">' + (i.prod ? i.prod : '<span class="hint">(товар підтягнеться після наступного оновлення даних)</span>') + '</span>'
        + '<span style="font-family:JetBrains Mono,monospace">' + (money ? money + ' ₴' : '') + '</span>'
        + '<span style="color:var(--text-muted,#999)">' + st + '</span>'
        + '<span style="color:var(--text-muted,#999)">' + r.day + '</span>'
        + '<select onchange="repSetOrderSrc(\'' + r.oid + '\',this.value,this)" style="padding:4px 8px;border-radius:8px;border:1px solid var(--border-2,#e5e5e3);max-width:230px;font-size:12px">' + repShopOptions(src, cur) + '</select>'
        + (cur ? '<span class="rep-ord-tag" style="margin-left:8px;color:#0E7C5A;font-weight:600">→ ' + repShopNameOfSrc(cur) + '</span>' : '')
        + '</div>';
    }).join("");
    box.innerHTML = '<div class="hint" style="margin:6px 0">Заказів за період: <b>' + rows.length + '</b>. Обери магазин — заказ переїде туди при наступному оновленні даних (щогодини) або при будь-якій зміні заказу в MyDrop.</div>' + html;
  }catch(e){ box.innerHTML = '<div class="hint">Не вдалося завантажити: ' + e.message + '</div>'; }
}
function repInjectOrdersUI(){
  document.querySelectorAll('button[onclick^="repToggleExpand("]').forEach(function(btn){
    if (btn.dataset.ordInjected) return; btn.dataset.ordInjected = "1";
    var m = /repToggleExpand\('([^']*)'\)/.exec(btn.getAttribute("onclick") || ""); if (!m) return;
    var key = m[1];
    var b = document.createElement("button"); b.className = btn.className || "btn"; b.style.cssText = "margin-top:12px;margin-left:8px";
    b.textContent = repOrdersOpen.has(key) ? "▴ Сховати заказы" : "📋 Заказы";
    b.setAttribute("onclick", "repToggleOrders('" + key.replace(/'/g, "\\'") + "')");
    btn.parentNode.insertBefore(b, btn.nextSibling);
    if (repOrdersOpen.has(key)){ var box = document.createElement("div"); box.className = "rep-ord-box"; box.style.marginTop = "10px";
      b.parentNode.insertBefore(box, b.nextSibling); repFillOrders(key, box); }
  });
}
(function(){
  var orig = window.repRenderAll;
  if (typeof orig !== "function") return;
  window.repRenderAll = function(){ var r = orig.apply(this, arguments); try{ repInjectOrdersUI(); }catch(e){} return r; };
  try{ repInjectOrdersUI(); }catch(e){}
})();
