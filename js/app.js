/**
 * HOLY BIBLE WEB APPLICATION
 * Core Application Orchestrator & Controller
 */

class HolyBibleApp {
  constructor() {
    this.db = window.BIBLE_DATABASE || null;
    this.metadata = [];
    if (this.db) {
      if (Array.isArray(this.db.metadata)) {
        this.metadata = this.db.metadata;
      } else if (this.db.metadata && Array.isArray(this.db.metadata.value)) {
        this.metadata = this.db.metadata.value;
      }
    }
    this.currentBookId = 'GEN';
    this.currentChapter = 1;
    this.settings = this.loadSettings();

    // Module instances
    this.library = new BibleLibrary(this);
    this.reader = new BibleReader(this);
    this.audio = new BibleAudio(this);
    this.search = new BibleSearch(this);
    this.verseCard = new VerseCardGenerator(this);
    this.challenge = new BibleChallenge(this);

    this.init();
  }

  loadSettings() {
    const defaults = {
      theme: 'light',
      fontFamily: 'serif',
      fontSize: 19,
      lineHeight: 1.85,
      showVerseNums: true,
      layoutMode: 'line' // 'line' = each verse on a new line, 'paragraph' = flowing text
    };
    try {
      const saved = localStorage.getItem('bible_reader_settings');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('bible_reader_settings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  applySettings() {
    document.documentElement.setAttribute('data-theme', this.settings.theme);
    document.documentElement.style.setProperty('--reading-font', this.settings.fontFamily === 'serif' ? 'var(--font-serif)' : 'var(--font-sans)');
    document.documentElement.style.setProperty('--reading-font-size', `${this.settings.fontSize}px`);
    document.documentElement.style.setProperty('--reading-line-height', this.settings.lineHeight);

    const scriptureBody = document.getElementById('scriptureBody');
    if (scriptureBody) {
      if (this.settings.showVerseNums) {
        scriptureBody.classList.remove('hide-verse-nums');
      } else {
        scriptureBody.classList.add('hide-verse-nums');
      }

      // Verse layout mode: line (new line for each verse) vs paragraph
      if (this.settings.layoutMode === 'paragraph') {
        scriptureBody.classList.add('layout-paragraph');
      } else {
        scriptureBody.classList.remove('layout-paragraph');
      }
    }

    // Update settings modal inputs
    document.querySelectorAll('.theme-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === this.settings.theme);
    });

    const fontSerifBtn = document.getElementById('fontSerifBtn');
    const fontSansBtn = document.getElementById('fontSansBtn');
    if (fontSerifBtn && fontSansBtn) {
      fontSerifBtn.classList.toggle('active', this.settings.fontFamily === 'serif');
      fontSansBtn.classList.toggle('active', this.settings.fontFamily === 'sans');
    }

    const layoutLineBtn = document.getElementById('layoutLineBtn');
    const layoutParaBtn = document.getElementById('layoutParaBtn');
    if (layoutLineBtn && layoutParaBtn) {
      layoutLineBtn.classList.toggle('active', this.settings.layoutMode !== 'paragraph');
      layoutParaBtn.classList.toggle('active', this.settings.layoutMode === 'paragraph');
    }

    const fontSizeDisplay = document.getElementById('fontSizeDisplay');
    if (fontSizeDisplay) fontSizeDisplay.textContent = `${this.settings.fontSize}px`;

    const verseNumsCheckbox = document.getElementById('toggleVerseNums');
    if (verseNumsCheckbox) verseNumsCheckbox.checked = this.settings.showVerseNums;
  }

  init() {
    this.applySettings();
    this.initNavigation();
    this.initPickerModal();
    this.initSettingsModal();
    this.initKeyboardShortcuts();
    this.initVOTDBanner();

    // Handle hash navigation (e.g. #GEN.1 or #JHN.3.16)
    this.handleHashChange();
    window.addEventListener('hashchange', () => this.handleHashChange());
  }

  handleHashChange() {
    const hash = window.location.hash.replace('#', '').trim();
    if (hash) {
      const parts = hash.split('.');
      const bookId = parts[0]?.toUpperCase();
      const chapter = parseInt(parts[1]) || 1;
      const verse = parts[2] ? parseInt(parts[2]) : null;

      if (this.getBook(bookId)) {
        this.navigateTo(bookId, chapter, verse, false);
        return;
      }
    }

    // Default to Genesis 1 if no hash
    this.navigateTo(this.currentBookId, this.currentChapter, null, false);
  }

  initNavigation() {
    // Reference selector button (e.g. "Genesis 1")
    document.getElementById('refPickerBtn')?.addEventListener('click', () => {
      this.openPickerModal();
    });

    // Audio bar toggle
    document.getElementById('audioToggleBtn')?.addEventListener('click', () => {
      this.audio.toggleBar();
    });

    // Previous / Next Chapter buttons (Floating Desktop)
    document.getElementById('prevChapterBtn')?.addEventListener('click', () => this.prevChapter());
    document.getElementById('nextChapterBtn')?.addEventListener('click', () => this.nextChapter());

    // Previous / Next Chapter buttons (Chapter Footer Mobile & Desktop)
    document.getElementById('prevChapterFooterBtn')?.addEventListener('click', () => this.prevChapter());
    document.getElementById('nextChapterFooterBtn')?.addEventListener('click', () => this.nextChapter());

    // Mobile Bottom Navigation Bar Actions
    document.getElementById('mobileNavRead')?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));
      document.getElementById('mobileNavRead')?.classList.add('active');
    });

    document.getElementById('mobileNavSearch')?.addEventListener('click', () => {
      document.getElementById('openSearchBtn')?.click();
    });

    document.getElementById('mobileNavAudio')?.addEventListener('click', () => {
      this.audio.toggleBar();
    });

    document.getElementById('mobileNavLibrary')?.addEventListener('click', () => {
      document.getElementById('openLibraryBtn')?.click();
    });

    document.getElementById('mobileNavSettings')?.addEventListener('click', () => {
      document.getElementById('openSettingsBtn')?.click();
    });

    // Challenge buttons (header + mobile nav)
    const openChallenge = () => this.challenge?.openChallengeModal();
    document.getElementById('openChallengeBtn')?.addEventListener('click', openChallenge);
    document.getElementById('mobileNavChallenge')?.addEventListener('click', openChallenge);
    document.getElementById('closeChallengeBtn')?.addEventListener('click', () => this.challenge?.closeModal());

    // Close challenge modal on overlay-backdrop click
    document.getElementById('challengeOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'challengeOverlay') this.challenge?.closeModal();
    });

    // Update challenge nav badge on load
    this.challenge?.updateNavBadge();
  }

  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignore if inside an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.key === 'ArrowLeft') {
        this.prevChapter();
      } else if (e.key === 'ArrowRight') {
        this.nextChapter();
      }
    });
  }

  initVOTDBanner() {
    const votd = this.verseCard.getVerseOfTheDay();
    const votdTextEl = document.getElementById('votdText');
    const votdRefEl = document.getElementById('votdRef');
    const votdContainer = document.getElementById('votdBanner');

    if (votdTextEl && votdRefEl) {
      votdTextEl.textContent = `"${votd.text}"`;
      votdRefEl.textContent = `— ${votd.name} ${votd.c}:${votd.v} (KJV)`;
      votdContainer?.addEventListener('click', () => {
        this.navigateTo(votd.b, votd.c, votd.v);
      });
    }
  }

  // --- Book & Chapter Navigation ---
  navigateTo(bookId, chapterNum, verseNum = null, updateHash = true) {
    const book = this.getBook(bookId);
    if (!book) return;

    this.currentBookId = bookId;
    this.currentChapter = Math.max(1, Math.min(parseInt(chapterNum), book.chapters.length));

    // Update navigation button label
    const refLabel = document.getElementById('currentRefLabel');
    if (refLabel) {
      refLabel.textContent = `${book.name} ${this.currentChapter}`;
    }

    // Update URL hash
    if (updateHash) {
      const newHash = verseNum ? `#${bookId}.${this.currentChapter}.${verseNum}` : `#${bookId}.${this.currentChapter}`;
      try {
        history.pushState(null, '', newHash);
      } catch (e) {
        try {
          window.location.hash = newHash;
        } catch (err) {}
      }
    }

    // Render in reader
    this.reader.renderChapter(this.currentBookId, this.currentChapter);

    // If specific verse requested, scroll to it
    if (verseNum) {
      setTimeout(() => {
        const verseEl = document.getElementById(`verse-${bookId}-${this.currentChapter}-${verseNum}`);
        if (verseEl) {
          verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          verseEl.classList.add('selected');
          this.reader.selectedVerses.add(`${bookId}:${this.currentChapter}:${verseNum}`);
          this.reader.updateActionBar();
        }
      }, 100);
    }
  }

  prevChapter() {
    const currentBook = this.getCurrentBook();
    if (!currentBook) return;

    if (this.currentChapter > 1) {
      this.navigateTo(this.currentBookId, this.currentChapter - 1);
    } else {
      // Go to previous book's last chapter
      const currentIndex = this.metadata.findIndex(b => b.id === this.currentBookId);
      if (currentIndex > 0) {
        const prevBookMeta = this.metadata[currentIndex - 1];
        const prevBook = this.getBook(prevBookMeta.id);
        if (prevBook) {
          this.navigateTo(prevBook.id, prevBook.chapters.length);
        }
      }
    }
  }

  nextChapter() {
    const currentBook = this.getCurrentBook();
    if (!currentBook) return;

    if (this.currentChapter < currentBook.chapters.length) {
      this.navigateTo(this.currentBookId, this.currentChapter + 1);
    } else {
      // Go to next book's chapter 1
      const currentIndex = this.metadata.findIndex(b => b.id === this.currentBookId);
      if (currentIndex < this.metadata.length - 1) {
        const nextBookMeta = this.metadata[currentIndex + 1];
        this.navigateTo(nextBookMeta.id, 1);
      }
    }
  }

  // --- Book & Chapter Picker Modal ---
  initPickerModal() {
    const modal = document.getElementById('pickerModal');
    const closeBtn = document.getElementById('closePickerBtn');
    const searchInput = document.getElementById('pickerSearchInput');
    const tabs = document.querySelectorAll('.picker-tab-btn');

    closeBtn?.addEventListener('click', () => {
      modal?.classList.remove('open');
    });

    // Close on clicking backdrop
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });

    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.renderBooksInPicker();
      });
    });

    searchInput?.addEventListener('input', () => {
      this.renderBooksInPicker();
    });
  }

  openPickerModal() {
    const modal = document.getElementById('pickerModal');
    const searchInput = document.getElementById('pickerSearchInput');
    if (!modal) return;

    // Reset view to books view
    document.getElementById('pickerBooksView')?.classList.remove('hidden');
    document.getElementById('pickerChaptersView')?.classList.add('hidden');

    if (searchInput) searchInput.value = '';
    this.renderBooksInPicker();

    modal.classList.add('open');
    searchInput?.focus();
  }

  renderBooksInPicker() {
    const container = document.getElementById('pickerBooksContainer');
    const searchInput = document.getElementById('pickerSearchInput');
    const activeTab = document.querySelector('.picker-tab-btn.active')?.dataset.testament || 'all';
    if (!container) return;

    container.innerHTML = '';
    const query = searchInput?.value.trim().toLowerCase() || '';

    // Filter books
    const filtered = this.metadata.filter(b => {
      const matchesTab = activeTab === 'all' || b.testament === activeTab;
      const matchesSearch = !query || b.name.toLowerCase().includes(query) || b.id.toLowerCase().includes(query);
      return matchesTab && matchesSearch;
    });

    // Group by Genre
    const groups = {};
    filtered.forEach(b => {
      const g = b.genre || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(b);
    });

    for (const [genre, books] of Object.entries(groups)) {
      const groupHeading = document.createElement('div');
      groupHeading.className = 'genre-group-title';
      groupHeading.textContent = genre;
      container.appendChild(groupHeading);

      const grid = document.createElement('div');
      grid.className = 'books-grid';

      books.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'book-item-btn';
        if (b.id === this.currentBookId) btn.classList.add('active');
        btn.innerHTML = `
          <span>${b.name}</span>
          <span class="ch-count">${b.chaptersCount} ch</span>
        `;

        btn.addEventListener('click', () => {
          this.showChaptersForBook(b);
        });

        grid.appendChild(btn);
      });

      container.appendChild(grid);
    }
  }

  showChaptersForBook(bookMeta) {
    const booksView = document.getElementById('pickerBooksView');
    const chaptersView = document.getElementById('pickerChaptersView');
    const chaptersGrid = document.getElementById('pickerChaptersGrid');
    const selectedBookName = document.getElementById('pickerSelectedBookName');
    const backBtn = document.getElementById('pickerBackToBooksBtn');

    if (!booksView || !chaptersView || !chaptersGrid) return;

    booksView.classList.add('hidden');
    chaptersView.classList.remove('hidden');

    if (selectedBookName) selectedBookName.textContent = bookMeta.name;

    chaptersGrid.innerHTML = '';

    for (let c = 1; c <= bookMeta.chaptersCount; c++) {
      const btn = document.createElement('button');
      btn.className = 'chapter-number-btn';
      if (bookMeta.id === this.currentBookId && c === this.currentChapter) {
        btn.classList.add('active');
      }
      btn.textContent = c;

      btn.addEventListener('click', () => {
        this.navigateTo(bookMeta.id, c);
        document.getElementById('pickerModal')?.classList.remove('open');
      });

      chaptersGrid.appendChild(btn);
    }

    if (backBtn) {
      backBtn.onclick = () => {
        chaptersView.classList.add('hidden');
        booksView.classList.remove('hidden');
      };
    }
  }

  // --- Display / Reader Settings Modal ---
  initSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const openBtn = document.getElementById('openSettingsBtn');
    const closeBtn = document.getElementById('closeSettingsBtn');

    openBtn?.addEventListener('click', () => {
      modal?.classList.add('open');
    });

    closeBtn?.addEventListener('click', () => {
      modal?.classList.remove('open');
    });

    // Theme selector
    document.querySelectorAll('.theme-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.settings.theme = e.target.dataset.theme;
        this.saveSettings();
        this.applySettings();
      });
    });

    // Font family buttons
    document.getElementById('fontSerifBtn')?.addEventListener('click', () => {
      this.settings.fontFamily = 'serif';
      this.saveSettings();
      this.applySettings();
    });

    document.getElementById('fontSansBtn')?.addEventListener('click', () => {
      this.settings.fontFamily = 'sans';
      this.saveSettings();
      this.applySettings();
    });

    // Layout mode buttons (Verse-by-verse vs Paragraph)
    document.getElementById('layoutLineBtn')?.addEventListener('click', () => {
      this.settings.layoutMode = 'line';
      this.saveSettings();
      this.applySettings();
    });

    document.getElementById('layoutParaBtn')?.addEventListener('click', () => {
      this.settings.layoutMode = 'paragraph';
      this.saveSettings();
      this.applySettings();
    });

    // Font size controls
    document.getElementById('fontDecBtn')?.addEventListener('click', () => {
      if (this.settings.fontSize > 14) {
        this.settings.fontSize -= 1;
        this.saveSettings();
        this.applySettings();
      }
    });

    document.getElementById('fontIncBtn')?.addEventListener('click', () => {
      if (this.settings.fontSize < 30) {
        this.settings.fontSize += 1;
        this.saveSettings();
        this.applySettings();
      }
    });

    // Verse numbers toggle
    document.getElementById('toggleVerseNums')?.addEventListener('change', (e) => {
      this.settings.showVerseNums = e.target.checked;
      this.saveSettings();
      this.applySettings();
    });
  }

  // --- Toast Notifications ---
  showToast(message, duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  // --- Database Helpers ---
  getBook(bookId) {
    return this.db?.books ? this.db.books[bookId] : null;
  }

  getCurrentBook() {
    return this.getBook(this.currentBookId);
  }

  getAllBooks() {
    return this.db?.books ? Object.values(this.db.books) : [];
  }
}

// Global initialization
function initHolyBibleApp() {
  if (!window.bibleApp) {
    try {
      console.log('Initializing HolyBibleApp...');
      window.bibleApp = new HolyBibleApp();
    } catch (e) {
      console.error('Fatal initialization error:', e);
      alert('Error initializing Bible App: ' + e.message);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHolyBibleApp);
  window.addEventListener('load', initHolyBibleApp);
} else {
  initHolyBibleApp();
}
