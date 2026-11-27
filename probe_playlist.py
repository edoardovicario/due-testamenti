"""Temporary metadata-only diagnostic: inspect Spotify embed JSON to accurately pair titles with IDs."""
import httpx,re,json
from bs4 import BeautifulSoup
url='https://open.spotify.com/embed/playlist/1oaKqKEJgEx9TlCjZEbv9p'
r=httpx.get(url,timeout=httpx.Timeout(18,connect=6),headers={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36'})
r.raise_for_status()
doc=BeautifulSoup(r.text,'html.parser')
raw=doc.find('script',id='__NEXT_DATA__')
assert raw
state=json.loads(raw.string)['props']['pageProps']['state']['data']
entity=state['entity']
print('TOP_KEYS',list(entity.keys()))
for k,v in entity.items():
 if isinstance(v,dict):
  print('DICT',k,'keys',list(v.keys())[:30])
 elif isinstance(v,list):
  print('LIST',k,'len',len(v))
print('FIRST_MATCHING_OBJECTS')
found=set()
def scan(x,path=''):
 if isinstance(x,dict):
  rep=json.dumps(x,ensure_ascii=False)
  if ('spotify:episode:' in rep or '/episode/' in rep) and ('name' in x or 'title' in x):
   sig=(str(x.get('id')),str(x.get('name',x.get('title'))))
   if sig not in found:
    found.add(sig)
    print('META',path,'keys',list(x.keys())[:16],'id',x.get('id'),'uri',x.get('uri'),'name',str(x.get('name',x.get('title')))[:110],'author',str(x.get('subtitle',''))[:100])
  for k,v in x.items():scan(v,path+'.'+k)
 elif isinstance(x,list):
  for i,v in enumerate(x):scan(v,path+'['+str(i)+']')
scan(entity,'entity')
print('TOTAL',len(found))
