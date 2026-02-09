# GDPR-plan -- Bidragsguiden

## Vad ar Bidragsguiden?

En AI-driven webbapplikation som hjalper svenska foretagare hitta bidrag, stod och finansieringsmojligheter. Anvandare besvarar ett quiz om sitt foretag, och en AI (Anthropic Claude) analyserar svaren och returnerar personliga rekommendationer.

Applikationen har tva lager:
1. **Utan konto** -- anonym anvandning med sessions-ID
2. **Med konto** -- Google-inloggning, sparade bidrag, checklistor, sokhistorik

---

## 1. Vilken data samlar vi in?

### Anonyma anvandare (inget konto)

| Data | Syfte | Lagringsplats | Lagras hur lange |
|------|-------|---------------|------------------|
| Sessions-UUID | Koppla quiz-svar till resultat | Supabase `bg_sessions` + localStorage | Tills anvandaren rensar webblasaren |
| Quiz-svar (bolagsform, bransch, region, etc.) | Generera AI-rekommendationer | Supabase `bg_searches` | Kopplade till anonym session |
| AI-resultat (bidragslista) | Visa resultat, sokhistorik | Supabase `bg_searches` | Kopplade till anonym session |
| Feedback pa bidrag (ja/nej/osakert) | Forfina rekommendationer | Supabase `bg_feedback` | Kopplade till sokning |
| IP-adress (vid API-anrop) | Begransar antal sokningar per dag | Supabase `bg_usage` | Raderas automatiskt (cleanup) |
| E-postadress (valfritt) | Paminnelser om nya bidrag | Supabase `bg_email_signups` | Tills anvandaren avslutar |

**Viktigt:** Inga quiz-svar innehaller personuppgifter. Svaren ar generella foretagsuppgifter (bolagsform, bransch, antal anstallda, lan, omsattning). Vi kan inte identifiera en person baserat pa dessa svar.

### Inloggade anvandare (Google OAuth)

| Data | Syfte | Lagringsplats | Lagras hur lange |
|------|-------|---------------|------------------|
| Google-namn | Visa i dashboard | Supabase `bg_profiles.display_name` | Tills konto raderas |
| E-postadress | Identifiering, kontakt | Supabase `bg_profiles.email` | Tills konto raderas |
| GDPR-samtycke + tidsstampel | Juridisk dokumentation | Supabase `bg_profiles.gdpr_consent` | Tills konto raderas |
| Quiz-profil (JSON) | Forifyllt quiz vid atervandning | Supabase `bg_profiles.quiz_answers` | Tills konto raderas |
| Sparade bidrag | Anvandares egen samling | Supabase `bg_saved_grants` | Tills konto raderas |
| Checklistor per bidrag | Anvandares egna checklistor | Supabase `bg_checklist_items` | Tills konto raderas |
| Anteckningar per bidrag | Anvandares egna anteckningar | Supabase `bg_saved_grants.notes` | Tills konto raderas |
| Deadlines per bidrag | Anvandares egna deadlines | Supabase `bg_saved_grants.deadline` | Tills konto raderas |
| Sokhistorik (med resultat) | Aterkom till tidigare sokningar | Supabase `bg_user_searches` | Tills konto raderas |
| Daglig API-anvandning | Freemium-begransningar | Supabase `bg_usage` | Raderas automatiskt |

---

## 2. Vilken data skickas till tredjeparter?

### Anthropic (Claude API)
- **Vad skickas:** Quiz-svar (bolagsform, bransch, region, antal anstallda, omsattning, behov). Vid forfinning skickas aven tidigare resultat och anvandarens feedback.
- **Vad skickas INTE:** Namn, e-postadress, sessions-ID, eller nagot som identifierar anvandaren.
- **Anthropics policy:** API-anrop anvands INTE for att trana modeller. Data lagras inte av Anthropic utover API-loggar (30 dagar enligt deras policy).

### Supabase
- **Roll:** Databaslagring och autentisering
- **Region:** EU (bor vara EU-region vid projektets skapande)
- **Sakerhet:** Krypterad anslutning (TLS), Row Level Security (RLS) pa alla tabeller

