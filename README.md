# Holy Bible Web Platform (Bible.com / YouVersion Model)

A modern, fast, distraction-free Holy Bible web application modeled after **Bible.com (YouVersion)**, featuring the **entire Bible: all 66 books across both the Old and New Testaments (1,189 chapters, 31,102 verses)**.

---

## ✨ Features Included

1. **Complete Scripture (Old & New Testaments)**:
   - **Old Testament**: All 39 canonical books (Genesis through Malachi), 929 chapters, 23,145 verses.
   - **New Testament**: All 27 canonical books (Matthew through Revelation), 260 chapters, 7,957 verses.
   - King James Version (KJV) standard English translation.

2. **Navigation & Selector (Bible.com Modal)**:
   - Instant Book & Chapter Picker with tabs for **All (66)**, **Old Testament (39)**, and **New Testament (27)**.
   - Categorized by biblical genres: *Law, History, Poetry, Wisdom, Major Prophets, Minor Prophets, Gospels, Pauline Epistles, General Epistles, Prophecy*.
   - Filter input to quickly search for any book name.
   - Floating Previous (`←`) and Next (`→`) chapter arrows + keyboard shortcuts (`Left` / `Right` arrow keys).

3. **Interactive Study & Verse Annotation**:
   - Multi-verse selection by clicking any verse.
   - **Highlighter**: 5 aesthetic pastel color choices (*Yellow, Mint, Sky Blue, Coral, Lavender*) + remove option.
   - **Bookmarks**: Save favorite passages to your personal library.
   - **Personal Notes**: Write reflections and study notes attached to specific verses.
   - **One-Click Copy**: Copies clean citations formatted as `"[Verse text]" — Book Chapter:Verse (KJV)`.
   - **Shareable Verse Cards**: Generate beautiful quote cards with gradient presets ready to share!

4. **Audio Bible Narrator**:
   - Integrated browser **SpeechSynthesis (Text-to-Speech)** narration engine.
   - Real-time sentence/verse tracking with synchronized active verse glow.
   - Playback speed controls ($0.75\times, 1.0\times, 1.25\times, 1.5\times$).

5. **Instant Full-Text Search Engine**:
   - Jump directly by scripture reference (e.g., `John 3:16`, `Genesis 1`, `Ps 23`).
   - Search by keyword or phrase across all 31,102 verses with real-time keyword highlighting.
   - Testament filters (All, Old Testament, New Testament).

6. **Reader Display & Typography Customizer (`Aa`)**:
   - 4 Color Themes: **Light**, **Sepia** (warm paper), **Dark** (slate), **Midnight** (OLED black).
   - Typography switch: **Serif** (*Newsreader / Georgia*) vs. **Sans-serif** (*Inter*).
   - Font size adjuster ($14\text{px} - 30\text{px}$).
   - Toggle verse numbers on/off.

7. **My Study Library**:
   - Slide-over drawer organizing all your highlights, bookmarks, notes, and reading plans.
   - Fully persistent via browser `localStorage`.

8. **Zero Dependencies & $100\%$ Offline**:
   - Pre-bundled standalone data file (`data/bible_kjv_data.js`).
   - Works immediately offline without requiring external API servers or subscriptions.

---

## 🚀 How to Run the Website

### Option 1: One-Click Launcher (Recommended)
Double-click `start_server.bat` in the project folder. It starts a lightweight local server and automatically opens `http://localhost:8080/` in your browser.

### Option 2: Direct File Open
You can directly open `index.html` in Chrome, Edge, Brave, or Firefox. The standalone database bundle will load immediately with zero configuration!

---

## 📁 Project Directory Structure

```text
c:\Users\elbin\OneDrive\Desktop\Private\Project\Bible\
├── index.html                 # Main Bible web application interface
├── start_server.bat           # 1-Click Windows launcher
├── server.ps1                 # Lightweight local HTTP server (PowerShell)
├── README.md                  # Project documentation & guide
├── css\
│   └── styles.css             # Bible.com inspired responsive design system
├── js\
│   ├── app.js                 # Application orchestrator, router & state
│   ├── reader.js              # Scripture reading view & verse annotations
│   ├── audio.js               # Audio narration engine with verse sync
│   ├── search.js              # Full-text search & reference parser
│   ├── library.js             # Highlights, bookmarks, notes & plans manager
│   └── verse_card.js          # Verse of the Day & card generator
└── data\
    ├── bible_kjv_data.js      # Complete 66-book bundled database
    ├── books_metadata.json    # Canonical metadata for all 66 books
    ├── search_index.json      # Indexed verses dataset
    └── books\                 # 66 individual book JSON files
```

---

## 🌐 Deploying to the Web

Because this application is a pure client-side web app with no server dependencies, you can deploy it to any free static host in minutes:
- **GitHub Pages**: Push this directory to a GitHub repository and turn on Pages in repository settings.
- **Vercel / Netlify / Cloudflare Pages**: Drag and drop this folder onto Netlify Drop or connect your GitHub repository.
