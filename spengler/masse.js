/* Spengler-Web: Masseingabe direkt in der Zeichnung (ein gemeinsamer Baustein fuer alle Seiten, Nils und Alex 11./12.11.2026).
 * Tipp aufs Mass in der Zeichnung (2D, 3D-Pille oder Vollbild) oeffnet ein festes Eingabeband ueber der Bildschirmtastatur.
 * Das Band schreibt in dasselbe (zugeklappte) Feld der Seite wie die Liste, darum bleiben Rechnung, Pruefung und Speichern unveraendert.
 * Eine Quelle (SkizzenAnsicht oder Vollbild) liefert: feldFuer(key), schluessel(), einheit(key), aktivSetzen(key), neuZeichnen(), sichtbar(key). */
(function (root) {
  'use strict';
  const S = root.S, h = S.h, T = S.T, Ze = root.Ze;
  let ungueltig = false, q = null, key = null, feld = null, el = null, inp = null, sitzung = null, mo = null, scrollVor = 0, scrollEl = null, rueck = null;
  const E = {};
  const ref = {};

  const box = f => (f && f.closest ? f.closest('.feld') : null);
  // Fehler am Feld selbst (Meldung im Feld) oder die Seite meldet die Masse insgesamt als ungueltig (S.dimm wird nur im Fehlerfall gerufen)
  const fehlerMeldung = () => { const b = box(feld); if (b && b.classList.contains('fehler')) { const m = b.querySelector('.fm'); return (m && m.textContent) || T('mb_ungueltig'); } return ungueltig ? T('mb_passt_nicht') : null; };
  const beschriftung = f => { const l = f.getAttribute('aria-label') || ''; return l || T('ss_masse'); };

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
    const kopf = h('div', { class: 'mb-kopf' }, h('div', { class: 'mb-texte' }, ref.name, ref.erg), ref.abbruch);
    const feldBox = h('div', { class: 'mb-feld' }, inp, ref.einheit);
    el = h('div', { class: 'mband' + (S.vp.quer ? ' quer' : ''), role: 'group', 'aria-label': T('mb_titel') }, kopf, h('div', { class: 'mb-zeile' }, ref.zur, feldBox, ref.vor, ref.fertig));
    document.body.append(el);
    inp.addEventListener('input', () => {
      const neg = /^-/.test(sitzung.get(key) || '');
      let v = inp.value.replace(neg ? /[^0-9.,-]/g : /[^0-9.,]/g, '');
      const m = v.match(/^(-?)(\d*)([.,]?)(\d*)/); v = m ? m[1] + m[2] + m[3] + m[4] : '';
      if (v !== inp.value) inp.value = v;
      if (v === '-' || v === ',' || v === '.') { zustand(); return; }   // leer geht an die Seite: manche Felder duerfen leer sein (z. B. Laenge leer = Rest)
      setzeWert(v); zustand();
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); E.weiter(1); } else if (e.key === 'Escape') { e.preventDefault(); E.abbrechen(); } });
    inp.addEventListener('focus', () => { setTimeout(() => { try { inp.select(); } catch (x) { /* */ } }, 0); });
    const l = document.querySelector('.leiste');
    if (l) { mo = new MutationObserver(() => { if (el && !fehlerMeldung()) ref.erg.textContent = ergebnis(); }); mo.observe(l, { childList: true, subtree: true, characterData: true }); }
    scrollEl = document.querySelector('.skscroll'); scrollVor = scrollEl ? scrollEl.scrollTop : 0;
    if (scrollEl) { scrollEl.scrollTop = 0; scrollEl._bandWacht = () => { if (scrollEl.scrollTop !== 0) scrollEl.scrollTop = 0; }; scrollEl.addEventListener('scroll', scrollEl._bandWacht, { passive: true }); }
    S.bandAn = true; document.body.classList.add('eingabe');
    E.layout();
  }
  /** Band an den sichtbaren Bereich setzen (unten ueber der Tastatur, im Querformat als Spalte rechts). */
  E.layout = () => {
    if (!el) { if (rueck && rueck.platz) rueck.platz(); return; }
    const vp = S.vp, vv = window.visualViewport, oben = vv && !S.opt.kb ? vv.offsetTop : 0, kb = S.opt.kb ? vp.imeAbzug : 0;
    const insB = vp.tastatur ? 0 : S.inset('bottom'), insR = S.inset('right');
    if (rueck && rueck.platz) rueck.platz();
    el.classList.toggle('quer', vp.quer);
    if (vp.quer) {
      const w = Math.min(280, Math.round(vp.w * 0.34));
      el.style.cssText = 'top:' + (oben + S.inset('top')) + 'px;right:0;width:' + (w + insR) + 'px;height:' + (vp.h - kb - S.inset('top') - insB) + 'px;padding-right:' + (insR + 10) + 'px';
      S.bandB = w; S.bandH = 0;
    } else {
      el.style.cssText = 'left:0;right:0;padding-bottom:' + (insB + 6) + 'px;top:auto;bottom:auto';
      const hh = el.offsetHeight; el.style.top = (oben + vp.h - kb - hh) + 'px'; S.bandH = hh; S.bandB = 0;
    }
  };
  E.offen = () => !!el;
  E.oeffne = (quelle, k) => {
    const f = quelle.feldFuer(k); if (!f || f.disabled) return false;
    if (rueck) { rueck.el.remove(); rueck = null; }
    if (el && q !== quelle) E.zu(true);
    const neu = !el; q = quelle;
    if (neu) { sitzung = new Map(); bauen(); }
    E.waehle(k);
    if (neu && S.umgebung) S.umgebung();
    return true;
  };
  E.waehle = k => {
    const f = q.feldFuer(k); if (!f) return;
    key = k; feld = f; ungueltig = false; if (!sitzung.has(k)) sitzung.set(k, f.value);
    q.aktivSetzen(k); inp.value = f.value; ref.einheit.textContent = q.einheit(k);
    zustand();
    try { inp.focus({ preventScroll: true }); inp.select(); } catch (x) { /* */ }
    if (q.sichtbar) q.sichtbar(k);
    try { document.scrollingElement.scrollTop = 0; document.getElementById('app').scrollTop = 0; } catch (x) { /* */ }
  };
  E.weiter = r => {
    if (!el) return;
    if (fehlerMeldung()) { S.haptik(30); el.classList.remove('wackel'); void el.offsetWidth; el.classList.add('wackel'); return; }
    const ks = q.schluessel(); if (!ks.length) return;
    let i = ks.indexOf(key); i = i < 0 ? 0 : (i + r + ks.length) % ks.length;
    E.waehle(ks[i]);
  };
  const setzeZurueck = (qu, k, wert) => { const f = qu.feldFuer(k); if (f && f.value !== wert) { f.value = wert; f.dispatchEvent(new Event('input', { bubbles: true })); } ungueltig = false; };
  E.abbrechen = () => { if (!el) return; setzeZurueck(q, key, sitzung.get(key)); E.zu(true, true); };
  /** Band schliessen. Ungueltiger oder leerer Wert springt auf den alten zurueck (mit Hinweis). */
  E.zu = (still, abgebrochen) => {
    if (!el) return;
    let zurueckgesetzt = false;
    if (fehlerMeldung()) { setzeZurueck(q, key, sitzung.get(key)); zurueckgesetzt = !abgebrochen; }
    const qu = q, geaendert = [...sitzung].filter(([k, o]) => { const f = qu.feldFuer(k); return f && f.value !== o; });
    const vorher = new Map(sitzung);
    if (mo) { mo.disconnect(); mo = null; }
    if (scrollEl && scrollEl._bandWacht) { scrollEl.removeEventListener('scroll', scrollEl._bandWacht); scrollEl.scrollTop = scrollVor; }
    el.remove(); el = null; inp = null; Ze.fehlerKey = null;
    S.bandAn = false; S.bandH = 0; S.bandB = 0; document.body.classList.remove('eingabe');
    qu.aktivSetzen(null); qu.neuZeichnen(); q = null; key = null; feld = null;
    try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch (x) { /* */ }
    if (S.umgebung) S.umgebung();
    if (zurueckgesetzt) S.toast(T('mb_alt_bleibt'));
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
    S.bandAn = false; S.bandH = 0; S.bandB = 0; document.body.classList.remove('eingabe');
  };
  S.band = E;
})(window);
