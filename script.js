const DATA = JSON.parse(document.getElementById("dashboard-data").textContent);

// -------- local browser storage (menyimpan seluruh perubahan: kalender, lembur, job order, pengaturan jam) --------
const STORAGE_KEY = "gmfSeatCoverDashboardData_v1";
let __loadedFromStorage = false;
(function tryLoadStorage(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const saved = JSON.parse(raw);
      Object.assign(DATA, saved);
      __loadedFromStorage = true;
    }
  }catch(e){ /* data tersimpan rusak/tidak terbaca, abaikan & pakai data bawaan */ }
})();

// -------- pengaturan header (logo & judul) — default sesuai tampilan awal, bisa diedit admin login --------
if(!DATA.header_settings){
  DATA.header_settings = {
    markText: "GMF",
    markImage: null,
    eyebrow: "GMF AeroAsia &middot; Production Control Panel",
    title: "Timeline pekerjaan — Seat Cover GA/QG &amp; Third Party",
    subtitle: "Update per 07 Agu 2026 &middot; 73 job order",
  };
}
function renderHeaderFromData(){
  const hs = DATA.header_settings;
  const markEl = document.getElementById("headerMark");
  markEl.innerHTML = hs.markImage ? `<img src="${hs.markImage}" alt="Logo">` : (hs.markText || "GMF");
  document.getElementById("headerEyebrow").innerHTML = hs.eyebrow || "";
  document.getElementById("headerTitle").innerHTML = hs.title || "";
  document.getElementById("headerSubtitle").innerHTML = hs.subtitle || "";
}
renderHeaderFromData();

// migrate flat imported day values ({iso: number}) into per-session objects ({iso: {pagi,siang,lembur}})
// juga aman dipakai ulang untuk data yang sudah tersimpan (sudah berbentuk objek sesi)
DATA.calendar_products.forEach(p=>{
  const migrated = {};
  Object.keys(p.days).forEach(iso=>{
    const v = p.days[iso];
    const obj = (v && typeof v === "object") ? v : migrateFlatValueToSession(v);
    if(!obj.lembur) obj.lembur = {plan:0, actual:0, jam:null};
    if(obj.lembur.jam === undefined) obj.lembur.jam = null;
    migrated[iso] = obj;
  });
  p.days = migrated;
});

function saveDataToStorage(){
  try{
    const clone = JSON.parse(JSON.stringify(DATA));
    delete clone.__planMap;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clone));
    return true;
  }catch(e){ return false; }
}
function clearSavedData(){
  try{ localStorage.removeItem(STORAGE_KEY); return true; }catch(e){ return false; }
}

// -------- login (hanya akun terdaftar yang bisa mengubah data) --------
// Ganti/tambah akun di sini sesuai kebutuhan tim:
const AUTH_USERS = { "admin": "admin123", "supervisor": "gmf2026" };
const AUTH_KEY = "gmfSeatCoverAuthUser";
function currentUser(){ return localStorage.getItem(AUTH_KEY) || null; }
function isLoggedIn(){ return !!currentUser(); }
function requireLogin(){
  if(isLoggedIn()) return true;
  openLoginModal();
  return false;
}
function openLoginModal(){
  closeCellEditor();
  const backdrop = document.createElement("div");
  backdrop.id = "cellEditorBackdrop";
  backdrop.className = "cell-editor-backdrop";
  backdrop.innerHTML = `
    <div class="cell-editor-pop" style="max-width:300px;">
      <div class="cep-title">Login</div>
      <div class="cep-sub">Hanya akun terdaftar yang bisa mengubah data. Tanpa login, dashboard tetap bisa dilihat.</div>
      <label class="cep-label">Username</label>
      <input type="text" id="authUser" class="target-date-input" style="width:100%;margin-bottom:12px;" autocomplete="username">
      <label class="cep-label">Password</label>
      <input type="password" id="authPass" class="target-date-input" style="width:100%;margin-bottom:6px;" autocomplete="current-password">
      <div id="authError" style="color:var(--danger);font-size:11px;font-family:'IBM Plex Mono',monospace;min-height:16px;margin-bottom:6px;"></div>
      <div class="cep-actions">
        <button type="button" class="btn" id="authCancel">Batal</button>
        <button type="button" class="btn cep-save" id="authSubmit">Masuk</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", (ev)=>{ if(ev.target===backdrop) closeCellEditor(); });
  document.getElementById("authCancel").onclick = closeCellEditor;
  function tryLogin(){
    const u = document.getElementById("authUser").value.trim();
    const p = document.getElementById("authPass").value;
    if(AUTH_USERS[u] && AUTH_USERS[u] === p){
      localStorage.setItem(AUTH_KEY, u);
      closeCellEditor();
      applyAuthUI();
    } else {
      document.getElementById("authError").textContent = "Username atau password salah.";
    }
  }
  document.getElementById("authSubmit").onclick = tryLogin;
  document.getElementById("authPass").addEventListener("keydown", (e)=>{ if(e.key==="Enter") tryLogin(); });
  setTimeout(()=> document.getElementById("authUser")?.focus(), 30);
}
function logout(){
  localStorage.removeItem(AUTH_KEY);
  applyAuthUI();
}
function applyAuthUI(){
  const statusEl = document.getElementById("authStatus");
  const btn = document.getElementById("authBtn");
  if(!statusEl || !btn) return;
  if(isLoggedIn()){
    statusEl.textContent = "Login: " + currentUser();
    btn.textContent = "Logout";
    btn.onclick = logout;
  } else {
    statusEl.textContent = "Mode lihat saja";
    btn.textContent = "Login";
    btn.onclick = openLoginModal;
  }
  document.body.classList.toggle("is-locked", !isLoggedIn());
  document.body.classList.toggle("is-logged-in", isLoggedIn());
  const addBtn = document.getElementById("addJobBtn");
  if(addBtn) addBtn.disabled = !isLoggedIn();
  const saveBtn = document.getElementById("saveRekapBtn");
  if(saveBtn) saveBtn.disabled = !isLoggedIn();
  const resetBtn = document.getElementById("resetSavedBtn");
  if(resetBtn) resetBtn.disabled = !isLoggedIn();
  if(typeof renderAllTable === "function") renderAllTable();
}
document.getElementById("editHeaderBtn")?.addEventListener("click", openHeaderEditModal);
function openHeaderEditModal(){
  if(!requireLogin()) return;
  closeCellEditor();
  const hs = DATA.header_settings;
  const backdrop = document.createElement("div");
  backdrop.id = "cellEditorBackdrop";
  backdrop.className = "cell-editor-backdrop";
  backdrop.innerHTML = `
    <div class="cell-editor-pop" style="max-width:380px;">
      <div class="cep-title">Edit logo &amp; judul header</div>
      <div class="cep-sub">Perubahan berlaku langsung &mdash; klik <b>Simpan perubahan</b> di tab manapun agar tersimpan permanen di browser ini.</div>
      <label class="cep-label">Logo</label>
      <div class="logo-preview" id="logoPreviewBox">${hs.markImage ? `<img src="${hs.markImage}" alt="Logo">` : (hs.markText||"GMF")}</div>
      <input type="file" id="logoFileInput" accept="image/*" style="margin-bottom:6px;width:100%;">
      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <button type="button" class="btn" id="logoRemoveBtn" style="flex:1;">Hapus logo (pakai teks)</button>
      </div>
      <label class="cep-label">Teks logo (dipakai bila tanpa gambar)</label>
      <input type="text" id="hdrMarkText" class="target-date-input" style="width:100%;margin-bottom:14px;" maxlength="4" value="${(hs.markText||"").replace(/"/g,'&quot;')}">
      <label class="cep-label">Eyebrow (baris kecil di atas judul)</label>
      <input type="text" id="hdrEyebrow" class="target-date-input" style="width:100%;margin-bottom:14px;" value="${(hs.eyebrow||"").replace(/"/g,'&quot;')}">
      <label class="cep-label">Judul utama</label>
      <input type="text" id="hdrTitle" class="target-date-input" style="width:100%;margin-bottom:14px;" value="${(hs.title||"").replace(/"/g,'&quot;')}">
      <label class="cep-label">Subjudul</label>
      <input type="text" id="hdrSubtitle" class="target-date-input" style="width:100%;margin-bottom:16px;" value="${(hs.subtitle||"").replace(/"/g,'&quot;')}">
      <div class="cep-actions">
        <button type="button" class="btn" id="hdrCancel">Batal</button>
        <button type="button" class="btn cep-save" id="hdrSave">Terapkan</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", (ev)=>{ if(ev.target===backdrop) closeCellEditor(); });

  let pendingImage = hs.markImage || null;
  const preview = document.getElementById("logoPreviewBox");
  document.getElementById("logoFileInput").addEventListener("change", (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      pendingImage = reader.result;
      preview.innerHTML = `<img src="${pendingImage}" alt="Logo">`;
    };
    reader.readAsDataURL(file);
  });
  document.getElementById("logoRemoveBtn").onclick = ()=>{
    pendingImage = null;
    preview.innerHTML = document.getElementById("hdrMarkText").value || "GMF";
  };
  document.getElementById("hdrCancel").onclick = closeCellEditor;
  document.getElementById("hdrSave").onclick = ()=>{
    DATA.header_settings = {
      markText: document.getElementById("hdrMarkText").value.trim() || "GMF",
      markImage: pendingImage,
      eyebrow: document.getElementById("hdrEyebrow").value.trim(),
      title: document.getElementById("hdrTitle").value.trim(),
      subtitle: document.getElementById("hdrSubtitle").value.trim(),
    };
    renderHeaderFromData();
    closeCellEditor();
  };
}
const WD_ID = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];
const MONTHS_ID_FULL = ["","Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const MONTHS_SHORT = {1:"Jan",2:"Feb",3:"Mar",4:"Apr",5:"Mei",6:"Jun",7:"Jul",8:"Agu",9:"Sep",10:"Okt",11:"Nov",12:"Des"};

function parseDate(s){ const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); }
function isWeekend(dt){ const g = dt.getDay(); return g===0 || g===6; }
function fmt(dt){ return dt.toISOString().slice(0,10); }
function statusBadge(status){
  const c = DATA.status_colors[status] || "#8FA0B3";
  return `<span class="badge" style="background:${c}22;color:${c};border:1px solid ${c}55">${status||"-"}</span>`;
}
function statusSelectHTML(status, idx){
  const c = DATA.status_colors[status] || "#8FA0B3";
  const opts = ["OPEN","PROGRESS","CLOSE","HOLD"].map(s=>
    `<option value="${s}" ${s===status?"selected":""}>${s}</option>`).join("");
  return `<select class="status-select" data-idx="${idx}" style="background-color:${c}22;color:${c};border:1px solid ${c}55">${opts}</select>`;
}

const MONTH_ABBR_MAP = {jan:0,feb:1,mar:2,apr:3,mei:4,may:4,jun:5,jul:6,agu:7,aug:7,sep:8,okt:9,oct:9,nov:10,des:11,dec:11};
function tryParseTargetToISO(str){
  if(!str) return null;
  const s = str.trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.toLowerCase().match(/(\d{1,2})\s+([a-z]+)\s+(\d{2,4})/);
  if(m){
    const day = +m[1];
    const mon = MONTH_ABBR_MAP[m[2].slice(0,3)];
    let year = +m[3];
    if(year < 100) year += 2000;
    if(mon !== undefined){
      const dt = new Date(year, mon, day);
      if(!isNaN(dt)) return dt.toISOString().slice(0,10);
    }
  }
  return null;
}
function formatISOForDisplay(iso){
  const dt = parseDate(iso);
  const MONTHS3 = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return dt.getDate()+" "+MONTHS3[dt.getMonth()]+" "+dt.getFullYear();
}
function targetCellHTML(target, idx){
  const isTBD = target && target.trim().toUpperCase()==="TBD";
  const iso = isTBD ? null : tryParseTargetToISO(target);
  const rawNote = (!iso && !isTBD && target) ? `<div class="target-raw">Sebelumnya: ${target}</div>` : "";
  return `<div class="target-cell" data-idx="${idx}">
    <input type="date" class="target-date-input" data-idx="${idx}" value="${iso||''}" ${isTBD?'disabled':''}>
    <button type="button" class="tbd-btn ${isTBD?'active':''}" data-idx="${idx}">TBD</button>
    ${rawNote}
  </div>`;
}

// ---------- Tabs ----------
let chartsDrawn = {};
document.querySelectorAll("nav.tabs button").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll("nav.tabs button").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
    document.getElementById("view-"+btn.dataset.view).classList.add("active");
    if(btn.dataset.view==="rekap" && !chartsDrawn.rekap){ drawRekapChart(); chartsDrawn.rekap = true; }
  });
});

