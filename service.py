"""Daily Roman-rite readings and conservative matching of Epicoco articles."""
import re, os, unicodedata, logging, json, time, sqlite3
from datetime import date, datetime
from zoneinfo import ZoneInfo
from urllib.parse import urljoin, urlparse, urlencode
from difflib import SequenceMatcher
from pathlib import Path
import httpx
from bs4 import BeautifulSoup

ROOT=Path(__file__).parent
ROME=ZoneInfo('Europe/Rome')
MONTHS='gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre'.split()
CEI='https://www.chiesacattolica.it/liturgia-del-giorno/'
EP='https://www.cercoiltuovolto.it/'
LOG=logging.getLogger(__name__)
FULL_CEI=os.getenv('AUTHORIZED_CEI_TEXT','0')=='1'
FULL_EP=os.getenv('AUTHORIZED_EPICOCO_TEXT','0')=='1'
DB=Path(os.getenv('CACHE_DB',str(ROOT/'cache.sqlite3')))
NT=set('Mt Mc Lc Gv At Rm 1Cor 2Cor Gal Ef Fil Col 1Ts 2Ts 1Tm 2Tm Tt Fm Eb Gc 1Pt 2Pt 1Gv 2Gv 3Gv Gd Ap'.split())
REF=re.compile(r'(?<!\w)((?:[123]\s*)?[A-Z][a-zA-Z]{0,4})\s*(\d{1,3})\s*[, :]\s*(\d{1,3}[a-z]?(?:\s*[-–.]\s*\d{1,3}[a-z]?)*(?:\s*[,;]\s*\d{1,3}[a-z]?(?:\s*[-–.]\s*\d{1,3}[a-z]?)*)*)')
GREF=re.compile(r'\b(Mt|Mc|Lc|Gv)\s*(\d{1,2})\s*[, :]\s*(\d{1,2}[a-z]?(?:\s*[-–.]\s*\d{1,2}[a-z]?)*)',re.I)
HEADS={'prima lettura','seconda lettura','salmo responsoriale','vangelo','acclamazione al vangelo','sulle offerte','antifona alla comunione','dopo la comunione','colletta','antifona'}

def today(): return datetime.now(ROME).date()
def norm(s):
    return ' '.join(re.findall(r'[a-z0-9]+',unicodedata.normalize('NFKD',s.lower()).encode('ascii','ignore').decode()))
def refkey(s):
    return re.sub(r'\s+','',s.lower()).replace('–','-').replace(':',',')
def date_url(d): return CEI+'?data-liturgia='+d.strftime('%Y%m%d')
def soup(html): return BeautifulSoup(html,'html.parser')
ALLOWED_HOSTS={'www.chiesacattolica.it','chiesacattolica.it','www.cercoiltuovolto.it','cercoiltuovolto.it'}
def allowed_url(url, hosts=ALLOWED_HOSTS):
    try:
        p=urlparse(url)
        return p.scheme=='https' and p.hostname in hosts and not p.username and not p.password and p.port in (None,443)
    except (TypeError,ValueError): return False

def fetch(client,url):
    initial=urlparse(url).hostname
    family={initial, initial.removeprefix('www.'), 'www.'+initial.removeprefix('www.')} if initial in ALLOWED_HOSTS else set()
    for _ in range(5):
        if not allowed_url(url,family): raise ValueError('Indirizzo esterno non consentito')
        with client.stream('GET',url,follow_redirects=False) as r:
            if r.is_redirect:
                url=urljoin(url,r.headers.get('location','')); continue
            r.raise_for_status()
            data=bytearray()
            for chunk in r.iter_bytes():
                data.extend(chunk)
                if len(data)>8_000_000: raise ValueError('Pagina troppo grande')
            return soup(bytes(data).decode(r.encoding or 'utf-8',errors='replace'))
    raise ValueError('Troppi reindirizzamenti')
def clean(s): return ' '.join(s.split())
def lines(node): return [clean(t) for t in node.stripped_strings if clean(t)]
def excerpt(s,n=20): return ' '.join(s.split()[:n])+('…' if len(s.split())>n else '')

