/* Spengler-Web: Eingabeseiten Kamineinfassung, Schwanenhals, Dunstrohr. Port von SkizzenActivity.kt (Aufbau, Zustaende, Rechnung ueber kern.js). */
(function (root) {
  'use strict';
  const S = root.S, Ze = root.Ze, K = root.Kern, h = S.h, T = S.T, fmtTrim = Ze.fmtTrim, fmtM2 = S.fmtM2, NT = root.Normteile, EN = root.ENTXT, nz = NT.nz;
  const FARBE = { beleg: '#105E32', annahme: '#965000', unsicher: '#B00020' };

  const DEFS = {
    skizze_kamin: [['k', 'ss_f_k', '500'], ['t', 'ss_f_t', '400'], ['h', 'ss_f_h', '100'], ['sl', 'ss_f_sl', '100'], ['sr', 'ss_f_sr', '100'], ['ah', 'ss_f_ah', '200'], ['av', 'ss_f_av', '150'], ['u', 'ss_f_u_vorne', '15'], ['vw', 'ss_f_vw', '0'], ['o', 'ss_f_o', '15']],
    skizze_hals: [['a', 'ss_f_a', '400'], ['r', 'ss_f_r', '60'], ['s', 'ss_f_steck', '50']],
    skizze_dunst: [['d', 'ss_f_d', '100'], ['h', 'ss_f_hr', '300'], ['n', 'ss_f_n', '30'], ['b', 'ss_f_b', '400'], ['t', 'ss_f_pt', '400'], ['s', 'ss_f_ss', '100'], ['u', 'ss_f_u', '15'], ['o', 'ss_f_o_oben', '15'], ['z', 'ss_f_z', '15']]
  };
  const PRIMAER = { skizze_kamin: ['k', 't', 'h'], skizze_hals: ['a', 'r', 's'], skizze_dunst: ['d', 'h', 'n'] };
  const TITEL = { skizze_kamin: 'ablauf_sk_kamin', skizze_hals: 'ablauf_sk_hals', skizze_dunst: 'ablauf_sk_dunst' };
  const MEHR = { skizze_kamin: 'ss_mehr_kamin', skizze_hals: 'ss_mehr_hals', skizze_dunst: 'ss_mehr_dunst' };
  const ANN = { skizze_kamin: 'ss_annahmen_kamin', skizze_hals: 'ss_annahmen_hals', skizze_dunst: 'ss_annahmen_dunst' };

  /** Die Skizze live im Kopf (SkizzenView). */
  class SkizzenAnsicht {
    constructor(canvas) {
      (S._ansichten = S._ansichten || []).push(this);   // Pruefzugriff der Tests
      this.canvas = canvas; this.bauer = null; this.ansicht = 0; this.arten = [0]; this.beiMass = null; this.beiLeerTipp = null; this._aktiv = null;
      this.von = null; this.ziel = null; this.aktuell = null; this.w = 0; this.h = 0; this.dpr = 1; this.stopp = null;
      canvas.addEventListener('pointerdown', e => { this.d0 = { x: e.clientX, y: e.clientY }; });
      canvas.addEventListener('pointerup', e => {
        if (!this.d0 || Math.hypot(e.clientX - this.d0.x, e.clientY - this.d0.y) >= 24) return;
        const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, z = this.aktuell;
        const f = z ? this.passung(z) : [1, 0, 0];
        const px = (x - f[1]) / f[0], py = (y - f[2]) / f[0];
        // erst nur eintippbare Masse (mindestens 44 x 44 px Tippflaeche, dichte Gruppen: naechste Mitte), sonst irgendein Mass mit Schluessel
        const nur = (kk, ee) => this.editierbar(kk, ee);
        let k = z ? z.trefferMass(px, py, 18 / f[0], 22 / f[0], nur) : null;
        if (k == null && z && !z.fremdeZahlBei(px, py, null, nur)) k = z.treffer(px, py, 18 / f[0], 22 / f[0]);
        if (S.band.offen()) { if (k != null) { S.haptik(8); this._ist3d = false; this.eingabe(k, z.letzterTreffer); } return; }   // Tipp daneben aendert nichts
        if (k != null) { S.haptik(8); if (!this.eingabe(k, z.letzterTreffer)) this.beiMass && this.beiMass(k); } else this.beiLeerTipp && this.beiLeerTipp();
      });
    }
    editierbar(key, e) {
      const feld = this.feldFuer ? this.feldFuer(key) : null; if (!feld || feld.disabled || !e) return false;
      if (String(feld.value).trim() === '') return String(e.text).indexOf('?') >= 0;
      const v = parseFloat(String(feld.value).trim().replace(',', '.')), m = String(e.text).replace(/,/g, '.').match(/\d+(\.\d+)?/g);
      return isFinite(v) && !!m && m.some(x => Math.abs(parseFloat(x) - Math.abs(v)) < 0.051);
    }
    /** Masseingabe (S.band, masse.js): Tipp aufs Mass in 2D, 3D-Pille oder Vollbild. Der Zustand liegt im Feld der Seite (feldFuer). */
    eingabe(key, treffer) {
      const z = this.aktuell; if (!z) return false;
      const e = (treffer && treffer.key === key) ? treffer : z.elems.find(x => x.k === 't' && x.key === key);
      if (!e || !this.editierbar(key, e)) return false;
      return S.band.oeffne(this.quelle(), key);
    }
    eingabeBei(canvas, x, y, key) {
      const feld = this.feldFuer ? this.feldFuer(key) : null;
      if (!feld || feld.disabled) return false;
      this._ist3d = canvas !== this.canvas;
      return S.band.oeffne(this.quelle(), key);
    }
    /** Schnittstelle fuer das Eingabeband. */
    quelle() {
      return this._q || (this._q = {
        feldFuer: k => (this.feldFuer ? this.feldFuer(k) : null),
        schluessel: () => this.schluessel(),
        einheit: k => this.einheit(k),
        platzhalter: k => { const z = this.aktuell, e = z && z.elems.find(x => x.k === 't' && x.key === k); return e ? String(e.text) : ''; },
        aktivSetzen: k => { if (k) this.bandSprung(k); else this.bandRueck(); this.aktiv = k; if (this.beiAktiv) this.beiAktiv(k); },
        neuZeichnen: () => this.zeichnen()
      });
    }
    schluessel() {
      const f = k => (this.feldFuer ? this.feldFuer(k) : null), reihe = (a, b) => { const fa = f(a), fb = f(b); if (!fa || !fb) return 0; return fa.compareDocumentPosition(fb) & 4 ? -1 : 1; };
      let ks = [];
      if (this._ist3d && this.ordnung3d) ks = this.ordnung3d().filter(k => f(k));
      else if (this._start === 0) { for (let i = 1; i < this.arten.length; i++) { const q = this.zeichnungFuer(i); if (q) for (const e of q.elems) if (e.k === 't' && e.key != null && !ks.includes(e.key) && this.editierbar(e.key, e)) ks.push(e.key); } }   // aus der Uebersicht gestartet: Weiter geht durch die Masse aller Ansichten
      else { const z = this.aktuell; if (!z) return []; for (const e of z.elems) if (e.k === 't' && e.key != null && !ks.includes(e.key) && this.editierbar(e.key, e)) ks.push(e.key); }
      return ks.sort(reihe);
    }
    einheit(key) {
      const z = this.aktuell, e = z && z.elems.find(x => x.k === 't' && x.key === key);
      return S.band.einheitVon(this.feldFuer ? this.feldFuer(key) : null, e && e.text);
    }
    /** Eingabeband offen: Die Uebersicht ist zu klein fuer die Masse, es zaehlt die Einzelansicht, in der das Mass steht. Beim Schliessen geht es zurueck in die
     *  Uebersicht, in der man angefangen hat. Die Seite meldet sich mit view.seite = { ist3d, ansicht, waehle }. */
    einzelFuer(key) { for (let i = 1; i < this.arten.length; i++) { const q = this.zeichnungFuer(i); if (q && q.elems.some(e => e.k === 't' && e.key === key && this.editierbar(key, e))) return i; } return -1; }
    bandSprung(key) {
      const s = this.seite; if (!s || s.ist3d() || this.arten[0] !== 0) return;
      if (this._start == null) { if (s.ansicht() !== 0) return; this._start = 0; }
      const i = this.einzelFuer(key); if (i > 0 && i !== s.ansicht()) s.waehle(i);
    }
    bandRueck() {
      const s = this.seite, start = this._start; this._start = null;
      if (s && start === 0 && !s.ist3d() && s.ansicht() !== 0) s.waehle(0);
    }
    set aktiv(v) { if (this._aktiv !== v) { this._aktiv = v; this.zeichnen(); } } get aktiv() { return this._aktiv; }
    groesse(w, hh) {
      const dpr = window.devicePixelRatio || 1;
      if (w === this.w && hh === this.h && dpr === this.dpr) return;
      this.w = w; this.h = hh; this.dpr = dpr; this.canvas.width = Math.max(1, Math.round(w * dpr)); this.canvas.height = Math.max(1, Math.round(hh * dpr));
      this.baue(false);
    }
    zeichnungMit(a, w, hh, t) { return this.bauer ? this.bauer(this.arten[a] == null ? 0 : this.arten[a], w, hh, t || 14) : null; }
    // Auf der Karte liegt oben links der 3D/2D-Schalter: der erste Abschnittstitel der Uebersicht rueckt daneben
    // Mindestschrift der Masse am Handy 15 px (Befund 6): die Zeichnung wird mit groesserer Schrift neu gebaut, die Rechnung bleibt dieselbe.
    zeichnungFuer(a) {
      Ze.kopfEinzug = this.kopfEinzug || 0;
      try {
        const z0 = this.zeichnungMit(a, this.w, this.h, 14); if (!z0) return z0;
        // Die groessere Schrift wird nur uebernommen, wenn sie keine zusaetzlichen Ueberlappungen bringt UND keine Beschriftung kuerzt oder verliert
        // (Fallrohr: "Rohr 2864,9 (Rest)" und das Achsmass 250 muessen in der Uebersicht stehen bleiben). Sonst die groesste Schrift dazwischen, die das erfuellt.
        const zaehle = q => { try { return q.kollisionen().filter(s => /^(Text auf Text|ausserhalb)/.test(s)).length; } catch (e) { return 0; } };
        const satz = q => q.elems.filter(e => e.k === 't').map(e => e.text).sort().join('|');
        const basis = zaehle(z0), inhalt = satz(z0);
        let beste = z0, tb = 14;
        for (let i = 0; i < 4 && this.w <= 700; i++) {
          let mg = Infinity; for (const e of beste.elems) if (e.k === 't' && e.key != null && e.groesse < mg) mg = e.groesse;
          if (!isFinite(mg)) break;
          const px = mg * this.passung(beste)[0]; if (px >= 15) break;
          let hi = Math.min(26, tb * 15.2 / px), gut = null;
          for (let v = 0; v < 4 && hi - tb > 0.3; v++) {
            const zz = this.zeichnungMit(a, this.w, this.h, hi);
            if (zz && zaehle(zz) <= basis && satz(zz) === inhalt) { gut = zz; break; }
            hi = (tb + hi) / 2;
          }
          if (!gut) break;
          beste = gut; tb = hi;
        }
        return beste;
      } finally { Ze.kopfEinzug = 0; }
    }
    passung(z) { return z.anpassung(this.w, this.h, 12, 2.6, 20); }
    baue(animiert) {
      if (!this.w || !this.h) return;
      const neu = this.zeichnungFuer(this.ansicht); if (!neu) return;
      if (this.stopp) { this.stopp(); this.stopp = null; }
      this.von = this.aktuell; this.ziel = neu;
      if (animiert && this.von && !S.bandAn) this.stopp = S.anim(240, S.decel, (e, t) => { this.aktuell = Ze.Zeichnung.mischen(this.von, this.ziel, t); this.zeichnen(); }, () => { this.aktuell = this.ziel; this.zeichnen(); });
      else { this.aktuell = neu; this.zeichnen(); }
    }
    zeichnen() {
      const ctx = this.canvas.getContext('2d'); ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, this.w, this.h);
      const z = this.aktuell; if (!z) return;
      const f = this.passung(z);
      // Masse, die sich hier eintippen lassen, bekommen eine feine Linie darunter (nur in der Live-Ansicht, nicht im Blatt)
      Ze.tippKeys = this.feldFuer ? ((k, e) => this.editierbar(k, e)) : null;
      try { Ze.malen(ctx, z, f[0], f[1], f[2], this._aktiv, 1); } finally { Ze.tippKeys = null; }
    }
  }

  S.SkizzenAnsicht = SkizzenAnsicht;
  S.seiteSkizze = function (art, opt) {
    opt = opt || {};
    const defs = DEFS[art], prim = PRIMAER[art], ist = art;
    const quer = S.vp.quer;
    const st = { werte: {}, winkelWahl: 0, mat: 0, latten: '', deckung: '', notiz: '', mehr: false, ansicht: 0, ist3d: false, nmat: 0, ndn: 100 };
    const pref = k => S.lies(art + '.' + k), setp = (k, v) => S.schreibe(art + '.' + k, v);
    for (const [k, , v] of defs) st.werte[k] = pref(k) != null ? pref(k) : v;
    st.werte.w = pref('w') != null ? pref('w') : '72';
    st.winkelWahl = Math.min(2, Math.max(0, +pref('wahl') || 0));
    st.mat = Math.min(6, Math.max(0, +pref('mat') || 0));
    st.latten = pref('latten') || ''; st.deckung = pref('deckung') || ''; st.notiz = pref('notiz') || '';
    st.mehr = pref('mehr') === 'true';
    st.nmat = Math.min(NT.werkstoffe.length - 1, Math.max(0, +pref('nmat') || 0)); st.ndn = +pref('ndn') || 100;
    if (opt.werte) for (const k in opt.werte) { if (k === 'wahl') st.winkelWahl = Math.min(2, Math.max(0, +opt.werte[k])); else if (k === 'nmat') st.nmat = Math.min(NT.werkstoffe.length - 1, Math.max(0, +opt.werte[k])); else if (k === 'ndn') st.ndn = +opt.werte[k]; else if (k in st.werte) st.werte[k] = opt.werte[k]; }
    if (opt.mehr != null) st.mehr = opt.mehr;
    if (opt.latten != null) st.latten = opt.latten; if (opt.deckung != null) st.deckung = opt.deckung; if (opt.notiz != null) st.notiz = opt.notiz;
    const speichere = () => { for (const k in st.werte) setp(k, st.werte[k]); setp('wahl', st.winkelWahl); setp('mat', st.mat); setp('latten', st.latten); setp('deckung', st.deckung); setp('notiz', st.notiz); setp('mehr', st.mehr); setp('nmat', st.nmat); setp('ndn', st.ndn); };

    const arten = art === 'skizze_dunst' ? [1, 2, 3] : [1, 2];
    const artenAlle = quer ? arten : [0].concat(arten);
    const namen = artenAlle.map(a => a === 0 ? T('ss_uebersicht') : a === 1 ? T('ss_aufriss') : a === 2 ? T(art === 'skizze_hals' ? 'ss_zuschnitt' : 'ss_grundriss') : T('ss_stutzen_wort'));
    const hat3d = art === 'skizze_hals';

    // -------------------------------------------------------- Elemente
    const felder = {}; let winkelFeld = null, winkelSeg = null;
    const zahl = k => { const v = S.parseNum(st.werte[k] == null ? '' : st.werte[k]); return v == null ? NaN : v; };
    const bogenGrad = () => st.winkelWahl === 0 ? 72 : st.winkelWahl === 1 ? 85 : zahl('w');

    const feldBauen = (d, ende) => {
      const f = S.feld(T(d[1]), st.werte[d[0]], { onChange: v => { st.werte[d[0]] = v; aktualisiere(); }, onFokus: an => fokus(d[0], an) });
      felder[d[0]] = f; return f;
    };
    const mehrKnopf = h('button', { class: 'mehrknopf' });
    const mehrBox = h('div', {});
    const extra = defs.filter(d => !prim.includes(d[0]));
    for (let i = 0; i < extra.length; i += 2) {
      const a = feldBauen(extra[i]);
      mehrBox.append(i + 1 < extra.length ? h('div', { style: { marginTop: '6px' } }, S.zweispalt(a, feldBauen(extra[i + 1]))) : h('div', { style: { marginTop: '6px' } }, a));
    }
    const setzeMehr = (an, merken) => {
      st.mehr = an;
      mehrBox.style.display = an && extra.length ? '' : 'none';
      const kz = T(an ? 'ss_weniger' : 'ss_mehr'), info = T(MEHR[art]);
      mehrKnopf.innerHTML = ''; mehrKnopf.append(h('b', {}, S.dreieck(an), kz), h('small', { text: info }));
      mehrKnopf.setAttribute('aria-label', kz + ', ' + info);
    };
    mehrKnopf.addEventListener('click', () => setzeMehr(!st.mehr, true));

    // primaere Felder
    const primBox = h('div', { class: 'primbox' });
    if (quer) primBox.style.cssText = 'padding:0;margin:0';
    if (art === 'skizze_hals') {
      const seg = S.segment(['72°', '85°', T('ss_winkel_eigen')], st.winkelWahl, i => { st.winkelWahl = i; winkelFeld.style.display = i === 2 ? '' : 'none'; if (i === 2) winkelFeld.input.focus(); aktualisiere(); });
      winkelSeg = seg;
      primBox.append(h('div', { class: 'bt', text: T('ss_bogen_titel') }), h('div', { style: { marginTop: '2px' } }, seg));
      winkelFeld = feldBauen(['w', 'ss_f_w', '72']); winkelFeld.style.display = st.winkelWahl === 2 ? '' : 'none'; winkelFeld.style.marginTop = '4px';
      primBox.append(winkelFeld);
    }
    { const pr = h('div', { class: 'primreihe' }, defs.filter(d => prim.includes(d[0])).map(d => feldBauen(d))); primBox.append(S.primHinweis(pr), pr); }
    // Schwanenhals: statt Fertigboegen selber aus Segmenten bauen (Gliederbogen / Schweizerbogen, Nils und Alex 11.11.2026)
    if (art === 'skizze_hals') {
      const zeile = h('div', { class: 'segment', style: { marginTop: '4px' } },
        h('button', { text: T('hals_seg_zwei'), 'aria-label': T('hals_seg_zwei'), onclick: () => S.gehe('schwanenhals-alt') }),
        h('button', { text: T('hals_seg_glieder'), 'aria-label': T('hals_seg_glieder'), onclick: () => S.gehe('rohrbogen') }));
      const bt = h('div', { class: 'bt', text: T('hals_seg_titel') }); bt.style.marginTop = '8px';
      primBox.append(bt, zeile);
    }

    // Kopf
    const karte = h('div', { class: 'skkarte' });
    const cv2 = h('canvas', { 'aria-label': T('ss_live') });
    karte.append(cv2);
    const view = new SkizzenAnsicht(cv2); view.arten = artenAlle;
    let d3 = null, cv3 = null; S.band.karte(karte, { view, d3: () => d3 });
    if (hat3d) {
      cv3 = h('canvas', { 'aria-label': T('d3_beschreibung') }); karte.append(cv3);
      d3 = new root.Szene3D.Ansicht3D(cv3); d3.leerText = T('d3_leer'); d3.fuellend = true; d3.grundZoom = 1.2; d3.grundstellung(0.5, 0.2);
      d3.beiMass3d = (k, rr) => { if (!(rr && view.eingabeBei(cv3, (rr[0] + rr[2]) / 2, (rr[1] + rr[3]) / 2, k))) fokusiere(k); };
      view.ordnung3d = () => d3.pillenOrte.map(p => p[1]).filter((k, i, a) => a.indexOf(k) === i);
      view.beiAktiv = k => { d3.leuchteKey = k; d3.zeichnen(); };
    }
    const kippGross = h('button', { class: 'kippgross', 'aria-label': T('ss_tipp'), onclick: () => vollbild() }, S.iconVollbild());
    if (!quer) karte.append(kippGross);
    let kipp3, kipp2;
    if (hat3d) {
      kipp3 = h('button', { text: '3D', 'aria-label': '3D', onclick: () => setzeModus(true, true) });
      kipp2 = h('button', { text: '2D', 'aria-label': '2D', onclick: () => setzeModus(false, true) });
      karte.append(h('div', { class: 'kipp' }, kipp3, kipp2)); view.kopfEinzug = 122;
    }
    const chips = namen.map((n, i) => h('button', { class: 'chip', text: n, onclick: () => waehleAnsicht(i) }));
    const pdfKnopf = h('button', { class: 'pdfknopf', text: T('ss_ansehen'), 'aria-label': T('ss_ansehen_lang'), onclick: () => pdfErstellen() });
    const reiter = h('div', { class: 'reiterzeile' }, chips, pdfKnopf);
    const titel = h('h1', { class: 'sktitel' }, h('span', { text: T(TITEL[art]) }));
    const titelSpan = titel.firstChild; S.autosizeTitel(titelSpan, 22, 16); titelSpan.style.display = 'block'; titelSpan.style.overflow = 'hidden'; titelSpan.style.width = '100%'; titelSpan.style.fontSize = '22px';
    if (S.opt.kopf === 'alt') { titel.style.height = '44px'; titel.style.alignItems = 'flex-start'; titel.style.lineHeight = '1.34'; }
    const kopf = h('div', { class: 'skkopf' }, quer ? null : titel, reiter, karte, quer ? null : primBox);

    // Leiste
    const leisteLabel = h('div', { class: 'll' }), leisteWert = h('div', { class: 'lw' });
    const teilenKnopf = h('button', { class: 'teilen', text: T('ss_blatt_teilen'), onclick: () => blattTeilen() });
    const leiste = h('div', { class: 'leiste' }, h('div', { class: 'lt' }, leisteLabel, leisteWert), teilenKnopf);
    S.autosize(leisteWert, 16, 26);

    // Scrollinhalt
    const inh = h('div', { class: 'skinhalt' });
    const detail = h('div', { class: 'stat', style: { whiteSpace: 'pre-line', fontSize: '16px' } });
    const status = h('div', { style: { fontSize: '16px', marginTop: '6px' } });
    if (quer) {
      inh.append(S.karte(S.text(T('ss_masse'), 18, true), h('div', {}, primBox, h('div', { style: { marginTop: '12px' } }, mehrKnopf), h('div', { style: { marginTop: '6px' } }, mehrBox))));
    } else if (extra.length) { inh.append(mehrKnopf, h('div', { style: { marginTop: '6px' } }, mehrBox)); }
    if (!extra.length) { mehrKnopf.style.display = 'none'; mehrBox.style.display = 'none'; }
    if (art === 'skizze_kamin') {
      const lat = S.feld(T('ss_latten'), st.latten, { text: true, onChange: v => { st.latten = v; aktualisiere(); } });
      const dec = S.feld(T('ss_deckung'), st.deckung, { text: true, ende: true, onChange: v => { st.deckung = v; aktualisiere(); } });
      const matSp = S.waehler(S.TA('werkstoffe'), st.mat, i => { st.mat = i; aktualisiere(); });
      inh.append(h('div', { style: { marginTop: '10px' } }, S.karte(S.text(T('ss_fragen_titel'), 18, true), h('div', { style: { fontSize: '14px', color: 'var(--text2)' }, text: T('ss_fragen_info') }), lat, dec, S.text(T('l_material'), 16, true), matSp)));
    }
    const L = (de, en) => S.sprache() === 'en' ? en : de;
    // DXF der Abwicklung (nur Dunstrohr: dort liegt die Kontur im Rechenkern vor)
    const dxfName = () => 'Dunstrohr_' + S.zeitName() + '.dxf';
    const dxfBlob = () => new Blob([dxfLiefern()], { type: 'application/dxf' });
    const dxfBox = S.karte(S.text('DXF', 18, true), S.knopf(L('DXF der Abwicklung teilen', 'Share DXF of the flat pattern'), false, () => dxfTeilen()),
      h('div', { style: { fontSize: '14px', marginTop: '8px', color: 'var(--text2)' }, text: L('Abwicklung des Stutzens in mm für CAD und CNC.', 'Flat pattern of the pipe in mm for CAD and CNC.') }));
    dxfBox.classList.add('dxfkarte'); dxfBox.style.display = 'none';
    async function dxfTeilen() { if (!dxfLiefern) { status.textContent = T('status_leer'); return; } const name = dxfName(), r = await S.teilen(dxfBlob(), name, T(TITEL[art])); if (r === 'download') status.textContent = name; }
    const normBox = h('div', {}), materialBox = h('div', {});
    const statusZeile = (sx, q, gr) => h('div', { style: { fontSize: (gr || 12.5) + 'px', color: FARBE[sx], marginTop: '2px' }, text: NT.statusText(sx) + ': ' + EN.t(q) });
    const mtop = (e, px) => { e.style.marginTop = px + 'px'; return e; };
    const chipZeile = (liste, an, zeig, wahl, minB) => { const z = h('div', { style: { display: 'flex', overflowX: 'auto', marginTop: '4px' } }); for (const x of liste) z.append(h('button', { class: 'chip' + (an(x) ? ' an' : ''), text: zeig(x), style: { marginRight: '6px', minWidth: (minB || 64) + 'px', flex: '0 0 auto' }, onclick: () => wahl(x) })); return z; };
    function baueHalsNorm() {
      normBox.innerHTML = ''; const wk = NT.werkstoffe[st.nmat];
      const hint = S.text(NT.hinweisText(), 13, false); hint.style.color = 'var(--text2)'; normBox.append(hint);
      normBox.append(mtop(S.text(L('Werkstoff', 'Material'), 14, true), 10), mtop(S.waehler(NT.werkstoffe.map(w => EN.werkstoff(w.name)), st.nmat, i => { st.nmat = i; baueHalsNorm(); aktualisiere(); }), 4));
      normBox.append(statusZeile(wk.bogenDicke.s, L('Dicke Bogen ', 'Bend thickness ') + wk.bogenDicke.fuer(st.ndn) + '. ' + wk.bogenDicke.q));
      normBox.append(mtop(S.text(L('Rohr (Nennweite)', 'Pipe (nominal size)'), 14, true), 12), chipZeile(NT.durchmesser, d => st.ndn === d.dn, d => String(d.dn), d => { st.ndn = d.dn; baueHalsNorm(); aktualisiere(); }));
      const dd = NT.dnVon(st.ndn); if (dd) normBox.append(statusZeile(dd.s, 'Nenn ' + dd.dn + ': ' + dd.q));
      normBox.append(mtop(S.text(L('Bogenwinkel (Normteile)', 'Bend angle (standard parts)'), 14, true), 12), chipZeile(NT.winkel, w => Math.abs(bogenGrad() - w.grad) < 1e-9, w => w.grad + '°', w => setzeBogenwinkel(w.grad)));
      const nw = NT.winkelVon(bogenGrad());
      normBox.append(nw ? statusZeile(nw.s, nw.grad + '°: ' + nw.q) : statusZeile('unsicher', L('Kein Normwinkel im Katalog: ein solcher Bogen ist kein Fertigteil, Alex prüft.', 'Not a standard angle in the catalogue: such a bend is not a ready-made part, Alex to check.')));
    }
    function setzeBogenwinkel(grad) {
      if (grad === 72) { st.winkelWahl = 0; winkelSeg.setze(0); } else if (grad === 85) { st.winkelWahl = 1; winkelSeg.setze(1); }
      else { st.winkelWahl = 2; st.werte.w = String(grad); winkelFeld.input.value = st.werte.w; winkelSeg.setze(2); }
      winkelFeld.style.display = st.winkelWahl === 2 ? '' : 'none'; baueHalsNorm(); aktualisiere();
    }
    function baueHalsMaterial(ml) {
      materialBox.innerHTML = '';
      ml.zeilen.forEach((z, i) => materialBox.append(mtop(S.text(nz(z.menge, 2) + ' ' + z.einheit + '   ' + z.teil, 15.5, true), i === 0 ? 0 : 12), mtop(S.text(z.detail, 14, false), 1), statusZeile(z.status, z.quelle)));
      materialBox.append(mtop(S.text(L('Summen', 'Totals'), 15, true), 16));
      for (const [l, w] of ml.summen) materialBox.append(mtop(S.text(l + ': ' + w, 14.5, false), 3));
      for (const [sx, tx] of ml.hinweise) materialBox.append(mtop(statusZeile(sx, tx, 13.5), 8));
      baueHalsNorm();
    }
    if (art === 'skizze_hals') baueHalsNorm();
    inh.append(h('div', { style: { marginTop: '10px' } }, S.karte(S.text(T('ss_ergebnis'), 18, true), detail)),
      ...(art === 'skizze_hals' ? [h('div', { style: { marginTop: '10px' } }, S.karte(S.text(L('Normteile wählen', 'Choose standard parts'), 18, true), mtop(normBox, 8))) , h('div', { style: { marginTop: '10px' } }, S.karte(S.text(L('Materialliste', 'Bill of materials'), 18, true), mtop(materialBox, 8))) ] : []),
      h('div', { style: { marginTop: '10px' } }, S.karte(S.text(T('ss_annahmen_titel'), 18, true), S.text(T(ANN[art]), 15))),
      h('div', { style: { marginTop: '10px' } }, dxfBox),
      h('div', { style: { marginTop: '10px' } }, S.karte(S.feld(T('ss_notiz'), st.notiz, { text: true, ende: true, onChange: v => { st.notiz = v; } }))),
      h('div', { style: { marginTop: '12px' } }, S.rmKarte(art, T(TITEL[art]), () => snapshot())),
      status,
      h('div', { style: { marginTop: '12px' } }, S.warnband(T('ss_warn'), 14)));
    const scroll = h('div', { class: 'skscroll' }, inh);
    const el = h('div', { class: 'sk' + (quer ? ' quer' : '') });
    const hoch = !quer && S.kopfScrollt();
    if (quer) el.append(kopf, h('div', { class: 'skrechts' }, scroll, leiste)); else if (hoch) { scroll.prepend(kopf); el.append(scroll, leiste); } else el.append(kopf, scroll, leiste);

    // -------------------------------------------------------- Modus, Ansicht, Fokus
    const zeigeChips = () => chips.forEach((b, i) => b.classList.toggle('an', !st.ist3d && i === st.ansicht));
    // Hochformat-Handy: die Uebersicht braucht mehr Hoehe als eine einzelne Ansicht, 3D und Tastatur bleiben bei 38 %
    function karteHoehe() { if (!hoch) return; karte.style.height = (st.ist3d || S.kompakt() ? S.karteHoch() : S.karteHochFuer(view, st.ansicht, karte.clientWidth)) + 'px'; view.groesse(karte.clientWidth, karte.clientHeight); }
    function setzeModus(an3, merken) {
      if (!d3) return; st.ist3d = an3;
      cv3.style.display = an3 ? '' : 'none'; cv2.style.visibility = an3 ? 'hidden' : 'visible';
      kippGross.style.display = an3 || quer ? 'none' : '';
      kipp3.classList.toggle('an', an3); kipp2.classList.toggle('an', !an3);
      zeigeChips(); karteHoehe(); if (an3) { d3.zeichnen(); } if (merken) setp('m3d', an3);
    }
    function waehleAnsicht(i) {
      if (st.ist3d) { st.ansicht = i; view.ansicht = i; setzeModus(false, true); view.baue(false); return; }
      if (i === st.ansicht) return;
      st.ansicht = i; view.ansicht = i; zeigeChips(); karteHoehe(); view.baue(false); S.haptik(8);
    }
    function fokus(key, an) {
      if (!an) { if (view.aktiv === key) view.aktiv = null; if (d3 && d3.leuchteKey === key) { d3.leuchteKey = null; d3.zeichnen(); } return; }
      view.aktiv = key; if (d3) { d3.leuchteKey = key; d3.zeichnen(); }
      if (!st.ist3d && view.w > 0) {
        const z = view.zeichnungFuer(st.ansicht);
        if (!(z && z.elems.some(e => e.key === key))) for (let i = 0; i < namen.length; i++) if (i !== st.ansicht) { const q = view.zeichnungFuer(i); if (q && q.elems.some(e => e.key === key)) { waehleAnsicht(i); break; } }
      }
    }
    function fokusiere(key) {
      const f = felder[key]; if (!f) return;
      if (!st.mehr && !prim.includes(key) && key !== 'w') setzeMehr(true, true);
      f.input.focus();
    }
    view.beiMass = fokusiere; view.beiLeerTipp = () => vollbild();
    // Eingabeband offen: die Uebersicht ist zu klein fuer die Masse, es zaehlt die Einzelansicht, in der das Mass steht
    view.seite = { ist3d: () => st.ist3d, ansicht: () => st.ansicht, waehle: i => waehleAnsicht(i) };
    view.feldFuer = k => { const f = felder[k]; return f ? f.input : null; };
    // Einzelansichten lassen rechts Platz fuer den Vollbild-Knopf (sonst liegt ein Mass darunter), die Uebersicht nutzt die ganze Breite
    view.passung = z => z.anpassung(st.ansicht === 0 ? view.w : Math.max(160, view.w - 56), view.h, 12, 2.6, 20);

    function vollbild() {
      const ansicht = st.ansicht;
      S.vollbildZeigen((w, hh) => view.zeichnungMit(ansicht, w, hh), view.aktiv, false, view);
    }

    // -------------------------------------------------------- Rechnung
    const fehlerText = m => {
      switch (m.fehler) {
        case 'NICHT_POSITIV': return T('ss_e_pos'); case 'NEGATIV': return T('ss_e_neg'); case 'ZU_GROSS': return T('ss_e_gross');
        case 'ACHSMASS_ZU_KLEIN': return T('ss_e_achs', fmtTrim(2 * zahl('r') * (1 - Math.cos(bogenGrad() * Math.PI / 180)), 1));
        case 'WINKEL_BEREICH': return T(art === 'skizze_hals' ? 'ss_e_winkel_bogen' : 'ss_e_neigung');
        case 'PLATTE_ZU_SCHMAL': return T(m.feld === 'b' ? 'ss_e_schmal' : 'ss_e_kurz');
        case 'ROHR_ZU_NIEDRIG': return T('ss_e_niedrig');
      }
      return String(m.fehler);
    };
    const beschr = () => ({ aufriss: T('ss_aufriss'), grundriss: T('ss_grundriss'), hinten: T('ss_hinten'), vorne: T('ss_vorne'), kamin: T('ss_kamin_wort'), achsmass: T('ss_achsmass'), steckung: T('ss_steckung'), rohr: T('ss_rohr_wort'),
      aufkantung: T('ss_aufkantung'), umschlag: T('ss_umschlag'), ausladung: T('ss_ausladung'), kerbe: T('ss_kerbe'), tiefe: T('ss_tiefe'), hoehe: T('ss_hoehe'), zuschnitt: T('ss_zuschnitt'), stutzen: T('ss_stutzen_wort'), neigung: T('ss_neigung_wort'), umfang: 'Umfang', naht: 'Naht', loch: 'Loch' });
    const datum = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear(); };
    const blattTexte = (label, gross, zeilen, legende, zuschnitt, stutzen) => ({ titel: T(TITEL[art]), datum: datum(), kunde: T('ss_kunde'), ergebnisLabel: label, gross, zeilen, annahmenTitel: T('ss_annahmen_titel'), annahmen: T(ANN[art]), legende,
      aufrissTitel: T('ss_aufriss'), grundrissTitel: T('ss_grundriss'), zuschnittTitel: zuschnitt || '', stutzenTitel: stutzen || '', faltlinie: T('ss_leg_falz'), fuss: T('ss_fuss') });

    let gueltig = false, grossText = '', zeilen = [], seiteBauer = null, weitereSeiten = null, angezeigt = NaN, ergLabel = '', zaehlStopp = null, dxfLiefern = null;
    function zaehleHoch(ziel, text) {
      const von = isNaN(angezeigt) ? ziel : angezeigt;
      if (zaehlStopp) zaehlStopp();
      if (von === ziel) { angezeigt = ziel; leisteWert.textContent = text(ziel); leisteWert.style.transform = ''; return; }
      zaehlStopp = S.anim(320, S.decel, (e, t) => { const x = von + (ziel - von) * t; angezeigt = x; leisteWert.textContent = text(x); const sc = 1 + 0.05 * (1 - Math.abs(2 * t - 1)); leisteWert.style.transform = 'scale(' + sc + ')'; },
        () => { angezeigt = ziel; leisteWert.textContent = text(ziel); leisteWert.style.transform = ''; });
    }
    function aktualisiere() {
      dxfLiefern = null; dxfBox.style.display = 'none';
      let meld;
      if (art === 'skizze_kamin') meld = K.KaminSkizze.pruefe(zahl('k'), zahl('t'), zahl('sl'), zahl('sr'), zahl('ah'), zahl('av'), zahl('h'), zahl('u'), zahl('o'));
      else if (art === 'skizze_hals') meld = K.SchwanenhalsSkizze.pruefe(zahl('a'), bogenGrad(), zahl('r'), zahl('s'));
      else meld = K.DunstrohrSkizze.pruefe(zahl('d'), zahl('b'), zahl('t'), zahl('s'), zahl('h'), zahl('u'), zahl('n'), zahl('z'), zahl('o'));
      for (const k in felder) { const m = meld.find(x => x.feld === k); felder[k].fehler(m ? fehlerText(m) : null); }
      if (art === 'skizze_hals' && st.winkelWahl !== 2 && winkelFeld) winkelFeld.fehler(null);
      if (meld.length) {
        gueltig = false; leisteLabel.textContent = T('ss_leiste_leer'); leisteWert.textContent = '-'; angezeigt = NaN;
        detail.textContent = fehlerText(meld[0]); seiteBauer = null; weitereSeiten = null; grossText = ''; zeilen = []; if (art === 'skizze_hals') materialBox.innerHTML = '';
        cv2.style.opacity = S.dimm(); if (cv3) cv3.style.opacity = S.dimm(); teilenKnopf.disabled = true; teilenKnopf.style.opacity = .5; return;
      }
      cv2.style.opacity = 1; if (cv3) cv3.style.opacity = 1; teilenKnopf.disabled = false; teilenKnopf.style.opacity = 1; gueltig = true;
      const lb = beschr(), breitSchirm = 420, Bl = root.Blatt;
      const teilTxt = (t, name, key) => T(key, name, fmtTrim(t.breite, 1), fmtTrim(t.tiefe, 1), fmtTrim(t.kerbeBreite, 1), fmtTrim(t.kerbeTiefe, 1), fmtM2(t.gesamtM2));
      weitereSeiten = null;
      if (art === 'skizze_kamin') {
        const k = K.KaminSkizze(zahl('k'), zahl('t'), zahl('sl'), zahl('sr'), zahl('ah'), zahl('av'), zahl('h'), zahl('u'), zahl('o'));
        { const wv = zahl('vw'); k.winkelVorne = isFinite(wv) && wv > 0 ? Math.min(wv, 180) : 0; }   // 0 = flacher Umschlag, sonst Abkantung im Winkel
        view.bauer = (a, w, hh, t) => a === 0 ? Ze.kaminBlatt(k, w, hh, t, lb, w >= breitSchirm) : a === 1 ? Ze.kaminAufriss(k, w, hh, t, lb, w >= breitSchirm) : Ze.kaminGrundriss(k, w, hh, t, lb);
        zeilen = [teilTxt(k.hinten, T('ss_hinten'), 'ss_kamin_teil'), teilTxt(k.vorne, T('ss_vorne'), 'ss_kamin_teil'), T('ss_kamin_falz', fmtTrim(k.hinten.faltLaengeMm, 1), fmtTrim(zahl('h'), 1))];
        grossText = T('ss_kamin_gross', fmtM2(k.gesamtM2)); ergLabel = T('ss_ergebnis_kamin');
        zaehleHoch(k.gesamtM2, v => fmtM2(v) + ' m²');
        seiteBauer = () => {
          const z = [teilTxt(k.hinten, T('ss_hinten'), 'ss_blatt_teil'), teilTxt(k.vorne, T('ss_vorne'), 'ss_blatt_teil'), T('ss_kamin_falz', fmtTrim(k.hinten.faltLaengeMm, 1), fmtTrim(zahl('h'), 1)),
            T('ss_pdf_material', S.TA('werkstoffe')[st.mat]), T('ss_pdf_latten', st.latten.trim() || '?', st.deckung.trim() || '?')];
          if (st.notiz.trim()) z.push(st.notiz);
          return Bl.kamin(k, blattTexte(ergLabel, fmtM2(k.gesamtM2) + ' m²', z, [['BLECH', T('ss_leg_blech')], ['AUFKANT', T('ss_aufkantung')], ['UMSCHLAG', T('ss_umschlag')]]), lb);
        };
      } else if (art === 'skizze_hals') {
        const hs = K.SchwanenhalsSkizze(zahl('a'), bogenGrad(), zahl('r'), zahl('s'));
        view.bauer = (a, w, hh, t) => a === 0 ? Ze.halsBlatt(hs, w, hh, t, lb) : a === 1 ? Ze.halsAufriss(hs, w, hh, t, lb) : Ze.halsZuschnitt(hs, w, hh, t, lb);
        grossText = T('ss_hals_gross', fmtTrim(hs.rohrZuschnitt, 1));
        zeilen = [T('ss_hals_detail', fmtTrim(hs.luecke, 1), fmtTrim(hs.steckung, 1), fmtTrim(hs.neigungZurWaagrechten, 1), fmtTrim(hs.hoehe, 1))];
        ergLabel = T('ss_ergebnis_hals'); zaehleHoch(hs.rohrZuschnitt, v => fmtTrim(v, 1) + ' mm');
        const ml = EN.liste(NT.hals(hs, { dn: st.ndn, werkstoff: NT.werkstoffe[st.nmat].id, rinneStueck: 5000, rohrStueck: 2000 }));
        baueHalsMaterial(ml);
        weitereSeiten = () => { const tx = blattTexte(ergLabel, fmtTrim(hs.rohrZuschnitt, 1) + ' mm', zeilen, []); tx.titel = T('ablauf_sk_hals') + ': ' + L('Materialliste', 'Bill of materials');
          return root.Blatt.neu.material(ml, [], tx, { summen: L('Summen', 'Totals'), hinweise: L('Hinweise', 'Notes'), annahmen: T('ss_annahmen_titel'), status: sx => NT.statusText(sx), beleg: () => NT.statusText('beleg') }); };
        seiteBauer = () => { const z = zeilen.slice(); if (st.notiz.trim()) z.push(st.notiz);
          return Bl.hals(hs, blattTexte(ergLabel, fmtTrim(hs.rohrZuschnitt, 1) + ' mm', z, [['AUFKANT', T('ss_leg_bogen')], ['BLECH', T('ss_leg_rohr')], ['UMSCHLAG', T('ss_leg_steckung')]], T('ss_zuschnitt')), lb); };
      } else {
        const d = K.DunstrohrSkizze(zahl('d'), zahl('b'), zahl('t'), zahl('s'), zahl('h'), zahl('u'), zahl('n'), zahl('z'), zahl('o'));
        dxfLiefern = () => root.Dxf.dunst(d, T(TITEL[art])); dxfBox.style.display = '';
        view.bauer = (a, w, hh, t) => a === 0 ? Ze.dunstBlatt(d, w, hh, t, lb, w >= breitSchirm) : a === 1 ? Ze.dunstAufriss(d, w, hh, t, lb, w >= breitSchirm) : a === 2 ? Ze.dunstGrundriss(d, w, hh, t, lb) : Ze.dunstStutzen(d, w, hh, t, lb);
        grossText = T('ss_dunst_gross', fmtTrim(d.stutzenBreite, 1), fmtTrim(d.rohrHoehe, 1));
        zeilen = [T('ss_dunst_detail', fmtTrim(d.hoeheHoch, 1), fmtTrim(d.hoeheTief, 1), fmtTrim(d.lochQuer, 1), fmtTrim(d.lochLaengs, 1), fmtM2(d.plattenMm2 / 1e6), fmtM2(d.gesamtM2))];
        ergLabel = T('ss_ergebnis_dunst'); zaehleHoch(d.stutzenBreite, v => fmtTrim(v, 1) + ' × ' + fmtTrim(d.rohrHoehe, 1) + ' mm');
        seiteBauer = () => { const z = zeilen.slice(); if (st.notiz.trim()) z.push(st.notiz);
          return Bl.dunst(d, blattTexte(ergLabel, fmtTrim(d.stutzenBreite, 1) + ' × ' + fmtTrim(d.rohrHoehe, 1) + ' mm', z, [['BLECH', T('ss_leg_blech')], ['AUFKANT', T('ss_leg_streifen')], ['UMSCHLAG', T('ss_umschlag')]], null, T('ss_stutzen_wort')), lb); };
      }
      leisteLabel.textContent = ergLabel; view.baue(true); baue3d(); detail.textContent = zeilen.join('\n');
    }
    function baue3d() {
      if (!d3) return;
      const sz = root.Szene3D.Skizzen3D.schwanenhals(zahl('a'), bogenGrad(), zahl('r'), zahl('s'));
      d3.szene = sz.szene; d3.masse3d = sz.masse; d3.zeichnen();
    }
    const snapshot = () => { let s = ''; for (const k in st.werte) s += k + '=' + st.werte[k] + ' '; if (art === 'skizze_hals') s += 'bogen=' + fmtTrim(bogenGrad(), 1);
      if (art === 'skizze_kamin') s += '\nLattenabstand: ' + st.latten + ', Deckungsart: ' + st.deckung + ', Material: ' + S.TA('werkstoffe')[st.mat]; if (grossText) s += '\n' + grossText; return s; };

    // -------------------------------------------------------- Blatt, PDF
    const zeitName = () => S.zeitName();
    async function blattDatei() { if (!seiteBauer) return null; const z = seiteBauer(); const blob = weitereSeiten ? await root.Blatt.alsPngSeiten([z].concat(weitereSeiten()), 2) : await root.Blatt.alsPng(z, 2); return { blob, name: art + '_' + zeitName() + '.png' }; }
    async function blattTeilen() {
      let d; try { d = await blattDatei(); } catch (e) { d = null; }
      if (!d) { status.textContent = T(gueltig ? 'status_pdf_fehler' : 'status_leer'); return; }
      status.textContent = ''; S.haptik(20);
      const vorher = teilenKnopf.textContent; teilenKnopf.textContent = '✓  ' + T('ss_blatt_fertig'); teilenKnopf.classList.add('ok');
      teilenKnopf.style.transform = 'scale(1.05)'; setTimeout(() => { teilenKnopf.style.transform = ''; }, 140);
      const dx = dxfLiefern ? { blob: dxfBlob(), name: dxfName() } : null;
      setTimeout(async () => { const r = await S.teilen(d.blob, d.name, T(TITEL[art]), dx ? [dx] : undefined); if (r === 'download') status.textContent = d.name + (dx ? ', ' + dx.name : ''); }, 420);
      setTimeout(() => { teilenKnopf.textContent = vorher; teilenKnopf.classList.remove('ok'); }, 2200);
    }
    async function pdfErstellen(ohnePush) {
      let d; try { d = await blattDatei(); } catch (e) { d = null; }
      if (!d) { status.textContent = T(gueltig ? 'status_pdf_fehler' : 'status_leer'); return; }
      status.textContent = ''; S.pdfDialog(d.blob, d.name, T('profil_share_titel'), m => { status.textContent = m; }, ohnePush);
    }

    // -------------------------------------------------------- Layout (kopfAnpassen, Tastatur, Sichtbarkeit)
    function layout() {
      const vp = S.vp;
      const insTop = S.inset('top'), { rand, kompakt } = S.layoutRahmen(el, leiste);
      if (!quer) {
        const anteil = art === 'skizze_hals' ? 0.84 : 0.80, tAnteil = 0.52;
        const wunsch = vp.voll * (vp.tastatur ? tAnteil : anteil);
        const frei = vp.h - insTop - rand - (kompakt ? 0 : leiste.offsetHeight);
        let kh = wunsch;
        if (frei > 0 && S.opt.kopf !== 'alt') { kh = Math.min(wunsch, Math.max(300, frei - 96)); }   // wie Android Ui.kt kopfAnpassen: 96 dp der naechsten Karte lugen hervor
        if (kompakt && frei > 0) kh = frei;
        if (hoch) { kopf.style.height = ''; karte.style.flex = 'none'; karteHoehe(); } else kopf.style.height = kh + 'px';
        const klein = !hoch && (kompakt || kh < 420);   // wie Android TeilKopf: Kopf unter 420 dp oder Tastatur = Titel und Reiter weg
        titel.style.visibility = klein ? 'hidden' : ''; reiter.style.visibility = klein ? 'hidden' : ''; titel.style.display = reiter.style.display = kompakt && hoch ? 'none' : '';
      }
      view.groesse(karte.clientWidth, karte.clientHeight);
      if (d3) d3.setzeGroesse(karte.clientWidth, karte.clientHeight, window.devicePixelRatio || 1);
      S.autosizeAlle(el);
    }
    const ro = new ResizeObserver(() => { karteHoehe(); view.groesse(karte.clientWidth, karte.clientHeight); if (d3) d3.setzeGroesse(karte.clientWidth, karte.clientHeight, window.devicePixelRatio || 1); });
    ro.observe(karte);

    // Start
    setzeMehr(st.mehr && extra.length > 0, false);
    const wunschAnsicht = opt.ansicht;
    if (wunschAnsicht != null && wunschAnsicht !== '3d' && wunschAnsicht !== '2d') {
      const nr = { uebersicht: 0, aufriss: 1, grundriss: 2, zuschnitt: 2, stutzen: 3 }[wunschAnsicht]; const idx = artenAlle.indexOf(nr);
      st.ansicht = idx >= 0 ? idx : 0;
    }
    view.ansicht = st.ansicht; zeigeChips();
    if (d3) { const wunsch = wunschAnsicht === '3d' ? true : wunschAnsicht != null && wunschAnsicht !== '' ? false : (pref('m3d') != null ? pref('m3d') === 'true' : true); setzeModus(wunsch, false); }
    // Erst aktualisieren, wenn das Element im DOM ist (Groesse), siehe nachEinbau
    return {
      el, art,
      nachEinbau() { layout(); aktualisiere(); if (d3) { d3.zeichnen(); } if (opt.fokus) setTimeout(() => { const f = felder[opt.fokus]; if (f) { if (!st.mehr && !prim.includes(opt.fokus) && opt.fokus !== 'w') setzeMehr(true, false); f.input.focus(); layout(); } }, 30); if (opt.scroll) scroll.scrollTop = +opt.scroll; if (opt.dialog === 'pdf') pdfErstellen(true); if (opt.dialog === 'vollbild') vollbild(); },
      kontext() { return { ansicht: st.ist3d ? '3D' : namen[st.ansicht], eingaben: snapshot().replace(/\n/g, ' | ') }; },
      layout, speichere, zerstoere() { speichere(); ro.disconnect(); if (zaehlStopp) zaehlStopp(); },
      overlay: { zurueck: true }
    };
  };
})(window);