// ================= DISTRIBUSI PENGERJAAN =================
function distStatsRender(){
  const total = DATA.total_jobs;
  const sc = DATA.status_counts;
  const closeRate = Math.round((sc.CLOSE||0)/total*100);
  const stats = [
    {label:"Total job order", value: total, sub:"seluruh pekerjaan tercatat", color:"var(--cyan)"},
    {label:"Selesai (CLOSE)", value: (sc.CLOSE||0), sub: closeRate+"% dari total", color:"var(--cyan)"},
    {label:"Berjalan (PROGRESS)", value: (sc.PROGRESS||0), sub:"sedang dikerjakan", color:"var(--green)"},
    {label:"Menunggu (OPEN)", value: (sc.OPEN||0), sub:"belum dimulai", color:"var(--amber)"},
    {label:"Tertahan (HOLD)", value: (sc.HOLD||0), sub:"perlu tindak lanjut", color:"var(--danger)"},
  ];
  document.getElementById("dist-stats").innerHTML = stats.map(s=>`
    <div class="stat-card" style="--accent-color:${s.color}">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-sub">${s.sub}</div>
    </div>`).join("");
}
distStatsRender();

let statusDonutChart = null;
function statusDonutRender(){
  const sc = DATA.status_counts;
  const labels = Object.keys(sc);
  const values = labels.map(k=>sc[k]);
  const colors = labels.map(k=>DATA.status_colors[k]);
  if(statusDonutChart) statusDonutChart.destroy();
  statusDonutChart = new Chart(document.getElementById("statusDonut"), {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderColor:"#FFFFFF", borderWidth:2 }] },
    options: {
      responsive:true, maintainAspectRatio:false, cutout:"68%",
      plugins: { legend:{display:false}, tooltip:{callbacks:{label:(item)=> item.label+": "+item.raw+" job ("+(item.raw/DATA.total_jobs*100).toFixed(0)+"%)"}} }
    }
  });
  document.getElementById("statusLegend").innerHTML = labels.map(k=>
    `<span class="legend-item"><span class="swatch" style="background:${DATA.status_colors[k]}"></span>${k} — ${sc[k]}</span>`
  ).join("");
}
statusDonutRender();

let catBarChart = null;
function catBarRender(){
  const cc = DATA.cat_counts;
  const entries = Object.entries(cc).sort((a,b)=>b[1]-a[1]);
  if(catBarChart) catBarChart.destroy();
  catBarChart = new Chart(document.getElementById("catBar"), {
    type: "bar",
    data: {
      labels: entries.map(e=>e[0]),
      datasets: [{ data: entries.map(e=>e[1]), backgroundColor: entries.map(e=>DATA.cat_colors[e[0]]||"#8FA0B3"), borderRadius:4 }]
    },
    options: {
      indexAxis:"y", responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:(item)=>item.raw+" job order"}}},
      scales:{
        x:{ticks:{color:"#54637A",font:{family:"IBM Plex Mono",size:10}},grid:{color:"#E1E8F0"},beginAtZero:true},
        y:{ticks:{color:"#122240",font:{family:"Space Grotesk",size:11}},grid:{display:false}}
      }
    }
  });
}
catBarRender();

let monthBarChart = null;
function monthBarRender(){
  const entries = Object.entries(DATA.monthly_totals).sort();
  const labels = entries.map(([k])=>{ const [y,m]=k.split("-"); return MONTHS_SHORT[+m]+" "+y; });
  if(monthBarChart) monthBarChart.destroy();
  monthBarChart = new Chart(document.getElementById("monthBar"), {
    type:"bar",
    data:{ labels, datasets:[{ data: entries.map(e=>e[1]), backgroundColor:"#F5A623", borderRadius:5, maxBarThickness:46 }] },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:(item)=>item.raw+" man-days"}}},
      scales:{
        x:{ticks:{color:"#54637A",font:{family:"IBM Plex Mono",size:10}},grid:{display:false}},
        y:{ticks:{color:"#54637A",font:{family:"IBM Plex Mono",size:10}},grid:{color:"#E1E8F0"},beginAtZero:true}
      }
    }
  });
}
monthBarRender();

let tadBarChart = null;
function tadBarRender(){
  const order = ["1-2 orang","3-6 orang","7-10 orang","11-14 orang","15+ orang","Tidak diketahui"];
  const tb = DATA.tad_buckets;
  const entries = order.filter(k=>tb[k]).map(k=>[k,tb[k]]);
  if(tadBarChart) tadBarChart.destroy();
  tadBarChart = new Chart(document.getElementById("tadBar"), {
    type:"bar",
    data:{ labels: entries.map(e=>e[0]), datasets:[{ data: entries.map(e=>e[1]), backgroundColor:"#8B7FD6", borderRadius:5, maxBarThickness:46 }] },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:(item)=>item.raw+" job order"}}},
      scales:{
        x:{ticks:{color:"#54637A",font:{family:"IBM Plex Mono",size:9.5}},grid:{display:false}},
        y:{ticks:{color:"#54637A",font:{family:"IBM Plex Mono",size:10}},grid:{color:"#E1E8F0"},beginAtZero:true}
      }
    }
  });
}
tadBarRender();

function topTableRender(){
  document.getElementById("topBody").innerHTML = DATA.top_products.map(p=>{
    const period = p.start && p.end ? `${p.start} &rarr; ${p.end}` : "-";
    const pctDisp = (p.pct===null||p.pct===undefined) ? "-" : p.pct+"%";
    return `<tr>
      <td>${p.desc}</td>
      <td><span class="cat-pill">${p.cat}</span></td>
      <td>${statusBadge(p.status)}</td>
      <td>${p.mandays}</td>
      <td class="mono" style="font-size:10.5px;">${period}</td>
      <td><div class="bar-cell"><div class="bar-track"><div class="bar-fill" style="width:${p.pct||0}%"></div></div><span>${pctDisp}</span></div></td>
    </tr>`;
  }).join("");
}
topTableRender();

// -------- shared: regenerate a product's day-by-day schedule from start/finish + flat MP --------
// mp given here is treated as a full-day headcount: fills Pagi+Siang plan&actual (Lembur left at 0)
function regenerateProductSchedule(desc, newStart, newEnd, mp, includeWeekend){
  let cp = DATA.calendar_products.find(c=>c.desc===desc);
  if(!cp){
    const src = DATA.all_products.find(a=>a.desc===desc) || {};
    cp = { desc, cat: src.cat || "Lainnya", status: src.status || "OPEN", days:{}, start:null, end:null };
    DATA.calendar_products.push(cp);
  }
  const newDays = {};
  let cur = parseDate(newStart);
  const endD = parseDate(newEnd);
  while(cur <= endD){
    if(includeWeekend || !isWeekend(cur)) newDays[fmt(cur)] = migrateFlatValueToSession(mp);
    cur.setDate(cur.getDate()+1);
  }
  cp.days = newDays;
  cp.start = newStart; cp.end = newEnd;
  recomputeFromCalendar();
}

const CAT_OPTIONS = ["Seat Cover","Curtain","Fly Kit","Engine & Component Cover","Attendant Cover","Cargo","Leather","Lainnya"];

function renderAllTable(){
  const q = document.getElementById("searchBox").value.toLowerCase();
  const st = document.getElementById("statusFilter").value;
  const rows = DATA.all_products.map((p,idx)=>({p,idx})).filter(({p})=>{
    if(st && p.status !== st) return false;
    if(q && !p.desc.toLowerCase().includes(q)) return false;
    return true;
  });
  document.getElementById("allBody").innerHTML = rows.map(({p,idx})=>`
    <tr>
      <td><button type="button" class="row-del-btn" data-idx="${idx}" title="Hapus job order">&times;</button></td>
      <td><input type="text" class="desc-input" data-idx="${idx}" value="${(p.desc??"").replace(/"/g,'&quot;')}" placeholder="Nama job order..."></td>
      <td>
        <select class="cat-select" data-idx="${idx}">
          ${CAT_OPTIONS.map(c=>`<option value="${c}" ${c===p.cat?"selected":""}>${c}</option>`).join("")}
        </select>
      </td>
      <td>${statusSelectHTML(p.status, idx)}</td>
      <td><input type="number" class="tad-input" data-idx="${idx}" value="${p.tad ?? ""}" min="0" placeholder="-"></td>
      <td><input type="date" class="target-date-input plan-start-input" data-idx="${idx}" value="${p.start ?? ""}"></td>
      <td><input type="date" class="target-date-input plan-finish-input" data-idx="${idx}" value="${p.end ?? ""}"></td>
      <td>${targetCellHTML(p.target, idx)}</td>
      <td><input type="text" class="remarks-input" data-idx="${idx}" value="${(p.remarks ?? "").replace(/"/g,'&quot;')}" placeholder="Tambah catatan..."></td>
    </tr>`).join("");

  document.querySelectorAll(".status-select").forEach(sel=>{
    sel.addEventListener("change", (e)=>{
      const idx = +e.target.dataset.idx;
      const newStatus = e.target.value;
      const desc = DATA.all_products[idx].desc;
      DATA.all_products[idx].status = newStatus;
      DATA.top_products.forEach(tp=>{ if(tp.desc === desc) tp.status = newStatus; });
      DATA.calendar_products.forEach(cp=>{ if(cp.desc === desc) cp.status = newStatus; });
      const c = DATA.status_colors[newStatus] || "#8FA0B3";
      e.target.style.backgroundColor = c+"22"; e.target.style.color = c; e.target.style.borderColor = c+"55";
      recomputeDistribusi();
      topTableRender();
      buildCalendar();
    });
  });

  document.querySelectorAll(".desc-input").forEach(inp=>{
    inp.addEventListener("change", (e)=>{
      const idx = +e.target.dataset.idx;
      const oldDesc = DATA.all_products[idx].desc;
      const newDesc = e.target.value.trim() || "Job order baru";
      DATA.all_products[idx].desc = newDesc;
      DATA.top_products.forEach(tp=>{ if(tp.desc === oldDesc) tp.desc = newDesc; });
      DATA.calendar_products.forEach(cp=>{ if(cp.desc === oldDesc) cp.desc = newDesc; });
      topTableRender();
      buildCalendar();
    });
  });

  document.querySelectorAll(".cat-select").forEach(sel=>{
    sel.addEventListener("change", (e)=>{
      const idx = +e.target.dataset.idx;
      const desc = DATA.all_products[idx].desc;
      DATA.all_products[idx].cat = e.target.value;
      DATA.top_products.forEach(tp=>{ if(tp.desc === desc) tp.cat = e.target.value; });
      DATA.calendar_products.forEach(cp=>{ if(cp.desc === desc) cp.cat = e.target.value; });
      recomputeDistribusi();
      topTableRender();
      recomputeFromCalendar();
      buildCalendar();
    });
  });

  document.querySelectorAll(".tad-input").forEach(inp=>{
    inp.addEventListener("change", (e)=>{
      const idx = +e.target.dataset.idx;
      const v = e.target.value === "" ? null : Number(e.target.value);
      DATA.all_products[idx].tad = v;
    });
  });

  document.querySelectorAll(".target-date-input:not(.plan-start-input):not(.plan-finish-input)").forEach(inp=>{
    inp.addEventListener("change", (e)=>{
      const idx = +e.target.dataset.idx;
      const iso = e.target.value;
      if(iso){
        DATA.all_products[idx].target = formatISOForDisplay(iso);
      }
      renderAllTable();
    });
  });

  document.querySelectorAll(".plan-start-input, .plan-finish-input").forEach(inp=>{
    inp.addEventListener("change", (e)=>{
      const idx = +e.target.dataset.idx;
      const row = e.target.closest("tr");
      const startVal = row.querySelector(".plan-start-input").value;
      const finishVal = row.querySelector(".plan-finish-input").value;
      if(!startVal || !finishVal) return;
      if(startVal > finishVal){ alert("Tanggal mulai harus sebelum atau sama dengan tanggal selesai."); return; }
      const desc = DATA.all_products[idx].desc;
      const mp = DATA.all_products[idx].tad || 1;
      regenerateProductSchedule(desc, startVal, finishVal, mp, false);
      renderAllTable();
    });
  });

  document.querySelectorAll(".tbd-btn").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      const idx = +e.target.dataset.idx;
      const nowTBD = !(DATA.all_products[idx].target && DATA.all_products[idx].target.trim().toUpperCase()==="TBD");
      DATA.all_products[idx].target = nowTBD ? "TBD" : "";
      renderAllTable();
    });
  });

  document.querySelectorAll(".remarks-input").forEach(inp=>{
    inp.addEventListener("change", (e)=>{
      const idx = +e.target.dataset.idx;
      DATA.all_products[idx].remarks = e.target.value;
    });
  });

  document.querySelectorAll(".row-del-btn").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      if(!requireLogin()) return;
      const idx = +e.target.dataset.idx;
      const desc = DATA.all_products[idx].desc;
      if(!confirm(`Hapus job order "${desc}"?`)) return;
      DATA.all_products.splice(idx,1);
      DATA.top_products = DATA.top_products.filter(tp=>tp.desc !== desc);
      DATA.calendar_products = DATA.calendar_products.filter(cp=>cp.desc !== desc);
      recomputeDistribusi();
      topTableRender();
      buildCalendar();
      renderAllTable();
    });
  });

  // hanya akun login yang boleh mengubah data — kunci semua kontrol edit di tabel ini bila belum login
  if(typeof isLoggedIn === "function" && !isLoggedIn()){
    document.querySelectorAll("#allBody input, #allBody select, #allBody button").forEach(el=> el.disabled = true);
  }
}
document.getElementById("searchBox").addEventListener("input", renderAllTable);
document.getElementById("statusFilter").addEventListener("change", renderAllTable);
document.getElementById("addJobBtn").addEventListener("click", ()=>{
  if(!requireLogin()) return;
  DATA.all_products.push({
    desc: "Job order baru", cat: "Lainnya", status: "OPEN", tad: null,
    target: "TBD", remarks: "", pct: 0, mandays: 0, start: null, end: null
  });
  recomputeDistribusi();
  document.getElementById("searchBox").value = "";
  document.getElementById("statusFilter").value = "";
  renderAllTable();
  document.getElementById("allBody").lastElementChild?.scrollIntoView({behavior:"smooth", block:"center"});
});
renderAllTable();

