import unittest
import httpx
import youtube_sync as y
class TestYoutube(unittest.TestCase):
 def test_feed_exact_channel(self):
  xml=('<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><yt:channelId>'+y.CHANNEL+'</yt:channelId><entry><yt:videoId>kMVNeTUVD-c</yt:videoId><title>Preghiera</title></entry></feed>').encode()
  self.assertEqual(y.parse_feed(xml)[0]['id'],'kMVNeTUVD-c')
  with self.assertRaises(ValueError):y.parse_feed(xml.replace(y.CHANNEL.encode(),b'UCinvalid'))
 def test_youtube_official_feed_id_without_uc_prefix(self):
  short=y.CHANNEL[2:]
  xml=('<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><id>yt:channel:'+short+'</id><yt:channelId>'+short+'</yt:channelId><entry><yt:videoId>kMVNeTUVD-c</yt:videoId><title>Preghiera</title></entry></feed>').encode()
  self.assertEqual(len(y.parse_feed(xml)),1)
  with self.assertRaises(ValueError):y.parse_feed(xml.replace(('yt:channel:'+short).encode(),b'yt:channel:unrelated'))
 def test_merge_feed_keeps_history(self):
  old={'channel_id':y.CHANNEL,'videos':[{'id':'kMVNeTUVD-c','title':'Old'}]}
  new=y.merge(old,[{'id':'H9mtGtwdH1k','title':'New'}],False)
  self.assertEqual(len(new['videos']),2);self.assertFalse(new['complete'])
 def test_paginated_api_uses_exact_channel(self):
  def handler(r):
   if r.url.path.endswith('channels'):
    return httpx.Response(200,json={'items':[{'id':y.CHANNEL,'contentDetails':{'relatedPlaylists':{'uploads':'UUverified'}}}]})
   if r.url.path.endswith('playlistItems'):
    if not r.url.params.get('pageToken'):
     return httpx.Response(200,json={'items':[{'snippet':{'channelId':y.CHANNEL,'title':'Video 1','resourceId':{'videoId':'kMVNeTUVD-c'}}}],'nextPageToken':'NEXT'})
    return httpx.Response(200,json={'items':[{'snippet':{'channelId':'UCwrong','title':'Wrong','resourceId':{'videoId':'jw_9gHPo55g'}}},{'snippet':{'channelId':y.CHANNEL,'title':'Video 2','resourceId':{'videoId':'H9mtGtwdH1k'}}}],'nextPageToken':None})
   return httpx.Response(404)
  with httpx.Client(transport=httpx.MockTransport(handler)) as client:videos=y.fetch_all(client,'test')
  self.assertEqual([x['id'] for x in videos],['kMVNeTUVD-c','H9mtGtwdH1k'])
 def test_invalid_video_rejected(self):
  self.assertIsNone(y.clean({'id':'bad','title':'Video'}))
