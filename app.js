const DEFAULT_PROFILE = {
  id: crypto.randomUUID(),
  name: "Main Bag",
  clubs: [
    ["Driver",245],["3 Wood",225],["5 Wood",210],["4 Iron",195],["5 Iron",185],
    ["6 Iron",173],["7 Iron",162],["8 Iron",150],["9 Iron",138],["PW",124],
    ["GW",110],["SW",90],["LW",70]
  ].map(([name, carry]) => ({id: crypto.randomUUID(), name, carry}))
};

const state = {
  profiles: JSON.parse(localStorage.getItem("pc_profiles") || "null") || [DEFAULT_PROFILE],
  activeProfileId: localStorage.getItem("pc_active_profile") || DEFAULT_PROFILE.id,
  adjustment: 0,
  history: JSON.parse(localStorage.getItem("pc_history") || "[]"),
  deferredPrompt: null
};

if (!state.profiles.some(p => p.id === state.activeProfileId)) state.activeProfileId = state.profiles[0].id;

const $ = id => document.getElementById(id);
const els = {
  pinDistance: $("pinDistance"), adjustmentButtons: $("adjustmentButtons"),
  recommendBtn: $("recommendBtn"), resultCard: $("resultCard"),
  profileSelect: $("profileSelect"), clubList: $("clubList"),
  clubDialog: $("clubDialog"), clubForm: $("clubForm"), clubId: $("clubId"),
  clubName: $("clubName"), clubCarry: $("clubCarry"), clubDialogTitle: $("clubDialogTitle"),
  historyList: $("historyList"), installBtn: $("installBtn"),
  greenLightEnabled: $("greenLightEnabled"), greenLightMin: $("greenLightMin"), greenLightMax: $("greenLightMax")
};

function save() {
  localStorage.setItem("pc_profiles", JSON.stringify(state.profiles));
  localStorage.setItem("pc_active_profile", state.activeProfileId);
  localStorage.setItem("pc_history", JSON.stringify(state.history.slice(0, 30)));
}
function activeProfile() { return state.profiles.find(p => p.id === state.activeProfileId); }
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function renderProfiles() {
  els.profileSelect.innerHTML = state.profiles.map(p =>
    `<option value="${p.id}" ${p.id===state.activeProfileId?"selected":""}>${escapeHtml(p.name)}</option>`
  ).join("");
}
function renderClubs() {
  const clubs = [...activeProfile().clubs].sort((a,b)=>b.carry-a.carry);
  els.clubList.innerHTML = clubs.length ? clubs.map(c => `
    <div class="club-row">
      <div><div class="club-name">${escapeHtml(c.name)}</div><div class="club-carry">${c.carry} yds</div></div>
      <div class="club-actions">
        <button class="icon-btn" data-edit="${c.id}" aria-label="Edit ${escapeHtml(c.name)}">Edit</button>
        <button class="icon-btn" data-delete="${c.id}" aria-label="Delete ${escapeHtml(c.name)}">×</button>
      </div>
    </div>`).join("") : `<p class="muted">No clubs yet. Add your first club.</p>`;
}
function renderHistory() {
  els.historyList.innerHTML = state.history.length ? state.history.map(h => `
    <div class="history-item">
      <div class="history-top"><span>${escapeHtml(h.club)}</span><span>${h.playingDistance} yds</span></div>
      <small>Pin ${h.pinDistance} · Adjustment ${h.adjustment > 0 ? "+" : ""}${h.adjustment} · ${new Date(h.time).toLocaleString()}</small>
    </div>`).join("") : `<p class="muted">No recommendations saved yet.</p>`;
}
function recommend() {
  const pin = Number(els.pinDistance.value);
  if (!Number.isFinite(pin) || pin <= 0) {
    els.resultCard.innerHTML = `<p class="muted">Enter a valid pin distance.</p>`;
    els.pinDistance.focus();
    return;
  }
  const playing = pin + state.adjustment;
  const clubs = [...activeProfile().clubs];
  if (!clubs.length) {
    els.resultCard.innerHTML = `<p class="muted">Add clubs to your bag first.</p>`;
    return;
  }
  const best = clubs.reduce((a,b) => Math.abs(b.carry-playing) < Math.abs(a.carry-playing) ? b : a);
  const delta = playing - best.carry;
  const min = Number(els.greenLightMin.value), max = Number(els.greenLightMax.value);
  const green = els.greenLightEnabled.checked && playing >= min && playing <= max;
  const note = delta === 0 ? "Perfect stock number" : delta > 0 ? `${Math.abs(delta)} yds beyond stock carry` : `${Math.abs(delta)} yds under stock carry`;
  els.resultCard.innerHTML = `
    <div class="result-grid">
      <div><p class="section-label">Playing distance</p><div class="result-number">${playing} yds</div></div>
      <div><p class="section-label">Recommended club</p><div class="club-recommendation">${escapeHtml(best.name)}</div><p class="muted">${note}</p></div>
    </div>
    <span class="badge ${green ? "green":"yellow"}">${green ? "GREEN LIGHT — ATTACK":"PLAY SMART"}</span>`;
  state.history.unshift({club:best.name, playingDistance:playing, pinDistance:pin, adjustment:state.adjustment, time:Date.now()});
  state.history = state.history.slice(0,30);
  save(); renderHistory();
}
function openClubDialog(club=null) {
  els.clubDialogTitle.textContent = club ? "Edit club" : "Add club";
  els.clubId.value = club?.id || "";
  els.clubName.value = club?.name || "";
  els.clubCarry.value = club?.carry || "";
  els.clubDialog.showModal();
  setTimeout(()=>els.clubName.focus(),100);
}

