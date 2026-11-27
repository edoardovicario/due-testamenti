"""Temporary metadata-only diagnostic: pair Spotify episode titles and IDs."""
import httpx,json,re
from bs4 import BeautifulSoup
url='https://open.spotify.com/embed/playlist/1oaKqKEJgEx9TlCjZEbv9p'
r=httpx.get(url,timeout=httpx.Timeout(18,connect=6),headers={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36'})
r.raise_for_status()
script=BeautifulSoup(r.text,'html.parser').find('script',id='__NEXT_DATA__')
data=json.loads(script.string)['props']['pageProps']['state']['data']['entity']
assert data['type']=='playlist' and len(data['trackList'])>=30
items=[]
for track in data['trackList']:
 uri=track.get('uri','')
 title=track.get('title','')
 author=track.get('subtitle','')
 if re.fullmatch(r'spotify:episode:[A-Za-z0-9]{22}',uri) and 'Epicoco' in author:
  items.append({'id':uri[-22:],'title':title,'subtitle':author})
print('EPISODES_JSON_START')
print(json.dumps(items,ensure_ascii=False,separators=(',',':')))
print('EPISODES_JSON_END')
print('TOTAL',len(items))
