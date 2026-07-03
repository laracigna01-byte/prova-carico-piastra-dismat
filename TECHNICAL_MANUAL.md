# Manuale tecnico di sviluppo – Applicazioni DISMAT

**Versione documento:** 2.0.0
**Autore:** Lara Maria Cigna 
**Aiuto sviluppo:** OpenAI ChatGPT

**Ultimo aggiornamento:** Luglio 2026

**Stato:** In evoluzione

**Applicazioni documentate:**

- Prova di carico su pali
- Prova di carico su tirante
- Prova di carico su piastra
---

# Indice
1. Scopo del progetto
2. Filosofia di sviluppo
3. Architettura comune
   3.1 Flusso dei dati
4. Struttura del progetto
   4.1 Organizzazione del codice
   4.2 Architettura React
5. Componenti condivisi
   5.1 Comunicazione tra componenti
6. Gestione archivio prove
7. Generazione PDF
8. Progressive Web App (PWA)
9. Git, Build e Deploy
10. Convenzioni di sviluppo
11. Applicazione Prova di Carico su Pali
12. Applicazione Prova di Carico su Tiranti
13. Applicazione Prova di Carico su Piastra
14. Roadmap
15. Decisioni progettuali
16. Modello matematico e criteri di calcolo
   16.1 Prova di carico su pali
   16.2 Prova di carico su tiranti
   16.3 Prova di carico su piastra
17. Regola finale
18. Storico documento

---

# 1. Scopo del progetto

Le applicazioni DISMAT sono state sviluppate per consentire la gestione completa delle prove di carico geotecniche direttamente in cantiere.

Le tre applicazioni sono:

- Prova di carico su pali
- Prova di carico su tiranti
- Prova di carico su piastra

Sono applicazioni web sviluppate in React e distribuite come Progressive Web App (PWA).

Obiettivi principali:

- utilizzo da PC e smartphone
- funzionamento offline
- compilazione rapida durante la prova
- generazione immediata del verbale PDF
- archiviazione locale delle prove
- interfaccia semplice per il tecnico di cantiere

Le tre applicazioni devono mantenere una struttura software il più possibile uniforme.

---

# 2. Filosofia di sviluppo

Ogni modifica deve rispettare alcuni principi fondamentali.

## Uniformità

Quando una funzionalità viene migliorata in una applicazione occorre sempre valutare se debba essere riportata anche nelle altre.

Ad esempio:

- archivio
- PDF
- grafici
- firma
- tema
- esportazione CSV
- ricerca
- salvataggio dati

L'obiettivo è evitare che le tre applicazioni evolvano in modo diverso.

---

## Piccole modifiche

Preferire modifiche piccole e facilmente verificabili.

Procedura consigliata:

1. implementazione
2. test locale
3. build
4. commit
5. push
6. deploy

---

# 3. Architettura comune

Tutte le applicazioni seguono la stessa architettura logica.

```
Utente

↓

Interfaccia React

↓

Componenti

↓

Calcoli

↓

Archivio

↓

PDF
```

La logica di calcolo deve essere separata dalla logica dell'interfaccia.

---
## 3.1 Flusso dei dati

Tutte le applicazioni DISMAT seguono lo stesso ciclo di elaborazione.
Utente

↓

Inserimento dati

↓

React (useState)

↓

Aggiornamento componenti

↓

Calcoli automatici

↓

Grafico

↓

Archivio

↓

PDF

L'interfaccia non esegue direttamente i calcoli.

Ogni modifica effettuata dall'utente aggiorna lo stato React.

I componenti visualizzano solamente i dati elaborati dalle funzioni di calcolo presenti nella cartella `utils`.

Questo approccio mantiene separati:

- interfaccia grafica;
- logica matematica;
- archivio;
- esportazione PDF.


# 4. Struttura del progetto

```
src/

components/
config/
pdf/
utils/
assets/
```

## components

Contiene tutti i componenti React.

Ad esempio:

- Header
- InfoPanel
- StepTable
- Results
- Archive
- SignaturePad

---

## config

Costanti di configurazione.

Esempi:

- gradini prova
- colori
- impostazioni iniziali

---

## utils

Funzioni di utilità.

Ad esempio:

- calcoli
- archivio
- formatter
- esportazione CSV

---

## pdf

Generazione del verbale PDF.

---

## assets

Loghi e immagini statiche.

---
## 4.1 Organizzazione del codice
### components

