/**
 * VERSE CARD GENERATOR & VERSE OF THE DAY
 * Creates beautiful shareable cards and manages daily inspirational scripture.
 */

class VerseCardGenerator {
  constructor(app) {
    this.app = app;
    this.gradients = [
      'linear-gradient(135deg, #1e3a8a, #3b82f6)',
      'linear-gradient(135deg, #4c1d95, #8b5cf6)',
      'linear-gradient(135deg, #831843, #ec4899)',
      'linear-gradient(135deg, #064e3b, #10b981)',
      'linear-gradient(135deg, #78350f, #f59e0b)',
      'linear-gradient(135deg, #0f172a, #334155)'
    ];
    this.currentGradient = this.gradients[0];
    this.initEvents();
  }

  initEvents() {
    document.getElementById('closeCardModalBtn')?.addEventListener('click', () => {
      document.getElementById('verseCardModal')?.classList.remove('open');
    });

    document.querySelectorAll('.card-bg-swatch').forEach(swatch => {
      swatch.addEventListener('click', (e) => {
        const bg = e.target.dataset.bg;
        this.currentGradient = bg;
        const preview = document.getElementById('verseCardPreview');
        if (preview) preview.style.background = bg;
      });
    });

    document.getElementById('copyCardTextBtn')?.addEventListener('click', () => {
      const text = document.getElementById('cardVerseText')?.textContent;
      const ref = document.getElementById('cardVerseRef')?.textContent;
      navigator.clipboard.writeText(`"${text}" — ${ref}`).then(() => {
        this.app.showToast('Verse text copied!');
      });
    });
  }

  generateCardForElements(elements) {
    if (elements.length === 0) return;
    const first = elements[0];
    const last = elements[elements.length - 1];

    let refText = '';
    if (elements.length === 1) {
      refText = `${first.dataset.bookName} ${first.dataset.chapter}:${first.dataset.verse}`;
    } else {
      refText = `${first.dataset.bookName} ${first.dataset.chapter}:${first.dataset.verse}-${last.dataset.verse}`;
    }

    const verseText = elements.map(el => el.dataset.text).join(' ');

    const modal = document.getElementById('verseCardModal');
    const textEl = document.getElementById('cardVerseText');
    const refEl = document.getElementById('cardVerseRef');
    const preview = document.getElementById('verseCardPreview');

    if (textEl) textEl.textContent = verseText;
    if (refEl) refEl.textContent = `${refText} (KJV)`;
    if (preview) preview.style.background = this.currentGradient;

    modal?.classList.add('open');
  }

  getVerseOfTheDay() {
    const curations = [
      { b: "PHP", name: "Philippians", c: 4, v: 13, text: "I can do all things through Christ which strengtheneth me." },
      { b: "JER", name: "Jeremiah", c: 29, v: 11, text: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end." },
      { b: "PRO", name: "Proverbs", c: 3, v: 5, text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding." },
      { b: "PSA", name: "Psalms", c: 23, v: 1, text: "The LORD is my shepherd; I shall not want." },
      { b: "ROM", name: "Romans", c: 8, v: 28, text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose." },
      { b: "ISA", name: "Isaiah", c: 40, v: 31, text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint." },
      { b: "JHN", name: "John", c: 3, v: 16, text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." }
    ];

    // Pick based on day of year
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    return curations[dayOfYear % curations.length];
  }
}

window.VerseCardGenerator = VerseCardGenerator;
