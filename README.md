# Prova di Carico su Piastra DISMAT

App React/Vite per prova di carico su piastra secondo CNR 146/92.

## Funzioni principali

- 10 letture temporali per ogni gradino di carico.
- Badge di stabilita quando le ultime 3 letture hanno scarto <= 0,02 mm.
- 1° ciclo, 2° ciclo e risultati.
- Calcolo Md, Md' e rapporto Md/Md'.
- PDF con dati prova, risultati, tabella, grafico e foto.
- Foto prova da smartphone.
- PWA installabile e utilizzabile offline dopo il primo caricamento online.
- Pronta per Vercel.

## Avvio locale

```powershell
npm install
npm run dev
```

## Build

```powershell
npm run build
```

## Deploy con GitHub + Vercel

```powershell
git init
git add .
git commit -m "Prima versione prova carico su piastra"
git branch -M main
git remote add origin https://github.com/TUO_USERNAME/prova-carico-su-piastra.git
git push -u origin main
```

Poi importa il repository su Vercel:

- Framework: Vite
- Build Command: npm run build
- Output Directory: dist

Dopo il primo deploy, per aggiornare Vercel:

```powershell
git add .
git commit -m "Descrizione modifica"
git push
```

## Uso offline

Aprire l'app una volta con connessione internet, poi aggiungerla alla schermata Home del telefono. Dopo il primo caricamento, l'app puo essere usata anche senza internet.
