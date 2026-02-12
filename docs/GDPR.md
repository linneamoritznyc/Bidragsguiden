# GDPR-krav for svenska webbappar
> **Sammanställt av:** Claude (Anthropic) den 12 februari 2026
> **Syfte:** Checklista och referensdokument for GDPR-compliance vid utveckling av svenska webbapplikationer med Supabase-stack
> **Licens:** Fritt att använda och anpassa

---

## Innehåll

1. [Rättslig grund for behandling](#1-rättslig-grund-for-behandling)
2. [Registrerades rättigheter](#2-registrerades-rättigheter)
3. [Samtycke vid registrering](#3-samtycke-vid-registrering)
4. [Integritetspolicy](#4-integritetspolicy)
5. [Databehandlingsavtal (DPA)](#5-databehandlingsavtal-dpa)
6. [Register over behandlingar](#6-register-over-behandlingar)
7. [Privacy by Design & Default](#7-privacy-by-design--default)
8. [Datalagring](#8-datalagring)
9. [Säkerhet](#9-säkerhet)
10. [Cookie-samtycke](#10-cookie-samtycke)
11. [Incidentrapportering](#11-incidentrapportering)
12. [Konsekvensbedomning (DPIA)](#12-konsekvensbedomning-dpia)
13. [Implementeringsstatus](#13-implementeringsstatus)
14. [Källor och referenser](#14-källor-och-referenser)

---

## 1. Rättslig grund for behandling

**GDPR Art. 6**

Varje typ av personuppgiftsbehandling kräver en specificerad rättslig grund. Samtycke är bara en av sex mojliga grunder.

| Rättslig grund | Exempel i app-kontext |
|---|---|
| **Avtal** (Art. 6.1b) | Kontodata, betalningsuppgifter -- nodvändigt for att fullgora tjänsten |
| **Samtycke** (Art. 6.1a) | Nyhetsbrev, marknadsforing, icke-nodvändiga cookies |
| **Berättigat intresse** (Art. 6.1f) | Grundläggande analytics, bedrägeribekämpning |
| **Rättslig forpliktelse** (Art. 6.1c) | Bokforingsdata som måste sparas enligt lag |

**Krav:** Dokumentera vilken rättslig grund som gäller for varje datatyp i appen. Blanda inte ihop avtal och samtycke -- om data krävs for att leverera tjänsten är det avtal, inte samtycke.

---

## 2. Registrerades rättigheter

**GDPR Art. 15--22**

Användare har foljande rättigheter som appen måste stodja:

**Rätt att radera data -- Art. 17 ("Right to be forgotten")**
- Användare måste kunna radera sitt konto och ALL sin data
- Ska vara enkelt att hitta (inte gomt bakom flera menyer)
- Ska vara permanent och faktiskt ta bort datan (inte bara markera som raderad)
- Tredjeparter som fått datan ska informeras om raderingen

**Rätt till dataportabilitet -- Art. 20**
- Användare ska kunna ladda ner all sin data
- Formatet ska vara maskinläsbart (JSON, CSV)
- Data ska kunna overforas direkt till annan tjänst om tekniskt mojligt

**Rätt till rättelse -- Art. 16**
- Användare ska kunna korrigera felaktig persondata
- Implementera redigeringsmojlighet i profil/inställningar

**Rätt till begränsning av behandling -- Art. 18**
- Användare kan begära att behandling pausas (t.ex. vid tvist om datakorrekthet)

**Rätt att gora invändningar -- Art. 21**
- Användare kan invända mot behandling baserad på berättigat intresse
- Särskilt relevant vid direktmarknadsforing (absolut rätt att invända)

**Rätt till information -- Art. 13--14**
- Informera användare om databehandlingen vid insamlingstillfället

---

## 3. Samtycke vid registrering

**GDPR Art. 7**

- Tydlig information om vad datan används till
- Checkbox for godkännande -- får **INTE** vara forkryssad
- Samtycke ska vara fritt, specifikt, informerat och otvetydigt
- Länk till integritetspolicy
- Spara bevis på när och hur samtycke gavs (tidsstämpel, version av policy)
- Lika enkelt att dra tillbaka samtycke som att ge det

---

## 4. Integritetspolicy

**GDPR Art. 13--14**

Integritetspolicyn ska innehålla:

- Vilken data som samlas in och kategorier av personuppgifter
- Rättslig grund for varje behandling
- Syfte med behandlingen
- Hur länge datan sparas (lagringsperiod per datatyp)
- Vem som har tillgång (tredje parter, underbiträden)
- Användarens rättigheter och hur de utövas
- Kontaktinfo till personuppgiftsansvarig
- Rätt att klaga till IMY (Integritetsskyddsmyndigheten)
- Information om eventuella overforingar till tredjeland

---

## 5. Databehandlingsavtal (DPA)

**GDPR Art. 28**

Skriftliga avtal krävs med alla tredjeparter (personuppgiftsbiträden) som behandlar persondata åt dig.

**Vanliga biträden i en Supabase-stack:**

| Tjänst | DPA-status |
|---|---|
| **Supabase** | DPA tillgänglig via [supabase.com/legal/dpa](https://supabase.com/legal/dpa) -- signeras via PandaDoc |
| **Vercel** | DPA ingår i Terms of Service |
| **Stripe** | DPA tillgänglig via Stripe Dashboard |
| **Resend/SendGrid** | Kontrollera respektive tjänsts DPA |
| **Analytics-verktyg** | Kontrollera GDPR-compliance (overväg EU-baserade alternativ som Plausible eller Matomo) |

**Krav:** Signera DPA med varje biträde innan lansering. Spara kopiorna.

---

## 6. Register over behandlingar

**GDPR Art. 30**

Intern dokumentation (behover inte vara synlig for användare men krävs vid granskning av IMY).

Registret ska innehålla:

- Namn och kontaktuppgifter till personuppgiftsansvarig
- Kategorier av registrerade (t.ex. "appanvändare", "kunder")
- Kategorier av personuppgifter (t.ex. "namn", "e-post", "platsdata")
- Syfte med varje behandling
- Rättslig grund
- Kategorier av mottagare (t.ex. "Supabase som biträde")
- Overforingar till tredjeland (om tillämpligt)
- Lagringsperioder
- Beskrivning av tekniska och organisatoriska säkerhetsåtgärder

> **Notera:** Undantag finns for foretag med färre än 250 anställda, men bara om behandlingen inte inkluderar känsliga uppgifter, inte sker regelbundet, eller inte innebär risk. I praktiken behover de flesta appar ett register.

---

## 7. Privacy by Design & Default

**GDPR Art. 25**

- **Dataminimering:** Samla bara in data du faktiskt behover for appens funktion
- **Privacy by Default:** Standardinställningar ska vara de mest integritetsvänliga
- **Pseudonymisering:** Använd anonymiserad/pseudonymiserad data där mojligt
- Bygg in integritetsskydd från start -- inte som eftertanke

---

## 8. Datalagring

**GDPR Art. 44--49**

- Lagra persondata inom EU/EES om mojligt
- Supabase EU-region (t.ex. `eu-west-1`, `eu-central-1`) uppfyller detta krav
- Om data overfors utanfor EU: kräver extra skyddsåtgärder (Standard Contractual Clauses, adequacy decisions, eller Binding Corporate Rules)
- Dokumentera var all data lagras och vilka underbiträden som är involverade

---

## 9. Säkerhet

**GDPR Art. 32**

- Kryptering av känslig data (i transit och i vila)
- Säker autentisering (Supabase Auth med RLS uppfyller grundkraven)
- Logga åtkomst till persondata
- Regelbundna säkerhetsgranskningar
- Princip om minsta mojliga behorighet (least privilege)
- Säkerhetskopiering och återställningsplan

---

## 10. Cookie-samtycke

**GDPR + ePrivacy-direktivet**

- Cookie-banner som tydligt forklarar vilka cookies som används och varfor
- Mojlighet att **neka** icke-nodvändiga cookies (inte bara "acceptera")
- Spara användarens val
- Inga icke-nodvändiga cookies får sättas innan samtycke ges
- Supabase auth-cookies räknas generellt som "strikt nodvändiga" och kräver inte samtycke, men om du lägger till analytics-cookies eller tredjepartscookies behovs cookie-banner

---

## 11. Incidentrapportering

**GDPR Art. 33--34**

- Personuppgiftsincidenter (dataläckor) måste rapporteras till **Integritetsskyddsmyndigheten (IMY)** inom **72 timmar**
- Om incidenten innebär hog risk for individer ska även de berorda personerna informeras
- Dokumentera alla incidenter (även de som inte rapporteras till IMY)
- Ha en intern plan for incidenthantering redo innan lansering

**Rapporteringsformulär:** [imy.se -- Anmäl personuppgiftsincident](https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/personuppgiftsincidenter/)

---

## 12. Konsekvensbedömning (DPIA)

**GDPR Art. 35**

En DPIA (Data Protection Impact Assessment) krävs om behandlingen innebär **hög risk** for individer. Exempel på när DPIA behövs:

- Systematisk och omfattande profilering
- Behandling av känsliga uppgifter i stor skala
- Systematisk overvakning av allmänt tillgängliga platser
- **Platsdata i stor skala** (relevant for appar som hanterar GPS-data)

Om din app hanterar platsdata (t.ex. GPS-spårning av fordon eller ruttplanering), genomfor en DPIA innan lansering.

---

## 13. Implementeringsstatus

### Implementerat
- [x] Radera konto (all data raderas permanent via delete_user_data RPC)
- [x] EU-lagring (Supabase EU-region)
- [x] Säker auth (Supabase Auth med RLS)
- [x] Exportera data-funktion (JSON-export av profil, bidrag, sokhistorik, användning)
- [x] Integritetspolicy-sida med alla GDPR-sektioner
- [x] Samtycke-checkbox vid registrering (inte forkryssad)
- [x] Rättslig grund dokumenterad (samtycke, Art. 6.1a)
- [x] Lagringsperioder specificerade
- [x] IMY-kontaktinfo i integritetspolicyn

### Saknas fortfarande
- [ ] Databehandlingsavtal med tredjeparter (Supabase DPA m.fl.)
- [ ] Register over behandlingar (intern dokumentation)
- [ ] Rätt till rättelse i UI (redigera profil/persondata)
- [ ] DPIA for appar med platsdata (ej tillämpligt for Bidragsguiden)
- [ ] Incidenthanteringsplan
- [ ] Bevis på samtycke (tidsstämplar, version av policy)

---

## 14. Källor och referenser

### Svenska myndigheter
- **IMY -- Integritetsskyddsmyndigheten (Sveriges dataskyddsmyndighet)**
  - Dataskydd for verksamheter: [imy.se/verksamhet/dataskydd](https://www.imy.se/verksamhet/dataskydd/)
  - GDPR i fulltext (svenska): [imy.se -- Dataskyddsforordningen i fulltext](https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/introduktion-till-gdpr/dataskyddsforordningen-i-fulltext/)
  - Dataskydd for foretag: [imy.se/verksamhet/dataskydd/dataskydd-pa-olika-omraden/foretag](https://www.imy.se/verksamhet/dataskydd/dataskydd-pa-olika-omraden/foretag/)
  - De registrerades rättigheter: [imy.se -- Rättigheter](https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/de-registrerades-rattigheter/)
  - Anmäl personuppgiftsincident: [imy.se -- Incidentrapportering](https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/personuppgiftsincidenter/)

### EU-resurser
- **EDPB -- European Data Protection Board**
  - GDPR-guide for små och medelstora foretag: [edpb.europa.eu/sme-data-protection-guide](https://www.edpb.europa.eu/sme-data-protection-guide/home_en)
  - Praktiska resurser for SME:er: [edpb.europa.eu -- Practical resources](https://www.edpb.europa.eu/sme-data-protection-guide/practical-resources-for-smes_en)
  - Roller: Personuppgiftsansvarig vs biträde: [edpb.europa.eu -- Data controller vs processor](https://www.edpb.europa.eu/sme-data-protection-guide/data-controller-data-processor_en)
- **GDPR.eu** -- Praktisk guide till GDPR: [gdpr.eu](https://gdpr.eu/)
  - Cookies och GDPR: [gdpr.eu/cookies](https://gdpr.eu/cookies/)
  - Vad är ett databehandlingsavtal: [gdpr.eu/what-is-data-processing-agreement](https://gdpr.eu/what-is-data-processing-agreement/)

### Teknikspecifika resurser
- **Supabase**
  - DPA (Data Processing Addendum): [supabase.com/legal/dpa](https://supabase.com/legal/dpa)
  - Privacy Policy: [supabase.com/privacy](https://supabase.com/privacy)
  - GDPR-diskussion (community): [github.com/supabase/discussions/2341](https://github.com/orgs/supabase/discussions/2341)

### GDPR-artiklar refererade i detta dokument

| Artikel | Ämne |
|---|---|
| Art. 5 | Grundläggande principer for behandling |
| Art. 6 | Rättslig grund for behandling |
| Art. 7 | Villkor for samtycke |
| Art. 13--14 | Informationsskyldighet |
| Art. 15 | Rätt till tillgång |
| Art. 16 | Rätt till rättelse |
| Art. 17 | Rätt till radering |
| Art. 18 | Rätt till begränsning |
| Art. 20 | Rätt till dataportabilitet |
| Art. 21 | Rätt att gora invändningar |
| Art. 25 | Privacy by Design & Default |
| Art. 28 | Personuppgiftsbiträden (DPA) |
| Art. 30 | Register over behandlingar |
| Art. 32 | Säkerhet vid behandling |
| Art. 33--34 | Incidentrapportering |
| Art. 35 | Konsekvensbedömning (DPIA) |
| Art. 44--49 | Overforing till tredjeland |

---

> **Disclaimer:** Detta dokument är en teknisk checklista, inte juridisk rådgivning. Kontakta en jurist specialiserad på dataskydd for formell compliance-granskning. Dokumentet är sammanställt av Claude (Anthropic) baserat på offentligt tillgänglig information från IMY, EDPB och GDPR-forordningen.
