import unittest, tempfile, json
from datetime import date
from pathlib import Path
from unittest.mock import patch
import update_site as u

class UpdateTests(unittest.TestCase):
    def test_accepts_verified_famiglia_cristiana_comment(self):
        obj=json.loads(json.dumps(self.obj))
        obj['comment']['source']='Famiglia Cristiana'
        obj['comment']['url']='https://www.famigliacristiana.it/riflessioni/epicoco-parola-del-giorno/il-signore-non-ci-lascia-soli-nel-buio-26-novembre-uksv4fud'
        self.assertTrue(u.valid(obj,self.d))
        obj['comment']['url']='https://untrusted.invalid/riflessioni/epicoco-parola-del-giorno/not-a-page'
        self.assertFalse(u.valid(obj,self.d))

    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        patcher=patch.object(u,'DATA',Path(self.tmp.name));patcher.start();self.addCleanup(patcher.stop)
        self.d=date(2026,11,21)
        self.obj=json.loads((u.ROOT/'verified_example.json').read_text())
    def test_mismatched_reference_rejected(self):
        self.obj['comment']['reference']='Lc 21,1-4'
        self.assertFalse(u.valid(self.obj,self.d))
    def test_wrong_date_rejected(self):
        with patch.object(u,'refresh',return_value=self.obj):
            self.assertEqual(u.update(date(2026,11,22)),'non disponibile')
        self.assertEqual(list(u.DATA.iterdir()),[])
    def test_publication_removes_full_text(self):
        self.obj['readings'][0]['text']='private';self.obj['comment']['preview']='private'
        with patch.object(u,'refresh',return_value=self.obj): self.assertEqual(u.update(self.d),'matched')
        result=u.read_day(self.d);self.assertEqual(result['readings'][0]['text'],'');self.assertNotIn('preview',result['comment'])
    def test_archive_survives_outage(self):
        self.obj['stale']=True;u.write_json(u.DATA/(self.d.isoformat()+'.json'),self.obj)
        with patch.object(u,'refresh',side_effect=RuntimeError('offline')): u.update(self.d)
        self.assertEqual(u.read_day(self.d),self.obj)
    def test_existing_matched_card_not_replaced(self):
        self.obj['reader_version']=u.VERSION
        for r in self.obj['readings']:r['reader']={'text':'fixture'}
        u.write_json(u.DATA/(self.d.isoformat()+'.json'),self.obj)
        with patch.object(u,'refresh') as mock:
            u.update(self.d);mock.assert_not_called()
        result=u.read_day(self.d)
        self.assertTrue(all('reader' not in r and r.get('text')=='' for r in result['readings']))
if __name__=='__main__': unittest.main()
