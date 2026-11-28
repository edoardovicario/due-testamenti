"""Introductory summaries and archive sanitization (no full CEI texts on GitHub).
BibleGet is queried by the user-facing browser, on demand.
"""
import re
import unicodedata

VERSION=2
PREVIEW_VERSION=1

def key(s):
    return re.sub(r'\W+', '', unicodedata.normalize('NFKD', s.lower()).encode('ascii','ignore').decode())

SUMMARIES = {
    "Is 63,16b-17.19b;64,2-7": "Isaia si rivolge a Dio come a un padre e gli chiede di tornare vicino al suo popolo. Riconosce le colpe di Israele e ricorda che tutti sono nelle mani di Dio come l’argilla in quelle del vasaio.",
    "1Cor 1,3-9": "Paolo ringrazia Dio per i doni ricevuti dalla comunità di Corinto. Incoraggia i cristiani ad attendere la venuta di Gesù con fiducia, ricordando che Dio li sostiene ed è fedele.",
    "Mc 13,33-37": "Gesù racconta di un uomo che parte per un viaggio e affida la sua casa ai servi, chiedendo al portiere di vigilare. Invita tutti a restare pronti, perché nessuno sa quando il padrone tornerà.",
    "Zc 2,14-17": "Il profeta invita Gerusalemme a gioire: Dio promette di abitare in mezzo al suo popolo e di accogliere anche genti lontane.",
    "Lc 1,46-55": "Maria innalza il suo canto di gioia: ringrazia Dio perché guarda agli umili, rovescia i potenti e non dimentica le promesse fatte a Israele.",
    "Mt 12,46-50": "Mentre sua madre e i suoi fratelli lo cercano, Gesù indica i discepoli e spiega che la sua famiglia è fatta di chi compie la volontà del Padre.",
    "Ez 34,11-12.15-17": "Dio parla come un pastore che va in cerca delle pecore disperse, riporta a casa quelle smarrite e si prende cura delle più deboli.",
    "Ez 34,11-12": "Dio promette di cercare il suo gregge come un pastore che raduna le pecore disperse e le riporta al sicuro.",
    "Sal 22(23)": "Il salmista si affida a Dio come una pecora al proprio pastore: anche nella valle oscura trova guida, ristoro e protezione.",
    "1Cor 15,20-26.28": "Paolo annuncia che Cristo, risorto per primo, aprirà la strada alla vita per tutti. Alla fine anche la morte sarà sconfitta.",
    "Mt 25,31-46": "Gesù racconta il giudizio finale: il Re riconosce come rivolto a sé ogni gesto di cura verso chi ha fame, è straniero, malato o prigioniero.",
    "Ap 5,1-10": "Giovanni vede un libro sigillato che nessuno riesce ad aprire. Solo l’Agnello può farlo e attorno a lui esplode un canto di lode.",
    "Lc 19,41-44": "Avvicinandosi a Gerusalemme, Gesù piange sulla città: vorrebbe che riconoscesse la strada della pace, ma ne annuncia la rovina.",
    "Ap 10,8-11": "Giovanni riceve l’ordine di mangiare un piccolo libro: è dolce in bocca e amaro nello stomaco. Poi deve tornare a profetizzare.",
    "Lc 19,45-48": "Gesù entra nel tempio e manda via i venditori. Mentre insegna alla folla, i capi religiosi cercano il modo di fermarlo.",
    "Ap 14,1-3.4b-5": "Giovanni vede l’Agnello sul monte Sion insieme a coloro che gli sono rimasti fedeli. Davanti al trono risuona un canto nuovo.",
    "Ap 14,1-3": "Giovanni vede l’Agnello sul monte Sion con una moltitudine che porta il suo nome. Dal cielo si leva un canto nuovo.",
    "Lc 21,1-4": "Gesù osserva una vedova che lascia due monetine nel tesoro del tempio. Il suo piccolo dono vale più delle grandi offerte dei ricchi.",
    "Ap 14,14-19": "Giovanni vede una figura simile a un figlio d’uomo e degli angeli con falci affilate: arriva il momento della mietitura e della vendemmia della terra.",
    "Lc 21,5-11": "Mentre alcuni ammirano il tempio, Gesù annuncia che un giorno sarà distrutto. Parla di guerre e falsi messia, invitando a non lasciarsi spaventare.",
    "Ap 15,1-4": "Giovanni vede i vincitori della bestia presso un mare di cristallo. Cantano il canto di Mosè e dell’Agnello, lodando la giustizia di Dio.",
    "Lc 21,12-19": "Gesù avverte i discepoli che incontreranno arresti, tradimenti e persecuzioni. Proprio in quelle prove potranno testimoniare con coraggio.",
    "Ap 18,1-2.21-23;19,1-3.9a": "Un angelo annuncia la caduta di Babilonia e la fine del suo potere. Nel cielo risuona un canto di gioia e arriva l’invito alle nozze dell’Agnello.",
    "Lc 21,20-28": "Gesù annuncia giorni terribili per Gerusalemme e segni che sconvolgeranno il mondo. Poi invita ad alzare lo sguardo: la liberazione si avvicina.",
    "Ap 20,1-4.11-21,2": "Giovanni vede il male incatenato e il giudizio davanti al trono di Dio. Poi il mondo antico scompare e appare una Gerusalemme nuova, discesa dal cielo.",
    "Lc 21,29-33": "Gesù indica il fico: quando spuntano le foglie, si capisce che l’estate è vicina. Così i discepoli potranno riconoscere i segni del Regno.",
    "Ap 22,1-7": "Giovanni contempla un fiume d’acqua viva e l’albero della vita nella città di Dio. Non c’è più notte e una voce annuncia un ritorno ormai vicino.",
    "Lc 21,34-36": "Gesù invita i discepoli a non lasciarsi appesantire dalle preoccupazioni e dagli eccessi. Chiede di restare svegli e di pregare per affrontare ciò che verrà.",
    "Is 2,1-5": "Isaia immagina i popoli in cammino verso il monte del Signore: le spade diventano aratri e le nazioni imparano a vivere in pace.",
    "Rm 13,11-14": "Paolo invita i cristiani a svegliarsi dal sonno: la notte sta finendo e occorre abbandonare le opere delle tenebre per vivere nella luce.",
    "Mt 24,37-44": "Gesù ricorda i giorni di Noè, quando nessuno si accorse di ciò che stava per accadere. Invita a vigilare, perché il suo ritorno sorprenderà tutti.",
    "Rm 10,9-18": "Paolo spiega che la fede nasce dall’ascolto della parola di Cristo e che qualcuno deve annunciarla perché possa raggiungere ogni persona.",
    "Mt 4,18-22": "Gesù incontra alcuni pescatori sulle rive del lago e li chiama a seguirlo. Pietro, Andrea, Giacomo e Giovanni lasciano subito le reti.",
    "Is 11,1-10": "Isaia annuncia un germoglio della stirpe di Iesse: un sovrano guidato dallo Spirito porterà giustizia e una pace così profonda da riconciliare perfino gli animali.",
    "Lc 10,21-24": "Gesù ringrazia il Padre perché rivela i misteri del Regno ai piccoli. Poi dice ai discepoli che i loro occhi vedono ciò che molti avevano atteso.",
    "Is 25,6-10a": "Isaia descrive un banchetto preparato da Dio per tutti i popoli: il velo del dolore sarà tolto e perfino la morte verrà sconfitta.",
    "Mt 15,29-37": "Gesù guarisce molte persone sulla montagna e prova compassione per la folla affamata. Con pochi pani e pesci dà da mangiare a tutti.",
    "Is 26,1-6": "Il profeta immagina una città forte le cui porte si aprono ai giusti: chi confida nel Signore trova una pace stabile.",
    "Mt 7,21.24-27": "Gesù paragona chi ascolta e mette in pratica le sue parole a un uomo che costruisce la casa sulla roccia: la tempesta non riesce ad abbatterla.",
}
SUMMARIES = {key(reference): preview for reference, preview in SUMMARIES.items()}
# Only high-confidence, content-grounded scenarios. No generic keyword/theme labels.
SCENES = (
    (r'\bciec\w*\b', r'\bguari\w*\b', 'Gesù incontra una persona cieca e le restituisce la vista.'),
    (r'\b(?:reti|pescator\w*)\b', r'\b(?:seguir\w*|segu\w*|chiam\w*)\b', 'Gesù chiama alcuni pescatori a seguirlo: per rispondere lasciano il loro lavoro e le reti.'),
    (r'\b(?:pani|pane)\b', r'\b(?:folla|sazi\w*|sfam\w*)\b', 'Gesù si prende cura di una folla affamata e distribuisce il pane, finché tutti possono mangiare.'),
)
def brief(reference, text='', heading=''):
    """An original, short narrative, never a generic list of themes.

    Curated previews take precedence. For unfamiliar readings use a verified
    heading only as a distinct source title, never as a narrative preview. We process the
    source text only transiently; copyrighted CEI verses are never published.
    """
    known = SUMMARIES.get(key(reference))
    if known:
        return known, 'preview'
    if reference.lstrip().startswith(('Mt ', 'Mc ', 'Lc ', 'Gv ')) and text:
        normalized = ' '.join(text.lower().split())
        for person_cue, action_cue, narrative in SCENES:
            if re.search(person_cue, normalized) and re.search(action_cue, normalized):
                return narrative, 'preview'
    heading = ' '.join(heading.split()).strip()
    if heading and len(heading.split()) <= 24 and len(heading) <= 165:
        return heading.rstrip('.!?') + '.', 'heading'
    return '', 'unavailable'



def enrich_readings(obj):
    for reading in obj.get('readings',[]):
        reading.pop('reader',None)
        reading['text']=''
        if reading.get('preview_version') != PREVIEW_VERSION or reading.get('summary_kind') != 'preview':
            updated, kind = brief(reading['reference'])
            if updated:
                reading['summary'], reading['summary_kind'] = updated, kind
            elif reading.get('summary_kind') == 'automatic' or 'Nel brano emergono questi temi' in reading.get('summary',''):
                # An unverifiable story is worse than no teaser.
                reading['summary'], reading['summary_kind'] = '', 'unavailable'
            reading['preview_version'] = PREVIEW_VERSION
        if not reading.get('summary'):
            reading['summary_kind'] = 'unavailable'
    obj['reader_version']=VERSION
    return obj
