/* Gọi máy chủ Apps Script. Dùng text/plain để không bị chặn CORS. */
(function(){
  var KEY='eyemedi_ctv_token';
  function tok(){try{return localStorage.getItem(KEY)||''}catch(e){return ''}}
  window.CTV={
    token:tok,
    setToken:function(t){try{t?localStorage.setItem(KEY,t):localStorage.removeItem(KEY)}catch(e){}},
    call:function(action,data){
      if(!window.CTV_API||window.CTV_API.indexOf('http')!==0)return Promise.reject(new Error('Chưa cấu hình máy chủ (ctv/config.js)'));
      var body=Object.assign({action:action,token:tok()},data||{});
      return fetch(window.CTV_API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)})
        .then(function(r){return r.json()})
        .then(function(j){if(!j.ok){var e=new Error(j.error||'Có lỗi xảy ra');if(/đăng nhập lại/.test(j.error||''))CTV.setToken('');throw e}return j.data});
    },
    money:function(n){return new Intl.NumberFormat('vi-VN').format(Math.round(Number(n)||0))+'đ'},
    esc:function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})},
    msg:function(el,text,ok){if(!el)return;el.textContent=text||'';el.className='msg'+(text?' show '+(ok?'okm':'err'):'')},
    busy:function(btn,on,label){if(!btn)return;if(on){btn.dataset.l=btn.textContent;btn.textContent=label||'Đang xử lý…';btn.disabled=true}else{btn.textContent=btn.dataset.l||btn.textContent;btn.disabled=false}},
    STATUS:{pending:['Chờ duyệt','warn'],approved:['Đã duyệt – chờ ký HĐ','warn'],signed:['Đã ký HĐ – chờ đặt mẫu','warn'],
      sample_ordered:['Đã đặt mẫu – chờ giao','warn'],sample_received:['Đã nhận mẫu – chờ gửi video','warn'],
      video_submitted:['Đã gửi video – chờ duyệt','warn'],active:['Đang hoạt động','ok'],rejected:['Từ chối','bad'],locked:['Đã khóa','bad']},
    ORDER:{new:['Mới','warn'],confirmed:['Đã xác nhận','warn'],delivered:['Đã giao','ok'],cancelled:['Đã hủy','bad'],returned:['Hoàn trả','bad']},
    pill:function(map,k){var v=map[k]||[k,''];return '<span class="pill '+v[1]+'">'+CTV.esc(v[0])+'</span>'}
  };
})();
