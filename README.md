# Due Testamenti, una Storia — edizione gratuita e senza registrazione

App web installabile (PWA) per iPhone, Android e PC. Non richiede un server Python sempre acceso, una carta di credito o un dominio acquistato. GitHub Pages ospita il sito; GitHub Actions esegue il codice Python su runner standard Ubuntu in un repository pubblico. Non è un servizio a disponibilità garantita.

## 1. Prima pubblicazione (Mac o PC)

1. Estrai lo ZIP. Apri https://github.com/new e crea un repository **pubblico** chiamato `due-testamenti`, senza inizializzarlo con README, licenza o .gitignore. Non inserire dati privati: repository e sito sono pubblici.
2. Carica l'intero contenuto del progetto, inclusa la directory nascosta `.github` (contiene il programma automatico). Il modo più affidabile è usare Git da terminale. Nella cartella estratta esegui le istruzioni seguenti, sostituendo `TUO-USERNAME`:

   ```sh
   git init -b main
   git add .
   git commit -m "Prima versione gratuita"
   git remote add origin https://github.com/TUO-USERNAME/due-testamenti.git
   git push -u origin main
   ```

   Se Git chiede nome e email, configura `git config user.name "Il tuo nome"` e `git config user.email "la tua email GitHub o noreply"`. Per autenticarti usa GitHub Desktop o GitHub CLI (`gh auth login`, con autorizzazione workflow se richiesta), oppure un token con i permessi necessari per il repository e i workflow. GitHub non accetta la password dell'account per Git via HTTPS. Non inserire token nei file. In alternativa, usa GitHub Desktop per creare il repository locale dalla cartella estratta, fare commit e pubblicare su GitHub in modalità pubblica. Su macOS premi Cmd+Shift+. nel Finder per vedere `.github`; verifica su GitHub che esista `.github/workflows/letture.yml`.
3. Apri il repository su GitHub, vai in **Settings → Pages → Build and deployment → Source → GitHub Actions**. Non aggiungere un secondo workflow suggerito: quello necessario è già incluso.
4. Vai in **Actions → Letture quotidiane e pubblicazione → Run workflow → main → Run workflow**. Se necessario abilita prima Actions. Se il primo push ha fatto partire un'esecuzione prima di attivare Pages, è sufficiente rilanciarla dopo il punto 3. Se la scrittura del repository è bloccata, verifica Settings → Actions → General e che l'organizzazione/repository consenta al workflow i permessi `contents: write`.
5. Controlla che i job `aggiorna` e `pubblica` siano verdi. In Settings → Pages trovi il link effettivo, solitamente `https://TUO-USERNAME.github.io/due-testamenti/`. Aprilo e controlla il giorno corrente, il riferimento del Vangelo e lo stato del commento. Il primo recupero delle fonti può durare alcuni minuti. Un workflow verde garantisce il deploy, non la disponibilità dei contenuti: i log e `site/data/status.json` mostrano i risultati delle singole date.
6. Invia il link su WhatsApp. Su iPhone: Safari → Condividi → Aggiungi alla schermata Home (Apri come app web, se presente). Su Android: Chrome → menu ⋮ → Installa app o Aggiungi alla schermata Home. Nessun account richiesto a chi legge.

## 2. Aggiornamento automatico

