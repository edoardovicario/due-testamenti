"""Live verification of the publisher's article extraction. Never log the body."""
import sys
import httpx
from datetime import date
from service import FC_VERIFIED, fc_matches, fc_article_text, soup, safe_fc

try:
    with httpx.Client(timeout=httpx.Timeout(15,connect=6),
                      headers={'User-Agent':'Mozilla/5.0 (compatible; DueTestamenti/2.0)'},
                      follow_redirects=True) as client:
        for day in ('2026-11-24','2026-11-25','2026-11-26'):
            ref,url=FC_VERIFIED[day]
            assert safe_fc(url)
            res=client.get(url)
            res.raise_for_status()
            assert safe_fc(str(res.url))
            page=soup(res.text)
            match=fc_matches(page,date.fromisoformat(day),ref)
            body=fc_article_text(page)
            print(day,'HTTP',res.status_code,'Gospel+date valid',match,
                  'complete body',bool(body),'characters',len(body or ''),
                  'paragraphs',len((body or '').split('\n\n')))
            if not match or not body:
                sys.exit('Publisher content validation failed for '+day)
except Exception as error:
    print('Publisher live check unavailable:',type(error).__name__,str(error)[:160])
    sys.exit(1)
