"""Build dated JSON files; never substitute a different day's readings."""
import json, logging, os, argparse
from datetime import date, datetime, timedelta
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
# Public site: do not publish full copyrighted material.
os.environ['AUTHORIZED_CEI_TEXT'] = '0'
os.environ['AUTHORIZED_EPICOCO_TEXT'] = '0'
from service import refresh, today, ROME, ROOT, refkey, allowed_url, safe_ep
from reader import enrich_readings, VERSION

DATA = ROOT / 'site' / 'data'
LOG = logging.getLogger(__name__)

def read_day(d):
    try:
        obj = json.loads((DATA / (d.isoformat()+'.json')).read_text(encoding='utf-8'))
        return obj if valid(obj, d) else None
    except (OSError, ValueError, TypeError, KeyError):
        return None

def valid(obj, d):
    if not isinstance(obj, dict) or obj.get('date') != d.isoformat(): return False
    readings = obj.get('readings', [])
    g = next((r for r in readings if r.get('kind') == 'vangelo'), None)
    if not g or not any(r.get('kind')=='prima lettura' for r in readings): return False
    if not all(allowed_url(r.get('url',''),{'www.chiesacattolica.it','chiesacattolica.it'}) for r in readings): return False
    c = obj.get('comment', {})
    return bool(g.get('reference') and refkey(g['reference']) == refkey(c.get('reference','')) and c.get('status') in ('matched','pending') and (c.get('status') != 'matched' or safe_ep(c.get('url',''))))

def write_json(p, obj):
    p.parent.mkdir(parents=True, exist_ok=True)
    s = json.dumps(obj, ensure_ascii=False, indent=2) + '\n'
    if p.exists() and p.read_text(encoding='utf-8') == s: return
    tmp = p.with_suffix('.tmp')
    tmp.write_text(s,encoding='utf-8'); tmp.replace(p)

def update(d):
    old = read_day(d)
    # Preserve verified archived cards; retry pending cards and missing dates.
    if old and old['comment']['status']=='matched' and not old.get('stale'):
        enrich_readings(old)
        old['comment']['text']='';old['comment'].pop('preview',None)
        write_json(DATA / (d.isoformat()+'.json'),old)
        return 'matched (archivio)'
    try:
        obj = refresh(d)
        if not valid(obj,d): raise ValueError('Scheda non valida per la data richiesta')
        if old and old['comment']['status']=='matched' and (obj['comment']['status']!='matched' or obj.get('stale')):
            if obj.get('stale') or refkey(old['comment']['reference'])!=refkey(obj['comment']['reference']):
                return 'matched (archivio conservato)'
            obj['comment']=old['comment']
        enrich_readings(obj)
        # BibleGet passages are requested in-browser; only references and summaries are published.
        for r in obj['readings']: r['text']=''
        obj['comment']['text']=''; obj['comment'].pop('preview',None)
        if old and obj.get('stale'): return old['comment']['status']+' (archivio conservato)'
        write_json(DATA / (d.isoformat()+'.json'),obj)
        return obj['comment']['status']+(' (copia)' if obj.get('stale') else '')
    except Exception as exc:
        LOG.warning('%s: %s',d,exc)
        return (old['comment']['status']+' (archivio conservato)') if old else 'non disponibile'

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--date',type=date.fromisoformat); args=parser.parse_args()
    now=today(); days=[args.date] if args.date else [now+timedelta(days=n) for n in (0,1,2,-1,-2)]
    # Initialize SQLite before starting threads.
    from service import read_cache
    read_cache(now)
    with ThreadPoolExecutor(max_workers=2) as executor:
        results=dict(zip((d.isoformat() for d in days),executor.map(update,days)))
    write_json(DATA/'status.json',{'checked_at':datetime.now(ROME).isoformat(),'days':results})
    for d,status in results.items(): print(d,status,flush=True)
    if not args.date and results.get(now.isoformat())=='non disponibile':
        LOG.warning('Letture odierne non disponibili: il sito rimane accessibile con collegamento CEI.')

if __name__=='__main__':
    logging.basicConfig(level=logging.INFO)
    main()