document.getElementById("downloadStatusBtn").addEventListener("click", ()=>{
  const header = "Job Order,Kategori,Status,Manpower per hari,Target,Catatan\n";
  const body = DATA.all_products.map(p=>{
    const esc = (v)=> '"'+(v==null?"":String(v)).replace(/"/g,'""')+'"';
    return [esc(p.desc), esc(p.cat), esc(p.status), esc(p.tad), esc(p.target), esc(p.remarks)].join(",");
  }).join("\n");
  const blob = new Blob([header+body], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "status_job_order_terbaru.csv"; a.click();
  URL.revokeObjectURL(url);
});

function recomputeDistribusi(){
  const sc = {};
  const cc = {};
  DATA.all_products.forEach(p=>{
    sc[p.status] = (sc[p.status]||0)+1;
    cc[p.cat] = (cc[p.cat]||0)+1;
  });
  DATA.status_counts = sc;
  DATA.cat_counts = cc;
  DATA.total_jobs = DATA.all_products.length;
  distStatsRender();
  statusDonutRender();
  catBarRender();
}

// ================= KALENDER =================
function calStatsRender(){
  const scheduled = DATA.calendar_products;
  const totalDays = DATA.daily_totals.length;
  let peak = {total:-1};
  DATA.daily_totals.forEach(d=>{ if(d.total>peak.total) peak = d; });
  const stats = [
    {label:"Job terjadwal", value: scheduled.length, sub:"dengan tanggal harian", color:"var(--cyan)"},
    {label:"Rentang", value: totalDays+" hari", sub: DATA.date_min+" s/d "+DATA.date_max, color:"var(--amber)"},
    {label:"Puncak manpower", value: peak.total+" org", sub: peak.date||"-", color:"var(--danger)"},
    {label:"Total man-days", value: DATA.total_mandays_scheduled.toLocaleString("id-ID"), sub:"periode terjadwal", color:"var(--green)"},
  ];
  document.getElementById("cal-stats").innerHTML = stats.map(s=>`
    <div class="stat-card" style="--accent-color:${s.color}">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-sub">${s.sub}</div>
    </div>`).join("");
}
calStatsRender();

// -------- minimize/perkecil ringkasan stat-row (preferensi tampilan, tersimpan otomatis) --------
const CAL_STATS_MIN_KEY = "gmfCalStatsMinimized_v1";
function applyCalStatsMinState(){
  const minimized = localStorage.getItem(CAL_STATS_MIN_KEY) === "1";
  const row = document.getElementById("cal-stats");
  const btn = document.getElementById("calStatsMinimizeBtn");
  if(!row || !btn) return;
  row.classList.toggle("minimized", minimized);
  btn.innerHTML = minimized ? "&#8853; Perbesar ringkasan" : "&#8722; Perkecil ringkasan";
}
document.getElementById("calStatsMinimizeBtn")?.addEventListener("click", ()=>{
  const minimized = localStorage.getItem(CAL_STATS_MIN_KEY) === "1";
  try{ localStorage.setItem(CAL_STATS_MIN_KEY, minimized ? "0" : "1"); }catch(e){}
  applyCalStatsMinState();
});
applyCalStatsMinState();

// -------- layar penuh (fullscreen) untuk panel Timeline — memudahkan manajemen memantau job order berjalan --------
function toggleCalFullscreen(){
  const panel = document.getElementById("calTimelinePanel");
  if(!panel) return;
  if(!document.fullscreenElement){
    (panel.requestFullscreen ? panel.requestFullscreen() : Promise.reject()).catch(()=>{});
  } else {
    document.exitFullscreen?.();
  }
}
document.getElementById("calFullscreenBtn")?.addEventListener("click", toggleCalFullscreen);
document.addEventListener("fullscreenchange", ()=>{
  const panel = document.getElementById("calTimelinePanel");
  const btn = document.getElementById("calFullscreenBtn");
  const isFull = document.fullscreenElement === panel;
  if(panel) panel.classList.toggle("is-fullscreen-panel", isFull);
  if(btn) btn.innerHTML = isFull ? "&#10005; Keluar layar penuh" : "&#9974; Layar penuh";
  stickyizeCalHeader();
});

(function legend(){
  const colors = DATA.status_colors;
  document.getElementById("stageLegend").innerHTML = Object.keys(colors).map(k=>`
    <span class="legend-item"><span class="swatch" style="background:${colors[k]}"></span>${k}</span>`
  ).join("")
  + `<span class="legend-item"><span class="swatch" style="background:var(--danger);opacity:.55"></span>Akhir pekan</span>`
  + `<span class="legend-item"><span class="swatch" style="background:#FF3B3B;box-shadow:0 0 4px #FF3B3B"></span>Lembur (sesi 16:30–20:30)</span>`
  + `<span class="legend-item">▔ Plan (atas, transparan) / ▁ Actual (bawah, solid) — klik sel untuk edit &amp; atur sesi kerja</span>`;
})();

let __calMonthSpans = null;
let __calMonthIdx = 0;

// -------- filter job order (view preference, tidak perlu login — tersimpan otomatis) --------
const TIMELINE_FILTER_KEY = "gmfTimelineHiddenJobOrders_v1";
let __timelineHiddenDescs = new Set();
(function loadTimelineFilter(){
  try{
    const raw = localStorage.getItem(TIMELINE_FILTER_KEY);
    if(raw) __timelineHiddenDescs = new Set(JSON.parse(raw));
  }catch(e){ __timelineHiddenDescs = new Set(); }
})();
function saveTimelineFilter(){
  try{ localStorage.setItem(TIMELINE_FILTER_KEY, JSON.stringify([...__timelineHiddenDescs])); }catch(e){}
}
function getVisibleOrderedProducts(){
  return DATA.calendar_products.filter(p=> !__timelineHiddenDescs.has(p.desc));
}
function updateTimelineFilterNote(){
  const note = document.getElementById("timelineFilterNote");
  if(!note) return;
  const total = DATA.calendar_products.length;
  const hidden = __timelineHiddenDescs.size;
  const btn = document.getElementById("filterJobOrderBtn");
  if(hidden>0){
    note.textContent = `Menampilkan ${total-hidden} dari ${total} job order pada Timeline (${hidden} disembunyikan lewat filter).`;
    if(btn) btn.innerHTML = `&#128269; Filter job order (${total-hidden}/${total})`;
  } else {
    note.textContent = "";
    if(btn) btn.innerHTML = `&#128269; Filter job order`;
  }
}

function openTimelineFilterModal(){
  closeCellEditor();
  const backdrop = document.createElement("div");
  backdrop.id = "cellEditorBackdrop";
  backdrop.className = "cell-editor-backdrop";
  const items = DATA.calendar_products.map((p,i)=>({p,i}));
  const workingHidden = new Set(__timelineHiddenDescs); // draft state for this modal session
  const renderList = (filterText)=>{
    const q = (filterText||"").trim().toLowerCase();
    return items
      .filter(({p})=> !q || p.desc.toLowerCase().includes(q) || (p.cat||"").toLowerCase().includes(q))
      .map(({p})=>{
        const checked = !workingHidden.has(p.desc) ? "checked" : "";
        return `<label class="filter-item"><input type="checkbox" data-desc="${p.desc.replace(/"/g,'&quot;')}" ${checked}><span class="fi-name">${p.desc}</span><span class="fi-cat">${p.cat||""}</span></label>`;
      }).join("");
  };
  backdrop.innerHTML = `
    <div class="cell-editor-pop" style="max-width:460px;">
      <div class="cep-title">Filter job order — Timeline</div>
      <div class="cep-sub">Pilih job order yang ingin ditampilkan pada Timeline Produksi. Pengaturan ini tersimpan otomatis di browser ini.</div>
      <div class="filter-toolbar">
        <input type="text" id="filterSearchInput" placeholder="Cari job order...">
        <button type="button" class="btn" id="filterSelectAll">Pilih semua</button>
        <button type="button" class="btn" id="filterClearAll">Kosongkan</button>
      </div>
      <div class="filter-list" id="filterListWrap">${renderList("")}</div>
      <p class="filter-count-note" id="filterCountNote"></p>
      <div class="cep-actions" style="margin-top:14px;">
        <button type="button" class="btn" id="filterCancel">Batal</button>
        <button type="button" class="btn cep-save" id="filterApply">Terapkan</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", (ev)=>{ if(ev.target===backdrop) closeCellEditor(); });

  const listWrap = document.getElementById("filterListWrap");
  const countNote = document.getElementById("filterCountNote");
  const updateCount = ()=>{
    const total = items.length;
    const checkedNow = total - workingHidden.size;
    countNote.textContent = `${checkedNow} dari ${total} job order dipilih untuk ditampilkan.`;
  };
  updateCount();
  listWrap.addEventListener("change", (e)=>{
    const cb = e.target;
    if(cb && cb.matches("input[type=checkbox]")){
      if(cb.checked) workingHidden.delete(cb.dataset.desc);
      else workingHidden.add(cb.dataset.desc);
    }
    updateCount();
  });

  document.getElementById("filterSearchInput").addEventListener("input", (e)=>{
    listWrap.innerHTML = renderList(e.target.value);
  });
  document.getElementById("filterSelectAll").onclick = ()=>{
    items.forEach(({p})=> workingHidden.delete(p.desc));
    listWrap.innerHTML = renderList(document.getElementById("filterSearchInput").value);
    updateCount();
  };
  document.getElementById("filterClearAll").onclick = ()=>{
    items.forEach(({p})=> workingHidden.add(p.desc));
    listWrap.innerHTML = renderList(document.getElementById("filterSearchInput").value);
    updateCount();
  };
  document.getElementById("filterCancel").onclick = closeCellEditor;
  document.getElementById("filterApply").onclick = ()=>{
    __timelineHiddenDescs = new Set(workingHidden);
    saveTimelineFilter();
    updateTimelineFilterNote();
    renderCalendarMonth();
    closeCellEditor();
  };
}

// -------- reorder job order priority in Timeline (swaps position in DATA.calendar_products) --------
function moveTimelineProduct(desc, direction){
  if(!requireLogin()) return;
  const arr = DATA.calendar_products;
  const visible = getVisibleOrderedProducts();
  const visIdx = visible.findIndex(p=>p.desc===desc);
  if(visIdx<0) return;
  const targetVisIdx = visIdx + direction;
  if(targetVisIdx<0 || targetVisIdx>=visible.length) return;
  const realIdxA = arr.findIndex(p=>p.desc===desc);
  const realIdxB = arr.findIndex(p=>p.desc===visible[targetVisIdx].desc);
  if(realIdxA<0 || realIdxB<0) return;
  const tmp = arr[realIdxA];
  arr[realIdxA] = arr[realIdxB];
  arr[realIdxB] = tmp;
  renderCalendarMonth();
}
const __calOvertime = {}; // legacy, unused after session-based rewrite (kept to avoid ref errors)

// -------- work-hour rules: Pagi / Siang / Lembur, tiap sesi punya Plan & Aktual sendiri --------
const SESSION_KEYS = ["pagi","siang","lembur"];
const SHIFT_OPTIONS = {
  pagi:   { label: "Pagi",   hours: 4.0, overtime:false },
  siang:  { label: "Siang",  hours: 3.5, overtime:false },
  lembur: { label: "Lembur", hours: 3.0, overtime:true  },
};
function shiftHoursFor(session){ return (SHIFT_OPTIONS[session] || SHIFT_OPTIONS.pagi).hours; }
function isOvertimeSession(session){ return !!(SHIFT_OPTIONS[session] || SHIFT_OPTIONS.pagi).overtime; }

function timeToDecimal(hhmm){ const [h,m] = hhmm.split(":").map(Number); return h + (m||0)/60; }
function decimalToTime(dec){
  const h = Math.floor(dec); const m = Math.round((dec-h)*60);
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
}
const WORK_HOUR_SETTINGS = {
  jamMasuk: "07:30", istirahatMulai: "11:30", istirahatSelesai: "13:00", jamPulang: "16:30",
  lemburMulai: "16:30", lemburSelesai: "20:30", istirahatLemburJam: 1,
  maksOrangPerSesi: 14,
};
function recalcShiftOptionsFromSettings(){
  const s = WORK_HOUR_SETTINGS;
  const pagiHours = Math.max(0, timeToDecimal(s.istirahatMulai) - timeToDecimal(s.jamMasuk));
  const siangHours = Math.max(0, timeToDecimal(s.jamPulang) - timeToDecimal(s.istirahatSelesai));
  const lemburHours = Math.max(0, timeToDecimal(s.lemburSelesai) - timeToDecimal(s.lemburMulai) - (Number(s.istirahatLemburJam)||0));
  SHIFT_OPTIONS.pagi.hours = Math.round(pagiHours*10)/10;
  SHIFT_OPTIONS.pagi.label = `Pagi (${s.jamMasuk}–${s.istirahatMulai})`;
  SHIFT_OPTIONS.siang.hours = Math.round(siangHours*10)/10;
  SHIFT_OPTIONS.siang.label = `Siang (${s.istirahatSelesai}–${s.jamPulang})`;
  SHIFT_OPTIONS.lembur.hours = Math.round(lemburHours*10)/10;
  SHIFT_OPTIONS.lembur.label = `Lembur (${s.lemburMulai}–${s.lemburSelesai})`;
}
recalcShiftOptionsFromSettings();
function fullDayHours(){ return SHIFT_OPTIONS.pagi.hours + SHIFT_OPTIONS.siang.hours; }

// -------- per-cell session data helpers --------
// each day cell is stored as: { pagi:{plan,actual}, siang:{plan,actual}, lembur:{plan,actual} }
function emptySessionDay(){
  return { pagi:{plan:0,actual:0}, siang:{plan:0,actual:0}, lembur:{plan:0,actual:0,jam:null} };
}
function migrateFlatValueToSession(v){
  // legacy flat number (from Excel import) = full-day headcount, assumed executed as planned
  const d = emptySessionDay();
  d.pagi.plan = v; d.pagi.actual = v;
  d.siang.plan = v; d.siang.actual = v;
  return d;
}
function cellIsEmpty(dayObj){
  if(!dayObj) return true;
  return SESSION_KEYS.every(k=> !dayObj[k] || (dayObj[k].plan===0 && dayObj[k].actual===0));
}
function cellHeadcount(dayObj, field){
  if(!dayObj) return 0;
  return Math.max(dayObj.pagi[field]||0, dayObj.siang[field]||0, dayObj.lembur[field]||0);
}
function cellHours(dayObj, field){
  if(!dayObj) return 0;
  return SESSION_KEYS.reduce((sum,k)=>{
    const hrs = (k==="lembur" && dayObj.lembur && dayObj.lembur.jam!=null) ? dayObj.lembur.jam : shiftHoursFor(k);
    return sum + (dayObj[k][field]||0)*hrs;
  }, 0);
}
function cellHasOvertime(dayObj){
  return !!dayObj && (dayObj.lembur.plan>0 || dayObj.lembur.actual>0);
}

// -------- work-hour settings modal --------
const DEFAULT_WORK_HOUR_SETTINGS = {
  jamMasuk: "07:30", istirahatMulai: "11:30", istirahatSelesai: "13:00", jamPulang: "16:30",
  lemburMulai: "16:30", lemburSelesai: "20:30", istirahatLemburJam: 1,
  maksOrangPerSesi: 14,
};
function openWorkHourSettings(){
  if(!requireLogin()) return;
  closeCellEditor();
  const s = WORK_HOUR_SETTINGS;
  const backdrop = document.createElement("div");
  backdrop.id = "cellEditorBackdrop";
  backdrop.className = "cell-editor-backdrop";
  backdrop.innerHTML = `
    <div class="cell-editor-pop" style="max-width:360px;">
      <div class="cep-title">Jam kerja</div>
      <div class="cep-sub">Berlaku untuk semua job order</div>

      <div class="cep-section-label">Shift normal</div>
      <label class="cep-label">Masuk</label>
      <input type="time" id="whJamMasuk" class="target-date-input" style="width:100%;margin-bottom:12px;" value="${s.jamMasuk}">
      <label class="cep-label">Istirahat mulai</label>
      <input type="time" id="whIstMulai" class="target-date-input" style="width:100%;margin-bottom:12px;" value="${s.istirahatMulai}">
      <label class="cep-label">Istirahat selesai</label>
      <input type="time" id="whIstSelesai" class="target-date-input" style="width:100%;margin-bottom:12px;" value="${s.istirahatSelesai}">
      <label class="cep-label">Pulang</label>
      <input type="time" id="whJamPulang" class="target-date-input" style="width:100%;margin-bottom:16px;" value="${s.jamPulang}">

      <div class="cep-section-label">Lembur</div>
      <label class="cep-label">Mulai</label>
      <input type="time" id="whLemburMulai" class="target-date-input" style="width:100%;margin-bottom:12px;" value="${s.lemburMulai}">
      <label class="cep-label">Selesai</label>
      <input type="time" id="whLemburSelesai" class="target-date-input" style="width:100%;margin-bottom:12px;" value="${s.lemburSelesai}">
      <label class="cep-label">Istirahat (jam)</label>
      <div class="cep-stepper" style="margin-bottom:16px;">
        <button type="button" id="whIstLemburMinus">&minus;</button>
        <input type="number" id="whIstLemburJam" min="0" step="0.5" value="${s.istirahatLemburJam}" inputmode="decimal">
        <button type="button" id="whIstLemburPlus">&plus;</button>
      </div>

      <div class="cep-section-label">Kapasitas</div>
      <label class="cep-label">Maks orang / sesi</label>
      <div class="cep-stepper" style="margin-bottom:16px;">
        <button type="button" id="whMaksMinus">&minus;</button>
        <input type="number" id="whMaksOrang" min="1" value="${s.maksOrangPerSesi}" inputmode="numeric">
        <button type="button" id="whMaksPlus">&plus;</button>
      </div>

      <div id="whPreview" class="cep-sub" style="background:var(--bg-panel-alt);border-radius:8px;padding:10px;margin-bottom:14px;"></div>

      <div class="cep-actions">
        <button type="button" class="btn" id="whReset">Reset</button>
        <button type="button" class="btn cep-save" id="whSave">Selesai</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", (ev)=>{ if(ev.target===backdrop) closeCellEditor(); });

  const lemburJamInput = document.getElementById("whIstLemburJam");
  document.getElementById("whIstLemburMinus").onclick = ()=>{ lemburJamInput.value = Math.max(0,(Number(lemburJamInput.value)||0)-0.5); updatePreview(); };
  document.getElementById("whIstLemburPlus").onclick = ()=>{ lemburJamInput.value = (Number(lemburJamInput.value)||0)+0.5; updatePreview(); };
  const maksInput = document.getElementById("whMaksOrang");
  document.getElementById("whMaksMinus").onclick = ()=>{ maksInput.value = Math.max(1,(Number(maksInput.value)||1)-1); };
  document.getElementById("whMaksPlus").onclick = ()=>{ maksInput.value = (Number(maksInput.value)||1)+1; };

  function readForm(){
    return {
      jamMasuk: document.getElementById("whJamMasuk").value || s.jamMasuk,
      istirahatMulai: document.getElementById("whIstMulai").value || s.istirahatMulai,
      istirahatSelesai: document.getElementById("whIstSelesai").value || s.istirahatSelesai,
      jamPulang: document.getElementById("whJamPulang").value || s.jamPulang,
      lemburMulai: document.getElementById("whLemburMulai").value || s.lemburMulai,
      lemburSelesai: document.getElementById("whLemburSelesai").value || s.lemburSelesai,
      istirahatLemburJam: Number(lemburJamInput.value)||0,
      maksOrangPerSesi: Math.max(1, Number(maksInput.value)||1),
    };
  }
  function updatePreview(){
    const tmp = readForm();
    const pagi = Math.max(0, timeToDecimal(tmp.istirahatMulai)-timeToDecimal(tmp.jamMasuk));
    const siang = Math.max(0, timeToDecimal(tmp.jamPulang)-timeToDecimal(tmp.istirahatSelesai));
    const lembur = Math.max(0, timeToDecimal(tmp.lemburSelesai)-timeToDecimal(tmp.lemburMulai)-tmp.istirahatLemburJam);
    document.getElementById("whPreview").innerHTML =
      `Pagi <strong style="color:var(--text-primary)">${pagi.toFixed(1)} jam</strong> &middot; Siang <strong style="color:var(--text-primary)">${siang.toFixed(1)} jam</strong> &middot; Lembur <strong style="color:var(--text-primary)">${lembur.toFixed(1)} jam</strong><br>`+
      `1 orang sehari penuh = <strong style="color:var(--text-primary)">${(pagi+siang).toFixed(1)} jam</strong>, dengan lembur = <strong style="color:var(--text-primary)">${(pagi+siang+lembur).toFixed(1)} jam</strong>`;
  }
  ["whJamMasuk","whIstMulai","whIstSelesai","whJamPulang","whLemburMulai","whLemburSelesai"].forEach(id=>{
    document.getElementById(id).addEventListener("input", updatePreview);
  });
  updatePreview();

  document.getElementById("whReset").onclick = ()=>{
    document.getElementById("whJamMasuk").value = DEFAULT_WORK_HOUR_SETTINGS.jamMasuk;
    document.getElementById("whIstMulai").value = DEFAULT_WORK_HOUR_SETTINGS.istirahatMulai;
    document.getElementById("whIstSelesai").value = DEFAULT_WORK_HOUR_SETTINGS.istirahatSelesai;
    document.getElementById("whJamPulang").value = DEFAULT_WORK_HOUR_SETTINGS.jamPulang;
    document.getElementById("whLemburMulai").value = DEFAULT_WORK_HOUR_SETTINGS.lemburMulai;
    document.getElementById("whLemburSelesai").value = DEFAULT_WORK_HOUR_SETTINGS.lemburSelesai;
    lemburJamInput.value = DEFAULT_WORK_HOUR_SETTINGS.istirahatLemburJam;
    maksInput.value = DEFAULT_WORK_HOUR_SETTINGS.maksOrangPerSesi;
    updatePreview();
  };
  document.getElementById("whSave").onclick = ()=>{
    Object.assign(s, readForm());
    recalcShiftOptionsFromSettings();
    closeCellEditor();
    if(__calMonthSpans) renderCalendarMonth();
    if(chartsDrawn.rekap) applyRange();
  };
}
document.getElementById("workHourSettingsBtn").addEventListener("click", openWorkHourSettings);

// -------- daftar bulan tetap Januari 2026 s/d Desember 2100 (tidak dibatasi oleh data yang ada) --------
const CAL_RANGE_START_YEAR = 2026;
const CAL_RANGE_END_YEAR = 2100;
let __calFixedMonthSpans = null;
function buildFixedMonthSpans(){
  if(__calFixedMonthSpans) return __calFixedMonthSpans;
  const monthSpans = [];
  for(let y=CAL_RANGE_START_YEAR; y<=CAL_RANGE_END_YEAR; y++){
    for(let mo=0; mo<12; mo++){
      const daysInMonth = new Date(y, mo+1, 0).getDate();
      const days = [];
      for(let d=1; d<=daysInMonth; d++) days.push(new Date(y, mo, d));
      monthSpans.push({key: y+"-"+mo, label: MONTHS_ID_FULL[mo+1]+" "+y, year:y, days});
    }
  }
  __calFixedMonthSpans = monthSpans;
  return monthSpans;
}
function populateMonthDropdown(monthSpans){
  const sel = document.getElementById("monthJump");
  let html = "";
  let curYear = null;
  monthSpans.forEach((m,i)=>{
    if(m.year !== curYear){
      if(curYear !== null) html += "</optgroup>";
      html += `<optgroup label="${m.year}">`;
      curYear = m.year;
    }
    html += `<option value="${i}">${m.label}</option>`;
  });
  html += "</optgroup>";
  sel.innerHTML = html;
}
function buildCalendar(){
  const isFirstBuild = (__calMonthSpans === null);
  const monthSpans = buildFixedMonthSpans();
  __calMonthSpans = monthSpans;

  if(isFirstBuild){
    populateMonthDropdown(monthSpans);
    // buka bulan berjalan (hari ini) jika tersedia, jika tidak pakai bulan job order paling awal, jika tidak ada data pakai Januari 2026
    let targetKey = null;
    if(DATA.today){ const td = parseDate(DATA.today); targetKey = td.getFullYear()+"-"+td.getMonth(); }
    else if(DATA.date_min){ const dm = parseDate(DATA.date_min); targetKey = dm.getFullYear()+"-"+dm.getMonth(); }
    const idx = targetKey!=null ? monthSpans.findIndex(m=>m.key===targetKey) : -1;
    __calMonthIdx = idx>=0 ? idx : 0;
  } else {
    if(__calMonthIdx >= monthSpans.length) __calMonthIdx = monthSpans.length - 1;
    if(__calMonthIdx < 0) __calMonthIdx = 0;
  }

  const sel = document.getElementById("monthJump");
  sel.value = __calMonthIdx;
  sel.onchange = (e)=>{ __calMonthIdx = +e.target.value; renderCalendarMonth(); };
  document.getElementById("monthPrev").onclick = ()=>{ if(__calMonthIdx>0){ __calMonthIdx--; renderCalendarMonth(); } };
  document.getElementById("monthNext").onclick = ()=>{ if(__calMonthIdx<monthSpans.length-1){ __calMonthIdx++; renderCalendarMonth(); } };

  setupCalSwipe();
  renderCalendarMonth();
}

function setupCalSwipe(){
  const el = document.getElementById("calScroll");
  if(el.__swipeBound) return;
  el.__swipeBound = true;
  let touchStartX = 0, touchStartScrollLeft = 0, dragging = false;
  el.addEventListener("touchstart", (e)=>{
    touchStartX = e.touches[0].clientX;
    touchStartScrollLeft = el.scrollLeft;
    dragging = true;
  }, {passive:true});
  el.addEventListener("touchend", (e)=>{
    if(!dragging) return;
    dragging = false;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const atLeftEdge = touchStartScrollLeft <= 4;
    const atRightEdge = touchStartScrollLeft >= el.scrollWidth - el.clientWidth - 4;
    if(deltaX > 70 && atLeftEdge && __calMonthIdx > 0){
      __calMonthIdx--; renderCalendarMonth();
    } else if(deltaX < -70 && atRightEdge && __calMonthIdx < __calMonthSpans.length - 1){
      __calMonthIdx++; renderCalendarMonth();
    }
  }, {passive:true});
}

function renderCalendarMonth(){
  const monthSpans = __calMonthSpans;
  const m = monthSpans[__calMonthIdx];
  const monthDays = m.days;
  const products = getVisibleOrderedProducts();
  const MONTH_BANDS = ["#3A5F8A","#5F5FA0","#8A5FA0","#A05F7E","#A0745F","#8A8A5F"];
  const bandColor = MONTH_BANDS[__calMonthIdx % MONTH_BANDS.length];

  let thead = "<thead><tr><th class='desc' rowspan='3'>Job order</th>";
  thead += `<th class="month" colspan="${monthDays.length}" style="background:linear-gradient(180deg,${bandColor},${bandColor}CC)">${m.label}</th>`;
  thead += "</tr><tr>";
  monthDays.forEach(dt=> thead += `<th class="${isWeekend(dt)?'weekend-h':''}">${dt.getDate()}</th>`);
  thead += "</tr><tr>";
  monthDays.forEach(dt=> thead += `<th class="${isWeekend(dt)?'weekend-h':''}" style="${isWeekend(dt)?'':'color:#5AC8FA'}">${WD_ID[dt.getDay()]}</th>`);
  thead += "</tr></thead>";

  let tbody = "<tbody>";
  products.forEach((p,orderNum)=>{
    const pi = DATA.calendar_products.indexOf(p); // real index into DATA.calendar_products (for editors)
    const color = DATA.status_colors[p.status] || "#8FA0B3";
    const isos = Object.keys(p.days);
    const totalOrgActual = isos.reduce((a,iso)=> a + cellHeadcount(p.days[iso],"actual"), 0);
    const totalHoursActual = isos.reduce((sum,iso)=> sum + cellHours(p.days[iso],"actual"), 0);
    const totalHoursPlan = isos.reduce((sum,iso)=> sum + cellHours(p.days[iso],"plan"), 0);
    const descEsc = p.desc.replace(/"/g,'&quot;');
    tbody += `<tr><td class="desc" style="--row-accent:${color}">
        <div class="desc-row-head">
          <span class="desc-order-num" title="Urutan prioritas ke-${orderNum+1}">${orderNum+1}</span>
          <div class="desc-name-wrap"><span>${p.desc}</span></div>
          <div class="desc-row-controls">
            <button type="button" class="reorder-btn" data-move="-1" data-desc="${descEsc}" title="Naikkan prioritas" ${orderNum===0?"disabled":""}>&#9650;</button>
            <button type="button" class="reorder-btn" data-move="1" data-desc="${descEsc}" title="Turunkan prioritas" ${orderNum===products.length-1?"disabled":""}>&#9660;</button>
          </div>
          <button type="button" class="desc-edit-btn" data-pidx="${pi}" title="Edit tanggal mulai/selesai &amp; MP">&#9998;</button>
        </div>
        <span class="cat-tag">${p.cat} &middot; ${p.status}</span>
        <span class="mp-calc-badge">&Sigma; ${totalOrgActual} org-hari</span>
        <span class="mp-calc-badge hours">&#9201; ${totalHoursActual.toLocaleString("id-ID",{maximumFractionDigits:1})} jam actual <span class="plan-hint">(plan ${totalHoursPlan.toLocaleString("id-ID",{maximumFractionDigits:1})} jam)</span></span>
      </td>`;
    monthDays.forEach(dt=>{
      const iso = fmt(dt);
      const weekend = isWeekend(dt);
      const dayObj = p.days[iso];
      const isOT = cellHasOvertime(dayObj);
      const isEmpty = cellIsEmpty(dayObj);
      let cls = "daycell editable-cell split-cell";
      if(isOT) cls += " overtime";
      if(isEmpty){
        cls += weekend ? " weekend-empty" : " empty-edit";
        tbody += `<td class="${cls}" data-pidx="${pi}" data-iso="${iso}" data-weekend="${weekend?1:0}" title="${p.desc} — ${iso} (klik untuk isi)"></td>`;
        return;
      }
      const orgPlan = cellHeadcount(dayObj,"plan");
      const orgActual = cellHeadcount(dayObj,"actual");
      const planHtml = orgPlan>0 ? `<div class="cell-half cell-plan" style="background:linear-gradient(145deg,${color}55,${color}33)">${orgPlan}</div>` : `<div class="cell-half cell-plan cell-empty-half"></div>`;
      const actualHtml = orgActual>0 ? `<div class="cell-half cell-actual" style="background:linear-gradient(145deg,${color},${color}CC)">${orgActual}</div>` : `<div class="cell-half cell-actual cell-empty-half"></div>`;
      const tip = `${p.desc} — ${iso} — Plan:${orgPlan||'-'} Actual:${orgActual||'-'}${isOT?' · LEMBUR':''} (klik untuk edit)`;
      tbody += `<td class="${cls}" data-pidx="${pi}" data-iso="${iso}" data-weekend="${weekend?1:0}" title="${tip}">${planHtml}${actualHtml}</td>`;
    });
    tbody += "</tr>";
  });
  tbody += "</tbody>";

  document.getElementById("calTable").innerHTML = thead + tbody;
  document.getElementById("monthJump").value = __calMonthIdx;
  document.getElementById("monthPrev").disabled = __calMonthIdx === 0;
  document.getElementById("monthNext").disabled = __calMonthIdx === __calMonthSpans.length - 1;

  document.querySelectorAll(".editable-cell").forEach(cell=>{
    cell.addEventListener("click", (e)=> openCellEditor(e.currentTarget));
  });
  document.querySelectorAll(".desc-edit-btn").forEach(btn=>{
    btn.addEventListener("click", (e)=>{ e.stopPropagation(); openScheduleEditor(+btn.dataset.pidx); });
  });
  document.querySelectorAll(".reorder-btn").forEach(btn=>{
    btn.addEventListener("click", (e)=>{ e.stopPropagation(); moveTimelineProduct(btn.dataset.desc, +btn.dataset.move); });
  });
  stickyizeCalHeader();
}

// -------- freeze (stick) the 3-row header — Bulan / Tanggal / Hari — while scrolling vertically --------
function stickyizeCalHeader(){
  const table = document.getElementById("calTable");
  if(!table) return;
  const rows = table.querySelectorAll("thead tr");
  if(!rows.length) return;
  let cumulative = 0;
  rows.forEach(row=>{
    const cells = Array.from(row.children);
    const measureCell = cells.find(c=> !c.classList.contains("desc")) || cells[0];
    const h = measureCell ? measureCell.getBoundingClientRect().height : 0;
    cells.forEach(c=>{
      c.style.top = c.classList.contains("desc") ? "0px" : cumulative + "px";
    });
    cumulative += h;
  });
}
window.addEventListener("resize", ()=>{
  clearTimeout(window.__calStickyResizeTO);
  window.__calStickyResizeTO = setTimeout(stickyizeCalHeader, 150);
});
window.addEventListener("load", ()=> setTimeout(stickyizeCalHeader, 60));
if(document.fonts && document.fonts.ready){ document.fonts.ready.then(()=> stickyizeCalHeader()); }

// -------- recompute the whole dashboard live from current calendar_products --------
function recomputeFromCalendar(){
  const scheduled = DATA.calendar_products.filter(p=> Object.keys(p.days||{}).length>0);
  let dateMin = null, dateMax = null;
  scheduled.forEach(p=>{
    const keys = Object.keys(p.days).filter(iso=>!cellIsEmpty(p.days[iso])).sort();
    if(keys.length){ p.start = keys[0]; p.end = keys[keys.length-1]; }
    Object.keys(p.days).forEach(k=>{
      if(!dateMin || k < dateMin) dateMin = k;
      if(!dateMax || k > dateMax) dateMax = k;
    });
  });

  const dailyTotals = [];
  const planDailyTotals = [];
  if(dateMin && dateMax){
    let cur = parseDate(dateMin);
    const endD = parseDate(dateMax);
    while(cur <= endD){
      const iso = fmt(cur);
      const total = scheduled.reduce((s,p)=> s + cellHeadcount(p.days[iso],"actual"), 0);
      const planTotal = scheduled.reduce((s,p)=> s + cellHeadcount(p.days[iso],"plan"), 0);
      dailyTotals.push({ date: iso, total, weekend: isWeekend(cur) });
      planDailyTotals.push({ date: iso, total: planTotal, weekend: isWeekend(cur) });
      cur.setDate(cur.getDate()+1);
    }
  }
  const monthlyTotals = {};
  dailyTotals.forEach(d=>{ const ym=d.date.slice(0,7); monthlyTotals[ym]=(monthlyTotals[ym]||0)+d.total; });

  const catDailyDates = dailyTotals.map(d=>d.date);
  const catDailySeries = {};
  scheduled.forEach(p=>{
    if(!catDailySeries[p.cat]) catDailySeries[p.cat] = new Array(dailyTotals.length).fill(0);
    dailyTotals.forEach((d,i)=>{ catDailySeries[p.cat][i] += cellHeadcount(p.days[d.date],"actual"); });
  });

  const today = new Date();
  scheduled.forEach(p=>{
    p.total_mandays = Object.keys(p.days).reduce((a,iso)=> a + cellHeadcount(p.days[iso],"actual"), 0);
  });
  const topProducts = [...scheduled].sort((a,b)=>b.total_mandays-a.total_mandays).slice(0,12).map(p=>({
    desc:p.desc, cat:p.cat, status:p.status, mandays:p.total_mandays, start:p.start, end:p.end,
    pct: pctComplete(p, today)
  }));

  // mirror mandays/start/end/pct back into all_products by matching description
  DATA.all_products.forEach(ap=>{
    const match = scheduled.find(p=>p.desc === ap.desc);
    if(match){ ap.mandays = match.total_mandays; ap.start = match.start; ap.end = match.end; ap.pct = pctComplete(match, today); }
  });

  DATA.date_min = dateMin;
  DATA.date_max = dateMax;
  DATA.daily_totals = dailyTotals;
  DATA.plan_daily_totals = planDailyTotals;
  DATA.monthly_totals = monthlyTotals;
  DATA.cat_daily_series = catDailySeries;
  DATA.cat_daily_dates = catDailyDates;
  DATA.top_products = topProducts;
  DATA.total_mandays_scheduled = scheduled.reduce((s,p)=>s+p.total_mandays,0);
  if(typeof refreshPlanMap === "function") refreshPlanMap();

  monthBarRender();
  headcountChartRender();
  topTableRender();
  calStatsRender();
  applyRange();
}

// -------- schedule editor: change start/finish date + flat MP, auto-shifts the timeline bar --------
function openScheduleEditor(pidx){
  if(!requireLogin()) return;
  closeCellEditor();
  const p = DATA.calendar_products[pidx];
  const keys = Object.keys(p.days).sort();
  const curStart = keys.length ? keys[0] : fmt(new Date());
  const curEnd = keys.length ? keys[keys.length-1] : fmt(new Date());
  const values = keys.map(k=>cellHeadcount(p.days[k],"plan")).filter(v=>v>0);
  const avgMP = values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length) : 1;

  const backdrop = document.createElement("div");
  backdrop.id = "cellEditorBackdrop";
  backdrop.className = "cell-editor-backdrop";
  backdrop.innerHTML = `
    <div class="cell-editor-pop" style="max-width:340px;">
      <div class="cep-title">${p.desc}</div>
      <div class="cep-sub">Atur ulang tanggal mulai/selesai — bar timeline &amp; semua grafik ikut update otomatis</div>
      <label class="cep-label">Tanggal mulai</label>
      <input type="date" id="schedStart" class="target-date-input" style="width:100%;margin-bottom:14px;" value="${curStart}">
      <label class="cep-label">Tanggal selesai</label>
      <input type="date" id="schedEnd" class="target-date-input" style="width:100%;margin-bottom:14px;" value="${curEnd}">
      <label class="cep-label">Manpower per hari (dipakai untuk semua hari kerja di rentang baru)</label>
      <div class="cep-stepper">
        <button type="button" id="schedMinus">&minus;</button>
        <input type="number" id="schedMP" min="0" value="${avgMP}" inputmode="numeric">
        <button type="button" id="schedPlus">&plus;</button>
      </div>
      <label class="cep-check-row"><input type="checkbox" id="schedIncludeWeekend"> Sertakan akhir pekan (Sab/Min) dalam rentang baru</label>
      <div class="cep-actions" style="margin-top:14px;">
        <button type="button" class="btn" id="schedCancel">Batal</button>
        <button type="button" class="btn cep-save" id="schedSave">Terapkan &amp; Sinkronkan</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", (ev)=>{ if(ev.target===backdrop) closeCellEditor(); });

  const mpInput = document.getElementById("schedMP");
  document.getElementById("schedMinus").onclick = ()=>{ mpInput.value = Math.max(0,(Number(mpInput.value)||0)-1); };
  document.getElementById("schedPlus").onclick = ()=>{ mpInput.value = (Number(mpInput.value)||0)+1; };
  document.getElementById("schedCancel").onclick = closeCellEditor;

  document.getElementById("schedSave").onclick = ()=>{
    const newStart = document.getElementById("schedStart").value;
    const newEnd = document.getElementById("schedEnd").value;
    const mp = Math.max(0, Number(mpInput.value)||0);
    const includeWeekend = document.getElementById("schedIncludeWeekend").checked;
    if(!newStart || !newEnd || newStart > newEnd){ alert("Tanggal mulai harus sebelum atau sama dengan tanggal selesai."); return; }

    regenerateProductSchedule(p.desc, newStart, newEnd, mp, includeWeekend);
    closeCellEditor();
    // jump calendar view to the month of the new start date
    if(__calMonthSpans){
      const targetKey = parseDate(newStart).getFullYear()+"-"+parseDate(newStart).getMonth();
      const idx = __calMonthSpans.findIndex(m=>m.key===targetKey);
      buildCalendar();
      if(idx>=0){ __calMonthIdx = idx; renderCalendarMonth(); }
    }
  };
}

// -------- inline cell editor modal --------
function closeCellEditor(){
  const existing = document.getElementById("cellEditorBackdrop");
  if(existing) existing.remove();
}
function openCellEditor(cell){
  if(!requireLogin()) return;
  closeCellEditor();
  const pi = +cell.dataset.pidx;
  const iso = cell.dataset.iso;
  const weekend = cell.dataset.weekend === "1";
  const p = DATA.calendar_products[pi];
  if(!p.days[iso] || cellIsEmpty(p.days[iso])) {
    if(!p.days[iso]) p.days[iso] = emptySessionDay();
  }
  const dayObj = p.days[iso];
  const hadValueBefore = !cellIsEmpty(dayObj);
  const dt = parseDate(iso);
  const wdLabel = WD_ID[dt.getDay()];

  function sessionRowHTML(key, label){
    const s = SHIFT_OPTIONS[key];
    return `
      <div class="cep-session-row">
        <div class="cep-session-label">
          <strong>${label}</strong>
          <span class="cep-session-time">${s.label.match(/\(([^)]+)\)/)?.[1] || ""} &middot; ${s.hours.toFixed(1)} jam</span>
        </div>
        <input type="number" id="cepPlan_${key}" class="cep-session-input" min="0" max="${WORK_HOUR_SETTINGS.maksOrangPerSesi}" value="${dayObj[key].plan||0}" inputmode="numeric">
        <input type="number" id="cepAct_${key}" class="cep-session-input" min="0" max="${WORK_HOUR_SETTINGS.maksOrangPerSesi}" value="${dayObj[key].actual||0}" inputmode="numeric">
      </div>`;
  }

  const lemburObj = dayObj.lembur || {plan:0,actual:0,jam:null};
  const lemburAktifAwal = (lemburObj.plan>0 || lemburObj.actual>0 || (lemburObj.jam!=null && lemburObj.jam>0));
  const lemburJamAwal = lemburObj.jam!=null ? lemburObj.jam : SHIFT_OPTIONS.lembur.hours;
  function lemburRowHTML(){
    return `
      <div class="cep-check-row" style="margin:14px 0 10px;">
        <input type="checkbox" id="cepLemburAktif" ${lemburAktifAwal?"checked":""}> Ada lembur hari ini
      </div>
      <div class="cep-session-row">
        <div class="cep-session-label">
          <strong>Lembur</strong>
          <span class="cep-session-time">jumlah orang</span>
        </div>
        <input type="number" id="cepPlan_lembur" class="cep-session-input" min="0" max="${WORK_HOUR_SETTINGS.maksOrangPerSesi}" value="${lemburObj.plan||0}" inputmode="numeric" ${lemburAktifAwal?"":"disabled"}>
        <input type="number" id="cepAct_lembur" class="cep-session-input" min="0" max="${WORK_HOUR_SETTINGS.maksOrangPerSesi}" value="${lemburObj.actual||0}" inputmode="numeric" ${lemburAktifAwal?"":"disabled"}>
      </div>
      <div style="margin-top:8px;">
        <label class="cep-label">Jam lembur hari ini (0 jika tidak lembur)</label>
        <input type="number" id="cepLemburJam" class="cep-session-input" style="width:100%;" min="0" step="0.5" value="${lemburAktifAwal?lemburJamAwal:0}" inputmode="decimal" ${lemburAktifAwal?"":"disabled"}>
      </div>`;
  }

  const backdrop = document.createElement("div");
  backdrop.id = "cellEditorBackdrop";
  backdrop.className = "cell-editor-backdrop";
  backdrop.innerHTML = `
    <div class="cell-editor-pop" id="cellEditorPopover" style="max-width:340px;">
      <div class="cep-title">${p.desc}</div>
      <div class="cep-sub">${iso} &middot; ${wdLabel}${weekend?" &middot; Akhir pekan":""}</div>

      <div class="cep-session-header">
        <span>Sesi kerja</span><span>Plan (org)</span><span>Aktual (org)</span>
      </div>
      ${sessionRowHTML("pagi","Pagi")}
      ${sessionRowHTML("siang","Siang")}
      ${lemburRowHTML()}

      <button type="button" class="cep-copy-btn" id="cepCopyPlan">Salin plan &rarr; aktual</button>

      <div class="cep-hours-hint" id="cepHoursHint" title="Klik untuk ubah jam kerja">
        &#9201; ${SHIFT_OPTIONS.pagi.label} &middot; ${SHIFT_OPTIONS.siang.label} &middot; ${SHIFT_OPTIONS.lembur.label}<br>
        <span class="cep-hint-action">klik untuk ubah jam kerja</span>
      </div>

      <div class="cep-summary" id="cepSummary"></div>

      <div class="cep-actions">
        ${hadValueBefore ? '<button type="button" class="btn cep-clear" id="cepClear">Kosongkan</button>' : ""}
        <button type="button" class="btn" id="cepCancel">Batal</button>
        <button type="button" class="btn cep-save" id="cepSave">Simpan</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", (ev)=>{ if(ev.target === backdrop) closeCellEditor(); });

  function readInputs(){
    const out = { pagi:{}, siang:{}, lembur:{} };
    ["pagi","siang"].forEach(k=>{
      out[k].plan = Math.max(0, Number(document.getElementById("cepPlan_"+k).value)||0);
      out[k].actual = Math.max(0, Number(document.getElementById("cepAct_"+k).value)||0);
    });
    const lemburAktif = document.getElementById("cepLemburAktif").checked;
    if(lemburAktif){
      out.lembur.plan = Math.max(0, Number(document.getElementById("cepPlan_lembur").value)||0);
      out.lembur.actual = Math.max(0, Number(document.getElementById("cepAct_lembur").value)||0);
      out.lembur.jam = Math.max(0, Number(document.getElementById("cepLemburJam").value)||0);
    } else {
      out.lembur.plan = 0; out.lembur.actual = 0; out.lembur.jam = 0;
    }
    return out;
  }
  function updateSummary(){
    const cur = readInputs();
    const orgPlan = Math.max(cur.pagi.plan, cur.siang.plan, cur.lembur.plan);
    const orgActual = Math.max(cur.pagi.actual, cur.siang.actual, cur.lembur.actual);
    const lemburJam = cur.lembur.jam!=null ? cur.lembur.jam : SHIFT_OPTIONS.lembur.hours;
    const normalPlanH = cur.pagi.plan*SHIFT_OPTIONS.pagi.hours + cur.siang.plan*SHIFT_OPTIONS.siang.hours;
    const lemburPlanH = cur.lembur.plan*lemburJam;
    const normalActH = cur.pagi.actual*SHIFT_OPTIONS.pagi.hours + cur.siang.actual*SHIFT_OPTIONS.siang.hours;
    const lemburActH = cur.lembur.actual*lemburJam;
    const totalPlanH = normalPlanH + lemburPlanH;
    const totalActH = normalActH + lemburActH;
    const selisih = totalActH - totalPlanH;
    const capaian = totalPlanH>0 ? Math.round(totalActH/totalPlanH*100) : (totalActH>0?100:0);
    const fmt1 = (n)=> n.toLocaleString("id-ID",{minimumFractionDigits:1,maximumFractionDigits:1});
    document.getElementById("cepSummary").innerHTML = `
      <div>PLAN &nbsp;<strong>${orgPlan} org &rarr; ${fmt1(totalPlanH)} jam</strong> <span class="cep-summary-sub">(normal ${fmt1(normalPlanH)} + lembur ${fmt1(lemburPlanH)} &middot; ${fmt1(lemburJam)} jam/org)</span></div>
      <div>AKTUAL <strong>${orgActual} org &rarr; ${fmt1(totalActH)} jam</strong></div>
      <div>SELISIH <strong class="${selisih<0?'neg':(selisih>0?'pos':'')}">${selisih>=0?'+':''}${fmt1(selisih)} jam</strong> &middot; capaian <strong>${capaian}%</strong></div>
      <div class="cep-summary-note">1 orang sehari penuh = ${(SHIFT_OPTIONS.pagi.hours+SHIFT_OPTIONS.siang.hours).toFixed(1)} jam. Lembur dihitung 0 jam bila kotak "Ada lembur hari ini" tidak dicentang.</div>`;
  }
  document.querySelectorAll(".cep-session-input").forEach(inp=> inp.addEventListener("input", updateSummary));
  updateSummary();

  const lemburChk = document.getElementById("cepLemburAktif");
  lemburChk.addEventListener("change", ()=>{
    const on = lemburChk.checked;
    const planEl = document.getElementById("cepPlan_lembur");
    const actEl = document.getElementById("cepAct_lembur");
    const jamEl = document.getElementById("cepLemburJam");
    planEl.disabled = !on; actEl.disabled = !on; jamEl.disabled = !on;
    if(on){
      if((Number(planEl.value)||0)===0) planEl.value = 1;
      if((Number(actEl.value)||0)===0) actEl.value = 1;
      if((Number(jamEl.value)||0)===0) jamEl.value = SHIFT_OPTIONS.lembur.hours;
    } else {
      planEl.value = 0; actEl.value = 0; jamEl.value = 0;
    }
    updateSummary();
  });

  document.getElementById("cepCopyPlan").onclick = ()=>{
    ["pagi","siang"].forEach(k=>{ document.getElementById("cepAct_"+k).value = document.getElementById("cepPlan_"+k).value; });
    if(lemburChk.checked){ document.getElementById("cepAct_lembur").value = document.getElementById("cepPlan_lembur").value; }
    updateSummary();
  };

  document.getElementById("cepHoursHint").onclick = ()=>{ openWorkHourSettings(); };

  document.getElementById("cepCancel").onclick = closeCellEditor;
  const clearBtn = document.getElementById("cepClear");
  if(clearBtn){
    clearBtn.onclick = ()=>{
      delete p.days[iso];
      closeCellEditor();
      recomputeFromCalendar();
      renderCalendarMonth();
    };
  }
  document.getElementById("cepSave").onclick = ()=>{
    const cur = readInputs();
    p.days[iso] = cur;
    closeCellEditor();
    recomputeFromCalendar();
    renderCalendarMonth();
  };
}
buildCalendar();
updateTimelineFilterNote();
document.getElementById("filterJobOrderBtn").addEventListener("click", openTimelineFilterModal);

// ================= TIMELINE JUMLAH ORANG (hero) =================
let headcountChartInstance = null;
function headcountChartRender(){
  const ctx = document.getElementById("headcountChart");
  const chartCtx = ctx.getContext("2d");
  const labels = DATA.cat_daily_dates;
  const cats = Object.keys(DATA.cat_daily_series).sort((a,b)=>{
    const sumA = DATA.cat_daily_series[a].reduce((x,y)=>x+y,0);
    const sumB = DATA.cat_daily_series[b].reduce((x,y)=>x+y,0);
    return sumB - sumA;
  });

  function gradientFor(hex){
    const g = chartCtx.createLinearGradient(0,0,0,340);
    g.addColorStop(0, hex + "CC");
    g.addColorStop(1, hex + "05");
    return g;
  }

  const datasets = cats.map(cat=>{
    const color = DATA.cat_colors[cat] || "#8FA0B3";
    return {
      label: cat,
      data: DATA.cat_daily_series[cat],
      borderColor: color,
      backgroundColor: gradientFor(color),
      fill: "stack",
      pointRadius: 0,
      borderWidth: 1.5,
      tension: 0.3,
      stack: "hc",
    };
  });

  if(headcountChartInstance) headcountChartInstance.destroy();
  headcountChartInstance = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false, interaction:{mode:"index", intersect:false},
      plugins: {
        legend: { display:false },
        tooltip: {
          backgroundColor:"#122240", borderColor:"#0B2440", borderWidth:1,
          titleFont:{family:"IBM Plex Mono", size:11}, bodyFont:{family:"IBM Plex Mono", size:11},
          callbacks: {
            title:(items)=> items[0].label,
            label:(item)=> item.dataset.label+": "+item.parsed.y+" orang",
            footer:(items)=> "Total: "+items.reduce((a,i)=>a+i.parsed.y,0)+" orang"
          }
        }
      },
      scales: {
        x:{ stacked:true, ticks:{ color:"#54637A", maxTicksLimit: 12, font:{family:"IBM Plex Mono", size:10} }, grid:{ color:"#E1E8F080", drawTicks:false } },
        y:{ stacked:true, ticks:{ color:"#54637A", font:{family:"IBM Plex Mono", size:10} }, grid:{ color:"#E1E8F080" }, beginAtZero:true }
      }
    }
  });

  document.getElementById("catLegendHero").innerHTML = cats.map(c=>
    `<span class="legend-item"><span class="swatch" style="background:${DATA.cat_colors[c]}"></span>${c}</span>`
  ).join("");
}
headcountChartRender();

