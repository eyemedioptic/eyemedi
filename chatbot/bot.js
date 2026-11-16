/* EYEMEDI chatbot – trả lời tự động theo dữ liệu /chatbot/du-lieu.json */
(function(){
if(window.__emBot)return;window.__emBot=1;
var HL='0967 190 005',ZALO='https://zalo.me/0967190005',D=null,last=null;
var STOP={kinh:1,mat:1,nam:1,nu:1,gong:1,can:1,trong:1,mau:1,lens:1,cho:1,the:1,va:1,voi:1,loai:1,chong:1,anh:1,sang:1,xanh:1,tre:1,em:1,nhat:1,re:1,gia:1,tien:1,lau:1,bao:1,hanh:1,quan:1,nao:1,khong:1,co:1,giup:1,shop:1};
function nm(s){return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'d').toLowerCase().replace(/[^a-z0-9.]+/g,' ').trim();}
function has(q,w){return (' '+q+' ').indexOf(' '+w+' ')>=0;}
var DF={};
function prep(){D.sp.forEach(function(p){p._n=nm(p.n);p._c=nm(p.c);var t={};nm(p.n+' '+p.kw).split(' ').forEach(function(w){if(w.length>=3&&!STOP[w])t[w]=1});p._t=Object.keys(t);p._t.forEach(function(w){DF[w]=(DF[w]||0)+1})});prepTr();
D.chung.forEach(function(g){g._k=String(g.kw).split(';').map(nm).filter(function(x){return x&&x!=='(mac dinh)'})});}
function findSp(q){var best=[],bs=0;D.sp.forEach(function(p){var s=0;
 if(p._c.length>=3&&(has(q,p._c)||(/\d/.test(p._c)&&q.replace(/ /g,'').indexOf(p._c.replace(/ /g,''))>=0)))s+=5;
 p._t.forEach(function(w){if(has(q,w)&&DF[w]<=4)s+=1/DF[w]});
 if(s>bs+1e-9){bs=s;best=[p]}else if(s>0&&Math.abs(s-bs)<1e-9)best.push(p)});
 return {l:bs>=0.5?best:[],s:bs};}
var INT=[['mau',['mau','phan loai','loai nao']],['gia',['gia','bao nhieu','bn','sale','giam gia','khuyen mai','tien']],['ts',['thong so','kich thuoc','size','rong','ngang']],['cl',['chat lieu','lam bang','titan','nhua','kim loai']],['mt',['dac diem','mo ta','noi bat','the nao','ra sao','tot khong','review']],['mua',['mua','dat','order','o dau','ship','giao']]];
function intent(q){for(var i=0;i<INT.length;i++)for(var j=0;j<INT[i][1].length;j++)if(has(q,INT[i][1][j])||q.indexOf(INT[i][1][j]+' ')===0)return INT[i][0];return null;}
var CAT=[['Kính áp tròng',['lens','ap trong','kinh ap']],['Tròng kính mắt',['trong kinh','da trong','trong 1.','chiet suat','doi mau']],['Phụ kiện mắt kính',['phu kien','hop dung','khan lau','nuoc ve sinh','dem mui','boc duoi']],['Kính thời trang',['kinh mat','kinh ram','kinh thoi trang','xuyen dem','di nang','kinh rb','phan cuc']],['Gọng kính cận',['gong','kinh can']]];
function cat(q){for(var i=0;i<CAT.length;i++)for(var j=0;j<CAT[i][1].length;j++)if(q.indexOf(CAT[i][1][j])>=0)return CAT[i][0];return null;}
function vnd(n){return n.toLocaleString('vi-VN')+'đ';}
function general(q){var b=null,bl=0;D.chung.forEach(function(g){g._k.forEach(function(k){if(k&&k.length>=4&&(has(q,k)||q.indexOf(k)>=0)&&k.length>bl){bl=k.length;b=g}})});return b;}
function answer(raw){var q=nm(raw);if(!q)return {t:'Anh/chị cần em hỗ trợ gì ạ?'};
 if(/^(hi|hello|chao|alo|xin chao|shop oi|ad oi)\b/.test(q)&&q.split(' ').length<=3)return {t:'Dạ EYEMEDI xin chào anh/chị! Em có thể báo giá, thông số, chất liệu sản phẩm, địa chỉ cửa hàng, đo mắt miễn phí, giao hàng và bảo hành ạ.',c:CHIPS};
 if(/dat lich|do mat|kiem tra thi luc|do khuc xa|do thi luc/.test(q)){var gd=D.chung.filter(function(x){return x.g==='Dịch vụ'})[0];if(gd)return {t:gd.a};}
 var dd=parseDo(raw);if(dd&&(/trong|kinh|can|vien|loan|lao|do/.test(q)||/[+-]\d/.test(raw))&&!/ap trong|lens/.test(q))return trByDo(q,dd);
 var TF=trFind(q);if(TF.length===1)return trInfo(TF[0]);if(TF.length>1&&TF.length<=6)return {t:'Em tìm thấy '+TF.length+' loại tròng phù hợp, anh/chị chọn giúp em:',c:TF.map(function(t){return t.n})};
 var TL=trList(q);if(TL)return TL;
 var g0=general(q);if(g0&&g0.g==='Tròng kính')return {t:g0.a};
 var F=findSp(q),sp=F.l,it=intent(q),g=general(q),cg=cat(q);
 if(F.s<5&&F.s<1&&(g||cg))sp=[];
 if(sp.length===1){if(it){last=sp[0];return {t:sp[0].a[it]};}return spAns(sp[0]);}
 if(sp.length>1&&sp.length<=6){return {t:'Em tìm thấy '+sp.length+' sản phẩm phù hợp, anh/chị chọn giúp em nhé:',c:sp.map(function(p){return p.n})};}
 if(g&&!(cg&&it==='gia'))return {t:g.a};
 if(!cg&&last&&it){return {t:last.a[it]};}
 if(cg){var l=D.sp.filter(function(p){return p.cat===cg});var tk=q.split(' ').filter(function(w){return w.length>=3&&!STOP[w]&&['kinh','xem','muon','tim','can'].indexOf(w)<0});var f=l.filter(function(p){return tk.some(function(w){return has(p._n,w)})});if(f.length)l=f;
  if(/re nhat|gia re|thap nhat/.test(q))l=l.slice().sort(function(a,b){return a.p-b.p});
  var cnt={};D.sp.forEach(function(p){cnt[p.c]=(cnt[p.c]||0)+1});
  var ch=l.map(function(p){var lb=p.c;if(/^(KAT|TMK|PK)-/.test(p.c)||!p.c||p.c==='—')lb=p.n;else if(cnt[p.c]>1){var o=D.sp.filter(function(q){return q!==p&&q.c===p.c}).map(function(q){return q.n}).join(' ').split(' ');var w=p.n.split(' ').filter(function(x){return o.indexOf(x)<0&&x!==p.c})[0];lb=p.c+(w?' '+w:'');}return {l:lb,p:p}});
  return {t:'',c:ch,pg:1};}
 if(g)return {t:g.a};
 var fb=D.chung.filter(function(x){return x.g==='Ngoài phạm vi'})[0];
 return {t:fb?fb.a:'Anh/chị vui lòng gọi/Zalo '+HL+' để được tư vấn ạ.',c:['Gọi/Zalo tư vấn']};}

/* ---- Tròng kính ---- */
var TRS={trong:1,kinh:1,dat:1,theo:1,don:1,'new':1,va:1,'(dat':1,'don)':1};
function prepTr(){(D.tr||[]).forEach(function(t){t._n=nm(t.n);t._t=t._n.split(' ').filter(function(w){return w.length>=2&&!TRS[w]});t._b=nm(t.b)})}
function trFind(q){var best=[],bs=0;(D.tr||[]).forEach(function(t){var s=0,hb=has(q,t._b),hc=has(q,t.cs);t._t.forEach(function(w){if(has(q,w))s++});if(hc)s+=0.5;if(!(hb||hc))s=0;if(s>bs){bs=s;best=[t]}else if(s>0&&s===bs)best.push(t)});return bs>=2?best:[];}
function parseDo(raw){var s=raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/,/g,'.');
 var o={},m,re=/(can|vien|loan|lao|add|cong)\s*(?:thi|do|la|:)?\s*(\d+(?:\.\d+)?)/g;
 while(m=re.exec(s)){var x=parseFloat(m[2]);if(x>30)continue;if(m[1]==='can')o.s=-x;else if(m[1]==='vien')o.s=x;else if(m[1]==='loan')o.c=x;else o.a=x;}
 var sg=s.match(/(^|[\s(\/])([+-]\d{1,2}(?:\.\d{1,2})?)(?=$|[\s)\/])/g);
 if(sg){sg=sg.map(function(x){return parseFloat(x.replace(/[\s(\/]/g,''))});if(o.s==null)o.s=sg[0];if(o.c==null&&sg.length>1)o.c=Math.abs(sg[1]);}
 if(o.s==null&&o.c==null&&o.a==null)return null;if(o.s==null)o.s=0;if(o.c==null)o.c=0;return o;}
function inR(x,r){return r&&x>=r[0]-1e-6&&x<=r[1]+1e-6}
function trByDo(q,d,force){var wantDa=/da trong|lao|progressive/.test(q)||d.a!=null,wantHai=/hai trong|2 trong|flat/.test(q),dm=/doi mau|photo|ra nang/.test(q),asx=/anh sang xanh|blue|asx/.test(q),be=/chong be|chong vo|poly|duramax/.test(q),dat=force||/dat theo don|rx/.test(q);
 var br=['chemi','zinmy','hoga'].filter(function(b){return has(q,b)})[0];
 var out=[];(D.tr||[]).forEach(function(t){if(br&&t._b!==br)return;
  if(t.g==='Đặt theo đơn'&&!dat)return;if(dat&&t.g!=='Đặt theo đơn')return;
  var isDa=t.g==='Đa tròng',isHai=t.g==='Hai tròng';
  if(wantHai?!isHai:(wantDa?!isDa:(isDa||isHai)))return;
  var txt=nm(t.n+' '+t.mt);if(dm&&!/doi mau|photo/.test(txt))return;if(asx&&!/anh sang xanh|blue/.test(txt))return;if(be&&!/poly|duramax|chong be/.test(nm(t.n+' '+t.cl+' '+t.mt)))return;
  var bp=null;t.r.forEach(function(r){if(!r[3])return;if(!inR(d.s,r[0]))return;if(!(isDa||isHai||t.g==='Đặt theo đơn')&&!inR(d.c,r[1]))return;if((isDa||isHai)&&d.a!=null&&r[2]&&!inR(d.a,r[2]))return;if(bp==null||r[3]<bp)bp=r[3]});
  if(bp!=null)out.push([t,bp])});
 var ds='S '+(d.s>0?'+':'')+d.s.toFixed(2)+(d.c?' / C -'+d.c.toFixed(2):'')+(d.a!=null?' / Add +'+d.a.toFixed(2):'');
 if(!out.length&&!dat)return trByDo(q,d,1);
 if(!out.length)return {t:'Với độ '+ds+', em chưa tìm thấy tròng có sẵn phù hợp'+(dm||asx||br?' theo yêu cầu':'')+'. Độ cao/đặc biệt có thể đặt tròng theo đơn (Zinmy RX, giao 10 ngày). Anh/chị gọi/Zalo '+HL+' để được tư vấn ạ.',c:['Gọi/Zalo tư vấn']};
 out.sort(function(a,b){return a[1]-b[1]});
 return {t:'Với độ '+ds+(dat&&!/dat theo don|rx/.test(q)?', tròng có sẵn không làm được – có thể đặt tròng theo đơn Zinmy (giao 10 ngày)':', có '+out.length+' loại tròng làm được')+' (giá/cặp, nhân viên xác nhận lại theo toa):',c:out.map(function(x){return {l:trShort(x[0].n)+' · '+(x[1]>=1e6?(x[1]/1e6).toLocaleString('vi-VN')+'tr':(x[1]/1e3)+'k'),tr:x[0]}}),pg:1};}
function spAns(p){last=p;return {t:p.a.gia+'\n'+p.a.mt,c:['Thông số','Chất liệu','Màu / phân loại','Đặt mua']};}

function trShort(n){return n.replace(/(Coated|\(NEW\)|\(đặt theo đơn\))\s*/g,'').replace(/ SHMC\b/,'').replace(/\s+/g,' ').trim();}
function trMin(t){var m=null;t.r.forEach(function(r){if(r[3]&&(m==null||r[3]<m))m=r[3]});return m||0;}
var TRQ=[[/anh sang xanh|blue cut|asx/,function(t){return t.g!=='Đa tròng'&&t.g!=='Hai tròng'&&t.g!=='Đặt theo đơn'&&/blue|anh sang xanh/.test(nm(t.n+' '+t.mt))}],
[/doi mau|photo|ra nang/,function(t){return t.g==='Đổi màu'}],
[/da trong|lao thi|progressive/,function(t){return t.g==='Đa tròng'}],
[/hai trong|flat top|2 trong/,function(t){return t.g==='Hai tròng'}],
[/chong be|chong vo|polycarbonate|duramax/,function(t){return /poly|duramax/.test(nm(t.cl))&&t.g!=='Đặt theo đơn'}],
[/re nhat|gia re|binh dan/,function(t){return t.g==='Đơn tròng'||t.g==='Lọc ánh sáng xanh'}],
[/can nang|sieu mong|mong nhat|1\.74|tren 10/,function(t){return (t.cs==='1.67'||t.cs==='1.74')&&t.g!=='Đa tròng'&&t.g!=='Đặt theo đơn'}]];
function trList(q){if(!/trong|lens|kinh|asx|blue|photo|progressive|flat|poly|duramax|doi mau|chong be/.test(q))return null;for(var i=0;i<TRQ.length;i++)if(TRQ[i][0].test(q)){var l=(D.tr||[]).filter(TRQ[i][1]).sort(function(a,b){return trMin(a)-trMin(b)});if(l.length)return {t:'',c:l.map(function(t){return {l:trShort(t.n),tr:t}}),pg:1};}return null;}
function trInfo(t){return {t:t.mt+'\n'+t.gia};}
var CHIPS=['Kính mát','Kính gọng','Tròng kính mắt','Đặt lịch đo mắt','Địa chỉ cửa hàng','Bảo hành'];
var css='#emb-btn{position:fixed;right:20px;bottom:96px;z-index:100000;width:56px;height:56px;border-radius:50%;border:0;background:linear-gradient(135deg,#0b8f8c,#073a3c);color:#fff;box-shadow:0 6px 18px rgba(7,58,60,.4);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}'+
'#emb-btn svg{width:28px;height:28px;fill:#fff}#emb-btn .emb-dot{position:absolute;top:2px;right:2px;width:13px;height:13px;border-radius:50%;background:#e8262f;border:2px solid #fff}'+
'.float-contact #emb-btn{position:relative;right:auto;bottom:auto;width:52px;height:52px}'+
'#emb-box{position:fixed;right:16px;bottom:16px;z-index:100001;width:min(370px,calc(100vw - 24px));height:min(560px,calc(100vh - 32px));background:#fff;border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.28);display:none;flex-direction:column;overflow:hidden;font-family:Arial,Helvetica,sans-serif}'+
'#emb-box.on{display:flex}#emb-hd{background:#073a3c;color:#fff;padding:12px 14px;display:flex;align-items:center;gap:10px}#emb-hd b{display:block;font-size:15px}#emb-hd small{font-size:12px;opacity:.85}#emb-x{margin-left:auto;background:none;border:0;color:#fff;font-size:26px;line-height:1;cursor:pointer}'+
'#emb-ms{flex:1;overflow-y:auto;padding:12px;background:#f3f7f7;display:flex;flex-direction:column;gap:8px}.emb-m{max-width:86%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-line;word-wrap:break-word}.emb-b{background:#fff;color:#16302f;border:1px solid #dfe9e9;align-self:flex-start;border-bottom-left-radius:4px}.emb-u{background:#0b6e6c;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}.emb-m a{color:#0a7c79;font-weight:700;word-break:break-all}.emb-u a{color:#fff}'+
'#emb-ms>*{flex-shrink:0}.emb-cs{display:flex;flex-wrap:wrap;gap:6px}.emb-pg{flex-wrap:nowrap;overflow:hidden}.emb-pg .emb-c{flex:0 0 auto;white-space:nowrap;padding:6px 9px;max-width:calc(100% - 104px);overflow:hidden;text-overflow:ellipsis}.emb-pg .emb-nav{max-width:none}.emb-nav{background:#0b8f8c!important;color:#fff!important;font-weight:700}.emb-c{border:1px solid #0b8f8c;background:#fff;color:#0b6e6c;border-radius:999px;padding:6px 11px;font-size:13px;cursor:pointer}'+
'#emb-f{display:flex;gap:6px;padding:10px;border-top:1px solid #e3eded;background:#fff}#emb-in{flex:1;border:1px solid #cfdede;border-radius:999px;padding:10px 14px;font-size:14px;outline:none;min-width:0}#emb-go{border:0;background:#0b8f8c;color:#fff;border-radius:999px;padding:0 16px;font-weight:700;cursor:pointer}'+
'body.emb-open .float-contact,body.emb-open .messenger-float{visibility:hidden}@media(max-width:480px){#emb-box{right:8px;bottom:8px;width:calc(100vw - 16px);height:calc(100vh - 16px);height:calc(100dvh - 16px)}}'+
'#emb-ft{font-size:11px;color:#6a8584;text-align:center;padding:0 0 8px;background:#fff}#emb-ft a{color:#0b6e6c}';
function el(t,a,h){var e=document.createElement(t);for(var k in a)e.setAttribute(k,a[k]);if(h!=null)e.innerHTML=h;return e;}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function link(s){return esc(s).replace(/(https?:\/\/[^\s)]+)/g,function(u){var v=u.replace(/[.,;]+$/,''),r=u.slice(v.length);return '<a href="'+v+'"'+(v.indexOf('eyemedi.vn')<0?' target="_blank" rel="noopener"':'')+'>'+v.replace('https://','')+'</a>'+r})}
var box,ms,inp;
function chipBtn(x){var lb=typeof x==='string'?x:x.l,b=el('button',{type:'button','class':'emb-c'},esc(lb));b.onclick=function(){if(x.u){window.open(x.u,'_self');return;}if(x.tr){add(lb,1);setTimeout(function(){var r=trInfo(x.tr);add(r.t,0,r.c)},250);return;}if(x.p){add(lb,1);setTimeout(function(){var r=spAns(x.p);add(r.t,0,r.c)},250);return;}send(x)};return b;}
function pager(items){var c=el('div',{'class':'emb-cs emb-pg'});ms.appendChild(c);
 var W=c.clientWidth||300,G=6,ws=items.map(function(x){var b=chipBtn(x);c.appendChild(b);var w=b.offsetWidth+G;c.removeChild(b);return w});
 var nb=el('button',{type:'button','class':'emb-c emb-nav'},'Thêm ›');c.appendChild(nb);var NW=nb.offsetWidth+G;c.removeChild(nb);
 var bb=el('button',{type:'button','class':'emb-c emb-nav'},'←');c.appendChild(bb);var BW=bb.offsetWidth+G;c.removeChild(bb);
 var pages=[],i=0;while(i<items.length){var cap=W-(pages.length?BW:0),cur=[],w=0;
  while(i<items.length){var need=w+ws[i]+((i<items.length-1)?NW:0);if(cur.length&&need>cap)break;cur.push(items[i]);w+=ws[i];i++;}
  pages.push(cur);}
 function show(k){c.innerHTML='';if(k>0){var b=el('button',{type:'button','class':'emb-c emb-nav'},'←');b.onclick=function(){show(k-1)};c.appendChild(b);}
  pages[k].forEach(function(x){c.appendChild(chipBtn(x))});
  if(k<pages.length-1){var n=el('button',{type:'button','class':'emb-c emb-nav'},'Thêm ›');n.onclick=function(){show(k+1)};c.appendChild(n);}}
 show(0);}

