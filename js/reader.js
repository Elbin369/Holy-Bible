/**
 * BIBLE READER MODULE
 * Manages scripture rendering, verse selection, highlighting, and annotations.
 */

class BibleReader {
  constructor(app) {
    this.app = app;
    this.selectedVerses = new Set();
    this.initEvents();
  }

  initEvents() {
    // Floating action bar events
    const actionBar = document.getElementById('verseActionBar');
    if (!actionBar) return;

    // Palette color clicks
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        const color = e.target.dataset.color;
        this.highlightSelectedVerses(color);
      });
    });

    // Bookmark button
    document.getElementById('actionBookmarkBtn')?.addEventListener('click', () => {
      this.bookmarkSelectedVerses();
    });

    // Note button
    document.getElementById('actionNoteBtn')?.addEventListener('click', () => {
      this.openNoteModalForSelection();
    });

    // Copy button
    document.getElementById('actionCopyBtn')?.addEventListener('click', () => {
      this.copySelectedVerses();
    });

    // Share / Verse Card button
    document.getElementById('actionShareBtn')?.addEventListener('click', () => {
      this.openVerseCardModal();
    });

    // Clear selection button
    document.getElementById('actionClearBtn')?.addEventListener('click', () => {
      this.clearSelection();
    });

    // Touch Swipe Gestures for Mobile Chapter Navigation
    this.initSwipeGestures();
  }

  initSwipeGestures() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const readerContainer = document.querySelector('.reader-container');
    if (!readerContainer) return;

    readerContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    readerContainer.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        touchEndX = e.changedTouches[0].clientX;
        touchEndY = e.changedTouches[0].clientY;
        this.handleSwipeGesture(touchStartX, touchStartY, touchEndX, touchEndY);
      }
    }, { passive: true });
  }

  handleSwipeGesture(startX, startY, endX, endY) {
    const diffX = endX - startX;
    const diffY = endY - startY;

    // Minimum swipe distance of 75px and mostly horizontal (X distance > 2 * Y distance)
    if (Math.abs(diffX) > 75 && Math.abs(diffX) > Math.abs(diffY) * 2) {
      if (diffX < 0) {
        // Swipe Left -> Next Chapter
        this.app.nextChapter();
      } else {
        // Swipe Right -> Previous Chapter
        this.app.prevChapter();
      }
    }
  }

  renderChapter(bookId, chapterNum) {
    const book = this.app.getBook(bookId);
    if (!book) {
      console.error(`Book not found: ${bookId}`);
      return;
    }

    const chapterObj = book.chapters.find(c => parseInt(c.chapter) === parseInt(chapterNum));
    if (!chapterObj) {
      console.error(`Chapter ${chapterNum} not found in ${book.name}`);
      return;
    }

    // Clear any active verse selection
    this.clearSelection();

    // Set chapter title & header
    const titleEl = document.getElementById('chapterTitle');
    const subtitleEl = document.getElementById('chapterSubtitle');
    const metaTagEl = document.getElementById('chapterMetaTag');

    if (titleEl) titleEl.textContent = `${book.name} ${chapterNum}`;
    if (subtitleEl) subtitleEl.textContent = `King James Version (KJV) • ${chapterObj.verses.length} Verses`;
    if (metaTagEl) metaTagEl.textContent = `${book.testament === 'OT' ? 'Old Testament' : 'New Testament'} • ${book.genre}`;

    // Render scripture verses
    const scriptureBody = document.getElementById('scriptureBody');
    if (!scriptureBody) return;

    scriptureBody.innerHTML = '';

    const highlights = this.app.library.getHighlightsForChapter(book.id, chapterNum);
    const bookmarks = this.app.library.getBookmarksForChapter(book.id, chapterNum);
    const notes = this.app.library.getNotesForChapter(book.id, chapterNum);

    chapterObj.verses.forEach(v => {
      const vNum = parseInt(v.verse);
      const span = document.createElement('span');
      span.className = 'verse-block';
      span.id = `verse-${bookId}-${chapterNum}-${vNum}`;
      span.dataset.bookId = bookId;
      span.dataset.bookName = book.name;
      span.dataset.chapter = chapterNum;
      span.dataset.verse = vNum;
      span.dataset.text = v.text;

      // Apply saved highlight color if exists
      const hl = highlights.find(h => h.verse === vNum);
      if (hl) {
        span.classList.add(`highlight-${hl.color}`);
      }

      // Check if bookmarked
      const isBookmarked = bookmarks.some(b => b.verse === vNum);
      if (isBookmarked) {
        span.classList.add('is-bookmarked');
      }

      // Check if note exists
      const hasNote = notes.some(n => n.verse === vNum);

      span.innerHTML = `
        <span class="verse-num">${vNum}</span>
        <span class="verse-text">${this.escapeHtml(v.text)}</span>
        ${hasNote ? '<span class="note-indicator" title="Has personal note">📝</span>' : ''}
      `;

      // Click to select/deselect
      span.addEventListener('click', (e) => {
        // Prevent clicking if selecting text manually
        if (window.getSelection().toString().length > 0) return;
        this.toggleVerseSelection(span, bookId, chapterNum, vNum, v.text);
      });

      scriptureBody.appendChild(span);
      scriptureBody.appendChild(document.createTextNode(' '));
    });

    // Update document title
    document.title = `${book.name} ${chapterNum} | Holy Bible`;

    // Scroll to top of reader
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleVerseSelection(element, bookId, chapterNum, verseNum, text) {
    const key = `${bookId}:${chapterNum}:${verseNum}`;
    if (this.selectedVerses.has(key)) {
      this.selectedVerses.delete(key);
      element.classList.remove('selected');
    } else {
      this.selectedVerses.add(key);
      element.classList.add('selected');
    }

    this.updateActionBar();
  }

  updateActionBar() {
    const bar = document.getElementById('verseActionBar');
    const countBadge = document.getElementById('selectedCount');
    if (!bar) return;

    if (this.selectedVerses.size > 0) {
      bar.classList.add('visible');
      if (countBadge) countBadge.textContent = `${this.selectedVerses.size} selected`;
    } else {
      bar.classList.remove('visible');
    }
  }

  clearSelection() {
    this.selectedVerses.clear();
    document.querySelectorAll('.verse-block.selected').forEach(el => el.classList.remove('selected'));
    this.updateActionBar();
  }

  getSelectedVerseElements() {
    const list = [];
    this.selectedVerses.forEach(key => {
      const [bookId, chapter, verse] = key.split(':');
      const el = document.getElementById(`verse-${bookId}-${chapter}-${verse}`);
      if (el) list.push(el);
    });
    // Sort by verse number
    return list.sort((a, b) => parseInt(a.dataset.verse) - parseInt(b.dataset.verse));
  }

  highlightSelectedVerses(color) {
    const elements = this.getSelectedVerseElements();
    if (elements.length === 0) return;

    elements.forEach(el => {
      // Remove any previous highlight classes
      ['gold', 'mint', 'sky', 'rose', 'lavender'].forEach(c => el.classList.remove(`highlight-${c}`));

      if (color !== 'clear') {
        el.classList.add(`highlight-${color}`);
        this.app.library.saveHighlight({
          bookId: el.dataset.bookId,
          bookName: el.dataset.bookName,
          chapter: parseInt(el.dataset.chapter),
          verse: parseInt(el.dataset.verse),
          color: color,
          text: el.dataset.text,
          timestamp: Date.now()
        });
      } else {
        this.app.library.removeHighlight(el.dataset.bookId, parseInt(el.dataset.chapter), parseInt(el.dataset.verse));
      }
    });

    this.app.showToast(color === 'clear' ? 'Highlight removed' : `Highlighted ${elements.length} verse(s)`);
    this.clearSelection();
  }

  bookmarkSelectedVerses() {
    const elements = this.getSelectedVerseElements();
    if (elements.length === 0) return;

    elements.forEach(el => {
      this.app.library.toggleBookmark({
        bookId: el.dataset.bookId,
        bookName: el.dataset.bookName,
        chapter: parseInt(el.dataset.chapter),
        verse: parseInt(el.dataset.verse),
        text: el.dataset.text,
        timestamp: Date.now()
      });
    });

    this.app.showToast(`Updated bookmarks for ${elements.length} verse(s)`);
    this.clearSelection();
  }

  copySelectedVerses() {
    const elements = this.getSelectedVerseElements();
    if (elements.length === 0) return;

    const first = elements[0];
    const last = elements[elements.length - 1];
    const bookName = first.dataset.bookName;
    const chapter = first.dataset.chapter;

    let citation = '';
    if (elements.length === 1) {
      citation = `${bookName} ${chapter}:${first.dataset.verse}`;
    } else {
      citation = `${bookName} ${chapter}:${first.dataset.verse}-${last.dataset.verse}`;
    }

    const text = elements.map(el => `[${el.dataset.verse}] ${el.dataset.text}`).join(' ');
    const fullSnippet = `"${text}"\n— ${citation} (KJV)`;

    navigator.clipboard.writeText(fullSnippet).then(() => {
      this.app.showToast('Copied to clipboard!');
      this.clearSelection();
    }).catch(() => {
      this.app.showToast('Failed to copy');
    });
  }

  openNoteModalForSelection() {
    const elements = this.getSelectedVerseElements();
    if (elements.length === 0) return;

    const first = elements[0];
    const key = `${first.dataset.bookId}:${first.dataset.chapter}:${first.dataset.verse}`;
    const existingNote = this.app.library.getNote(first.dataset.bookId, parseInt(first.dataset.chapter), parseInt(first.dataset.verse));

    const noteModal = document.getElementById('noteModal');
    const noteRefTitle = document.getElementById('noteRefTitle');
    const noteTextarea = document.getElementById('noteTextarea');

    if (noteRefTitle) {
      noteRefTitle.textContent = `Note on ${first.dataset.bookName} ${first.dataset.chapter}:${first.dataset.verse}`;
    }
    if (noteTextarea) {
      noteTextarea.value = existingNote ? existingNote.content : '';
      noteTextarea.dataset.bookId = first.dataset.bookId;
      noteTextarea.dataset.chapter = first.dataset.chapter;
      noteTextarea.dataset.verse = first.dataset.verse;
      noteTextarea.dataset.bookName = first.dataset.bookName;
    }

    noteModal?.classList.add('open');
  }

  openVerseCardModal() {
    const elements = this.getSelectedVerseElements();
    if (elements.length === 0) return;
    this.app.verseCard.generateCardForElements(elements);
    this.clearSelection();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

window.BibleReader = BibleReader;
