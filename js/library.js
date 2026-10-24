/**
 * STUDY LIBRARY & LOCAL STORAGE MODULE
 * Manages user's personal highlights, bookmarks, notes, and reading plans.
 */

class BibleLibrary {
  constructor(app) {
    this.app = app;
    this.STORAGE_KEY_HIGHLIGHTS = 'bible_highlights_v1';
    this.STORAGE_KEY_BOOKMARKS = 'bible_bookmarks_v1';
    this.STORAGE_KEY_NOTES = 'bible_notes_v1';
    this.STORAGE_KEY_PLANS = 'bible_plans_v1';

    this.highlights = this.load(this.STORAGE_KEY_HIGHLIGHTS, []);
    this.bookmarks = this.load(this.STORAGE_KEY_BOOKMARKS, []);
    this.notes = this.load(this.STORAGE_KEY_NOTES, []);
    this.plans = this.load(this.STORAGE_KEY_PLANS, {});

    this.initEvents();
  }

  load(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.warn('Storage error:', e);
      return fallback;
    }
  }

  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  initEvents() {
    // Drawer open / close
    const openBtn = document.getElementById('openLibraryBtn');
    const closeBtn = document.getElementById('closeLibraryBtn');
    const drawer = document.getElementById('libraryDrawer');
    const tabs = document.querySelectorAll('.lib-tab-btn');

    openBtn?.addEventListener('click', () => {
      drawer?.classList.add('open');
      this.renderCurrentTab();
    });

    closeBtn?.addEventListener('click', () => {
      drawer?.classList.remove('open');
    });

    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.renderCurrentTab();
      });
    });

    // Save Note Modal Button
    document.getElementById('saveNoteBtn')?.addEventListener('click', () => {
      const textarea = document.getElementById('noteTextarea');
      if (!textarea) return;

      const content = textarea.value.trim();
      const bookId = textarea.dataset.bookId;
      const chapter = parseInt(textarea.dataset.chapter);
      const verse = parseInt(textarea.dataset.verse);
      const bookName = textarea.dataset.bookName;

      if (content.length > 0) {
        this.saveNote({
          bookId,
          bookName,
          chapter,
          verse,
          content,
          timestamp: Date.now()
        });
        this.app.showToast('Note saved');
      } else {
        this.removeNote(bookId, chapter, verse);
        this.app.showToast('Note deleted');
      }

      document.getElementById('noteModal')?.classList.remove('open');
      this.app.reader.renderChapter(bookId, chapter);
    });

    document.getElementById('closeNoteBtn')?.addEventListener('click', () => {
      document.getElementById('noteModal')?.classList.remove('open');
    });
  }

  // --- Highlights ---
  getHighlightsForChapter(bookId, chapter) {
    return this.highlights.filter(h => h.bookId === bookId && h.chapter === parseInt(chapter));
  }

  saveHighlight(highlightObj) {
    this.removeHighlight(highlightObj.bookId, highlightObj.chapter, highlightObj.verse);
    this.highlights.unshift(highlightObj);
    this.save(this.STORAGE_KEY_HIGHLIGHTS, this.highlights);
  }

  removeHighlight(bookId, chapter, verse) {
    this.highlights = this.highlights.filter(h => 
      !(h.bookId === bookId && h.chapter === parseInt(chapter) && h.verse === parseInt(verse))
    );
    this.save(this.STORAGE_KEY_HIGHLIGHTS, this.highlights);
  }

  // --- Bookmarks ---
  getBookmarksForChapter(bookId, chapter) {
    return this.bookmarks.filter(b => b.bookId === bookId && b.chapter === parseInt(chapter));
  }

  toggleBookmark(bookmarkObj) {
    const existingIndex = this.bookmarks.findIndex(b => 
      b.bookId === bookmarkObj.bookId && b.chapter === bookmarkObj.chapter && b.verse === bookmarkObj.verse
    );

    if (existingIndex >= 0) {
      this.bookmarks.splice(existingIndex, 1);
    } else {
      this.bookmarks.unshift(bookmarkObj);
    }
    this.save(this.STORAGE_KEY_BOOKMARKS, this.bookmarks);
  }

  // --- Notes ---
  getNotesForChapter(bookId, chapter) {
    return this.notes.filter(n => n.bookId === bookId && n.chapter === parseInt(chapter));
  }

  getNote(bookId, chapter, verse) {
    return this.notes.find(n => n.bookId === bookId && n.chapter === parseInt(chapter) && n.verse === parseInt(verse));
  }

  saveNote(noteObj) {
    this.removeNote(noteObj.bookId, noteObj.chapter, noteObj.verse);
    this.notes.unshift(noteObj);
    this.save(this.STORAGE_KEY_NOTES, this.notes);
  }

  removeNote(bookId, chapter, verse) {
    this.notes = this.notes.filter(n => 
      !(n.bookId === bookId && n.chapter === parseInt(chapter) && n.verse === parseInt(verse))
    );
    this.save(this.STORAGE_KEY_NOTES, this.notes);
  }

  // --- Drawer Rendering ---
  renderCurrentTab() {
    const activeTab = document.querySelector('.lib-tab-btn.active')?.dataset.tab || 'highlights';
    const container = document.getElementById('libraryContentArea');
    if (!container) return;

    container.innerHTML = '';

    if (activeTab === 'highlights') {
      this.renderHighlightsList(container);
    } else if (activeTab === 'bookmarks') {
      this.renderBookmarksList(container);
    } else if (activeTab === 'notes') {
      this.renderNotesList(container);
    } else if (activeTab === 'plans') {
      this.renderPlansList(container);
    }
  }

  renderHighlightsList(container) {
    if (this.highlights.length === 0) {
      container.innerHTML = '<div class="empty-state">No highlights yet.<br>Click any verse in the reader to highlight it!</div>';
      return;
    }

    this.highlights.forEach(h => {
      const card = document.createElement('div');
      card.className = 'library-item-card';
      card.style.cssText = 'padding: 12px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 10px; background: var(--bg-secondary); cursor: pointer;';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-weight: 700; color: var(--accent); font-size: 14px;">${h.bookName} ${h.chapter}:${h.verse}</span>
          <span class="color-dot ${h.color}" style="width: 14px; height: 14px;"></span>
        </div>
        <div style="font-size: 13px; color: var(--text-secondary);">${h.text}</div>
      `;

      card.addEventListener('click', () => {
        this.app.navigateTo(h.bookId, h.chapter, h.verse);
        document.getElementById('libraryDrawer')?.classList.remove('open');
      });

      container.appendChild(card);
    });
  }

  renderBookmarksList(container) {
    if (this.bookmarks.length === 0) {
      container.innerHTML = '<div class="empty-state">No bookmarks saved.<br>Bookmark verses you want to revisit often.</div>';
      return;
    }

    this.bookmarks.forEach(b => {
      const card = document.createElement('div');
      card.className = 'library-item-card';
      card.style.cssText = 'padding: 12px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 10px; background: var(--bg-secondary); cursor: pointer;';
      card.innerHTML = `
        <div style="font-weight: 700; color: var(--accent); font-size: 14px; margin-bottom: 4px;">📌 ${b.bookName} ${b.chapter}:${b.verse}</div>
        <div style="font-size: 13px; color: var(--text-secondary);">${b.text}</div>
      `;

      card.addEventListener('click', () => {
        this.app.navigateTo(b.bookId, b.chapter, b.verse);
        document.getElementById('libraryDrawer')?.classList.remove('open');
      });

      container.appendChild(card);
    });
  }

  renderNotesList(container) {
    if (this.notes.length === 0) {
      container.innerHTML = '<div class="empty-state">No notes written.<br>Add personal study reflections directly on any verse.</div>';
      return;
    }

    this.notes.forEach(n => {
      const card = document.createElement('div');
      card.className = 'library-item-card';
      card.style.cssText = 'padding: 12px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 10px; background: var(--bg-secondary); cursor: pointer;';
      card.innerHTML = `
        <div style="font-weight: 700; color: var(--accent); font-size: 14px; margin-bottom: 4px;">📝 ${n.bookName} ${n.chapter}:${n.verse}</div>
        <div style="font-size: 13px; color: var(--text-primary); font-style: italic; margin-bottom: 6px;">"${n.content}"</div>
        <div style="font-size: 11px; color: var(--text-muted);">${new Date(n.timestamp).toLocaleDateString()}</div>
      `;

      card.addEventListener('click', () => {
        this.app.navigateTo(n.bookId, n.chapter, n.verse);
        document.getElementById('libraryDrawer')?.classList.remove('open');
      });

      container.appendChild(card);
    });
  }

  renderPlansList(container) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div class="plan-card" style="padding: 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-secondary);">
          <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px;">📖 The Whole Bible in a Year</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Read through the Old and New Testaments in 365 daily portions.</div>
          <button class="plan-start-btn" style="padding: 6px 12px; background: var(--accent); color: #fff; font-weight: 600; font-size: 12px; border-radius: var(--radius-full);" onclick="window.bibleApp.navigateTo('GEN', 1)">Start Today's Reading</button>
        </div>

        <div class="plan-card" style="padding: 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-secondary);">
          <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px;">🕊️ The Gospels in 30 Days</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Journey through Matthew, Mark, Luke, and John.</div>
          <button class="plan-start-btn" style="padding: 6px 12px; background: var(--accent); color: #fff; font-weight: 600; font-size: 12px; border-radius: var(--radius-full);" onclick="window.bibleApp.navigateTo('MAT', 1)">Start Plan</button>
        </div>

        <div class="plan-card" style="padding: 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-secondary);">
          <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px;">💡 Proverbs Wisdom Month</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Read 1 chapter of Proverbs each day of the month for divine wisdom.</div>
          <button class="plan-start-btn" style="padding: 6px 12px; background: var(--accent); color: #fff; font-weight: 600; font-size: 12px; border-radius: var(--radius-full);" onclick="window.bibleApp.navigateTo('PRO', new Date().getDate())">Today's Proverb (Ch. ${new Date().getDate()})</button>
        </div>
      </div>
    `;
  }
}

window.BibleLibrary = BibleLibrary;