function add(t,who,chips,pg){if(t){var m=el('div',{'class':'emb-m '+(who?'emb-u':'emb-b')},who?esc(t):link(t));ms.appendChild(m);}
 if(chips&&chips.length&&pg){pager(chips);ms.scrollTop=ms.scrollHeight;return;}
 if(chips&&chips.length){var c=el('div',{'class':'emb-cs'});chips.forEach(function(x){c.appendChild(chipBtn(x))});ms.appendChild(c)}
 ms.scrollTop=ms.scrollHeight;}
function send(t){t=String(t).trim();if(!t)return;add(t,1);
 if(t==='Gọi/Zalo tư vấn'){window.open(ZALO,'_blank');return;}
 if(t==='Tròng kính mắt'){setTimeout(function(){add('EYEMEDI có tròng Chemi, Zinmy, Hoga: đơn tròng, chống ánh sáng xanh, đổi màu, đa tròng, hai tròng, chống bể, tròng đặt theo đơn.\nAnh/chị gõ độ để em lọc tròng phù hợp, ví dụ: "cận 3 loạn 1", "viễn 2", "cận 5 đổi màu", "lão 2 đa tròng". Hoặc chọn nhanh:',0,['Tròng chống ánh sáng xanh','Tròng đổi màu','Đa tròng','Hai tròng','Tròng chống bể'])},250);return;}
 var map={'Thông số':'thong so','Chất liệu':'chat lieu','Màu / phân loại':'mau','Đặt mua':'dat mua'};
 setTimeout(function(){if(!D){add('Dữ liệu đang tải, anh/chị thử lại sau vài giây ạ.');return;}
  var r=map[t]&&last?{t:last.a[{'Thông số':'ts','Chất liệu':'cl','Màu / phân loại':'mau','Đặt mua':'mua'}[t]]}:answer(t);add(r.t,0,r.c,r.pg)},250);}
