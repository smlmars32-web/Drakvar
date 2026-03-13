# 🐉 DRAKVAR - Deployment Instructies

## Opties om DRAKVAR online te zetten:

### ✨ Optie 1: Vercel (Aanbevolen - Gratis & Eenvoudig)

1. Ga naar [vercel.com](https://vercel.com)
2. Maak een gratis account aan (kan met GitHub)
3. Klik op "Add New Project"
4. Importeer deze folder of upload de bestanden
5. Klik op "Deploy"
6. Klaar! Je krijgt een link zoals: `https://drakvar.vercel.app`

**Voordelen:**
- ✅ Gratis
- ✅ Automatische HTTPS
- ✅ Wereldwijd CDN
- ✅ Instant deployment

---

### 🚀 Optie 2: Netlify (Ook Gratis)

1. Ga naar [netlify.com](https://netlify.com)
2. Sign up voor een gratis account
3. Sleep deze hele folder naar Netlify Drop
4. Of: klik "New site from Git" en koppel je GitHub repo
5. Deploy!
6. Je krijgt een link zoals: `https://drakvar.netlify.app`

---

### 💻 Optie 3: GitHub Pages (Simpelst - Alleen Statische Files)

1. Maak een GitHub repository
2. Upload `drakvar.html` naar de root
3. Ga naar Settings → Pages
4. Selecteer "main branch" als source
5. Save - je krijgt een link zoals: `https://username.github.io/drakvar`

**Let op:** Je hebt alleen de `drakvar.html` file nodig, niet server.js

---

### ⚡ Optie 4: Render (Gratis Node.js Hosting)

1. Ga naar [render.com](https://render.com)
2. Sign up gratis
3. "New Web Service"
4. Connect je GitHub repo of upload files
5. Build Command: `npm install`
6. Start Command: `npm start`
7. Deploy!

---

### 🌐 Optie 5: Azure (Al Geconfigureerd)

Dit project heeft al Azure configuratie (web.config)!

1. Ga naar [portal.azure.com](https://portal.azure.com)
2. Maak een Web App aan
3. Deploy via VS Code Azure extension
4. Of gebruik: `az webapp up --name drakvar-game`

---

## 🎮 Spel direct starten (Lokaal)

```bash
npm start
```

Dan open: `http://localhost:3000/drakvar.html`

---

## 📦 Wat heb je nodig om te deployen?

**Minimaal (alleen HTML file):**
- `drakvar.html` - Het complete spel!

**Volledige app (met Express server):**
- `drakvar.html`
- `server.js`
- `package.json`
- `package-lock.json`

---

## 🎯 Snelste Manier (Drag & Drop)

Voor de **snelste publicatie** zonder technische kennis:

1. Ga naar **[Netlify Drop](https://app.netlify.com/drop)**
2. Sleep `drakvar.html` naar de pagina
3. Klaar! Je krijgt meteen een link

Of nog simpeler:

1. Open `drakvar.html` in een browser
2. Deel via: **File → Save Page As → Complete Webpage**
3. Upload naar **Google Drive** en deel de link
4. Of upload naar **Dropbox** en maak een public link

---

## 🔗 Custom Domain (Optioneel)

Als je een eigen domein wilt (bijv. `www.drakvar.com`):

1. Koop een domein bij Namecheap, Google Domains, etc.
2. In Vercel/Netlify: Settings → Domains
3. Voeg je custom domain toe
4. Update DNS records (instructies worden getoond)

---

## 🎨 Tips

- Het spel werkt volledig client-side (in de browser)
- Geen database nodig
- Geen server nodig (Express is optioneel)
- Werkt op mobile & desktop
- Kan offline werken als HTML file lokaal geopend wordt

---

## ❓ Hulp Nodig?

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Netlify Docs**: [docs.netlify.com](https://docs.netlify.com)
- **GitHub Pages**: [pages.github.com](https://pages.github.com)

---

**Geniet van DRAKVAR! 🐉🔥**
