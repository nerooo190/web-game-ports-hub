(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  const isCapacitor = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const isElectron = !!window.native;
  const isTizen = /Tizen/i.test(navigator.userAgent) || !!window.tizen;
  function exitApp() {
    try { if (isTizen) window.tizen.application.getCurrentApplication().exit(); else if (isElectron) window.close(); } catch {}
  }

  let games = [];
  let filter = 'all';
  let favs = new Set(store.get('favs', []));
  let recent = store.get('recent', []);

  const grid = $('#grid'), q = $('#q');

  // ---------- platform bridge ----------
  function openExternal(url) {
    if (isTizen && window.tizen?.application && window.tizen.ApplicationControl) {
      // Hands the URL to the TV's built-in browser (works with Bluetooth controllers, ignores frame restrictions).
      try {
        window.tizen.application.launchAppControl(
          new window.tizen.ApplicationControl('http://tizen.org/appcontrol/operation/view', url), null,
          () => {}, (err) => console.warn('launchAppControl', err));
        return;
      } catch (err) { console.warn(err); }
    }
    if (isElectron) return window.native.openExternal(url);
    if (isCapacitor && window.Capacitor.Plugins?.Browser) return window.Capacitor.Plugins.Browser.open({ url });
    window.open(url, '_blank', 'noopener');
  }

  // ---------- player ----------
  const player = $('#player'), frame = $('#frame');
  function play(g) {
    recent = [g.id, ...recent.filter((x) => x !== g.id)].slice(0, 30);
    store.set('recent', recent);
    // Android WebView / Tizen honour X-Frame-Options, so hand off to the in-app / TV browser there.
    if (isCapacitor || isTizen) return openExternal(g.play);
    $('#pTitle').textContent = g.name;
    $('#pOpen').href = g.play;
    frame.src = g.play;
    player.hidden = false;
    $('#pBack').focus();
  }
  function closePlayer() {
    if (player.hidden) return false;
    frame.src = 'about:blank';
    player.hidden = true;
    (document.querySelector('.card:focus, .card') || q).focus?.();
    return true;
  }
  $('#pBack').onclick = closePlayer;
  $('#pOpen').onclick = (e) => { if (isTizen) { e.preventDefault(); openExternal($('#pOpen').href); } };
  $('#pFs').onclick = () => (frame.requestFullscreen ? frame.requestFullscreen() : null);

  // ---------- list ----------
  function visible() {
    const term = q.value.trim().toLowerCase();
    let list = games;
    if (filter === 'play') list = list.filter((g) => g.play);
    else if (filter === 'source') list = list.filter((g) => g.source);
    else if (filter === 'both') list = list.filter((g) => g.play && g.source);
    else if (filter === 'fav') list = list.filter((g) => favs.has(g.id));
    else if (filter === 'recent') list = recent.map((id) => games.find((g) => g.id === id)).filter(Boolean);
    if (term) list = list.filter((g) => g.name.toLowerCase().includes(term) || (g.playHost || '').includes(term));
    return list;
  }

  function render() {
    const list = visible();
    $('#empty').hidden = list.length > 0;
    $('#count').textContent = `${list.length} / ${games.length}`;
    const frag = document.createDocumentFragment();
    let lastLetter = null;
    for (const g of list) {
      const card = document.createElement('div');
      card.className = 'card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.dataset.id = g.id;
      if (filter !== 'recent' && g.letter !== lastLetter) { card.dataset.letter = g.letter; lastLetter = g.letter; }

      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = g.name;

      const fav = document.createElement('button');
      fav.className = 'fav' + (favs.has(g.id) ? ' on' : '');
      fav.textContent = favs.has(g.id) ? '♥' : '♡';
      fav.tabIndex = -1;
      fav.setAttribute('aria-label', 'Toggle favorite');
      fav.onclick = (e) => { e.stopPropagation(); toggleFav(g.id, fav); };

      const meta = document.createElement('div');
      meta.className = 'meta';
      if (g.play) meta.append(tag('▶ ' + g.playHost, 'play'));
      if (g.source) meta.append(tag('📦 ' + g.sourceHost, 'src'));

      card.append(thumbEl(g), name, fav, meta);
      card.onclick = () => (g.play ? play(g) : openExternal(g.source));
      card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey) toggleFav(g.id, fav); };
      frag.append(card);
    }
    grid.replaceChildren(frag);
  }
  // Remote image if known, else (or if it fails to load) a colored placeholder with initials.
  function thumbEl(g) {
    const box = document.createElement('div');
    box.className = 'thumb';
    let h = 0;
    for (const ch of g.name) h = (h * 31 + ch.codePointAt(0)) % 360;
    box.style.setProperty('--h', h);
    const words = g.name.replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean);
    box.dataset.ini = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '?').slice(0, 2)).toUpperCase();
    if (g.thumb) {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.alt = '';
      img.onerror = () => img.remove();
      img.src = g.thumb;
      box.append(img);
    }
    return box;
  }
  const tag = (t, c) => Object.assign(document.createElement('span'), { className: 'tag ' + c, textContent: t });

  function toggleFav(id, btn) {
    favs.has(id) ? favs.delete(id) : favs.add(id);
    store.set('favs', [...favs]);
    if (filter === 'fav') return render();
    btn.classList.toggle('on', favs.has(id));
    btn.textContent = favs.has(id) ? '♥' : '♡';
  }

  // ---------- controls ----------
  let t;
  q.oninput = () => { clearTimeout(t); t = setTimeout(render, 120); };
  $('#filters').onclick = (e) => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    filter = b.dataset.f;
    document.querySelectorAll('#filters .chip').forEach((c) => c.classList.toggle('on', c === b));
    render();
  };
  const az = $('#az');
  for (const l of ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']) {
    const b = Object.assign(document.createElement('button'), { textContent: l });
    b.onclick = () => {
      q.value = ''; filter = 'all';
      document.querySelectorAll('#filters .chip').forEach((c) => c.classList.toggle('on', c.dataset.f === 'all'));
      render();
      const first = [...grid.children].find((c) => c.dataset.letter === l);
      if (first) { first.scrollIntoView({ block: 'center' }); first.focus({ preventScroll: true }); }
    };
    az.append(b);
  }

  // ---------- keyboard / D-pad (desktop, Android TV, Tizen) ----------
  const BACK_KEYS = new Set(['Escape', 'BrowserBack', 'GoBack']);
  const DIRS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  document.addEventListener('keydown', (e) => {
    if (BACK_KEYS.has(e.key) || e.keyCode === 10009 /* Tizen back */) {
      if (closePlayer()) { e.preventDefault(); return; }
      if (isTizen && e.keyCode === 10009) exitApp(); // remote Back on the home screen leaves the app
      return;
    }
    if (!player.hidden) return;
    const dir = DIRS[e.key];
    if (!dir) return;
    if (document.activeElement === q && dir[1] === 0) return; // let caret move in the search box
    if (moveFocus(dir)) e.preventDefault();
  });

  // Spatial navigation: focus the nearest focusable element in the given direction.
  function moveFocus(dir) {
    const a = document.activeElement;
    const items = [...document.querySelectorAll('#q, .chip, .az button, .card')].filter((el) => el.offsetParent !== null);
    const from = a && items.includes(a) ? a.getBoundingClientRect() : null;
    if (!from) { items[0]?.focus(); return true; }
    const cx = from.left + from.width / 2, cy = from.top + from.height / 2;
    let best = null, bestScore = Infinity;
    for (const el of items) {
      if (el === a) continue;
      const r = el.getBoundingClientRect();
      const dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
      const along = dx * dir[0] + dy * dir[1];
      if (along <= 4) continue;
      const across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]);
      const score = along + across * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); return true; }
    return false;
  }

  function jumpLetter(step) {
    const marks = [...grid.querySelectorAll('[data-letter]')];
    if (!marks.length) return;
    const a = document.activeElement;
    let i = -1;
    if (a && grid.contains(a)) marks.forEach((m, k) => { if (m === a || m.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING) i = k; });
    const t = marks[Math.min(marks.length - 1, Math.max(0, i + step))];
    t.focus({ preventScroll: true });
    t.scrollIntoView({ block: 'center' });
  }

  // ---------- gamepad (Xbox/PS/Switch pad: standard mapping) ----------
  // A open · B back · X favorite · Y open in system/TV browser · LB/RB previous/next letter · D-pad/left stick move
  // While a game is open the pad belongs to the game; hold Select/Back/Share for ~0.7 s to leave it.
  const prev = new Set();
  const repeatAt = new Map();
  let selectSince = 0;
  const hint = $('#hint');
  addEventListener('gamepadconnected', () => { hint.hidden = false; });

  function padLoop(now) {
    const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find((g) => g && g.connected);
    if (gp) {
      const b = (i) => !!gp.buttons[i]?.pressed;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      const cur = new Set();
      if (b(14) || ax < -0.6) cur.add('left');
      if (b(15) || ax > 0.6) cur.add('right');
      if (b(12) || ay < -0.6) cur.add('up');
      if (b(13) || ay > 0.6) cur.add('down');
      [[0, 'a'], [1, 'b'], [2, 'x'], [3, 'y'], [4, 'lb'], [5, 'rb'], [8, 'select']].forEach(([i, n]) => { if (b(i)) cur.add(n); });

      if (!player.hidden) {
        if (cur.has('select')) { selectSince ||= now; if (now - selectSince > 700) { closePlayer(); selectSince = 0; } } else selectSince = 0;
      } else {
        for (const act of cur) {
          const isNew = !prev.has(act);
          const move = act === 'left' || act === 'right' || act === 'up' || act === 'down';
          let fire = isNew;
          if (move && !isNew && now >= (repeatAt.get(act) || 0)) fire = true; // auto-repeat when held
          if (!fire) continue;
          repeatAt.set(act, now + (isNew ? 380 : 110));
          padAction(act);
        }
      }
      prev.clear(); cur.forEach((x) => prev.add(x)); // also tracked while a game is open, so a held button doesn't re-fire on return
    }
    requestAnimationFrame(padLoop);
  }
  function padAction(act) {
    const a = document.activeElement;
    const g = a?.dataset?.id ? games.find((x) => x.id === +a.dataset.id) : null;
    switch (act) {
      case 'left': case 'right': case 'up': case 'down':
        if (a === q) q.blur();
        moveFocus({ left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[act]); break;
      case 'a': (a && a !== document.body ? a : document.querySelector('.card'))?.click(); break;
      case 'b': if (document.activeElement === q || q.value) { q.value = ''; render(); } else if (filter !== 'all') document.querySelector('[data-f="all"]').click(); else exitApp(); break;
      case 'x': a?.querySelector?.('.fav')?.click(); break;
      case 'y': if (g) openExternal(g.play || g.source); break;
      case 'lb': jumpLetter(-1); break;
      case 'rb': jumpLetter(1); break;
    }
  }
  requestAnimationFrame(padLoop);

  // ---------- boot ----------
  if (window.CATALOG) { games = window.CATALOG.games; render(); }
  else { $('#empty').hidden = false; $('#empty').textContent = 'Could not load catalog.'; }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
