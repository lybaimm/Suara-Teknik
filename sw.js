'use strict';
self.addEventListener('push', event => {
  let data={};try{data=event.data?.json()||{};}catch(e){}
  const code=/^ST-[0-9]{3,10}$/.test(data.reportCode||'')?data.reportCode:'';
  event.waitUntil(self.registration.showNotification('Suara Teknik',{body:'Ada pembaruan pada akunmu. Buka Suara Teknik untuk melihat detail.',icon:'assets/push-icon.png',data:{code}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();const code=event.notification.data?.code;const url=new URL('index.html'+(code?'#laporan/'+code:'#dashboard'),self.registration.scope).href;
  event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if(client.url.startsWith(self.registration.scope)){await client.navigate(url);return client.focus();}}return self.clients.openWindow(url);})());
});
