/* Spengler-Web: Grundbausteine (Texte, DOM-Helfer, Speicher, Animationen, Viewport). Entspricht A/Ui.kt, A/Format.kt. */
(function (root) {
  'use strict';
  const Ze = root.Ze;
  const S = root.S = {};

  // ---------------------------------------------------------------- Speicher (SharedPreferences -> localStorage, mit Rueckfall)
  const mem = {};
  S.lies = k => { try { const v = localStorage.getItem('sp.' + k); return v == null ? (k in mem ? mem[k] : null) : v; } catch (e) { return k in mem ? mem[k] : null; } };
  S.schreibe = (k, v) => { mem[k] = String(v); try { localStorage.setItem('sp.' + k, String(v)); } catch (e) { /* privat, Rueckfall Speicher */ } };

  // ---------------------------------------------------------------- Sprache und Texte
  S.sprachWahl = S.lies('sprache') || '';           // '', 'de', 'en'
  S.sprache = () => S.sprachWahl || ((navigator.language || 'de').toLowerCase().startsWith('en') ? 'en' : 'de');
  S.T = (k, ...a) => {
    const L = root.TEXTE, sp = S.sprache();
    let s = (L[sp] && L[sp][k] != null) ? L[sp][k] : (L.de[k] != null ? L.de[k] : k);
    if (Array.isArray(s)) return s;
    return String(s).replace(/%(\d+)\$[sd]/g, (m, i) => { const v = a[i - 1]; return v == null ? '' : String(v); }).replace(/%%/g, '%');
  };
  S.TA = k => { const L = root.TEXTE, sp = S.sprache(); return (L[sp] && L[sp][k]) || L.de[k] || []; };
  S.setzeSprache = w => { S.sprachWahl = w; S.schreibe('sprache', w); S.dezimal(); };
  S.dezimal = () => { Ze.Fmt.dez = S.sprache() === 'en' ? '.' : ','; };
  S.dezimal();
  S.fmt = Ze.fmt; S.fmtTrim = Ze.fmtTrim; S.parseNum = Ze.parseNum;
  S.fmtM2 = m2 => Ze.fmt(m2, m2 < 0.1 ? 3 : 2);
  S.html = s => String(s).replace(/&/g, '&amp;').replace(/<(?!\/?(b|i)>)/g, '&lt;').replace(/\n/g, '<br>');

  // ---------------------------------------------------------------- DOM
  const SVGNS = 'http://www.w3.org/2000/svg';
  S.h = function (tag, attrs, ...kinder) {
    const e = tag === 'svg' || (attrs && attrs.ns) ? document.createElementNS(SVGNS, tag) : document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false || k === 'ns') continue;
      if (k === 'class') e.setAttribute('class', v);
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kinder.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  };
  const h = S.h;
  S.svg = (inner, w, hh, vb) => { const e = h('svg', { width: w, height: hh, viewBox: vb }); e.innerHTML = inner; return e; };
  S.iconInfo = () => S.svg('<circle cx="18" cy="18" r="16.4" fill="#151515" fill-opacity=".8"/><circle cx="18" cy="18" r="16.4" fill="none" stroke="#5AA7F0" stroke-width="1.5"/><circle cx="18" cy="11.6" r="1.7" fill="#5AA7F0"/><rect x="16.6" y="14.4" width="2.8" height="11.4" rx="1.4" fill="#5AA7F0"/>', 36, 36, '0 0 36 36');
  S.iconZurueck = () => S.svg('<circle cx="24" cy="24" r="18" fill="#FFF" fill-opacity=".95" stroke="#CBD3DD" stroke-width="1.5"/><path fill="#141C26" d="M33,22.5 H19.7 L25.6,16.6 L23.5,14.5 L13,25 L23.5,35.5 L25.6,33.4 L19.7,27.5 H33 Z"/>', 52, 52, '0 0 48 48');
  S.dreieck = auf => { const e = S.svg(auf ? '<path d="M0 9H11L5.5 0Z" fill="currentColor"/>' : '<path d="M0 0H11L5.5 9Z" fill="currentColor"/>', 8, 6.5, '0 0 11 9'); e.style.cssText = 'display:inline-block;vertical-align:1px;margin-right:10px'; return e; };
  S.iconPfeil = () => S.svg('<path fill="#0B5CAB" d="M7.41,8.59L12,13.17l4.59,-4.58L18,10l-6,6 -6,-6z"/>', 24, 24, '0 0 24 24');
  S.iconVollbild = () => S.svg('<path d="M3.5 12.5v-3.2m0 3.2h3.2m-3.2 0l4.6-4.6M12.5 3.5h-3.2m3.2 0v3.2m0-3.2L7.9 8.1" fill="none" stroke="#0B5CAB" stroke-width="1.5" stroke-linecap="round"/>', 13, 13, '0 0 16 16');
  S.flaggeSvg = tag => {
    const w = 22, hh = 22;
    if (tag === 'ch') return S.svg('<rect width="32" height="32" fill="#E10000"/><path fill="#fff" d="M13 6h6v7h7v6h-7v7h-6v-7H6v-6h7z"/>', w, hh, '0 0 32 32');
    if (tag === 'de') return S.svg('<rect width="32" height="11" y="2" fill="#000"/><rect width="32" height="10" y="11" fill="#DD0000"/><rect width="32" height="11" y="21" fill="#FFCE00"/>', w, hh, '0 0 32 32');
    if (tag === 'en') return S.svg('<rect y="4" width="32" height="24" fill="#012169"/><path d="M0 4l32 24M32 4L0 28" stroke="#fff" stroke-width="5"/><path d="M0 4l32 24M32 4L0 28" stroke="#C8102E" stroke-width="2"/><path d="M16 4v24M0 16h32" stroke="#fff" stroke-width="9"/><path d="M16 4v24M0 16h32" stroke="#C8102E" stroke-width="5"/>', w, hh, '0 0 32 32');
    return S.svg('<circle cx="16" cy="16" r="9" fill="none" stroke="#555" stroke-width="2.5"/><circle cx="16" cy="16" r="3" fill="#555"/>', w, hh, '0 0 32 32');
  };
  S.flaggeAktuell = () => {
    const w = S.sprachWahl;
    if (w === 'de') return 'de'; if (w === 'en') return 'en';
    const l = (navigator.language || 'de-CH').toLowerCase();
    return l.endsWith('-ch') || l === 'de' ? 'ch' : l.startsWith('en') ? 'en' : 'ch';
  };

  // ---------------------------------------------------------------- Haptik, Easing, Animation
  S.haptik = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms || 10); } catch (e) { /* iOS: nicht vorhanden, bewusst still */ } };
  S.decel = t => 1 - (1 - t) * (1 - t);
  S.decel14 = t => 1 - Math.pow(1 - t, 2.8);
  S.overshoot = t => { t -= 1; return t * t * ((3 + 1) * t + 3) + 1; };
  S.anim = (dauer, kurve, schritt, ende) => {
    const t0 = performance.now(); let stopp = false;
    const f = now => { if (stopp) return; const t = Math.min(1, (now - t0) / dauer); schritt(kurve ? kurve(t) : t, t); if (t < 1) requestAnimationFrame(f); else if (ende) ende(); };
    requestAnimationFrame(f);
    return () => { stopp = true; };
  };

  // ---------------------------------------------------------------- Autosize (TextViewCompat uniform, Schritt 1)
  S.autosize = (el, min, max) => {
    const pass = () => {
      if (!el.isConnected) return;
      const w = el.clientWidth; if (!w) return;
      let sz = max; el.style.fontSize = sz + 'px';
      while (el.scrollWidth > w + 0.5 && sz > min) { sz -= 1; el.style.fontSize = sz + 'px'; }
    };
    el.style.whiteSpace = 'nowrap';
    S.nachLayout(pass);
    el._autosize = pass;
    return el;
  };
  S.nachLayout = f => requestAnimationFrame(() => requestAnimationFrame(f));
  S.autosizeAlle = wurzel => { for (const e of wurzel.querySelectorAll('*')) if (e._autosize) e._autosize(); };

  S.toast = text => {
    const t = h('div', { class: 'toast', text }); document.body.append(t);
    setTimeout(() => t.remove(), 2000);
  };

  // ---------------------------------------------------------------- Viewport (100dvh-Falle, Tastatur, Insets)
  S.vp = { w: 0, h: 0, voll: 0, tastatur: false, quer: false, ime: 0 };
  S.opt = {};   // Optionen aus der URL (Testfaelle)
  S.messe = () => {
    const vv = window.visualViewport, app = document.getElementById('app');
    const iw = window.innerWidth, ih = window.innerHeight;
    let vh = vv ? vv.height : ih;
    const quer = iw > ih;
    let ime = 0;
    if (S.opt.kb) { ime = S.opt.kb > 1 ? S.opt.kb : 334; vh = ih; }
    else if (ih - vh > 120) ime = ih - vh;
    const eff = S.opt.kb ? ih : vh;
    document.documentElement.style.setProperty('--vh', eff + 'px');
    app.style.transform = vv && !S.opt.kb && vv.offsetTop ? 'translateY(' + vv.offsetTop + 'px)' : '';
    S.vp = { w: iw, h: eff, voll: ih, tastatur: ime > 0, quer, ime };
    document.documentElement.style.setProperty('--ime', ime + 'px');
    return S.vp;
  };
  S.setzeInsets = (t, r, b, l) => {
    const st = document.documentElement.style;
    st.setProperty('--si-top', t + 'px'); st.setProperty('--si-right', r + 'px'); st.setProperty('--si-bottom', b + 'px'); st.setProperty('--si-left', l + 'px');
  };
  S.inset = k => {
    const m = { top: '--si-top', right: '--si-right', bottom: '--si-bottom', left: '--si-left' };
    const probe = document.createElement('div'); probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:var(' + m[k] + ')'; document.body.append(probe);
    const v = parseFloat(getComputedStyle(probe).paddingTop) || 0; probe.remove(); return v;
  };

  // ---------------------------------------------------------------- Bausteine
  S.karte = (...k) => h('div', { class: 'karte' }, ...k);
  S.text = (s, gr, fett, cls) => h('div', { class: (cls || '') + (fett ? ' fett' : ''), style: { fontSize: (gr || 18) + 'px' }, text: s });
  S.warnband = (s, gr) => h('div', { class: 'warnband', style: { fontSize: (gr || 16) + 'px' }, text: s });
  S.infoband = (s, gr) => h('div', { class: 'infoband', style: { fontSize: (gr || 15) + 'px' }, text: s });
  S.knopf = (label, prim, onClick) => h('button', { class: 'knopf' + (prim ? ' prim' : ''), onclick: onClick, text: label });
  S.seitenTitel = (text, max, links, rechts) => {
    const t = h('div', { class: 'titel', text, style: { fontSize: max + 'px', padding: '0 ' + (rechts == null ? 52 : rechts) + 'px 0 ' + (links == null ? 52 : links) + 'px' } });
    S.autosize(t, 18, max); return t;
  };
  S.feld = (label, wert, opts) => {
    opts = opts || {};
    const inp = h('input', { type: 'text', value: wert, inputmode: opts.text ? 'text' : 'decimal', enterkeyhint: opts.ende ? 'done' : 'next', autocomplete: 'off', autocapitalize: opts.text ? 'sentences' : 'off', spellcheck: 'false', 'aria-label': label,
      style: { fontSize: '20px' } });
    inp.value = wert;
    const lab = h('div', { class: 'lab', text: label.replace('Aufkantung H', 'Aufkantung\nH') }); lab.style.whiteSpace = 'pre-line';
    const fm = h('div', { class: 'fm', 'aria-live': 'polite' });
    const box = h('div', { class: 'feld' }, lab, inp, fm);
    inp.addEventListener('input', () => opts.onChange && opts.onChange(inp.value));
    inp.addEventListener('focus', () => { if (!opts.text) setTimeout(() => { try { inp.select(); } catch (e) { /* */ } }, 0); opts.onFokus && opts.onFokus(true); });
    inp.addEventListener('blur', () => opts.onFokus && opts.onFokus(false));
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); opts.onEnter ? opts.onEnter() : inp.blur(); } });
    box.input = inp; box.lab = lab;
    box.fehler = m => { if (m == null) { box.classList.remove('fehler'); fm.textContent = ''; } else { box.classList.add('fehler'); fm.textContent = m; } };
    return box;
  };
  S.segment = (namen, start, onWahl) => {
    const d = h('div', { class: 'segment' });
    let wahl = start;
    const btns = namen.map((n, i) => h('button', { text: n, 'aria-label': n, onclick: () => { if (i === wahl) return; wahl = i; zeig(); onWahl(i); } }));
    const zeig = () => btns.forEach((b, i) => b.classList.toggle('an', i === wahl));
    btns.forEach(b => d.append(b)); zeig();
    d.setze = i => { wahl = i; zeig(); };
    return d;
  };
  S.waehler = (liste, start, onWahl) => {
    const sel = h('select', { 'aria-label': 'Auswahl' }, liste.map((t, i) => h('option', { value: i, text: t, selected: i === start })));
    sel.value = String(start);
    sel.addEventListener('change', () => onWahl(+sel.value));
    return h('div', { class: 'waehler' }, sel, S.iconPfeil());
  };
  S.zweispalt = (a, b) => {
    const z = h('div', { class: 'zweispalt' }, a, b);
    // Wie Ui.kt zweispalt: die Beschriftungen werden nach dem Messen gleich hoch, damit die Felder auf einer Linie stehen.
    z._autosize = () => {
      if (!z.isConnected) return;
      const ls = [a, b].map(x => x.querySelector && x.querySelector(':scope > .lab')).filter(Boolean); if (ls.length < 2) return;
      ls.forEach(l => { l.style.minHeight = ''; }); const m = Math.max(...ls.map(l => l.offsetHeight)); ls.forEach(l => { l.style.minHeight = m + 'px'; });
    };
    return z;
  };

  // Feedback bei Druck auf Standardknoepfe (Haptik, wo vorhanden)
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('button')) S.haptik(8); }, true);

  S.download = (blob, name) => {
    const a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  };
  S.teilen = async (blob, name, titel) => {
    try {
      const f = new File([blob], name, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: titel }); return 'geteilt'; }
    } catch (e) { if (e && e.name === 'AbortError') return 'abbruch'; }
    S.download(blob, name); return 'download';
  };
})(window);
