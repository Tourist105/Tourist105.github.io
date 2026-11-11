/* Spengler-Web: gemeinsamer Rahmen der "Weitere Teile"-Seiten (Port von seiteMitLeiste, liveKopfBauen, leiste, Einheit, Werkstoff-Listen)
 * und die Seite Gekantetes Profil (Port von ProfilActivity.kt, ProfilSkizze.kt, kern/Profil.kt). */
(function (root) {
  'use strict';
  const S = root.S, K = root.Kern, h = S.h, T = S.T, Ze = root.Ze, fmtTrim = Ze.fmtTrim, fmt = Ze.fmt;

  // ---------------------------------------------------------------- Einheit (Format.kt)
  const EINH = [{ kurz: 'cm', proCm: 1, stellen: 1 }, { kurz: 'mm', proCm: 10, stellen: 0 }, { kurz: 'in', proCm: 1 / 2.54, stellen: 2 }];
  S.Einheit = {
    liste: EINH,
    zuCm: (e, x) => x / EINH[e].proCm, ausCm: (e, cm) => cm * EINH[e].proCm,
    text: (e, cm) => fmtTrim(cm * EINH[e].proCm, EINH[e].stellen + 1),
    mit: (e, cm) => fmtTrim(cm * EINH[e].proCm, EINH[e].stellen + 1) + ' ' + EINH[e].kurz,
    umrechnen: (von, nach, s) => { const n = S.parseNum(s); return n == null ? s : S.Einheit.text(nach, S.Einheit.zuCm(von, n)); }
  };
  S.fmtKg = kg => fmt(kg, kg < 10 ? 2 : 1);
  S.mmUndZoll = cm => fmtTrim(cm * 10, 1) + ' mm (' + fmt(cm / 2.54, 2) + ' in)';

  // ---------------------------------------------------------------- Werkstoff, Dicke (Rechnung.kt)
  const WS = () => K.WERKSTOFFE;
  S.dickenReihenfolge = mat => { const d = WS()[mat].dicken; return d.map((_, i) => i).sort((a, b) => d[a] - d[b] || a - b); };
  const istSonder = (mat, i) => { const w = WS()[mat]; return w.sonder.some(s => Math.abs(s - w.dicken[i]) < 1e-9); };
  S.dickeStandard = mat => { const r = S.dickenReihenfolge(mat); const x = r.find(i => !istSonder(mat, i)); return x == null ? 0 : x; };
  S.dickenTexte = mat => S.dickenReihenfolge(mat).map(i => { const d = WS()[mat].dicken[i]; return fmtTrim(d, 2) + ' mm (' + fmt(d / 25.4, 3) + ' in)' + (istSonder(mat, i) ? ', ' + T('dicke_sonder') : ''); });
  S.werkstoffWarnungen = mat => mat === 0 ? [T('warn_kalt')] : mat === 1 ? [T('warn_kupfer_zink')] : [];
  S.waehlerFuelle = (box, liste, start) => {
    const sel = box.querySelector('select'); sel.innerHTML = '';
    liste.forEach((t, i) => sel.append(h('option', { value: i, text: t })));
    sel.value = String(start);
  };

  // ---------------------------------------------------------------- Rahmen (seiteMitLeiste + liveKopfBauen + leiste)
  /**
   * Feste Kopfzone (Titel 44 dp, Karte mit Live-Bild), scrollbarer Inhalt, feste Leiste unten.
   * Hochformat 270 dp Kopf, Tastatur 210 dp, Querformat 150 dp (kopfDp, kopfTastaturDp, kopfQuerDp in Ui.kt).
   */
  S.altSeite = function (titel, leisteKnopfText, beiLeiste) {
    const quer = S.vp.quer;
    const t = h('div', { class: 'sktitel alt' }, h('span', { text: titel }));
    const ts = t.firstChild; S.autosize(ts, 18, 24); ts.style.display = 'block'; ts.style.overflow = 'hidden'; ts.style.width = '100%'; ts.style.fontSize = '24px';
    const karte = h('div', { class: 'skkarte' });
    const kopf = h('div', { class: 'skkopf' }, t, karte);
    const inh = h('div', { class: 'skinhalt' });
    const scroll = h('div', { class: 'skscroll' }, inh);
    const lt = h('div', { class: 'at' }), ld = h('div', { class: 'ad' });
    const knopf = h('button', { class: 'teilen', text: leisteKnopfText, onclick: () => beiLeiste && beiLeiste() });
    const leiste = h('div', { class: 'leiste alt' }, h('div', { class: 'lt' }, lt, ld), knopf);
    if (quer) ld.style.display = 'none';
    const hoch = !quer && S.kopfScrollt();
    const el = h('div', { class: 'sk alt' }, scroll, leiste);
    if (hoch) scroll.prepend(kopf); else el.prepend(kopf);
    const tag = (text, cls) => { const e = h('div', { class: 'kopftag ' + cls, text }); karte.append(e); return e; };
    const r = { el, inh, kopf, karte, scroll, leiste, lt, ld, knopf, tag, onGroesse: null };
    r.layout = () => {
      const vp = S.vp;
      leiste.style.display = vp.tastatur ? 'none' : '';
      const insBot = S.inset('bottom');
      el.style.paddingBottom = (vp.tastatur ? Math.max(vp.ime, 0) : insBot) + 'px';
      const hoeheKopf = quer ? 150 : vp.tastatur ? 210 : 270;
      kopf.style.height = (hoch ? Math.min(hoeheKopf, S.karteHoch()) : hoeheKopf) + 'px';
      if (r.onGroesse) r.onGroesse(karte.clientWidth, karte.clientHeight);
      S.autosizeAlle(el);
    };
    r.ro = new ResizeObserver(() => { if (r.onGroesse) r.onGroesse(karte.clientWidth, karte.clientHeight); });
    r.ro.observe(karte);
    return r;
  };
  S.mt = (e, px) => { e.style.marginTop = px + 'px'; return e; };
  S.grau = (t, gr) => h('div', { style: { fontSize: (gr || 14) + 'px', color: 'var(--text2)' }, text: t });
  S.setzeScroll = (r, opt) => { if (opt.scroll) r.scroll.scrollTop = +opt.scroll; };

  // ---------------------------------------------------------------- kern/Profil.kt (Port)
  const Profil = (function () {
    const rad = d => d * Math.PI / 180, ABC = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';
    const kFaktor = (r, t) => 0.65 + 0.5 * Math.log10(r / t);
    function ausgleich(b, r, t) {
      if (b < 15 || b > 180) return NaN; if (b > 165) return 0;
      const al = 180 - b, bogen = Math.PI * al / 180 * (r + t / 2 * kFaktor(r, t));
      return b >= 90 ? 2 * (r + t) * Math.tan(rad(al / 2)) - bogen : 2 * (r + t) - bogen;
    }
    const abzug = (e, k) => e.modus === 0 ? ausgleich(k.oeffnung, e.radius, e.dicke) : e.modus === 1 ? 2 * e.dicke : e.eigen;
    function pruefe(e) {
      const m = []; if (!e.schenkel.length) { m.push({ f: 'pf_kein_schenkel' }); return m; }
      if (e.schenkel.length > 12) m.push({ f: 'pf_zu_viele' });
      e.schenkel.forEach((s, i) => { if (!(s > 0)) m.push({ f: 'pf_schenkel_null', i }); });
      e.knicke.forEach((k, i) => { if (!(k.oeffnung >= 15 && k.oeffnung <= 180)) m.push({ f: 'pf_winkel', i }); });
      if (!(e.dicke > 0)) m.push({ f: 'pf_dicke' }); if (e.modus === 0 && !(e.radius > 0)) m.push({ f: 'pf_radius' }); if (!(e.laenge > 0)) m.push({ f: 'pf_laenge' }); if (e.stueck < 1) m.push({ f: 'pf_stueck' });
      return m;
    }
    function rechne(e) {
      const summe = e.schenkel.reduce((a, b) => a + b, 0); let abz = 0; const bieg = [], kurz = [];
      e.knicke.forEach((k, i) => { const a = abzug(e, k); abz += a; const um = k.oeffnung <= 45; bieg.push({ nr: i + 1, von: ABC[i], nach: ABC[i + 1], oeffnung: k.oeffnung, links: k.links, abzug: a, umschlag: um });
        if (um) { const rand = i + 1 === e.schenkel.length - 1 ? i + 1 : i === 0 ? 0 : -1; if (rand >= 0 && e.schenkel[rand] < 15 && !kurz.includes(rand)) kurz.push(rand); } });
      const breite = summe - abz, m2 = breite * e.laenge / 1e6 * e.stueck, kg = m2 * e.dicke * e.dichte;
      return { summe, breite, bieg, m2, kg, ueberTafel: breite > 1000, ueberRolle: breite > 1250, kurz };
    }
    function punkte(e) {
      if (!e.schenkel.length) return [[0, 0]];
      const ri = []; let hh = 0;
      e.schenkel.forEach((_, i) => { ri.push(hh); const k = e.knicke[i]; if (k) hh += (k.links ? 1 : -1) * (180 - k.oeffnung); });
      let l = 0; e.schenkel.forEach((s, i) => { if (s > e.schenkel[l] + 1e-9) l = i; });
      const dr = -ri[l], p = [[0, 0]]; let x = 0, y = 0;
      e.schenkel.forEach((s, i) => { const w = rad(ri[i] + dr); x += s * Math.cos(w); y += s * Math.sin(w); p.push([x, y]); });
      return p;
    }
    return { rechne, pruefe, punkte, ABC, buchstabe: i => i >= 0 && i < ABC.length ? ABC[i] : '?' };
  })();
  S.Profil = Profil;

  /** ProfilZeichner.zeichne: flaeche = [links, oben, rechts, unten] in Pixeln, dichte = 1 (1 dp = 1 px), schrift in px. */
  function zeichneProfil(ctx, e, fl, dichte, schrift, blass) {
    if (!e.schenkel.length) return;
    const pt = Profil.punkte(e), rand = 38 * dichte;
    const xs = pt.map(p => p[0]), ys = pt.map(p => p[1]), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const bw = Math.max(maxX - minX, 1), bh = Math.max(maxY - minY, 1), aw = (fl[2] - fl[0]) - 2 * rand, ah = (fl[3] - fl[1]) - 2 * rand;
    if (aw <= 0 || ah <= 0) return;
    const s = Math.fround(Math.min(aw / bw, ah / bh)), ox = fl[0] + rand + (aw - bw * s) / 2, oy = fl[1] + rand + (ah - bh * s) / 2;
    const px = p => ox + (p[0] - minX) * s, py = p => oy + (maxY - p[1]) * s;
    const blau = blass ? 'rgba(11,92,171,.431)' : '#0B5CAB', text = blass ? 'rgba(20,28,38,.549)' : '#141C26';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = blau; ctx.lineWidth = 3.5 * dichte; ctx.beginPath(); ctx.moveTo(px(pt[0]), py(pt[0])); for (let i = 1; i < pt.length; i++) ctx.lineTo(px(pt[i]), py(pt[i])); ctx.stroke();
    ctx.fillStyle = blau;
    for (const q of [pt[0], pt[pt.length - 1]]) { ctx.beginPath(); ctx.arc(px(q), py(q), 3.5 * dichte, 0, 2 * Math.PI); ctx.fill(); }
    const cx = pt.reduce((a, p) => a + px(p), 0) / pt.length, cy = pt.reduce((a, p) => a + py(p), 0) / pt.length;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const beschrifte = (t, x, y, gr, farbe) => { ctx.font = '700 ' + gr + 'px Roboto, sans-serif'; ctx.lineWidth = 4 * dichte; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round'; ctx.strokeText(t, x, y); ctx.fillStyle = farbe; ctx.fillText(t, x, y); };
    e.schenkel.forEach((sc, i) => {
      const x1 = px(pt[i]), y1 = py(pt[i]), x2 = px(pt[i + 1]), y2 = py(pt[i + 1]), mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      let nx = -(y2 - y1), ny = x2 - x1; const len = Math.max(Math.hypot(nx, ny), 1e-3); nx /= len; ny /= len;
      if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
      const d = 14 * dichte + schrift * 0.45;
      beschrifte(Profil.buchstabe(i) + ' ' + fmtTrim(sc, 1), mx + nx * d, my + ny * d + schrift * 0.35, schrift, text);
    });
    const rr = 15 * dichte;
    e.knicke.forEach((k, i) => {
      const vx = px(pt[i + 1]), vy = py(pt[i + 1]), ux = px(pt[i]) - vx, uy = py(pt[i]) - vy, wx = px(pt[i + 2]) - vx, wy = py(pt[i + 2]) - vy;
      const au = Math.atan2(uy, ux) * 180 / Math.PI, aw2 = Math.atan2(wy, wx) * 180 / Math.PI;
      let sweep = aw2 - au; while (sweep > 180) sweep -= 360; while (sweep <= -180) sweep += 360;
      const bogenF = blass ? 'rgba(226,128,20,.431)' : '#E28014';
      ctx.strokeStyle = bogenF; ctx.lineWidth = 1.8 * dichte; ctx.beginPath(); ctx.arc(vx, vy, rr, au * Math.PI / 180, (au + sweep) * Math.PI / 180, sweep < 0); ctx.stroke();
      const mitte = (au + sweep / 2) * Math.PI / 180;
      if (Math.abs(k.oeffnung - 90) < 0.05) { ctx.fillStyle = bogenF; ctx.beginPath(); ctx.arc(vx + Math.cos(mitte) * rr * 0.55, vy + Math.sin(mitte) * rr * 0.55, 1.6 * dichte, 0, 2 * Math.PI); ctx.fill(); }
      else beschrifte(fmtTrim(k.oeffnung, 1) + '°', vx + Math.cos(mitte) * (rr + schrift * 0.8), vy + Math.sin(mitte) * (rr + schrift * 0.8) + schrift * 0.35, schrift * 0.9, blass ? 'rgba(150,80,10,.549)' : '#965010');
    });
  }

  // ---------------------------------------------------------------- Seite Gekantetes Profil
  const VORLAGEN = [{ n: 'vl_winkel', s: [100, 120, 15], w: [90, 45], l: [false, true] }, { n: 'vl_mauer', s: [15, 40, 300, 40, 15], w: [45, 90, 90, 45], l: [false, false, false, false] },
    { n: 'vl_z', s: [30, 60, 30], w: [90, 90], l: [false, true] }, { n: 'vl_leer', s: [100], w: [], l: [] }];

  S.seiteProfil = function (opt) {
    const primBox0 = h('div', { class: 'primbox' }), schenkelReihe = h('div', { class: 'primreihe', style: { overflowX: 'auto' } });
    primBox0.append(schenkelReihe);
    const R = S.weitereShell({ titel: T('profil_titel'), tabs: [T('ansicht_skizze'), T('ss_zuschnitt')], dreiD: -1, primBox: primBox0, beiPdf: () => pdfErstellen(), beiTeilen: () => blattTeilen(), anteil: 0.80 });
    const { inh } = R, mt = S.mt, grau = S.grau, text = S.text;
    const st = { schenkel: [], winkel: [], links: [], mat: 0, dicke: 2, laenge: '1000', stueck: '1', modus: 0, radius: '', eigen: '1.4', mehr: false };
    const lade = () => { try { const j = JSON.parse(S.lies('profil.state')); if (j && Array.isArray(j.schenkel) && j.schenkel.length) Object.assign(st, j); } catch (e) { /* frisch */ } };
    const vorlageLaden = i => { const v = VORLAGEN[i]; st.schenkel = v.s.map(x => fmtTrim(x, 1)); st.winkel = v.w.map(x => fmtTrim(x, 1)); st.links = v.l.slice(); };
    vorlageLaden(0); lade();
    st.mat = Math.min(6, Math.max(0, st.mat | 0)); st.dicke = Math.min(WS()[st.mat].dicken.length - 1, Math.max(0, st.dicke | 0));
    const speichere = () => S.schreibe('profil.state', JSON.stringify(st));

    let letzteGueltig = null;
    // Seite
    const ergTitel = text(T('profil_ergebnis_titel'), 18, true), zuschnitt = text('', 24, true), summe = grau('', 15), meldungBox = h('div', { class: 'flexspalte' }), folge = text('', 16), liste = text('', 16);
    const winkelBox = h('div', { class: 'flexspalte' });
    zuschnitt.style.color = 'var(--pri-dunkel)';
    const status = text('', 16); status.style.minHeight = '19px';
    let letzteEingabe = null, letztes = null, schenkelFelder = [], winkelFelder = [];
    const num = v => { const x = S.parseNum(v); return x == null ? 0 : x; };
    const vl = S.waehler([T('profil_vorlage') + ' ...'].concat(VORLAGEN.map(v => T(v.n))), 0, i => { if (i > 0) { vorlageLaden(i - 1); reihenBauen(); aktualisiere(); } vl.querySelector('select').value = '0'; });
    const plus = S.knopf(T('profil_plus_schenkel'), false, () => schenkelPlus(false));
    const umsch = S.knopf(T('profil_plus_umschlag'), false, () => schenkelPlus(true));
    const minus = S.knopf(T('profil_minus'), false, () => schenkelMinus());
    // Profil selber aufbauen, gleich unter der Zeichnung statt unten in der Winkelkarte (Alex 11.11.2026: Profile selber erstellen)
    { const bt = h('div', { class: 'bt', text: T('profil_bauen_titel') }); bt.style.marginTop = '8px';
      primBox0.append(bt, h('div', { class: 'segment', style: { marginTop: '2px' } },
        h('button', { text: T('profil_plus_kurz'), 'aria-label': T('profil_plus_schenkel'), onclick: () => schenkelPlus(false) }),
        h('button', { text: T('profil_umschlag_kurz'), 'aria-label': T('profil_plus_umschlag'), onclick: () => schenkelPlus(true) }),
        h('button', { text: T('profil_minus_kurz'), 'aria-label': T('profil_minus'), onclick: () => schenkelMinus() }))); }
    const matSp = S.waehler(S.TA('werkstoffe'), st.mat, i => { if (i !== st.mat) { st.mat = i; st.dicke = S.dickeStandard(i); S.waehlerFuelle(dickeSp, S.dickenTexte(i), S.dickenReihenfolge(i).indexOf(st.dicke)); aktualisiere(); } });
    const dickeSp = S.waehler(S.dickenTexte(st.mat), S.dickenReihenfolge(st.mat).indexOf(st.dicke), p => { const idx = S.dickenReihenfolge(st.mat)[p]; if (idx != null && idx !== st.dicke) { st.dicke = idx; aktualisiere(); } });
    const lf = S.feld(T('profil_laenge'), st.laenge, { onChange: v => { st.laenge = v; aktualisiere(); } });
    const sf = S.feld(T('profil_stueck'), st.stueck, { onChange: v => { st.stueck = v; aktualisiere(); } }); sf.input.setAttribute('inputmode', 'numeric');
    const modusInfo = grau('', 14);
    const radiusF = S.feld(T('profil_radius'), st.radius, { onChange: v => { st.radius = v; aktualisiere(); } });
    const eigenF = S.feld(T('profil_eigen'), st.eigen, { onChange: v => { st.eigen = v; aktualisiere(); } });
    const modusSeg = S.segment([T('profil_modus_din'), T('profil_modus_faust'), T('profil_modus_eigen')], st.modus, i => { st.modus = i; modusAnzeigen(); aktualisiere(); });
    const modusAnzeigen = () => { modusInfo.textContent = T(['profil_info_din', 'profil_info_faust', 'profil_info_eigen'][st.modus]); radiusF.style.display = st.modus === 0 ? '' : 'none'; eigenF.style.display = st.modus === 2 ? '' : 'none'; };

    const mehrKnopf = h('button', { class: 'mehrknopf' });
    const mehrBox = h('div', {}, mt(S.karte(text(T('profil_material'), 18, true), matSp, dickeSp, S.zweispalt(lf, sf)), 6), mt(S.karte(text(T('profil_abzug_titel'), 18, true), modusSeg, modusInfo, radiusF, eigenF), 10));
    const setzeMehr = an => {
      st.mehr = an; mehrBox.style.display = an ? '' : 'none';
      const kz = T(an ? 'ss_weniger' : 'ss_mehr'), info = T('w_mehr_profil');
      mehrKnopf.innerHTML = ''; mehrKnopf.append(h('b', {}, S.dreieck(an), kz), h('small', { text: info })); mehrKnopf.setAttribute('aria-label', kz + ', ' + info);
    };
    mehrKnopf.addEventListener('click', () => { setzeMehr(!st.mehr); speichere(); });
    setzeMehr(st.mehr);
    const winkelKarte = S.karte(text(T('w_winkel_titel'), 18, true), grau(T('profil_hinweis_winkel'), 14), winkelBox);
    if (S.vp.quer) inh.append(S.karte(text(T('ss_masse'), 18, true), primBox0), mt(winkelKarte, 10)); else inh.append(winkelKarte);
    inh.append(mt(mehrKnopf, 10), mt(mehrBox, 6),
      mt(S.karte(text(T('w_beispiele'), 18, true), vl, grau(T('profil_vorlage_info'), 14)), 10),
      mt(S.karte(ergTitel, zuschnitt, summe, meldungBox, text(T('profil_folge_titel'), 18, true), grau(T('profil_folge_info'), 14), folge, liste), 10),
      mt(S.rmKarte('profil', T('profil_titel'), () => snapshot()), 12),
      mt(S.karte(text(T('profil_annahmen'), 15), S.knopf(T('an_karte_knopf'), false, () => S.gehe('annahmen'))), 12),
      mt(S.knopf(T('profil_leeren'), false, () => { vorlageLaden(0); st.radius = ''; st.modus = 0; speichere(); S.rendere(true); }), 12), mt(status, 6), mt(S.warnband(T('profil_warn'), 14), 12));
    const fokus = (key, an) => { if (an) R.view.aktiv = key; else if (R.view.aktiv === key) R.view.aktiv = null; };
    const fokusiere = key => { const i = parseInt(key.slice(1), 10); if (isNaN(i)) return; const f = (key[0] === 's' ? schenkelFelder : winkelFelder)[i]; if (f) f.input.focus(); };
    R.view.beiMass = fokusiere;
    R.view.feldFuer = key => { const i = parseInt(key.slice(1), 10); if (isNaN(i)) return null; const f = (key[0] === 's' ? schenkelFelder : winkelFelder)[i]; return f && f.input ? f.input : null; };

    function reihenBauen() {
      schenkelReihe.innerHTML = ''; winkelBox.innerHTML = ''; schenkelFelder = []; winkelFelder = [];
      const gleich = st.schenkel.length <= 3 && !S.vp.quer;
      st.schenkel.forEach((sc, i) => {
        const f = S.feld(T('profil_schenkel_kurz', Profil.buchstabe(i)), sc, { onChange: v => { st.schenkel[i] = v; aktualisiere(); }, onFokus: an => fokus('s' + i, an) }); schenkelFelder.push(f);
        f.style.flex = gleich ? '1 1 0' : '0 0 112px'; f.style.minWidth = gleich ? '0' : '112px'; schenkelReihe.append(f);
        if (i < st.schenkel.length - 1) {
          const w = S.feld(T('profil_winkel_n', Profil.buchstabe(i), Profil.buchstabe(i + 1)), st.winkel[i], { onChange: v => { st.winkel[i] = v; aktualisiere(); }, onFokus: an => fokus('w' + i, an) }); winkelFelder.push(w);
          const seg = S.segment([T('profil_links'), T('profil_rechts')], st.links[i] ? 0 : 1, s => { st.links[i] = s === 0; aktualisiere(); });
          const r = h('div', {}, h('div', { class: 'lab', style: { fontSize: '16px', fontWeight: 700, letterSpacing: '.045em', padding: '0 0 4px 2px' }, text: T('profil_richtung') }), seg);
          winkelBox.append(mt(S.zweispalt(w, r), i === 0 ? 6 : 10));
        }
      });
      S.nachLayout(() => S.autosizeAlle(R.el));
    }
    function schenkelPlus(um) {
      if (st.schenkel.length >= 12) { status.textContent = T('pf_zu_viele'); return; }
      status.textContent = ''; st.schenkel.push(um ? '15' : '50'); st.winkel.push(um ? '45' : '90'); const l = st.links.length ? st.links[st.links.length - 1] : null;
      st.links.push(um ? !(l == null ? false : l) : (l == null ? true : l)); reihenBauen(); aktualisiere();
    }
    function schenkelMinus() { if (st.schenkel.length <= 1) return; st.schenkel.pop(); st.winkel.pop(); st.links.pop(); reihenBauen(); aktualisiere(); }

    const eingabe = () => {
      const d = WS()[st.mat].dicken[st.dicke], r = st.radius.trim() === '' ? d : (S.parseNum(st.radius) == null ? 0 : S.parseNum(st.radius));
      return { schenkel: st.schenkel.map(num), knicke: st.winkel.map((w, i) => ({ oeffnung: num(w), links: st.links[i] !== false })), dicke: d, radius: r, modus: st.modus, eigen: num(st.eigen), laenge: num(st.laenge),
        stueck: Math.trunc(num(st.stueck)), dichte: WS()[st.mat].dichte };
    };
    const fehlerText = m => m.f === 'pf_schenkel_null' ? T(m.f, Profil.buchstabe(m.i)) : m.f === 'pf_winkel' ? T(m.f, Profil.buchstabe(m.i), Profil.buchstabe(m.i + 1)) : T(m.f);
    function aktualisiere() {
      const e = eingabe(); letzteEingabe = e; const meld = Profil.pruefe(e);
      schenkelFelder.forEach((f, i) => { const m = meld.find(x => x.f === 'pf_schenkel_null' && x.i === i); f.fehler(m ? fehlerText(m) : null); });
      winkelFelder.forEach((f, i) => { const m = meld.find(x => x.f === 'pf_winkel' && x.i === i); f.fehler(m ? fehlerText(m) : null); });
      const gf = (f, k) => { const m = meld.find(x => x.f === k); f.fehler(m ? fehlerText(m) : null); };
      gf(radiusF, 'pf_radius'); gf(lf, 'pf_laenge'); gf(sf, 'pf_stueck');
      meldungBox.innerHTML = '';
      if (meld.length) {
        letztes = null; R.cv2.style.opacity = .4; zuschnitt.textContent = '-'; summe.textContent = fehlerText(meld[0]); folge.textContent = ''; liste.textContent = '';
        R.leiste_leer(fehlerText(meld[0])); speichere(); return;
      }
      const r = Profil.rechne(e); letztes = r; letzteGueltig = e; R.cv2.style.opacity = 1;
      R.view.bauer = (a, w, hh, t) => a === 1 ? root.Ze.WB.zuschnitt(e, r, w, hh, t, Profil) : root.Ze.WB.profil(e, w, hh, t, Profil); R.view.baue(true);
      const zs = fmtTrim(r.breite, 1);
      zuschnitt.textContent = T('profil_zuschnitt', zs);
      summe.textContent = r.bieg.length ? T('profil_summe', fmtTrim(r.summe, 1), fmt(r.summe - r.breite, 2), String(r.bieg.length)) : T('profil_ohne_biegung');
      const zl = r.bieg.map(b => T('profil_folge_zeile', String(b.nr), b.von, b.nach, fmtTrim(b.oeffnung, 1), T(b.links ? 'profil_links' : 'profil_rechts'), fmt(b.abzug, 2), b.umschlag ? T('profil_folge_umschlag') : ''));
      folge.textContent = zl.join('\n'); folge.style.whiteSpace = 'pre-line'; folge.style.display = zl.length ? '' : 'none';
      liste.textContent = T('profil_stueckliste', S.TA('werkstoffe')[st.mat], fmtTrim(e.dicke, 2), String(e.stueck), fmtTrim(e.laenge, 1), S.fmtM2(r.m2), S.fmtKg(r.kg));
      r.kurz.forEach(i => meldungBox.append(mt(S.warnband(T('pw_umschlag', Profil.buchstabe(i)), 14), 6)));
      if (r.ueberRolle) meldungBox.append(mt(S.warnband(T('pw_rolle'), 14), 6)); else if (r.ueberTafel) meldungBox.append(mt(S.warnband(T('pw_tafel'), 14), 6));
      S.werkstoffWarnungen(st.mat).forEach(t => meldungBox.append(mt(S.warnband(t, 14), 6)));
      R.leiste_gueltig(T('w_ergebnis_profil'), r.breite, v => fmtTrim(v, 1) + ' mm');
      speichere();
    }
    function snapshot() {
      const e = letzteEingabe; if (!e) return '';
      let s = 'Schenkel mm: ' + st.schenkel.join(', ') + '\nWinkel Grad: ' + st.winkel.map((w, i) => w + (st.links[i] ? ' L' : ' R')).join(', ') + '\n';
      s += S.TA('werkstoffe')[st.mat] + ' ' + fmtTrim(e.dicke, 2) + ' mm, Modus ' + ['DIN6935 r=' + fmtTrim(e.radius, 2), '2xDicke', 'eigen ' + fmtTrim(e.eigen, 2)][st.modus] + '\nLaenge ' + st.laenge + ' mm, Stueck ' + st.stueck;
      if (letztes) s += '\nZuschnitt ' + fmtTrim(letztes.breite, 2) + ' mm';
      return s;
    }
    const datum = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear(); };
    async function blattDatei() {
      const e = letzteEingabe, r = letztes; if (!e || !r) return null;
      {
        const c = document.createElement('canvas'), W = 1240, H = 900, ctx = c.getContext('2d'); c.width = W; c.height = H; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
        zeichneProfil(ctx, e, [40, 120, W - 40, H - 220], 2, 28, false);
        ctx.fillStyle = '#141C26'; ctx.font = '700 40px Roboto, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(T('profil_pdf_titel'), 40, 70);
        ctx.font = '700 34px Roboto, sans-serif'; ctx.fillText(T('profil_zuschnitt', fmtTrim(r.breite, 1)), 40, H - 150); ctx.font = '24px Roboto, sans-serif';
        ctx.fillText(T('profil_stueckliste', S.TA('werkstoffe')[st.mat], fmtTrim(e.dicke, 2), String(e.stueck), fmtTrim(e.laenge, 1), S.fmtM2(r.m2), S.fmtKg(r.kg)), 40, H - 100); ctx.fillText(datum(), 40, H - 60);
        const blob = await new Promise(res => c.toBlob(res, 'image/png'));
        return { blob, name: 'Profil_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.png', titel: T('profil_share_titel') };
      }
    }
    async function pdfErstellen() {
      if (!letztes) { status.textContent = T('status_leer'); return; }
      status.textContent = '';
      try { const d = await blattDatei(); S.pdfDialog(d.blob, d.name, d.titel, m => { status.textContent = m; }); } catch (x) { status.textContent = T('status_pdf_fehler'); }
    }
    async function blattTeilen() {
      if (!letztes) { status.textContent = T('status_leer'); return; }
      let d; try { d = await blattDatei(); } catch (x) { d = null; }
      if (!d) { status.textContent = T('status_pdf_fehler'); return; }
      status.textContent = '';
      R.teilenFertig(async () => { const r = await S.teilen(d.blob, d.name, d.titel); if (r === 'download') status.textContent = d.name; });
    }

    reihenBauen(); modusAnzeigen();
    if (opt.mehr != null) setzeMehr(opt.mehr);
    const wunschTab = opt.ansicht === 'zuschnitt' ? 1 : 0;
    return { el: R.el, overlay: { zurueck: true }, art: 'profil',
      nachEinbau() { R.layout(); aktualisiere(); R.setzeTab(wunschTab, false); S.autosizeAlle(R.el); S.nachLayout(() => { S.autosizeAlle(R.el); }); S.setzeScroll(R, opt); },
      kontext() { return { ansicht: R.tab === 1 ? T('ss_zuschnitt') : T('ansicht_skizze'), eingaben: snapshot().replace(/\n/g, ' | ') }; },
      layout() { R.layout(); }, speichere, zerstoere() { speichere(); R.ro.disconnect(); } };
  };
})(window);
