# DISMAT Security Patch

**Versione:** 1.0

**Data:** Luglio 2026

**Autore:** DISMAT S.r.l.

Sistema di autenticazione riutilizzabile per tutte le applicazioni DISMAT sviluppate in React + Vite.
# DISMAT Security Patch v1.0

## Descrizione

La Security Patch DISMAT aggiunge un sistema di autenticazione semplice e riutilizzabile
alle applicazioni React/Vite sviluppate da DISMAT.

Caratteristiche:

- Login protetto
- Logout integrato
- Sessione persistente fino al logout
- Backend serverless Vercel
- Nessun database
- Compatibile con PWA
- Riutilizzabile su tutte le applicazioni DISMAT

---

# Struttura

```
api/
    login.js

src/
    security/
        AuthContext.jsx
        auth.js
        LoginGate.jsx
        LoginPage.jsx
        loginGate.css
```

---

# Installazione

## 1. Copiare i file

Copiare nella nuova applicazione:

```
api/login.js

src/security/
```

---

## 2. Avvolgere l'app con LoginGate

In App.jsx:

```jsx
<LoginGate
    appName="Sistema Gestione Prove DISMAT"
    moduleName="Prova di carico su tirante"
>
    <App />
</LoginGate>
```

Cambiare solamente il valore di `moduleName` nelle altre applicazioni.

Esempi:

```
Prova di carico su palo
```

```
Prova di carico su piastra
```

---

## 3. Header

Importare il logout tramite AuthContext.

```jsx
const { logout } = useAuth();
```

Pulsante:

```jsx
<button onClick={logout}>
    Esci
</button>
```

---

## 4. Variabili Vercel

Nel progetto Vercel creare:

```
LOGIN_USER
```

```
LOGIN_PASSWORD
```

Esempio

```
LOGIN_USER=tecnico
LOGIN_PASSWORD=password123
```

---

## 5. Sviluppo locale

Su localhost vengono usate le credenziali presenti in:

```
src/security/auth.js
```


---

# Sessione

L'autenticazione viene salvata in Local Storage.

L'utente rimane autenticato finché non seleziona:

```
Esci
```

Non è previsto timeout.

---

# Sicurezza

La password non è presente nel codice distribuito.

Le credenziali reali vengono lette solamente dal backend serverless:

```
api/login.js
```

tramite le variabili di ambiente di Vercel.

---

# Compatibilità

✔ React

✔ Vite

✔ Vercel

✔ Progressive Web App (PWA)

✔ Mobile

✔ Desktop

---

# Applicazioni supportate

- Prova di carico su tirante

- Prova di carico su palo

- Prova di carico su piastra

- Future applicazioni DISMAT

---

# Versione

DISMAT Security Patch

Versione 1.0

Luglio 2026
# Changelog

## v1.0
- Login protetto
- Logout
- AuthContext
- Backend serverless Vercel
- Sessione persistente
- ModuleName personalizzabile

## v1.1
(da compilare in futuro)