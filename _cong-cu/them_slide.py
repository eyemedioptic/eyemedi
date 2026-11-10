import sys
ITEMS=[
 ('namkhungtranh.com','https://namkhungtranh.com/','Nam Khung Tranh – tranh treo tường cao cấp','/images/thuong-hieu/nam-khung-tranh.webp','Logo Nam Khung Tranh – tranh treo tường canvas, tráng gương TP.HCM',800,640,'Tranh treo tường Nam Khung Tranh'),
 ('duongdenbinhyen.com','https://duongdenbinhyen.com/','Sách Đường đến bình yên – tác giả Thiện Nhân','/images/thuong-hieu/duong-den-binh-yen.webp','Bộ sách Thiện Nhân: Đường đến bình yên, Lời thì thầm từ cuộc đời, Miền bình yên',800,640,''),
]
def item(t,hidden):
  key,url,lab,img,alt,w,h,cap=t
  x=' aria-hidden="true" tabindex="-1"' if hidden else ''
  return f'<a class="th-o" href="{url}" target="_blank" rel="noopener" aria-label="{lab}"{x}><img src="{img}" alt="{alt}" width="{w}" height="{h}" loading="lazy"{x}>{('<span class="th-cap">'+cap+'</span>') if cap else ''}</a>'
n=0
for f in sys.argv[1:]:
  h=open(f).read()
  if 'id="thTrack"' not in h: continue
  ch=False
  for t in ITEMS:
    if t[0] in h: continue
    i=h.index('id="thTrack"'); end=h.index('</div></div></section>',i)
    k=h.find('aria-hidden="true" tabindex="-1"',i)
    h=h[:end]+item(t,True)+h[end:]
    if 0<k<end:
      s=h.rfind('<a class="th-o"',i,k); h=h[:s]+item(t,False)+h[s:]
    ch=True
  if ch: open(f,'w').write(h); n+=1
print('so trang',n)
