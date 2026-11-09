/* Spengler-Web: Dachrinne, Mauerabdeckung, Kehle als Bildschirme. Port von NeueTeileActivity.kt (Aufbau, Zustaende, Rechnung ueber kern.js und normteile.js).
 * Alles mit Status "Annahme" oder "Unsicher" steht als "Annahme, Alex prueft" da. Katalog: normteile_daten.js (eine Quelle mit der App). */
(function (root) {
  'use strict';
  const S = root.S, Ze = root.Ze, K = root.Kern, NT = root.Normteile, Bl = root.Blatt, h = S.h, fmtTrim = Ze.fmtTrim, fmtM2 = S.fmtM2, nz = NT.nz;
  const L = (de, en) => S.sprache() === 'en' ? en : de;

  const DEFS = () => ({
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
  const PRIMAER = { dachrinne: ['l', 'w', 'g'], mauerabdeckung: ['b', 'l', 'g'], kehle: ['l', 'w', 'a'] };
  const TITEL = { dachrinne: 'ablauf_dachrinne', mauerabdeckung: 'ablauf_mauerabdeckung', kehle: 'ablauf_kehle' };
  const CHIPS = { dachrinne: 'rinne', mauerabdeckung: 'mauer', kehle: 'kehle' };
  const FARBE = { beleg: '#105E32', annahme: '#965000', unsicher: '#B00020' };

  S.seiteNeu = function (art, opt) {
    opt = opt || {};
    const defs = DEFS()[art], prim = PRIMAER[art], quer = S.vp.quer, D = root.NEUETEILE_DATEN, norm = NT;
    const st = { werte: {}, mat: 0, dn: 100, stueck: 5000, mitte: false, streifen: false, notiz: '', mehr: false, ansicht: 0 };
    const pref = k => S.lies('neu_' + art + '.' + k), setp = (k, v) => S.schreibe('neu_' + art + '.' + k, v);
    for (const [k, , , v] of defs) st.werte[k] = pref(k) != null ? pref(k) : v;
    st.mat = Math.min(norm.werkstoffe.length - 1, Math.max(0, +pref('mat') || 0)); st.dn = +pref('dn') || 100; st.stueck = +pref('stueck') || 5000;
    st.mitte = pref('mitte') === 'true'; st.streifen = pref('streifen') === 'true'; st.notiz = pref('notiz') || ''; st.mehr = pref('mehr') === 'true';
    if (opt.werte) for (const k in opt.werte) {
      if (k === 'mat') st.mat = Math.min(norm.werkstoffe.length - 1, Math.max(0, +opt.werte[k]));
      else if (k === 'dn') st.dn = +opt.werte[k]; else if (k === 'stueck') st.stueck = +opt.werte[k];
      else if (k === 'mitte') st.mitte = opt.werte[k] === '1'; else if (k === 'streifen') st.streifen = opt.werte[k] === '1';
      else if (k in st.werte) st.werte[k] = opt.werte[k];
    }
    if (opt.mehr != null) st.mehr = opt.mehr;
    const speichere = () => { for (const k in st.werte) setp(k, st.werte[k]); setp('mat', st.mat); setp('dn', st.dn); setp('stueck', st.stueck); setp('mitte', st.mitte); setp('streifen', st.streifen); setp('notiz', st.notiz); setp('mehr', st.mehr); };

    const arten = art === 'kehle' ? [1, 2, 3] : [1, 2];
    const artenAlle = quer ? arten : [0].concat(arten);
    const namen = artenAlle.map(a => a === 0 ? S.T('ss_uebersicht') : a === 1 ? (art === 'dachrinne' ? L('Ansicht', 'Side view') : L('Querschnitt', 'Section')) : a === 2 ? L('Abwicklung', 'Girth') : L('Stücke', 'Pieces'));
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
    primBox.append(h('div', { class: 'primreihe' }, defs.filter(d => prim.includes(d[0])).map(d => feldBauen(d))));

    // Kopf
    const karte = h('div', { class: 'skkarte' }), cv2 = h('canvas', { 'aria-label': S.T('ss_live') }); karte.append(cv2);
    const view = new S.SkizzenAnsicht(cv2); view.arten = artenAlle;
    const kippGross = h('button', { class: 'kippgross', 'aria-label': S.T('ss_tipp'), onclick: () => vollbild() }, S.iconVollbild());
    if (!quer) karte.append(kippGross);
    const chips = namen.map((n, i) => h('button', { class: 'chip', text: n, onclick: () => waehleAnsicht(i) }));
    const pdfKnopf = h('button', { class: 'pdfknopf', text: S.T('ss_ansehen'), onclick: () => pdfErstellen() });
    const reiter = h('div', { class: 'reiterzeile' }, chips, pdfKnopf);
    const titel = h('div', { class: 'sktitel' }, h('span', { text: S.T(TITEL[art]) }));
    const titelSpan = titel.firstChild; S.autosize(titelSpan, 12, 22); titelSpan.style.display = 'block'; titelSpan.style.overflow = 'hidden'; titelSpan.style.width = '100%'; titelSpan.style.fontSize = '22px';
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
    const statusZeile = (s, q, gr) => h('div', { style: { fontSize: (gr || 12.5) + 'px', color: FARBE[s], marginTop: '2px' }, text: NT.statusText(s) + ': ' + q });
    const mt = (e, px) => { e.style.marginTop = px + 'px'; return e; };
    if (quer) inh.append(S.karte(S.text(S.T('ss_masse'), 18, true), h('div', {}, primBox, mt(mehrKnopf, 12), mt(mehrBox, 6))));
    else inh.append(mehrKnopf, mt(mehrBox, 6));

    // Uebliche Werte (Chips)
    const chipTasten = [];
    const chipKarte = h('div', {});
    chipKarte.append(S.text(L('Übliche Werte', 'Usual values'), 18, true), mt(S.text(L('Antippen setzt das Mass. Die Auswahl sind die gebräuchlichen Varianten, nicht ein Vorschlag von Alex.', 'Tap to set the dimension. These are the common variants, not a suggestion from Alex.'), 13, false), 2));
    chipKarte.lastChild.style.color = 'var(--text2)';
    for (const cr of D.chips[CHIPS[art]]) {
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

    // Normteile waehlen
    function baueNormBox() {
      normBox.innerHTML = '';
      const wk = norm.werkstoffe[st.mat];
      normBox.append(S.text(norm.D.hinweis, 13, false));
      normBox.lastChild.style.color = 'var(--text2)';
      normBox.append(mt(S.text(L('Werkstoff', 'Material'), 14, true), 10), mt(S.waehler(norm.werkstoffe.map(w => w.name), st.mat, i => { st.mat = i; baueNormBox(); aktualisiere(); }), 4));
      const dicke = art === 'dachrinne' ? wk.rinne : art === 'mauerabdeckung' ? wk.mauer : wk.kehle;
      normBox.append(statusZeile(dicke.s, L('Dicke ', 'Thickness ') + nz(dicke.v, 2) + ' mm. ' + dicke.q));
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
    }
    baueNormBox();

    const annahmenListe = () => art === 'dachrinne' ? K.RinneSkizze.annahmenListe() : art === 'mauerabdeckung' ? K.MauerSkizze.annahmenListe() : K.KehleSkizze.annahmenListe();
    const belegText = b => b === 'QUELLE' ? NT.statusText('beleg') : b === 'HERLEITUNG' ? L('Eigene Herleitung', 'Own derivation') : NT.statusText('annahme');
    const annBox = h('div', {});
    annahmenListe().forEach((a, i) => {
      annBox.append(mt(S.text(a.text + ': ' + a.wert, 14.5, true), i === 0 ? 0 : 10));
      const q = h('div', { style: { fontSize: '12.5px', marginTop: '2px', color: a.beleg === 'ANNAHME' ? FARBE.annahme : 'var(--text2)' }, text: belegText(a.beleg) + (a.quelle.trim() ? ': ' + a.quelle : '') }); annBox.append(q);
    });

    inh.append(mt(S.karte(chipKarte), 10), mt(S.karte(S.text(L('Normteile wählen', 'Choose standard parts'), 18, true), mt(normBox, 8)), 10),
      mt(S.karte(S.text(S.T('ss_ergebnis'), 18, true), detail), 10), mt(hinweisBox, 10), mt(S.karte(S.text(L('Materialliste', 'Bill of materials'), 18, true), mt(materialBox, 8)), 10),
      mt(S.karte(S.text(L('Annahmen und Quellen', 'Assumptions and sources'), 18, true), mt(annBox, 8)), 10),
      mt(S.karte(S.feld(S.T('ss_notiz'), st.notiz, { text: true, ende: true, onChange: v => { st.notiz = v; } })), 10),
      mt(S.rmKarte(art, S.T(TITEL[art]), () => snapshot()), 12), status,
      mt(S.warnband(L('Die Werte sind Gesprächsgrundlage, noch keine geprüften Masse. Wo "Annahme, Alex prüft" steht, bestimmt Alex.', 'These values are a basis for discussion, not checked dimensions. Where it says "Assumption, Alex to check", Alex decides.'), 14), 12));
    const scroll = h('div', { class: 'skscroll' }, inh);
    const el = h('div', { class: 'sk' + (quer ? ' quer' : '') });
    if (quer) el.append(kopf, h('div', { class: 'skrechts' }, scroll, leiste)); else el.append(kopf, scroll, leiste);

    const zeigeChips = () => chips.forEach((b, i) => b.classList.toggle('an', i === st.ansicht));
    function waehleAnsicht(i) { if (i === st.ansicht) return; st.ansicht = i; view.ansicht = i; zeigeChips(); view.baue(false); S.haptik(8); }
    function fokus(key, an) {
      if (!an) { if (view.aktiv === key) view.aktiv = null; return; }
      view.aktiv = key;
      if (view.w > 0) {
        const z = view.zeichnungFuer(st.ansicht);
        if (!(z && z.elems.some(e => e.key === key))) for (let i = 0; i < namen.length; i++) if (i !== st.ansicht) { const q = view.zeichnungFuer(i); if (q && q.elems.some(e => e.key === key)) { waehleAnsicht(i); break; } }
      }
    }
    function fokusiere(key) { const f = felder[key]; if (!f) return; if (!st.mehr && !prim.includes(key)) setzeMehr(true); f.input.focus(); }
    view.beiMass = fokusiere; view.beiLeerTipp = () => vollbild();
    function vollbild() { const a = st.ansicht; S.vollbildZeigen((w, hh) => view.zeichnungMit(a, w, hh), view.aktiv); }

    // Rechnung
    const fehlerText = m => {
      switch (m.fehler) {
        case 'NICHT_POSITIV': return S.T('ss_e_pos'); case 'NEGATIV': return S.T('ss_e_neg'); case 'ZU_GROSS': return S.T('ss_e_gross');
        case 'WINKEL_BEREICH': return art === 'kehle' ? L('Der Winkel muss zwischen 60 und 180 Grad liegen.', 'The angle must be between 60 and 180 degrees.') : L('Das Gefälle muss zwischen 0 und 45 Grad liegen.', 'The slope must be between 0 and 45 degrees.');
        case 'KEHLE_AUFKANTUNG_ZU_GROSS': return L('Die Aufkantung ist zu gross: zwei Aufkantungen sind so gross wie die ganze Abwicklung.', 'The upstand is too large: two upstands are as large as the whole girth.');
        case 'STUECK_KUERZER_ALS_UEBERLAPPUNG': return L('Ein Stück darf nicht kürzer sein als die Überlappung.', 'A piece must not be shorter than the overlap.');
        case 'VERSCHNITT_BEREICH': return L('Der Verschnitt muss zwischen 0 und 50 Prozent liegen.', 'Waste must be between 0 and 50 percent.');
      }
      return String(m.fehler);
    };
    const beschr = () => ({ abwicklung: L('Abwicklung', 'Girth'), laenge: L('Länge', 'Length'), gefaelle: L('Gefälle', 'Fall'), dilatation: L('Dilatation', 'Expansion joint'), ablauf: L('Ablaufrohr', 'Downpipe'),
      ueberhoeht: L('Gefälle überhöht', 'fall exaggerated'), querschnitt: L('Querschnitt', 'Section'), ansicht: L('Ansicht', 'Side view'), stuecke: L('Stücke', 'Pieces'), ueberlappung: L('Überlappung', 'Overlap'), halter: L('Halter', 'Brackets'), mauer: L('Mauer', 'Wall'), bruch: L('Länge', 'Length') });
    const datum = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear(); };
    const annahmenKurz = () => L('Annahme, Alex prüft: ', 'Assumption, Alex to check: ') + annahmenListe().filter(a => a.beleg === 'ANNAHME').map(a => a.text + ' (' + a.wert + ')').join('. ') + '.';
    const blattTexte = (label, gross, zeilen, legende) => ({ titel: S.T(TITEL[art]), datum: datum(), kunde: S.T('ss_kunde'), ergebnisLabel: label, gross, zeilen, annahmenTitel: S.T('ss_annahmen_titel'), annahmen: annahmenKurz(), legende,
      aufrissTitel: L('Ansicht', 'View'), grundrissTitel: L('Abwicklung', 'Girth'), zuschnittTitel: L('Stücke', 'Pieces'), stutzenTitel: '', faltlinie: S.T('ss_leg_falz'), fuss: S.T('ss_fuss') });
    const matTexte = () => ({ summen: L('Summen', 'Totals'), hinweise: L('Hinweise', 'Notes'), annahmen: L('Annahmen und Quellen', 'Assumptions and sources'), status: s => NT.statusText(s), beleg: b => belegText(b) });
    const wahl = () => ({ dn: st.dn, werkstoff: norm.werkstoffe[st.mat].id, rinneStueck: st.stueck, rohrStueck: 2000 });

    let gueltig = false, grossText = '', zeilen = [], seiteBauer = null, angezeigt = NaN, ergLabel = '', zaehlStopp = null, letzteListe = null;
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
      const meld = art === 'dachrinne' ? K.RinneSkizze.pruefe(rinneEin()) : art === 'mauerabdeckung' ? K.MauerSkizze.pruefe(mauerEin()) : K.KehleSkizze.pruefe(kehleEin());
      for (const k in felder) { const m = meld.find(x => x.feld === k); felder[k].fehler(m ? fehlerText(m) : null); }
      hinweisBox.innerHTML = ''; chipsAkt();
      if (meld.length) {
        gueltig = false; leisteLabel.textContent = S.T('ss_leiste_leer'); leisteWert.textContent = '-'; angezeigt = NaN;
        detail.textContent = fehlerText(meld[0]); seiteBauer = null; grossText = ''; zeilen = []; materialBox.innerHTML = '';
        cv2.style.opacity = .4; teilenKnopf.disabled = true; teilenKnopf.style.opacity = .5; return;
      }
      cv2.style.opacity = 1; teilenKnopf.disabled = false; teilenKnopf.style.opacity = 1; gueltig = true;
      const lb = beschr(); let ml, hinw = [], basis;
      if (art === 'dachrinne') {
        const r = K.RinneSkizze(rinneEin());
        view.bauer = (a, w, hh, t) => a === 0 ? Neu.rinneBlatt(r, w, hh, t, lb) : a === 1 ? Neu.rinneAnsicht(r, w, hh, t, lb) : Neu.rinneAbwicklung(r, w, hh, t, lb);
        ml = NT.rinne(r, wahl());
        zeilen = [L('Blech: ' + fmtM2(r.blechNettoM2) + ' m² netto, ' + fmtM2(r.blechM2) + ' m² mit Verschnitt', 'Sheet: ' + fmtM2(r.blechNettoM2) + ' m² net, ' + fmtM2(r.blechM2) + ' m² with waste'),
          L('Rinnenhalter: ' + r.halter, 'Gutter brackets: ' + r.halter),
          L('Höhenunterschied: ' + fmtTrim(r.hoehenunterschied, 1) + ' mm auf ' + fmtTrim(r.wirksameLaengeM, 1) + ' m', 'Height difference: ' + fmtTrim(r.hoehenunterschied, 1) + ' mm over ' + fmtTrim(r.wirksameLaengeM, 1) + ' m'),
          L('Dilatationen: ' + r.dilatationen, 'Expansion joints: ' + r.dilatationen), L('Streifen je Tafel: ' + r.streifenProBahn, 'Strips per sheet: ' + r.streifenProBahn)];
        grossText = fmtM2(r.blechM2) + ' m²'; ergLabel = L('Blech mit Verschnitt, ' + r.halter + ' Halter', 'Sheet with waste, ' + r.halter + ' brackets');
        zaehleHoch(r.blechM2, v => fmtM2(v) + ' m²'); hinw = r.hinweise().map(x => x.text);
        basis = () => [Bl.neu.rinne(r, blattTexte(ergLabel, grossText, zeilen, [['BLECH', L('Rinne', 'Gutter')], ['AUFKANT2', L('Halter', 'Brackets')], ['UMSCHLAG', L('Dilatation', 'Expansion joint')]]), lb)];
      } else if (art === 'mauerabdeckung') {
        const m = K.MauerSkizze(mauerEin());
        view.bauer = (a, w, hh, t) => a === 0 ? Neu.mauerBlatt(m, w, hh, t, lb) : a === 1 ? Neu.mauerQuerschnitt(m, w, hh, t, lb) : Neu.mauerAbwicklung(m, w, hh, t, lb);
        ml = NT.mauer(m, wahl());
        zeilen = [L('Abwicklung: ' + fmtTrim(m.abwicklung, 1) + ' mm (je Seite ' + fmtTrim(m.seitenabwicklung, 1) + ' mm)', 'Girth: ' + fmtTrim(m.abwicklung, 1) + ' mm (' + fmtTrim(m.seitenabwicklung, 1) + ' mm each side)'),
          L('Höhenunterschied der Oberseite: ' + fmtTrim(m.hoehenunterschied, 1) + ' mm', 'Height difference of the top: ' + fmtTrim(m.hoehenunterschied, 1) + ' mm'),
          L('Blech: ' + fmtM2(m.blechNettoM2) + ' m² netto, ' + fmtM2(m.blechM2) + ' m² mit Verschnitt', 'Sheet: ' + fmtM2(m.blechNettoM2) + ' m² net, ' + fmtM2(m.blechM2) + ' m² with waste'),
          L('Stücke: ' + m.stuecke + ', Dilatationen: ' + m.dilatationen, 'Pieces: ' + m.stuecke + ', expansion joints: ' + m.dilatationen)];
        grossText = fmtTrim(m.abwicklung, 1) + ' mm × ' + m.stuecke; ergLabel = L('Abwicklung und Stücke', 'Girth and pieces');
        zaehleHoch(m.abwicklung, v => fmtTrim(v, 1) + ' mm × ' + m.stuecke); hinw = m.hinweise().map(x => x.text);
        basis = () => [Bl.neu.mauer(m, blattTexte(ergLabel, grossText, zeilen, [['BLECH', L('Abdeckung', 'Coping')], ['UMSCHLAG', L('Umschlag', 'Hem')]]), lb)];
      } else {
        const k = K.KehleSkizze(kehleEin());
        view.bauer = (a, w, hh, t) => a === 0 ? Neu.kehleBlatt(k, w, hh, t, lb) : a === 1 ? Neu.kehleQuerschnitt(k, w, hh, t, lb) : a === 2 ? Neu.kehleAbwicklung(k, w, hh, t, lb) : Neu.kehleStuecke(k, w, hh, t, lb);
        ml = NT.kehle(k, wahl());
        zeilen = [L('Abwicklung: ' + fmtTrim(k.e.abwicklung, 1) + ' mm, Schenkel je Seite ' + fmtTrim(k.schenkel, 1) + ' mm', 'Girth: ' + fmtTrim(k.e.abwicklung, 1) + ' mm, leg each side ' + fmtTrim(k.schenkel, 1) + ' mm'),
          L('Stücke: ' + k.stuecke + ', Blechlänge: ' + fmtTrim(k.blechLaenge / 1000, 2) + ' m', 'Pieces: ' + k.stuecke + ', sheet length: ' + fmtTrim(k.blechLaenge / 1000, 2) + ' m'),
          L('Blech: ' + fmtM2(k.blechNettoM2) + ' m² netto, ' + fmtM2(k.blechM2) + ' m² mit Verschnitt', 'Sheet: ' + fmtM2(k.blechNettoM2) + ' m² net, ' + fmtM2(k.blechM2) + ' m² with waste')];
        grossText = fmtTrim(k.e.abwicklung, 1) + ' mm × ' + k.stuecke; ergLabel = L('Abwicklung und Stücke', 'Girth and pieces');
        zaehleHoch(k.e.abwicklung, v => fmtTrim(v, 1) + ' mm × ' + k.stuecke); hinw = k.hinweise().map(x => x.text);
        basis = () => [Bl.neu.kehle(k, blattTexte(ergLabel, grossText, zeilen, [['BLECH', L('Kehlblech', 'Valley flashing')], ['AUFKANT', L('Aufkantung', 'Upstand')]]), lb)];
      }
      letzteListe = ml;
      seiteBauer = () => {
        const tx = blattTexte(ergLabel, grossText, zeilen, []); tx.titel = S.T(TITEL[art]) + ': ' + L('Materialliste', 'Bill of materials');
        return basis().concat(Bl.neu.material(ml, annahmenListe(), tx, matTexte()));
      };
      leisteLabel.textContent = ergLabel; view.baue(true); detail.textContent = zeilen.join('\n');
      for (const x of hinw) hinweisBox.append(mt(S.warnband(x, 14), 6));
      baueMaterial(ml);
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
      if (art === 'dachrinne') s += ' ablauf=' + (st.mitte ? 'mitte' : 'ende'); if (art === 'mauerabdeckung') s += ' befestigung=' + (st.streifen ? 'eingehaengt' : 'haften');
      if (letzteListe) for (const z of letzteListe.zeilen) s += '\n' + NT.zeile(z);
      return s;
    };

    // Blatt, PDF
    const zeitName = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes()); };
    async function blattDatei() { if (!seiteBauer) return null; const blob = await Bl.alsPngSeiten(seiteBauer(), 2); return { blob, name: art + '_' + zeitName() + '.png' }; }
    async function blattTeilen() {
      let d; try { d = await blattDatei(); } catch (e) { d = null; }
      if (!d) { status.textContent = S.T(gueltig ? 'status_pdf_fehler' : 'status_leer'); return; }
      status.textContent = ''; S.haptik(20);
      const vorher = teilenKnopf.textContent; teilenKnopf.textContent = '✓  ' + S.T('ss_blatt_fertig'); teilenKnopf.classList.add('ok');
      setTimeout(async () => { const r = await S.teilen(d.blob, d.name, S.T(TITEL[art])); if (r === 'download') status.textContent = d.name; }, 420);
      setTimeout(() => { teilenKnopf.textContent = vorher; teilenKnopf.classList.remove('ok'); }, 2200);
    }
    async function pdfErstellen(ohnePush) {
      let d; try { d = await blattDatei(); } catch (e) { d = null; }
      if (!d) { status.textContent = S.T(gueltig ? 'status_pdf_fehler' : 'status_leer'); return; }
      status.textContent = ''; S.pdfDialog(d.blob, d.name, S.T('profil_share_titel'), m => { status.textContent = m; }, ohnePush);
    }

    function layout() {
      const vp = S.vp;
      leiste.style.display = vp.tastatur ? 'none' : '';
      const insTop = S.inset('top'), insBot = S.inset('bottom');
      el.style.paddingBottom = (vp.tastatur ? Math.max(vp.ime, 0) : insBot) + 'px';
      if (!quer) {
        const wunsch = vp.voll * (vp.tastatur ? 0.52 : 0.80);
        const frei = vp.h - insTop - (vp.tastatur ? vp.ime : insBot) - (vp.tastatur ? 0 : leiste.offsetHeight);
        let kh = wunsch; if (frei > 0) kh = Math.min(wunsch, Math.max(300, frei - 96));
        kopf.style.height = kh + 'px';
        const klein = vp.tastatur || kh < 420;
        titel.style.visibility = klein ? 'hidden' : ''; reiter.style.visibility = klein ? 'hidden' : '';
      }
      view.groesse(karte.clientWidth, karte.clientHeight);
      S.autosizeAlle(el);
    }
    const ro = new ResizeObserver(() => view.groesse(karte.clientWidth, karte.clientHeight)); ro.observe(karte);

    setzeMehr(st.mehr);
    const nr = { uebersicht: 0, aufriss: 1, querschnitt: 1, ansicht: 1, grundriss: 2, abwicklung: 2, zuschnitt: 2, stuecke: 3 }[opt.ansicht];
    if (nr != null) { const idx = artenAlle.indexOf(nr); st.ansicht = idx >= 0 ? idx : 0; }
    view.ansicht = st.ansicht; zeigeChips();
    return {
      el, art,
      nachEinbau() { layout(); aktualisiere(); if (opt.fokus) setTimeout(() => { const f = felder[opt.fokus]; if (f) { if (!st.mehr && !prim.includes(opt.fokus)) setzeMehr(true); f.input.focus(); layout(); } }, 50); if (opt.scroll) scroll.scrollTop = +opt.scroll; },
      kontext() { return { ansicht: namen[st.ansicht], eingaben: snapshot().replace(/\n/g, ' | '), teilName: S.T(TITEL[art]) }; },
      layout, speichere, zerstoere() { speichere(); ro.disconnect(); if (zaehlStopp) zaehlStopp(); },
      overlay: { zurueck: true }
    };
  };
})(window);