Contiene esclusivamente componenti React.

Ogni componente deve avere una responsabilità precisa.

Esempio:

Header → intestazione

InfoPanel → dati generali

StepTable → inserimento letture

Results → grafici e risultati

Archive → gestione archivio

## 4.2 Architettura React

Le tre applicazioni DISMAT utilizzano React come framework principale.

Il componente `App.jsx` rappresenta il punto di ingresso dell'applicazione e coordina tutte le funzionalità.

L'architettura è di tipo gerarchico.

```text
App.jsx
│
├── Header
├── InfoPanel
├── StepTable
├── Results
├── SignaturePad
└── Archive
```

## Responsabilità di App.jsx

Il componente principale è responsabile di:

- gestione dello stato tramite `useState`;
- esecuzione dei calcoli tramite `useMemo`;
- caricamento e salvataggio dell'archivio;
- gestione della fotografia della prova;
- gestione della firma del tecnico;
- esportazione del PDF;
- esportazione CSV;
- coordinamento dei componenti figli.



I calcoli sono delegati alle funzioni presenti nella cartella `src/utils`.
Le nuove funzionalità dovrebbero seguire questa organizzazione, limitando App.jsx al coordinamento dell'interfaccia.

# 5. Componenti condivisi

Le tre applicazioni devono mantenere gli stessi componenti principali.

Header

Gestisce titolo e tema.

InfoPanel

Contiene tutti i dati generali della prova.

StepTable

Gestisce l'inserimento delle letture.

Results

Mostra risultati, grafico ed esito.

SignaturePad

Firma elettronica del tecnico.

Archive

Archivio prove.

## 5.1 Comunicazione tra componenti

I componenti React comunicano esclusivamente tramite `props`.

Il flusso dei dati è sempre unidirezionale.

```text
App.jsx

↓

Props

↓

Componenti

↓

Evento utente

↓

Aggiornamento useState

↓

Nuovo render
```

Nessun componente modifica direttamente lo stato di un altro componente.

Tutti gli aggiornamenti vengono gestiti dal componente principale (`App.jsx`).

---

# 6. Gestione archivio prove

L'archivio utilizza la stessa logica nelle tre applicazioni.

## Memoria principale

IndexedDB

## Backup

localStorage

Il localStorage viene mantenuto esclusivamente come:

- snapshot
- migrazione
- fallback

---

API comuni

```
listTests()

saveTest()

deleteTest()

writeTests()

loadServerTests()

syncServerTests()

nextReportId()
```

---

Ogni archivio deve permettere:

- Apri
- Duplica
- PDF
- Elimina
- Ricerca
- Ordinamento cronologico
- Conferma eliminazione


---
## Ciclo di salvataggio

Quando il tecnico salva una prova viene eseguita la seguente sequenza.

```text
Compilazione prova

↓

Salva in archivio

↓

saveTest()

↓

IndexedDB

↓

Aggiornamento React

↓

Sincronizzazione server (se disponibile)
```

Ogni record contiene tutte le informazioni necessarie per ricostruire completamente la prova.

Tra queste:

- dati generali;
- letture;
- pressioni (quando previste);
- fotografia;
- firma;
- data di salvataggio;
- identificativo univoco della prova.

# 7. Generazione PDF

Ogni PDF deve contenere:

- dati della prova
- tabella risultati
- grafico
- foto
- firma
- esito
- riferimenti normativi

Obiettivo:

un solo foglio A4 professionale.

---
## Flusso di generazione

```text
Dati della prova

↓

Calcoli

↓

Grafico

↓

Fotografia

↓

Firma

↓

Esito

↓

Verbale PDF
```

Il PDF viene generato a partire dai dati della prova. Quando necessario, i valori derivati vengono ricalcolati utilizzando le stesse funzioni impiegate dall'interfaccia, così da garantire coerenza tra visualizzazione e verbale.



# 8. Progressive Web App

Le applicazioni devono funzionare come PWA.

Devono essere mantenuti:

- manifest.webmanifest
- service-worker.js

L'app deve funzionare correttamente:

- desktop
- smartphone
- Android
- iPhone
- modalità offline

---

# 9. Git, Build e Deploy

Prima di lavorare:

```powershell
pwd
git remote -v
git status
```

Prima del commit:

```powershell
npm run build
```

Procedura standard:

```powershell
git add .

git commit -m "Descrizione"

git push origin main
```

