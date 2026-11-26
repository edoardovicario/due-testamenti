import unittest
from reader import VERSION,brief,enrich_readings

class ReaderTests(unittest.TestCase):
    def test_summary(self):
        self.assertIn('famiglia',brief('Mt 12,46-50')[0])
        self.assertEqual(brief('Mt 1,1','Gesù insegna la misericordia.')[1],'automatic')
    def test_legacy_passages_scrubbed(self):
        obj={'readings':[{'reference':'Mt 12,46-50','text':'protected','reader':{'edition':'Martini','text':'historical'}}]}
        enrich_readings(obj)
        self.assertNotIn('reader',obj['readings'][0])
        self.assertEqual(obj['readings'][0]['text'],'')
        self.assertEqual(obj['reader_version'],VERSION)
    def test_idempotent(self):
        obj={'readings':[{'reference':'Mt 12,46-50','summary':'Test','text':'protected'}]}
        self.assertEqual(enrich_readings(enrich_readings(obj)),obj)
