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

        # Structural-only diagnostics (no article text or verse text).
        for selector in ['article','main','[itemprop="articleBody"]','.article-body','.article-content','.article__body','.content-article','.article-text','.article-detail','.rich-text','.post-content','.body-copy','.content','h1']:
            nodes=page.select(selector)
            if not nodes:continue
            summary=[(n.name,len(n.get_text(' ',strip=True)),len(n.find_all('p')),n.get('class',[])) for n in nodes[:5]]
            print('STRUCT',selector,str(summary)[:460])
        anchor=page.find('h1')
        if anchor:
            n=anchor
            for depth in range(5):
                if not n.parent:break
                n=n.parent
                print('PARENT',depth,n.name,n.get('class',[]),'p=',len(n.find_all('p')),'chars=',len(n.get_text(' ',strip=True)))
        candidates=[]
        for p in page.find_all('p'):
            t=p.get_text(' ',strip=True)
            if len(t)>=140 and 'Gesù' in t:
                candidates.append(p)
        print('PARAGRAPHS long_with_Gesu',len(candidates))
        for p in candidates[:4]:
            print('PARENT OF PARAGRAPH',[(n.name,n.get('class',[])) for n in [p.parent,p.parent.parent,p.parent.parent.parent] if n][:3])

        if not match:
            sys.exit('Article/date/reference match not confirmed')
except Exception as error:
    print('Famiglia Cristiana: live check unavailable:',type(error).__name__,str(error)[:160])
    sys.exit(1)
