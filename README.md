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

Fonte delle letture: liturgia del giorno della CEI. Fonte delle meditazioni: archivio pubblico Cerco il Tuo volto. È una selezione automatica conservativa: controlla il riferimento e cerca riscontri nel commento effettivo, senza confonderlo con la trascrizione del Vangelo presente nella pagina. È un criterio euristico, non una revisione teologica umana; può escludere commenti pertinenti, in particolare per riferimenti complessi, oppure risentire delle modifiche dei siti. Nessuna garanzia di reperire un commento ogni giorno o che un collegamento resti disponibile. Se manca una corrispondenza sufficientemente forte, lo dichiara. Non mostra mai una scheda di altra data per coprire un'assenza. Il commento è riferito al Vangelo: non sempre esiste un commento di Epicoco sulla prima lettura o una lettura autonoma dall'Antico Testamento. I testi integrali e le meditazioni sono accessibili tramite collegamenti alle fonti; il repository pubblico conserva solo riferimenti e link, non i testi protetti.

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
- Nessun account, pagamento, modulo di registrazione, cookie applicativo, telemetria o accesso a sensori per i lettori. I dati pubblicati sono soltanto riferimenti delle letture e link alle fonti.
- L'interfaccia usa risorse locali, una Content Security Policy restrittiva e non esegue script di terzi. I contenuti recuperati sono inseriti come testo, non come HTML. Gli indirizzi delle fonti sono controllati sia durante la pubblicazione sia nel browser; i redirect del recupero HTML sono confinati al dominio della fonte. I collegamenti esterni si aprono senza referrer e senza accesso alla finestra originale. I siti esterni restano indipendenti e potrebbero contenere pubblicità o tracciamento.
- Il salvataggio delle schede nel browser è disattivato per impostazione iniziale. L'utente può attivarlo e cancellare i dati locali dalla sezione Privacy e sicurezza. La cache tecnica delle risorse e gli eventuali dati del browser sono gestiti separatamente.
- GitHub Pages registra l'indirizzo IP dei visitatori per sicurezza, anche senza login: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection .
- Proteggi il tuo account GitHub con una passkey o con l'autenticazione a due fattori, non condividere token e non caricare dati privati nel repository pubblico. Esegui periodicamente gli aggiornamenti delle dipendenze e controlla i workflow.
- Non è possibile garantire sicurezza assoluta, disponibilità perpetua o la presenza di una meditazione ogni giorno. 15 test Python locali e verifica sintattica JavaScript superati; collaudo dal vivo sulle fonti esterne e sul sito pubblicato ancora necessario.
