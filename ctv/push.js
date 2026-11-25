/* EYEMEDI CTV – thông báo đẩy về điện thoại qua OneSignal. Chỉ chạy khi config.js có ONESIGNAL_APP_ID. */
(function(){
  var loaded=false,uid='';
  function on(){return !!window.ONESIGNAL_APP_ID}
  function iOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
  function standalone(){return window.matchMedia&&matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
  function q(fn){window.OneSignalDeferred=window.OneSignalDeferred||[];OneSignalDeferred.push(fn)}
  function load(){if(loaded||!on())return;loaded=true;
    var s=document.createElement('script');s.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';s.defer=true;document.head.appendChild(s);
    q(function(OS){return OS.init({appId:window.ONESIGNAL_APP_ID,serviceWorkerPath:'ctv/sw.js',serviceWorkerParam:{scope:'/ctv/'},
      allowLocalhostAsSecureOrigin:true,notifyButton:{enable:false},promptOptions:{autoPrompt:false}})})}
  window.CTVPush={
    available:on,
    /* 'on' đã bật, 'off' chưa bật, 'blocked' đã chặn, 'ios-home' iPhone cần thêm vào màn hình chính, 'na' không hỗ trợ */
    state:function(){if(!on())return 'na';if(iOS()&&!standalone())return 'ios-home';if(!('Notification' in window))return 'na';
      return Notification.permission==='granted'?'on':Notification.permission==='denied'?'blocked':'off'},
    init:function(id){if(!on()||!id)return;uid=String(id);load();q(function(OS){return OS.login(uid)})},
    enable:function(){if(!on())return Promise.resolve('na');load();
      return new Promise(function(res){q(function(OS){return OS.Notifications.requestPermission().then(function(){if(uid)OS.login(uid);res(CTVPush.state())},function(){res(CTVPush.state())})})})},
    logout:function(){if(!on()||!loaded)return;q(function(OS){return OS.logout()})},
    hint:function(st){return {'ios-home':'Trên iPhone, hãy thêm app vào Màn hình chính rồi mở app để bật thông báo.',
      blocked:'Bạn đã chặn thông báo. Vào Cài đặt của trình duyệt/điện thoại để cho phép lại.',na:'Thiết bị này chưa hỗ trợ thông báo đẩy.'}[st]||''}
  };
})();
