# Supabase Auth -- Complete Implementation Guide

> **Syfte:** Referensdokument for att bygga fullstandiga Supabase-inloggningsfloden med email-verifiering, felhantering, auto-login och polerad UX. Anvand vid alla nya webbappar med Supabase Auth.

---

## Varfor denna guide finns

Att bygga Supabase Auth kraver typiskt 5-10 rundor av debugging av samma problem: fel redirect-URLer, utgangna verifieringslankar utan felmeddelande, anvandare som hamnar pa fel sida, saknad auto-login efter verifiering. Denna guide saker att allt byggs ratt fran borjan.

## Nar den ska anvandas

- Ny webbapp med Supabase for autentisering
- Lagga till auth i ett befintligt Supabase-projekt
- Fixa trasiga eller ofullstandiga auth-floden

---

## De fyra pelarna

Varje Supabase Auth-implementation MASTE addressera alla fyra pelarna samtidigt. Implementera dem INTE en i taget.

### 1. URL- och redirect-strategi

Det storsta kallan till auth-buggar. Supabase skickar tokens och fel i URL-fragmentet (efter `#`), som webblasaren aldrig skickar till servern.

**Krav:**
- Satt `emailRedirectTo` explicit i ALLA auth-anrop (signup, resend, password reset)
- Anvand miljovariabler for bas-URL -- hardkoda aldrig
- Redirect-malet ska vara `/login` eller `/auth/callback`, aldrig landningssidan
- Lagg till alla giltiga redirect-URLer i Supabase Dashboard > Authentication > URL Configuration

**Implementation:**

```javascript
// Signup
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${SITE_URL}/login`,
    data: { full_name: fullName }  // valfri metadata
  }
});

// Skicka om verifiering
const { error } = await supabase.auth.resend({
  type: 'signup',
  email,
  options: {
    emailRedirectTo: `${SITE_URL}/login`
  }
});

// Aterstall losenord
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${SITE_URL}/reset-password`
});
```

**Supabase Dashboard checklista:**
- Site URL matchar produktions-URL
- Alla redirect-URLer tillagda (login, callback, reset-password)
- Email-mallar anvander `{{ .ConfirmationURL }}` (inte en hardkodad URL)

---

### 2. Login-sidans state machine

Login-sidan maste hantera tre tillstand baserat pa URL-parametrar. Implementera alla tre fran start.

```
URL innehaller access_token  ->  SUCCESS-tillstand
URL innehaller error=*       ->  ERROR-tillstand
Inga auth-parametrar         ->  DEFAULT-tillstand (vanligt login-formular)
```

**SUCCESS-tillstand** (anvandaren har just verifierat sin email):
- Visa gron bekraftelse: "Ditt konto ar verifierat! Logga in nedan."
- Fyll i email-faltet fran token/URL-metadata
- Auto-fokusera losenordsfaltet
- Valfritt: auto-login via `supabase.auth.setSession()`

**ERROR-tillstand** (utangen/ogiltig verifieringslank):
- Visa tydligt felmeddelande
- Visa email-input + "Skicka ny verifieringslank"-knapp
- Hantera rate limiting (Supabase tilater 1 email per 60 sekunder)
- Visa bekraftelse-toast nar ny lank skickats

**DEFAULT-tillstand:**
- Vanligt login-formular
- Lankar till signup och glomt losenord

**Hash-fragment-parser (kritiskt -- Supabase anvander `#` inte `?`):**

```javascript
function parseAuthCallback() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);

  if (params.get('error')) {
    return {
      status: 'error',
      error: params.get('error'),
      errorCode: params.get('error_code'),
      errorDescription: params.get('error_description')
    };
  }

  if (params.get('access_token')) {
    return {
      status: 'success',
      accessToken: params.get('access_token'),
      refreshToken: params.get('refresh_token'),
      type: params.get('type')  // 'signup', 'recovery', 'magiclink'
    };
  }

  return { status: 'default' };
}
```

---

### 3. Resend verification-flode

Implementera alltid en resend-mekanism. Verifieringslankar gar ut, och anvandare kommer att traffa pa detta.

**Krav:**
- API-endpoint eller klient-funktion for att skicka om
- Rate limit UI: inaktivera knapp i 60 sekunder efter skick, visa nedrakning
- Returnera alltid success (forhindra email-enumeration-attacker)
- Satt `emailRedirectTo` i resend-anropet ocksa