// ================= LINK KE EXCEL TIMELINE UTAMA =================
const JAN1_2026 = new Date(2026,0,1);
function addDaysJS(base, n){ const d = new Date(base); d.setDate(d.getDate()+n); return d; }
function categorizeJOB(desc){
  const d = desc.toLowerCase();
  if(d.includes("curtain")) return "Curtain";
  if(d.includes("fly kit")) return "Fly Kit";
  if(d.includes("engine cover")||d.includes("inlet")||d.includes("outlet")||d.includes("cowl")||d.includes("pitot")) return "Engine & Component Cover";
  if(d.includes("attendant")) return "Attendant Cover";
  if(d.includes("cargo")||d.includes("lanyard")) return "Cargo";
  if(d.includes("headrest")||d.includes("ottoman")||d.includes("seat cover")||d.includes("seat  cover")) return "Seat Cover";
  if(d.includes("leather")) return "Leather";
  if(d.includes("pouch")||d.includes("bag")) return "Fly Kit";
  return "Lainnya";
}
function pctComplete(p, today){
  if(p.status === "CLOSE") return 100;
  if(p.status === "HOLD") return null;
  if(!p.start) return 0;
  const sd = parseDate(p.start), ed = parseDate(p.end);
  if(today < sd) return 0;
  if(today > ed) return 100;
  const span = Math.round((ed-sd)/86400000)+1;
  return Math.round(Math.min(100,Math.max(0,(today-sd)/86400000/span*100)));
}

