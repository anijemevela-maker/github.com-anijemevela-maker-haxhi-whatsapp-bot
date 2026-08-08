# Asistent WhatsApp — Apartamenta e Haxhi (Sarandë)

Ky server bën bisedën automatike të vërtetë në WhatsApp, e njëjta logjikë si demo-ja HTML, por e lidhur me numrin real **+355 68 343 9349** përmes **Twilio WhatsApp API**.

---

## Pse nevojitet Twilio (ose Meta Cloud API)?

WhatsApp normal (aplikacioni në telefon) **nuk lejon automatizim**. Për të bërë përgjigje automatike mbi një numër, WhatsApp kërkon kalim përmes një ofruesi zyrtar si **Twilio**, **Meta Cloud API**, ose **360dialog**. Këto lidhin numrin me një server (këtë kod) që përgjigjet vetë.

Ky guide përdor **Twilio**, sepse ka provë falas dhe fillon menjëherë me "Sandbox" (test), pa pritur miratim biznesi.

---

## Hapat që duhen bërë (nga ju/Haxhi)

### 1. Krijo llogari Twilio
- Shko te [twilio.com/try-twilio](https://www.twilio.com/try-twilio) dhe regjistrohu (falas, kërkon email + numër telefoni për verifikim).
- Në Console (console.twilio.com), gjeni **Account SID** dhe **Auth Token** — këto shkojnë te `.env`.

### 2. Aktivizo WhatsApp Sandbox (për testim të shpejtë)
- Në Twilio Console → **Messaging → Try it out → Send a WhatsApp message**.
- Do t'ju japë një numër Twilio (p.sh. `+1 415 523 8886`) dhe një kod (p.sh. `join fjala-x`).
- Nga telefoni juaj (ose i Haxhit), dërgoni atë kod si mesazh WhatsApp te ai numër — kjo "lidh" telefonin tuaj test me sandbox-in.
- ⚠️ Sandbox-i është vetëm për **testim**, funksionon vetëm me numra që kanë dërguar kodin "join". Për përdorim real me çdo klient, duhet hapi 5 (numër biznesi i miratuar).

### 3. Instalo dhe konfiguro serverin
```bash
npm install
cp .env.example .env
```
Plotëso `.env` me `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, dhe `TWILIO_WHATSAPP_FROM` (numri sandbox nga hapi 2).

### 4. Hosto serverin diku publik (Twilio duhet ta arrijë URL-në)

**Opsioni më i thjeshtë: Render.com (falas për fillim)**

1. Krijo një repo GitHub dhe hidh gjithë këtë folder aty (`server.js`, `sheets.js`, `package.json`, `render.yaml`, etj).
2. Shko te [render.com](https://render.com) → **New → Blueprint** → lidh repo-n GitHub. Render e lexon `render.yaml` automatikisht dhe krijon shërbimin.
3. Render do të kërkojë t'i plotësosh ndryshoret e shënuara `sync: false` (sepse janë sekrete): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, dhe (nëse do Google Sheets) `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`.
4. Kliko **Deploy**. Pas ~2 minutash do të kesh një URL si:
   ```
   https://haxhi-whatsapp-bot.onrender.com
   ```
   *(Shënim: plani falas i Render "fle" pas ~15 min pa trafik dhe zgjohet me vonesë ~20-30 sek në mesazhin e parë — mjafton për një hotel të vogël, por nëse duhet përgjigje e menjëhershme gjithmonë, plani me pagesë ~$7/muaj e mban gjithmonë zgjuar.)*

Alternativa të ngjashme: **Railway.app**, **Fly.io** — procesi është pothuajse identik (lidh GitHub → vendos env vars → deploy).

### 5. Lidh URL-në me Twilio (Webhook)
- Twilio Console → **Messaging → WhatsApp Sandbox Settings** (për testim) *ose* **Senders → WhatsApp senders** (për numrin real, pas miratimit).
- Te fusha **"When a message comes in"**, vendos:
  ```
  https://haxhi-whatsapp-bot.onrender.com/webhook
  ```
- Ruaj. Tani çdo mesazh që vjen në atë numër WhatsApp, e merr serveri dhe përgjigjet automatikisht sipas logjikës në `server.js`.

### 6. Njoftim automatik te Haxhi për rezervime të reja (WhatsApp)
Në `.env`, `OWNER_WHATSAPP_TO` është vendosur te `+355683439349`. Sapo dikush plotëson një kërkesë rezervimi te bot-i, serveri i dërgon Haxhit automatikisht një mesazh përmbledhës në WhatsApp. (Kjo funksionon vetëm kur numri i Haxhit gjithashtu ka bërë "join" te sandbox — ose pas miratimit të numrit real, funksionon automatikisht.)

---

## Google Sheets — ruajtja automatike e rezervimeve

Çdo rezervim i ri shtohet si rresht i ri në një Google Sheet, që Haxhi mund ta hapë pa prekur kod fare.

### 1. Krijo Google Sheet
- Krijo një sheet të ri (p.sh. "Rezervime Haxhi"), me kokë rreshti në rreshtin e parë:
  ```
  Data & ora | Datat e kërkuara | Persona | Emri | Telefoni | Statusi
  ```
- Krijo (ose riemërto) një tab me emrin `Rezervime` (ose çfarëdo emri, dhe vendose te `GOOGLE_SHEET_TAB` në `.env`).
- Kopjo ID-në e sheet-it nga URL-ja:
  ```
  https://docs.google.com/spreadsheets/d/[KETU_ESHTE_ID]/edit
  ```
  Ky ID shkon te `GOOGLE_SHEET_ID`.

### 2. Krijo një "Service Account" në Google Cloud
- Shko te [console.cloud.google.com](https://console.cloud.google.com) → krijo projekt të ri (p.sh. "haxhi-bot").
- Aktivizo **Google Sheets API** (Search bar → "Google Sheets API" → Enable).
- Shko te **IAM & Admin → Service Accounts → Create Service Account**. Jepi një emër (p.sh. "haxhi-bot"), pa role shtesë të nevojshme.
- Hap service account-in e krijuar → tab **Keys → Add Key → Create new key → JSON**. Do të shkarkohet një skedar `.json`.
- Nga ai skedar merr:
  - `client_email` → shko te `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - `private_key` → shko te `GOOGLE_PRIVATE_KEY` (ruaje saktësisht me `\n` brenda thonjëzave, siç është në `.env.example`)

### 3. Jep akses service account-it te sheet-i
- Hap Google Sheet-in → **Share** → shto email-in e service account-it (diçka si `haxhi-bot@haxhi-bot-123456.iam.gserviceaccount.com`) si **Editor**.
- Pa këtë hap, serveri s'ka të drejtë të shkruajë në sheet.

### 4. Vendos ndryshoret në `.env` (ose te Render, si "Environment Variables")
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="..."
GOOGLE_SHEET_ID=...
GOOGLE_SHEET_TAB=Rezervime
```

Kaq — nga ky moment, çdo rezervim i ri nga bot-i shtohet automatikisht si rresht i ri në sheet, njëkohësisht me njoftimin WhatsApp te Haxhi. Nëse Google Sheets nuk është konfiguruar ende, boti vazhdon të funksionojë normalisht (thjesht e anashkalon atë hap).

---



## Nga sandbox → numër real i miratuar

Për të përdorur **vetë numrin +355 68 343 9349** si bot (jo një numër Twilio test), duhet:
1. Në Twilio Console → **Senders → WhatsApp senders → Register a WhatsApp number**.
2. Twilio ju çon te procesi i **Meta Business Verification** — kërkon: emër biznesi, adresë, dokument identifikimi/biznesi, dhe vetë numrin +355 68 343 9349 (duhet mos jetë i lidhur me WhatsApp personal aktualisht — çregjistrohet fillimisht nga app-i normal).
3. Miratimi zakonisht merr **1–5 ditë pune**.
4. Pas miratimit, ndryshoni `TWILIO_WHATSAPP_FROM` në `.env` me numrin real, dhe lidhni webhook-un te ai sender (jo më sandbox).

**Kosto**: Twilio nuk ka pagesë mujore fikse për sandbox; për numër biznesi real ka kosto për mesazh (~$0.005–0.01/mesazh, ndryshon sipas vendit) plus çdo kosto e mundshme e Meta-s për "conversation-based pricing". Çmimet e sakta duhen kontrolluar te [twilio.com/whatsapp/pricing](https://www.twilio.com/en-us/whatsapp/pricing) pasi ndryshojnë me kohën.

---

## Çfarë mund të ndihmoj unë nga këtu
- Ta rregulloj/personalizoj logjikën e bisedës (çmime, dhoma, FAQ) — thjesht ma jep informacionin e saktë.
- Ta përgatis kodin për deploy te Render/Railway hap pas hapi.
- Të krijoj skedën/foljetin për ruajtjen e rezervimeve (p.sh. në Google Sheets automatikisht).

Çfarë **nuk** mund ta bëj unë vetë: të hap llogarinë Twilio, të plotësoj verifikimin e biznesit, ose të çregjistroj numrin nga WhatsApp personal — këto kërkojnë akses direkt te llogaria/numri i Haxhit.