Se compare:

```
non-fast-forward
```

utilizzare:

```powershell
git pull --rebase origin main

git push origin main
```

---

# 10. Convenzioni di sviluppo

ID prove:

```
PAL-AAAA-001

TIR-AAAA-001

PIA-AAAA-001
```

I commit devono descrivere chiaramente la modifica.

Esempi:

```
Aggiunge archivio IndexedDB

Migliora PDF

Corregge duplicazione archivio
```

---
### Convenzioni

La logica matematica deve rimanere nella cartella:

src/utils

La generazione PDF deve rimanere nella cartella:

src/pdf

I componenti React non devono contenere formule matematiche.

Le costanti devono essere inserite nella cartella:

src/config

Le modifiche grafiche devono essere limitate ai componenti interessati.

# 11. Prova di carico su Pali

Caratteristiche principali:

- 18 gradini
- 3 comparatori
- 9 letture per comparatore
- verifica stabilità sulle prime 3 letture
- grafico carico/cedimento
- foto
- firma
- PDF A4
- archivio IndexedDB

---

# 12. Prova di carico su Tiranti

Caratteristiche principali:

- un comparatore
- pressione automatica
- grafico carico/spostamento
- foto
- firma
- PDF A4
- archivio IndexedDB

---

# 13. Prova di carico su Piastra

Normativa principale:

CNR 146/92

Funzionalità:

- primo ciclo
- secondo ciclo
- Md
- Md'
- rapporto Md/Md'
- foto
- firma
- PDF A4
- archivio IndexedDB

---

# 14. Roadmap

## Completato

- Archivio IndexedDB
- Ricerca archivio
- Duplica
- PDF
- Firma elettronica
- Tema chiaro/scuro
- Compatibilità PWA

---

## Futuro

- Backup cloud
- Esportazione ZIP archivio
- Dashboard statistiche
- Sincronizzazione tra dispositivi
- Ricerca avanzata
- Gestione utenti

---

# 15. Decisioni progettuali

## Perché React

Per mantenere componenti riutilizzabili e separare interfaccia e logica.

## Perché Vite

Build molto veloce e ottima esperienza di sviluppo.

## Perché IndexedDB

Permette di archiviare grandi quantità di dati (comprese fotografie) e funziona offline.

## Perché PWA

Consente l'utilizzo direttamente in cantiere senza installare applicazioni native.

## Perché tre applicazioni separate

Le tre prove seguono normative differenti e hanno flussi operativi diversi, ma condividono la stessa architettura software.

---
# 16 Modello matematico e criteri di calcolo

## 16.0 Convenzioni e unità di misura

Per uniformare il comportamento delle tre applicazioni, tutte le grandezze vengono gestite utilizzando le seguenti unità di misura.

| Grandezza | Simbolo | Unità |
|-----------|---------|-------|
| Carico | F | kN |
| Carico di esercizio | Ne | kN |
| Carico massimo di collaudo | Nc | kN |
| Pressione del martinetto | p | bar |
| Pressione sulla piastra | p | kPa |
| Cedimento | s | mm |
| Spostamento | δ | mm |
| Diametro piastra | D | mm |
| Modulo di deformazione | Md | MPa |
| Modulo di deformazione secondo ciclo | Md' | MPa |

---

### Convenzioni utilizzate

Nel software vengono adottate le seguenti convenzioni:

- tutte le lunghezze sono espresse in millimetri (mm);
- tutti i carichi sono espressi in kilonewton (kN);
- le pressioni dei martinetti sono espresse in bar;
- le pressioni applicate alla piastra sono espresse in kPa;
- i grafici utilizzano sempre le stesse unità di misura riportate nei calcoli.

Quando necessario, l'applicazione effettua automaticamente le conversioni tra tonnellate e kilonewton.

La conversione adottata è:

```text
1 t = 9,81 kN
```

Questa conversione viene utilizzata esclusivamente nei calcoli relativi alla portata del martinetto.

## 16.0.1 Convenzioni software

Per mantenere il comportamento uniforme delle tre applicazioni, vengono adottate alcune convenzioni comuni.

### Valori nulli

Quando un dato non è disponibile viene utilizzato il valore:

```text
null
```

e non il valore zero.

Questo permette di distinguere chiaramente:

- dato non inserito;
- misura pari a zero.

### Arrotondamenti

