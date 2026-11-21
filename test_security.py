import unittest, copy, json
from datetime import date
import httpx
from service import allowed_url, safe_ep, fetch
import update_site as u

class SecurityTests(unittest.TestCase):
    def test_reject_dangerous_urls(self):
        for url in ['javascript:alert(1)','http://www.cercoiltuovolto.it/epicoco','https://www.cercoiltuovolto.it.evil.example/epicoco','https://evil.example/epicoco','https://evil@www.cercoiltuovolto.it/epicoco','https://www.cercoiltuovolto.it:8080/epicoco']:
            self.assertFalse(safe_ep(url),url)
        self.assertTrue(safe_ep('https://www.cercoiltuovolto.it/don-epicoco/'))
    def test_redirect_to_untrusted_host_is_blocked(self):
        calls=[]
        def handler(req):
            calls.append(str(req.url));return httpx.Response(302,headers={'Location':'https://evil.example/'})
        with httpx.Client(transport=httpx.MockTransport(handler)) as client:
            with self.assertRaises(ValueError):fetch(client,'https://www.cercoiltuovolto.it/epicoco/')
        self.assertEqual(len(calls),1)
    def test_same_source_redirect_allowed(self):
        def handler(req):
            if req.url.path=='/old':return httpx.Response(302,headers={'Location':'https://cercoiltuovolto.it/new'})
            return httpx.Response(200,text='<h1>Test</h1>')
        with httpx.Client(transport=httpx.MockTransport(handler)) as client:
            self.assertEqual(fetch(client,'https://www.cercoiltuovolto.it/old').h1.text,'Test')
    def test_archive_rejects_external_reading_url(self):
        obj=json.loads((u.ROOT/'verified_example.json').read_text());d=date.fromisoformat(obj['date'])
        self.assertTrue(u.valid(obj,d));obj['readings'][0]['url']='javascript:alert(1)';self.assertFalse(u.valid(obj,d))
    def test_archive_rejects_fake_comment(self):
        obj=json.loads((u.ROOT/'verified_example.json').read_text());d=date.fromisoformat(obj['date']);obj['comment']['url']='https://www.cercoiltuovolto.it.evil.example/epicoco';self.assertFalse(u.valid(obj,d))
if __name__=='__main__':unittest.main()
