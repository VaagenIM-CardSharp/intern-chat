# Automatisering av utrulling av nettstedet med Docker og GitHub Actions

## Prosjektbeskrivelse
Prosjektet implementerer en nettbasert chat bygget på Node.js, Socket.IO og SQLite. Løsningen gjør det mulig å utveksle meldinger i sanntid gjennom nettleseren, mens meldingshistorikken lagres lokalt i SQLite.

## Mål
Målet er å sikre at chat-applikasjonen oppdateres automatisk på serveren hver gang koden i GitHub-repositoriet endres.

## Arbeidsflyt
1. **Opprettelse av prosjektet**
   - Server- og klientkode ble utviklet i Node.js og Socket.IO.
   - Applikasjonen ble pakket i en Docker-kontainer for enkel utrulling.

2. **Docker-konfigurasjon på serveren (Ubuntu)**
   - Docker ble installert, og en bruker ble lagt til i `docker`-gruppen.
   - Kontainerdriften ble kontrollert med kommandoen `docker ps`.

3. **Oppsett av GitHub Actions workflow**
   - Filen `.github/workflows/deploy.yml` ble lagt inn i repoet.
   - Workflowen bygger Docker-image, publiserer til GitHub Container Registry (GHCR) og oppdaterer serveren.

4. **Legge til en self-hosted runner på serveren**
   - GitHub Actions Runner ble lastet ned og installert.
   - Følgende kommandoer ble benyttet:
     ```
     ./config.sh --url https://github.com/<repo-navn> --token <token>
     sudo ./svc.sh install
     sudo ./svc.sh start
     ```
   - Runneren ble verifisert med statusen `active (running)`.

5. **Konfigurasjon av GitHub Secrets**
   - Miljøvariablene `GHCR_TOKEN`, `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH` og `DEPLOY_SSH_KEY` ble lagt til for å håndtere nøkler og tilkoblingsdata.

6. **Testing av deploy-prosessen**
   - `git push` til `main` utløser bygg og utrulling via GitHub Actions.
   - En ny Docker-kontainer startes automatisk på serveren etter fullført workflow.
   - Testingen med klassekamerater avdekket behovet for en grense på 500 tegn per melding. Løsningen ble implementert via `MAX_MESSAGE_LENGTH`, og klienten viser nå feilmelding dersom grensen overskrides.

## Prosjektstruktur og oppstart

**Nøkkelfiler**
- `index.js` — Express- og Socket.IO-serveren som lagrer meldinger i SQLite (`chat.db`).
- `index.html` — klientgrensesnittet som kobler til Socket.IO og viser meldinger.
- `main.css` — grunnleggende stilark for chatten.
- `docker-compose.yml` og `Dockerfile` — beskriver kontainerne for applikasjonen og proxylaget.
- `.github/workflows/deploy.yml` — GitHub Actions workflow som bygger image og deployer til serveren.

**Lokal kjøring**
1. Installer avhengigheter: `npm install`.
2. Start serveren: `node index.js`.
3. Åpne `http://localhost:3000` i nettleseren.

Valgfrie miljøvariabler: `PORT` (HTTP-port), `CHAT_DB_PATH` (plassering av databasen), `MAX_MESSAGE_LENGTH` og `MAX_STORED_MESSAGES` (grenser for tekstlengde og antall meldinger).

**Kjøring i Docker**
```
docker compose up --build -d
```
Kommandoen bygger imaget, starter tjenestene og kobler til nginx-proxien definert i `docker-compose.yml`.

## Resultat
- Chat-applikasjonen er i drift på en Ubuntu-server.
- Hele CI/CD-kjeden er konfigurert slik at hver kodeendring utløser automatisk utrulling uten manuelle steg.

## Kompetansemål
- **Driftsstøtte**: Beskrivelsen av infrastrukturen viser hvordan løsningen driftes og sikres.
  - `utforske og beskrive komponenter i en driftsarkitektur` – README dokumenterer Docker-compose, nginx-proxy, serverkomponenter og self-hosted runner, og gir en strukturert oversikt over samspillet mellom klient, server, database og CI/CD.
  - `planlegge og dokumentere arbeidsprosesser og IT-løsninger` – Seksjonen om arbeidsflyt beskriver planlagte steg for bygging, utrulling og feilhåndtering og fungerer som driftsdokumentasjon.
  - `gjøre rede for prinsipper og strukturer for skytjenester og virtuelle tjenester` – Bruken av Docker-containere og publisering til GHCR viser hvordan virtuelle tjenester etableres og distribueres.
  - `planlegge, drifte og implementere IT-løsninger som ivaretar informasjonssikkerhet og gjeldende regelverk for personvern` – Secrets i GitHub og miljøvariabler brukes til å beskytte nøkler og tilkoblingsdata i pipeline.

- **Brukerstøtte**: Testingen og dokumentasjonen fokuserer på tydelige instruksjoner og oppfølging av brukernes behov.
  - `utøve brukerstøtte og veilede i relevant programvare` – Instruksjonene for lokal kjøring og Docker-oppstart gjør det mulig for nye brukere å sette opp systemet uten ytterligere bistand.
  - `kartlegge behovet for og utvikle veiledninger for brukere og kunder` – Tilbakemeldinger fra klassekamerater førte til innføring av begrensning på 500 tegn og beskrivelser av feilhåndteringen i klienten.
  - `bruke og administrere samhandlingsverktøy som effektiviserer samarbeid og deling av informasjon` – GitHub benyttes til versjonskontroll, issues og CI/CD, noe som gir kontinuerlig deling av status og endringer.
  - `beskrive og bruke rammeverk for kvalitetssikring av IT-drift` – GitHub Actions fungerer som et kvalitetssikringsrammeverk ved å kjøre faste bygge- og deploy-steg ved hver push.

- **Utvikling**: Koden og dokumentasjonen dekker krav, versjonskontroll og databasedesign.
  - `lage og begrunne funksjonelle krav til en IT-løsning basert på behovskartlegging` – Mål- og arbeidsflytseksjonene beskriver behovet for sanntidschat og automatisert utrulling, og viser hvordan kravene ble oversatt til løsning.
  - `gjøre rede for hensikten med teknisk dokumentasjon og utarbeide teknisk dokumentasjon for IT-løsninger` – README fungerer som teknisk dokumentasjon for arkitektur, bygg og drift.
  - `beskrive og anvende relevante versjonskontrollsystemer i utviklingsprosjekter` – GitHub-repoet dokumenterer hvordan commits trigger bygg og deploy via workflow-filen.
  - `modellere og opprette databaser for informasjonsflyt i systemer` – SQLite-databasen (`chat.db`) og migrasjonene i `index.js` viser hvordan meldingshistorikken lagres og vedlikeholdes.
