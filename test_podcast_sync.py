import json
import unittest
from unittest.mock import patch
import httpx
import podcast_sync as s

class SpotifyCatalogTests(unittest.TestCase):
    def test_build_only_verified_show_and_preserve_curated_tags(self):
        old={'show_id':s.SHOW_ID,'episodes':[{'id':'A'*22,'topics':['speranza']},{'id':'C'*22,'topics':['non-verified']}]}
        fresh=[{'id':'A'*22,'title':'Un passo','description':'','release_date':'2026-01-01','topics':[]},
               {'id':'B'*22,'title':'Un altro passo','description':'','release_date':'2026-01-02','topics':[]}]
        result=s.build_catalog(fresh,2,old)
        self.assertEqual(len(result['episodes']),2)
        self.assertTrue(result['complete'])
        self.assertEqual(result['episodes'][0]['topics'],['speranza'])
        self.assertEqual(result['episodes'][1]['topics'],[])
        self.assertEqual(result['show_id'],s.SHOW_ID)
    def test_complete_pagination_and_reject_other_show(self):
        def handler(request):
            if request.url.path.endswith('/shows/'+s.SHOW_ID):
                return httpx.Response(200,json={'id':s.SHOW_ID,'type':'show','name':'Don Luigi Maria Epicoco'})
            if request.url.path.endswith('/episodes'):
                offset=int(request.url.params.get('offset',0))
                items=[{'id':'A'*22,'name':'Vangelo Gv 4,5','type':'episode','description':'La Samaritana'}] if offset==0 else []
                return httpx.Response(200,json={'total':1,'items':items,'next':None})
            return httpx.Response(404)
        with httpx.Client(transport=httpx.MockTransport(handler)) as client:
            episodes,total=s.fetch_all(client,'test-token')
        self.assertEqual(total,1)
        self.assertEqual(len(episodes),1)
        self.assertEqual(episodes[0]['title'],'Vangelo Gv 4,5')
    def test_does_not_replace_catalog_without_credentials(self):
        with patch.dict('os.environ',{'SPOTIFY_CLIENT_ID':'','SPOTIFY_CLIENT_SECRET':''}):
            s.main()
    def test_complete_flag_false_when_market_returns_subset(self):
        result=s.build_catalog([{'id':'A'*22,'title':'X','description':'','topics':[]}],10,{'episodes':[]})
        self.assertFalse(result['complete'])

if __name__=='__main__':
    unittest.main()
