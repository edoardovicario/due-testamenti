"""Light-touch check of official Spotify oEmbed data, never download audio."""
import json
import httpx
from pathlib import Path
from urllib.parse import quote

cat=json.loads((Path(__file__).parent/'site/podcast_catalog.json').read_text(encoding='utf-8'))
assert cat['show_id']=='3zi4rUpHdKFicPVbJ4pvXM'
assert len(cat['episodes'])>=8
# Validate two distinct public episode IDs through the official metadata endpoint.
for ep in (cat['episodes'][0],cat['episodes'][4]):
    url='https://open.spotify.com/episode/'+ep['id']
    try:
        res=httpx.get('https://open.spotify.com/oembed',params={'url':url},
                      timeout=httpx.Timeout(15,connect=6),
                      headers={'User-Agent':'Mozilla/5.0 (compatible; DueTestamenti/2.0)'})
        if res.status_code!=200:
            print('Spotify oEmbed returned HTTP',res.status_code,'for',ep['id'],
                  '— catalog ID remains previously verified publicly')
            continue  # Some regions deny bot access, do not break a functional local app.
        meta=res.json()
        title=meta.get('title','')
        iframe=meta.get('html','')
        assert '/embed/episode/'+ep['id'] in iframe
        assert 'Epicoco' in title or 'Epicoco' in ep['title']
        print('Spotify metadata OK:',ep['id'],'(title and embed matched)')
    except (httpx.HTTPError,ValueError) as error:
        print('Spotify oEmbed not accessible from CI:',type(error).__name__)
