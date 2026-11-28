"""Temporary metadata-only discovery for a complete and correct Epicoco Spotify show catalog."""
import httpx,re,json
from bs4 import BeautifulSoup
URLS=[
 'https://open.spotify.com/embed/show/3zi4rUpHdKFicPVbJ4pvXM',
 'https://open.spotify.com/show/3zi4rUpHdKFicPVbJ4pvXM',
 'https://podtail.com/podcast/don-luigi-maria-epicoco/',
]
with httpx.Client(timeout=httpx.Timeout(18,connect=6),headers={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36'},follow_redirects=True) as client:
 for url in URLS:
  try:
   r=client.get(url)
   print('SOURCE',url,'HTTP',r.status_code,'bytes',len(r.content))
   if not r.is_success:continue
   soup=BeautifulSoup(r.text,'html.parser')
   s=soup.find('script',id='__NEXT_DATA__')
   if s:
    data=json.loads(s.string)
    pp=data.get('props',{}).get('pageProps',{})
    print('NEXT_PAGE_PROPS',list(pp.keys())[:30])
    state=pp.get('state',{}).get('data',{})
    print('STATE_KEYS',list(state.keys())[:30])
    entity=state.get('entity',{})
    print('ENTITY_KEYS',list(entity.keys())[:45])
    for key,v in entity.items():
     if isinstance(v,list):print('ENTITY_LIST',key,len(v),'first keys',list(v[0].keys())[:25] if v and isinstance(v[0],dict) else '')
     elif isinstance(v,dict):print('ENTITY_DICT',key,list(v.keys())[:25])
     elif key.lower() in ('name','title','type','total','totalepisodes','total_episodes'):print('ENTITY_SCALAR',key,str(v)[:90])
    episodeids=list(dict.fromkeys(re.findall(r'(?:spotify:episode:|/episode/)([A-Za-z0-9]{22})',r.text)))
    print('EMBED_IDS',len(episodeids),episodeids[:7])
    for k in ('episodes','trackList','episodeList'):
     v=entity.get(k)
     if isinstance(v,list):
      for e in v[:3]:
       print('ENTRY',k,'keys',list(e.keys())[:24] if isinstance(e,dict) else type(e).__name__,'id',e.get('id') if isinstance(e,dict) else '?','uri',e.get('uri') if isinstance(e,dict) else '?','title',e.get('title',e.get('name')) if isinstance(e,dict) else '?')
   for link in soup.find_all('a',href=True):
    href=link['href']
    if any(v in href.lower() for v in ['/rss','/feed','anchor.fm','podcasters.spotify.com']):print('PUBLIC_FEED_LINK',href[:220])
   if not s:print('NO_NEXT_DATA title',soup.title.get_text()[:100] if soup.title else 'n/a')
  except Exception as exc:
   print('ERROR',url,type(exc).__name__,str(exc)[:110])