def parse_cei(doc,d):
    # Verify date in the liturgical content or document title, never the header's current date alone.
    h=next((x for x in doc.find_all(['h1','h2','h3']) if norm(x.get_text(' ',strip=True))=='messa del giorno'),None)
    if h is None: raise ValueError('Messa del giorno assente')
    expected=f'{d.day} {MONTHS[d.month-1]} {d.year}'
    title=norm(doc.title.get_text(' ',strip=True)) if doc.title else ''
    before=' '.join(norm(str(x)) for x in list(h.previous_elements)[:35] if isinstance(x,str))
    if expected not in title and expected not in before: raise ValueError('Data CEI non confermata')
    rows=[clean(str(x)) for x in h.next_elements if isinstance(x,str) and x.parent.name not in {'script','style'} and clean(str(x))]
    if rows and norm(rows[0])=='messa del giorno': rows=rows[1:]
    celebration=next((x for x in rows if len(x)>8 and norm(x) not in HEADS),'Liturgia del giorno')
    result=[]; evidence=''
    for i,label in enumerate(rows):
        if norm(label) not in {'prima lettura','seconda lettura','salmo responsoriale','vangelo'}: continue
        if any(r['kind']==label.lower() for r in result): continue
        end=next((j for j in range(i+1,len(rows)) if norm(rows[j]) in HEADS),len(rows))
        chunk=rows[i+1:end]; ref=None; pos=0
        for j,x in enumerate(chunk[:12]):
            m=REF.search(x)
            if m and (norm(label)!='vangelo' or m.group(1) in {'Mt','Mc','Lc','Gv'}):
                ref=clean(m.group(0)); pos=j; break
        if not ref:
            if norm(label)=='salmo responsoriale': continue
            raise ValueError('Riferimento mancante: '+label)
        book=re.sub(r'\s+','',REF.search(ref).group(1))
        content=clean(' '.join(chunk[pos+1:]))
        content=re.split(r'\bParola (?:di Dio|del Signore)\b',content,flags=re.I)[0].strip()
        if norm(label)=='vangelo':
            # Preserve a complex reference for display, but do not auto-match it.
            full=chunk[pos].strip()
            if full.startswith(ref) and len(full)<100: ref=full
            evidence=content
        kind=norm(label); testament='Nuovo Testamento' if book in NT else 'Antico Testamento'
        result.append(dict(kind=kind,label=label,reference=ref,testament=testament,text=content if FULL_CEI else '',url=date_url(d)))
    if not any(x['kind']=='prima lettura' for x in result) or not evidence or not any(x['kind']=='vangelo' for x in result): raise ValueError('Letture incomplete')
    return dict(date=d.isoformat(),celebration=celebration,readings=result,source=date_url(d)), evidence

def article_body(doc):
    title=doc.find('h1')
    if not title or 'epicoco' not in norm(title.get_text(' ',strip=True)): return None
    node=doc.select_one('.td-post-content, .tdb_single_content .tdb-block-inner, .entry-content, .post-content') or doc.find('article')
    if node is None: return None
    # Use real content only; ignore navigation, related posts, ads and tags.
    for x in node.select('script,style,nav,aside,.td-a-ad,.td-post-sharing,.td_block_related_posts,.td-post-source-tags'):
        x.decompose()
    text='\n'.join(lines(node))
    # New format: the displayed Gospel is NOT the commentary. Older format: comment before Gospel.
    after=re.search(r'Fonte\s*:\s*Chiesa Cattolica',text,re.I)
    gospel_end=re.search(r'Parola del Signore\.?',text,re.I)
    old=re.search(r'LEGGI IL BRANO DEL VANGELO',text,re.I)
    if old: body=text[:old.start()]
    elif after: body=text[after.end():]
    elif gospel_end: body=text[gospel_end.end():]
    else: return None  # unknown layout -> no unsafe guess
    body=re.split(r'\b(?:Autore\s*:|A\s+utore\s*:|LEGGI LA PREGHIERA|Seguici anche|Tutti i commenti al Vangelo|Articolo precedente|PAGINA FACEBOOK)\b',body,flags=re.I)[0]
    body=clean(body)
    return body if len(body.split())>=35 else None

def matches(body,gospel):
    # Compare the commentary itself (not the copied Gospel, tags or title).
    # Conservative heuristic: require a long contiguous sequence of matching words
    # and at least two distinct matching windows. This is not semantic proof.
    a=norm(body).split(); b=norm(gospel).split()
    if len(a)<35 or len(b)<12: return False
    blocks=SequenceMatcher(None,a,b,autojunk=False).get_matching_blocks()
    return any(x.size>=9 for x in blocks) or sum(x.size for x in blocks if x.size>=5)>=13

def has_reference(doc,ref):
    key=refkey(ref)
    for tag in doc.find_all(['a','h2','h3','p','strong']):
        s=tag.get_text(' ',strip=True)
        if len(s)>170: continue
        for m in GREF.finditer(s):
            if refkey(m.group(1)+' '+m.group(2)+','+m.group(3))==key: return True
    return False

def safe_ep(url):
    return allowed_url(url,{'www.cercoiltuovolto.it','cercoiltuovolto.it'}) and 'epicoco' in urlparse(url).path.lower() and not urlparse(url).path.startswith('/tag/')

