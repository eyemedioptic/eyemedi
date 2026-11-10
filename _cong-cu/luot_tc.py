import sys,subprocess,os
root=sys.argv[1]; os.chdir(root)
W='<div class="luot-tc" aria-label="Thống kê truy cập"><div><span>Truy cập hôm nay</span><b data-k="d">…</b></div><div><span>Truy cập tháng này</span><b data-k="m">…</b></div><div><span>Chuyển đổi hôm nay</span><b data-k="c">…</b></div></div>'
CSS='<style>.luot-tc{display:grid;gap:6px;margin-top:14px;font-size:13px;line-height:1.3}.luot-tc>div{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:8px 12px;border:1px solid rgba(255,255,255,.28);border-radius:12px;background:rgba(255,255,255,.06)}.luot-tc span{opacity:.85}.luot-tc b{font-size:15px;font-variant-numeric:tabular-nums}.luot-tc-hang{display:flex;justify-content:flex-end;max-width:1180px;margin:0 auto;padding:0 clamp(12px,4vw,40px) 18px}.luot-tc-hang .luot-tc{width:min(100%,260px)}@media(max-width:600px){.luot-tc-hang{justify-content:flex-start;padding-left:16px}}</style>\n'
JS='''<script>(function(){var A='https://api.counterapi.dev/v1/eyemedi-vn/';var t=new Date(Date.now()+252e5).toISOString().slice(0,10).replace(/-/g,''),mo=t.slice(0,6);
function v(j){if(!j)return null;return j.count!=null?j.count:(j.value!=null?j.value:(j.data&&j.data.up_count!=null?j.data.up_count:null))}
function q(n,up){return fetch(A+n+(up?'/up':'/'),{cache:'no-store'}).then(function(r){return r.status==404?{count:0}:(r.ok?r.json():null)}).then(v).catch(function(){return null})}
var moi=true;try{moi=!sessionStorage.getItem('ltc'+t);sessionStorage.setItem('ltc'+t,'1')}catch(e){}
var bs=document.querySelectorAll('.luot-tc b');
Promise.all([q('d'+t,moi),q('m'+mo,moi),q('c'+t,false)]).then(function(x){bs.forEach(function(b){var y=x['dmc'.indexOf(b.getAttribute('data-k'))];b.textContent=y==null?'–':Number(y).toLocaleString('vi-VN')})});
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a,button');if(!a)return;var h=a.getAttribute('href')||'',s=(a.textContent||'').toLowerCase();
if(!(/^tel:|zalo\\.me|m\\.me|messenger/i.test(h)||/gửi đơn|đặt hàng|đặt lịch|xác nhận đặt|gửi đăng ký/.test(s)))return;
var k='ltcc'+t;try{if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,'1')}catch(e){}
try{fetch(A+'c'+t+'/up',{keepalive:true,cache:'no-store'})}catch(e){}},true);})();</script>
'''
fs=subprocess.run(['git','ls-files','*.html'],capture_output=True,text=True).stdout.split() if os.path.isdir('.git') else [f for f in os.listdir('.') if f.endswith('.html')]+(['caferoa/index.html'] if os.path.exists('caferoa/index.html') else [])
extra=sys.argv[2:]
n=0
for f in fs+extra:
    t=open(f,errors='surrogateescape').read()
    if 'G-CG3CSN342E' not in t or 'class="luot-tc"' in t or '</footer>' not in t: continue
    if '</details></nav></footer>' in t: t=t.replace('</details></nav></footer>','</details>'+W+'</nav></footer>',1)
    else:
        i=t.index('</footer>'); t=t[:i]+'<div class="luot-tc-hang">'+W+'</div>\n'+t[i:]
    t=t.replace('</head>',CSS+'</head>',1)
    i=t.rindex('</body>'); t=t[:i]+JS+t[i:]
    open(f,'w',errors='surrogateescape').write(t); n+=1
print('pages',n)
