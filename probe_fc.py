"""Live check only: NEVER publish, quote or log the protected meditation."""
import sys
import httpx
from datetime import date
from service import FC_VERIFIED, fc_matches, soup

ref, url = FC_VERIFIED['2026-11-26']
try:
    with httpx.Client(timeout=httpx.Timeout(15,connect=6),headers={'User-Agent':'Mozilla/5.0 (compatible; DueTestamenti/2.0)'},follow_redirects=True) as client:
        res=client.get(url)
        res.raise_for_status()
        page=soup(res.text)
        match=fc_matches(page,date(2026,11,26),ref)
        print('Famiglia Cristiana: HTTP',res.status_code,'exact Gospel/date match',match)
        print('Embedding X-Frame-Options:',res.headers.get('x-frame-options','not supplied'))
        print('Embedding CSP:',res.headers.get('content-security-policy','not supplied')[:280])
        if not match:
            sys.exit('Article/date/reference match not confirmed')
except Exception as error:
    print('Famiglia Cristiana: live check unavailable:',type(error).__name__,str(error)[:160])
    sys.exit(1)
