const starterClubs=[["Driver",235,250],["3 Wood",215,225],["5 Wood",200,210],["4 Iron",185,195],["5 Iron",175,185],["6 Iron",165,175],["7 Iron",150,160],["8 Iron",140,150],["9 Iron",130,140],["PW",115,125],["GW",100,110],["SW",85,95],["LW",65,75]];
const starter={id:crypto.randomUUID(),name:"Main Bag",clubs:starterClubs.map(([name,carry,total])=>({id:crypto.randomUUID(),name,carry,total}))};

const savedProfiles=JSON.parse(localStorage.getItem("pc_profiles_v12")||localStorage.getItem("pc_profiles_v11")||"null");
const state={
  profiles:savedProfiles||[starter],
  activeProfileId:localStorage.getItem("pc_active_profile_v12")||localStorage.getItem("pc_active_profile_v11")||(savedProfiles?.[0]?.id||starter.id),
  adjustment:0,
  tracker:JSON.parse(localStorage.getItem("pc_tracker_v12")||localStorage.getItem("pc_tracker_v11")||"[]"),
  settings:JSON.parse(localStorage.getItem("pc_settings_v12")||localStorage.getItem("pc_settings_v11")||'{"totalTolerance":5,"stockTolerance":5}')
};
if(!state.profiles.some(p=>p.id===state.activeProfileId))state.activeProfileId=state.profiles[0].id;

const $=id=>document.getElementById(id);
const els={pin:$("pinDistance"),carry:$("carryInput"),adjustments:$("adjustmentButtons"),result:$("resultCard"),profile:$("profileSelect"),clubList:$("clubList"),dialog:$("clubDialog"),form:$("clubForm"),clubId:$("clubId"),clubName:$("clubName"),clubCarry:$("clubCarry"),clubTotal:$("clubTotal"),trackerList:$("trackerList"),trackerFilter:$("trackerFilter"),totalTolerance:$("totalTolerance"),stockTolerance:$("stockTolerance")};