function load(cb){if(D)return cb();fetch('/chatbot/du-lieu.json',{cache:'no-cache'}).then(function(r){return r.json()}).then(function(j){D=j;prep();cb()}).catch(function(){})}
function ui(){var st=el('style',{id:'emb-css'},css);document.head.appendChild(st);
 var btn=el('button',{id:'emb-btn',type:'button','aria-label':'Chat với EYEMEDI'},'<svg viewBox="0 0 24 24"><path d="M12 3C6.5 3 2 6.9 2 11.7c0 2.6 1.3 4.9 3.4 6.5L4.6 22l4.2-2.2c1 .3 2.1.4 3.2.4 5.5 0 10-3.9 10-8.6S17.5 3 12 3zm-4 9.9a1.3 1.3 0 110-2.6 1.3 1.3 0 010 2.6zm4 0a1.3 1.3 0 110-2.6 1.3 1.3 0 010 2.6zm4 0a1.3 1.3 0 110-2.6 1.3 1.3 0 010 2.6z"/></svg><span class="emb-dot"></span>');
 var fc=document.querySelector('.float-contact');if(fc)fc.insertBefore(btn,fc.firstChild);else document.body.appendChild(btn);
 if(!fc&&!document.querySelector('.messenger-float'))btn.style.bottom='20px';
 box=el('div',{id:'emb-box',role:'dialog','aria-label':'Chatbot EYEMEDI'},'<div id="emb-hd"><svg viewBox="0 0 24 24" width="30" height="30"><circle cx="12" cy="12" r="12" fill="#0b8f8c"/><path fill="#fff" d="M12 7c-3.6 0-6.5 2.4-6.5 5s2.9 5 6.5 5 6.5-2.4 6.5-5-2.9-5-6.5-5zm0 8a3 3 0 110-6 3 3 0 010 6z"/></svg><div><b>EYEMEDI tư vấn</b><small>Trả lời tự động 24/7</small></div><button id="emb-x" type="button" aria-label="Đóng">×</button></div><div id="emb-ms"></div><form id="emb-f"><input id="emb-in" autocomplete="off" placeholder="Nhập câu hỏi, tên hoặc mã sản phẩm…"><button id="emb-go" type="submit">Gửi</button></form><div id="emb-ft">Cần gặp nhân viên? <a href="'+ZALO+'" target="_blank" rel="noopener">Zalo '+HL+'</a></div>');
 document.body.appendChild(box);ms=box.querySelector('#emb-ms');inp=box.querySelector('#emb-in');var started=0;
 btn.onclick=function(){box.classList.add('on');document.body.classList.add('emb-open');btn.querySelector('.emb-dot').style.display='none';load(function(){});if(!started){started=1;add('Dạ EYEMEDI xin chào anh/chị! Anh/chị có thể hỏi giá, thông số, chất liệu, màu của sản phẩm (gõ tên hoặc mã), hoặc chọn nhanh bên dưới:',0,CHIPS)}setTimeout(function(){inp.focus()},50)};
 box.querySelector('#emb-x').onclick=function(){box.classList.remove('on');document.body.classList.remove('emb-open')};
 box.querySelector('#emb-f').onsubmit=function(e){e.preventDefault();var v=inp.value;inp.value='';load(function(){});send(v)};}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ui);else ui();
window.emBotAnswer=function(q,cb){load(function(){cb(answer(q))})};
})();