Tutti i valori visualizzati vengono arrotondati mediante la funzione comune:

```text
round()
```

presente nei file di utilità.

### Conversione dei dati

Prima di ogni calcolo i valori inseriti dall'utente vengono convertiti in numeri tramite:

```text
toNumber()
```

## 16.0.2 Funzioni comuni

Le tre applicazioni condividono alcune funzioni di utilità utilizzate in quasi tutti i calcoli.

### toNumber()

Converte il valore proveniente dall'interfaccia o dall'archivio in un numero.

Se il valore non è valido, viene restituito un valore di default.

Questa funzione evita errori dovuti a:

- stringhe vuote;
- valori null;
- dati non numerici.

---

### round()

Arrotonda il risultato numerico al numero di cifre decimali richiesto.

L'utilizzo di una funzione comune garantisce che:

- l'interfaccia;
- il PDF;
- l'archivio;
- il grafico

utilizzino sempre gli stessi valori.

---

### normalizeReadings()

Uniforma il formato delle letture provenienti dall'interfaccia o dall'archivio.

Ogni prova dispone sempre del numero corretto di letture previste dal relativo protocollo.

---

### buildRows()

Costruisce l'intera tabella della prova.

Per ogni gradino vengono determinati automaticamente:

- carico;
- pressione;
- letture;
- cedimento o spostamento;
- valori utilizzati dal grafico.

---

### validateTest()

Prima della generazione del PDF verifica la presenza dei dati minimi obbligatori.

Gli errori vengono restituiti all'interfaccia per informare il tecnico prima dell'esportazione del verbale.

Questo garantisce uniformità tra dati provenienti da input HTML, archivio locale e PDF.


## Introduzione

Le tre applicazioni DISMAT implementano modelli matematici differenti, in quanto ciascuna prova di carico segue una procedura sperimentale e una normativa tecnica specifica.

L'obiettivo dell'applicazione non è sostituire il giudizio del tecnico, ma automatizzare i calcoli ripetitivi, ridurre il rischio di errore durante la prova e garantire la coerenza tra dati acquisiti, grafici e verbali PDF.

Tutti i calcoli vengono eseguiti esclusivamente sui dati inseriti dall'operatore.

Le formule implementate nel software sono documentate in questo capitolo insieme alla logica utilizzata dal codice.

---
# 16.1 Prova di carico su pali

La prova di carico su pali è composta da una sequenza di gradini di carico e di scarico.

Per ogni gradino il tecnico inserisce le letture dei comparatori mentre l'applicazione calcola automaticamente i valori necessari alla compilazione della prova.

L'interfaccia è stata progettata per ridurre il numero di calcoli manuali durante l'esecuzione della prova.

---
### 16.1.1 Calcolo dei gradini di carico

L'operatore può inserire:

- il carico di esercizio;
- oppure direttamente il carico massimo di prova.

L'applicazione determina automaticamente tutti i gradini previsti dalla configurazione della prova.

Ogni gradino viene identificato da:

- percentuale del carico;
- ciclo di prova;
- fase di carico o scarico.

La configurazione dei gradini è definita nel file:

```
src/config/testConfig.js
```

e non deve essere modificata senza verificare la compatibilità con il resto dell'applicazione.
### 16.1.2 Calcolo della pressione del martinetto

Per ogni gradino l'applicazione calcola automaticamente la pressione da applicare al martinetto.

La relazione utilizzata è una proporzione diretta.

Formula:

```
Pressione [bar]

=

(Carico del gradino × 700)

÷

Portata del martinetto [kN]
```

dove:

- 700 bar rappresentano la pressione nominale del manometro;
- la portata del martinetto viene inserita dal tecnico;
- il risultato è espresso in bar.

Questo calcolo evita la necessità di eseguire proporzioni manuali durante la prova.
### 16.1.3 Verifica della stabilità dei comparatori

Per ogni gradino di prova l'applicazione gestisce tre comparatori:

- Comparatore 1
- Comparatore 2
- Comparatore 3

Ogni comparatore può contenere fino a 9 letture.

Per ogni comparatore l'applicazione considera esclusivamente le prime tre letture valide. Le eventuali letture successive vengono comunque archiviate ma non partecipano al calcolo della stabilità e della media del comparatore.

Un comparatore viene considerato stabile quando sono presenti almeno tre letture valide e la differenza tra la lettura massima e la lettura minima delle prime tre letture è minore o uguale a **0,02 mm**.

