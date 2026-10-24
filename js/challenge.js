/**
 * BIBLE CHALLENGE MODULE
 * "Complete the Bible Challenge" – one chapter per day, optional custom range.
 * Features preserved: progress tracking, daily reminders, hour‑retry, UI.
 */

class BibleChallenge {
  constructor(app) {
    this.app = app;
    this.STORAGE_KEY = 'bible_challenge_v1';
    this.data = this.loadData();            // persisted state
    this.readingPlan = [];                  // built after DB load
    this.notifTimer = null;
    this._modalOpen = false;

    this.buildReadingPlan();
    this.refreshDailyState();
    setTimeout(() => this.scheduleReminders(), 3000);
  }

  // ---------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------
  loadData() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  saveData() {
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data)); }
    catch (e) { console.warn('Challenge save failed:', e); }
  }

  // ---------------------------------------------------------------------
  // Reading plan – respects optional start/end book IDs
  // ---------------------------------------------------------------------
  buildReadingPlan() {
    this.readingPlan = [];
    if (typeof BIBLE_DATABASE === 'undefined') return;
    const meta = Array.isArray(BIBLE_DATABASE.metadata)
      ? BIBLE_DATABASE.metadata
      : (BIBLE_DATABASE.metadata && Array.isArray(BIBLE_DATABASE.metadata.value)
          ? BIBLE_DATABASE.metadata.value : []);

    // Determine bounds (default whole Bible)
    let startIdx = 0;
    let endIdx = meta.length - 1;
    if (this.data && this.data.startBookId) {
      const s = meta.findIndex(b => b.id === this.data.startBookId);
      if (s !== -1) startIdx = s;
    }
    if (this.data && this.data.endBookId) {
      const e = meta.findIndex(b => b.id === this.data.endBookId);
      if (e !== -1) endIdx = e;
    }
    if (startIdx > endIdx) { const t = startIdx; startIdx = endIdx; endIdx = t; }

    for (let i = startIdx; i <= endIdx; i++) {
      const book = meta[i];
      const chapCount = book.chapters ? (Array.isArray(book.chapters) ? book.chapters.length : book.chapters) : 0;
      for (let ch = 1; ch <= chapCount; ch++) {
        this.readingPlan.push({ bookId: book.id, bookName: book.name, chapter: ch });
      }
    }
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------
  isActive() { return this.data !== null; }
  todayStr() { return new Date().toISOString().slice(0,10); }
  completedCount() { return this.data ? (this.data.completedDayIndices||[]).length : 0; }
  currentDayIndex() { return this.completedCount(); }
  todayEntry() { const idx=this.currentDayIndex(); return (idx<this.readingPlan.length)?this.readingPlan[idx]:null; }
  isFinished() { return this.data && this.completedCount() >= this.readingPlan.length && this.readingPlan.length>0; }
  refreshDailyState() {
    if (!this.data) return;
    const today=this.todayStr();
    if (this.data.todayDate!==today) {
      this.data.todayDate=today; this.data.todayCompleted=false; this.data.lastReminderTime=0; this.saveData();
    }
  }

  // ---------------------------------------------------------------------
  // UI – selectors for custom range
  // ---------------------------------------------------------------------
  populateBookSelectors() {
    const meta = Array.isArray(BIBLE_DATABASE.metadata)
      ? BIBLE_DATABASE.metadata
      : (BIBLE_DATABASE.metadata && Array.isArray(BIBLE_DATABASE.metadata.value)
          ? BIBLE_DATABASE.metadata.value : []);
    const startSel=document.getElementById('ch_startBookSelect');
    const endSel=document.getElementById('ch_endBookSelect');
    if (!startSel||!endSel) return;
    const options=meta.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
    startSel.innerHTML=options; endSel.innerHTML=options;
    // default to full range
    startSel.selectedIndex=0; endSel.selectedIndex=meta.length-1;
    // pre‑select saved bounds if any
    if (this.data && this.data.startBookId) startSel.value=this.data.startBookId;
    if (this.data && this.data.endBookId) endSel.value=this.data.endBookId;
  }

  // ---------------------------------------------------------------------
  // Challenge lifecycle
  // ---------------------------------------------------------------------
  startChallenge() {
    // Called when a pre‑configured challenge already exists (e.g., after custom start)
    if (!this.data) {
      this.data = {
        startDate: this.todayStr(),
        completedDayIndices: [],
        todayDate: this.todayStr(),
        todayCompleted: false,
        lastReminderTime: 0,
        notificationsEnabled: false,
        startBookId: null,
        endBookId: null
      };
    }
    this.buildReadingPlan();
    this.saveData();
    this.scheduleReminders();
    this.renderModal();
    this.updateNavBadge();
    this.updateProgressBadge();
  }

  resetChallenge() {
    if (!confirm('Reset your Bible Challenge?\nAll progress will be lost.')) return;
    this.data = null;
    localStorage.removeItem(this.STORAGE_KEY);
    this.cancelReminder();
    this.renderModal();
    this.updateNavBadge();
    this.updateProgressBadge();
  }

  markTodayComplete() {
    if (!this.data || this.data.todayCompleted) return;
    const idx=this.currentDayIndex();
    if (!this.data.completedDayIndices.includes(idx)) this.data.completedDayIndices.push(idx);
    this.data.todayCompleted=true; this.saveData();
    this.cancelReminder();
    this.showEncouragement();
    this.renderModal();
    this.updateNavBadge();
    this.updateProgressBadge();
  }

  // ---------------------------------------------------------------------
  // Notifications (browser + in‑app overlay)
  // ---------------------------------------------------------------------
  async requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission==='granted') return true;
    if (Notification.permission==='denied') return false;
    try { const r=await Notification.requestPermission(); return r==='granted'; } catch(e){return false;}
  }

  scheduleReminders() {
    this.cancelReminder();
    if (!this.data || this.data.todayCompleted || this.isFinished()) return;
    this.notifTimer=setInterval(()=>{ this.refreshDailyState(); this.checkAndRemind(); },5*60*1000);
  }

  cancelReminder(){ if(this.notifTimer){clearInterval(this.notifTimer); this.notifTimer=null;} }

  checkAndRemind(){
    if (!this.data || this.data.todayCompleted || this.isFinished()) return;
    const now=Date.now(); const last=this.data.lastReminderTime||0; const oneHour=60*60*1000;
    if (last===0 || (now-last)>=oneHour) {
      this.data.lastReminderTime=now; this.saveData(); this.showReminderPrompt();
    }
  }

  showBrowserNotification(){
    if (!('Notification' in window) || Notification.permission!=='granted') return;
    const entry=this.todayEntry(); if(!entry) return;
    try {
      const n=new Notification('📖 Daily Bible Reminder',{
        body:`Today's chapter: ${entry.bookName} ${entry.chapter}`,
        tag:'bible-daily-reminder', requireInteraction:false});
      n.onclick=()=>{ window.focus(); n.close(); this.openChallengeModal(); };
    } catch(e){}
  }

  showReminderPrompt(){
    const entry=this.todayEntry(); if(!entry) return;
    this.showBrowserNotification();
    document.getElementById('challengeReminderOverlay')?.remove();
    const overlay=document.createElement('div');
    overlay.id='challengeReminderOverlay';
    overlay.className='challenge-reminder-overlay';
    overlay.innerHTML=`
      <div class="challenge-reminder-card">
        <div class="challenge-reminder-emoji">📖</div>
        <h3 class="challenge-reminder-title">Daily Bible Reading</h3>
        <p class="challenge-reminder-question">Have you read today's chapter?</p>
        <div class="challenge-reminder-chapter-pill">${entry.bookName} ${entry.chapter}</div>
        <div class="challenge-reminder-btns">
          <button id="reminderYesBtn" class="challenge-btn challenge-btn-success">✅ Yes, I've read it!</button>
          <button id="reminderNotYetBtn" class="challenge-btn challenge-btn-outline">⏰ Not yet</button>
        </div>
        <button id="reminderOpenBtn" class="challenge-btn-link">Open Chapter →</button>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(()=>overlay.classList.add('visible'));
    document.getElementById('reminderYesBtn').addEventListener('click',()=>{ overlay.classList.remove('visible'); setTimeout(()=>overlay.remove(),300); this.markTodayComplete(); });
    document.getElementById('reminderNotYetBtn').addEventListener('click',()=>{ overlay.classList.remove('visible'); setTimeout(()=>overlay.remove(),300); this.app?.showToast?.("We'll remind you again in 1 hour 🕐"); });
    document.getElementById('reminderOpenBtn').addEventListener('click',()=>{ overlay.classList.remove('visible'); setTimeout(()=>overlay.remove(),300); this.openTodayChapter(); });
  }

  // ---------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------
  showEncouragement(){
    const msgs=[
      "🎉 Amazing! You're building a powerful habit!",
      "🌟 Well done! God's Word is alive in you!",
      "✨ Fantastic! One chapter closer to completion!",
      "🙏 Blessed are those who read and keep these words!",
      "💪 Keep it up! Your progress is inspiring!",
      "📖 Another chapter done! You're doing great!",
      "🕊️ Wonderful! May His Word guide your path today!",
      "🔥 On fire! Keep the momentum going!"
    ];
    this.app?.showToast?.(msgs[Math.floor(Math.random()*msgs.length)]);
  }

  openTodayChapter(){ const e=this.todayEntry(); if(!e||!this.app) return; this.closeModal(); this.app.navigateTo(e.bookId,e.chapter); }

  // ---------------------------------------------------------------------
  // Nav badge (red dot) – retained from original
  // ---------------------------------------------------------------------
  updateNavBadge(){
    const badge=document.getElementById('challengeNavBadge');
    const headerBadge=document.getElementById('challengeHeaderBadge');
    const show = this.data && !this.data.todayCompleted && !this.isFinished();
    if (badge) badge.style.display = show ? 'block' : 'none';
    if (headerBadge) headerBadge.style.display = show ? 'block' : 'none';
  }

  // ---------------------------------------------------------------------
  // Persistent bottom‑right progress badge
  // ---------------------------------------------------------------------
  updateProgressBadge(){
    const badge=document.getElementById('challengeProgressBadge');
    if (!badge) return;
    if (!this.isActive()) { badge.style.display='none'; return; }
    const done=this.completedCount();
    const total=this.readingPlan.length||1;
    const pct=Math.round((done/total)*100);
    badge.innerHTML=`${done}/${total} (${pct}%)`;
    badge.style.display='block';
  }

  // ---------------------------------------------------------------------
  // Modal handling
  // ---------------------------------------------------------------------
  openChallengeModal(){ const o=document.getElementById('challengeOverlay'); if(o){ o.classList.add('open'); this._modalOpen=true; this.renderModal(); } }
  closeModal(){ const o=document.getElementById('challengeOverlay'); if(o) o.classList.remove('open'); this._modalOpen=false; }

  // ---------------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------------
  tmplWelcome(){
    return `
      <div class="ch-welcome">
        <div class="ch-hero-icon">🏆</div>
        <h2 class="ch-title">Complete the Bible Challenge</h2>
        <p class="ch-subtitle">Read the Bible – one chapter per day.</p>
        <div class="ch-book-selectors">
          <label for="ch_startBookSelect">Start Book</label>
          <select id="ch_startBookSelect" class="challenge-select"></select>
          <label for="ch_endBookSelect">End Book</label>
          <select id="ch_endBookSelect" class="challenge-select"></select>
        </div>
        <div class="ch-preview-stats">
          <div class="ch-pstat"><span class="ch-pstat-n">66</span><span class="ch-pstat-l">Books</span></div>
          <div class="ch-pstat"><span class="ch-pstat-n">1,189</span><span class="ch-pstat-l">Chapters</span></div>
          <div class="ch-pstat"><span class="ch-pstat-n">~3.3</span><span class="ch-pstat-l">Years</span></div>
        </div>
        <button id="ch_startBtn" class="challenge-btn challenge-btn-primary challenge-btn-lg">🚀 Start the Challenge</button>
        <p class="ch-note">Your progress is saved automatically.</p>
      </div>`;
  }

  tmplDashboard(){
    const entry=this.todayEntry();
    const done=this.completedCount();
    const total=this.readingPlan.length;
    const remaining=total-done;
    const dayNum=done+1;
    const pct=total>0?Math.round((done/total)*100):0;
    const todayDone=this.data?.todayCompleted;
    const notifEnabled=this.data?.notificationsEnabled;
    return `
      <div class="ch-dashboard">
        <div class="ch-day-badge">Day ${dayNum.toLocaleString()} of ${total.toLocaleString()}</div>
        <div class="ch-today-card ${todayDone?'ch-today-done':''}">
          <div class="ch-today-label">${todayDone?'✅ Completed Today':'📖 Today\'s Chapter'}</div>
          <div class="ch-today-chapter">${entry?`${entry.bookName} ${entry.chapter}`:'—'}</div>
          ${!todayDone && entry ? `
          <div class="ch-today-btns">
            <button id="ch_readNowBtn" class="challenge-btn challenge-btn-primary">📖 Read Now</button>
            <button id="ch_markDoneBtn" class="challenge-btn challenge-btn-success">✅ Mark as Complete</button>
          </div>` : ''}
          ${todayDone?`<p class="ch-done-msg">Great job! Come back tomorrow for the next chapter 🙏</p>`:''}
        </div>
        <div class="ch-progress-wrap">
          <div class="ch-progress-header"><span>${done.toLocaleString()} completed</span><span class="ch-pct">${pct}%</span></div>
          <div class="ch-progress-track"><div class="ch-progress-fill" style="width:${pct}%"></div></div>
          <div class="ch-progress-footer">${remaining.toLocaleString()} remaining</div>
        </div>
        <div class="ch-stats-row">
          <div class="ch-stat-box"><span class="ch-stat-n">${done}</span><span class="ch-stat-l">Done</span></div>
          <div class="ch-stat-box"><span class="ch-stat-n">${remaining}</span><span class="ch-stat-l">Remaining</span></div>
          <div class="ch-stat-box"><span class="ch-stat-n">${pct}%</span><span class="ch-stat-l">Complete</span></div>
        </div>
        ${this.tmplRecentHistory()}
        <div class="ch-footer-actions">
          ${!notifEnabled?`<button id="ch_enableNotifsBtn" class="challenge-btn challenge-btn-outline">🔔 Enable Daily Reminders</button>`:`<span class="ch-notif-on">🔔 Daily reminders are on</span>`}
          <button id="ch_resetBtn" class="challenge-btn challenge-btn-danger">🔄 Reset Progress</button>
        </div>
      </div>`;
  }

  tmplRecentHistory(){
    const indices=this.data?.completedDayIndices||[];
    if (!indices.length) return '';
    const recent=indices.slice(-5).reverse();
    const rows=recent.map(i=>{ const e=this.readingPlan[i]; return e?`<div class="ch-hist-row">✅ ${e.bookName} ${e.chapter}</div>`:''; }).join('');
    return `<div class="ch-history"><div class="ch-history-label">Recent Readings</div>${rows}</div>`;
  }

  tmplCompletion(){
    return `
      <div class="ch-completion">
        <div class="ch-hero-icon">🎉</div>
        <h2 class="ch-title">You Did It!</h2>
        <p class="ch-subtitle">All 1,189 chapters read. Remarkable!</p>
        <blockquote class="ch-verse-quote">"Blessed is the one who reads aloud the words of this prophecy…"<br><cite>— Revelation 1:3</cite></blockquote>
        <button id="ch_resetBtn" class="challenge-btn challenge-btn-primary challenge-btn-lg">🔄 Start Again</button>
      </div>`;
  }

  // ---------------------------------------------------------------------
  // Render & bind events
  // ---------------------------------------------------------------------
  renderModal(){
    const container=document.getElementById('challengeModalContent');
    if (!container) return;
    if (!this.isActive()) { container.innerHTML=this.tmplWelcome(); this.populateBookSelectors(); }
    else if (this.isFinished()) { container.innerHTML=this.tmplCompletion(); }
    else { container.innerHTML=this.tmplDashboard(); }
    this.bindModalEvents();
  }

  bindModalEvents(){
    // Welcome – start with custom range
    document.getElementById('ch_startBtn')?.addEventListener('click',()=>{
      const startId=document.getElementById('ch_startBookSelect')?.value;
      const endId=document.getElementById('ch_endBookSelect')?.value;
      this.data={
        startDate:this.todayStr(),
        completedDayIndices:[],
        todayDate:this.todayStr(),
        todayCompleted:false,
        lastReminderTime:0,
        notificationsEnabled:false,
        startBookId:startId,
        endBookId:endId
      };
      this.buildReadingPlan();
      this.saveData();
      this.scheduleReminders();
      this.renderModal();
      this.updateNavBadge();
      this.updateProgressBadge();
    });
    // Dashboard actions
    document.getElementById('ch_readNowBtn')?.addEventListener('click',()=>this.openTodayChapter());
    document.getElementById('ch_markDoneBtn')?.addEventListener('click',()=>this.markTodayComplete());
    document.getElementById('ch_resetBtn')?.addEventListener('click',()=>this.resetChallenge());
    document.getElementById('ch_enableNotifsBtn')?.addEventListener('click',async()=>{
      const granted=await this.requestNotificationPermission();
      if (this.data){ this.data.notificationsEnabled=granted; this.saveData(); }
      this.app?.showToast?.(granted?'🔔 Reminders enabled!':'❌ Permission denied');
      this.renderModal();
    });
  }
}