function parseTimelineWorkbook(wb){
  const sheetName = wb.SheetNames.find(n=> n.toLowerCase().includes("time frame")) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null, raw:true });
  const products = [];
  for(let r=3; r<rows.length && r<=75; r++){
    const row = rows[r];
    if(!row) continue;
    const descRaw = row[0];
    if(!descRaw) continue;
    const desc = String(descRaw).replace(/\s+/g," ").trim();

    let status = row[368] ? String(row[368]).trim().toUpperCase() : "OPEN";
    if(!["OPEN","PROGRESS","CLOSE","HOLD"].includes(status)) status = "OPEN";

    const tad = (typeof row[366] === "number") ? row[366] : null;

    let target = row[367];
    if(target instanceof Date) target = formatISOForDisplay(target.toISOString().slice(0,10));
    else if(target != null && String(target).trim() !== "") target = String(target).trim();
    else target = null;

    const remarksRaw = row[369];
    const remarks = (remarksRaw != null && String(remarksRaw).trim() !== "") ? String(remarksRaw).replace(/\s+/g," ").trim() : null;

    const dayMap = {};
    for(let ci=1; ci<=365; ci++){
      const val = row[ci];
      if(typeof val === "number"){
        const dt = addDaysJS(JAN1_2026, ci-1);
        dayMap[fmt(dt)] = val;
      }
    }
    const total_mandays = Object.values(dayMap).reduce((a,b)=>a+b,0);
    const isoKeys = Object.keys(dayMap).sort();

    products.push({
      desc, cat: categorizeJOB(desc), status, tad, target, remarks,
      days: dayMap, total_mandays,
      start: isoKeys.length ? isoKeys[0] : null,
      end: isoKeys.length ? isoKeys[isoKeys.length-1] : null,
    });
  }
  return products;
}