**Formula logica**

```text
stabile =
max(prime 3 letture) - min(prime 3 letture) ≤ 0,02 mm
```

Se il comparatore è stabile, il valore del comparatore viene calcolato come media delle prime tre letture.

**Formula**

```text
valore comparatore =
(lettura1 + lettura2 + lettura3) / 3
```

Se il comparatore non è stabile, il valore del comparatore viene considerato nullo ai fini del calcolo del cedimento medio del gradino.

**Implementazione nel software**

```text
File:
src/utils/calculations.js

Funzione:
calcComparator()

```

### 16.1.4 Calcolo del cedimento medio del gradino

#### Scopo del calcolo

Il cedimento medio rappresenta il valore utilizzato dall'applicazione per descrivere il comportamento del palo in uno specifico gradino di carico.

Il calcolo viene eseguito solamente sui comparatori risultati stabili.

#### Formula

```text
Cedimento medio =

Somma dei valori dei comparatori stabili
────────────────────────────────────────
Numero dei comparatori stabili
```

#### Elaborazioni aggiuntive

Per ogni gradino vengono inoltre calcolati:

- cedimento massimo;
- cedimento minimo;
- differenza tra valore massimo e minimo (Δ);
- numero totale delle letture inserite;
- numero dei comparatori risultati stabili.

Il valore Δ viene calcolato come:

```text
Δ = Cedimento massimo − Cedimento minimo
```

#### Implementazione nel software

```text
File:
src/utils/calculations.js

Funzione:
calcStepStats()
```
### 16.1.5 Calcolo del carico base

#### Scopo del calcolo

L'applicazione determina automaticamente il carico base della prova, dal quale vengono ricavati tutti i gradini successivi.

#### Logica di calcolo

Se il tecnico inserisce il carico di esercizio (Ne), questo viene utilizzato direttamente.

Se invece viene inserito solamente il carico massimo di prova (Nc), il carico base viene ricavato automaticamente dividendo il valore per 1,5.

#### Formula

```text
Se Ne > 0

Carico base = Ne

altrimenti

Carico base = Nc / 1,5
```

Il carico massimo della prova viene quindi calcolato come:

```text
Carico massimo = Carico base × 1,5
```

#### Implementazione nel software

```text
File:
src/utils/calculations.js

Funzioni:
resolveBaseLoad()
calcPalo()
```

### 16.1.6 Calcolo dei gradini di prova

#### Scopo del calcolo

Ogni gradino della prova viene determinato applicando il fattore previsto dalla configurazione della prova al carico base.

#### Formula

```text
Carico del gradino =

Carico base × Fattore del gradino
```

Ogni gradino contiene inoltre:

- numero progressivo;
- fase di carico o scarico;
- ciclo della prova;
- pressione teorica;
- letture dei comparatori;
- cedimento medio;
- valori dei singoli comparatori.

#### Implementazione nel software

```text
File:
src/utils/calculations.js

Funzione:
buildRows()
```
### 16.1.7 Costruzione del grafico carico/cedimento

#### Scopo del grafico

Il grafico rappresenta l'andamento del carico applicato in funzione del cedimento misurato dai comparatori.

L'applicazione costruisce una serie distinta per ogni comparatore, in modo da mantenere visibile il comportamento dei tre punti di misura.

#### Assi del grafico

```text
Asse X = cedimento del comparatore [mm]

Asse Y = carico del gradino [kN]
```

#### Origine del grafico

Ogni serie del grafico parte dal punto:

```text
(0, 0)
```

Questo permette di visualizzare l'andamento della prova a partire dalla condizione iniziale senza carico e senza cedimento.

#### Serie rappresentate

Il grafico contiene tre serie:

- Comparatore 1
- Comparatore 2
- Comparatore 3

Ogni punto del grafico contiene:

- cedimento del comparatore;
- carico del gradino;
- pressione teorica;
- fase della prova;
- ciclo;
- eventuale indicazione di scarico.

#### Implementazione nel software

```text
File:
src/utils/calculations.js

Funzione:
calcPalo()
```
### 16.1.8 Recupero elastico e cedimento residuo

#### Scopo del calcolo

L'applicazione calcola il cedimento residuo allo scarico e, quando possibile, il recupero elastico.

Il cedimento residuo viene ricavato dal gradino identificato come scarico residuo.

#### Formula

