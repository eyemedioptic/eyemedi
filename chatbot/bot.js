/* EYEMEDI chatbot – trả lời tự động theo dữ liệu /chatbot/du-lieu.json */
(function(){
if(window.__emBot)return;window.__emBot=1;
var HL='0967 190 005',ZALO='https://zalo.me/0967190005',D=null,last=null;
var STOP={kinh:1,mat:1,nam:1,nu:1,gong:1,can:1,trong:1,mau:1,lens:1,cho:1,the:1,va:1,voi:1,loai:1,chong:1,anh:1,sang:1,xanh:1,tre:1,em:1,nhat:1,re:1,gia:1,tien:1,lau:1,bao:1,hanh:1,quan:1,nao:1,khong:1,co:1,giup:1,shop:1,toan:1,dien:1,the:1,thanh:1,duoc:1,cho:1,mua:1,ban:1,hang:1,cua:1,nhu:1,sao:1,tot:1,dep:1,moi:1,cao:1,cap:1};
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
var INT=[['mau',['mau','phan loai','loai nao']],['gia',['gia','bao nhieu','bn','sale','giam gia','khuyen mai','tien']],['ts',['thong so','kich thuoc','size','rong','ngang']],['cl',['chat lieu','lam bang','titan','nhua','kim loai']],['mt',['dac diem','mo ta','noi bat','review']],['mua',['mua','dat','order','o dau','ship','giao']]];
function intent(q){for(var i=0;i<INT.length;i++)for(var j=0;j<INT[i][1].length;j++)if(has(q,INT[i][1][j])||q.indexOf(INT[i][1][j]+' ')===0)return INT[i][0];return null;}
var CAT=[['Kính áp tròng',['lens','ap trong','kinh ap']],['Tròng kính mắt',['trong kinh','da trong','trong 1.','chiet suat','doi mau']],['Phụ kiện mắt kính',['phu kien','hop dung','khan lau','nuoc ve sinh','dem mui','boc duoi']],['Kính thời trang',['kinh mat','kinh ram','kinh thoi trang','xuyen dem','di nang','kinh rb','phan cuc']],['Gọng kính cận',['gong','kinh can']]];
function cat(q){for(var i=0;i<CAT.length;i++)for(var j=0;j<CAT[i][1].length;j++)if(q.indexOf(CAT[i][1][j])>=0)return CAT[i][0];return null;}
function vnd(n){return n.toLocaleString('vi-VN')+'đ';}
function general(q){var b=null,bl=0;D.chung.forEach(function(g){g._k.forEach(function(k){if(k&&k.length>=4&&(has(q,k)||q.indexOf(k)>=0)&&k.length>bl){bl=k.length;b=g}})});return b;}
function answer(raw){var q=nm(raw);if(!q)return {t:'Anh/chị cần em hỗ trợ gì ạ?'};
 if(/^(hi|hello|chao|alo|xin chao|shop oi|ad oi)\b/.test(q)&&q.split(' ').length<=3)return {t:'Dạ EYEMEDI xin chào anh/chị! Em có thể báo giá, thông số, chất liệu sản phẩm, địa chỉ cửa hàng, đo mắt miễn phí, giao hàng và bảo hành ạ.',c:CHIPS};
 if(/dat lich|do mat|kiem tra thi luc|do khuc xa|do thi luc/.test(q))return {t:'EYEMEDI đo mắt, kiểm tra thị lực miễn phí (08:30 – 21:30 hằng ngày). Anh/chị nhập thông tin để đặt lịch nhé:',book:1};
 var dd=parseDo(raw);if(dd&&(/trong|kinh|can|vien|loan|lao|do/.test(q)||/[+-]\d/.test(raw))&&!/ap trong|lens/.test(q))return trByDo(q,dd);
 var TF=trFind(q);if(TF.length===1)return trInfo(TF[0]);if(TF.length>1&&TF.length<=8)return {t:'Anh/chị chọn loại tròng:',c:TF.map(function(t){return {l:trShort(t.n),tr:t}}),pg:1};
 var TL=trList(q);if(TL)return TL;
 var g0=general(q);if(g0&&g0.g==='Tròng kính')return {t:g0.a};
 var F=findSp(q),sp=F.l,it=intent(q),g=general(q),cg=cat(q);
 if(F.s<5&&F.s<1&&(g||cg))sp=[];
 if(sp.length===1){if(it==='mua'&&sp[0].id){last=sp[0];return {order:sp[0]};}if(it){last=sp[0];return {t:spPart(sp[0],it),c:SPCH};}return spAns(sp[0]);}
 if(sp.length>1&&sp.length<=8){return {t:'Anh/chị chọn mẫu:',c:sp.map(function(p){return {l:p.n,p:p}}),pg:1};}
 if(g&&!(cg&&it==='gia'))return {t:g.a};
 if(!cg&&last&&it&&q.split(' ').length<=6&&!/thanh toan|tra gop|chuyen khoan|cod|ship|giao/.test(q)){return {t:spPart(last,it),c:SPCH};}
 if(cg){var l=D.sp.filter(function(p){return p.cat===cg});var tk=q.split(' ').filter(function(w){return w.length>=3&&!STOP[w]&&['kinh','xem','muon','tim','can'].indexOf(w)<0});var f=l.filter(function(p){return tk.some(function(w){return has(p._n,w)})});if(f.length)l=f;
  if(/re nhat|gia re|thap nhat/.test(q))l=l.slice().sort(function(a,b){return a.p-b.p});
  var cnt={};D.sp.forEach(function(p){cnt[p.c]=(cnt[p.c]||0)+1});
  var ch=l.map(function(p){var lb=p.c;if(/^(KAT|TMK|PK)-/.test(p.c)||!p.c||p.c==='—')lb=p.n;else if(cnt[p.c]>1){var o=D.sp.filter(function(q){return q!==p&&q.c===p.c}).map(function(q){return q.n}).join(' ').split(' ');var w=p.n.split(' ').filter(function(x){return o.indexOf(x)<0&&x!==p.c})[0];lb=p.c+(w?' '+w:'');}return {l:lb,p:p}});
  return {t:'',c:ch,pg:1};}
 if(g)return {t:g.a};
 if(/khuyen mai|sale|giam gia|uu dai|dang giam/.test(q)){var sl=D.sp.filter(function(p){return p.op>p.p}).sort(function(a,b){return (b.op-b.p)/b.op-(a.op-a.p)/a.op});if(sl.length)return {t:'Sản phẩm đang giảm giá:',c:sl.map(function(p){return {l:p.c+' -'+Math.round((p.op-p.p)/p.op*100)+'%',p:p}}),pg:1};}
 if(/\bgia\b|bao nhieu|bang gia|bn tien/.test(q))return {t:'Anh/chị muốn xem giá loại nào ạ?',c:['Kính mát','Kính gọng','Tròng kính mắt']};
 var fb=D.chung.filter(function(x){return x.g==='Ngoài phạm vi'})[0];
 return {t:fb?fb.a:'Dạ EYEMEDI hỗ trợ anh/chị ngay ạ. Anh/chị chọn nhu cầu bên dưới, hoặc gọi/Zalo '+HL+':',c:CHIPS.concat(['Gọi/Zalo tư vấn'])};}

/* ---- Tròng kính ---- */
var TRS={trong:1,kinh:1,dat:1,theo:1,don:1,'new':1,va:1,'(dat':1,'don)':1};
function prepTr(){(D.tr||[]).forEach(function(t){t._n=nm(t.n);t._t=t._n.split(' ').filter(function(w){return w.length>=2&&!TRS[w]});t._b=nm(t.b)})}
function trFind(q){var best=[],bs=0;(D.tr||[]).forEach(function(t){var s=0,hb=has(q,t._b),hc=has(q,t.cs);t._t.forEach(function(w){if(has(q,w))s++});if(hc)s+=0.5;if(!(hb||hc))s=0;if(s>bs){bs=s;best=[t]}else if(s>0&&s===bs)best.push(t)});return bs>=2?best:[];}
function parseDo(raw){var s=raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/,/g,'.');
 var o={},m,re=/(can|vien|loan|lao|add|cong)\s*(?:thi|do|la|:)?\s*[+-]?\s*(\d+(?:\.\d+)?)/g;
 function cv(x){return (x>=50&&x<=3000&&x===Math.round(x))?x/100:x}
 while(m=re.exec(s)){var x=cv(parseFloat(m[2]));if(x>30)continue;if(m[1]==='can')o.s=-x;else if(m[1]==='vien')o.s=x;else if(m[1]==='loan')o.c=x;else o.a=x;}
 var sg=s.replace(/(can|vien|loan|lao|add|cong)\s*(?:thi|do|la|:)?\s*[+-]?\s*\d+(?:\.\d+)?/g,' ').match(/(^|[\s(\/,])([+-]\d{1,4}(?:\.\d{1,2})?)(?=$|[\s)\/,])/g);
 if(sg){sg=sg.map(function(x){var v=parseFloat(x.replace(/[\s(\/,]/g,''));return v<0?-cv(-v):cv(v)}).filter(function(v){return Math.abs(v)<=30});if(!sg.length)sg=null;if(o.s==null)o.s=sg[0];if(o.c==null&&sg.length>1)o.c=Math.abs(sg[1]);}
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
 if(!out.length)return {t:'Với độ '+ds+', EYEMEDI nhận đặt tròng theo đơn riêng cho anh/chị. Anh/chị gọi/Zalo '+HL+' để được báo giá nhanh ạ.',c:['Gọi/Zalo tư vấn','Đặt lịch đo mắt']};
 out.sort(function(a,b){return a[1]-b[1]});
 return {t:'Với độ '+ds+(dat&&!/dat theo don|rx/.test(q)?', tròng có sẵn không làm được – có thể đặt tròng theo đơn Zinmy (giao 10 ngày)':', có '+out.length+' loại tròng làm được')+' (giá/cặp, nhân viên xác nhận lại theo toa):',c:out.map(function(x){return {l:trShort(x[0].n)+' · '+(x[1]>=1e6?(x[1]/1e6).toLocaleString('vi-VN')+'tr':(x[1]/1e3)+'k'),tr:x[0]}}),pg:1};}
function ok2(v){return v&&v!=='—'&&v!=='-'}
function spGia(p){return p.n+'\nMã: '+p.c+'\nGiá: '+vnd(p.p)+(p.op>p.p?' (giá gốc '+vnd(p.op)+')':'');}
function spPart(p,k){if(k==='gia')return spGia(p);if(k==='ts')return ok2(p.sz)?'Kích thước: '+p.sz:'Thông số: liên hệ '+HL+'.';if(k==='cl')return ok2(p.mat)?'Chất liệu: '+p.mat:'Chất liệu: liên hệ '+HL+'.';
 if(k==='mau'){var v=(p.vr||[]).map(function(x){return '• '+x[0]+(x[1]>0?' – '+vnd(x[1]):'')});return v.length?'Phân loại:\n'+v.join('\n'):(ok2(p.col)?'Màu sắc: '+p.col:'Màu sắc: liên hệ '+HL+'.');}
 if(k==='mt')return p.a.mt;return p.a[k];}
var SPCH=['Thông số','Chất liệu','Màu / phân loại','Đặt mua'];
function spAns(p){last=p;setTimeout(histSave,0);var im=p.imgs||[];return {t:spGia(p),c:(im.length>1?['Hình ảnh']:[]).concat(SPCH),im:im.slice(0,1)};}

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
var lastTr=null;
function trInfo(t){lastTr=t;return {t:t.n+'\nGiá: từ '+vnd(trMin(t))+'/cặp',c:['Giá theo độ','Đặc điểm tròng','Chiết suất']};}
function trPart(k){var t=lastTr;if(!t)return 'Anh/chị chọn loại tròng trước ạ.';
 if(k==='Giá theo độ')return t.gia.replace(/^Giá tròng [^\n]*\n/,'');
 if(k==='Đặc điểm tròng')return t.mt;
 return 'Chiết suất: '+t.cs+(t.cl?'\nChất liệu: '+t.cl:'');}
var CHIPS=['Kính mát','Kính gọng','Tròng kính mắt','Đặt lịch đo mắt','Địa chỉ cửa hàng','Bảo hành'];
var css='#emb-btn{position:fixed;right:20px;bottom:96px;z-index:100000;width:56px;height:56px;border-radius:50%;border:0;background:linear-gradient(135deg,#0b8f8c,#073a3c);color:#fff;box-shadow:0 6px 18px rgba(7,58,60,.4);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}'+
'#emb-btn svg{width:28px;height:28px;fill:#fff}#emb-btn .emb-dot{position:absolute;top:2px;right:2px;width:13px;height:13px;border-radius:50%;background:#e8262f;border:2px solid #fff}'+
'.float-contact #emb-btn{position:relative;right:auto;bottom:auto;width:52px;height:52px}'+
'#emb-box{position:fixed;right:16px;bottom:16px;z-index:100001;width:min(370px,calc(100vw - 24px));height:min(560px,calc(100vh - 32px));background:#fff;border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.28);display:none;flex-direction:column;overflow:hidden;font-family:Arial,Helvetica,sans-serif}'+
'#emb-box.on{display:flex}#emb-hd{background:#073a3c;color:#fff;padding:12px 14px;display:flex;align-items:center;gap:10px}#emb-hd b{display:block;font-size:15px}#emb-hd small{font-size:12px;opacity:.85}#emb-x{margin-left:auto;background:none;border:0;color:#fff;font-size:26px;line-height:1;cursor:pointer}'+
'#emb-ms{flex:1;overflow-y:auto;padding:12px;background:#f3f7f7;display:flex;flex-direction:column;gap:8px}.emb-m{max-width:86%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-line;word-wrap:break-word}.emb-b{background:#fff;color:#16302f;border:1px solid #dfe9e9;align-self:flex-start;border-bottom-left-radius:4px}.emb-u{background:#0b6e6c;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}.emb-m a{color:#0a7c79;font-weight:700;word-break:break-all}.emb-u a{color:#fff}'+
'#emb-ms>*{flex-shrink:0}.emb-cs{display:flex;flex-wrap:wrap;gap:6px}.emb-pg{flex-wrap:nowrap;overflow:hidden}.emb-pg .emb-c{flex:0 0 auto;white-space:nowrap;padding:6px 9px;max-width:calc(100% - 104px);overflow:hidden;text-overflow:ellipsis}.emb-pg .emb-nav{max-width:none}.emb-nav{background:#0b8f8c!important;color:#fff!important;font-weight:700}.emb-c{border:1px solid #0b8f8c;background:#fff;color:#0b6e6c;border-radius:999px;padding:6px 11px;font-size:13px;cursor:pointer}'+
'#emb-f{display:flex;gap:6px;padding:10px;border-top:1px solid #e3eded;background:#fff}#emb-in{flex:1;border:1px solid #cfdede;border-radius:999px;padding:10px 14px;font-size:16px;outline:none;min-width:0}#emb-go{flex:0 0 auto;border:0;background:#0b8f8c;color:#fff;border-radius:999px;padding:0 16px;font-weight:700;cursor:pointer}'+
'body.emb-open .float-contact,body.emb-open .messenger-float{visibility:hidden}@media(max-width:480px){#emb-box{right:8px;bottom:8px;width:calc(100vw - 16px);height:calc(100vh - 16px);height:calc(100dvh - 16px)}}'+
'.emb-order{max-width:100%!important;width:100%;box-sizing:border-box}.emb-oh{display:block;margin-bottom:6px}.emb-it{display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px dashed #dfe9e9}.emb-it img{width:46px;height:46px;object-fit:cover;border-radius:8px;flex:0 0 auto}.emb-itx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;font-size:13px}.emb-itx b{font-size:13px;line-height:1.3}.emb-vr{font-size:16px;padding:3px;border:1px solid #cfdede;border-radius:6px;max-width:100%}.emb-q{display:flex;align-items:center;gap:6px}.emb-q button{width:24px;height:24px;border-radius:50%;border:1px solid #0b8f8c;background:#fff;color:#0b6e6c;cursor:pointer;line-height:1;padding:0}.emb-q i{font-style:normal;min-width:16px;text-align:center}.emb-q em{margin-left:auto;font-style:normal;font-weight:700;color:#c0392b}.emb-rm{border:0;background:none;color:#999;font-size:20px;cursor:pointer;padding:0 2px}.emb-tot{text-align:right;margin:8px 0;font-size:14px}.emb-tot b{color:#c0392b}.emb-more{margin-bottom:8px}.emb-of{display:flex;flex-direction:column;gap:6px}.emb-of input,.emb-of textarea,.emb-of select{border:1px solid #cfdede;border-radius:10px;padding:9px 10px;font-size:16px;font-family:inherit;width:100%;box-sizing:border-box}.emb-2{display:flex;gap:6px}.emb-2>*{flex:1;min-width:0}.emb-of select{background:#fff;color:#1f2d33}.emb-of input[type=date]{min-height:40px;background:#fff}.emb-err{color:#c0392b;font-size:12.5px;min-height:0}.emb-send{border:0;border-radius:999px;background:#e8262f;color:#fff;font-weight:700;padding:11px;font-size:14px;cursor:pointer}.emb-send:disabled{background:#8aa;cursor:default}'+
'.emb-imgs{display:flex;gap:6px;overflow-x:auto;max-width:100%;padding-bottom:2px;-webkit-overflow-scrolling:touch}.emb-imgs img{width:120px;height:120px;object-fit:cover;border-radius:12px;flex:0 0 auto;cursor:zoom-in;background:#fff;border:1px solid #dfe9e9}.emb-imgs.one img{width:200px;height:200px}.emb-zoom{position:absolute;inset:0;background:rgba(0,0,0,.88);z-index:5;display:flex;align-items:center;justify-content:center}.emb-zoom img{max-width:100%;max-height:85%;object-fit:contain}.emb-zx{position:absolute;top:10px;right:12px;border:0;background:rgba(255,255,255,.2);color:#fff;font-size:26px;width:40px;height:40px;border-radius:50%;cursor:pointer}.emb-zp,.emb-zn{position:absolute;top:50%;transform:translateY(-50%);border:0;background:rgba(0,0,0,.45);color:#fff;font-size:28px;width:40px;height:40px;border-radius:50%;cursor:pointer}.emb-zp{left:8px}.emb-zn{right:8px}.emb-zc{position:absolute;bottom:14px;left:0;right:0;text-align:center;color:#fff;font-size:13px}'+
'#emb-ft{font-size:11px;color:#6a8584;text-align:center;padding:0 0 8px;background:#fff}#emb-ft a{color:#0b6e6c}';
function el(t,a,h){var e=document.createElement(t);for(var k in a)e.setAttribute(k,a[k]);if(h!=null)e.innerHTML=h;return e;}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function link(s){return esc(s).replace(/(https?:\/\/[^\s)]+)/g,function(u){var v=u.replace(/[.,;]+$/,''),r=u.slice(v.length);return '<a href="'+v+'"'+(v.indexOf('eyemedi.vn')<0?' target="_blank" rel="noopener"':'')+'>'+v.replace('https://','')+'</a>'+r})}
var box,ms,inp;
/* ---- Lưu lịch sử chat trên thiết bị ---- */
var HK='emb-hist-v1',HIST=[],RESTORING=0;
function chipSer(x){if(typeof x==='string')return x;var o={l:x.l};if(x.p)o.pid=x.p.id||x.p.c;if(x.tr)o.trn=x.tr.n;if(x.bh)o.bh=x.bh;if(x.u)o.u=x.u;return o;}
function chipDe(o){if(typeof o==='string')return o;var x={l:o.l};if(o.pid){x.p=(D.sp||[]).filter(function(p){return p.id===o.pid||p.c===o.pid})[0];if(!x.p)return null;}if(o.trn){x.tr=(D.tr||[]).filter(function(t){return t.n===o.trn})[0];if(!x.tr)return null;}if(o.bh)x.bh=o.bh;if(o.u)x.u=o.u;return x;}
function histSave(){try{localStorage.setItem(HK,JSON.stringify({ts:Date.now(),last:last&&(last.id||last.c),h:HIST.slice(-80)}))}catch(e){}}
function histLoad(){try{var o=JSON.parse(localStorage.getItem(HK)||'null');if(o&&Date.now()-o.ts<30*864e5)return o;}catch(e){}return null;}
function histClear(){HIST=[];try{localStorage.removeItem(HK)}catch(e){}}

/* ---- Bảo hành trong chat ---- */
var BH={'Bảo hành gọng':['Gãy gọng','Bung ốc','Hư đệm mũi','Hư nhựa đuôi gọng','Gọng xước, oxy hoá'],'Bảo hành tròng':['Tròng xước','Tròng ngả màu','Tròng mờ','Tròng bể vỡ']};
function openWarranty(loai,van){[].slice.call(ms.querySelectorAll('.emb-bh')).forEach(function(n){n.parentNode.removeChild(n)});
 var w=el('div',{'class':'emb-m emb-b emb-order emb-bh'});
 w.innerHTML='<b class="emb-oh">🛠 '+esc(loai)+': '+esc(van)+'</b><form class="emb-of" novalidate><input name="Họ và Tên" placeholder="Họ và tên *" autocomplete="name"><input name="Số điện thoại" placeholder="Số điện thoại *" inputmode="tel" autocomplete="tel"><textarea name="Ghi chú" rows="2" placeholder="Mô tả thêm: mẫu kính, thời gian mua… (không bắt buộc)"></textarea><div class="emb-err"></div><button type="submit" class="emb-send">GỬI THÔNG TIN BẢO HÀNH</button></form>';
 ms.appendChild(w);var f=w.querySelector('form'),er=w.querySelector('.emb-err'),bt=w.querySelector('.emb-send');
 f.onsubmit=function(e){e.preventDefault();if(bt.disabled)return;var v=function(n){return (f.elements[n].value||'').trim()},sdt=v('Số điện thoại').replace(/[\s.\-]/g,'');
  if(!v('Họ và Tên')){er.textContent='Vui lòng nhập họ tên.';return;}if(!/^0\d{9}$/.test(sdt)){er.textContent='Số điện thoại chưa đúng (10 số, bắt đầu bằng 0).';return;}
  er.textContent='';bt.disabled=true;bt.textContent='Đang gửi…';
  var d=new FormData();d.append('Họ và Tên',v('Họ và Tên'));d.append('Số điện thoại',sdt);d.append('Loại','Bảo hành');d.append('Sản phẩm',loai+' | '+van);d.append('Ghi chú',v('Ghi chú'));d.append('Trang',location.pathname+' (chatbot)');
  fetch(GAS_DL,{method:'POST',mode:'no-cors',body:d}).then(function(){w.parentNode.removeChild(w);
   add('✅ EYEMEDI đã nhận thông tin bảo hành!\n'+v('Họ và Tên')+' – '+sdt+'\n🛠 '+loai+': '+van+'\nNhân viên sẽ gọi lại hướng dẫn sớm nhất. Anh/chị có thể mang kính đến Store 63C Lạc Long Quân, Phường Hòa Bình, TP.HCM (08:30 – 21:30) – chỉ đường: https://maps.app.goo.gl/khkbnHeoP4D3iYoq6\nHotline: '+HL);
  }).catch(function(){bt.disabled=false;bt.textContent='THỬ LẠI';er.textContent='Chưa gửi được, vui lòng thử lại hoặc gọi '+HL+'.'})};
 ms.scrollTop=ms.scrollHeight;setTimeout(function(){f.elements['Họ và Tên'].focus()},50);}

/* ---- Đặt lịch đo mắt trong chat ---- */
var GAS_DL='https://script.google.com/macros/s/AKfycbzH09BIb6hqDNC4rrf_dAWyANwMfC21IVy41EA3w9cqNdV43aNQfWpQtPZ3RB4Uqp8/exec';
function dToday(){var d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
function openBooking(){[].slice.call(ms.querySelectorAll('.emb-book')).forEach(function(n){n.parentNode.removeChild(n)});
 var w=el('div',{'class':'emb-m emb-b emb-order emb-book'});
 w.innerHTML='<b class="emb-oh">👁 Đặt lịch đo mắt miễn phí</b><form class="emb-of" novalidate><input name="Họ và Tên" placeholder="Họ và tên *" autocomplete="name"><input name="Số điện thoại" placeholder="Số điện thoại *" inputmode="tel" autocomplete="tel"><div class="emb-2"><input name="Ngày" type="date"><select name="Giờ"></select></div><textarea name="Ghi chú" rows="2" placeholder="Ghi chú (không bắt buộc)"></textarea><div class="emb-err"></div><button type="submit" class="emb-send">GỬI ĐẶT LỊCH</button></form>';
 ms.appendChild(w);var f=w.querySelector('form'),ng=f.elements['Ngày'],gs=f.elements['Giờ'],er=w.querySelector('.emb-err'),bt=w.querySelector('.emb-send');
 ng.min=dToday();ng.value=dToday();
 function gio(){var cur=gs.value,n=ng.value,now=new Date(),h='<option value="">Chọn giờ *</option>',c=0;for(var t=510;t<=1260;t+=30){if(n===dToday()&&t<now.getHours()*60+now.getMinutes()+30)continue;var x=('0'+Math.floor(t/60)).slice(-2)+':'+('0'+t%60).slice(-2);h+='<option'+(x===cur?' selected':'')+'>'+x+'</option>';c++}if(!c)h='<option value="">Hôm nay hết giờ – chọn ngày khác</option>';gs.innerHTML=h}
 gio();ng.onchange=gio;
 f.onsubmit=function(e){e.preventDefault();if(bt.disabled)return;var v=function(n){return (f.elements[n].value||'').trim()},sdt=v('Số điện thoại').replace(/[\s.\-]/g,'');
  if(!v('Họ và Tên')){er.textContent='Vui lòng nhập họ tên.';return;}if(!/^0\d{9}$/.test(sdt)){er.textContent='Số điện thoại chưa đúng (10 số, bắt đầu bằng 0).';return;}if(!v('Ngày')||!v('Giờ')){er.textContent='Vui lòng chọn ngày và giờ hẹn.';return;}
  er.textContent='';bt.disabled=true;bt.textContent='Đang gửi…';var ngay=v('Ngày').split('-').reverse().join('/');
  var d=new FormData();d.append('Họ và Tên',v('Họ và Tên'));d.append('Số điện thoại',sdt);d.append('Loại','Đặt lịch đo mắt');d.append('Sản phẩm','Đặt lịch đo mắt | '+ngay+' | '+v('Giờ'));d.append('Ngày hẹn',ngay);d.append('Khung giờ',v('Giờ'));d.append('Ghi chú',v('Ghi chú'));d.append('Trang',location.pathname+' (chatbot)');
  fetch(GAS_DL,{method:'POST',mode:'no-cors',body:d}).then(function(){try{window.fbq&&fbq('track','Lead')}catch(x){}
   w.parentNode.removeChild(w);add('✅ Đặt lịch thành công!\n'+v('Họ và Tên')+' – '+sdt+'\n📅 '+ngay+', '+v('Giờ')+'\nEYEMEDI sẽ gọi xác nhận lịch hẹn sớm nhất. Hotline: '+HL+'\nĐịa chỉ: 63C Lạc Long Quân, Phường Hòa Bình, TP.HCM – chỉ đường: https://maps.app.goo.gl/khkbnHeoP4D3iYoq6');
  }).catch(function(){bt.disabled=false;bt.textContent='THỬ LẠI';er.textContent='Chưa gửi được, vui lòng thử lại hoặc gọi '+HL+'.'})};
 ms.scrollTop=ms.scrollHeight;setTimeout(function(){f.elements['Họ và Tên'].focus()},50);}

/* ---- Đặt hàng trong chat ---- */
var GAS='https://script.google.com/macros/s/AKfycbxuFhXtqZHkSM2uzLb9c3ASCnFNzw_Fzl5_ecjTWOwLyc4FvxosoFGJUWsU2PijXWIW2Q/exec',LOCK_KEY='eyemedi_order_lock_until',LOCK_MS=180000;
var CART=[];try{CART=JSON.parse(sessionStorage.getItem('emb-cart')||'[]')||[]}catch(e){CART=[]}
function saveCart(){try{sessionStorage.setItem('emb-cart',JSON.stringify(CART))}catch(e){}}
function spById(id){return (D.sp||[]).filter(function(x){return x.id===id})[0]}
function itemPrice(it){var p=spById(it.id);if(!p)return 0;var v=(p.vr||[])[it.vi];return v&&v[1]>0?v[1]:p.p}
function lockLeft(){var v=0;try{v=Number(localStorage.getItem(LOCK_KEY))||0}catch(e){}return Math.max(0,v-Date.now())}
function addCart(p){var f=CART.filter(function(x){return x.id===p.id&&x.vi===0})[0];if(f)f.q++;else CART.push({id:p.id,vi:0,q:1});saveCart();}
function openOrder(p){if(p)addCart(p);[].slice.call(ms.querySelectorAll('.emb-order')).forEach(function(n){n.parentNode.removeChild(n)});
 var w=el('div',{'class':'emb-m emb-b emb-order'});ms.appendChild(w);drawOrder(w);ms.scrollTop=ms.scrollHeight;}
function drawOrder(w){CART=CART.filter(function(it){return spById(it.id)});
 if(!CART.length){w.innerHTML='Giỏ hàng đang trống. Anh/chị chọn sản phẩm rồi bấm "Đặt mua" nhé.';return;}
 var tot=0,h='<b class="emb-oh">🛒 Giỏ hàng & đặt hàng</b><div class="emb-items">';
 CART.forEach(function(it,i){var p=spById(it.id),pr=itemPrice(it);tot+=pr*it.q;
  h+='<div class="emb-it">'+(p.img?'<img src="'+esc(p.img)+'" alt="">':'')+'<div class="emb-itx"><b>'+esc(p.n)+'</b>'+
  ((p.vr||[]).length?'<select data-i="'+i+'" class="emb-vr">'+p.vr.map(function(v,k){return '<option value="'+k+'"'+(k===it.vi?' selected':'')+'>'+esc(v[0])+'</option>'}).join('')+'</select>':'')+
  '<span class="emb-q"><button type="button" data-i="'+i+'" data-d="-1">−</button><i>'+it.q+'</i><button type="button" data-i="'+i+'" data-d="1">+</button><em>'+vnd(pr*it.q)+'</em></span></div><button type="button" class="emb-rm" data-i="'+i+'" aria-label="Xóa">×</button></div>'});
 h+='</div><div class="emb-tot">Tạm tính: <b>'+vnd(tot)+'</b></div><button type="button" class="emb-c emb-more">＋ Thêm sản phẩm khác</button>'+
 '<form class="emb-of" novalidate><input name="Họ tên" placeholder="Họ và tên *" autocomplete="name" required><input name="Số điện thoại" placeholder="Số điện thoại *" inputmode="tel" autocomplete="tel" required><input name="Địa chỉ nhận hàng" placeholder="Địa chỉ nhận hàng *" autocomplete="street-address" required><input name="Email khách hàng" type="email" placeholder="Email (không bắt buộc)" autocomplete="email"><div class="emb-2"><input name="Độ mắt phải OD" placeholder="Độ mắt phải (OD)"><input name="Độ mắt trái OS" placeholder="Độ mắt trái (OS)"></div><textarea name="Ghi chú" rows="2" placeholder="Ghi chú: màu, nhu cầu lắp tròng, thời gian nhận…"></textarea><div class="emb-err"></div><button type="submit" class="emb-send">Gửi đơn hàng đến EYEMEDI</button></form>';
 var keep={};[].slice.call(w.querySelectorAll('.emb-of [name]')).forEach(function(x){keep[x.name]=x.value});
 w.innerHTML=h;[].slice.call(w.querySelectorAll('.emb-of [name]')).forEach(function(x){if(keep[x.name])x.value=keep[x.name]});
 [].slice.call(w.querySelectorAll('.emb-q button')).forEach(function(b){b.onclick=function(){var it=CART[+b.dataset.i];it.q+=+b.dataset.d;if(it.q<=0)CART.splice(+b.dataset.i,1);saveCart();drawOrder(w)}});
 [].slice.call(w.querySelectorAll('.emb-rm')).forEach(function(b){b.onclick=function(){CART.splice(+b.dataset.i,1);saveCart();drawOrder(w)}});
 [].slice.call(w.querySelectorAll('.emb-vr')).forEach(function(sl){sl.onchange=function(){CART[+sl.dataset.i].vi=+sl.value;saveCart();drawOrder(w)}});
 w.querySelector('.emb-more').onclick=function(){add('Anh/chị chọn thêm sản phẩm, rồi bấm "Đặt mua" để thêm vào giỏ:',0,['Kính mát','Kính gọng','Tròng kính mắt'])};
 var f=w.querySelector('.emb-of'),btn=f.querySelector('.emb-send'),er=f.querySelector('.emb-err');
 function tick(){var l=lockLeft();if(l>0){btn.disabled=true;btn.textContent='✓ Đơn đã gửi – gửi đơn mới sau '+Math.floor(l/60000)+':'+('0'+Math.ceil(l/1000)%60).slice(-2);setTimeout(tick,1000)}else{btn.disabled=false;btn.textContent='Gửi đơn hàng đến EYEMEDI'}}tick();
 f.onsubmit=function(e){e.preventDefault();if(btn.disabled)return;var v=function(n){return (f.querySelector('[name="'+n+'"]').value||'').trim()};
  if(!v('Họ tên')||!v('Số điện thoại')||!v('Địa chỉ nhận hàng')){er.textContent='Vui lòng nhập họ tên, số điện thoại và địa chỉ nhận hàng.';return;}
  if(!/^(\+?84|0)\d{8,10}$/.test(v('Số điện thoại').replace(/[\s.\-]/g,''))){er.textContent='Số điện thoại chưa đúng.';return;}
  er.textContent='';var code='EM'+Date.now().toString(36).toUpperCase().slice(-6)+Math.random().toString(36).slice(2,4).toUpperCase();
  var lines=CART.map(function(it){var p=spById(it.id),vr=(p.vr||[])[it.vi];return p.n+' | Mã: '+p.c+(vr?' | Phân loại: '+vr[0]:'')+' | Số lượng: '+it.q+' | Giá: '+vnd(itemPrice(it))});
  var tot=CART.reduce(function(a,it){return a+itemPrice(it)*it.q},0);
  var fd=new FormData(f);fd.append('Chi tiết đơn hàng','Mã đơn: '+code+' — '+lines.join('\n'));fd.append('Tạm tính',vnd(tot));fd.append('Mã đơn',code);fd.append('Loại','Đơn hàng');fd.append('Trang',location.pathname+' (chatbot)');
  btn.disabled=true;btn.textContent='Đang gửi đơn…';
  fetch(GAS,{method:'POST',mode:'no-cors',keepalive:true,body:fd}).then(function(){
   try{localStorage.setItem(LOCK_KEY,String(Date.now()+LOCK_MS))}catch(e){}
   var items=CART.map(function(it){var p=spById(it.id),vr=(p.vr||[])[it.vi];return '• '+p.n+(vr?' ('+vr[0]+')':'')+' x'+it.q}).join('\n');
   CART=[];saveCart();w.parentNode.removeChild(w);
   add('✓ Đã gửi đơn hàng thành công!\nMã đơn: '+code+'\n'+items+'\nTạm tính: '+vnd(tot)+'\nNgười nhận: '+v('Họ tên')+' – '+v('Số điện thoại')+'\n'+v('Địa chỉ nhận hàng')+'\nEYEMEDI sẽ liên hệ xác nhận sớm. Cần hỗ trợ gọi/Zalo '+HL+'.');
  }).catch(function(){btn.disabled=false;btn.textContent='Gửi đơn hàng đến EYEMEDI';er.textContent='Chưa gửi được đơn, vui lòng thử lại hoặc gọi/Zalo '+HL+'.'});};}


function imgRow(im){var r=el('div',{'class':'emb-imgs'+(im.length===1?' one':'')});im.forEach(function(u,i){var g=el('img',{src:u,alt:'Hình sản phẩm '+(i+1),loading:'lazy'});g.onclick=function(){zoom(im,i)};r.appendChild(g)});ms.appendChild(r);}
function zoom(im,i){var z=el('div',{'class':'emb-zoom'},'<img alt=""><button type="button" class="emb-zx" aria-label="Đóng">×</button>'+(im.length>1?'<button type="button" class="emb-zp">‹</button><button type="button" class="emb-zn">›</button><span class="emb-zc"></span>':''));box.appendChild(z);
 function sh(k){i=(k+im.length)%im.length;z.querySelector('img').src=im[i];var c=z.querySelector('.emb-zc');if(c)c.textContent=(i+1)+'/'+im.length}sh(i);
 z.querySelector('.emb-zx').onclick=function(){box.removeChild(z)};z.onclick=function(e){if(e.target===z)box.removeChild(z)};
 if(im.length>1){z.querySelector('.emb-zp').onclick=function(){sh(i-1)};z.querySelector('.emb-zn').onclick=function(){sh(i+1)};var x0=null;z.addEventListener('touchstart',function(e){x0=e.touches[0].clientX},{passive:true});z.addEventListener('touchend',function(e){if(x0==null)return;var dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>40)sh(i+(dx<0?1:-1));x0=null});}}
function chipBtn(x){var lb=typeof x==='string'?x:x.l,b=el('button',{type:'button','class':'emb-c'},esc(lb));b.onclick=function(){if(x.u){window.open(x.u,'_self');return;}if(x.bh){add(lb,1);setTimeout(function(){openWarranty(x.bh,lb)},200);return;}if(x.tr){add(lb,1);setTimeout(function(){var r=trInfo(x.tr);add(r.t,0,r.c)},250);return;}if(x.p){add(lb,1);setTimeout(function(){var r=spAns(x.p);add(r.t,0,r.c,0,r.im)},250);return;}send(x)};return b;}
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

function add(t,who,chips,pg,im){if(!RESTORING&&(t||chips||im)){HIST.push({t:t||'',w:who?1:0,c:(chips||[]).map(chipSer),pg:pg?1:0,im:im||0});histSave();}if(im&&im.length)imgRow(im);if(t){var m=el('div',{'class':'emb-m '+(who?'emb-u':'emb-b')},who?esc(t):link(t));ms.appendChild(m);}
 if(chips&&chips.length&&pg){pager(chips);ms.scrollTop=ms.scrollHeight;return;}
 if(chips&&chips.length){var c=el('div',{'class':'emb-cs'});chips.forEach(function(x){c.appendChild(chipBtn(x))});ms.appendChild(c)}
 ms.scrollTop=ms.scrollHeight;}
function send(t){t=String(t).trim();if(!t)return;add(t,1);
 if(t==='Gọi/Zalo tư vấn'){window.open(ZALO,'_blank');return;}
 if(t==='Tròng kính mắt'){setTimeout(function(){add('EYEMEDI có đơn tròng, chống ánh sáng xanh, đổi màu, và đa tròng, hai tròng, chống bể, chống ánh sáng xanh, đổi màu tròng đặt theo đơn.\nAnh/chị gửi độ mắt của mình, ví dụ: "cận -125 loạn -150", "viễn +200", "cận -500 đổi màu", "lão +200, đa tròng" để Eyemedi tư vấn ạ.',0,['Tròng chống ánh sáng xanh','Tròng đổi màu','Đa tròng','Hai tròng','Tròng chống bể'])},250);return;}
 if((t==='Hình ảnh'||/\bhinh\b|xem anh|gui anh|cho xem anh|anh that|anh san pham/.test(nm(t)))&&last){setTimeout(function(){var im=last.imgs||[];if(im.length){add('Hình ảnh '+last.n+' ('+im.length+' ảnh) – bấm vào ảnh để phóng to:');add('',0,SPCH,0,im);}else add('',0,SPCH,0,(last.imgs||[]).slice(0,1))},200);return;}
 if((t==='Giá theo độ'||t==='Đặc điểm tròng'||t==='Chiết suất')&&lastTr){setTimeout(function(){add(trPart(t),0,['Giá theo độ','Đặc điểm tròng','Chiết suất'].filter(function(x){return x!==t}))},200);return;}
 if(t==='Bảo hành'){setTimeout(function(){add('Eyemedi xin nhận thông tin bảo hành từ anh chị:',0,['Bảo hành gọng','Bảo hành tròng'])},250);return;}
 if(BH[t]){setTimeout(function(){add('',0,BH[t].map(function(v){return {l:v,bh:t}}),1)},250);return;}
 if(t==='Đặt mua'&&last&&last.id){setTimeout(function(){openOrder(last)},200);return;}
 var map={'Thông số':'thong so','Chất liệu':'chat lieu','Màu / phân loại':'mau','Đặt mua':'dat mua'};
 setTimeout(function(){if(!D){load(function(){send(t)});return;}
  var r=map[t]&&last?{t:spPart(last,{'Thông số':'ts','Chất liệu':'cl','Màu / phân loại':'mau'}[t]),c:SPCH.filter(function(x){return x!==t})}:answer(t);if(r.order){openOrder(r.order);return;}if(r.book){add(r.t);openBooking();return;}add(r.t,0,r.c,r.pg,r.im)},250);}
function load(cb){if(D)return cb();fetch('/chatbot/du-lieu.json',{cache:'no-cache'}).then(function(r){return r.json()}).then(function(j){D=j;prep();cb()}).catch(function(){})}
function ui(){var st=el('style',{id:'emb-css'},css);document.head.appendChild(st);
 var btn=el('button',{id:'emb-btn',type:'button','aria-label':'Chat với EYEMEDI'},'<svg viewBox="0 0 24 24"><path d="M12 3C6.5 3 2 6.9 2 11.7c0 2.6 1.3 4.9 3.4 6.5L4.6 22l4.2-2.2c1 .3 2.1.4 3.2.4 5.5 0 10-3.9 10-8.6S17.5 3 12 3zm-4 9.9a1.3 1.3 0 110-2.6 1.3 1.3 0 010 2.6zm4 0a1.3 1.3 0 110-2.6 1.3 1.3 0 010 2.6zm4 0a1.3 1.3 0 110-2.6 1.3 1.3 0 010 2.6z"/></svg><span class="emb-dot"></span>');
 var fc=document.querySelector('.float-contact');if(fc)fc.insertBefore(btn,fc.firstChild);else document.body.appendChild(btn);
 var mf=document.querySelector('.messenger-float');if(!fc&&!mf)btn.style.bottom='20px';
 if(!fc&&mf){var al=function(){var cs=getComputedStyle(mf),z=mf.offsetWidth||58;btn.style.width=btn.style.height=z+'px';btn.style.right=cs.right;btn.style.bottom=(parseFloat(cs.bottom)+(mf.offsetHeight||z)+12)+'px'};al();window.addEventListener('resize',al);}
 box=el('div',{id:'emb-box',role:'dialog','aria-label':'Chatbot EYEMEDI'},'<div id="emb-hd"><svg viewBox="0 0 24 24" width="30" height="30"><circle cx="12" cy="12" r="12" fill="#0b8f8c"/><path fill="#fff" d="M12 7c-3.6 0-6.5 2.4-6.5 5s2.9 5 6.5 5 6.5-2.4 6.5-5-2.9-5-6.5-5zm0 8a3 3 0 110-6 3 3 0 010 6z"/></svg><div><b>EYEMEDI tư vấn</b><small>Trực tuyến 24/7</small></div><button id="emb-x" type="button" aria-label="Đóng">×</button></div><div id="emb-ms"></div><form id="emb-f"><input id="emb-in" autocomplete="off" placeholder="Nhập câu hỏi, tên hoặc mã sản phẩm…"><button id="emb-go" type="submit">Gửi</button></form><div id="emb-ft">Cần gặp nhân viên? <a href="'+ZALO+'" target="_blank" rel="noopener">Zalo '+HL+'</a> · <a href="#" id="emb-new">Làm mới</a></div>');
 document.body.appendChild(box);ms=box.querySelector('#emb-ms');inp=box.querySelector('#emb-in');var started=0;
 btn.onclick=function(){box.classList.add('on');document.body.classList.add('emb-open');btn.querySelector('.emb-dot').style.display='none';load(function(){});if(!started){started=1;greet()}setTimeout(function(){inp.focus()},50)};
 var vv=window.visualViewport;if(vv){var fit=function(){if(!box.classList.contains('on')||innerWidth>480){box.style.height='';box.style.bottom='';box.style.top='';return;}box.style.top=(vv.offsetTop+8)+'px';box.style.bottom='auto';box.style.height=(vv.height-16)+'px';ms.scrollTop=ms.scrollHeight;};vv.addEventListener('resize',fit);vv.addEventListener('scroll',fit);inp.addEventListener('focus',function(){setTimeout(fit,300)});}
 function greet(){add('Dạ EYEMEDI xin chào anh/chị! Anh/chị có thể hỏi giá, thông số, chất liệu, màu của sản phẩm (gõ tên hoặc mã), hoặc chọn nhanh bên dưới:',0,CHIPS)}
 box.querySelector('#emb-x').onclick=function(){box.classList.remove('on');document.body.classList.remove('emb-open');try{localStorage.setItem('emb-isopen','0')}catch(e){}};
 var _oc=btn.onclick;btn.onclick=function(){_oc();try{localStorage.setItem('emb-isopen','1')}catch(e){}};
 box.querySelector('#emb-new').onclick=function(e){e.preventDefault();histClear();last=null;ms.innerHTML='';greet()};
 var H=histLoad();if(H&&H.h&&H.h.length){load(function(){RESTORING=1;HIST=H.h;H.h.forEach(function(m){var ch=(m.c||[]).map(chipDe).filter(Boolean);add(m.t,m.w,ch,m.pg,m.im)});RESTORING=0;started=1;
  if(H.last)last=(D.sp||[]).filter(function(p){return p.id===H.last||p.c===H.last})[0]||null;
  var op=0;try{op=localStorage.getItem('emb-isopen')==='1'}catch(e){}if(op){box.classList.add('on');document.body.classList.add('emb-open');btn.querySelector('.emb-dot').style.display='none';}ms.scrollTop=ms.scrollHeight;});}
 box.querySelector('#emb-f').onsubmit=function(e){e.preventDefault();var v=inp.value;inp.value='';load(function(){});send(v)};}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ui);else ui();
window.emBotAnswer=function(q,cb){load(function(){cb(answer(q))})};
})();