Il workflow viene richiesto alle 00:17, 06:17, 12:17 e 18:17 UTC (01:17, 07:17, 13:17, 19:17 in inverno in Italia; un'ora più tardi in estate). Non sono orari garantiti. A ogni esecuzione Python prova a recuperare oggi, domani, dopodomani e i due giorni precedenti se non già verificati. Il calendario segue Europe/Rome. Le schede con abbinamento verificato vengono conservate nei file JSON datati; niente cicli o data di fine. Le schede in attesa vengono ritentate nel periodo indicato. Una scheda passata non recuperata entro la finestra non compare automaticamente: può essere recuperata manualmente con lo script `python update_site.py --date AAAA-MM-GG` e committata, poi workflow manuale.

Gli aggiornamenti generano normali commit dell'archivio e del registro di controllo, riducendo il rischio di inattività del repository. GitHub può disabilitare le automazioni dei repository pubblici dopo 60 giorni senza attività, ritardare o saltare un job, cambiare i limiti o le condizioni del piano gratuito. Se succede controlla la scheda Actions e riabilita il workflow. Non sono usati servizi a pagamento.

## 3. Pertinenza e indisponibilità

Nel branch sperimentale CEI 2008, il lettore ottiene i versetti online da BibleGet I/O soltanto su richiesta. Nessun testo completo CEI 2008 viene salvato nell'archivio pubblico; i dati storici della precedente traduzione Martini vengono ignorati dal lettore e rimossi dai file JSON.

La PWA conserva l'interfaccia nella cache tecnica; le schede già consultate vengono conservate localmente solo se si attiva l'opzione facoltativa per la lettura offline; offline non può scaricare nuovi contenuti o aprire le fonti esterne. Se una scheda manca, resta disponibile il collegamento alla liturgia CEI della data selezionata. L'archivio incluso ha un solo esempio dalla versione precedente (21/11/2026), chiaramente contrassegnato come copia, non un calendario annuale precaricato.

## 4. Prova tecnica locale facoltativa

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m unittest -v
python update_site.py
python -m http.server 8000 --directory site
```

Apri http://localhost:8000. Per questa edizione non serve avviare FastAPI. Il recupero Internet richiede accesso alle fonti; nell'ambiente di preparazione non è stato possibile collaudare le richieste live. Sono stati eseguiti test con fixture sintetiche, test di conservazione dell'archivio e controlli sintattici JS. Il primo deploy è anche il primo collaudo reale.

Documentazione: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site ; https://docs.github.com/en/actions/concepts/billing-and-usage ; https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows

## 6. Sicurezza e privacy

- In Settings → Pages attiva Enforce HTTPS. Usa esclusivamente il link HTTPS fornito da GitHub.
Nel branch sperimentale CEI 2008, il lettore ottiene i versetti online da BibleGet I/O soltanto su richiesta. Nessun testo completo CEI 2008 viene salvato nell'archivio pubblico; i dati storici della precedente traduzione Martini vengono ignorati dal lettore e rimossi dai file JSON.
- L'interfaccia usa risorse locali, una Content Security Policy restrittiva e non esegue script di terzi. I contenuti recuperati sono inseriti come testo, non come HTML. Gli indirizzi delle fonti sono controllati sia durante la pubblicazione sia nel browser; i redirect del recupero HTML sono confinati al dominio della fonte. I collegamenti esterni si aprono senza referrer e senza accesso alla finestra originale. I siti esterni restano indipendenti e potrebbero contenere pubblicità o tracciamento.
- Il salvataggio delle schede nel browser è disattivato per impostazione iniziale. L'utente può attivarlo e cancellare i dati locali dalla sezione Privacy e sicurezza. La cache tecnica delle risorse e gli eventuali dati del browser sono gestiti separatamente.
- GitHub Pages registra l'indirizzo IP dei visitatori per sicurezza, anche senza login: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection .
- Proteggi il tuo account GitHub con una passkey o con l'autenticazione a due fattori, non condividere token e non caricare dati privati nel repository pubblico. Esegui periodicamente gli aggiornamenti delle dipendenze e controlla i workflow.
- Non è possibile garantire sicurezza assoluta, disponibilità perpetua o la presenza di una meditazione ogni giorno. 15 test Python locali e verifica sintattica JavaScript superati; collaudo dal vivo sulle fonti esterne e sul sito pubblicato ancora necessario.

### Lettore della meditazione
Il pulsante Leggi la meditazione apre, su richiesta esplicita, la pagina originale del commento verificato in un iframe sandbox privo di script e accesso al contesto dell'app, con referrer disattivato e CSP limitata ai domini Cerco il Tuo volto. Non vengono copiati o ripubblicati i commenti integrali. La fonte esterna potrebbe bloccare l'incorporamento, mostrare pubblicità o raccogliere dati; in questo caso, o se il contenuto non è leggibile nel riquadro, rimane disponibile il collegamento al sito originale. Il riquadro viene rimosso alla chiusura e al cambio di giorno. La meditazione incorporata richiede una connessione.


## Sperimentazione CEI 2008 con BibleGet (non pubblicata su main)

- Il lettore usa l'endpoint HTTPS https://query.bibleget.io/v3/ con `version=CEI2008`, `return=json`, `appid=DueTestamentiWeb`, `pluginversion=1.0` dopo il clic su «Leggi il testo».
- Limite di 50 versetti per richiesta, senza suddivisione artificiosa dei brani lunghi; citazioni complesse non verificabili e risposte parziali rinviano al sito CEI.
- Diritti: CEI2008 © Fondazione di Religione “Santi Francesco d’Assisi e Caterina da Siena”. Condizioni di utilizzo del servizio: https://www.bibleget.io/BibleGetIOTermsofService.html
- Le risposte sono mantenute soltanto nella memoria della pagina, evitando richieste duplicate: non sono salvate in file JSON, LocalStorage, IndexedDB o cache del service worker.
- Per la privacy il browser contatta BibleGet con il brano richiesto e l'identificativo dell'app, solo dopo un clic. Richiede connessione a Internet. Nessun account o chiave API necessari.
- I test offline simulano il formato documentato delle risposte. È necessaria una verifica di rete reale e di compatibilità CORS prima del merge su main.

**Compatibilità API (novembre 2026):** l'implementazione pubblicata al momento risponde su `/v3/` con CORS, mentre `/v3/quote` e `/v3/metadata/bibleversions` restituiscono 410 Gone nei controlli GitHub Actions. Il lettore usa quindi l'endpoint v3 effettivamente funzionante e un test live controlla la forma JSON.


## Anteprime narrative delle letture

Le anteprime sono brevi descrizioni originali di quanto accade nel passo, non un elenco di temi o un estratto del testo CEI. `reader.py` contiene una raccolta di anteprime verificate per i riferimenti già presenti e alcuni passi successivi. Per i nuovi giorni, il generatore usa prima un'anteprima verificata, poi solo scene riconosciute con criteri conservativi o il titolo liturgico disponibile. Quando mancano elementi sufficienti per una descrizione attendibile, **non inventa una trama**: omette l'anteprima, mantenendo sempre il pulsante «Leggi il testo» e il collegamento CEI.

`preview_version` consente di aggiornare le vecchie anteprime nei JSON datati senza cambiare la liturgia, l'abbinamento delle meditazioni e la modalità di acquisizione della Bibbia CEI 2008. L'archivio non contiene testi integrali protetti.


## Meditazioni di don Luigi Maria Epicoco: Famiglia Cristiana

Le pagine originali della rubrica https://www.famigliacristiana.it/riflessioni/epicoco-parola-del-giorno hanno priorità quando la data liturgica e il riferimento del Vangelo coincidono. I link verificati per il 24, 25 e 26 novembre 2026 sono presenti nell'archivio. Le nuove pagine sono individuate dalla rubrica e ricontrollate prima di essere collegate. Se l'editore non pubblica un articolo o non è possibile verificare l'abbinamento, il sistema conserva il collegamento precedente validato oppure lo indica come non disponibile.

Il pulsante «Leggi la meditazione» tenta di mostrare in un riquadro isolato **la pagina originale dell'editore**, caricata soltanto su richiesta. Non viene effettuato scraping/rehosting del testo integrale e nessun articolo viene salvato nell'archivio GitHub. I siti esterni possono bloccare l'incorporamento attraverso `X-Frame-Options` o `Content-Security-Policy`: in tal caso occorre usare il collegamento originale sempre visibile. Non aggirare tali restrizioni.

**Diritti di riproduzione:** autore don Luigi Maria Epicoco; fonte editoriale Famiglia Cristiana (Gruppo Editoriale San Paolo). L'attribuzione non equivale a una licenza di ripubblicazione. Per conservare o riprodurre integralmente i commenti direttamente nel layout di Due Testamenti servono un permesso scritto dall'editore e/o dagli altri titolari dei diritti, con estensione alla pubblicazione web, eventuale archiviazione, durata e condizioni di attribuzione. Per contattare la redazione: https://www.famigliacristiana.it/contatti-t2f2do55.


### Lettura integrale autorizzata nell'interfaccia

Su conferma dell'utente di avere ricevuto il permesso, il commento originale di Famiglia Cristiana (e soltanto questo editore) viene ora memorizzato come testo con paragrafi nel JSON del giorno, associato alla data liturgica e al riferimento del Vangelo. Il pulsante «Leggi la meditazione» lo mostra direttamente in-app, senza iframe, con autore, credito editoriale, diritti e link alla pagina originale. La raccolta mantiene i controlli contro pagine non abbinate, layout diversi, duplicazioni e testi incompleti. Il permesso dichiarato andrà rispettato per ambito, durata e eventuale diritto di archiviazione; l'applicazione non pretende diritti d'autore sul testo.


## Podcast consigliato di don Luigi Maria Epicoco (Spotify)

Sezione quotidiana «Podcast consigliato» nel calendario liturgico. Un catalogo locale JSON di oltre 40 puntate reali e URL Spotify verificati viene confrontato automaticamente nel browser con l'anteprima del Vangelo e, quando disponibile, il commento integrale di Famiglia Cristiana. La scelta attribuisce un peso maggiore ai temi presenti in entrambi i testi; la corrispondenza è **orientativa**, basata su titolo e argomenti editoriali delle puntate, non sull'ascolto o sulla trascrizione audio. In caso di dati mancanti resta il collegamento al podcast.

Il player Spotify di una puntata è caricato da `https://open.spotify.com/embed/episode/<id>` soltanto dopo un clic dell'utente, con `encrypted-media` e attribuzione originale, e senza ospitare file audio. È disponibile anche il link diretto. La riproduzione completa può essere limitata da Spotify o dal browser. Il catalogo è aggiornabile includendo nuovi ID verificati in `site/podcast_catalog.json`; senza chiavi Spotify o RSS ufficiale pubblico l'app non può garantire una scansione di tutte le puntate nuove, ma produce quotidianamente la migliore corrispondenza disponibile nel catalogo corrente. L'app non richiede un account per mostrare il suggerimento.

La raccolta iniziale contiene 51 puntate con titoli e identificativi ottenuti dai metadati pubblici ufficiali degli Embed Spotify, compresa la raccolta pubblica «CATECHESI DON LUIGI MARIA EPICOCO». I temi sono etichette redazionali derivate dai titoli, non trascrizioni dell'audio. A parità di affinità è favorita una puntata in cui il tema compaia esplicitamente nel titolo.


## Fedeltà esatta delle letture CEI 2008

Il lettore verifica che i versetti siano tutti e soli quelli richiesti (libro, traduzione, capitolo, numero, ordine e conteggio). Il testo di ogni versetto è visualizzato esattamente come restituito da BibleGet, senza alterarne parole o punteggiatura. Un riferimento liturgico parziale come `9a` o `4b` non viene più espanso al versetto intero: quando non possiamo ottenere quella porzione esatta, l'app mostra un avviso e il collegamento alla CEI ufficiale, senza inventare né aggiungere testo. Gli intervalli tra capitoli senza confini verificati vengono rifiutati per evitare omissioni. Le anteprime restano distinte dal testo biblico.


## Priorità podcast: passo diretto prima del tema

Il sistema verifica **per prime** le citazioni bibliche precise (libro, capitolo, versetti) e le scene bibliche esplicitamente riconoscibili nei metadati delle puntate, confrontandole sia con il Vangelo sia con la Prima Lettura. Solo in mancanza di una puntata del primo tipo calcola il collegamento tematico, attribuendo maggior peso al commento di Epicoco e considerando entrambe le letture. Un riferimento generico a Gesù, a un libro biblico o alla preghiera **non** è trattato come approfondimento diretto di quel brano. Il livello di corrispondenza viene chiarito nel suggerimento. Il catalogo è al momento una selezione verificata di 51 episodi, non l'archivio completo; la sincronizzazione dell'archivio totale richiede le credenziali dell'API Spotify.


### Sincronizzazione di tutte le puntate del podcast

Il processo automatico `podcast_sync.py` interroga l'**API Spotify ufficiale**: verifica l'ID del podcast `3zi4rUpHdKFicPVbJ4pvXM` e percorre tutte le pagine da 50 episodi disponibili nel mercato italiano. Registra soltanto metadati editoriali (titolo, descrizione, link ID), non scarica audio. Le puntate nuove entrano nel catalogo a ogni esecuzione programmata del workflow `letture.yml`. Per abilitare l'inventario completo impostare nei **GitHub Actions secrets** `SPOTIFY_CLIENT_ID` e `SPOTIFY_CLIENT_SECRET`, ottenuti da una Spotify Developer App autorizzata. Queste credenziali restano sul server e non finiscono nel browser o nel repository. Se mancano o Spotify limita l'accesso, resta disponibile la selezione verificata esistente: non viene falsamente dichiarata come completa.


## Video YouTube ufficiali e consigli insieme a Spotify

Il riquadro «Puntata consigliata» confronta i cataloghi YouTube e Spotify: prima riferimenti biblici precisi e scene identificabili nella Prima Lettura o Vangelo, poi i temi della meditazione e delle letture. Il canale ufficiale `@luigimariaepicoco` ha ID `UCK9NyEkJ-X89kXCwp1eXFjw`. Il programma `youtube_sync.py` recupera gli ultimi video dal feed pubblico ufficiale e li conserva; configurando il secret GitHub Actions `YOUTUBE_API_KEY` può scorrere tutte le pagine della playlist caricamenti via API ufficiale. Senza chiave non si garantisce il catalogo storico completo.

La riproduzione video avviene soltanto su clic con iframe `youtube-nocookie.com` (modalità privacy avanzata); il lettore Spotify rimane disponibile. Non vengono scaricati né ospitati file audio/video. Il link originale resta sempre disponibile e possono valere limitazioni decise da YouTube e dal creatore.