```text
Recupero elastico =

Cedimento al carico massimo − Cedimento residuo
```

Se uno dei due valori non è disponibile, il recupero elastico non viene calcolato.

#### Implementazione nel software

```text
File:
src/utils/calculations.js

Funzione:
calcPalo()
```
### 16.1.9 Controlli prima del PDF

Prima della generazione del verbale l'applicazione verifica che siano presenti i dati minimi necessari.

I controlli principali sono:

- identificativo palo;
- carico di esercizio o carico massimo di collaudo;
- portata del martinetto;
- carico massimo non superiore alla portata nominale del martinetto;
- almeno una lettura dei comparatori;
- foto o schema della prova;
- tecnico esecutore.

Se uno o più controlli non sono soddisfatti, l'applicazione segnala l'errore prima della generazione del PDF.

#### Implementazione nel software

```text
File:
src/utils/calculations.js

Funzione:
validateTest()
```

# 16.2 Prova di carico su tiranti

La prova di carico su tiranti utilizza un solo comparatore.

Per ogni gradino l'applicazione calcola automaticamente il carico teorico e la pressione del martinetto, mentre il tecnico inserisce le letture del comparatore.

---

### 16.2.1 Normalizzazione delle letture

Ogni gradino contiene fino a 10 letture del comparatore.

Se il dato salvato non è già una lista, l'applicazione lo converte automaticamente in una lista di 10 valori.

#### Implementazione nel software

```text
File:
src/utils/calculations.js

Funzione:
normalizeReadings()
```

---

### 16.2.2 Verifica della stabilità

Per ogni gradino vengono considerate le ultime tre letture valide inserite.

Il gradino viene considerato stabile quando:

```text
max(ultime 3 letture) - min(ultime 3 letture) <= 0,02 mm
```

Se il gradino è stabile, la lettura valida viene calcolata come media delle ultime tre letture.

```text
lettura valida =
(lettura n-2 + lettura n-1 + lettura n) / 3
```

Se il gradino non è stabile, l'applicazione utilizza comunque l'ultima lettura valida inserita.

#### Implementazione nel software

```text
File:
src/utils/calculations.js

Funzione:
calcValidReading()
```

---

### 16.2.3 Calcolo del carico del gradino

Il carico del gradino viene calcolato moltiplicando il carico massimo di collaudo `Nc` per il fattore del gradino.

```text
Carico del gradino = Nc × fattore del gradino
```

Il fattore del gradino è definito nella configurazione della prova.

#### Implementazione nel software

```text
File:
src/utils/calculations.js

Funzione:
buildRows()
```

---

### 16.2.4 Calcolo della pressione del martinetto

La pressione viene calcolata automaticamente tramite proporzione tra portata del martinetto e pressione nominale del manometro.

La portata del martinetto viene convertita da tonnellate a kN:

```text
Portata martinetto [kN] = Portata martinetto [t] × 9,81
```

Poi viene calcolata la pressione:

```text
Pressione [bar] =
(Carico del gradino × 700) / Portata martinetto [kN]
```

#### Implementazione nel software

```text
File:
src/utils/calculations.js

Funzione:
buildRows()
```

---

### 16.2.5 Costruzione delle righe della prova

Per ogni gradino l'applicazione genera una riga contenente:

- numero progressivo;
- carico teorico;
- pressione calcolata;
- letture del comparatore;
- lettura valida;
- spostamento;
- stato di stabilità;
- numero di letture inserite.

La lettura valida viene usata anche come spostamento del tirante.

```text
spostamento = lettura valida
```

#### Implementazione nel software

```text
File:
src/utils/calculations.js

Funzione:
buildRows()
```

---

### 16.2.6 Costruzione del grafico carico/spostamento

Il grafico utilizza:

```text
Asse X = spostamento [mm]

Asse Y = carico [kN]
```

La fase di carico parte dall'origine:

```text
(0, 0)
```

La fase di scarico viene costruita partendo dal punto di carico massimo, quando disponibile.

Il grafico finale è composto da:

- serie di carico;
- serie di scarico;
- insieme complessivo dei punti.

#### Implementazione nel software

```text
File:
src/utils/calculations.js

Funzione:
calcTirante()
```

---

### 16.2.7 Cedimento massimo e residuo

L'applicazione individua:

- il gradino di carico massimo;
- il gradino di scarico residuo.

Il cedimento massimo è lo spostamento registrato al gradino massimo.