els.adjustmentButtons.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  state.adjustment = Number(b.dataset.adjustment);
  [...els.adjustmentButtons.children].forEach(x=>x.classList.toggle("selected",x===b));
});
els.recommendBtn.addEventListener("click", recommend);
els.pinDistance.addEventListener("keydown", e => { if (e.key === "Enter") recommend(); });
els.profileSelect.addEventListener("change", e => { state.activeProfileId=e.target.value; save(); renderClubs(); });
$("addClubBtn").addEventListener("click",()=>openClubDialog());
els.clubList.addEventListener("click", e => {
  const editId=e.target.dataset.edit, deleteId=e.target.dataset.delete;
  if (editId) openClubDialog(activeProfile().clubs.find(c=>c.id===editId));
  if (deleteId && confirm("Remove this club?")) {
    activeProfile().clubs=activeProfile().clubs.filter(c=>c.id!==deleteId); save(); renderClubs();
  }
});
els.clubForm.addEventListener("submit", e => {
  e.preventDefault();
  const name=els.clubName.value.trim(), carry=Number(els.clubCarry.value);
  if (!name || !carry) return;
  const id=els.clubId.value;
  if (id) Object.assign(activeProfile().clubs.find(c=>c.id===id),{name,carry});
  else activeProfile().clubs.push({id:crypto.randomUUID(),name,carry});
  save(); renderClubs(); els.clubDialog.close();
});
$("newProfileBtn").addEventListener("click", () => {
  const name=prompt("Name this bag profile:","New Bag");
  if (!name?.trim()) return;
  const copy=confirm("Copy clubs from your current bag?");
  const profile={id:crypto.randomUUID(),name:name.trim(),clubs:copy?structuredClone(activeProfile().clubs):[]};
  if (copy) profile.clubs=profile.clubs.map(c=>({...c,id:crypto.randomUUID()}));
  state.profiles.push(profile); state.activeProfileId=profile.id; save(); renderProfiles(); renderClubs();
});
$("renameProfileBtn").addEventListener("click", () => {
  const p=activeProfile(), name=prompt("Rename bag profile:",p.name);
  if (name?.trim()) { p.name=name.trim(); save(); renderProfiles(); }
});
$("deleteProfileBtn").addEventListener("click", () => {
  if (state.profiles.length===1) return alert("Keep at least one bag profile.");
  if (!confirm(`Delete "${activeProfile().name}"?`)) return;
  state.profiles=state.profiles.filter(p=>p.id!==state.activeProfileId);
  state.activeProfileId=state.profiles[0].id; save(); renderProfiles(); renderClubs();
});
$("clearHistoryBtn").addEventListener("click",()=>{ if(confirm("Clear recommendation history?")){state.history=[];save();renderHistory();}});
document.querySelectorAll(".nav-button").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".nav-button").forEach(b=>b.classList.toggle("active",b===btn));
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===btn.dataset.view));
}));
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault(); state.deferredPrompt=e; els.installBtn.classList.remove("hidden");
});
els.installBtn.addEventListener("click", async () => {
  if (!state.deferredPrompt) return;
  state.deferredPrompt.prompt(); await state.deferredPrompt.userChoice;
  state.deferredPrompt=null; els.installBtn.classList.add("hidden");
});
if ("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));

renderProfiles(); renderClubs(); renderHistory();