function rebuildDashboardFromProducts(products){
  const scheduled = products.filter(p=>p.start);
  // convert flat imported {iso:number} into per-session {iso:{pagi:{plan,actual},...}}
  scheduled.forEach(p=>{
    const migrated = {};
    Object.keys(p.days).forEach(iso=>{ migrated[iso] = migrateFlatValueToSession(p.days[iso]); });
    p.sessionDays = migrated;
  });
  let dateMin = null, dateMax = null;
  scheduled.forEach(p=>{
    if(!dateMin || p.start < dateMin) dateMin = p.start;
    if(!dateMax || p.end > dateMax) dateMax = p.end;
  });

  const dailyTotals = [];
  if(dateMin && dateMax){
    let cur = parseDate(dateMin);
    const endD = parseDate(dateMax);
    while(cur <= endD){
      const iso = fmt(cur);
      const total = scheduled.reduce((s,p)=> s + cellHeadcount(p.sessionDays[iso],"actual"), 0);
      dailyTotals.push({ date: iso, total, weekend: isWeekend(cur) });
      cur.setDate(cur.getDate()+1);
    }
  }

  const monthlyTotals = {};
  dailyTotals.forEach(d=>{ const ym=d.date.slice(0,7); monthlyTotals[ym]=(monthlyTotals[ym]||0)+d.total; });

  const statusCounts = {}, catCounts = {};
  products.forEach(p=>{
    statusCounts[p.status] = (statusCounts[p.status]||0)+1;
    catCounts[p.cat] = (catCounts[p.cat]||0)+1;
  });

  const tadBuckets = {};
  products.forEach(p=>{
    let b;
    if(p.tad==null) b = "Tidak diketahui";
    else if(p.tad<=2) b = "1-2 orang";
    else if(p.tad<=6) b = "3-6 orang";
    else if(p.tad<=10) b = "7-10 orang";
    else if(p.tad<=14) b = "11-14 orang";
    else b = "15+ orang";
    tadBuckets[b] = (tadBuckets[b]||0)+1;
  });

  const today = new Date();
  const topProducts = [...scheduled].sort((a,b)=>b.total_mandays-a.total_mandays).slice(0,12).map(p=>({
    desc:p.desc, cat:p.cat, status:p.status, mandays:p.total_mandays, start:p.start, end:p.end, pct: pctComplete(p, today)
  }));
  const allProducts = products.map(p=>({
    desc:p.desc, cat:p.cat, status:p.status, tad:p.tad, target:p.target, remarks:p.remarks,
    pct: pctComplete(p, today), mandays:p.total_mandays, start:p.start, end:p.end
  }));
  const calendarProducts = scheduled.map(p=>({ desc:p.desc, cat:p.cat, status:p.status, days:{...p.sessionDays}, start:p.start, end:p.end }));

  const catDailyDates = dailyTotals.map(d=>d.date);
  const catDailySeries = {};
  scheduled.forEach(p=>{
    if(!catDailySeries[p.cat]) catDailySeries[p.cat] = new Array(dailyTotals.length).fill(0);
    dailyTotals.forEach((d,i)=>{ catDailySeries[p.cat][i] += cellHeadcount(p.sessionDays[d.date],"actual"); });
  });

  DATA.status_counts = statusCounts;
  DATA.cat_counts = catCounts;
  DATA.tad_buckets = tadBuckets;
  DATA.date_min = dateMin;
  DATA.date_max = dateMax;
  DATA.daily_totals = dailyTotals;
  DATA.monthly_totals = monthlyTotals;
  DATA.top_products = topProducts;
  DATA.all_products = allProducts;
  DATA.calendar_products = calendarProducts;
  DATA.total_jobs = products.length;
  DATA.total_mandays_scheduled = scheduled.reduce((s,p)=>s+p.total_mandays,0);
  DATA.cat_daily_series = catDailySeries;
  DATA.cat_daily_dates = catDailyDates;

  // fresh import = new Plan baseline
  DATA.plan_daily_totals = dailyTotals.map(d=>({...d}));
  if(typeof refreshPlanMap === "function") refreshPlanMap();

  Object.keys(__calOvertime).forEach(k=>delete __calOvertime[k]);

  distStatsRender();
  statusDonutRender();
  catBarRender();
  monthBarRender();
  tadBarRender();
  topTableRender();
  document.getElementById("searchBox").value = "";
  document.getElementById("statusFilter").value = "";
  renderAllTable();
  __calMonthIdx = 0;
  buildCalendar();
  calStatsRender();
  headcountChartRender();
  document.getElementById("startDate").value = DATA.date_min || "";
  document.getElementById("endDate").value = DATA.date_max || "";
  applyRange();
}

