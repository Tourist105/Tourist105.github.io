/* Spengler-Web: Dachrinne, Mauerabdeckung, Kehle als Bildschirme. Port von NeueTeileActivity.kt (Aufbau, Zustaende, Rechnung ueber kern.js und normteile.js).
 * Alles mit Status "Annahme" oder "Unsicher" steht als "Annahme, Alex prueft" da. Katalog: normteile_daten.js (eine Quelle mit der App). */
(function (root) {
  'use strict';
  const S = root.S, Ze = root.Ze, K = root.Kern, NT = root.Normteile, EN = root.ENTXT, Bl = root.Blatt, h = S.h, fmtTrim = Ze.fmtTrim, fmtM2 = S.fmtM2, nz = NT.nz;
  const L = (de, en) => S.sprache() === 'en' ? en : de;

  const DEFS = () => ({
    fallrohr: [['h', 'Gesamthöhe (mm)', 'Total height (mm)', '6000'], ['s', 'Steckung (mm)', 'Insertion (mm)', '50']],
    dachrinne: [['l', 'Länge der Traufe (mm)', 'Length of the eaves (mm)', '10000'], ['w', 'Abwicklung (mm)', 'Girth (mm)', '330'], ['g', 'Gefälle (mm/m)', 'Fall (mm/m)', '5'],
      ['h', 'Halterabstand (mm)', 'Bracket spacing (mm)', '700'], ['d', 'Dilatation alle (mm)', 'Expansion joint every (mm)', '5000'], ['a', 'Ablaufrohre (Anzahl)', 'Downpipes (number)', '1'],
      ['ea', 'Aussenecken (Anzahl)', 'Outside corners (number)', '0'], ['ei', 'Innenecken (Anzahl)', 'Inside corners (number)', '0'], ['v', 'Verschnitt (%)', 'Waste (%)', '5'], ['tb', 'Tafelbreite (mm)', 'Sheet width (mm)', '1000']],
    mauerabdeckung: [['b', 'Mauerbreite (mm)', 'Wall width (mm)', '250'], ['l', 'Länge (mm)', 'Length (mm)', '4000'], ['g', 'Gefälle (Grad)', 'Slope (degrees)', '5'],
      ['u', 'Abstand Tropfkante zur Wand (mm)', 'Drip edge to wall (mm)', '50'], ['s', 'Senkrechter Schenkel (mm)', 'Vertical leg (mm)', '50'], ['t', 'Umschlag unten (mm)', 'Hem at the bottom (mm)', '15'],
      ['e', 'Ecken (Anzahl)', 'Corners (number)', '0'], ['p', 'Stücklänge (mm)', 'Piece length (mm)', '3000'], ['d', 'Dilatation alle (mm)', 'Expansion joint every (mm)', '5000'],
      ['n', 'Haftenabstand (mm)', 'Clip spacing (mm)', '330'], ['v', 'Verschnitt (%)', 'Waste (%)', '5']],
    kehle: [['l', 'Länge der Kehle (mm)', 'Valley length (mm)', '4000'], ['w', 'Abwicklung (mm)', 'Girth (mm)', '670'], ['a', 'Aufkantung je Seite (mm)', 'Upstand each side (mm)', '15'],
      ['m', 'Höchste Stücklänge (mm)', 'Longest piece (mm)', '3000'], ['u', 'Überlappung (mm)', 'Overlap (mm)', '100'], ['k', 'Kehlwinkel im Blech (Grad)', 'Valley angle in the sheet (degrees)', '130'], ['v', 'Verschnitt (%)', 'Waste (%)', '5']]
  });
  const PRIMAER = { fallrohr: ['h', 's'], dachrinne: ['l', 'w', 'g'], mauerabdeckung: ['b', 'l', 'g'], kehle: ['l', 'w', 'a'] };
  const TITEL = { fallrohr: 'ablauf_fallrohr', dachrinne: 'ablauf_dachrinne', mauerabdeckung: 'ablauf_mauerabdeckung', kehle: 'ablauf_kehle' };
  const CHIPS = { dachrinne: 'rinne', mauerabdeckung: 'mauer', kehle: 'kehle' };
  const FALL_CHIPS = [{ feld: 'h', einheit: 'mm', werte: [3000, 4000, 5000, 6000, 8000], vorgabe: 6000 }, { feld: 's', einheit: 'mm', werte: [30, 40, 50], vorgabe: 50 }];
  const HAT3D = ['fallrohr', 'dachrinne', 'mauerabdeckung', 'kehle'];
  const FARBE = { beleg: '#105E32', annahme: '#965000', unsicher: '#B00020' };

  S.seiteNeu = function (art, opt) {
    opt = opt || {};
    const defs = DEFS()[art], prim = PRIMAER[art], quer = S.vp.quer, D = root.NEUETEILE_DATEN, norm = NT;
    const FR = root.Fallrohr;
    const st = { werte: {}, mat: 0, dn: 100, stueck: 5000, mitte: false, streifen: false, notiz: '', mehr: false, ansicht: 0, teile: [] };
    const pref = k => S.lies('neu_' + art + '.' + k), setp = (k, v) => S.schreibe('neu_' + art + '.' + k, v);
    for (const [k, , , v] of defs) st.werte[k] = pref(k) != null ? pref(k) : v;
    st.mat = Math.min(norm.werkstoffe.length - 1, Math.max(0, +pref('mat') || 0)); st.dn = +pref('dn') || 100; st.stueck = +pref('stueck') || 5000;
    if (art === 'fallrohr') st.teile = FR.teileVon(pref('teile')) || FR.STANDARD();
    st.mitte = pref('mitte') === 'true'; st.streifen = pref('streifen') === 'true'; st.notiz = pref('notiz') || ''; st.mehr = pref('mehr') === 'true';
    if (opt.werte) for (const k in opt.werte) {
      if (k === 'mat') st.mat = Math.min(norm.werkstoffe.length - 1, Math.max(0, +opt.werte[k]));
      else if (k === 'dn') st.dn = +opt.werte[k]; else if (k === 'stueck') st.stueck = +opt.werte[k];
      else if (k === 'teile' && art === 'fallrohr') { const tv = FR.teileVon(String(opt.werte[k]).replace(/_/g, ':').replace(/,/g, ';')); if (tv) st.teile = tv; }
      else if (k === 'mitte') st.mitte = opt.werte[k] === '1'; else if (k === 'streifen') st.streifen = opt.werte[k] === '1';
      else if (k in st.werte) st.werte[k] = opt.werte[k];
    }
    if (opt.mehr != null) st.mehr = opt.mehr;
    const speichere = () => { for (const k in st.werte) setp(k, st.werte[k]); setp('mat', st.mat); setp('dn', st.dn); setp('stueck', st.stueck); setp('mitte', st.mitte); setp('streifen', st.streifen); setp('notiz', st.notiz); if (art === 'fallrohr') setp('teile', FR.teileText(st.teile)); setp('mehr', st.mehr); };

    const arten = art === 'kehle' ? [1, 2, 3] : [1, 2];
    const artenAlle = quer ? arten : [0].concat(arten);
    const namen = artenAlle.map(a => a === 0 ? S.T('ss_uebersicht') : a === 1 ? (art === 'dachrinne' ? L('Ansicht', 'Side view') : art === 'fallrohr' ? L('Ansicht', 'View') : L('Querschnitt', 'Section')) : a === 2 ? (art === 'fallrohr' ? L('Zuschnitt', 'Cutting') : L('Abwicklung', 'Girth')) : L('Stücke', 'Pieces'));
    const felder = {};
    const zahl = k => { const v = S.parseNum(st.werte[k] == null ? '' : st.werte[k]); return v == null ? NaN : v; };
    const ganz = k => { const v = zahl(k); return isNaN(v) || v > 1000 ? -1 : Math.trunc(v); };

    const feldBauen = d => { const f = S.feld(L(d[1], d[2]), st.werte[d[0]], { onChange: v => { st.werte[d[0]] = v; aktualisiere(); }, onFokus: an => fokus(d[0], an) }); felder[d[0]] = f; return f; };
    const mehrKnopf = h('button', { class: 'mehrknopf' }), mehrBox = h('div', {});
    const extra = defs.filter(d => !prim.includes(d[0]));
    for (let i = 0; i < extra.length; i += 2) {
      const a = feldBauen(extra[i]);
      mehrBox.append(i + 1 < extra.length ? h('div', { style: { marginTop: '6px' } }, S.zweispalt(a, feldBauen(extra[i + 1]))) : h('div', { style: { marginTop: '6px' } }, a));
    }
    if (art === 'dachrinne') mehrBox.append(h('div', { class: 'bt', style: { marginTop: '10px' }, text: L('Ablauf sitzt', 'Downpipe sits') }),
      h('div', { style: { marginTop: '4px' } }, S.segment([L('am Ende', 'at the end'), L('in der Mitte', 'in the middle')], st.mitte ? 1 : 0, i => { st.mitte = i === 1; aktualisiere(); })));
    if (art === 'mauerabdeckung') mehrBox.append(h('div', { class: 'bt', style: { marginTop: '10px' }, text: L('Befestigung', 'Fixing') }),
      h('div', { style: { marginTop: '4px' } }, S.segment([L('Haften', 'Clips'), L('beidseitig eingehängt', 'hooked on both sides')], st.streifen ? 1 : 0, i => { st.streifen = i === 1; aktualisiere(); })));
    const setzeMehr = an => {
      st.mehr = an; mehrBox.style.display = an ? '' : 'none';
      const kz = S.T(an ? 'ss_weniger' : 'ss_mehr'), info = L('Halter, Dilatation, Ecken, Verschnitt, Stücke', 'Brackets, expansion joints, corners, waste, pieces');
      mehrKnopf.innerHTML = ''; mehrKnopf.append(h('b', {}, S.dreieck(an), kz), h('small', { text: info })); mehrKnopf.setAttribute('aria-label', kz + ', ' + info);
    };
    mehrKnopf.addEventListener('click', () => setzeMehr(!st.mehr));

    const primBox = h('div', { class: 'primbox' });
    if (quer) primBox.style.cssText = 'padding:0;margin:0';
    { const pr = h('div', { class: 'primreihe' }, defs.filter(d => prim.includes(d[0])).map(d => feldBauen(d))); primBox.append(S.primHinweis(pr), pr); }

    // Kopf
    const karte = h('div', { class: 'skkarte' }), cv2 = h('canvas', { 'aria-label': S.T('ss_live') }); karte.append(cv2);
    const view = new S.SkizzenAnsicht(cv2); view.arten = artenAlle; S.band.karte(karte, { view, d3: () => d3 });
    const hat3d = HAT3D.includes(art) && !!root.Szene3D;
    let d3 = null, cv3 = null, kipp3 = null, kipp2 = null;
    if (hat3d) {
      cv3 = h('canvas', { 'aria-label': S.T('d3_beschreibung') }); karte.append(cv3);
      d3 = new root.Szene3D.Ansicht3D(cv3); d3.leerText = S.T('d3_leer'); d3.fuellend = true; d3.grundZoom = art === "fallrohr" ? 0.78 : 1.0; d3.grundstellung(art === 'mauerabdeckung' || art === 'kehle' ? 0.95 : 0.6, 0.35);
      d3.beiMass3d = (k, rr) => { if (!(rr && view.eingabeBei(cv3, (rr[0] + rr[2]) / 2, (rr[1] + rr[3]) / 2, k))) fokusiere(k); };
      view.ordnung3d = () => d3.pillenOrte.map(p => p[1]).filter((k, i, a) => a.indexOf(k) === i);
      view.beiAktiv = k => { d3.leuchteKey = k; d3.zeichnen(); };
    }
    const kippGross = h('button', { class: 'kippgross', 'aria-label': S.T('ss_tipp'), onclick: () => vollbild() }, S.iconVollbild());
    if (!quer) karte.append(kippGross);
    if (hat3d) {
      kipp3 = h('button', { text: '3D', 'aria-label': '3D', onclick: () => setzeModus(true, true) });
      kipp2 = h('button', { text: '2D', 'aria-label': '2D', onclick: () => setzeModus(false, true) });
      karte.append(h('div', { class: 'kipp' }, kipp3, kipp2)); view.kopfEinzug = 122;
    }
    const chips = namen.map((n, i) => h('button', { class: 'chip', text: n, onclick: () => waehleAnsicht(i) }));
    const pdfKnopf = h('button', { class: 'pdfknopf', text: S.T('ss_ansehen'), 'aria-label': S.T('ss_ansehen_lang'), onclick: () => pdfErstellen() });
    const reiter = h('div', { class: 'reiterzeile' }, chips, pdfKnopf);
    const titel = h('h1', { class: 'sktitel' }, h('span', { text: S.T(TITEL[art]) }));
    const titelSpan = titel.firstChild; S.autosizeTitel(titelSpan, 22, 16); titelSpan.style.display = 'block'; titelSpan.style.overflow = 'hidden'; titelSpan.style.width = '100%'; titelSpan.style.fontSize = '22px';
    const kopf = h('div', { class: 'skkopf' }, quer ? null : titel, reiter, karte, quer ? null : primBox);

    const leisteLabel = h('div', { class: 'll' }), leisteWert = h('div', { class: 'lw' });
    const teilenKnopf = h('button', { class: 'teilen', text: S.T('ss_blatt_teilen'), onclick: () => blattTeilen() });
    const leiste = h('div', { class: 'leiste' }, h('div', { class: 'lt' }, leisteLabel, leisteWert), teilenKnopf);
    S.autosize(leisteWert, 16, 26);

    // Inhalt
    const inh = h('div', { class: 'skinhalt' });
    const detail = h('div', { class: 'stat', style: { whiteSpace: 'pre-line', fontSize: '16px' } });
    const status = h('div', { style: { fontSize: '16px', marginTop: '6px' } });
    const hinweisBox = h('div', {}), materialBox = h('div', {}), normBox = h('div', {});
    const statusZeile = (s, q, gr) => h('div', { style: { fontSize: (gr || 12.5) + 'px', color: FARBE[s], marginTop: '2px' }, text: NT.statusText(s) + ': ' + EN.t(q) });
    const mt = (e, px) => { e.style.marginTop = px + 'px'; return e; };
    if (quer) inh.append(S.karte(S.text(S.T('ss_masse'), 18, true), h('div', {}, primBox, mt(mehrKnopf, 12), mt(mehrBox, 6))));
    else inh.append(mehrKnopf, mt(mehrBox, 6));

    // Uebliche Werte (Chips)
    const chipTasten = [];
    const chipKarte = h('div', {});
    chipKarte.append(S.text(L('Übliche Werte', 'Usual values'), 18, true), mt(S.text(L('Antippen setzt das Mass. Die Auswahl sind die gebräuchlichen Varianten, nicht ein Vorschlag von Alex.', 'Tap to set the dimension. These are the common variants, not a suggestion from Alex.'), 13, false), 2));
    chipKarte.lastChild.style.color = 'var(--text2)';
    for (const cr of (art === 'fallrohr' ? FALL_CHIPS : D.chips[CHIPS[art]])) {
      const d = defs.find(x => x[0] === cr.feld); if (!d) continue;
      const lab = mt(S.text(L(d[1], d[2]), 14, true), 10); lab.style.color = 'var(--text2)';
      const zeile = h('div', { style: { display: 'flex', overflowX: 'auto', marginTop: '4px' } });
      for (const w of cr.werte) {
        const b = h('button', { class: 'chip', text: nz(w, 1), style: { marginRight: '6px', minWidth: '64px', flex: '0 0 auto' }, onclick: () => { const t = nz(w, 2).replace(',', '.'); st.werte[cr.feld] = t; felder[cr.feld].input.value = t; aktualisiere(); } });
        zeile.append(b); chipTasten.push([cr, w, b]);
      }
      chipKarte.append(lab, zeile);
    }
    const chipsAkt = () => { for (const [cr, w, b] of chipTasten) b.classList.toggle('an', Math.abs(zahl(cr.feld) - w) < 1e-9); };

    // Eine Reihe grosser Chips [Text, Wert]
    const chipZeile = (werte, aktuell, hoehe, f) => {
      // Zeilen mit gleich breiten Chips, nichts scrollt oder wird abgeschnitten: lange Namen zu zweit, kurze bis zu fuenft
      const pro = werte.some(([t]) => String(t).length > 6) ? 2 : 5, box = h('div', { style: { marginTop: '4px' } });
      for (let i = 0; i < werte.length; i += pro) {
        const r = h('div', { style: { display: 'flex', marginTop: i ? '6px' : '0' } });
        werte.slice(i, i + pro).forEach(([txt, w], j) => r.append(h('button', { class: 'chip' + (Math.abs(aktuell - w) < 1e-9 ? ' an' : ''), text: txt, style: { flex: '1 1 0', minWidth: '0', minHeight: hoehe + 'px', marginLeft: j ? '6px' : '0', padding: '0 4px' }, onclick: () => f(w) })));
        for (let k = werte.slice(i, i + pro).length; k < pro; k++) r.append(h('div', { style: { flex: '1 1 0', marginLeft: '6px' } }));
        box.append(r);
      }
      return box;
    };

    // Normteile waehlen
    function baueNormBox() {
      normBox.innerHTML = '';
      const wk = norm.werkstoffe[st.mat];
      normBox.append(S.text(norm.hinweisText(), 13, false));
      normBox.lastChild.style.color = 'var(--text2)';
      // Werkstoff als Chips (wenige feste Werte, kein Dropdown)
      normBox.append(mt(S.text(L('Werkstoff', 'Material'), 14, true), 10), chipZeile(norm.werkstoffe.map((w, i) => [EN.werkstoff(w.name), i]), st.mat, 56, v => { if (v !== st.mat) { st.mat = v; baueNormBox(); aktualisiere(); } }));
      if (art === 'fallrohr') normBox.append(statusZeile(wk.rohrDicke.s, L('Dicke ', 'Thickness ') + wk.rohrDicke.fuer(st.dn) + '. ' + wk.rohrDicke.q));
      else { const dicke = art === 'dachrinne' ? wk.rinne : art === 'mauerabdeckung' ? wk.mauer : wk.kehle;
        normBox.append(statusZeile(dicke.s, L('Dicke ', 'Thickness ') + nz(dicke.v, 2) + ' mm. ' + dicke.q)); }
      if (art === 'dachrinne') {
        normBox.append(mt(S.text(L('Rinnenstück (Länge)', 'Gutter piece (length)'), 14, true), 12));
        const z1 = h('div', { style: { display: 'flex', overflowX: 'auto', marginTop: '4px' } });
        for (const m of norm.rinneStueck) z1.append(h('button', { class: 'chip' + (Math.abs(st.stueck - m.mm) < 1e-9 ? ' an' : ''), text: nz(m.mm / 1000, 1) + ' m', style: { marginRight: '6px', minWidth: '72px', flex: '0 0 auto' }, onclick: () => { st.stueck = m.mm; baueNormBox(); aktualisiere(); } }));
        normBox.append(z1);
        const sm = norm.rinneStueck.find(m => Math.abs(m.mm - st.stueck) < 1e-9);
        normBox.append(statusZeile('annahme', L('Welche Länge Alex nimmt, ist offen. ', 'Which length Alex uses is open. ') + (sm ? sm.q : '')));
        normBox.append(mt(S.text(L('Ablaufrohr (Nennweite)', 'Downpipe (nominal size)'), 14, true), 12));
        const z2 = h('div', { style: { display: 'flex', overflowX: 'auto', marginTop: '4px' } });
        for (const d of norm.durchmesser) z2.append(h('button', { class: 'chip' + (st.dn === d.dn ? ' an' : ''), text: String(d.dn), style: { marginRight: '6px', minWidth: '64px', flex: '0 0 auto' }, onclick: () => { st.dn = d.dn; baueNormBox(); aktualisiere(); } }));
        normBox.append(z2);
        const dd = norm.dnVon(st.dn); if (dd) normBox.append(statusZeile(dd.s, 'Nenn ' + dd.dn + ': ' + dd.q));
      }
      if (art === 'fallrohr') {
        normBox.append(mt(S.text(L('Fallrohr (Nennweite)', 'Downpipe (nominal size)'), 14, true), 12), chipZeile(norm.durchmesser.map(d => [String(d.dn), d.dn]), st.dn, 48, v => { st.dn = v; baueNormBox(); baueTeileBox(); aktualisiere(); }));
        const dd = norm.dnVon(st.dn); if (dd) normBox.append(statusZeile(dd.s, 'Nenn ' + dd.dn + ': ' + dd.q));
      }
    }
    baueNormBox();

    // ---- Fallrohr: Bauteile von oben nach unten
    const teileBox = h('div', {});
    const typName = tp => ({ rohr: L('Rohrstück', 'Pipe section'), versatz: L('Versatz (2 Bögen)', 'Offset (2 bends)'), bogen: L('Bogen am Ende', 'Bend at the end'), abzweig: L('Abzweiger (Hosenrohr)', 'Branch (trouser pipe)'),
      reduktion: L('Reduktion', 'Reducer'), muffe: L('Muffe', 'Coupler'), schelle: L('Schelle', 'Clamp'), endstueck: L('Endstück', 'End piece') })[tp];
    const kurzName = tp => ({ rohr: L('Rohr', 'Pipe'), versatz: L('Versatz', 'Offset'), bogen: L('Bogen', 'Bend'), abzweig: L('Abzweiger', 'Branch'), reduktion: L('Reduktion', 'Reducer'),
      muffe: L('Muffe', 'Coupler'), schelle: L('Schelle', 'Clamp'), endstueck: L('Endstück', 'End piece') })[tp];
    const frBeschr = () => ({ name: kurzName, ansicht: L('Ansicht', 'View'), zuschnitt: L('Zuschnitt', 'Cutting'), rest: L('Rest', 'rest'), achs: L('Achs', 'axis'), leer: L('Kein Rohrstück', 'No pipe section') });
    const fallEin = () => ({ hoehe: zahl('h'), steckung: zahl('s'), dn: st.dn, teile: st.teile.slice() });
    const dnVor = i => { let d = st.dn; for (let j = 0; j < i; j++) if (st.teile[j].typ === 'reduktion' && isFinite(st.teile[j].w)) d = Math.trunc(st.teile[j].w); return d; };
    const teileGeaendert = () => { baueTeileBox(); aktualisiere(); };
    const neuesTeil = tp => tp === 'versatz' ? FR.FT(tp, 72, 250) : tp === 'bogen' ? FR.FT(tp, 40) : tp === 'abzweig' ? FR.FT(tp, 72)
      : tp === 'reduktion' ? FR.FT(tp, Math.max(60, ...norm.durchmesser.filter(d => d.dn < dnVor(st.teile.length)).map(d => d.dn))) : FR.FT(tp);
    const knopf = (txt, an, cd, f) => h('button', { class: 'chip', text: txt, 'aria-label': cd, disabled: !an, style: { width: '44px', height: '44px', minWidth: '0', padding: '0', marginLeft: '4px', opacity: an ? 1 : .35 }, onclick: f });
    // Kleines Symbol je Bauteil (40 x 40), gleiche Formen wie die Startkacheln und die Ansicht
    const teilSymbol = tp => {
      const hell = '#CDDFF5', blau = '#0B5CAB', dunkel = '#083A6E', orange = '#E28014';
      const rohr = d => '<path d="' + d + '" fill="none" stroke="' + hell + '" stroke-width="13" stroke-linejoin="round"/><path d="' + d + '" fill="none" stroke="' + blau + '" stroke-width="2.5" stroke-linejoin="round"/>';
      let g = '';
      switch (tp) {
        case 'rohr': g = rohr('M20 3L20 37'); break;
        case 'versatz': g = rohr('M14 3L14 10L26 28L26 37'); break;
        case 'bogen': g = rohr('M14 3L14 16Q14 28 28 28L37 28'); break;
        case 'abzweig': g = rohr('M20 3L20 37') + rohr('M20 14L33 34'); break;
        case 'reduktion': g = '<path d="M9 6L31 6L26 34L14 34Z" fill="' + orange + '" stroke="' + dunkel + '" stroke-width="2"/>'; break;
        case 'muffe': g = rohr('M20 3L20 37') + '<rect x="10" y="15" width="20" height="10" rx="2" fill="' + blau + '"/>'; break;
        case 'schelle': g = rohr('M20 3L20 37') + '<rect x="8" y="17" width="24" height="6" rx="2" fill="' + orange + '"/>'; break;
        default: g = rohr('M20 3L20 30') + '<rect x="11" y="30" width="18" height="7" rx="2" fill="' + dunkel + '"/>';
      }
      return '<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">' + g + '</svg>';
    };
    function baueTeileBox() {
      teileBox.innerHTML = '';
      for (const k of Object.keys(felder)) if (/^p\d/.test(k)) delete felder[k];
      if (!st.teile.length) { const e = S.text(L('Noch kein Bauteil. Unten eines hinzufügen.', 'No part yet. Add one below.'), 14, false); e.style.color = 'var(--text2)'; teileBox.append(e); }
      st.teile.forEach((p, i) => {
        const k = h('div', { style: { border: '1px solid var(--linie)', borderRadius: '14px', padding: '8px 12px 10px', marginTop: i ? '10px' : '0' } });
        const sym = h('div', { style: { width: '40px', height: '40px', marginRight: '10px', flex: '0 0 auto' } }); sym.innerHTML = teilSymbol(p.typ);
        const kopfZ = h('div', { style: { display: 'flex', alignItems: 'center' } }, sym, h('div', { style: { flex: '1' } }, S.text((i + 1) + '. ' + kurzName(p.typ), 16, true)),
          knopf('↑', i > 0, L('nach oben', 'move up'), () => { const x = st.teile[i]; st.teile[i] = st.teile[i - 1]; st.teile[i - 1] = x; teileGeaendert(); }),
          knopf('↓', i < st.teile.length - 1, L('nach unten', 'move down'), () => { const x = st.teile[i]; st.teile[i] = st.teile[i + 1]; st.teile[i + 1] = x; teileGeaendert(); }),
          knopf('✕', true, L('Bauteil entfernen', 'Remove part'), () => { st.teile.splice(i, 1); teileGeaendert(); }));
        k.append(kopfZ);
        const key = 'p' + i;
        const zahlFeld = (label, wert, hint, set) => {
          const f = S.feld((i + 1) + '. ' + kurzName(p.typ) + ': ' + label, isNaN(wert) ? '' : nz(wert, 2).replace(',', '.'), { onChange: v => { const x = v.trim() === '' ? NaN : (S.parseNum(v) == null ? -1 : S.parseNum(v)); st.teile[i] = set(x); aktualisiere(); }, onFokus: an => fokus(key, an) });
          f.input.placeholder = hint; felder[key] = f; k.append(mt(f, 6));
        };
        const winkelChips = liste => k.append(mt(chipZeile(liste.map(g => [nz(g, 0) + '°', g]), p.w, 48, w => { st.teile[i] = Object.assign({}, st.teile[i], { w }); teileGeaendert(); }), 6));
        const dnJetzt = dnVor(i), mset = v => Object.assign({}, st.teile[i], { m: v });
        switch (p.typ) {
          case 'rohr': zahlFeld(L('Länge (mm), leer = Rest', 'Length (mm), empty = rest'), p.m, L('Rest', 'rest'), mset); break;
          case 'versatz': winkelChips(norm.winkel.map(w => w.grad)); zahlFeld(L('Achsmass (mm)', 'Axis offset (mm)'), p.m, '', mset); break;
          case 'bogen': winkelChips(norm.winkel.map(w => w.grad)); break;
          case 'abzweig': winkelChips((norm.D.abzweig || []).map(a => a.grad)); zahlFeld(L('Bauhöhe (mm), leer = Katalog', 'Height (mm), empty = catalog'), p.m, nz((FR.abzweig(p.w) || { bh: 0 }).bh, 0), mset); break;
          case 'reduktion': {
            const ziele = norm.durchmesser.filter(d => d.dn < dnJetzt);
            if (!ziele.length) k.append(mt(S.text(L('Kleiner als Nenn ' + dnJetzt + ' gibt es im Katalog nicht.', 'There is nothing smaller than ' + dnJetzt + ' in the catalog.'), 14, false), 6));
            else k.append(mt(chipZeile(ziele.map(d => [dnJetzt + ' → ' + d.dn, d.dn]), p.w, 48, w => { st.teile[i] = Object.assign({}, st.teile[i], { w }); teileGeaendert(); }), 6));
            zahlFeld(L('Baulänge (mm), leer = Katalog', 'Length (mm), empty = catalog'), p.m, nz(Math.max(FR.muffe(dnJetzt), FR.muffe(Math.trunc(p.w))), 0), mset); break;
          }
          case 'muffe': zahlFeld(L('Baulänge (mm), leer = Katalog', 'Length (mm), empty = catalog'), p.m, nz(FR.muffe(dnJetzt), 0), mset); break;
          case 'endstueck': zahlFeld(L('Baulänge (mm), leer = 0', 'Length (mm), empty = 0'), p.m, '0', mset); break;
          default: { const e = S.text(L('Wird gezählt, braucht keine Höhe.', 'Is counted, needs no height.'), 14, false); e.style.color = 'var(--text2)'; k.append(mt(e, 4)); }
        }
        teileBox.append(k);
      });
      teileBox.append(mt(S.text(L('Bauteil hinzufügen', 'Add part'), 15, true), 14));
      for (let a = 0; a < FR.TYPEN.length; a += 2) {
        const r = h('div', { style: { display: 'flex', marginTop: '8px' } });
        FR.TYPEN.slice(a, a + 2).forEach((tp, j) => r.append(h('button', { class: 'chip', text: '+ ' + typName(tp), style: { flex: '1', minHeight: '56px', marginLeft: j ? '8px' : '0' }, onclick: () => { st.teile.push(neuesTeil(tp)); teileGeaendert(); } })));
        teileBox.append(r);
      }
    }
    if (art === 'fallrohr') baueTeileBox();

    const dxfName = () => art + '_' + S.zeitName() + '.dxf';
    const dxfBlob = () => new Blob([dxfLiefern()], { type: 'application/dxf' });
    const dxfBox = S.karte(S.text('DXF', 18, true), S.knopf(L('DXF der Abwicklung teilen', 'Share DXF of the flat pattern'), false, () => dxfTeilen()),
      h('div', { style: { fontSize: '14px', marginTop: '8px', color: 'var(--text2)' }, text: L('Abwicklung in mm für CAD und CNC, Biegelinien auf eigener Lage. Die Rechnung ist dieselbe wie auf dem Blatt.', 'Flat pattern in mm for CAD and CNC, fold lines on their own layer. The calculation is the same as on the sheet.') }));
    dxfBox.style.display = 'none';
    async function dxfTeilen() { if (!dxfLiefern) { status.textContent = S.T('status_leer'); return; } const name = dxfName(), r = await S.teilen(dxfBlob(), name, S.T(TITEL[art])); if (r === 'download') status.textContent = name; }
    const annahmenListe = () => EN.ann(art === 'fallrohr' ? FR.annahmenListe() : art === 'dachrinne' ? K.RinneSkizze.annahmenListe() : art === 'mauerabdeckung' ? K.MauerSkizze.annahmenListe() : K.KehleSkizze.annahmenListe());
    const belegText = b => b === 'QUELLE' ? NT.statusText('beleg') : b === 'HERLEITUNG' ? L('Eigene Herleitung', 'Own derivation') : NT.statusText('annahme');
    const annBox = h('div', {});
    annahmenListe().forEach((a, i) => {
      annBox.append(mt(S.text(a.text + ': ' + a.wert, 14.5, true), i === 0 ? 0 : 10));
      const q = h('div', { style: { fontSize: '12.5px', marginTop: '2px', color: a.beleg === 'ANNAHME' ? FARBE.annahme : 'var(--text2)' }, text: belegText(a.beleg) + (a.quelle.trim() ? ': ' + a.quelle : '') }); annBox.append(q);
    });

    inh.append(...(art === 'fallrohr' ? [mt(S.karte(S.text(L('Bauteile von oben nach unten', 'Parts from top to bottom'), 18, true), mt(teileBox, 8)), 10)] : []), mt(S.karte(chipKarte), 10), mt(S.karte(S.text(L('Normteile wählen', 'Choose standard parts'), 18, true), mt(normBox, 8)), 10),
      mt(S.karte(S.text(S.T('ss_ergebnis'), 18, true), detail), 10), mt(hinweisBox, 10), mt(S.karte(S.text(L('Materialliste', 'Bill of materials'), 18, true), mt(materialBox, 8)), 10),
      mt(S.karte(S.text(L('Annahmen und Quellen', 'Assumptions and sources'), 18, true), mt(annBox, 8)), 10),
      mt(dxfBox, 10),
      mt(S.karte(S.feld(S.T('ss_notiz'), st.notiz, { text: true, ende: true, onChange: v => { st.notiz = v; } })), 10),
      mt(S.rmKarte(art, S.T(TITEL[art]), () => snapshot()), 12), status,
      mt(S.warnband(L('Die Werte sind Gesprächsgrundlage, noch keine geprüften Masse. Wo "Annahme, Alex prüft" steht, bestimmt Alex.', 'These values are a basis for discussion, not checked dimensions. Where it says "Assumption, Alex to check", Alex decides.'), 14), 12));
    const scroll = h('div', { class: 'skscroll' }, inh);
    const el = h('div', { class: 'sk' + (quer ? ' quer' : '') });
    const hoch = !quer && S.kopfScrollt();
    if (quer) el.append(kopf, h('div', { class: 'skrechts' }, scroll, leiste)); else if (hoch) { scroll.prepend(kopf); el.append(scroll, leiste); } else el.append(kopf, scroll, leiste);

    const zeigeChips = () => chips.forEach((b, i) => b.classList.toggle('an', !st.ist3d && i === st.ansicht));
    // Hochformat-Handy: die Uebersicht braucht mehr Hoehe als eine einzelne Ansicht, 3D und Tastatur bleiben bei 38 %
    function karteHoehe() { if (!hoch) return; karte.style.height = (st.ist3d || S.kompakt() ? S.karteHoch() : S.karteHochFuer(view, st.ansicht, karte.clientWidth)) + 'px'; view.groesse(karte.clientWidth, karte.clientHeight); }
    function setzeModus(an3, merken) {
      if (!d3) return; st.ist3d = an3;
      cv3.style.display = an3 ? '' : 'none'; cv2.style.visibility = an3 ? 'hidden' : 'visible';
      kippGross.style.display = an3 || quer ? 'none' : '';
      kipp3.classList.toggle('an', an3); kipp2.classList.toggle('an', !an3);
      zeigeChips(); karteHoehe(); if (an3) d3.zeichnen(); if (merken) setp('m3d', an3);
    }
    function waehleAnsicht(i) {
      if (st.ist3d) { st.ansicht = i; view.ansicht = i; setzeModus(false, true); view.baue(false); return; }
      if (i === st.ansicht) return; st.ansicht = i; view.ansicht = i; zeigeChips(); karteHoehe(); view.baue(false); S.haptik(8); }
    function fokus(key, an) {
      if (!an) { if (view.aktiv === key) view.aktiv = null; if (d3 && d3.leuchteKey === key) { d3.leuchteKey = null; d3.zeichnen(); } return; }
      view.aktiv = key; if (d3) { d3.leuchteKey = key; d3.zeichnen(); }
      if (!st.ist3d && view.w > 0) {
        const z = view.zeichnungFuer(st.ansicht);
        if (!(z && z.elems.some(e => e.key === key))) for (let i = 0; i < namen.length; i++) if (i !== st.ansicht) { const q = view.zeichnungFuer(i); if (q && q.elems.some(e => e.key === key)) { waehleAnsicht(i); break; } }
      }
    }
    function fokusiere(key) { const f = felder[key]; if (!f) return; if (!st.mehr && !prim.includes(key) && art !== 'fallrohr') setzeMehr(true); f.input.focus(); }
    view.beiMass = fokusiere; view.beiLeerTipp = () => vollbild();
    // Eingabeband offen: die Uebersicht ist zu klein fuer die Masse, es zaehlt die Einzelansicht, in der das Mass steht
    view.seite = { ist3d: () => st.ist3d, ansicht: () => st.ansicht, waehle: i => waehleAnsicht(i) };
    view.feldFuer = k => { const f = felder[k]; return f && f.input ? f.input : null; };
    function vollbild() { const a = st.ansicht; S.vollbildZeigen((w, hh) => view.zeichnungMit(a, w, hh), view.aktiv, false, view); }

    // Rechnung
    const fehlerText = m => {
      switch (m.fehler) {
        case 'NICHT_POSITIV': return S.T('ss_e_pos'); case 'NEGATIV': return S.T('ss_e_neg'); case 'ZU_GROSS': return S.T('ss_e_gross');
        case 'WINKEL_BEREICH': if (art === 'fallrohr') return L('Der Winkel muss zwischen 0 und 90 Grad liegen.', 'The angle must be between 0 and 90 degrees.'); return art === 'kehle' ? L('Der Winkel muss zwischen 60 und 180 Grad liegen.', 'The angle must be between 60 and 180 degrees.') : L('Das Gefälle muss zwischen 0 und 45 Grad liegen.', 'The slope must be between 0 and 45 degrees.');
        case 'KEHLE_AUFKANTUNG_ZU_GROSS': return L('Die Aufkantung ist zu gross: zwei Aufkantungen sind so gross wie die ganze Abwicklung.', 'The upstand is too large: two upstands are as large as the whole girth.');
        case 'STUECK_KUERZER_ALS_UEBERLAPPUNG': return L('Ein Stück darf nicht kürzer sein als die Überlappung.', 'A piece must not be shorter than the overlap.');
        case 'VERSCHNITT_BEREICH': return L('Der Verschnitt muss zwischen 0 und 50 Prozent liegen.', 'Waste must be between 0 and 50 percent.');
        case 'FALLROHR_ZU_HOCH': return L('Die Bauteile brauchen mehr Höhe als die Gesamthöhe. Ein Bauteil kürzen oder entfernen, oder die Gesamthöhe erhöhen.', 'The parts need more height than the total height. Shorten or remove a part, or raise the total height.');
        case 'FALLROHR_ACHS_ZU_KLEIN': return L('Das Achsmass ist zu klein: zwei Bögen brauchen mehr Versatz.', 'The axis offset is too small: two bends need more offset.');
        case 'FALLROHR_BOGEN_ENDE': return L('Ein einzelner Bogen gehört ans Ende. Danach nur noch Schelle oder Endstück.', 'A single bend belongs at the end. Only a clamp or end piece may follow.');
        case 'FALLROHR_REDUKTION': return L('Die Reduktion muss auf eine kleinere Nennweite aus dem Katalog gehen.', 'The reducer must go to a smaller nominal size from the catalog.');
      }
      return String(m.fehler);
    };
    const beschr = () => ({ abwicklung: L('Abwicklung', 'Girth'), laenge: L('Länge', 'Length'), gefaelle: L('Gefälle', 'Fall'), dilatation: L('Dilatation', 'Expansion joint'), ablauf: L('Ablaufrohr', 'Downpipe'),
      ueberhoeht: L('Gefälle überhöht', 'fall exaggerated'), querschnitt: L('Querschnitt', 'Section'), ansicht: L('Ansicht', 'Side view'), stuecke: L('Stücke', 'Pieces'), ueberlappung: L('Überlappung', 'Overlap'), halter: L('Halter', 'Brackets'), mauer: L('Mauer', 'Wall'), bruch: L('Länge', 'Length') });
    const datum = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear(); };
    const annahmenKurz = () => L('Annahme, Alex prüft: ', 'Assumption, Alex to check: ') + annahmenListe().filter(a => a.beleg === 'ANNAHME').map(a => a.text + ' (' + a.wert + ')').join('. ') + '.';
    const blattTexte = (label, gross, zeilen, legende) => ({ titel: S.T(TITEL[art]), datum: datum(), kunde: S.T('ss_kunde'), ergebnisLabel: label, gross, zeilen, annahmenTitel: S.T('ss_annahmen_titel'), annahmen: annahmenKurz(), legende,
      aufrissTitel: L('Ansicht', 'View'), grundrissTitel: L('Abwicklung', 'Girth'), zuschnittTitel: art === 'fallrohr' ? L('Zuschnitt', 'Cutting') : L('Stücke', 'Pieces'), stutzenTitel: '', faltlinie: S.T('ss_leg_falz'), fuss: S.T('ss_fuss') });
    const matTexte = () => ({ summen: L('Summen', 'Totals'), hinweise: L('Hinweise', 'Notes'), annahmen: L('Annahmen und Quellen', 'Assumptions and sources'), status: s => NT.statusText(s), beleg: b => belegText(b) });
    const wahl = () => ({ dn: st.dn, werkstoff: norm.werkstoffe[st.mat].id, rinneStueck: st.stueck, rohrStueck: 2000 });

    let gueltig = false, grossText = '', zeilen = [], seiteBauer = null, angezeigt = NaN, ergLabel = '', zaehlStopp = null, letzteListe = null, dxfLiefern = null;
    function zaehleHoch(ziel, text) {
      const von = isNaN(angezeigt) ? ziel : angezeigt;
      if (zaehlStopp) zaehlStopp();
      if (von === ziel) { angezeigt = ziel; leisteWert.textContent = text(ziel); leisteWert.style.transform = ''; return; }
      zaehlStopp = S.anim(320, S.decel, (e, t) => { const x = von + (ziel - von) * t; angezeigt = x; leisteWert.textContent = text(x); const sc = 1 + 0.05 * (1 - Math.abs(2 * t - 1)); leisteWert.style.transform = 'scale(' + sc + ')'; },
        () => { angezeigt = ziel; leisteWert.textContent = text(ziel); leisteWert.style.transform = ''; });
    }
    const rinneEin = () => ({ laenge: zahl('l'), abwicklung: zahl('w'), gefaelle: zahl('g'), halterAbstand: zahl('h'), dilatationAbstand: zahl('d'), tafelBreite: zahl('tb'), ablaufMitte: st.mitte, verschnitt: zahl('v') / 100, ablaeufe: ganz('a'), aussenEcken: ganz('ea'), innenEcken: ganz('ei') });
    const mauerEin = () => ({ mauerBreite: zahl('b'), laenge: zahl('l'), ueberstand: zahl('u'), schenkel: zahl('s'), abkantung: zahl('t'), gefaelle: zahl('g'), ecken: ganz('e'), stueckLaenge: zahl('p'), dilatationAbstand: zahl('d'), verschnitt: zahl('v') / 100, einhaengestreifen: st.streifen, haftenAbstand: zahl('n') });
    const kehleEin = () => ({ laenge: zahl('l'), abwicklung: zahl('w'), aufkantung: zahl('a'), maxStueck: zahl('m'), ueberlappung: zahl('u'), kehlwinkel: zahl('k'), verschnitt: zahl('v') / 100 });
    const Neu = Ze.Neu;

    function aktualisiere() {
      dxfLiefern = null; dxfBox.style.display = 'none';
      const meld = art === 'fallrohr' ? FR.pruefe(fallEin()) : art === 'dachrinne' ? K.RinneSkizze.pruefe(rinneEin()) : art === 'mauerabdeckung' ? K.MauerSkizze.pruefe(mauerEin()) : K.KehleSkizze.pruefe(kehleEin());
      for (const k in felder) { const m = meld.find(x => x.feld === k); felder[k].fehler(m ? fehlerText(m) : null); }
      hinweisBox.innerHTML = ''; chipsAkt();
      if (meld.length) {
        gueltig = false; leisteLabel.textContent = S.T('ss_leiste_leer'); leisteWert.textContent = '-'; angezeigt = NaN;
        detail.textContent = fehlerText(meld[0]); seiteBauer = null; grossText = ''; zeilen = []; materialBox.innerHTML = '';
        cv2.style.opacity = S.dimm(); if (cv3) cv3.style.opacity = S.dimm(); teilenKnopf.disabled = true; teilenKnopf.style.opacity = .5; return;
      }
      cv2.style.opacity = 1; if (cv3) cv3.style.opacity = 1; teilenKnopf.disabled = false; teilenKnopf.style.opacity = 1; gueltig = true;
      const lb = beschr(); let ml, hinw = [], basis;
      if (art === 'fallrohr') {
        const f = FR.Fallrohr(fallEin()), fb = frBeschr();
        view.bauer = (a, w, hh, t) => a === 0 ? FR.blatt(f, w, hh, t, fb) : a === 1 ? FR.ansicht(f, w, hh, t, fb) : FR.zuschnitt(f, w, hh, t, fb);
        ml = FR.material(f, wahl());
        const lm = fmtTrim(f.laufmeterRohr, 2), sz = ml.zeilen.find(x => x.teil.startsWith('Rohrschelle')), schellen = sz ? Math.trunc(sz.menge) : 0;
        zeilen = [L('Rohr: ' + f.schnitte.length + ' Zuschnitte, ' + lm + ' m', 'Pipe: ' + f.schnitte.length + ' cuts, ' + lm + ' m'),
          L('Bögen: ' + f.bogenAnzahl + ', Schellen: ' + schellen, 'Bends: ' + f.bogenAnzahl + ', clamps: ' + schellen),
          f.nRest > 0 ? L('Rest je Rohrstück: ' + fmtTrim(f.restLaenge, 1) + ' mm', 'Rest per pipe section: ' + fmtTrim(f.restLaenge, 1) + ' mm') : L('Gesamthöhe ' + fmtTrim(f.e.hoehe, 1) + ' mm', 'Total height ' + fmtTrim(f.e.hoehe, 1) + ' mm')];
        grossText = lm + ' m'; ergLabel = L('Rohr, nur die Zuschnitte', 'Pipe, cuts only');
        zaehleHoch(f.laufmeterRohr, v => fmtTrim(v, 2) + ' m');
        basis = () => [Bl.neu.fallrohr(f, blattTexte(ergLabel, grossText, zeilen, [['STUTZEN', L('Rohr', 'Pipe')], ['BLECH', L('Bogen, Abzweiger', 'Bend, branch')], ['AKZENT', L('Reduktion', 'Reducer')], ['AUFKANT2', L('Muffe', 'Coupler')], ['UMSCHLAG', L('Schelle', 'Clamp')]]), fb)];
      } else if (art === 'dachrinne') {
        const r = K.RinneSkizze(rinneEin());
        view.bauer = (a, w, hh, t) => a === 0 ? Neu.rinneBlatt(r, w, hh, t, lb) : a === 1 ? Neu.rinneAnsicht(r, w, hh, t, lb) : Neu.rinneAbwicklung(r, w, hh, t, lb);
        ml = NT.rinne(r, wahl()); dxfLiefern = () => root.Dxf.rinne(r, st.stueck, S.T(TITEL[art]));
        zeilen = [L('Blech: ' + fmtM2(r.blechNettoM2) + ' m² netto, ' + fmtM2(r.blechM2) + ' m² mit Verschnitt', 'Sheet: ' + fmtM2(r.blechNettoM2) + ' m² net, ' + fmtM2(r.blechM2) + ' m² with waste'),
          L('Rinnenhalter: ' + r.halter, 'Gutter brackets: ' + r.halter),
          L('Höhenunterschied: ' + fmtTrim(r.hoehenunterschied, 1) + ' mm auf ' + fmtTrim(r.wirksameLaengeM, 1) + ' m', 'Height difference: ' + fmtTrim(r.hoehenunterschied, 1) + ' mm over ' + fmtTrim(r.wirksameLaengeM, 1) + ' m'),
          L('Dilatationen: ' + r.dilatationen, 'Expansion joints: ' + r.dilatationen), L('Streifen je Tafel: ' + r.streifenProBahn, 'Strips per sheet: ' + r.streifenProBahn)];
        grossText = fmtM2(r.blechM2) + ' m²'; ergLabel = L('Blech mit Verschnitt, ' + r.halter + ' Halter', 'Sheet with waste, ' + r.halter + ' brackets');
        zaehleHoch(r.blechM2, v => fmtM2(v) + ' m²'); hinw = r.hinweise().map(x => EN.t(x.text));
        basis = () => [Bl.neu.rinne(r, blattTexte(ergLabel, grossText, zeilen, [['BLECH', L('Rinne', 'Gutter')], ['AUFKANT2', L('Halter', 'Brackets')], ['UMSCHLAG', L('Dilatation', 'Expansion joint')]]), lb)];
      } else if (art === 'mauerabdeckung') {
        const m = K.MauerSkizze(mauerEin());
        view.bauer = (a, w, hh, t) => a === 0 ? Neu.mauerBlatt(m, w, hh, t, lb) : a === 1 ? Neu.mauerQuerschnitt(m, w, hh, t, lb) : Neu.mauerAbwicklung(m, w, hh, t, lb);
        ml = NT.mauer(m, wahl()); dxfLiefern = () => root.Dxf.mauer(m, S.T(TITEL[art]));
        zeilen = [L('Abwicklung: ' + fmtTrim(m.abwicklung, 1) + ' mm (je Seite ' + fmtTrim(m.seitenabwicklung, 1) + ' mm)', 'Girth: ' + fmtTrim(m.abwicklung, 1) + ' mm (' + fmtTrim(m.seitenabwicklung, 1) + ' mm each side)'),
          L('Höhenunterschied der Oberseite: ' + fmtTrim(m.hoehenunterschied, 1) + ' mm', 'Height difference of the top: ' + fmtTrim(m.hoehenunterschied, 1) + ' mm'),
          L('Blech: ' + fmtM2(m.blechNettoM2) + ' m² netto, ' + fmtM2(m.blechM2) + ' m² mit Verschnitt', 'Sheet: ' + fmtM2(m.blechNettoM2) + ' m² net, ' + fmtM2(m.blechM2) + ' m² with waste'),
          L('Stücke: ' + m.stuecke + ', Dilatationen: ' + m.dilatationen, 'Pieces: ' + m.stuecke + ', expansion joints: ' + m.dilatationen)];
        grossText = fmtTrim(m.abwicklung, 1) + ' mm × ' + m.stuecke; ergLabel = L('Abwicklung und Stücke', 'Girth and pieces');
        zaehleHoch(m.abwicklung, v => fmtTrim(v, 1) + ' mm × ' + m.stuecke); hinw = m.hinweise().map(x => EN.t(x.text));
        basis = () => [Bl.neu.mauer(m, blattTexte(ergLabel, grossText, zeilen, [['BLECH', L('Abdeckung', 'Coping')], ['UMSCHLAG', L('Umschlag', 'Hem')]]), lb)];
      } else {
        const k = K.KehleSkizze(kehleEin());
        view.bauer = (a, w, hh, t) => a === 0 ? Neu.kehleBlatt(k, w, hh, t, lb) : a === 1 ? Neu.kehleQuerschnitt(k, w, hh, t, lb) : a === 2 ? Neu.kehleAbwicklung(k, w, hh, t, lb) : Neu.kehleStuecke(k, w, hh, t, lb);
        ml = NT.kehle(k, wahl()); dxfLiefern = () => root.Dxf.kehle(k, S.T(TITEL[art]));
        zeilen = [L('Abwicklung: ' + fmtTrim(k.e.abwicklung, 1) + ' mm, Schenkel je Seite ' + fmtTrim(k.schenkel, 1) + ' mm', 'Girth: ' + fmtTrim(k.e.abwicklung, 1) + ' mm, leg each side ' + fmtTrim(k.schenkel, 1) + ' mm'),
          L('Stücke: ' + k.stuecke + ', Blechlänge: ' + fmtTrim(k.blechLaenge / 1000, 2) + ' m', 'Pieces: ' + k.stuecke + ', sheet length: ' + fmtTrim(k.blechLaenge / 1000, 2) + ' m'),
          L('Blech: ' + fmtM2(k.blechNettoM2) + ' m² netto, ' + fmtM2(k.blechM2) + ' m² mit Verschnitt', 'Sheet: ' + fmtM2(k.blechNettoM2) + ' m² net, ' + fmtM2(k.blechM2) + ' m² with waste')];
        grossText = fmtTrim(k.e.abwicklung, 1) + ' mm × ' + k.stuecke; ergLabel = L('Abwicklung und Stücke', 'Girth and pieces');
        zaehleHoch(k.e.abwicklung, v => fmtTrim(v, 1) + ' mm × ' + k.stuecke); hinw = k.hinweise().map(x => EN.t(x.text));
        basis = () => [Bl.neu.kehle(k, blattTexte(ergLabel, grossText, zeilen, [['BLECH', L('Kehlblech', 'Valley flashing')], ['AUFKANT', L('Aufkantung', 'Upstand')]]), lb)];
      }
      dxfBox.style.display = dxfLiefern ? '' : 'none';
      letzteListe = ml; ml = EN.liste(ml);   // Anzeige und Blatt englisch, der Schnappschuss (letzteListe) bleibt deutsch
      seiteBauer = () => {
        const tx = blattTexte(ergLabel, grossText, zeilen, []); tx.titel = S.T(TITEL[art]) + ': ' + L('Materialliste', 'Bill of materials');
        return basis().concat(Bl.neu.material(ml, annahmenListe(), tx, matTexte()));
      };
      leisteLabel.textContent = ergLabel; view.baue(true); baue3d(); detail.textContent = zeilen.join('\n');
      for (const x of hinw) hinweisBox.append(mt(S.warnband(x, 14), 6));
      baueMaterial(ml);
    }
    function baue3d() {
      if (!d3) return;
      let sz = null;
      try { if (art === 'fallrohr') sz = root.Szene3D.Skizzen3D.fallrohr(FR.Fallrohr(fallEin())); else if (art === 'kehle') sz = root.Szene3D.Skizzen3D.kehle(K.KehleSkizze(kehleEin())); else if (art === 'mauerabdeckung') sz = root.Szene3D.Skizzen3D.mauer(K.MauerSkizze(mauerEin())); else if (art === 'dachrinne') sz = root.Szene3D.Skizzen3D.dachrinne(K.RinneSkizze(rinneEin())); } catch (e) { sz = null; }
      d3.szene = sz ? sz.szene : null; d3.masse3d = sz ? sz.masse : []; d3.zeichnen();
    }
    function baueMaterial(ml) {
      materialBox.innerHTML = '';
      ml.zeilen.forEach((z, i) => {
        materialBox.append(mt(S.text(nz(z.menge, 2) + ' ' + z.einheit + '   ' + z.teil, 15.5, true), i === 0 ? 0 : 12), mt(S.text(z.detail, 14, false), 1), statusZeile(z.status, z.quelle));
      });
      materialBox.append(mt(S.text(L('Summen', 'Totals'), 15, true), 16));
      for (const [l, w] of ml.summen) materialBox.append(mt(S.text(l + ': ' + w, 14.5, false), 3));
      for (const [s, t] of ml.hinweise) materialBox.append(mt(statusZeile(s, t, 13.5), 8));
    }
    const snapshot = () => {
      let s = ''; for (const k in st.werte) s += k + '=' + st.werte[k] + ' ';
      s += 'werkstoff=' + norm.werkstoffe[st.mat].id + ' dn=' + st.dn + ' stueck=' + Math.trunc(st.stueck);
      if (art === 'fallrohr') s += ' teile=' + FR.teileText(st.teile);
      if (art === 'dachrinne') s += ' ablauf=' + (st.mitte ? 'mitte' : 'ende'); if (art === 'mauerabdeckung') s += ' befestigung=' + (st.streifen ? 'eingehaengt' : 'haften');
      if (letzteListe) for (const z of letzteListe.zeilen) s += '\n' + NT.zeile(z);
      return s;
    };

    // Blatt, PDF
    const zeitName = () => S.zeitName();
    async function blattDatei() { if (!seiteBauer) return null; const blob = await Bl.alsPngSeiten(seiteBauer(), 2); return { blob, name: art + '_' + zeitName() + '.png' }; }
    async function blattTeilen() {
      let d; try { d = await blattDatei(); } catch (e) { d = null; }
      if (!d) { status.textContent = S.T(gueltig ? 'status_pdf_fehler' : 'status_leer'); return; }
      status.textContent = ''; S.haptik(20);
      const vorher = teilenKnopf.textContent; teilenKnopf.textContent = '✓  ' + S.T('ss_blatt_fertig'); teilenKnopf.classList.add('ok');
      const dx = dxfLiefern ? { blob: dxfBlob(), name: dxfName() } : null;
      setTimeout(async () => { const r = await S.teilen(d.blob, d.name, S.T(TITEL[art]), dx ? [dx] : undefined); if (r === 'download') status.textContent = d.name + (dx ? ', ' + dx.name : ''); }, 420);
      setTimeout(() => { teilenKnopf.textContent = vorher; teilenKnopf.classList.remove('ok'); }, 2200);
    }
    async function pdfErstellen(ohnePush) {
      let d; try { d = await blattDatei(); } catch (e) { d = null; }
      if (!d) { status.textContent = S.T(gueltig ? 'status_pdf_fehler' : 'status_leer'); return; }
      status.textContent = ''; S.pdfDialog(d.blob, d.name, S.T('profil_share_titel'), m => { status.textContent = m; }, ohnePush);
    }

    function layout() {
      const vp = S.vp;
      const insTop = S.inset('top'), { rand, kompakt } = S.layoutRahmen(el, leiste);
      if (!quer) {
        const wunsch = vp.voll * (vp.tastatur ? 0.52 : art === 'fallrohr' ? 0.5 : 0.80);
        const frei = vp.h - insTop - rand - (kompakt ? 0 : leiste.offsetHeight);
        let kh = wunsch; if (frei > 0) kh = Math.min(wunsch, Math.max(300, frei - 96));
        if (kompakt && frei > 0) kh = frei;
        if (hoch) { kopf.style.height = ''; karte.style.flex = 'none'; karteHoehe(); } else kopf.style.height = kh + 'px';
        const klein = !hoch && (kompakt || kh < 420);
        titel.style.visibility = klein ? 'hidden' : ''; reiter.style.visibility = klein ? 'hidden' : ''; titel.style.display = reiter.style.display = kompakt && hoch ? 'none' : '';
      }
      view.groesse(karte.clientWidth, karte.clientHeight);
      if (d3) d3.setzeGroesse(karte.clientWidth, karte.clientHeight, window.devicePixelRatio || 1);
      S.autosizeAlle(el);
    }
    const ro = new ResizeObserver(() => { karteHoehe(); view.groesse(karte.clientWidth, karte.clientHeight); if (d3) d3.setzeGroesse(karte.clientWidth, karte.clientHeight, window.devicePixelRatio || 1); }); ro.observe(karte);

    setzeMehr(st.mehr);
    if (art === 'fallrohr') { mehrKnopf.style.display = 'none'; mehrBox.style.display = 'none'; }
    const nr = { uebersicht: 0, aufriss: 1, querschnitt: 1, ansicht: 1, grundriss: 2, abwicklung: 2, zuschnitt: 2, stuecke: 3 }[opt.ansicht];
    if (nr != null) { const idx = artenAlle.indexOf(nr); st.ansicht = idx >= 0 ? idx : 0; }
    view.ansicht = st.ansicht; zeigeChips();
    if (d3) { const w3 = opt.ansicht === '3d' ? true : opt.ansicht != null && opt.ansicht !== '' ? false : (pref('m3d') != null ? pref('m3d') === 'true' : true); setzeModus(w3, false); }
    return {
      el, art,
      nachEinbau() { layout(); aktualisiere(); if (opt.fokus) setTimeout(() => { const f = felder[opt.fokus]; if (f) { if (!st.mehr && !prim.includes(opt.fokus)) setzeMehr(true); f.input.focus(); layout(); } }, 50); if (opt.scroll) scroll.scrollTop = +opt.scroll; },
      kontext() { return { ansicht: st.ist3d ? '3D' : namen[st.ansicht], eingaben: snapshot().replace(/\n/g, ' | '), teilName: S.T(TITEL[art]) }; },
      layout, speichere, zerstoere() { speichere(); ro.disconnect(); if (zaehlStopp) zaehlStopp(); },
      overlay: { zurueck: true }
    };
  };
})(window);
