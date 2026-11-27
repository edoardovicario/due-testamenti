"""Temporary metadata-only diagnostic of Spotify's public show and playlist pages."""
import httpx,re
from bs4 import BeautifulSoup
paths=[
 'https://open.spotify.com/show/3zi4rUpHdKFicPVbJ4pvXM',
 'https://open.spotify.com/embed/show/3zi4rUpHdKFicPVbJ4pvXM',
 'https://open.spotify.com/playlist/1oaKqKEJgEx9TlCjZEbv9p',
 'https://open.spotify.com/embed/playlist/1oaKqKEJgEx9TlCjZEbv9p'
]
with httpx.Client(timeout=httpx.Timeout(18,connect=6),headers={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36'},follow_redirects=True) as client:
 for url in paths:
  try:
   r=client.get(url)
   page=BeautifulSoup(r.text,'html.parser')
   ids=list(dict.fromkeys(re.findall(r'(?:spotify:episode:|/episode/)([A-Za-z0-9]{22})',r.text)))
   scripts=len(page.find_all('script'))
   print(url.split('spotify.com/')[-1],'status',r.status_code,'bytes',len(r.content),'episode ids',len(ids),'script count',scripts,'title',page.title.get_text()[:70] if page.title else 'none')
   print('IDS',','.join(ids[:30]))
   print('SHOW_META',('Speranza cristiana' in r.text),('Famiglia luogo del perdono' in r.text))
  except Exception as e:
   print('PROBE FAILED',url,type(e).__name__)
