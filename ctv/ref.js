/* EYEMEDI – ghi nhớ mã cộng tác viên (?ref=MA) trong 30 ngày và báo đơn hàng về hệ thống CTV.
   Gắn vào mọi trang:  <script src="/ctv/ref.js" defer></script>  */
(function(){
  var KEY='eyemedi_ref',DAYS=30;
  try{
    var m=location.search.match(/[?&]ref=([A-Za-z0-9]{4,12})/);
    if(m)localStorage.setItem(KEY,JSON.stringify({c:m[1].toUpperCase(),t:Date.now()}));
  }catch(e){}
  if(!window.CTV_API){var s=document.createElement('script');s.src='/ctv/config.js';document.head.appendChild(s);}
  window.EyemediCTV={
    ref:function(){try{var v=JSON.parse(localStorage.getItem(KEY)||'null');
      if(v&&Date.now()-v.t<DAYS*864e5)return v.c;localStorage.removeItem(KEY)}catch(e){}return ''},
    track:function(o){try{var api=window.CTV_API;if(!api||api.indexOf('http')!==0)return;o.action='recordOrder';o.ref=this.ref();if(!o.ref)return;
      fetch(api,{method:'POST',mode:'no-cors',keepalive:true,headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(o)})}catch(e){}}
  };
})();
