/* Spengler-Web: Masseingabe direkt in der Zeichnung (ein gemeinsamer Baustein fuer alle Seiten, Nils und Alex 11./12.11.2026).
 * Tipp aufs Mass in der Zeichnung (2D, 3D-Pille oder Vollbild) oeffnet ein festes Eingabeband ueber der Bildschirmtastatur.
 * Das Band schreibt in dasselbe (zugeklappte) Feld der Seite wie die Liste, darum bleiben Rechnung, Pruefung und Speichern unveraendert.
 * Eine Quelle (SkizzenAnsicht oder Vollbild) liefert: feldFuer(key), schluessel(), einheit(key), aktivSetzen(key), neuZeichnen(), sichtbar(key). */
(function (root) {
  'use strict';
  const S = root.S, h = S.h, T = S.T, Ze = root.Ze;
  const E = {};
  let padAn = false, frisch = false, ungueltig = false, q = null, key = null, feld = null, el = null, inp = null, sitzung = null, mo = null, scrollVor = 0, scrollEl = null, rueck = null;
  const ref = {};
  /** Geisterklick-Sperre (Pruefer 12.11.): Das Band erscheint beim Loslassen des Fingers, genau unter ihm. Der Klick, den der Browser aus derselben Beruehrung nachschickt,
   *  darf keine Taste und keinen Knopf des Bandes ausloesen (sonst aendert sich still ein Wert, z. B. Steckung 50 wird 1). Darum nimmt das Band nach dem Oeffnen
   *  eine kurze Zeit lang keine Klicks an. Die Sperre gilt fuer das ganze Band, auch die Pfeile und Fertig. */
  let sperreBis = 0;
  const SPERRE_MS = 450;
  document.addEventListener('click', ev => {
    if (el && performance.now() < sperreBis && el.contains(ev.target)) { ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); E.gesperrt = (E.gesperrt || 0) + 1; }
  }, true);

  const box = f => (f && f.closest ? f.closest('.feld') : null);
  // Fehler am Feld selbst (Meldung im Feld) oder die Seite meldet die Masse insgesamt als ungueltig (S.dimm wird nur im Fehlerfall gerufen)
  // Zwei Arten von Fehler: das Mass selbst ist nicht gueltig (0, Minuswert) oder es passt nur nicht zu einem anderen Mass (Kombination, z. B. Streifen breiter als die Platte).
  const eigenFehler = () => { const b = box(feld); if (b && b.classList.contains('fehler')) { const m = b.querySelector('.fm'); return (m && m.textContent) || T('mb_ungueltig'); } return null; };
  const kombiFehler = () => {
    if (!ungueltig) return null;
    const eigen = box(feld), andere = [...document.querySelectorAll('.feld.fehler')].filter(x => x !== eigen);
    if (andere.length) { const i = andere[0].querySelector('input'), m = andere[0].querySelector('.fm'); return T('mb_passt_mit', i ? (i.getAttribute('aria-label') || '') : '', (m && m.textContent) || ''); }
    return T('mb_passt_nicht');
  };
  const fehlerMeldung = () => eigenFehler() || kombiFehler();
  /** Einheit zum Mass, aus der Beschriftung des Feldes: (mm), (cm), (Grad), (%), (mm/m), Zoll, Anzahl und Stueck (Nils/Pruefer 12.11.: cm und Stueck duerfen nicht "mm" heissen). */
  E.einheitVon = (f, text) => {
    const l = f ? (f.getAttribute('aria-label') || '') : '';
    for (const x of (l.match(/\(([^)]*)\)/g) || [])) {
      const u = x.slice(1, -1).trim().toLowerCase();
      if (/^(grad|°|deg|degrees?)$/.test(u)) return '°';
      if (/^(mm|cm|m|%|mm\/m)$/.test(u)) return u;
      if (/^(zoll|inch|in|")$/.test(u)) return u === 'zoll' ? 'Zoll' : 'in';
      if (/^(anzahl|count|number|pieces?|pcs)$/.test(u)) return T('mb_stueck');
    }
    if (/winkel|neigung|angle|slope|\bgrad\b|degree|°/i.test(l)) return '°';
    if (/(^|\s)(st[üu]ck|anzahl|pieces|pcs|count)/i.test(l) || /^n\s/.test(l)) return T('mb_stueck');
    if (text && String(text).indexOf('°') >= 0) return '°';
    return 'mm';
  };
  /** Zahlenblock in der App (statt der Bildschirmtastatur): keine Autofill-Leiste, keine Hoehenspruenge, im Querformat bleibt die Zeichnung gross.
   *  Auf Touchgeraeten Standard, Umschalter im Band, Wahl wird gemerkt. Am PC mit Maus und Tastatur aus. */
  const padWahl = () => { try { return localStorage.getItem('sp_pad'); } catch (e) { return null; } };
  const grob = () => { try { return !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); } catch (e) { return false; } };
  /** Touch im Querformat: immer Zahlenblock (mit Bildschirmtastatur bleiben dort nur ca. 100 px Hoehe, am Samsung gemessen). */
  const padFest = () => grob() && S.vp.quer;
  const padStart = () => { if (padFest()) return true; const w = padWahl(); if (w === '1') return true; if (w === '0') return false; return grob(); };
  E.padAn = () => padAn;
  const dezi = () => (S.sprache() === 'en' ? '.' : ',');
  const beschriftung = f => { const l = f.getAttribute('aria-label') || ''; return l || T('ss_masse'); };

  // ---- Querformat mit Tastatur: nur ca. 190 px Hoehe. Die Zeichnung wird dann nicht in den schmalen Streifen gequetscht, sondern in der Hoehe OHNE Tastatur
  // gebaut (gleiche Schrift, gleiche Aufteilung wie sonst) und der Streifen zeigt den Ausschnitt um das aktive Mass (Pille/Zahl bleibt in der Mitte).
  const hoeheEcht = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight').get;
  const karten = [];
  E.virtAn = () => S.bandAn && S.vp.quer && S.vp.tastatur;
  /** Karte (Zeichnungsflaeche) anmelden: quellen = { view, d3 (Ansicht3D oder Funktion, die sie liefert) }. Ab dann liefert karte.clientHeight die Hoehe ohne Tastatur. */
  E.karte = (karte, quellen) => {
    if (karten.some(k => k.karte === karte)) return;
    const k = { karte, view: quellen.view, d3: quellen.d3, ruhe: 0 };
    Object.defineProperty(karte, 'clientHeight', { configurable: true, get() { const r = hoeheEcht.call(karte); if (!E.virtAn()) { k.ruhe = r; return r; } return Math.max(r, k.ruhe || r); } });
    karten.push(k);
  };
  E.sync = () => {
    for (let i = karten.length - 1; i >= 0; i--) if (!karten[i].karte.isConnected) karten.splice(i, 1);
    for (const k of karten) {
      const cvs = [...k.karte.querySelectorAll(':scope > canvas')];
      if (!E.virtAn()) { for (const c of cvs) { c.style.height = ''; c.style.transform = ''; } continue; }
      const vis = hoeheEcht.call(k.karte), H = k.karte.clientHeight; let y = null;
      const d3 = typeof k.d3 === 'function' ? k.d3() : k.d3;
      if (d3 && d3.canvas && d3.canvas.style.display !== 'none' && d3.pillenOrte) { const p = d3.pillenOrte.find(x => x[1] === key); if (p) y = (p[0][1] + p[0][3]) / 2; }
      else if (k.view && k.view.aktuell && key != null) { const z = k.view.aktuell, e = z.elems.find(x => x.k === 't' && x.key === key); if (e) y = k.view.passung(z)[2] + k.view.passung(z)[0] * (e.y - e.groesse * 0.35); }
      const off = y == null ? (k.off || 0) : Math.min(Math.max(0, H - vis), Math.max(0, y - vis / 2)); k.off = off;
      for (const c of cvs) { c.style.height = H + 'px'; c.style.transform = 'translateY(' + (-off) + 'px)'; }
    }
  };
  const syncSpaeter = () => { E.sync(); requestAnimationFrame(E.sync); setTimeout(E.sync, 120); setTimeout(E.sync, 400); };

  /** Ergebnis der Seite (Leiste unten, bei offener Tastatur ausgeblendet) im Band mitzeigen. */
  function ergebnis() {
    const l = document.querySelector('.leiste'); if (!l) return '';
    const a = l.querySelector('.ll,.at'), w = l.querySelector('.lw,.ad');
    const wt = w ? w.textContent.trim() : ''; if (!wt || wt === '-') return '';
    return (a ? a.textContent.trim() + ': ' : '') + wt;
  }
  function zustand() {
    if (!el) return;
    const m = fehlerMeldung();
    el.classList.toggle('fehler', !!m);
    el.dataset.feld = beschriftung(feld);
    ref.name.textContent = m || beschriftung(feld);
    ref.erg.textContent = m ? '' : ergebnis();
    Ze.fehlerKey = m ? key : null;
    q.neuZeichnen();
  }
  function setzeWert(v) {
    if (feld.value === v) return;
    S.ungueltig = false; feld.value = v; feld.dispatchEvent(new Event('input', { bubbles: true })); ungueltig = S.ungueltig;
  }
  function bauen() {
    inp = h('input', { class: 'mb-input', type: 'text', inputmode: 'decimal', enterkeyhint: 'next', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': T('ss_masse') });
    ref.name = h('div', { class: 'mb-name' }); ref.erg = h('div', { class: 'mb-erg' }); ref.einheit = h('span', { class: 'mb-einheit' });
    const halte = b => { const f = e => e.preventDefault(); b.addEventListener('pointerdown', f); b.addEventListener('mousedown', f); return b; };
    const knopf = (cls, text, label, fn) => halte(h('button', { class: 'mb-k ' + cls, type: 'button', text, 'aria-label': label, onclick: fn }));
    ref.abbruch = knopf('mb-x', '✕', T('mb_abbruch'), () => E.abbrechen());
    ref.zur = knopf('mb-zur', '‹', T('mb_zurueck'), () => E.weiter(-1));
    ref.vor = knopf('mb-vor', T('mb_weiter') + ' ›', T('mb_weiter'), () => E.weiter(1));
    ref.fertig = knopf('mb-fertig', T('mb_fertig'), T('mb_fertig'), () => E.zu());
    ref.umschalt = knopf('mb-pad-k', '', T('mb_pad_umschalten'), () => E.padUmschalten());
    const kopf = h('div', { class: 'mb-kopf' }, h('div', { class: 'mb-texte' }, ref.name, ref.erg), ref.umschalt, ref.abbruch);
    padAn = padStart();
    const taste = (text, label, fn, cls) => knopf('mb-t ' + (cls || ''), text, label, fn);
    const ziff = z => taste(z, z, () => E.tippe(z));
    ref.pad = h('div', { class: 'mb-pad', role: 'group', 'aria-label': T('mb_pad') },
      ziff('7'), ziff('8'), ziff('9'), taste('⌫', T('mb_loeschen'), () => E.tippe('<'), 'mb-t-loe'),
      ziff('4'), ziff('5'), ziff('6'), taste(dezi(), T('mb_komma'), () => E.tippe(dezi()), 'mb-t-komma'),
      ziff('1'), ziff('2'), ziff('3'), ziff('0'));
    const feldBox = h('div', { class: 'mb-feld' }, inp, ref.einheit);
    el = h('div', { class: 'mband' + (S.vp.quer ? ' quer' : ''), role: 'group', 'aria-label': T('mb_titel') }, kopf, h('div', { class: 'mb-zeile' }, ref.zur, feldBox, ref.vor, ref.fertig), ref.pad);
    E.padSetzen(padAn, true);
    document.body.append(el);
    inp.addEventListener('input', () => {
      const neg = /^-/.test(sitzung.get(key) || '');
      let v = inp.value.replace(neg ? /[^0-9.,-]/g : /[^0-9.,]/g, '');
      const m = v.match(/^(-?)(\d*)([.,]?)(\d*)/); v = m ? m[1] + m[2].slice(0, 6) + m[3] + m[4].slice(0, 3) : '';   // hoechstens 6 Stellen vor und 3 nach dem Komma (keine absurden Zahlen)
      if (v !== inp.value) inp.value = v;
      if (v === '-' || v === ',' || v === '.') { zustand(); return; }   // leer geht an die Seite: manche Felder duerfen leer sein (z. B. Laenge leer = Rest)
      setzeWert(v); zustand();
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); E.weiter(1); } else if (e.key === 'Escape') { e.preventDefault(); E.abbrechen(); } });
    inp.addEventListener('focus', () => { frisch = true; setTimeout(() => { try { inp.select(); } catch (x) { /* */ } }, 0); });
    const l = document.querySelector('.leiste');
    if (l) { mo = new MutationObserver(() => { if (el && !fehlerMeldung()) ref.erg.textContent = ergebnis(); }); mo.observe(l, { childList: true, subtree: true, characterData: true }); }
    scrollEl = document.querySelector('.skscroll'); scrollVor = scrollEl ? scrollEl.scrollTop : 0;
    if (scrollEl) { scrollEl.scrollTop = 0; scrollEl._bandWacht = () => { if (scrollEl.scrollTop !== 0) scrollEl.scrollTop = 0; }; scrollEl.addEventListener('scroll', scrollEl._bandWacht, { passive: true }); }
    S.bandAn = true; document.body.classList.add('eingabe');
    E.layout();
  }
  E.padSetzen = (an, ohneMerken) => {
    padAn = !!an; if (!el) return;
    el.classList.toggle('pad', padAn); ref.pad.hidden = !padAn;
    inp.setAttribute('inputmode', padAn ? 'none' : 'decimal');
    ref.umschalt.textContent = padAn ? '⌨' : '123';
    ref.umschalt.setAttribute('aria-label', padAn ? T('mb_tastatur') : T('mb_pad_umschalten'));
    if (!ohneMerken) { try { localStorage.setItem('sp_pad', padAn ? '1' : '0'); } catch (e) { /* */ } }
    if (!ohneMerken) { try { inp.blur(); inp.focus({ preventScroll: true }); inp.select(); } catch (e) { /* */ } E.layout(); setTimeout(E.layout, 120); S.umgebung && S.umgebung(); }
  };
  E.padUmschalten = () => E.padSetzen(!padAn);
  /** Taste des Zahlenblocks: Ziffer, Komma (im Englischen Punkt) oder '<' fuer Loeschen. Der erste Druck ersetzt den ganzen alten Wert. */
  E.tippe = z => {
    if (!el || !inp) return;
    let v = frisch ? '' : inp.value; frisch = false;
    if (z === '<') v = v.slice(0, -1);
    else if (z === ',' || z === '.') { if (/[.,]/.test(v)) return; v = (v === '' || v === '-' ? v + '0' : v) + z; }
    else v += z;
    inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true }));
    S.haptik(6);
  };
  /** Band an den sichtbaren Bereich setzen (unten ueber der Tastatur, im Querformat als Spalte rechts). */
  E.layout = () => {
    syncSpaeter();
    if (!el) { if (rueck && rueck.platz) rueck.platz(); return; }
    const vp = S.vp, vv = window.visualViewport, oben = vv && !S.opt.kb ? vv.offsetTop : 0, kb = S.opt.kb ? vp.imeAbzug : 0;
    const insB = vp.tastatur ? 0 : S.inset('bottom'), insR = S.inset('right');
    if (rueck && rueck.platz) rueck.platz();
    el.classList.toggle('quer', vp.quer);
    el.classList.toggle('padfest', padFest());
    { const soll = padStart(); if (soll !== padAn) E.padSetzen(soll, true); }
    if (vp.quer) {
      const w = Math.min(280, Math.round(vp.w * 0.34));
      el.style.cssText = 'top:' + (oben + S.inset('top')) + 'px;right:0;width:' + (w + insR) + 'px;height:' + (vp.h - kb - S.inset('top') - insB) + 'px;padding-right:' + (insR + 10) + 'px';
      S.bandB = w; S.bandH = 0;
    } else {
      el.style.cssText = 'left:0;right:0;padding-bottom:' + (insB + 6) + 'px;top:auto;bottom:auto';
      const hh = el.offsetHeight; el.style.top = (oben + vp.h - kb - hh) + 'px'; S.bandH = hh; S.bandB = 0;
    }
    if (S.vollbildPlatz) S.vollbildPlatz();
  };
  E.offen = () => !!el;
  E.aktuell = () => (el ? key : null);
  E.oeffne = (quelle, k) => {
    const f = quelle.feldFuer(k); if (!f || f.disabled) return false;
    if (rueck) { rueck.el.remove(); rueck = null; }
    if (el && q !== quelle) E.zu(true);
    const neu = !el; q = quelle;
    sperreBis = performance.now() + SPERRE_MS;
    if (neu) { sitzung = new Map(); bauen(); }
    E.waehle(k);
    if (neu && S.umgebung) S.umgebung();
    return true;
  };
  E.waehle = k => {
    const f = q.feldFuer(k); if (!f) return;
    key = k; feld = f; if (!sitzung.has(k)) sitzung.set(k, f.value);
    q.aktivSetzen(k); inp.value = f.value; ref.einheit.textContent = q.einheit(k);
    zustand();
    frisch = true;
    try { inp.focus({ preventScroll: true }); inp.select(); } catch (x) { /* */ }
    for (const t of [80, 300]) setTimeout(() => { if (el && inp && document.activeElement !== inp && !padAn) { try { inp.focus({ preventScroll: true }); inp.select(); } catch (x) { /* */ } } }, t);
    if (q.sichtbar) q.sichtbar(k);
    syncSpaeter();
    try { document.scrollingElement.scrollTop = 0; document.getElementById('app').scrollTop = 0; } catch (x) { /* */ }
  };
  E.weiter = r => {
    if (!el) return;
    if (eigenFehler()) { S.haptik(30); el.classList.remove('wackel'); void el.offsetWidth; el.classList.add('wackel'); return; }   // nur das Mass selbst sperrt, ein Kombinationsfehler laesst Weiter zu (das andere Mass wird als naechstes geaendert)
    const ks = q.schluessel(); if (!ks.length) return;
    let i = ks.indexOf(key); i = i < 0 ? 0 : (i + r + ks.length) % ks.length;
    E.waehle(ks[i]);
  };
  const setzeZurueck = (qu, k, wert) => { const f = qu.feldFuer(k); if (f && f.value !== wert) { f.value = wert; f.dispatchEvent(new Event('input', { bubbles: true })); } ungueltig = false; };
  E.abbrechen = () => { if (!el) return; setzeZurueck(q, key, sitzung.get(key)); E.zu(true, true); };
  /** Band schliessen. Ungueltiger oder leerer Wert springt auf den alten zurueck (mit Hinweis). */
  E.zu = (still, abgebrochen) => {
    if (!el) return;
    let zurueckgesetzt = false, kombi = null;
    if (eigenFehler()) { setzeZurueck(q, key, sitzung.get(key)); zurueckgesetzt = !abgebrochen; }
    else if (!abgebrochen) kombi = kombiFehler();   // gueltiges Mass, das nur noch nicht zu den anderen passt: bleibt wie auf der Liste, mit Hinweis
    const qu = q, geaendert = [...sitzung].filter(([k, o]) => { const f = qu.feldFuer(k); return f && f.value !== o; });
    const vorher = new Map(sitzung);
    if (mo) { mo.disconnect(); mo = null; }
    if (scrollEl && scrollEl._bandWacht) { scrollEl.removeEventListener('scroll', scrollEl._bandWacht); scrollEl.scrollTop = scrollVor; }
    el.remove(); el = null; inp = null; Ze.fehlerKey = null;
    S.bandAn = false; S.bandH = 0; S.bandB = 0; document.body.classList.remove('eingabe');
    if (S.vollbildPlatz) S.vollbildPlatz();
    qu.aktivSetzen(null); qu.neuZeichnen(); q = null; key = null; feld = null; syncSpaeter();
    try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch (x) { /* */ }
    if (S.umgebung) S.umgebung();
    if (zurueckgesetzt) S.toast(T('mb_alt_bleibt'));
    else if (kombi) { S.toast(kombi); if (geaendert.length) E.rueckgaengig(qu, geaendert.map(([k]) => [k, vorher.get(k)])); }
    else if (geaendert.length) E.rueckgaengig(qu, geaendert.map(([k]) => [k, vorher.get(k)]));
  };
  /** Ein Schritt Rueckgaengig nach "Fertig": Hinweiszeile unten fuer ein paar Sekunden. */
  E.rueckgaengig = (qu, liste) => {
    if (rueck) rueck.el.remove();
    const vp = S.vp, vv = window.visualViewport, oben = vv && !S.opt.kb ? vv.offsetTop : 0;
    const r = { el: null };
    const b = h('button', { class: 'mu-k', type: 'button', text: T('mb_rueckgaengig'), onclick: () => { for (const [k, w] of liste) setzeZurueck(qu, k, w); r.el.remove(); if (rueck === r) rueck = null; qu.neuZeichnen(); } });
    r.el = h('div', { class: 'mundo', role: 'status' }, h('span', { text: T('mb_geaendert') }), b); rueck = r;
    r.platz = () => { const v = S.vp, w = window.visualViewport; r.el.style.top = ((w && !S.opt.kb ? w.offsetTop : 0) + v.h - r.el.offsetHeight - 14 - S.inset('bottom')) + 'px'; };
    document.body.append(r.el); r.platz(); setTimeout(r.platz, 350);
    setTimeout(() => { if (rueck === r) { r.el.remove(); rueck = null; } }, 6500);
  };
  /** Seitenwechsel: Band und Hinweis ohne Nebenwirkung entfernen. */
  E.reset = () => {
    if (mo) { mo.disconnect(); mo = null; }
    if (el) el.remove(); if (rueck) rueck.el.remove();
    el = null; rueck = null; q = null; key = null; feld = null; inp = null; Ze.fehlerKey = null;
    S.bandAn = false; S.bandH = 0; S.bandB = 0; document.body.classList.remove('eingabe'); E.sync();
    if (S.vollbildPlatz) S.vollbildPlatz();
  };
  S.band = E;
})(window);
