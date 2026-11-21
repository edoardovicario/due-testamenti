"""Read the public-domain Catholic Martini Bible using Parola Viva open data.
The CEI calendar defines the readings; the historical translation is not CEI 2008.
Never substitute another reference when the verse mapping is uncertain.
"""
import re, logging, unicodedata
from functools import lru_cache
import httpx

BASE = 'https://parolaviva.art'
SOURCE = BASE + '/opendata'
EDITION = 'Bibbia Martini (1769–1781)'
VERSION = 1
LOG = logging.getLogger(__name__)

def key(s):
    return re.sub(r'\W+', '', unicodedata.normalize('NFKD', s.lower()).encode('ascii','ignore').decode())

# Resolve the book by the name in the Catholic canon, not by Vulgate book number.
BOOKS = dict(zip(
    'Gen Es Lv Nm Dt Gs Gdc Rt 1Sam 2Sam 1Re 2Re 1Cr 2Cr Esd Ne Tb Gdt Est 1Mac 2Mac Gb Sal Pr Qo Ct Sap Sir Is Ger Lam Bar Ez Dn Os Gl Am Abd Gio Mi Na Ab Sof Ag Zc Ml Mt Mc Lc Gv At Rm 1Cor 2Cor Gal Ef Fil Col 1Ts 2Ts 1Tm 2Tm Tt Fm Eb Gc 1Pt 2Pt 1Gv 2Gv 3Gv Gd Ap'.split(),
    'Genesi|Esodo|Levitico|Numeri|Deuteronomio|Giosuè|Giudici|Rut|1 Samuele|2 Samuele|1 Re|2 Re|1 Cronache|2 Cronache|Esdra|Neemia|Tobia|Giuditta|Ester|1 Maccabei|2 Maccabei|Giobbe|Salmi|Proverbi|Ecclesiaste|Cantico dei Cantici|Sapienza|Siracide|Isaia|Geremia|Lamentazioni|Baruc|Ezechiele|Daniele|Osea|Gioele|Amos|Abdia|Giona|Michea|Naum|Abacuc|Sofonia|Aggeo|Zaccaria|Malachia|Matteo|Marco|Luca|Giovanni|Atti|Romani|1 Corinzi|2 Corinzi|Galati|Efesini|Filippesi|Colossesi|1 Tessalonicesi|2 Tessalonicesi|1 Timoteo|2 Timoteo|Tito|Filemone|Ebrei|Giacomo|1 Pietro|2 Pietro|1 Giovanni|2 Giovanni|3 Giovanni|Giuda|Apocalisse'.split('|')))
# Known numbering change checked against the historical text.
MAPPED = {'Zc 2,14-17':'Zc 2,10-13'}
# Some books have substantial differences in numbering; do not guess.
REVIEW = {'Tb','Est','Dn','Sir','Gl','Ml','Zc','Sal','Os','Bar'}
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

def request_json(path):
    # Fixed trusted host and safe path only; no user data, redirects or credentials.
    if not re.fullmatch(r'/api/v1/bibbia/(?:indice\.json|[a-z0-9_-]+/\d+\.json)', path):
        raise ValueError('Percorso non consentito')
    with httpx.Client(timeout=httpx.Timeout(8,connect=5),follow_redirects=False) as client:
        with client.stream('GET',BASE+path,headers={'Accept':'application/json','User-Agent':'DueTestamenti/3.0'}) as r:
            r.raise_for_status()
            data=bytearray()
            for chunk in r.iter_bytes():
                data.extend(chunk)
                if len(data)>2_000_000: raise ValueError('Risposta troppo grande')
            import json
            return json.loads(data)

def canonical_name(s):
    n=key(s)
    for prefix in ('vangelosecondo','librodi','librodei','letteraai','letteraagli','letteraa'):
        if n.startswith(prefix): n=n[len(prefix):]
    return n

@lru_cache(maxsize=1)
def book_index():
    data=request_json('/api/v1/bibbia/indice.json')
    if isinstance(data,dict):
        data=next((data[k] for k in ('libri','books','data','indice') if isinstance(data.get(k),list)),None)
    if not isinstance(data,list): raise ValueError('Indice biblico non riconosciuto')
    return data