function save(){
  localStorage.setItem("pc_profiles_v12",JSON.stringify(state.profiles));
  localStorage.setItem("pc_active_profile_v12",state.activeProfileId);
  localStorage.setItem("pc_tracker_v12",JSON.stringify(state.tracker));
  localStorage.setItem("pc_settings_v12",JSON.stringify(state.settings));
}
function profile(){return state.profiles.find(p=>p.id===state.activeProfileId)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function renderProfiles(){els.profile.innerHTML=state.profiles.map(p=>`<option value="${p.id}" ${p.id===state.activeProfileId?"selected":""}>${esc(p.name)}</option>`).join("")}
function renderClubs(){
  const clubs=[...profile().clubs].sort((a,b)=>b.total-a.total);
  els.clubList.innerHTML=clubs.map(c=>`<div class="club-row"><div><div class="club-name">${esc(c.name)}</div><div class="club-distance">Carry ${c.carry||"Not set"} · Total ${c.total}</div></div><div class="club-actions"><button class="icon-btn" data-edit="${c.id}">Edit</button><button class="icon-btn" data-delete="${c.id}">×</button></div></div>`).join("")||'<p class="muted">No clubs yet.</p>';
}
function getDisplayRange(club,clubs){
  if(club.carry)return `${club.carry}–${club.total} yds`;
  const sorted=[...clubs].sort((a,b)=>b.total-a.total);
  const i=sorted.findIndex(c=>c.id===club.id);
  const next=sorted[i+1];
  return next?`${next.total}–${club.total} yds`:`Up to ${club.total} yds`;
}
function pickByTotal(clubs,target){
  return clubs.reduce((a,b)=>Math.abs(b.total-target)<Math.abs(a.total-target)?b:a);
}
function pickWithCarryRequirement(clubs,target,requiredCarry){
  const eligible=clubs.filter(c=>c.carry&&c.carry>=requiredCarry);
  if(!eligible.length)return pickByTotal(clubs,target);
  return eligible.reduce((a,b)=>Math.abs(b.total-target)<Math.abs(a.total-target)?b:a);
}
function recommend(){
  const pin=Number(els.pin.value), requiredCarry=Number(els.carry.value);
  if(!Number.isFinite(pin)||pin<=0){els.result.innerHTML='<p class="muted">Enter a valid pin distance.</p>';return}
  const target=pin+state.adjustment;
  const clubs=profile().clubs;
  if(!clubs.length){els.result.innerHTML='<p class="muted">Add clubs to your bag first.</p>';return}

  const carryEntered=Number.isFinite(requiredCarry)&&requiredCarry>0;
  const best=carryEntered?pickWithCarryRequirement(clubs,target,requiredCarry):pickByTotal(clubs,target);
  const hasSavedCarry=Number.isFinite(Number(best.carry))&&Number(best.carry)>0;
  const totalPass=Math.abs(best.total-target)<=state.settings.totalTolerance;
  const stockPass=hasSavedCarry?Math.abs(best.carry-target)<=state.settings.stockTolerance:true;
  const green=totalPass&&stockPass;
  const range=getDisplayRange(best,clubs);

  let note="";
  if(carryEntered){
    if(hasSavedCarry){
      note=`<div class="carry-check">Carry checked: ${best.carry} yds covers the required ${requiredCarry} yds.</div>`;
    }else{
      note=`<div class="warning">Carry could not be verified. This recommendation is based on total distance only.</div>`;
    }
  }else if(!hasSavedCarry){
    note=`<div class="warning">Total-distance recommendation only. No carry distance is saved for this club.</div>`;
  }

  els.result.innerHTML=`<div class="result-wrap"><div class="club-badge ${green?"green":"safe"}">${green?`<div><div class="mode-icon">🚩</div><div class="club-name-large">${esc(best.name)}</div><div class="range-text">${range}</div></div>`:`<div><div class="mode-label">CENTER</div><div class="mode-icon">⛳</div><div class="club-name-large">${esc(best.name)}</div><div class="range-text">${range}</div></div>`}</div>${note}</div>`;

  state.tracker.push({clubId:best.id,clubName:best.name,time:Date.now()});save();renderTracker();
}
function filteredTracker(){
  const now=new Date(),filter=els.trackerFilter.value;
  return state.tracker.filter(x=>{
    const d=new Date(x.time);
    if(filter==="today")return d.toDateString()===now.toDateString();
    if(filter==="7")return now-x.time<=7*86400000;
    if(filter==="30")return now-x.time<=30*86400000;
    if(filter==="year")return d.getFullYear()===now.getFullYear();
    return true;
  });
}
function renderTracker(){
  const counts={};
  filteredTracker().forEach(x=>counts[x.clubName]=(counts[x.clubName]||0)+1);
  const rows=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  els.trackerList.innerHTML=rows.map(([name,count])=>`<div class="tracker-item"><strong>${esc(name)}</strong><span class="tracker-count">${count}</span></div>`).join("")||'<p class="muted">No recommendations in this period.</p>';
}
function openClub(club){
  $("clubDialogTitle").textContent=club?"Edit Club":"Add Club";
  els.clubId.value=club?.id||"";els.clubName.value=club?.name||"";els.clubCarry.value=club?.carry||"";els.clubTotal.value=club?.total||"";
  els.dialog.showModal();
}
els.adjustments.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;state.adjustment=Number(b.dataset.adjustment);[...els.adjustments.children].forEach(x=>x.classList.toggle("selected",x===b))});
$("recommendBtn").addEventListener("click",recommend);
els.pin.addEventListener("keydown",e=>{if(e.key==="Enter")recommend()});
els.profile.addEventListener("change",e=>{state.activeProfileId=e.target.value;save();renderClubs()});
$("addClubBtn").addEventListener("click",()=>openClub());
els.clubList.addEventListener("click",e=>{
  const edit=e.target.dataset.edit,del=e.target.dataset.delete;
  if(edit)openClub(profile().clubs.find(c=>c.id===edit));
  if(del&&confirm("Remove this club?")){profile().clubs=profile().clubs.filter(c=>c.id!==del);save();renderClubs()}
});
els.form.addEventListener("submit",e=>{
  e.preventDefault();const id=els.clubId.value,name=els.clubName.value.trim(),carry=Number(els.clubCarry.value)||null,total=Number(els.clubTotal.value);
  if(!name||!total)return;
  if(id)Object.assign(profile().clubs.find(c=>c.id===id),{name,carry,total});
  else profile().clubs.push({id:crypto.randomUUID(),name,carry,total});
  save();renderClubs();els.dialog.close();
});
$("newProfileBtn").addEventListener("click",()=>{
  const name=prompt("Name this bag profile:","New Bag");if(!name?.trim())return;
  const copy=confirm("Copy clubs from your current bag?");
  const p={id:crypto.randomUUID(),name:name.trim(),clubs:copy?profile().clubs.map(c=>({...c,id:crypto.randomUUID()})):[]};
  state.profiles.push(p);state.activeProfileId=p.id;save();renderProfiles();renderClubs();
});
$("renameProfileBtn").addEventListener("click",()=>{const p=profile(),name=prompt("Rename bag profile:",p.name);if(name?.trim()){p.name=name.trim();save();renderProfiles()}});
$("deleteProfileBtn").addEventListener("click",()=>{if(state.profiles.length===1)return alert("Keep at least one bag profile.");if(confirm(`Delete "${profile().name}"?`)){state.profiles=state.profiles.filter(p=>p.id!==state.activeProfileId);state.activeProfileId=state.profiles[0].id;save();renderProfiles();renderClubs()}});
els.trackerFilter.addEventListener("change",renderTracker);
$("resetTrackerBtn").addEventListener("click",()=>{if(confirm("Reset all tracker data?")){state.tracker=[];save();renderTracker()}});
els.totalTolerance.value=state.settings.totalTolerance;els.stockTolerance.value=state.settings.stockTolerance;
[els.totalTolerance,els.stockTolerance].forEach(el=>el.addEventListener("change",()=>{
  state.settings.totalTolerance=Math.max(0,Number(els.totalTolerance.value)||0);
  state.settings.stockTolerance=Math.max(0,Number(els.stockTolerance.value)||0);save();
}));
document.querySelectorAll(".nav-button").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".nav-button").forEach(b=>b.classList.toggle("active",b===btn));
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===btn.dataset.view));
}));
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));
renderProfiles();renderClubs();renderTracker();