```javascript
async function resendVerification(email) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${SITE_URL}/login`
    }
  });

  // Visa alltid success for att forhindra enumeration
  showToast('Om kontot finns skickas en ny verifieringslank.');

  // Inaktivera knapp i 60 sekunder
  startCooldownTimer(60);
}
```

---

### 4. Auto-login efter verifiering (basta UX)

Nar det ar mojligt, logga in anvandaren automatiskt efter email-verifiering sa de slipper login-formularet.

```javascript
async function handleAutoLogin(params) {
  if (params.status === 'success' && params.accessToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken
    });

    if (!error) {
      window.location.href = '/dashboard';
      return;
    }

    // Fallback: visa "verifierad, logga in"-meddelande
    showVerifiedMessage();
  }
}
```

**Fallback:** Om auto-login misslyckas (token utganget mellan klick och sidladdning), fall tillbaka till SUCCESS-tillstandet (gront meddelande + foryifylld email).

---

## Implementation-checklista

Kor igenom detta INNAN du skriver nagon kod:

### Miljo och konfiguration
- [ ] `SITE_URL` / `NEXT_PUBLIC_SITE_URL` miljovariabel satt for alla miljoer
- [ ] Supabase Dashboard: Site URL matchar produktion
- [ ] Supabase Dashboard: Alla redirect-URLer registrerade
- [ ] Supabase Dashboard: Email-mallar granskade och anpassade

### Signup-flode
- [ ] `emailRedirectTo` satt i signup-anrop
- [ ] Anvandar-metadata skickad (full_name, etc.)
- [ ] Framgangsmeddelande efter signup: "Kolla din e-post for verifieringslanken"
- [ ] Felhantering for befintliga konton

### Login-sida
- [ ] Hash-fragment-parser kor vid sidladdning
- [ ] SUCCESS-tillstand: gron banner + foryifylld email + fokuserat losenord
- [ ] ERROR-tillstand: rod banner + resend-knapp + rate limit-timer
- [ ] DEFAULT-tillstand: vanligt login-formular
- [ ] Rensa URL efter parsing (ta bort hash-fragment fran adressfalt)

### Verifierings-resend
- [ ] Resend-funktion/endpoint implementerad
- [ ] `emailRedirectTo` satt i resend-anrop
- [ ] 60-sekunders cooldown-timer pa knapp
- [ ] Anti-enumeration: visar alltid framgangsmeddelande

### Auto-login
- [ ] `setSession()` forsoks med tokens fran URL
- [ ] Fallback till manuell login om auto-login misslyckas
- [ ] Redirect till dashboard/app vid framgang

### Post-login
- [ ] Auth state listener uppsatt: `supabase.auth.onAuthStateChange()`
- [ ] Skyddade routes kontrollerar session
- [ ] Logout-funktion rensar session och redirectar

### Sakerhet
- [ ] Ingen kanslig data i URL-parametrar
- [ ] PKCE-flow aktiverat (Supabase default for SPAs)
- [ ] Session-refresh hanteras automatiskt
- [ ] RLS (Row Level Security) policies uppsatta pa tabeller

---

## Vanliga fel och fixar

| Fel | Orsak | Fix |
|-----|-------|-----|
| `error=access_denied&error_code=otp_expired` | Verifieringslank utganget | Visa resend UI (Pelare 3) |
| Anvandare hamnar pa landningssida efter verifiering | Saknad/fel `emailRedirectTo` | Satt redirect till `/login` i signup-anrop + Supabase Dashboard |
| `#`-parametrar ej lasbara pa servern | Supabase anvander URL-fragment | Parsa med `window.location.hash` pa klienten |
| "Email rate limit exceeded" | Resend for snabbt | Implementera 60s cooldown-timer |
| "Invalid login" efter verifiering | Ej verifierad, forsaker logga in | Kolla `email_confirmed_at` i Supabase; resend om null |

---

## Framework-specifika noteringar

### Next.js (App Router)
- Anvand `/auth/callback/route.ts` server route for att byta kod mot session
- Anvand middleware for att skydda routes
- `emailRedirectTo` ska peka mot `/auth/callback`

### Next.js (Pages Router -- var app)
- Parsa hash i `useEffect` pa mount i auth callback-komponenten
- Anvand React context (AuthProvider) for auth state
- Callback-sida (`/pages/auth/callback.js`) lyssnar pa `onAuthStateChange`

### Plain HTML / Vanilla JS
- Parsa `window.location.hash` pa varje sida som hanterar auth-redirects
- Anvand Supabase JS-klient direkt fran CDN eller bundle

### React (Vite / CRA)
- Parsa hash i `useEffect` pa mount i login-komponenten
- Anvand React context eller Zustand for auth state

---

## Svenska UX-texter (atervandbar)

```javascript
const AUTH_MESSAGES = {
  // Signup
  signupSuccess: 'Konto skapat! Kolla din e-post for verifieringslanken.',
  signupError: 'Kunde inte skapa kontot. Forsok igen.',
  emailExists: 'Det finns redan ett konto med denna e-postadress.',

  // Verifiering
  verifySuccess: 'Ditt konto ar verifierat! Logga in nedan.',
  verifyExpired: 'Verifieringslanken har gatt ut eller ar ogiltig.',
  resendSent: 'En ny verifieringslank har skickats till din e-post.',
  resendCooldown: (seconds) => `Vanta ${seconds}s innan du kan skicka igen.`,

  // Login
  loginError: 'Fel e-post eller losenord.',
  loginSuccess: 'Inloggad!',

  // Aterstallning
  resetSent: 'Om kontot finns har vi skickat en aterstallningslank.',
  resetSuccess: 'Losenordet har andrats. Logga in med ditt nya losenord.',

  // Allmant
  loading: 'Laddar...',
  logout: 'Logga ut',
  logoutSuccess: 'Du har loggats ut.'
};
```

---

## Snabbstart-prompt

For att komma igang snabbt med Claude Code:

```
"Implementera Supabase Auth med fullstandigt flode:
1. Signup med emailRedirectTo till /login
2. Login-sida som hanterar tre tillstand via URL-hash: success (verifierad),
   error (utganget lank med resend-knapp), och default (vanlig login)
3. Auto-login via setSession() vid lyckad verifiering
4. Resend-verification med 60s cooldown och anti-enumeration
5. Svenska UX-texter
6. Alla redirect-URLs konfigurerade korrekt"
```

---

## Versionshistorik

- **v1.0** -- Initial guide baserad pa real-world debugging session (Platsbanken AI, feb 2026)
- **v1.1** -- Sparad i Bidragsguiden-repot som referensdokumentation
