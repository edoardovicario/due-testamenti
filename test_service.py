import unittest
from datetime import date
from service import parse_cei, soup, article_body, matches, has_reference, refkey

# Synthetic regression fixtures: do not reproduce publishers' articles.
GOSPEL='Il maestro disse agli amici che la casa del padre accoglie ogni persona che ascolta la sua parola e la mette in pratica.'
CEI='''<html><title>Liturgia del giorno 21 Novembre 2026</title><body><nav>MESSA DEL GIORNO</nav><h1>Messa del Giorno</h1><h3>Festa di prova</h3><h2>Prima Lettura</h2><h3>Testo di prova</h3><p>Dal libro del profeta</p><a>Zc 2,14-17</a><p>Prima lettura di prova.</p><p>Parola di Dio.</p><h2>Salmo Responsoriale</h2><p>Da <a>Lc 1,46-55</a></p><p>Testo del salmo.</p><h2>Vangelo</h2><p>Dal Vangelo secondo Matteo</p><a>Mt 12,46-50</a><p>'''+GOSPEL+'''</p><p>Parola del Signore.</p><h2>Sulle offerte</h2></body></html>'''
def article(comment,old=False):
    block=(comment+'<h4>LEGGI IL BRANO DEL VANGELO</h4><p>'+GOSPEL+'</p>') if old else ('<p>'+GOSPEL+'</p><p>Parola del Signore.</p><p>Fonte: Chiesa Cattolica</p><p>'+comment+'</p>')
    return soup('<h1>don Luigi Maria Epicoco – Commento al Vangelo</h1><a>Mt 12 46-50</a><div class="td-post-content">'+block+'</div>')
class Checks(unittest.TestCase):
    def test_famiglia_cristiana_matching(self):
        from service import fc_matches,safe_fc,find_fc_comment,FC
        from unittest.mock import patch
        d=date(2026,11,26)
        url=FC+'/il-signore-non-ci-lascia-soli-nel-buio-26-novembre-uksv4fud'
        self.assertTrue(safe_fc(url))
        self.assertFalse(safe_fc('https://other.invalid/riflessioni/epicoco-parola-del-giorno/26'))
        document=soup('<h1>Il Signore non ci lascia soli nel buio - 26 novembre</h1><p>Don Luigi Maria Epicoco</p><p>Lc 21,20-28</p><p>Giovedì 26 novembre 2026</p>')
        self.assertTrue(fc_matches(document,d,'Lc 21,20-28'))
        self.assertFalse(fc_matches(document,d,'Lc 21,29-33'))
        self.assertFalse(fc_matches(document,date(2025,11,26),'Lc 21,20-28'))
        with patch('service.fetch',return_value=document):
            result=find_fc_comment(object(),d,'Lc 21,20-28')
        self.assertEqual(result['source'],'Famiglia Cristiana')
        self.assertEqual(result['url'],url)
        self.assertEqual(result['text'],'')

    def test_date_and_readings(self):
        data,g=parse_cei(soup(CEI),date(2026,11,21));self.assertEqual(data['date'],'2026-11-21');self.assertEqual(data['readings'][-1]['reference'],'Mt 12,46-50');self.assertIn('ascolta',g);self.assertEqual(data['readings'][0]['testament'],'Antico Testamento')
    def test_wrong_date(self):
        with self.assertRaises(ValueError):parse_cei(soup(CEI),date(2026,11,22))
    def test_wrong_comment_even_if_gospel_present(self):
        x=article('La vedova gettò due monete nel tesoro. Il valore delle azioni non risiede nel denaro ma nella forte generosità che trasforma il senso delle nostre giornate. Il signore vede ciò che nessuno riesce a distinguere nel cuore della donna.')
        self.assertTrue(has_reference(x,'Mt 12,46-50'));self.assertFalse(matches(article_body(x),GOSPEL))
    def test_correct_comment(self):
        comment='Il maestro disse agli amici che la casa del padre accoglie ogni persona che ascolta la sua parola e la mette in pratica. Questa prospettiva richiama una relazione costruita con fiducia e una quotidiana disponibilità verso gli altri.'
        for old in [False,True]:
            x=article(comment,old);self.assertTrue(matches(article_body(x),GOSPEL));self.assertTrue(has_reference(x,'Mt 12,46-50'));self.assertFalse(has_reference(x,'Lc 12,46-50'))
    def test_unknown_layout(self):
        self.assertIsNone(article_body(soup('<h1>Epicoco</h1><article>testo senza delimitatore</article>')))
if __name__=='__main__':unittest.main()
