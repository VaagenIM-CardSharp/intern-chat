# Automatisering av utrulling av nettstedet med Docker og GitHub Actions

## Prosjektbeskrivelse
Det ble laget en nettapplikasjon – en chat bygget på Node.js med Socket.IO og SQLite-database. Applikasjonen lar brukere utveksle meldinger i sanntid via nettleseren, mens chat-historikken lagres lokalt i SQLite.

## Mål
Sikre at chat-applikasjonen deployes automatisk på serveren hver gang koden i GitHub-repositoriet endres.

## Arbeidsflyt
1. **Opprettelse av prosjektet**
   - Server- og klientkode for chatten er utviklet i Node.js + Socket.IO.
   - Applikasjonen er pakket i en Docker-kontainer.

2. **Docker-konfigurasjon på serveren (Ubuntu)**
   - Docker er installert, og brukeren er lagt til i `docker`-gruppen.
   - Kontainerne ble verifisert med kommandoen `docker ps`.

3. **Oppsett av GitHub Actions workflow**
   - Filen `.github/workflows/deploy.yml` ble lagt til i repoet.
   - Workflowen bygger Docker-image, publiserer det til GitHub Container Registry (GHCR) og ruller det ut på serveren.

4. **Legge til en self-hosted runner på serveren**
   - GitHub Actions Runner ble lastet ned og installert.
   - Følgende kommandoer ble kjørt:
     ```
     ./config.sh --url https://github.com/<repo-navn> --token <token>
     sudo ./svc.sh install
     sudo ./svc.sh start
     ```
   - Runner-statusen er verifisert som `active (running)`.

5. **Konfigurasjon av GitHub Secrets**
   - Miljøvariabler lagt til: `GHCR_TOKEN`, `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_SSH_KEY`.

6. **Testing av deploy-prosessen**
   - Ved `git push` til `main` starter GitHub Actions bygg og utrulling.
   - En ny Docker-kontainer startes automatisk på serveren.
   - Etter testing med klassekamerater ble det innført en grense på 500 tegn per melding (kan endres via `MAX_MESSAGE_LENGTH`), og klienten håndterer nå feilen riktig når grensen overskrides.

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
- Chat-applikasjonen kjører på en Ubuntu-server.
- Hele CI/CD-kjeden er satt opp: hver kodeendring fører til automatisk utrulling uten manuelle steg.

## Kompetansemål
- **Driftsstøtte**: Prosjektet dekker sentrale oppgaver innen planlegging, drift og sikring av tjenester.
  - `utforske og beskrive komponenter i en driftsarkitektur` – Docker-compose, nginx-proxy og self-hosted runner er dokumentert i README, slik at arkitekturen mellom klient, server, database og CI/CD er tydelig beskrevet.
  - `planlegge og dokumentere arbeidsprosesser og IT-løsninger` – README viser stegvis prosess for bygging, utrulling og feilhåndtering, noe som fungerer som driftsdokumentasjon.
  - `gjøre rede for prinsipper og strukturer for skytjenester og virtuelle tjenester` – Publisering av Docker-images til GHCR og bruk av virtuelle containere på Ubuntu-server demonstrerer praktisk forståelse av virtuelle tjenester.
  - `planlegge, drifte og implementere IT-løsninger som ivaretar informasjonssikkerhet og gjeldende regelverk for personvern` – Bruk av GitHub Secrets og miljøvariabler beskytter nøkler og tilgangsdata gjennom hele pipeline.

- **Brukerstøtte**: Løsningen er testet på ekte brukere, og dokumentasjonen hjelper andre å ta den i bruk.
  - `utøve brukerstøtte og veilede i relevant programvare` – README gir klare instruksjoner for lokal kjøring og Docker-oppstart slik at nye brukere kan sette opp løsningen uten hjelp.
  - `kartlegge behovet for og utvikle veiledninger for brukere og kunder` – Tilbakemeldinger fra klassekamerater førte til begrensning på 500 tegn og forklaringer på hvordan klienten håndterer overliggende meldinger.
  - `bruke og administrere samhandlingsverktøy som effektiviserer samarbeid og deling av informasjon` – GitHub brukes aktivt til versjonskontroll, issues og CI/CD, noe som sikrer kontinuerlig deling av status og endringer.
  - `beskrive og bruke rammeverk for kvalitetssikring av IT-drift` – GitHub Actions fungerer som automatisert kvalitetskontroll ved hver push, med faste steg for bygg, publisering og deploy.

- **Utvikling**: Koden dekker hele utviklingsløpet fra krav til database og distribusjon.
  - `lage og begrunne funksjonelle krav til en IT-løsning basert på behovskartlegging` – Prosjektet adresserer behovet for sanntidssamtaler og automatisk utrulling, formulert i mål- og arbeidsflytseksjonene.
  - `gjøre rede for hensikten med teknisk dokumentasjon og utarbeide teknisk dokumentasjon for IT-løsninger` – README fungerer som teknisk dokumentasjon for arkitektur, bygg og drift.
  - `beskrive og anvende relevante versjonskontrollsystemer i utviklingsprosjekter` – GitHub-repoet med workflows viser hvordan commits trigger bygg og deploy.
  - `modellere og opprette databaser for informasjonsflyt i systemer` – SQLite-databasen (`chat.db`) lagrer meldingshistorikk, med tabellstruktur og opprydding implementert i `index.js`.