Il residuo è lo spostamento registrato allo scarico.

```text
cedimento massimo = spostamento al carico massimo

residuo = spostamento allo scarico
```

#### Implementazione nel software

```text
File:
src/utils/calculations.js

Funzione:
calcTirante()
```

---

### 16.2.8 Controlli prima del PDF

Prima della generazione del verbale l'applicazione verifica:

- identificativo tirante;
- carico di collaudo Nc;
- carico di esercizio Ne;
- carico massimo della prova maggiore di zero;
- almeno una lettura del comparatore;
- foto della prova;
- tecnico esecutore.

#### Implementazione nel software

```text
File:
src/utils/calculations.js

Funzione:
validateTest()
```
# 16.3 Prova di carico su piastra

La prova di carico su piastra è basata sulla determinazione dei moduli di deformazione `Md` e `Md'`.

L'applicazione gestisce:

- primo ciclo di carico;
- scarico del primo ciclo;
- secondo ciclo di carico;
- scarico finale;
- calcolo di `Md`;
- calcolo di `Md'`;
- rapporto `Md/Md'`;
- grafico carico/cedimento.

Normativa di riferimento indicata nell'applicazione:

```text
CNR 146/92
```

---

### 16.3.1 Diametro della piastra

Il diametro della piastra viene letto dai dati inseriti dall'operatore.

Se il valore non è disponibile, l'applicazione utilizza come valore predefinito:

```text
D = 300 mm
```

Il diametro viene utilizzato nel calcolo dei moduli `Md` e `Md'`.

#### Implementazione nel software

```text
File:
src/App.jsx

Variabile:
D
```

---

### 16.3.2 Cicli di carico

L'applicazione gestisce due cicli principali.

#### Primo ciclo

```text
20 kPa
50 kPa
150 kPa
250 kPa
350 kPa
450 kPa
```

#### Secondo ciclo

```text
50 kPa
150 kPa
250 kPa
350 kPa
```

Il primo ciclo comprende anche uno scarico a 50 kPa.

Il secondo ciclo comprende uno scarico finale a 20 kPa.

#### Implementazione nel software

```text
File:
src/App.jsx

Variabili:
p1vals
p2vals
```

---

### 16.3.3 Letture stabilizzate

Per ogni gradino viene utilizzata l'ultima lettura valida inserita.

L'applicazione ricava:

```text
r1 = letture del primo ciclo

r2 = letture del secondo ciclo
```

Le letture di scarico vengono calcolate separatamente:

```text
rScarico1 = scarico del primo ciclo

rScarico2 = scarico finale del secondo ciclo
```

#### Implementazione nel software

```text
File:
src/App.jsx

Funzione:
lastValid()
```

---

### 16.3.4 Calcolo dei cedimenti

Il riferimento iniziale è la lettura del primo gradino del primo ciclo.

```text
zero = lettura a 20 kPa del primo ciclo
```

I cedimenti vengono calcolati come differenza assoluta rispetto a questo valore iniziale.

```text
s = |lettura - zero|
```

Vengono calcolati:

- cedimenti del primo ciclo;
- cedimento allo scarico del primo ciclo;
- cedimenti del secondo ciclo;
- cedimento allo scarico finale.

#### Implementazione nel software

```text
File:
src/App.jsx

Variabili:
s1
s2
sScarico1
sScarico2
```

---

### 16.3.5 Interpolazione tra 250 kPa e 350 kPa

Per il calcolo dei moduli vengono utilizzati i cedimenti corrispondenti a:

```text
250 kPa

350 kPa
```

L'applicazione calcola questi valori tramite interpolazione.

```text
def025 = cedimento interpolato a 250 kPa

def035 = cedimento interpolato a 350 kPa
```

Poi calcola la differenza:

```text
Δs = |def035 - def025|
```

Questa operazione viene eseguita sia per il primo ciclo sia per il secondo ciclo.

#### Implementazione nel software

```text
File:
src/App.jsx

Funzione:
interp()

Variabili:
def025c1
def035c1
ds1
def025c2
def035c2
ds2
```

---

### 16.3.6 Calcolo del modulo Md

Il modulo `Md` viene calcolato sul primo ciclo.

Formula implementata:

```text
Md = (0,10 / Δs1) × D
```

dove:

