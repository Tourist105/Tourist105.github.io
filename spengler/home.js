/* Spengler-Web: Startmenue (HomeActivity.kt, HomeKacheln.kt) und Annahmen (AnnahmenActivity.kt). */
(function (root) {
  'use strict';
  const S = root.S, h = S.h, T = S.T;
  const SZ = () => root.Szene3D;

  // ---------------------------------------------------------------- Ablaeufe (Ablaeufe.kt)
  S.ABLAEUFE = [
    { id: 'profil', name: 'ablauf_profil', info: 'ablauf_profil_info', gruppe: 'H', stand: 'B', route: 'profil' },
    { id: 'skizze_kamin', name: 'ablauf_sk_kamin', info: 'ablauf_sk_kamin_info', gruppe: 'H', stand: 'B', route: 'kamineinfassung' },
    { id: 'skizze_hals', name: 'ablauf_sk_hals', info: 'ablauf_sk_hals_info', gruppe: 'H', stand: 'B', route: 'schwanenhals' },
    { id: 'skizze_dunst', name: 'ablauf_sk_dunst', info: 'ablauf_sk_dunst_info', gruppe: 'H', stand: 'B', route: 'dunstrohr' },
    { id: 'kamin', name: 'ablauf_kamin', info: 'ablauf_kamin_info', gruppe: 'W', stand: 'B', route: 'kamin-alt' },
    { id: 'schwanenhals', name: 'ablauf_schwanenhals', info: 'ablauf_schwanenhals_info', gruppe: 'W', stand: 'B', route: 'schwanenhals-alt' },
    { id: 'rohrbogen', name: 'ablauf_rohrbogen', info: 'ablauf_rohrbogen_info', gruppe: 'H', stand: 'B', route: 'rohrbogen' },
    { id: 'hosenrohr', name: 'ablauf_hosenrohr', info: 'ablauf_hosenrohr_info', gruppe: 'H', stand: 'B', route: 'hosenrohr' },
    { id: 'reduktion', name: 'ablauf_reduktion', info: 'ablauf_reduktion_info', gruppe: 'H', stand: 'B', route: 'reduktion' },
    { id: 'fallrohr', name: 'ablauf_fallrohr', info: 'ablauf_fallrohr_info', gruppe: 'H', stand: 'B', route: 'fallrohr' },
    { id: 'dachrinne', name: 'ablauf_dachrinne', info: 'ablauf_dachrinne_info', gruppe: 'H', stand: 'B', route: 'dachrinne' },
    { id: 'mauerabdeckung', name: 'ablauf_mauerabdeckung', info: 'ablauf_mauerabdeckung_info', gruppe: 'H', stand: 'B', route: 'mauerabdeckung' },
    { id: 'kehle', name: 'ablauf_kehle', info: 'ablauf_kehle_info', gruppe: 'H', stand: 'B', route: 'kehle' }
  ];

  // ---------------------------------------------------------------- Symbole (SymbolView), 100 x 100
  function symbol(id, aktiv) {
    const blau = aktiv ? '#0B5CAB' : '#96A0AC', hell = aktiv ? '#CDDFF5' : '#DEE3E9', dunkel = aktiv ? '#083A6E' : '#78828E', orange = aktiv ? '#E28014' : '#AAAFB6';
    const st = (c, w, extra) => 'fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || '');
    const fl = c => 'fill="' + c + '"';
    let s = '';
    switch (id) {
      case 'kamin': case 'skizze_kamin': {
        const stein = aktiv ? '#E2D6C8' : '#E4E4E4';
        s = '<path d="M4 78L4 94L96 94L96 40Z" ' + fl(hell) + '/><path d="M4 78L96 40" ' + st(dunkel, 4) + '/><rect x="46" y="8" width="26" height="54" ' + fl(stein) + '/><rect x="46" y="8" width="26" height="54" ' + st(dunkel, 3.5) + '/><rect x="42" y="4" width="34" height="8" ' + fl(dunkel) + '/>'
          + '<path d="M34 71L46 62L72 62L86 53L86 62L72 72L46 72L34 80Z" ' + fl(blau) + '/>';
        for (let i = 0; i < 3; i++) s += '<path d="M' + (10 + i * 20) + ' ' + (90 - i * 7) + 'L' + (24 + i * 20) + ' ' + (90 - i * 7) + '" ' + st('#fff', 2.2) + '/>';
        break; }
      case 'skizze_dunst':
        s = '<path d="M4 80L4 94L96 94L96 56Z" ' + fl(hell) + '/><path d="M4 80L96 56" ' + st(dunkel, 4) + '/><rect x="42" y="14" width="18" height="56" ' + fl(hell) + '/><rect x="42" y="14" width="18" height="56" ' + st(blau, 4) + '/>'
          + '<path d="M26 76L42 68L60 68L80 60L80 70L60 78L42 78L26 86Z" ' + fl(blau) + '/><path d="M36 14L66 14" ' + st(orange, 3) + '/>'; break;
      case 'profil':
        s = '<path d="M20 10L20 78L80 78L66 62" ' + st(hell, 16) + '/><path d="M20 10L20 78L80 78L66 62" ' + st(blau, 5) + '/><path d="M8 10L8 78" ' + st(orange, 2.5) + '/><path d="M20 90L80 90" ' + st(orange, 2.5) + '/><path d="M20 78A20 20 0 0 1 38 78" ' + st(dunkel, 2.2) + '/>'; break;
      case 'skizze_hals': case 'schwanenhals':
        s = '<path d="M30 6L30 28C30 42 70 42 70 58L70 94" ' + st(hell, 20) + '/><path d="M30 6L30 28C30 42 70 42 70 58L70 94" ' + st(blau, 4.5) + '/><path d="M20 6L40 6" ' + st(dunkel, 4) + '/><path d="M60 94L80 94" ' + st(dunkel, 4) + '/>'; break;
      case 'rohrbogen':
        s = '<path d="M26 6L26 40Q26 78 62 78L94 78" ' + st(hell, 20) + '/><path d="M26 6L26 40Q26 78 62 78L94 78" ' + st(blau, 4.5) + '/><path d="M16 50L36 50M18 62L38 56M32 70L42 88" ' + st(orange, 3) + '/>'; break;
      case 'hosenrohr':
        s = '<path d="M18 6L46 52L50 94" ' + st(hell, 17) + '/><path d="M82 6L54 52L50 94" ' + st(hell, 17) + '/><path d="M18 6L46 52L50 94" ' + st(blau, 4.5) + '/><path d="M82 6L54 52L50 94" ' + st(blau, 4.5) + '/><circle cx="50" cy="54" r="3.5" ' + fl(orange) + '/>'; break;
      case 'reduktion':
        s = '<path d="M12 14L88 14L64 86L36 86Z" ' + fl(hell) + '/><path d="M12 14L88 14L64 86L36 86Z" ' + st(blau, 4.5) + '/><ellipse cx="50" cy="14" rx="38" ry="6" ' + st(blau, 3.5) + '/><ellipse cx="50" cy="86" rx="14" ry="5" ' + st(blau, 3.5) + '/><path d="M50 20L50 82" ' + st(orange, 2.5, ' stroke-dasharray="5 4"') + '/>'; break;
      case 'fallrohr':
        s = '<path d="M38 4L38 44M38 74L38 96" ' + st(hell, 20) + '/><path d="M38 4L38 44M38 74L38 96" ' + st(blau, 4.5) + '/><path d="M28 40L48 40L46 52L30 52Z" ' + fl(blau) + '/><path d="M28 52L48 52L45 74L31 74Z" ' + fl(orange) + '/><path d="M38 20L70 36L70 52" ' + st(hell, 14) + '/><path d="M38 20L70 36L70 52" ' + st(blau, 3.5) + '/><rect x="26" y="8" width="24" height="5" ' + fl(dunkel) + '/><rect x="26" y="86" width="24" height="5" ' + fl(dunkel) + '/><path d="M62 52L78 52" ' + st(dunkel, 4) + '/>'; break;
      case 'dachrinne':
        s = '<path d="M8 28L92 28A42 34 0 0 1 8 28Z" ' + fl(hell) + '/><path d="M8 28L92 28A42 34 0 0 1 8 28Z" ' + st(blau, 4.5) + '/><path d="M78 62L78 94" ' + st(blau, 9) + '/><path d="M78 62L78 94" ' + st(hell, 4) + '/>'; break;
      case 'mauerabdeckung':
        s = '<rect x="14" y="40" width="72" height="54" ' + fl(hell) + '/><rect x="14" y="40" width="72" height="54" ' + st(dunkel, 3.5) + '/>';
        for (let i = 1; i <= 3; i++) s += '<path d="M14 ' + (40 + i * 13.5) + 'L86 ' + (40 + i * 13.5) + '" ' + st(dunkel, 1.8) + '/>';
        s += '<path d="M6 40L94 40L88 26L12 26Z" ' + fl(blau) + '/>'; break;
      case 'kehle':
        s = '<path d="M6 18L50 80L94 18L94 28L50 94L6 28Z" ' + fl(hell) + '/><path d="M6 18L50 80L94 18" ' + st(blau, 4.5) + '/><path d="M50 20L50 70" ' + st(orange, 3) + '/>'; break;
    }
    return S.svg(s, '100%', '100%', '0 0 100 100');
  }

  // ---------------------------------------------------------------- Startseite
  S.seiteHome = function (opt) {
    opt = opt || {};
    const dreher = []; let weitereOffen = !!opt.weitere;
    const inh = h('div', { class: 'inhalt' });
    const titel = S.seitenTitel(T('home_titel'), 30, 52, 104);
    inh.append(titel, mt(S.bestKarte(), 6), mt(S.warnband(T('warn_home'), 14), 6));
    function mt(e, px) { e.style.marginTop = px + 'px'; return e; }

    const haupt = S.ABLAEUFE.filter(a => a.stand === 'B' && a.gruppe === 'H'), neu = S.ABLAEUFE.filter(a => a.stand === 'B' && a.gruppe === 'N'), weitere = S.ABLAEUFE.filter(a => a.stand === 'B' && a.gruppe === 'W'), folgt = S.ABLAEUFE.filter(a => a.stand !== 'B');
    const oeffne = a => { S.haptik(10); S.gehe(a.route); };

    function kachel(a, gross, klein, schlank) {
      const bereit = a.stand === 'B';
      const name = h('div', { class: 'tname', text: T(a.name) });
      const k = h('button', { class: 'kachel ' + (gross ? 'gross' : klein ? 'folgt' : 'klein'), 'aria-label': T(a.name) });
      const szene = gross ? SZ().MenueSzenen.fuer(a.id) : null;
      if (szene) {
        const cv = h('canvas', {}); const rahmen = h('div', { class: 'rahmen' }, cv);
        const tk = h('div', { class: 'tk' }, name, a.info ? h('div', { class: 'tinfo', text: T(a.info) }) : null);
        k.append(rahmen, tk); S.autosize(name, 14, 26);
        const v = new (SZ().Ansicht3D)(cv); v.szene = szene; v.blattFarben = true; v.grundZoom = (S.opt && S.opt.kopf === 'alt') ? ({ skizze_hals: 1.22, skizze_dunst: 1.35 }[a.id] || 0.95) : 0.92; v.interaktivAus = true;
        const schwenk = a.id === 'skizze_hals' || a.id === 'skizze_dunst' || a.id === 'fallrohr';
        const yaw0 = schwenk ? 0.5 : 0.6 + a.id.length * 0.9, pitch0 = a.id === 'skizze_hals' ? 0.2 : a.id === 'skizze_dunst' ? 0.4 : 0.5;
        const dauer = schwenk ? 14000 : 22000;
        v.phase = ms => { const w = (ms % dauer) / dauer * 2 * Math.PI; v.grundstellung(schwenk ? yaw0 + 0.62 * Math.sin(w) : yaw0 + w, pitch0); };
        v.phase(opt.t || 0); dreher.push(v);
        const gr = () => { const w = rahmen.clientWidth; if (w) v.setzeGroesse(w, rahmen.clientHeight, window.devicePixelRatio || 1); };
        v.gr = gr; S.nachLayout(gr);
      } else if (a.id === 'kamin' && bereit && !klein && root.KaminAltSzene) {
        // Kachel "Kamin alt": das echte Modell mit den Beispielmassen statt eines Platzhalters (wie Android v10)
        const cv = h('canvas', {}), sym = h('div', { class: 'sym' }, cv); k.append(sym, name); name.style.overflow = 'visible'; cv.style.cssText = 'display:block;width:100%;height:100%'; sym.style.cssText = 'overflow:hidden';
        const v = new (SZ().Ansicht3D)(cv); v.szene = root.KaminAltSzene(); v.blattFarben = true; v.grundZoom = 0.92; v.interaktivAus = true; v.grundstellung(0.6, 0.5);
        const gr = () => { const w = sym.clientWidth; if (w) { v.setzeGroesse(w, sym.clientHeight, window.devicePixelRatio || 1); v.zeichnen(); } };
        S.nachLayout(gr); window.addEventListener('resize', gr);
      } else {
        k.append(h('div', { class: 'sym' }, symbol(a.id, bereit)), name);
        if (schlank) { S.autosize(name, 10, 15); name.style.whiteSpace = 'nowrap'; }
        else if (klein) { k.append(h('div', { class: 'fl', text: T('status_folgt') })); S.autosize(name, 10, 15); }
        else name.style.overflow = 'visible';
      }
      if (bereit) {
        const druck = () => k.classList.add('druck'), los = () => k.classList.remove('druck');
        k.addEventListener('pointerdown', druck); k.addEventListener('pointerup', los); k.addEventListener('pointercancel', los); k.addEventListener('pointerleave', los);
        k.addEventListener('click', () => oeffne(a));
      } else { k.disabled = true; k.style.pointerEvents = 'none'; }
      return k;
    }

    for (const a of haupt) inh.append(mt(kachel(a, true), 10));
    if (neu.length) {
      // Dachrinne, Mauerabdeckung, Kehle (seit 09.11.): drei schlanke Kacheln in einer Reihe, Werte sind Annahmen (wie Android HomeActivity)
      const rn = h('div', { style: { display: 'flex', marginTop: '6px' } });
      neu.forEach((a, i) => { const kk = kachel(a, false, false, true); kk.style.flex = '1 1 0'; kk.style.minWidth = 0; kk.style.width = 'auto'; if (i) kk.style.marginLeft = '8px'; rn.append(kk); });
      inh.append(mt(h('div', { style: { fontSize: '15px', fontWeight: 700, color: 'var(--text2)' }, text: T('home_neu') }), 6), rn, mt(h('div', { style: { fontSize: '13px', color: 'var(--text2)' }, text: T('home_neu_info') }), 4));
    }
    if (S.kmMenueZeile) inh.append(mt(S.kmMenueZeile(), 12));

    const status = h('div', { style: { fontSize: '15px' } });
    const annZahl = h('span', {}), exZahl = h('span', {});
    const zaehler = () => { annZahl.textContent = T('home_annahmen_n', S.ANNAHMEN.length); exZahl.textContent = T('home_export_n', S.RM.anzahl()); };
    zaehler();
    const zweiKnoepfe = () => h('div', { class: 'zweiknoepfe' },
      h('button', { onclick: () => S.gehe('annahmen') }, h('b', { text: T('home_annahmen_knopf') }), annZahl),
      h('button', { onclick: () => S.RM.exportieren(m => { status.textContent = m; zaehler(); }) }, h('b', { text: T('home_export_knopf') }), exZahl));
    if (weitere.length) {
      const mehrBox = h('div', { style: { display: weitereOffen ? '' : 'none' } });
      const kopf = h('button', { class: 'weiterekopf' });
      const kopfText = () => { kopf.textContent = ''; kopf.append(S.dreieck(mehrBox.style.display !== 'none'), T('home_weitere')); };
      kopfText();
      kopf.addEventListener('click', () => { mehrBox.style.display = mehrBox.style.display === 'none' ? '' : 'none'; kopfText(); S.haptik(6); });
      inh.append(mt(kopf, 18));
      mehrBox.append(mt(h('div', { style: { fontSize: '14px', color: 'var(--text2)' }, text: T('home_weitere_info') }), 8));
      for (let i = 0; i < weitere.length; i += 2) {
        const paar = weitere.slice(i, i + 2);
        const r = h('div', { style: { display: 'flex', marginTop: '10px' } });
        paar.forEach((a, j) => { const kk = kachel(a, false); kk.style.flex = '1 1 0'; kk.style.minWidth = 0; kk.style.width = 'auto'; if (paar.length === 2) { if (j === 0) kk.style.marginRight = '6px'; else kk.style.marginLeft = '6px'; } r.append(kk); });
        if (paar.length === 1) r.append(h('div', { style: { flex: '1 1 0' } }));
        mehrBox.append(r);
      }
      mehrBox.append(mt(zweiKnoepfe(), 14), mt(status, 6));
      inh.append(mt(mehrBox, 6));
    } else { inh.append(mt(zweiKnoepfe(), 14), mt(status, 6)); }
    if (folgt.length) {
      inh.append(mt(h('div', { style: { fontSize: '15px', fontWeight: 700, letterSpacing: '.045em', color: 'var(--text2)' }, text: T('home_folgt') }), 22));
      const r = h('div', { style: { display: 'flex', marginTop: '8px' } });
      folgt.forEach((a, i) => { const kk = kachel(a, false, true); kk.style.flex = '1 1 0'; kk.style.minWidth = 0; kk.style.width = 'auto'; if (i) kk.style.marginLeft = '8px'; r.append(kk); });
      inh.append(r);
    }
    inh.append(mt(S.rmKarte('start', T('home_titel'), () => 'Startseite'), 24));
    const el = h('div', { class: 'seite' }, inh);

    let laeuft = false, letzte = 0, raf = 0;
    const frei = opt.frei || opt.t != null;
    const t0 = performance.now();
    const schritt = now => {
      raf = requestAnimationFrame(schritt);
      if (now - letzte < 33) return; letzte = now;
      const sichtbar = v => { const r = v.canvas.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; };
      for (const v of dreher) if (sichtbar(v)) v.phase(now - t0);
    };
    return {
      el, overlay: { zurueck: false, scroll: el },
      nachEinbau() { for (const v of dreher) v.gr(); if (opt.scroll) el.scrollTop = +opt.scroll; if (!frei && !document.hidden) raf = requestAnimationFrame(schritt); S.autosizeAlle(el); },
      layout() { for (const v of dreher) v.gr(); S.autosizeAlle(el); },
      zerstoere() { cancelAnimationFrame(raf); }, pause() { cancelAnimationFrame(raf); }, weiter() { if (!frei) raf = requestAnimationFrame(schritt); zaehler(); }
    };
  };

  // ---------------------------------------------------------------- Annahmen
  const AN = [['annahme_k1', 'an_k1', 'CH'], ['annahme_k2', 'an_k2', 'AUSLAND'], ['annahme_k3', 'an_k3', 'ANNAHME'], ['annahme_k4', 'an_k4', 'ANNAHME'], ['annahme_k5', 'an_k5', 'UNBELEGT'], ['annahme_k6', 'an_k6', 'ANNAHME'], ['annahme_k7', 'an_k7', 'UNBELEGT'], ['annahme_k8', 'an_k8', 'ANNAHME'], ['annahme_p1', 'an_p1', 'ANNAHME'], ['annahme_p2', 'an_p2', 'ANNAHME']];
  S.ANNAHMEN = AN;
  const STANDKEY = { CH: 'an_stand_ch', AUSLAND: 'an_stand_ausland', ANNAHME: 'an_stand_annahme', UNBELEGT: 'an_stand_unbelegt' };
  S.seiteAnnahmen = function (opt) {
    opt = opt || {};
    const inh = h('div', { class: 'inhalt' });
    const t = S.seitenTitel(T('an_titel'), 28, 56, 156); inh.append(t, S.infoband(T('an_intro'), 15)); inh.lastChild.style.marginTop = '10px';
    for (const [id, pre, stand] of AN) {
      const titel = T(pre + '_titel');
      const k = S.karte(S.text(titel, 18, true), h('div', { style: { marginTop: '6px' } }, h('span', { class: 'stand u-' + stand.toLowerCase(), text: T(STANDKEY[stand]) })),
        h('div', { style: { fontSize: '16px', marginTop: '8px' }, text: T(pre + '_text') }), h('div', { style: { fontSize: '13px', color: 'var(--text2)', marginTop: '6px' }, text: T('an_quelle', T(pre + '_quelle')) }),
        h('div', { style: { marginTop: '10px' } }, S.rmKarte(id, titel, () => titel + ' / ' + T(STANDKEY[stand]))));
      k.style.marginTop = '12px'; inh.append(k);
    }
    const el = h('div', { class: 'seite' }, inh);
    return { el, overlay: { zurueck: true }, nachEinbau() { if (opt.scroll) el.scrollTop = +opt.scroll; S.autosizeAlle(el); }, layout() { S.autosizeAlle(el); }, zerstoere() { } };
  };
})(window);