### Vercel
- **Roll:** Hosting av webbapplikationen och API-rutter
- **Region:** Automatisk (edge), serverfunktioner i regionen som valts
- **Data som passerar:** HTTP-forfragan med quiz-svar skickas fran klient till Vercels serverfunktion, som sedan anropar Claude API

### Google
- **Roll:** OAuth-autentisering (valfritt, for inloggning)
- **Vad Google delar:** Namn och e-postadress vid inloggning
- **Vad vi delar med Google:** Ingenting -- vi skickar inte anvandardata till Google

---

## 3. Tekniska sakerhetsatgarder

### Row Level Security (RLS)
Varje tabell i Supabase har RLS aktiverat. Policys sakerställer att:
- Anvandare kan BARA lasa sin egen data
- Anvandare kan BARA uppdatera sin egen data
- Anvandare kan BARA ta bort sin egen data

```sql
-- Exempel: bg_profiles
CREATE POLICY "users_read_own_profile" ON bg_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own_profile" ON bg_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own_profile" ON bg_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### Server-side API-nyckelhantering
- `ANTHROPIC_API_KEY` lagras som Vercel-miljoovariabel, aldrig i klient-kod
- `SUPABASE_SERVICE_ROLE_KEY` lagras som Vercel-miljoovariabel (ej `NEXT_PUBLIC_`-prefix), anvands BARA i server-side API-rutter
- Anon-nyckeln (offentlig) anvands i klient-kod men ger bara atkomst via RLS-policys

### Autentisering
- Google OAuth via Supabase Auth (implicit flow)
- Sessionstoken lagras i webblasarens localStorage av Supabase-klienten
- Token forsvinner automatiskt och uppdateras via `autoRefreshToken: true`
- Dedikerad callback-sida (`/auth/callback`) hanterar OAuth-redirect

### Databasutlosare
- `handle_new_user()` trigger skapar automatiskt en profil vid registrering
- `SECURITY DEFINER` for att triggern kor med rattigheterna som behövs
- `ON CONFLICT DO NOTHING` for att undvika krascher vid dubbletter

### Freemium-begransningar (skydd mot missbruk)
- Anonyma anvandare: 3 sokningar/dag
- Inloggade anvandare: 5 sokningar/dag
- Server-side kontroll i API-rutten INNAN Claude anropas
- Sparning per sessions-ID, anvander-ID och IP-adress
- Automatisk rensning av gamla poster

---

## 4. Anvandarens rattigheter (GDPR)

### Ratt till tillgang (Artikel 15)
Anvandare kan se all sin data i dashboarden. Inloggade anvandare kan ocksa ladda ner ALL sin data som JSON via:
- Dashboard: "Exportera all data (JSON)"-knapp
- Integritetspolicy-sidan: "Ladda ner all min data"-knapp

Implementerat i `lib/dashboard.js: exportUserData(userId)`.

### Ratt till radering (Artikel 17)
Anvandare kan radera hela sitt konto och all tillhorande data:
- Integritetspolicy-sidan: "Radera mitt konto"-knapp med bekraftelsesteg
- Bekraftelsetext: "All din data raderas permanent -- bidrag, checklistor, anteckningar, allt. Detta kan inte angras."

Implementerat som Supabase RPC-funktion `delete_user_data()`:
```sql
CREATE OR REPLACE FUNCTION delete_user_data(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM bg_saved_grants WHERE user_id = target_user_id;
  DELETE FROM bg_profiles WHERE id = target_user_id;
  -- bg_checklist_items raderas automatiskt via CASCADE
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Ratt till dataportabilitet (Artikel 20)
JSON-export av all data tillganglig via dashboard och integritetspolicy-sida.

### Ratt till rattelse (Artikel 16)
Anvandare kan uppdatera sin profil via dashboarden.

---

## 5. Databehandlingsavtal (DPA)

For produktion bor databehandlingsavtal finnas med:

| Tredjepartstjanst | DPA tillgangligt? | Status |
|-------------------|-------------------|--------|
| Supabase | Ja, inkluderat i Terms of Service | Aktivt |
| Anthropic | Ja, tillgangligt pa begaran | Bor installeras |
| Vercel | Ja, inkluderat i Terms of Service | Aktivt |
| Google (OAuth) | Ja, via Google Workspace/Cloud | Aktivt |

---

## 6. Databasstruktur (alla tabeller)

### Anonyma tabeller
- `bg_sessions` -- sessions-ID, skapad, senast aktiv
- `bg_searches` -- sokningar kopplade till session (svar + resultat)
- `bg_feedback` -- feedback pa individuella bidrag per sokning
- `bg_email_signups` -- valfria e-postadresser for paminnelser

### Anvandartabeller (RLS-skyddade)
- `bg_profiles` -- profil kopplad till auth.users (namn, e-post, quiz-svar, GDPR-samtycke)
- `bg_saved_grants` -- sparade bidrag med status, anteckningar, deadline
- `bg_checklist_items` -- checklistepunkter per sparat bidrag
- `bg_user_searches` -- inloggade anvandares sokhistorik
- `bg_usage` -- daglig anvandningssparing (freemium)

---

## 7. Rensning och dataminimering

### Automatisk rensning
- `cleanup_old_usage()` -- raderar anvandningsposter aldre an 90 dagar
- Anonyma sessioner utan aktivitet bor rensas efter 30 dagar (TODO: implementera cron-jobb via Supabase pg_cron)

### Dataminimering
- Inga onodiga personuppgifter samlas in
- Quiz-svar ar foretagsrelaterade, inte personliga
- AI:n far aldrig personuppgifter -- bara anonyma quiz-svar
- Ingen analytics, inga sparningscookies, inga reklamskript

---

## 8. Integritetspolicy-sida

Publicerad pa `/integritetspolicy`. Innehaller:
- Vad vi samlar in (med och utan konto)
- AI-behandling (vad som skickas till Anthropic)
- Var data lagras (Supabase, EU)
- Tredjeparter (Supabase, Anthropic, Vercel, Google)
- Sparning och cookies (inga -- bara localStorage)
- GDPR-rattigheter (tillgang, radering, export)
- Funktioner for inloggade: dataexport och kontoradering

---

## 9. Autentiseringsalternativ

### Nuvarande: Google OAuth
Google OAuth via Supabase Auth (implicit flow). Enklast att implementera, fungerar direkt med Supabase. Nackdel: kraver Google-konto.

### Framtida alternativ

| Metod | Fordelar | Nackdelar | Implementering |
|-------|----------|-----------|----------------|
| **E-post + losenord** | Universellt, inget tredjepartsberoende | Anvandare glommer losenord, konto-aterhamtning | Supabase Auth inbyggt (`signUp`, `signInWithPassword`) |
| **Magic link (e-post)** | Inget losenord, saker, enkel UX | Kraver att anvandaren oppnar e-post | Supabase Auth inbyggt (`signInWithOtp`) |
| **SMS / WhatsApp OTP** | Snabbt, bekant for alla, inget losenord | Kostar pengar per SMS (~0.05 SEK/st), kraver Twilio-konto | Supabase Auth + Twilio-provider |
| **BankID** | Hogsta fortroendet i Sverige, verifierad identitet | Dyrt (licensavgift), komplex integration | Extern provider (t.ex. Criipto, Freja eID) + Supabase custom JWT |

### Rekommenderad prioritetsordning
1. **Google OAuth** (redan implementerat)
2. **Magic link via e-post** (gratis, lag friktion, Supabase-native)
3. **E-post + losenord** (for de som foredrar traditionellt)
4. **BankID** (vid kommersiell lansering, om foretroende ar kritiskt)
5. **SMS/WhatsApp** (om malgruppen foredrar mobil)

### BankID-integration (framtida)
BankID ar inte en Supabase-native provider. Strategin ar:
1. Anvandaren startar BankID-verifiering via tredjepartstjanst (Criipto, Freja eID, eller CGI)
2. Tredjepartstjansten returnerar verifierad identitet
3. Backend skapar en Supabase-session med custom JWT
4. Anvandaren ar inloggad som vanligt

Kostnadsuppskattning: ~500-2000 SEK/manad beroende pa antal verifieringar.

---

## 10. GitHub-sakerhet

### Repo-atkomst
- [ ] **Gor repot privat** -- publik kod exponerar arkitektur och API-struktur
- Bjud in medarbetare individuellt, undvik breda team-atkomster
- Anvand branch protection pa `main` (krav pa pull request, minst 1 review)

### Hemligheter och miljovariabler
- **ALDRIG** committa `.env`-filer, API-nycklar, eller service role keys
- `.gitignore` ska inkludera: `.env`, `.env.local`, `.env.production`
- Anvand Vercel Environment Variables for alla hemligheter
- Verifiera med `git log --all --full-history -- .env*` att inga nycklar lacker i historiken

### Variabler och var de lagras

| Variabel | Var | Synlig i klient? |
|----------|-----|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel env | Ja (offentlig) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel env | Ja (offentlig, begransad av RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env | **NEJ** -- bara server-side |
| `ANTHROPIC_API_KEY` | Vercel env | **NEJ** -- bara server-side |

### CI/CD-sakerhet
- Vercel bygger automatiskt fran GitHub -- sakerställ att bara `main` deployar till produktion
- Preview deployments for pull requests (bra for testning men dela inte kansliga testdata)
- Overvag att lagga till `dependabot` for automatiska sakerhetsuppdateringar av beroenden

---

## 11. Supabase-hardening

### Row Level Security (RLS) -- fordjupning
RLS ar redan aktiverat pa alla tabeller. Viktiga principer:
- **Varje ny tabell MASTE ha RLS** -- annars ar den oppen for alla med anon-nyckeln
- Testa policys genom att logga in som anvandare och forsoka lasa annan anvandares data
- Anvand `auth.uid()` i alla policys for att koppla data till inloggad anvandare

### Service Role Key
- Service role key kringgAr ALL RLS -- anvands BARA i server-side API-rutter
- ALDRIG exponera den i klient-kod (inget `NEXT_PUBLIC_`-prefix)
- Anvands i `pages/api/analyze.js` for server-side usage tracking

### Supabase Dashboard-sakerhet
- Aktivera 2FA (tvafaktorsautentisering) pa Supabase-kontot
- Begransar tillgang till Supabase-projektet till nodvandiga teammedlemmar
- Granska regelbundet vilka som har atkomst under Project Settings > Team

### Storage (om det laggs till)
Om filuppladdning laggs till (t.ex. CV-uppladdning, dokument):
- Skapa en privat bucket med RLS-policys
- Kryptera kansliga filer
- Satt max filstorlek (t.ex. 10 MB)
- Begransar filtyper (PDF, DOCX -- ingen exekverbar kod)
- Satt automatisk radering efter en viss tid om mojligt

---

## 12. Svensk lag och GDPR -- fordjupning

### Rattslig grund for behandling
- **Samtycke (Artikel 6.1a):** Anvandaren samtycker genom att aktivt anvanda tjansten och godkanna integritetspolicyn
- **Berattigat intresse (Artikel 6.1f):** Anonyma sessioner for att leverera tjansten
- **Avtal (Artikel 6.1b):** Inloggade anvandare som anvander dashboard-funktioner

### Svensk tillampning
- **IMY (Integritetsskyddsmyndigheten)** ar tillsynsmyndighet i Sverige
- Dataskyddsforordningen (GDPR) galler direkt som svensk lag
- Kompletterande svensk lag: Lag (2018:218) med kompletterande bestammelser till EU:s dataskyddsforordning

### Barn och minderariga
- Tjansten riktar sig till foretagare (vuxna)
- Ingen data samlas fran barn under 16 ar
- Ingen aldersverifiering implementerad (bor inte behovas for B2B-tjanst)

### Dataskyddsombud (DPO)
- Krävs inte for sma foretag som inte behandlar kansliga personuppgifter i stor skala
- Overvag att utse ett internt dataskyddsombud vid tillvaxt

### Incidenthantering
Om personuppgifter lacks eller exponeras:
1. Dokumentera incidenten
2. Anmal till IMY inom 72 timmar (om risk for enskildas rattigheter)
3. Informera drabbade anvandare om risken ar hog
4. Atgarda och dokumentera forbattringar

---

## 13. Skalning och prestanda

### Databas-optimering
- Lagg till index pa kolumner som anvands i fragor:
  ```sql
  CREATE INDEX idx_saved_grants_user ON bg_saved_grants(user_id);
  CREATE INDEX idx_user_searches_user ON bg_user_searches(user_id);
  CREATE INDEX idx_usage_user_date ON bg_usage(user_id, date);
  CREATE INDEX idx_sessions_created ON bg_sessions(created_at);
  ```
- Supabase Free Tier: 500 MB databas, 2 GB bandwidth -- racker for ~1000 aktiva anvandare
- Supabase Pro ($25/manad): 8 GB databas, 50 GB bandwidth -- racker for ~10 000+ anvandare

### API-kostnadshantering (Anthropic Claude)
- Varje sokning kostar ~$0.01-0.03 beroende pa svarslangd
- Freemium-granserna (3/5 sokningar per dag) begransar kostnaden
- Vid 1000 anvandare/dag med snitt 3 sokningar: ~$90-270/manad
- **Kostnadsminskning:** Cachning av liknande fragor, korta system-prompts, anvand mindre modell (Haiku) for enklare uppgifter

### Vercel-optimering
- Next.js Pages Router med SSR -- bra for SEO
- Statiska sidor (integritetspolicy, login) kan vara ISR (Incremental Static Regeneration)
- API-rutter har 10-sekunders timeout pa Vercel Hobby -- tillrackligt for Claude-anrop
- Vercel Pro ($20/manad) ger 60-sekunders timeout om det behövs

### Cachning-strategi
- **Klientsida:** React state for aktiv session (redan implementerat)
- **Server-sida:** Overvag att cacha vanliga quiz-kombinationer i Supabase
- **CDN:** Vercels edge network hanterar statiska tillgangar automatiskt

### Overvakning
- Supabase Dashboard visar databas-anvandning, aktiva anslutningar, API-trafik
- Vercel Dashboard visar serverless function invocations, bandwidth, fel
- Overvag att lagga till enkel felrapportering (t.ex. Sentry free tier) for produktion

---

## 14. TODO / Forbattringar

### Sakerhet och infrastruktur
- [ ] Lagga till `SUPABASE_SERVICE_ROLE_KEY` i Vercel-miljovariabler
- [ ] Gora GitHub-repot privat
- [ ] Aktivera 2FA pa Supabase-kontot
- [ ] Verifiera att Supabase-projektet ar i EU-region
- [ ] Lagga till branch protection pa `main` i GitHub
- [ ] Lagga till `dependabot` for automatiska sakerhetsuppdateringar

### GDPR och juridik
- [ ] Installera DPA med Anthropic
- [ ] Lagga till GDPR-samtycke-checkbox vid forsta inloggning
- [ ] Skriva incidenthanteringsplan (for dataintrAng)
- [ ] Lagga till mojlighet att avanmala sig fran e-postpaminnelser
- [ ] Overvaga cookie-banner om vi lagger till analytics i framtiden

### Autentisering
- [ ] Lagga till magic link-inloggning (e-post utan losenord)
- [ ] Lagga till e-post + losenord som alternativ
- [ ] Utvardera BankID-integration vid kommersiell lansering

### Databas och prestanda
- [ ] Implementera automatisk rensning av gamla sessioner via pg_cron
- [ ] Lagga till databasindex pa vanliga fragor (user_id, date)
- [ ] Implementera cachning av vanliga quiz-kombinationer
- [ ] Kora `add_usage_limits.sql` i Supabase SQL Editor
- [ ] Kora `add_quiz_profile.sql` i Supabase SQL Editor

### Overvakning
- [ ] Lagga till felrapportering (Sentry free tier eller liknande)
- [ ] Konfigurera Vercel-aviseringar for felfrekvens

---

## 15. Kontakt

Fragor om datahantering? Kontakta oss via GitHub.
