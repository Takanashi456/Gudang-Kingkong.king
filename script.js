const KEY_ITEMS="stokku_items";
const KEY_TX="stokku_transactions";
let items=JSON.parse(localStorage.getItem(KEY_ITEMS)||"[]");
let transactions=JSON.parse(localStorage.getItem(KEY_TX)||"[]");
let transactionType="in";
let deferredPrompt=null;

const $=id=>document.getElementById(id);
function save(){localStorage.setItem(KEY_ITEMS,JSON.stringify(items));localStorage.setItem(KEY_TX,JSON.stringify(transactions));}
function today(){return new Date().toISOString().slice(0,10)}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function showPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===page));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  if(page==="dashboard")renderDashboard();
  if(page==="barang")renderItems();
  if(page==="riwayat")renderHistory();
  if(page==="transaksi")renderTransactionRows();
}
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>showPage(b.dataset.page));

function stockOf(id){
  let total=0;
  transactions.forEach(t=>t.items.forEach(x=>{if(x.itemId===id)total+=(t.type==="in"?x.qty:-x.qty)}));
  return total;
}
function renderDashboard(){
  $("totalTypes").textContent=items.length;
  $("totalStock").textContent=items.reduce((a,x)=>a+stockOf(x.id),0);
  $("totalIn").textContent=transactions.filter(t=>t.type==="in").reduce((a,t)=>a+t.items.reduce((s,x)=>s+x.qty,0),0);
  $("totalOut").textContent=transactions.filter(t=>t.type==="out").reduce((a,t)=>a+t.items.reduce((s,x)=>s+x.qty,0),0);
  const list=items.filter(x=>stockOf(x.id)!==0);
  $("stockList").innerHTML=list.length?list.map(x=>`<div class="item-card"><span class="item-name">${esc(x.name)}</span><span class="stock">${stockOf(x.id)}</span></div>`).join(""):`<div class="empty">Belum ada stok.</div>`;
  const recent=[...transactions].sort((a,b)=>b.createdAt-a.createdAt).slice(0,3);
  $("recentList").innerHTML=recent.length?recent.map(historyHTML).join(""):`<div class="empty">Belum ada transaksi.</div>`;
}
function renderItems(){
  const query=($("barangSearch")?.value||"").trim().toLowerCase();
  const filtered=query?items.filter(x=>x.name.toLowerCase().includes(query)):items;
  $("allStockList").innerHTML=filtered.length?filtered.map(x=>`
    <div class="item-card">
      <div><div class="item-name">${esc(x.name)}</div><small>Stok: ${stockOf(x.id)}</small></div>
      <button class="small-btn danger" onclick="deleteItem('${x.id}')">Hapus</button>
    </div>`).join(""):(query?`<div class="empty">Barang dengan nama "${esc(query)}" tidak ditemukan.</div>`:`<div class="empty">Belum ada barang. Tambahkan barang terlebih dahulu.</div>`);
}
function deleteItem(id){
  if(transactions.some(t=>t.items.some(x=>x.itemId===id))){alert("Barang yang sudah memiliki riwayat transaksi tidak dapat dihapus.");return}
  items=items.filter(x=>x.id!==id);save();renderItems();renderTransactionRows();
}
function historyHTML(t){
  return `<div class="history-card"><div class="top"><strong>${esc(formatDate(t.date))}</strong><span class="badge ${t.type}">${t.type==="in"?"PEMASUKAN":"PENGELUARAN"}</span></div><p>${esc(t.description||"Tanpa keterangan")}</p><ul class="history-items">${t.items.map(x=>`<li>${esc(items.find(i=>i.id===x.itemId)?.name||"Barang dihapus")} — ${x.qty}</li>`).join("")}</ul><div class="history-actions"><button type="button" class="small-btn danger" data-delete-transaction="${esc(t.id)}">Hapus riwayat</button></div></div>`;
}
function deleteTransaction(id){
  const tx=transactions.find(t=>t.id===id);
  if(!tx)return;
  if(!confirm("Hapus riwayat transaksi ini? Stok akan otomatis disesuaikan."))return;
  transactions=transactions.filter(t=>t.id!==id);
  save();
  renderHistory();
  renderDashboard();
  renderItems();
}
function formatDate(d){if(!d)return "-";const [y,m,day]=d.split("-");return `${day}/${m}/${y}`}
function renderHistory(){
  const query=$("historySearch").value.trim().toLowerCase();
  const date=$("historyDate").value;
  const type=$("historyType").value;
  const data=[...transactions].filter(t=>{
    const itemNames=t.items.map(x=>items.find(i=>i.id===x.itemId)?.name||"Barang dihapus").join(" ").toLowerCase();
    const searchable=`${t.description||""} ${itemNames}`.toLowerCase();
    return (!query||searchable.includes(query))&&(!date||t.date===date)&&(!type||t.type===type);
  }).sort((a,b)=>b.createdAt-a.createdAt);
  $("historyList").innerHTML=data.length?data.map(historyHTML).join(""):`<div class="empty">Tidak ada transaksi yang cocok dengan filter.</div>`;
}
document.addEventListener("click", function(e){
  const btn=e.target.closest("[data-delete-transaction]");
  if(!btn) return;
  e.preventDefault();
  deleteTransaction(btn.getAttribute("data-delete-transaction"));
});