document.getElementById("timelineFile").addEventListener("change", (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const statusEl = document.getElementById("timelineStatus");
  statusEl.textContent = "Membaca " + file.name + " ...";
  const reader = new FileReader();
  reader.onload = (evt)=>{
    try{
      const wb = XLSX.read(evt.target.result, { type:"array", cellDates:true });
      const products = parseTimelineWorkbook(wb);
      if(!products.length){ statusEl.textContent = "Tidak ada job order terbaca. Pastikan sheet 'Seat Cover Time Frame' ada di file ini."; return; }
      rebuildDashboardFromProducts(products);
      statusEl.textContent = "Terhubung: " + file.name + " (" + products.length + " job order dimuat)";
    } catch(err){
      statusEl.textContent = "Gagal membaca file: " + err.message;
    }
  };
  reader.readAsArrayBuffer(file);
});


const STATUS_CODE_COLOR = { H:"#3DDC84", I:"#F5A623", S:"#5AC8FA", A:"#E5484D" };
const STATUS_CODE_LABEL = { H:"Hadir", I:"Izin", S:"Sakit", A:"Alpa" };

document.getElementById("absensiFile").addEventListener("change", (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const statusEl = document.getElementById("absensiStatus");
  statusEl.textContent = "Membaca " + file.name + " ...";
  const reader = new FileReader();
  reader.onload = (evt)=>{
    try{
      const wb = XLSX.read(evt.target.result, { type:"array", cellDates:true });
      const absenSheetName = wb.SheetNames.find(n=> n.toLowerCase().startsWith("absensi"));
      if(!absenSheetName){ statusEl.textContent = "Sheet 'Absensi ...' tidak ditemukan di file ini."; return; }
      const ws = wb.Sheets[absenSheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });
      parseAbsensi(rows, absenSheetName);
      statusEl.textContent = "Dimuat: " + file.name + " (" + absenSheetName + ")";
      document.getElementById("kehadiranContent").style.display = "block";
    } catch(err){
      statusEl.textContent = "Gagal membaca file: " + err.message;
    }
  };
  reader.readAsArrayBuffer(file);
});

function parseAbsensi(rows, sheetName){
  // header row (weekday letters) = rows[0], real header (No,Nama,Peran,1..31,Hadir,Izin,Sakit,Alpa,%Hadir) = rows[1]
  const header = rows[1];
  const dayCols = [];
  header.forEach((h,i)=>{ if(typeof h === "number" || (typeof h === "string" && /^\d+$/.test(h))) dayCols.push(i); });
  const hadirCol = header.indexOf("Hadir");
  const izinCol = header.indexOf("Izin");
  const sakitCol = header.indexOf("Sakit");
  const alpaCol = header.indexOf("Alpa");

  const employees = [];
  for(let r=2; r<rows.length; r++){
    const row = rows[r];
    if(!row || !row[1]) continue;
    const nama = row[1], peran = row[2];
    const days = dayCols.map(ci => (row[ci]||"").toString().trim().toUpperCase());
    const counts = { H:0,I:0,S:0,A:0 };
    days.forEach(d=>{ if(counts.hasOwnProperty(d)) counts[d]++; });
    employees.push({ nama, peran, days, counts, total: dayCols.length });
  }
  const monthLabel = sheetName.replace(/^Absensi\s*/i, "");
  renderKehadiran(employees, dayCols.length, monthLabel);
}

