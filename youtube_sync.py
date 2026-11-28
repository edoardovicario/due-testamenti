"""Sync only official Epicoco YouTube channel metadata, never download videos."""
import json,logging,os,re,xml.etree.ElementTree as ET
from pathlib import Path
import httpx
LOG=logging.getLogger(__name__)
HERE=Path(__file__).parent
OUTPUT=HERE/'site/youtube_catalog.json'
CHANNEL='UCK9NyEkJ-X89kXCwp1eXFjw'
BASE='https://www.googleapis.com/youtube/v3'
FEED='https://www.youtube.com/feeds/videos.xml?channel_id='+CHANNEL
ATOM='{http://www.w3.org/2005/Atom}'
YT='{http://www.youtube.com/xml/schemas/2015}'
MEDIA='{http://search.yahoo.com/mrss/}'
VIDEO=re.compile(r'^[A-Za-z0-9_-]{11}$')
def clean(item):
    vid=item.get('id');title=item.get('title')
    if not isinstance(vid,str) or not VIDEO.fullmatch(vid) or not isinstance(title,str) or not title.strip():return None
    description=item.get('description','')
    return {'id':vid,'title':title.strip()[:260],'description':description[:2400] if isinstance(description,str) else '',
            'published':str(item.get('published') or '')[:30]}
def parse_feed(source):
    if len(source)>2000000:raise ValueError('Feed troppo lungo')
    root=ET.fromstring(source)
    channel_id=(root.findtext(YT+'channelId') or '').strip()
    feed_id=(root.findtext(ATOM+'id') or '').strip()
    canonical=channel_id==CHANNEL
    # In the public Atom feed this channel is also returned without the UC prefix.
    # Accept that documented channel-specific variant ONLY with its matching
    # Atom feed ID, from the exact canonical channel URL requested over HTTPS.
    canonical_feed_variant=(channel_id==CHANNEL[2:] and feed_id=='yt:channel:'+channel_id)
    if root.tag!=ATOM+'feed' or not (canonical or canonical_feed_variant):
        raise ValueError('Canale non verificato')
    results=[]
    for e in root.findall(ATOM+'entry'):
        x=clean({'id':e.findtext(YT+'videoId'),'title':e.findtext(ATOM+'title'),
                 'description':e.findtext(MEDIA+'group/'+MEDIA+'description') or '',
                 'published':e.findtext(ATOM+'published')})
        if x:results.append(x)
    return results
def api(client,path,key,params):
    if path not in ('channels','playlistItems'):raise ValueError('Endpoint non autorizzato')
    r=client.get(BASE+'/'+path,params={**params,'key':key},timeout=18)
    r.raise_for_status()
    return r.json()
def fetch_all(client,key):
    info=api(client,'channels',key,{'part':'contentDetails','id':CHANNEL}).get('items',[])
    if len(info)!=1 or info[0].get('id')!=CHANNEL:raise ValueError('Canale errato')
    uploads=info[0].get('contentDetails',{}).get('relatedPlaylists',{}).get('uploads','')
    if not uploads.startswith('UU'):raise ValueError('Uploads playlist invalida')
    output=[];seen=set();token=None
    for _ in range(300):
        args={'part':'snippet','playlistId':uploads,'maxResults':50}
        if token:args['pageToken']=token
        page=api(client,'playlistItems',key,args)
        for e in page.get('items',[]):
            sn=e.get('snippet',{})
            if sn.get('channelId')!=CHANNEL:continue
            data=clean({'id':sn.get('resourceId',{}).get('videoId'),'title':sn.get('title'),
                        'description':sn.get('description'),'published':sn.get('publishedAt')})
            if data and data['id'] not in seen and data['title'].lower() not in ('private video','deleted video'):
                seen.add(data['id']);output.append(data)
        nxt=page.get('nextPageToken')
        if not nxt:break
        if nxt==token:raise ValueError('Loop di paginazione')
        token=nxt
    else:raise ValueError('Limite di pagine raggiunto')
    if not output:raise ValueError('Nessun video pubblico')
    return output
def merge(old,found,complete):
    if old.get('channel_id')!=CHANNEL:raise ValueError('Identificativo canale inatteso')
    previous={v['id']:v for v in [clean(x) for x in old.get('videos',[])] if v}
    if complete:previous={}
    for item in found:
        v=clean(item)
        if v:previous[v['id']]=v
    videos=sorted(previous.values(),key=lambda x:x['published'],reverse=True)
    return {'channel_id':CHANNEL,'channel_url':'https://www.youtube.com/@luigimariaepicoco',
      'channel_title':'Luigi Maria Epicoco',
      'source':'YouTube Data API' if complete else 'Feed pubblico e video verificati',
      'complete':complete,'catalog_scope':'youtube_api_uploads' if complete else 'verified_seed_and_feed','videos':videos}
def main():
    key=os.environ.get('YOUTUBE_API_KEY','').strip()
    try:
        old=json.loads(OUTPUT.read_text(encoding='utf-8'))
        with httpx.Client(follow_redirects=True,headers={'User-Agent':'DueTestamenti/2.0'}) as client:
            try:
                if key:found=fetch_all(client,key);complete=True
                else:
                    response=client.get(FEED,timeout=18);response.raise_for_status()
                    found=parse_feed(response.content);complete=False
                if not found:raise ValueError('Feed vuoto')
            except (httpx.HTTPError,ValueError,ET.ParseError) as error:
                LOG.warning('YouTube non raggiungibile (%s: %s): catalogo conservato',type(error).__name__,str(error)[:160])
                return
        updated=merge(old,found,complete)
        if updated=={k:v for k,v in old.items() if k!='updated_at'}:return
        from datetime import datetime,timezone
        updated['updated_at']=datetime.now(timezone.utc).isoformat()
        temp=OUTPUT.with_suffix('.tmp')
        temp.write_text(json.dumps(updated,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        temp.replace(OUTPUT)
        print('Video YouTube catalogati:',len(updated['videos']),'completo:',complete)
    except (OSError,ValueError,TypeError) as error:LOG.warning('Catalogo YouTube non modificato: %s',type(error).__name__)
if __name__=='__main__':
    logging.basicConfig(level=logging.INFO)
    main()
