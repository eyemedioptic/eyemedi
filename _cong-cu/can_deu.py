import sys,glob,os
CSS='<style id="can-deu">main.article article p:not([class]),main.article article li:not([class]),.home-article p:not([class]),.home-article li:not([class]),.page-modal p:not([class]),.page-modal li:not([class]){text-align:justify;text-justify:inter-word}</style>'
fs=sys.argv[1:]; n=0
for f in fs:
  h=open(f).read()
  if 'id="can-deu"' in h or '</head>' not in h: continue
  if not any(k in h for k in ('<main class="article">','home-article','page-modal')): continue
  h=h.replace('</head>',CSS+'\n</head>',1); open(f,'w').write(h); n+=1; print(os.path.basename(f))
print('so trang',n)
