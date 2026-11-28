import unittest
from reader import VERSION,PREVIEW_VERSION,brief,enrich_readings,SUMMARIES

class ReaderTests(unittest.TestCase):
    def test_story_not_theme(self):
        intro,kind=brief('Ap 18,1-2.21-23;19,1-3.9a','salvezza')
        self.assertIn('Babilonia',intro)
        self.assertIn('angelo',intro.lower())
        self.assertEqual(kind,'preview')
        self.assertNotIn('Nel brano emergono questi temi',intro)
    def test_gospel_story(self):
        intro,kind=brief('Lc 21,20-28','discepoli')
        self.assertIn('Gerusalemme',intro)
        self.assertEqual(kind,'preview')
    def test_future_liturgical_heading(self):
        sentence,kind=brief('Mt 99,1-4','Messaggio di prova','Un uomo incontra un viandante')
        self.assertEqual(sentence,'Un uomo incontra un viandante.')
        self.assertEqual(kind,'heading')
    def test_no_fabricated_story_without_evidence(self):
        sentence,kind=brief('Mt 99,1-4','salvezza e fede')
        self.assertEqual(sentence,'')
        self.assertEqual(kind,'unavailable')
    def test_archive_rewrites_generic_previews(self):
        data={'readings':[{'reference':'Ap 18,1-2.21-23;19,1-3.9a','summary':'Nel brano emergono questi temi: la salvezza.','summary_kind':'automatic','text':'protected','reader':{'edition':'Martini','text':'old'}}]}
        enrich_readings(data)
        r=data['readings'][0]
        self.assertEqual(r['summary_kind'],'preview')
        self.assertIn('Babilonia',r['summary'])
        self.assertEqual(r['preview_version'],PREVIEW_VERSION)
        self.assertNotIn('reader',r)
        self.assertEqual(r['text'],'')
        self.assertEqual(data['reader_version'],VERSION)
    def test_archive_drops_unknown_theme_template(self):
        data={'readings':[{'reference':'Mt 99,1-4','summary':'Nel brano emergono questi temi: il regno di Dio.','summary_kind':'automatic'}]}
        enrich_readings(data)
        self.assertEqual(data['readings'][0]['summary'],'')
        self.assertEqual(data['readings'][0]['summary_kind'],'unavailable')
    def test_idempotent(self):
        data={'readings':[{'reference':'Lc 21,29-33','summary':'legacy','text':'secret'}]}
        self.assertEqual(enrich_readings(enrich_readings(data)),data)
    def test_archive_has_no_keyword_themes(self):
        import json
        from pathlib import Path
        folder = Path(__file__).parent / 'site' / 'data'
        for f in folder.glob('2026-11-*.json'):
            obj = json.loads(f.read_text(encoding='utf-8'))
            for reading in obj.get('readings', []):
                preview = reading.get('summary', '')
                self.assertNotIn('Nel brano emergono questi temi', preview, f.name)
                self.assertEqual(reading.get('preview_version'), PREVIEW_VERSION, f.name)

    def test_all_known_previews_are_distinct_and_narrative(self):
        self.assertGreaterEqual(len(SUMMARIES),25)
        for story in SUMMARIES.values():
            self.assertTrue(55 <= len(story) <= 260)
            self.assertNotIn('Nel brano emergono', story)
            self.assertNotIn('i temi',story)

    def test_advent_readings_have_narrative_previews(self):
        for ref, cue in [('Is 63,16b-17.19b;64,2-7','vasaio'),('1Cor 1,3-9','Corinto'),('Mc 13,33-37','portiere')]:
            summary, kind = brief(ref)
            self.assertEqual(kind,'preview')
            self.assertIn(cue,summary)
            data={'readings':[{'reference':ref,'summary':'Titolo breve','summary_kind':'heading','preview_version':PREVIEW_VERSION}]}
            enrich_readings(data)
            self.assertEqual(data['readings'][0]['summary'],summary)
