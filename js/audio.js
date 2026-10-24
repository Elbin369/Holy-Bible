/**
 * BIBLE AUDIO NARRATION ENGINE
 * Browser SpeechSynthesis-powered narrator with verse-level synchronized highlighting and speed controls.
 */

class BibleAudio {
  constructor(app) {
    this.app = app;
    this.synth = window.speechSynthesis;
    this.isPlaying = false;
    this.isPaused = false;
    this.currentVerseIndex = 0;
    this.chapterVerses = [];
    this.playbackRate = 1.0;
    this.selectedVoice = null;

    this.initVoices();
    this.initControls();
  }

  initVoices() {
    if (!this.synth) return;
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      // Prefer clear natural English voices
      this.selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Daniel') || v.name.includes('Samantha') || v.name.includes('Guy'))) 
        || voices.find(v => v.lang.startsWith('en')) 
        || voices[0];
    };

    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  initControls() {
    const playBtn = document.getElementById('audioPlayBtn');
    const closeBtn = document.getElementById('audioCloseBtn');
    const speedSelect = document.getElementById('audioSpeedSelect');

    playBtn?.addEventListener('click', () => {
      if (this.isPlaying && !this.isPaused) {
        this.pause();
      } else if (this.isPaused) {
        this.resume();
      } else {
        this.playCurrentChapter();
      }
    });

    closeBtn?.addEventListener('click', () => {
      this.stop();
      document.getElementById('audioPlayerBar')?.classList.add('hidden');
    });

    speedSelect?.addEventListener('change', (e) => {
      this.playbackRate = parseFloat(e.target.value);
      if (this.isPlaying && !this.isPaused) {
        // Restart current verse with new rate
        this.synth.cancel();
        this.speakVerse(this.currentVerseIndex);
      }
    });
  }

  toggleBar() {
    const bar = document.getElementById('audioPlayerBar');
    if (!bar) return;
    if (bar.classList.contains('hidden')) {
      bar.classList.remove('hidden');
      this.playCurrentChapter();
    } else {
      this.stop();
      bar.classList.add('hidden');
    }
  }

  playCurrentChapter() {
    if (!this.synth) {
      this.app.showToast('Speech audio is not supported in this browser.');
      return;
    }

    const book = this.app.getCurrentBook();
    const chapterObj = book?.chapters.find(c => parseInt(c.chapter) === parseInt(this.app.currentChapter));
    if (!chapterObj) return;

    this.stop();
    this.chapterVerses = chapterObj.verses;
    this.currentVerseIndex = 0;
    this.isPlaying = true;
    this.isPaused = false;
    this.updatePlayButtonUI(true);

    const statusEl = document.getElementById('audioStatusLabel');
    if (statusEl) statusEl.textContent = `Reading ${book.name} ${this.app.currentChapter}...`;

    this.speakVerse(this.currentVerseIndex);
  }

  speakVerse(index) {
    if (!this.isPlaying || index >= this.chapterVerses.length) {
      this.stop();
      const statusEl = document.getElementById('audioStatusLabel');
      if (statusEl) statusEl.textContent = 'Chapter finished';
      return;
    }

    this.currentVerseIndex = index;
    const verseObj = this.chapterVerses[index];
    const vNum = parseInt(verseObj.verse);

    // Highlight the active verse in the reader view
    document.querySelectorAll('.verse-block.speaking').forEach(el => el.classList.remove('speaking'));
    const activeEl = document.getElementById(`verse-${this.app.currentBookId}-${this.app.currentChapter}-${vNum}`);
    if (activeEl) {
      activeEl.classList.add('speaking');
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const utterance = new SpeechSynthesisUtterance(verseObj.text);
    if (this.selectedVoice) utterance.voice = this.selectedVoice;
    utterance.rate = this.playbackRate;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      if (this.isPlaying && !this.isPaused) {
        this.speakVerse(index + 1);
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech error:', e);
      if (this.isPlaying && !this.isPaused) {
        this.speakVerse(index + 1);
      }
    };

    this.synth.speak(utterance);
  }

  pause() {
    if (!this.isPlaying) return;
    this.synth.pause();
    this.isPaused = true;
    this.updatePlayButtonUI(false);
    const statusEl = document.getElementById('audioStatusLabel');
    if (statusEl) statusEl.textContent = 'Paused';
  }

  resume() {
    if (!this.isPaused) return;
    this.synth.resume();
    this.isPaused = false;
    this.updatePlayButtonUI(true);
    const statusEl = document.getElementById('audioStatusLabel');
    if (statusEl) statusEl.textContent = `Reading ${this.app.getCurrentBook()?.name} ${this.app.currentChapter}...`;
  }

  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    if (this.synth) this.synth.cancel();
    document.querySelectorAll('.verse-block.speaking').forEach(el => el.classList.remove('speaking'));
    this.updatePlayButtonUI(false);
    const statusEl = document.getElementById('audioStatusLabel');
    if (statusEl) statusEl.textContent = 'Ready to listen';
  }

  updatePlayButtonUI(playing) {
    const btn = document.getElementById('audioPlayBtn');
    if (!btn) return;
    btn.innerHTML = playing 
      ? '<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
      : '<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  }
}

window.BibleAudio = BibleAudio;
