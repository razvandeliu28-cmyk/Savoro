# Savoro

Site de rețete cu AI — Deliu Răzvan.

## 1. Testare locală (opțional)

```bash
npm install
npm run dev
```

Site-ul se deschide, dar butoanele care generează rețete NU vor funcționa local
decât dacă instalezi și rulezi cu Vercel CLI (`npm i -g vercel`, apoi `vercel dev`),
pentru că folosesc funcția din `/api/claude.js`. Pentru testare rapidă a interfeței,
`npm run dev` e suficient.

## 2. Ia o cheie API de la Anthropic

1. Mergi pe https://console.anthropic.com
2. Fă-ți cont, adaugă o metodă de plată (se taxează per folosire, nu abonament fix)
3. Generează o cheie API (Settings → API Keys)
4. NU o pune în cod, nu o urca pe GitHub — o pui doar în Vercel (pasul 5)

## 3. Urcă proiectul pe GitHub

1. Fă-ți cont pe https://github.com (dacă nu ai deja)
2. Creează un repository nou (ex: `savoro`)
3. Din folderul acestui proiect, în terminal:

```bash
git init
git add .
git commit -m "Primul commit - Savoro"
git branch -M main
git remote add origin https://github.com/NUMELE_TAU/savoro.git
git push -u origin main
```

## 4. Publică pe Vercel

1. Mergi pe https://vercel.com și fă-ți cont (poți intra direct cu GitHub)
2. Apasă "Add New Project"
3. Alege repository-ul `savoro` pe care l-ai urcat
4. Vercel detectează automat că e proiect Vite — nu schimba nimic la setări
5. **Înainte să apeși Deploy**, mergi la "Environment Variables" și adaugă:
   - Key: `ANTHROPIC_API_KEY`
   - Value: cheia ta reală de la Anthropic
6. Apasă **Deploy**

În câteva minute primești un link gratuit, gen `savoro.vercel.app` — deja live,
funcțional, cu generare reală de rețete.

## 5. Pune domeniul tău (opțional)

1. Cumpără un domeniu (ex: de pe Namecheap sau GoDaddy) — ex: `savoro.ro`
2. În Vercel, intră în proiect → Settings → Domains → adaugă domeniul
3. Vercel îți arată ce înregistrări DNS să pui la firma de unde ai cumpărat domeniul
   (de obicei un CNAME sau un A record) — le adaugi acolo, urmezi exact ce scrie
4. În câteva ore (uneori minute), domeniul tău arată direct spre Savoro

## Notă despre date

Rețetele generate, cache-ul și favoritele se salvează în browserul fiecărui
vizitator (`localStorage`) — nu într-o bază de date comună. Fiecare persoană
care intră pe site are propriile favorite, vizibile doar pe telefonul/calculatorul ei.
Dacă vrei favorite/cont partajate între toate device-urile unei persoane, e nevoie
de o bază de date reală (ex: Supabase) — spune-i lui Claude dacă vrei să adăugați asta.