- `0,10` rappresenta l'intervallo di pressione tra 0,25 MPa e 0,35 MPa;
- `Δs1` è la differenza di cedimento interpolata nel primo ciclo;
- `D` è il diametro della piastra.

Il valore viene calcolato solo se:

- `Δs1 > 0`;
- il primo ciclo contiene almeno una lettura valida.

#### Implementazione nel software

```text
File:
src/App.jsx

Variabile:
md
```

---

### 16.3.7 Calcolo del modulo Md'

Il modulo `Md'` viene calcolato sul secondo ciclo.

Formula implementata:

```text
Md' = (0,10 / Δs2) × D
```

dove:

- `0,10` rappresenta l'intervallo di pressione tra 0,25 MPa e 0,35 MPa;
- `Δs2` è la differenza di cedimento interpolata nel secondo ciclo;
- `D` è il diametro della piastra.

Il valore viene calcolato solo se:

- `Δs2 > 0`;
- il secondo ciclo contiene almeno una lettura valida.

#### Implementazione nel software

```text
File:
src/App.jsx

Variabile:
mdp
```

---

### 16.3.8 Rapporto Md/Md'

L'applicazione calcola il rapporto tra i due moduli:

```text
rapporto = Md / Md'
```

Il rapporto viene calcolato solo se entrambi i moduli sono disponibili e `Md'` è maggiore di zero.

#### Criterio di validità implementato

Nel software la prova viene considerata valida quando:

```text
Md / Md' < 1
```

#### Implementazione nel software

```text
File:
src/App.jsx

Variabili:
rapporto
provaValida
```

---

### 16.3.9 Costruzione del grafico carico/cedimento

Il grafico della prova su piastra rappresenta:

```text
Asse X = carico [kPa]

Asse Y = cedimento [mm]
```

Il grafico contiene:

- primo ciclo;
- scarico del primo ciclo;
- secondo ciclo;
- scarico finale.

#### Primo ciclo

Il primo ciclo viene costruito utilizzando i valori:

```text
20, 50, 150, 250, 350, 450 kPa
```

e i relativi cedimenti.

#### Scarico del primo ciclo

Lo scarico del primo ciclo collega:

```text
450 kPa → 50 kPa
```

quando sono disponibili i dati.

#### Secondo ciclo

Il secondo ciclo parte dal cedimento residuo dello scarico del primo ciclo, quando disponibile, e prosegue con:

```text
50, 150, 250, 350 kPa
```

#### Scarico finale

Lo scarico finale collega:

```text
350 kPa → 20 kPa
```

quando sono disponibili i dati.

#### Implementazione nel software

```text
File:
src/App.jsx

Variabili:
chart1
chartScarico1
chart2
chartScarico2
```

---

### 16.3.10 Tabella riepilogativa

L'applicazione costruisce una tabella riepilogativa con i valori principali della prova.

Per ogni carico vengono mostrati:

- carico applicato;
- lettura del primo ciclo;
- cedimento del primo ciclo;
- lettura del secondo ciclo, quando presente;
- cedimento del secondo ciclo, quando presente;
- indicazione dei valori di riferimento a 250 kPa e 350 kPa.

#### Implementazione nel software

```text
File:
src/App.jsx

Variabile:
tableRows
```

# 17. Regola finale

Le tre applicazioni devono evolvere insieme.

Ogni nuova funzionalità sviluppata per una di esse deve essere valutata per essere riportata anche sulle altre, mantenendo il codice il più possibile uniforme, leggibile e facilmente manutenibile.
---

# 18. Storico documento

## Versione 1.0.0 – Luglio 2026

- Creazione del manuale tecnico.
- Definizione dell'architettura comune.
- Documentazione archivio IndexedDB.
- Workflow Git.
- Regole di sviluppo.
- Descrizione delle tre applicazioni.

---
## Versione 2.0.0 – Luglio 2026

Principali aggiornamenti:

- documentazione completa dell'architettura React;
- descrizione del flusso dei dati;
- documentazione del sistema di archivio IndexedDB;
- descrizione del workflow Git e deploy;
- documentazione completa dei modelli matematici delle applicazioni:
  - Prova di carico su pali;
  - Prova di carico su tiranti;
  - Prova di carico su piastra;
- introduzione delle convenzioni software;
- documentazione delle funzioni comuni;
- standardizzazione della struttura del progetto.

Il presente documento deve essere aggiornato ogni volta che viene introdotta una modifica strutturale comune alle applicazioni DISMAT.