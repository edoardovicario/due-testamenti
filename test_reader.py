import unittest
from unittest.mock import patch
from reader import parse_reference, read_passage, brief, enrich_readings

class ReaderTests(unittest.TestCase):
    def test_discontinuous(self):
        self.assertEqual(parse_reference('1Cor 15,20-26.28')[2],[20,21,22,23,24,25,26,28])
    def test_numbering(self):
        self.assertEqual(parse_reference('Zc 2,14-17')[2],[10,11,12,13])
    def test_uncertain(self):
        for r in ['Dn 3,1-8','Mt 1,2-3,4-6','Mt 2,4-1','Sal 119','Mt 2,1-2 (forma breve)']:
            with self.assertRaises(ValueError):parse_reference(r)
    def test_full_text_and_missing(self):
        with patch('reader.chapter',return_value={46:'Primo',47:'Secondo',48:'Terzo',49:'Quarto',50:'Quinto'}):
            p=read_passage('Mt 12,46-50')
            self.assertEqual(p['text'],'Primo\n\nSecondo\n\nTerzo\n\nQuarto\n\nQuinto')
            self.assertEqual(p['reference'],'Mt 12,46-50')
        with patch('reader.chapter',return_value={46:'Primo'}):
            with self.assertRaises(ValueError):read_passage('Mt 12,46-50')
    def test_summary(self):
        self.assertIn('famiglia',brief('Mt 12,46-50')[0])
        self.assertEqual(brief('Mt 1,1','Gesù insegna la misericordia.')[1],'automatic')
    def test_failure_does_not_fabricate(self):
        obj={'readings':[{'reference':'Mt 12,46-50'}]}
        with patch('reader.read_passage',side_effect=ValueError('missing')):
            enrich_readings(obj)
        self.assertNotIn('reader',obj['readings'][0])
        self.assertTrue(obj['readings'][0]['summary'])
