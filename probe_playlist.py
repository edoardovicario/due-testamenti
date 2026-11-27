"""Temporary metadata-only diagnostic: official Spotify embedded playlist."""
import httpx,re
from bs4 import BeautifulSoup
url='https://open.spotify.com/embed/playlist/1oaKqKEJgEx9TlCjZEbv9p'
r=httpx.get(url,timeout=httpx.Timeout(18,connect=6),headers={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36'})
r.raise_for_status()
doc=BeautifulSoup(r.text,'html.parser')
links=doc.select('a[href*="/episode/"]')
print('anchor links',len(links))
for a in links[:12]:
 print('ANCHOR',a.get('href','')[:100],repr(a.get_text(' ',strip=True)[:110]),'PARENT',repr(a.parent.get_text(' ',strip=True)[:110]))
ids=list(dict.fromkeys(re.findall(r'(?:spotify:episode:|/episode/)([A-Za-z0-9]{22})',r.text)))
print('IDS',len(ids))
for episode_id in ids[:7]:
 i=r.text.find('/episode/'+episode_id)
 print('CONTEXT',episode_id,repr(re.sub(r'\s+',' ',r.text[max(0,i-120):i+210])[:330]))
for script in doc.find_all('script'):
 content=script.string or script.get_text() or ''
 if any(x in content for x in ('15Y86aMr7TrDgTcOHjgFOl','Famiglia luogo del perdono')):
  print('SCRIPT',script.get('id'),script.get('type'),'len',len(content),
        'starts',repr(content[:110]))
