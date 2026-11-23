'use strict';
const bellSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>';
function notificationButton() {
  const count = notifications.filter(n => !Number(n.isRead)).length;
  return `<button id="bell" class="btn quiet small bell" aria-label="Notifikasi, ${count} belum dibaca">${bellSvg}<span id="bell-count" ${count?'':'hidden'}>${count}</span></button>`;
}
function refreshBell() {
  const bell=document.getElementById('bell');
  if(bell) { const count=notifications.filter(n=>!Number(n.isRead)).length; const label=bell.querySelector('span'); label.textContent=count; label.hidden=!count; bell.setAttribute('aria-label',`Notifikasi, ${count} belum dibaca`); }
}
function showSuccess(message) { const d=document.getElementById('success-dialog'); document.getElementById('success-text').textContent=message; if(!d.open)d.showModal(); }
function openNotifications() { const d=document.getElementById('notification-dialog'); paintNotifications(); if(!d.open)d.showModal(); }
function paintNotifications() {
  const target=document.getElementById('notification-content');
  target.innerHTML=`<div class="actions notification-actions"><button class="btn quiet small" id="mark-read">Tandai semua dibaca</button><button class="btn quiet small" id="push-toggle">Pengaturan push</button></div><p class="note" id="notification-error" role="status"></p>` + (notifications.length ? notifications.map(n=>`<button type="button" class="notification-item ${Number(n.isRead)?'':'unread'}" data-id="${Number(n.id)}" data-code="${escapeHTML(n.reportCode || '')}"><strong>${escapeHTML(n.title)}</strong><span>${escapeHTML(n.message)}</span><small>${escapeHTML(n.createdAt)}</small></button>`).join('') : '<p>Belum ada notifikasi.</p>');
  target.querySelector('#mark-read').onclick=()=>save('notifications-read',{},()=>{refreshBell();paintNotifications();},'notification-error');
  target.querySelector('#push-toggle').onclick=()=>{document.getElementById('notification-dialog').close();openPushSettings();};
  target.querySelectorAll('.notification-item').forEach(el=>el.onclick=()=>{const code=el.dataset.code;save('notifications-read',{id:Number(el.dataset.id)},()=>{document.getElementById('notification-dialog').close();go(code&&reports.some(r=>r.id===code)?'laporan/'+code:user.role==='admin'?'kelola':'riwayat');refreshBell();},'notification-error');});
}
function pushSupported(){return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;}
async function worker(){return navigator.serviceWorker.register('sw.js');}
async function currentSubscription(){if(!pushSupported())return null;const r=await navigator.serviceWorker.getRegistration();return r ? r.pushManager.getSubscription() : null;}
function keyBytes(key){return Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-key.length%4)%4)),c=>c.charCodeAt(0));}
async function offerPush(){if(!user||!pushSupported()||!pushKey)return; const id='push-offer-'+user.id; if(sessionStorage.getItem(id))return; sessionStorage.setItem(id,'1'); try{if(!await currentSubscription())openPushSettings();}catch(e){console.warn(e);}}
async function openPushSettings(){
  const d=document.getElementById('push-dialog'), button=document.getElementById('push-activate'), message=document.getElementById('push-error');
  message.textContent=''; button.disabled=false; button.textContent='Aktifkan notifikasi';
  if(!pushSupported()||!pushKey){button.disabled=true;message.textContent='Web Push belum tersedia. Gunakan Chrome pada localhost/HTTPS dan ikuti konfigurasi README. Notifikasi lonceng tetap aktif.';}
  else {try{if(await currentSubscription())button.textContent='Nonaktifkan notifikasi';}catch(e){message.textContent=e.message;}}
  if(!d.open)d.showModal();
  button.onclick=async()=>{button.disabled=true; try{
    let sub=await currentSubscription();
    if(sub){await api('push-unsubscribe',{endpoint:sub.endpoint});await sub.unsubscribe();button.textContent='Aktifkan notifikasi';message.textContent='Push dinonaktifkan pada browser ini.';}
    else {if(await Notification.requestPermission()!=='granted')throw new Error('Izin notifikasi belum diberikan.');await worker();const reg=await navigator.serviceWorker.ready;sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(pushKey)});const json=sub.toJSON();try{await api('push-subscribe',{endpoint:json.endpoint,p256dh:json.keys.p256dh,auth:json.keys.auth});}catch(e){await sub.unsubscribe();throw e;}button.textContent='Nonaktifkan notifikasi';message.textContent='Web Push aktif pada browser ini.';}
    refreshBell();
  }catch(e){message.textContent=e.message;}finally{button.disabled=false;}};
}
async function logoutAccount(){
  let sub=null;try{sub=await currentSubscription();}catch(e){}
  save('logout',sub?{endpoint:sub.endpoint}:{},async()=>{if(sub)try{await sub.unsubscribe();}catch(e){}go('beranda');},'app-error');
}
function startNotificationPolling(){
  setInterval(async()=>{if(!user||requestInProgress||document.hidden)return;requestInProgress=true;try{const old=user.id, before=JSON.stringify(reports);await api();if(!user||user.id!==old){render();return;}const route=location.hash.slice(1).split('/')[0];if(before!==JSON.stringify(reports)&&(route==='dashboard'||(route==='laporan'&&user.role==='mahasiswa')))render();refreshBell();if(document.getElementById('notification-dialog').open)paintNotifications();}catch(e){}finally{requestInProgress=false;}},15000);
}