function renderKehadiran(employees, ndays, monthLabel){
  const totals = { H:0,I:0,S:0,A:0 };
  employees.forEach(e=>{ Object.keys(totals).forEach(k=> totals[k]+=e.counts[k]); });
  const totalSlots = employees.length * ndays;
  const avgPct = totalSlots ? Math.round(totals.H/totalSlots*100) : 0;
  let best = employees[0], worst = employees[0];
  employees.forEach(e=>{
    if(e.counts.H > (best?.counts.H||-1)) best = e;
    if(e.counts.H < (worst?.counts.H||Infinity)) worst = e;
  });

  document.getElementById("absen-stats").innerHTML = [
    {label:"Karyawan", value: employees.length, sub: monthLabel, color:"var(--cyan)"},
    {label:"Rata-rata kehadiran", value: avgPct+"%", sub:"seluruh tim, "+ndays+" hari", color:"var(--green)"},
    {label:"Kehadiran terbaik", value: best ? best.nama.split(" ")[0] : "-", sub: best ? best.counts.H+" hari hadir" : "-", color:"var(--amber)"},
    {label:"Total alpa", value: totals.A, sub:"seluruh tim", color:"var(--danger)"},
  ].map(s=>`
    <div class="stat-card" style="--accent-color:${s.color}">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-sub">${s.sub}</div>
    </div>`).join("");

  // donut
  if(window.__absenDonut) window.__absenDonut.destroy();
  window.__absenDonut = new Chart(document.getElementById("absenDonut"), {
    type:"doughnut",
    data:{ labels:["Hadir","Izin","Sakit","Alpa"], datasets:[{ data:[totals.H,totals.I,totals.S,totals.A], backgroundColor:[STATUS_CODE_COLOR.H,STATUS_CODE_COLOR.I,STATUS_CODE_COLOR.S,STATUS_CODE_COLOR.A], borderColor:"#FFFFFF", borderWidth:2 }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:"66%", plugins:{legend:{display:false}} }
  });
  document.getElementById("absenLegend").innerHTML = Object.keys(STATUS_CODE_COLOR).map(k=>
    `<span class="legend-item"><span class="swatch" style="background:${STATUS_CODE_COLOR[k]}"></span>${STATUS_CODE_LABEL[k]} — ${totals[k]}</span>`
  ).join("");

  // bar per employee %
  const sorted = [...employees].sort((a,b)=> b.counts.H - a.counts.H);
  if(window.__absenBar) window.__absenBar.destroy();
  window.__absenBar = new Chart(document.getElementById("absenBar"), {
    type:"bar",
    data:{ labels: sorted.map(e=>e.nama.split(" ")[0]), datasets:[{ data: sorted.map(e=>Math.round(e.counts.H/ndays*100)), backgroundColor:"#3DDC84", borderRadius:4 }] },
    options:{
      indexAxis:"y", responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:(item)=>item.raw+"% hadir"}}},
      scales:{ x:{ max:100, ticks:{color:"#54637A",font:{family:"IBM Plex Mono",size:9}}, grid:{color:"#E1E8F0"} }, y:{ ticks:{color:"#122240",font:{family:"IBM Plex Mono",size:9}}, grid:{display:false} } }
    }
  });

  // grid calendar
  let thead = "<thead><tr><th class='desc'>Nama</th>";
  for(let d=1; d<=ndays; d++) thead += `<th>${d}</th>`;
  thead += "</tr></thead>";
  let tbody = "<tbody>";
  employees.forEach(e=>{
    tbody += `<tr><td class="desc" style="--row-accent:${STATUS_CODE_COLOR.H}">${e.nama}<span class="cat-tag">${e.peran}</span></td>`;
    e.days.forEach(code=>{
      const color = STATUS_CODE_COLOR[code];
      if(color){
        tbody += `<td class="daycell" style="background:${color}" title="${e.nama} — ${STATUS_CODE_LABEL[code]}">${code}</td>`;
      } else {
        tbody += `<td class="daycell empty"></td>`;
      }
    });
    tbody += "</tr>";
  });
  tbody += "</tbody>";
  document.getElementById("absenCalTable").innerHTML = thead + tbody;
  document.getElementById("absenGridLegend").innerHTML = Object.keys(STATUS_CODE_COLOR).map(k=>
    `<span class="legend-item"><span class="swatch" style="background:${STATUS_CODE_COLOR[k]}"></span>${k} = ${STATUS_CODE_LABEL[k]}</span>`
  ).join("");

  // table
  document.getElementById("absenBody").innerHTML = employees.map(e=>{
    const pct = Math.round(e.counts.H/ndays*100);
    return `<tr>
      <td>${e.nama}</td><td><span class="cat-pill">${e.peran}</span></td>
      <td>${e.counts.H}</td><td>${e.counts.I}</td><td>${e.counts.S}</td><td>${e.counts.A}</td>
      <td><div class="bar-cell"><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:var(--green)"></div></div><span>${pct}%</span></div></td>
    </tr>`;
  }).join("");
}


let filteredTotals = DATA.daily_totals;
// snapshot the initial (imported) schedule as the "Plan" baseline
DATA.plan_daily_totals = DATA.daily_totals.map(d=>({...d}));
function planValueFor(iso){
  if(!DATA.__planMap){
    DATA.__planMap = {};
    DATA.plan_daily_totals.forEach(d=>{ DATA.__planMap[d.date] = d.total; });
  }
  return DATA.__planMap[iso] || 0;
}
function refreshPlanMap(){ DATA.__planMap = null; }

function totalHoursInRange(startIso, endIso, useActual){
  let sum = 0;
  const field = useActual ? "actual" : "plan";
  DATA.calendar_products.forEach(p=>{
    Object.keys(p.days||{}).forEach(iso=>{
      if(iso >= startIso && iso <= endIso){
        sum += cellHours(p.days[iso], field);
      }
    });
  });
  return sum;
}

function rekapStats(list){
  const totalActual = list.reduce((a,d)=>a+d.total,0);
  const totalPlan = list.reduce((a,d)=>a+planValueFor(d.date),0);
  const avg = list.length ? (totalActual/list.length) : 0;
  const variance = totalActual - totalPlan;
  let peak = {total:-1};
  list.forEach(d=>{ if(d.total>peak.total) peak = d; });

  let hoursPlan = 0, hoursActual = 0;
  if(list.length){
    hoursPlan = totalHoursInRange(list[0].date, list[list.length-1].date, false);
    hoursActual = totalHoursInRange(list[0].date, list[list.length-1].date, true);
  }
  const hoursVariance = hoursActual - hoursPlan;

  const stats = [
    {label:"Hari dalam rentang", value: list.length, sub:"hari terpilih", color:"var(--cyan)"},
    {label:"Rata-rata / hari", value: avg.toFixed(1), sub:"orang per hari (aktual)", color:"var(--amber)"},
    {label:"Puncak", value: peak.total+" org", sub: peak.date || "-", color:"var(--danger)"},
    {label:"Total man-days (Plan)", value: totalPlan.toLocaleString("id-ID"), sub:"baseline jadwal awal", color:"var(--cyan)"},
    {label:"Total man-days (Actual)", value: totalActual.toLocaleString("id-ID"), sub:"pada rentang ini", color:"var(--green)"},
    {label:"Selisih Actual − Plan", value: (variance>=0?"+":"")+variance.toLocaleString("id-ID"), sub: variance>=0 ? "lebih dari rencana" : "di bawah rencana", color: variance>=0 ? "var(--danger)" : "var(--green)"},
    {label:"Total jam kerja (Plan)", value: hoursPlan.toLocaleString("id-ID",{maximumFractionDigits:1})+" j", sub:"asumsi 07:30–16:30, istirahat 1.5j", color:"var(--cyan)"},
    {label:"Total jam kerja (Actual)", value: hoursActual.toLocaleString("id-ID",{maximumFractionDigits:1})+" j", sub:"termasuk sesi &amp; lembur", color:"var(--green)"},
    {label:"Selisih jam (Actual − Plan)", value: (hoursVariance>=0?"+":"")+hoursVariance.toLocaleString("id-ID",{maximumFractionDigits:1})+" j", sub: hoursVariance>=0 ? "lebih dari rencana" : "di bawah rencana", color: hoursVariance>=0 ? "var(--danger)" : "var(--green)"},
  ];
  document.getElementById("rekap-stats").innerHTML = stats.map(s=>`
    <div class="stat-card" style="--accent-color:${s.color}">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-sub">${s.sub}</div>
    </div>`).join("");
}

let chartInstance = null;
function drawRekapChart(){
  const ctx = document.getElementById("rekapChart");
  const labels = filteredTotals.map(d=>d.date);
  const actualValues = filteredTotals.map(d=>d.total);
  const planValues = filteredTotals.map(d=>planValueFor(d.date));
  if(chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: "line",
    data: { labels, datasets: [
      {
        label: "Actual", data: actualValues, borderColor: "#F5A623",
        backgroundColor: "rgba(245,166,35,0.12)", fill: true, pointRadius: 0, borderWidth: 1.5, tension: 0.15,
      },
      {
        label: "Plan", data: planValues, borderColor: "#5AC8FA",
        backgroundColor: "transparent", borderDash: [5,4], fill: false, pointRadius: 0, borderWidth: 1.5, tension: 0.15,
      }
    ]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display:true, labels:{ color:"#8FA0B3", font:{family:"IBM Plex Mono", size:10.5}, boxWidth:14 } },
        tooltip: { callbacks: {
          title: (items)=> items[0].label, label: (item)=> item.dataset.label+": "+item.parsed.y+" orang"
        }}
      },
      scales: {
        x: { ticks: { color:"#54637A", maxTicksLimit: 12, font:{family:"IBM Plex Mono", size:10} }, grid:{ color:"#E1E8F0" } },
        y: { ticks: { color:"#54637A", font:{family:"IBM Plex Mono", size:10} }, grid:{ color:"#E1E8F0" }, beginAtZero:true }
      }
    }
  });
}

function renderRekapTable(){
  const maxVal = Math.max(...filteredTotals.map(d=>Math.max(d.total, planValueFor(d.date))), 1);
  document.getElementById("rekapBody").innerHTML = filteredTotals.map(d=>{
    const dt = parseDate(d.date);
    const wd = WD_ID[dt.getDay()];
    const plan = planValueFor(d.date);
    const diff = d.total - plan;
    const pct = (d.total/maxVal*100).toFixed(0);
    const diffColor = diff>0 ? "var(--danger)" : (diff<0 ? "var(--green)" : "var(--text-muted)");
    return `<tr class="${d.weekend?'weekend':''}">
      <td>${d.date}</td><td>${wd}</td><td class="mono">${plan}</td><td>${d.total}</td>
      <td class="mono" style="color:${diffColor}">${diff>0?"+":""}${diff}</td>
      <td><div class="bar-cell"><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><span>${pct}%</span></div></td>
    </tr>`;
  }).join("");
}

function applyRange(){
  const s = document.getElementById("startDate").value;
  const e = document.getElementById("endDate").value;
  refreshPlanMap();
  filteredTotals = DATA.daily_totals.filter(d=> d.date >= s && d.date <= e);
  rekapStats(filteredTotals);
  if(chartsDrawn.rekap) drawRekapChart();
  renderRekapTable();
}

document.getElementById("startDate").value = DATA.date_min;
document.getElementById("endDate").value = DATA.date_max;
document.getElementById("startDate").addEventListener("change", applyRange);
document.getElementById("endDate").addEventListener("change", applyRange);
document.getElementById("resetRange").addEventListener("click", ()=>{
  document.getElementById("startDate").value = DATA.date_min;
  document.getElementById("endDate").value = DATA.date_max;
  applyRange();
});

rekapStats(filteredTotals);
renderRekapTable();

// -------- simpan/hapus data tersimpan (Rekap Harian) --------
function formatSavedNote(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return "Belum ada perubahan yang disimpan di browser ini.";
    const now = new Date();
    return "Tersimpan terakhir di browser ini &middot; " + now.toLocaleDateString("id-ID") ;
  }catch(e){ return ""; }
}
// Semua tombol "Simpan perubahan" (Rekap, Timeline, Distribusi Pengerjaan) memakai
// satu fungsi & satu key localStorage yang sama, sehingga menyimpan dari tab manapun
// otomatis mencakup seluruh data: kalender/timeline, job order baru, lembur & jam kerja.
const SAVE_STATUS_IDS = ["rekapSaveStatus", "timelineSaveStatus", "distribusiSaveStatus"];
function initialSaveStatusText(){
  return __loadedFromStorage
    ? "Menampilkan data tersimpan dari perubahan sebelumnya di browser ini."
    : "Menampilkan data bawaan (belum ada perubahan tersimpan di browser ini).";
}
SAVE_STATUS_IDS.forEach(id=>{
  const el = document.getElementById(id);
  if(el) el.innerHTML = initialSaveStatusText();
});
function performSave(){
  if(!requireLogin()) return;
  const ok = saveDataToStorage();
  SAVE_STATUS_IDS.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    if(ok){
      const now = new Date();
      el.innerHTML = `<span style="color:var(--green)">&#10003; Tersimpan pukul ${now.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}</span> &middot; mencakup kalender/timeline, lembur, job order &amp; pengaturan jam kerja.`;
    } else {
      el.innerHTML = `<span style="color:var(--danger)">Gagal menyimpan (penyimpanan browser penuh/diblokir).</span>`;
    }
  });
}
["saveRekapBtn", "saveTimelineBtn", "saveDistribusiBtn"].forEach(id=>{
  const btn = document.getElementById(id);
  if(btn) btn.addEventListener("click", performSave);
});
document.getElementById("resetSavedBtn").addEventListener("click", ()=>{
  if(!requireLogin()) return;
  if(!confirm("Hapus semua perubahan tersimpan di browser ini dan muat ulang data bawaan?")) return;
  clearSavedData();
  location.reload();
});

applyAuthUI();
