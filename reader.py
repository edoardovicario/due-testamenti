"""Introductory summaries and archive sanitization (no full CEI texts on GitHub).
BibleGet is queried by the user-facing browser, on demand.
"""
import re
import unicodedata

VERSION=2

def key(s):
    return re.sub(r'\W+', '', unicodedata.normalize('NFKD', s.lower()).encode('ascii','ignore').decode())

SUMMARIES = {
 'zc21417':'Dio promette di abitare in mezzo al suo popolo, raccogliendo presso di sé anche le altre nazioni.',
 'lc14655':'Maria esprime la sua gratitudine a Dio, che si prende cura degli umili e mantiene le promesse fatte al suo popolo.',
 'mt124650':'Gesù insegna che la sua vera famiglia comprende chi accoglie e compie la volontà del Padre.',
 'ez3411121517':'Dio si presenta come un pastore che cerca le pecore disperse, cura le più fragili e esercita la giustizia.',
 'ez341112':'Dio promette di radunare il suo popolo come un pastore cerca le pecore disperse.',
 'sal2223':'Il salmista esprime fiducia nella protezione di Dio, anche quando attraversa momenti difficili.',
 '1cor15202628':'Paolo annuncia la risurrezione dei morti in Cristo e la vittoria finale sulla morte.',
 'mt253146':'Gesù descrive il giudizio finale: l’amore concreto verso le persone più bisognose rivela il nostro rapporto con lui.',
 'ap5110':'Giovanni contempla l’Agnello, l’unico degno di aprire il libro sigillato, adorato da tutta l’assemblea celeste.',
 'lc194144':'Gesù piange su Gerusalemme perché non ha riconosciuto il tempo della visita di Dio e la via della pace.',
 'ap10811':'Giovanni riceve un piccolo libro da mangiare e un nuovo incarico profetico; il libro è dolce e poi amaro.',
 'lc194548':'Gesù scaccia i venditori dal tempio e insegna al popolo, mentre le autorità cercano di fermarlo.',
 'ap1413':'Giovanni vede l’Agnello sul monte Sion insieme a una moltitudine che intona un canto nuovo.',
 'ap14134b5':'Giovanni contempla l’Agnello e quanti lo seguono fedelmente, cantando un canto nuovo.',
 'lc2114':'Gesù nota una vedova povera che offre due monetine: il valore del suo dono supera quello delle offerte più ricche.'
}
THEMES = (
 (r'\b(?:risort\w*|risurrezion\w*)\b','la risurrezione'),
 (r'\b(?:perdon\w*|misericordi\w*)\b','il perdono e la misericordia'),
 (r'\b(?:pastor\w*|gregge|pecor\w*)\b','l’immagine del pastore e del gregge'),
 (r'\b(?:preg\w*|orazion\w*|supplic\w*)\b','la preghiera'),
 (r'\b(?:pover\w*|affamat\w*|vedov\w*)\b','l’attenzione alle persone fragili'),
 (r'\b(?:regno|reame)\b','il regno di Dio'),
 (r'\b(?:giustizi\w*|giudic\w*)\b','la giustizia'),
 (r'\b(?:fedelt\w*|fede|cred\w*)\b','la fede'),
 (r'\b(?:amore|carit\w*|amar\w*)\b','l’amore'),
 (r'\b(?:speranz\w*|fiduci\w*)\b','la speranza'),
 (r'\b(?:pace|pacific\w*)\b','la pace'),
 (r'\b(?:lode|lod\w*|benedic\w*)\b','la lode'),
 (r'\b(?:alleanz\w*|promess\w*)\b','le promesse e l’alleanza'),
 (r'\b(?:tempio|santuar\w*)\b','il tempio'),
 (r'\b(?:discepol\w*|apostol\w*)\b','il cammino dei discepoli'),
 (r'\b(?:salvezz\w*|salvazion\w*)\b','la salvezza'),
)
def brief(reference, text='', heading=''):
    known = SUMMARIES.get(key(reference))
    if known: return known, 'summary'
    found = [label for pattern,label in THEMES if re.search(pattern, text.lower())][:3]
    if found:
        return 'Nel brano emergono questi temi: ' + ', '.join(found) + '.', 'automatic'
    if heading and len(heading.split()) <= 18:
        return heading, 'heading'
    return '', ''


def enrich_readings(obj):
    for reading in obj.get('readings',[]):
        reading.pop('reader',None)
        reading['text']=''
        if not reading.get('summary'):
            reading['summary'],reading['summary_kind']=brief(reading['reference'])
    obj['reader_version']=VERSION
    return obj