def slug_for(book):
    target=canonical_name(BOOKS[book])
    matches=[x.get('s') for x in book_index() if isinstance(x,dict) and canonical_name(str(x.get('n','')))==target]
    if len(matches)!=1 or not isinstance(matches[0],str) or not re.fullmatch(r'[a-z0-9_-]+',matches[0]):
        raise ValueError('Libro non identificato con certezza: '+book)
    return matches[0]

@lru_cache(maxsize=48)
def chapter(book, number):
    data=request_json('/api/v1/bibbia/'+slug_for(book)+'/'+str(number)+'.json')
    if not isinstance(data,dict) or int(data.get('c',0))!=number or canonical_name(str(data.get('n','')))!=canonical_name(BOOKS[book]):
        raise ValueError('Capitolo diverso da quello richiesto')
    verses={}
    for v in data.get('v',[]):
        if not isinstance(v,dict) or not re.fullmatch(r'\d+',str(v.get('n',''))) or not isinstance(v.get('t'),str) or not v['t'].strip():
            continue
        n=int(v['n'])
        if n in verses: raise ValueError('Versetto duplicato')
        verses[n]=v['t'].strip()
    if not verses: raise ValueError('Capitolo vuoto')
    return verses

def parse_reference(ref):
    ref=' '.join(ref.replace('–','-').split())
    mapped=MAPPED.get(ref,ref)
    m=re.fullmatch(r'([1-3]?\s*[A-Za-z]+)\s+(\d+)(?:\s*\((\d+)\))?(?:\s*,\s*(.+))?',mapped)
    if not m: raise ValueError('Riferimento complesso non verificato')
    book=m[1].replace(' ','')
    if book not in BOOKS: raise ValueError('Libro non riconosciuto')
    number=int(m[2]); spec=m[4]
    if not 1<=number<=150: raise ValueError('Capitolo non valido')
    if book=='Sal':
        if spec or not m[3]: raise ValueError('Numerazione del salmo da verificare')
        return book,number,None,'Salmo biblico integrale; la liturgia può utilizzare solo alcune strofe.'
    if book in REVIEW and ref==mapped: raise ValueError('Numerazione storica da verificare')
    if not spec: raise ValueError('Versetti mancanti')
    number_list=[]; partial=False
    # Allow discontinuous verses within one chapter; never silently truncate.
    for part in re.split(r'[.]',spec):
        p=re.fullmatch(r'\s*(\d+)([a-c]?)(?:\s*-\s*(\d+)([a-c]?))?\s*',part)
        if not p: raise ValueError('Intervallo non verificato')
        a=int(p[1]); b=int(p[3] or p[1])
        if not 1<=a<=b<=200: raise ValueError('Intervallo non valido')
        partial=partial or bool(p[2] or p[4])
        number_list.extend(range(a,b+1))
    if not number_list or len(number_list)>160 or number_list!=sorted(set(number_list)):
        raise ValueError('Versetti non validi')
    note='I versetti indicati con lettere sono riportati per intero.' if partial else ''
    if mapped!=ref: note=('Numerazione Martini: '+mapped+'. '+note).strip()
    return book,number,number_list,note

def read_passage(ref):
    book,n,ids,note=parse_reference(ref)
    verses=chapter(book,n)
    if ids is None:
        ids=sorted(verses)
        if len(ids)>40 or ids!=list(range(ids[0],ids[-1]+1)): raise ValueError('Salmo lungo o incompleto: selezione da verificare')
    if any(v not in verses for v in ids): raise ValueError('Uno o più versetti mancanti')
    return dict(edition=EDITION,source=SOURCE,reference=ref,
                text='\n\n'.join(verses[v] for v in ids),note=note)

def enrich_readings(obj):
    for r in obj['readings']:
        if not r.get('summary'):
            r['summary'],r['summary_kind']=brief(r['reference'])
        previous=r.get('reader')
        if isinstance(previous,dict) and previous.get('reference')==r['reference'] and previous.get('edition')==EDITION and previous.get('text'):
            continue
        r.pop('reader',None)
        try:
            r['reader']=read_passage(r['reference'])
            if not r.get('summary'):
                r['summary'],r['summary_kind']=brief(r['reference'],r['reader']['text'])
        except Exception as exc:
            LOG.info('Testo Martini non disponibile (%s): %s',r['reference'],exc)
    obj['reader_version']=VERSION
    return obj