function renderTransactionRows(){
  const box=$("transactionItems");
  if(!box.children.length)addTransactionRow();
  $("itemOptions").innerHTML=items.map(i=>`<option value="${esc(i.name)}"></option>`).join("");
  [...box.children].forEach(row=>{
    const input=row.querySelector(".item-search");
    if(input)input.setAttribute("list","itemOptions");
  });
}
function addTransactionRow(){
  if(!items.length){alert("Tambahkan barang terlebih dahulu di menu Barang.");showPage("barang");return}
  const row=document.createElement("div");row.className="transaction-row";
  row.innerHTML=`<div><label>Barang</label><input class="item-search" type="search" list="itemOptions" placeholder="Cari barang" autocomplete="off" required></div>
  <div><label>Jumlah</label><input class="qty" type="number" min="1" value="1" required></div>
  <button type="button" class="remove-btn" title="Hapus">×</button>`;
  const itemInput=row.querySelector(".item-search");
  const syncItemInput=()=>{
    const value=itemInput.value.trim().toLowerCase();
    if(!value){itemInput.dataset.itemId="";return}
    const match=items.find(i=>i.name.toLowerCase().includes(value));
    itemInput.dataset.itemId=match?.id||"";
  };
  itemInput.oninput=syncItemInput;
  itemInput.onchange=syncItemInput;
  row.querySelector(".remove-btn").onclick=()=>{row.remove();if(!$("transactionItems").children.length)addTransactionRow()};
  $("transactionItems").appendChild(row);
}
document.querySelectorAll(".type-btn").forEach(btn=>btn.onclick=()=>{
  transactionType=btn.dataset.type;
  document.querySelectorAll(".type-btn").forEach(b=>b.classList.toggle("active",b===btn));
});
$("addItemBtn").onclick=addTransactionRow;
$("transactionDate").value=today();
$("historySearch").oninput=renderHistory;
$("barangSearch").oninput=renderItems;
$("historyDate").onchange=renderHistory;
$("historyType").onchange=renderHistory;
$("resetHistoryBtn").onclick=()=>{
  $("historySearch").value="";
  $("historyDate").value="";
  $("historyType").value="";
  renderHistory();
};

$("transactionForm").onsubmit=e=>{
  e.preventDefault();
  const rows=[...document.querySelectorAll("#transactionItems .transaction-row")];
  const txItems=rows.map(r=>({itemId:r.querySelector(".item-search").dataset.itemId,qty:Number(r.querySelector(".qty").value)}));
  if(txItems.some(x=>!x.itemId||x.qty<1)){alert("Lengkapi semua barang dan jumlahnya.");return}
  if(transactionType==="out"){
    const wanted={};
    txItems.forEach(x=>wanted[x.itemId]=(wanted[x.itemId]||0)+x.qty);
    for(const id in wanted)if(wanted[id]>stockOf(id)){alert(`Stok ${items.find(i=>i.id===id)?.name||""} tidak cukup.`);return}
  }
  transactions.push({id:crypto.randomUUID?crypto.randomUUID():Date.now().toString(),type:transactionType,date:$("transactionDate").value,description:$("description").value.trim(),items:txItems,createdAt:Date.now()});
  save();alert("Transaksi berhasil disimpan.");
  $("description").value="";$("transactionItems").innerHTML="";addTransactionRow();showPage("dashboard");
};
$("newItemBtn").onclick=()=>{$("itemForm").classList.remove("hidden");$("itemName").focus()};
$("cancelItemBtn").onclick=()=>{$("itemForm").classList.add("hidden");$("itemName").value=""};
$("itemForm").onsubmit=e=>{
  e.preventDefault();const name=$("itemName").value.trim();
  if(!name)return;
  if(items.some(x=>x.name.toLowerCase()===name.toLowerCase())){alert("Barang tersebut sudah ada.");return}
  items.push({id:crypto.randomUUID?crypto.randomUUID():Date.now().toString(),name});save();
  $("itemName").value="";$("itemForm").classList.add("hidden");renderItems();renderTransactionRows();
};
$("clearHistoryBtn").onclick=()=>{
  if(confirm("Hapus semua riwayat transaksi? Stok akan kembali menjadi 0.")){transactions=[];save();renderHistory();renderDashboard()}
};

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installBtn").classList.remove("hidden")});
$("installBtn").onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;$("installBtn").classList.add("hidden")}};

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));
renderDashboard();
renderItems();
renderTransactionRows();