def get_candidates(client,d,ref):
    slug=f'{d.day}-{MONTHS[d.month-1]}-{d.year}'
    yield EP+'don-luigi-maria-epicoco-commento-al-vangelo-del-'+slug+'/'
    # WordPress search by exact scripture and author, then the scripture tag archive.
    query='Epicoco '+ref
    try:
        r=client.get(EP+'wp-json/wp/v2/search',params={'search':query,'per_page':20}); r.raise_for_status()
        for x in r.json():
            url=x.get('url','')
            if safe_ep(url): yield url
    except Exception as exc: LOG.info('WP search: %s',exc)
    tag=re.sub(r'[^a-z0-9]+','-',ref.lower()).strip('-')
    for path in (f'tag/{tag}/',f'tag/{tag}/page/2/',f'tag/{tag}/page/3/', '?'+urlencode({'s':query})):
        try:
            doc=fetch(client,EP+path)
            seen=set()
            for a in doc.find_all('a',href=True):
                url=urljoin(EP,a['href'])
                if safe_ep(url) and url not in seen and 'epicoco' in norm(a.get_text(' ',strip=True)):
                    seen.add(url); yield url
        except Exception as exc: LOG.info('Archive search: %s',exc)

def find_comment(client,d,ref,gospel):
    if not re.fullmatch(r'(?:Mt|Mc|Lc|Gv)\s*\d{1,2}\s*,\s*\d{1,2}[a-z]?(?:\s*[-–.]\s*\d{1,2}[a-z]?)*',ref):
        return dict(status='pending',reference=ref,message='Riferimento evangelico complesso: nessun abbinamento automatico sicuro.')
    # Individually reviewed source, also revalidated when reachable.
    manual={'mt12,46-50':'https://www.cercoiltuovolto.it/vangelo-del-giorno-martedi-24-luglio-2018-don-luigi-maria-epicoco/?amp=1'}
    seen=set(); attempts=0
    from itertools import chain
    candidates=iter(get_candidates(client,d,ref))
    first=next(candidates,None)
    for url in chain([first], [manual.get(refkey(ref))],candidates):
        if not url or url in seen or not safe_ep(url): continue
        seen.add(url); attempts+=1
        if attempts>12: break
        try:
            doc=fetch(client,url); body=article_body(doc)
            if body and has_reference(doc,ref) and matches(body,gospel):
                return dict(status='matched',author='don Luigi Maria Epicoco',reference=ref,url=url,source='Cerco il Tuo volto',archived=url!=first,text=body if FULL_EP else '',preview='' if FULL_EP else excerpt(body,18),method='Riferimento esatto e confronto testuale del commento')
        except Exception as exc: LOG.info('Candidate %s: %s',url,exc)
    return dict(status='pending',reference=ref,message='Nessuna meditazione con corrispondenza sufficientemente verificabile. Nuovo tentativo automatico.')

def read_cache(d):
    DB.parent.mkdir(parents=True,exist_ok=True)
    with sqlite3.connect(DB) as con:
        con.execute('CREATE TABLE IF NOT EXISTS days (day TEXT PRIMARY KEY, ts REAL, data TEXT)')
        row=con.execute('SELECT ts,data FROM days WHERE day=?',(d.isoformat(),)).fetchone()
    return (row[0],json.loads(row[1])) if row else (0,None)
def save_cache(d,data):
    with sqlite3.connect(DB) as con:
        con.execute('INSERT OR REPLACE INTO days VALUES (?,?,?)',(d.isoformat(),time.time(),json.dumps(data,ensure_ascii=False)))
def refresh(d):
    ts,cached=read_cache(d)
    ttl=1800 if not cached or cached['comment']['status']!='matched' else 12*3600
    if cached and time.time()-ts<ttl: return cached
    try:
        with httpx.Client(timeout=httpx.Timeout(8,connect=5),headers={'User-Agent':'DueTestamenti/2.0 (personal liturgy reader; respectful cached requests)'}) as client:
            result,gospel=parse_cei(fetch(client,date_url(d)),d)
            ref=next(x['reference'] for x in result['readings'] if x['kind']=='vangelo')
            result['comment']=find_comment(client,d,ref,gospel)
        result['updated_at']=datetime.now(ROME).isoformat(); result['stale']=False
        save_cache(d,result); return result
    except Exception as exc:
        LOG.warning('Refresh %s: %s',d,exc)
        if cached: return dict(cached,stale=True)
        seed=ROOT/'verified_example.json'
        if seed.exists():
            sample=json.loads(seed.read_text())
            if sample['date']==d.isoformat(): return dict(sample,stale=True)
        raise RuntimeError('Fonti temporaneamente non disponibili. Riprova tra poco.') from exc
