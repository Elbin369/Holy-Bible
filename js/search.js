/**
 * BIBLE SEARCH ENGINE
 * Supports:
 * 1. Scripture Reference Parsing (e.g. "John 3:16", "Gen 1:1", "Psalm 23")
 * 2. Instant Full-Text Keyword Search across all 31,102 verses
 * 3. Testament Filtering (All, Old Testament, New Testament)
 */

class BibleSearch {
  constructor(app) {
    this.app = app;
    this.index = null;
    this.isLoadingIndex = false;
    this.initEvents();
  }

  initEvents() {
    const searchModal = document.getElementById('searchModal');
    const searchInput = document.getElementById('bibleSearchInput');
    const openSearchBtn = document.getElementById('openSearchBtn');
    const closeSearchBtn = document.getElementById('closeSearchBtn');
    const filterTabs = document.querySelectorAll('.search-filter-tab');

    openSearchBtn?.addEventListener('click', () => {
      searchModal?.classList.add('open');
      searchInput?.focus();
      this.ensureSearchIndexLoaded();
    });

    closeSearchBtn?.addEventListener('click', () => {
      searchModal?.classList.remove('open');
    });

    // Keyboard shortcut '/' or 'Ctrl+K'
    window.addEventListener('keydown', (e) => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        searchModal?.classList.add('open');
        searchInput?.focus();
        this.ensureSearchIndexLoaded();
      } else if (e.key === 'Escape' && searchModal?.classList.contains('open')) {
        searchModal.classList.remove('open');
      }
    });

    let debounceTimer;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim();
      debounceTimer = setTimeout(() => {
        this.performSearch(query);
      }, 250);
    });

    filterTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        filterTabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.performSearch(searchInput?.value.trim() || '');
      });
    });
  }

  ensureSearchIndexLoaded() {
    if (this.index || this.isLoadingIndex) return;
    this.isLoadingIndex = true;

    // Build index directly from loaded in-memory database
    const books = this.app.getAllBooks();
    const items = [];

    books.forEach(b => {
      b.chapters.forEach(c => {
        const cNum = parseInt(c.chapter);
        c.verses.forEach(v => {
          items.push({
            bid: b.id,
            b: b.name,
            t: b.testament,
            c: cNum,
            v: parseInt(v.verse),
            txt: v.text
          });
        });
      });
    });

    this.index = items;
    this.isLoadingIndex = false;
    console.log(`Search index ready with ${this.index.length} verses.`);
  }

  parseReference(query) {
    // Matches patterns like "John 3:16", "1 John 1:9", "Gen 1", "Psalm 23:1"
    const refRegex = /^((?:[1-3]\s+)?[a-zA-Z\s]+?)\s*(\d+)(?::(\d+))?$/i;
    const match = query.match(refRegex);
    if (!match) return null;

    const bookPart = match[1].trim().toLowerCase();
    const chapter = parseInt(match[2]);
    const verse = match[3] ? parseInt(match[3]) : null;

    // Match with books metadata
    const metadata = this.app.metadata;
    const matchedBook = metadata.find(b => 
      b.name.toLowerCase() === bookPart || 
      b.id.toLowerCase() === bookPart ||
      b.name.toLowerCase().startsWith(bookPart)
    );

    if (matchedBook && chapter >= 1 && chapter <= matchedBook.chaptersCount) {
      return {
        bookId: matchedBook.id,
        bookName: matchedBook.name,
        chapter: chapter,
        verse: verse
      };
    }
    return null;
  }

  performSearch(query) {
    const resultsContainer = document.getElementById('searchResultsList');
    const resultsCountEl = document.getElementById('searchResultsCount');
    if (!resultsContainer) return;

    if (!query || query.length < 2) {
      resultsContainer.innerHTML = '<div class="empty-state">Type a book, reference (e.g. <em>John 3:16</em>), or phrase to search...</div>';
      if (resultsCountEl) resultsCountEl.textContent = '';
      return;
    }

    // 1. Check if query is a direct Scripture Reference Jump
    const ref = this.parseReference(query);
    if (ref) {
      resultsContainer.innerHTML = `
        <div class="search-jump-card" style="padding: 16px; background: var(--accent-light); border: 1px solid var(--accent); border-radius: var(--radius-md); margin-bottom: 16px; cursor: pointer;">
          <div style="font-weight: 700; color: var(--accent); font-size: 16px;">
            📖 Jump directly to ${ref.bookName} ${ref.chapter}${ref.verse ? ':' + ref.verse : ''}
          </div>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
            Click here to open this chapter immediately
          </div>
        </div>
      `;

      resultsContainer.querySelector('.search-jump-card')?.addEventListener('click', () => {
        this.app.navigateTo(ref.bookId, ref.chapter, ref.verse);
        document.getElementById('searchModal')?.classList.remove('open');
      });
    } else {
      resultsContainer.innerHTML = '';
    }

    // 2. Full-Text Search
    this.ensureSearchIndexLoaded();
    if (!this.index) return;

    const activeFilter = document.querySelector('.search-filter-tab.active')?.dataset.filter || 'all';
    const lowerQuery = query.toLowerCase();
    const terms = lowerQuery.split(/\s+/).filter(Boolean);

    const matches = [];
    for (let i = 0; i < this.index.length; i++) {
      const item = this.index[i];
      if (activeFilter !== 'all' && item.t !== activeFilter) continue;

      const lowerText = item.txt.toLowerCase();
      // Match all terms
      const allMatched = terms.every(term => lowerText.includes(term));
      if (allMatched) {
        matches.push(item);
        if (matches.length >= 100) break; // limit to 100 fast results
      }
    }

    if (resultsCountEl) {
      resultsCountEl.textContent = `${matches.length}${matches.length === 100 ? '+' : ''} verses found`;
    }

    if (matches.length === 0 && !ref) {
      resultsContainer.innerHTML += '<div class="empty-state">No matching verses found. Try another search phrase.</div>';
      return;
    }

    // Render result cards
    matches.forEach(item => {
      const card = document.createElement('div');
      card.className = 'search-result-item';

      // Highlight matching terms in text
      let highlighted = this.escapeHtml(item.txt);
      terms.forEach(term => {
        const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
        highlighted = highlighted.replace(regex, '<mark>$1</mark>');
      });

      card.innerHTML = `
        <div class="search-ref-header">${item.b} ${item.c}:${item.v}</div>
        <div class="search-verse-text">${highlighted}</div>
      `;

      card.addEventListener('click', () => {
        this.app.navigateTo(item.bid, item.c, item.v);
        document.getElementById('searchModal')?.classList.remove('open');
      });

      resultsContainer.appendChild(card);
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

window.BibleSearch = BibleSearch;
