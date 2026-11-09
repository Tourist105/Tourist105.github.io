/* Spengler-Web: Weitere Teile (Profil, Kamin alt, Rohrbogen, Schwanenhals alt, Hosenrohr, Reduktion).
 * VEREINFACHT gegenueber Android: Eingaben, Rechnung (Profil.kt als Port, Rohr/Kamin ueber kern.js) und Ergebnis sind da, die Live-Skizze
 * ist eine einfache Linie, der 3D-Kopf der alten Rohr- und Kamin-Seite fehlt. */
(function (root) {
  'use strict';
  const S = root.S, K = root.Kern, h = S.h, T = S.T, Ze = root.Ze, fmtTrim = Ze.fmtTrim, fmt = Ze.fmt;

  // ---------------------------------------------------------------- Profil.kt (Port)
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
      const m = []; if (!e.schenkel.length) { m.push(['pf_kein_schenkel']); return m; }
      if (e.schenkel.length > 12) m.push(['pf_zu_viele']);
      e.schenkel.forEach((s, i) => { if (!(s > 0)) m.push(['pf_schenkel_null', ABC[i]]); });
      e.knicke.forEach((k, i) => { if (!(k.oeffnung >= 15 && k.oeffnung <= 180)) m.push(['pf_winkel', ABC[i], ABC[i + 1]]); });
      if (!(e.dicke > 0)) m.push(['pf_dicke']); if (e.modus === 0 && !(e.radius > 0)) m.push(['pf_radius']); if (!(e.laenge > 0)) m.push(['pf_laenge']); if (e.stueck < 1) m.push(['pf_stueck']);
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
    return { rechne, pruefe, punkte, ABC };
  })();
  S.ProfilV1 = Profil;
  const VORLAGEN = [[[100, 60], [90]], [[80, 200, 80], [90, 90]], [[15, 120, 15], [30, 30]], [[], []], [[50, 100, 50], [90, 90]]];

  function seiteBasis(titelKey, max) {
    const inh = h('div', { class: 'inhalt' });
    const el = h('div', { class: 'seite' }, inh);
    inh.append(S.seitenTitel(T(titelKey), max || 24, 56, 156));
    return { el, inh };
  }
  const mt = (e, px) => { e.style.marginTop = px + 'px'; return e; };
  const kopf = t => S.text(t, 18, true);
  const grau = t => h('div', { style: { fontSize: '14px', color: 'var(--text2)' }, text: t });

  // ---------------------------------------------------------------- Profil-Seite
  function seiteProfil(opt) {
    const { el, inh } = seiteBasis('profil_titel');
    const st = { schenkel: [100, 60], winkel: [90], links: [true], dicke: 0.7, radius: 0.7, modus: 0, eigen: 0, laenge: 1000, stueck: 1, mat: 0 };
    const DICKEN = [0.6, 0.7, 0.8, 1.0];
    const ergebnis = h('div', { style: { fontSize: '16px', whiteSpace: 'pre-line' } }), folge = h('div', { style: { fontSize: '15px', whiteSpace: 'pre-line' } }), meldung = h('div', { style: { fontSize: '16px', color: 'var(--fehler)', fontWeight: 700, whiteSpace: 'pre-line' } });
    const cv = h('canvas', { style: { width: '100%', height: '180px', display: 'block', background: '#fff', borderRadius: '18px', boxShadow: 'inset 0 0 0 1px var(--linie)' } });
    const feldBox = h('div', {}), leiste = h('div', { class: 'leiste', style: { position: 'sticky', bottom: 0, margin: '12px -16px 0', padding: '10px 16px' } });
    const lw = h('div', { class: 'lw' }), ll = h('div', { class: 'll' });
    leiste.append(h('div', { class: 'lt' }, ll, lw));
    const eingabe = () => ({ schenkel: st.schenkel.map(Number), knicke: st.winkel.map((w, i) => ({ oeffnung: +w, links: st.links[i] !== false })), dicke: st.dicke, radius: st.radius, modus: st.modus, eigen: st.eigen, laenge: st.laenge, stueck: st.stueck, dichte: 7.2 });
    function zeichne() {
      const e = eingabe(), p = Profil.punkte(e), w = cv.clientWidth, hh = 180, dpr = window.devicePixelRatio || 1;
      if (!w) return;
      cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr); const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const xs = p.map(q => q[0]), ys = p.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const s = Math.min((w - 60) / Math.max(1, x1 - x0), (hh - 50) / Math.max(1, y1 - y0)); const ox = (w - (x1 - x0) * s) / 2 - x0 * s, oy = (hh + (y1 - y0) * s) / 2 + y0 * s;
      const X = q => ox + q[0] * s, Y = q => oy - q[1] * s;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#CFE4F8'; ctx.lineWidth = 12; ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(X(q), Y(q)) : ctx.moveTo(X(q), Y(q))); ctx.stroke();
      ctx.strokeStyle = '#1B2F6B'; ctx.lineWidth = 3; ctx.stroke();
      ctx.font = '700 14px Roboto, sans-serif'; ctx.fillStyle = '#C25500'; ctx.textAlign = 'center';
      e.schenkel.forEach((sc, i) => { const a = p[i], b = p[i + 1]; if (b) ctx.fillText(Profil.ABC[i] + ' ' + fmtTrim(sc, 1), (X(a) + X(b)) / 2, (Y(a) + Y(b)) / 2 - 12); });
    }
    function rechne() {
      const e = eingabe(), m = Profil.pruefe(e);
      meldung.textContent = m.map(x => T(x[0], ...x.slice(1))).join('\n'); meldung.style.display = m.length ? '' : 'none';
      if (m.length) { ergebnis.textContent = ''; folge.textContent = ''; ll.textContent = T('profil_leiste_leer'); lw.textContent = '-'; zeichne(); return; }
      const r = Profil.rechne(e);
      ergebnis.textContent = T('profil_zuschnitt', fmtTrim(r.breite, 1)) + '\n' + (r.bieg.length ? T('profil_summe', fmtTrim(r.summe, 1), fmtTrim(r.summe - r.breite, 1), r.bieg.length) : T('profil_ohne_biegung')) + '\n'
        + T('profil_stueckliste', 'Profil', fmtTrim(r.breite, 1), e.stueck, fmtTrim(e.laenge, 0), S.fmtM2(r.m2), fmt(r.kg, r.kg < 10 ? 2 : 1))
        + (r.ueberRolle ? '\n' + T('pw_rolle') : r.ueberTafel ? '\n' + T('pw_tafel') : '') + r.kurz.map(i => '\n' + T('pw_umschlag', Profil.ABC[i])).join('');
      folge.textContent = r.bieg.map(b => T('profil_folge_zeile', b.nr, b.von, b.nach, fmtTrim(b.oeffnung, 1), T(b.links ? 'profil_links' : 'profil_rechts'), fmtTrim(b.abzug, 2)) + (b.umschlag ? T('profil_folge_umschlag') : '')).join('\n');
      ll.textContent = T('profil_ergebnis_titel'); lw.textContent = fmtTrim(r.breite, 1) + ' mm';
      zeichne();
    }
    const num = v => { const x = S.parseNum(v); return x == null ? NaN : x; };
    function baueFelder() {
      feldBox.innerHTML = '';
      st.schenkel.forEach((sc, i) => {
        feldBox.append(mt(S.feld(T('profil_schenkel_n', Profil.ABC[i]), String(sc), { onChange: v => { st.schenkel[i] = num(v); rechne(); } }), 8));
        if (i < st.schenkel.length - 1) {
          feldBox.append(mt(S.feld(T('profil_winkel_n', Profil.ABC[i], Profil.ABC[i + 1]), String(st.winkel[i]), { onChange: v => { st.winkel[i] = num(v); rechne(); } }), 8));
          feldBox.append(mt(h('div', {}, h('div', { style: { fontSize: '16px', fontWeight: 700, letterSpacing: '.045em', padding: '0 0 4px 2px' }, text: T('profil_richtung') }), S.segment([T('profil_links'), T('profil_rechts')], st.links[i] === false ? 1 : 0, j => { st.links[i] = j === 0; rechne(); })), 8));
        }
      });
    }
    const vorlage = S.waehler([T('profil_vorlage')].concat([T('vl_winkel'), T('vl_mauer'), T('vl_z'), T('vl_leer')]), 0, i => { if (i === 0) return; const v = VORLAGEN[i - 1]; st.schenkel = v[0].slice(); st.winkel = v[1].slice(); st.links = v[1].map(() => true); baueFelder(); rechne(); });
    const mat = S.waehler(S.TA('werkstoffe'), 0, i => { st.mat = i; rechne(); });
    const dick = S.waehler(DICKEN.map(d => fmtTrim(d, 2) + ' mm (' + fmt(d / 25.4, 3) + ' in)'), 1, i => { st.dicke = DICKEN[i]; rechne(); });
    const plus = S.knopf(T('profil_plus_schenkel'), false, () => { if (st.schenkel.length >= 12) return; st.schenkel.push(50); if (st.schenkel.length > 1) { st.winkel.push(90); st.links.push(true); } baueFelder(); rechne(); });
    const umsch = S.knopf(T('profil_plus_umschlag'), false, () => { if (st.schenkel.length >= 12) return; st.schenkel.push(15); st.winkel.push(30); st.links.push(true); baueFelder(); rechne(); });
    const minus = S.knopf(T('profil_minus'), false, () => { st.schenkel.pop(); st.winkel.pop(); st.links.pop(); baueFelder(); rechne(); });
    const radius = S.feld(T('profil_radius'), String(st.radius), { onChange: v => { st.radius = num(v); rechne(); } });
    const eigenF = S.feld(T('profil_eigen'), '0', { onChange: v => { st.eigen = num(v) || 0; rechne(); } });
    const modusInfo = grau(T('profil_info_din'));
    const modus = S.segment([T('profil_modus_din'), T('profil_modus_faust'), T('profil_modus_eigen')], 0, i => { st.modus = i; radius.style.display = i === 0 ? '' : 'none'; eigenF.style.display = i === 2 ? '' : 'none'; modusInfo.textContent = T(['profil_info_din', 'profil_info_faust', 'profil_info_eigen'][i]); rechne(); });
    eigenF.style.display = 'none';
    inh.append(mt(S.warnband(T('profil_warn'), 16), 6), mt(cv, 10), mt(S.karte(vorlage, grau(T('profil_vorlage_info'))), 10));
    inh.append(mt(S.karte(kopf(T('profil_material')), mat, dick), 10));
    inh.append(mt(S.karte(kopf(T('profil_schenkel_titel')), grau(T('profil_hinweis_winkel')), feldBox, plus, umsch, minus,
      S.feld(T('profil_laenge'), '1000', { onChange: v => { st.laenge = num(v); rechne(); } }), S.feld(T('profil_stueck'), '1', { onChange: v => { st.stueck = Math.trunc(num(v) || 0); rechne(); } })), 10));
    inh.append(mt(S.karte(kopf(T('profil_abzug_titel')), modus, radius, eigenF, modusInfo), 10));
    inh.append(mt(S.karte(kopf(T('profil_ergebnis_titel')), meldung, ergebnis), 10), mt(S.karte(kopf(T('profil_folge_titel')), grau(T('profil_folge_info')), folge), 10));
    inh.append(mt(S.karte(S.text(T('ss_annahmen_titel'), 18, true), S.text(T('profil_annahmen'), 15)), 10), mt(S.rmKarte('profil', T('profil_titel'), () => JSON.stringify(eingabe())), 12), leiste);
    baueFelder();
    return { el, overlay: { zurueck: true }, nachEinbau() { rechne(); S.autosizeAlle(el); if (opt.scroll) el.scrollTop = +opt.scroll; }, layout() { zeichne(); S.autosizeAlle(el); }, zerstoere() { } };
  }

  // ---------------------------------------------------------------- Rohr-Seiten (kern.js rechnet in cm, Eingabe in mm)
  const ROHR = {
    rohrbogen: { titel: 'titel_rohrbogen', felder: [['d', 'r_d', 100], ['r', 'r_radius', 150], ['w', 'r_winkel_bogen', 90], ['n', 'r_n_bogen', 5], ['z', 'r_zugabe', 0]] },
    'schwanenhals-alt': { titel: 'titel_schwanenhals', felder: [['d', 'r_d', 100], ['a', 'r_ausladung', 400], ['g', 'r_gamma', 45], ['r', 'r_radius', 150], ['n', 'r_n_hals', 4], ['z', 'r_zugabe', 0]] },
    hosenrohr: { titel: 'titel_hosenrohr', felder: [['d', 'r_d', 100], ['w', 'r_winkel_hose', 60], ['b', 'r_bein', 300], ['z', 'r_zugabe', 0]] },
    reduktion: { titel: 'titel_reduktion', felder: [['d1', 'r_d1', 150], ['d2', 'r_d2', 100], ['hh', 'r_h', 200], ['z', 'r_zugabe', 0]] }
  };
  const WINKELFELD = { w: 1, g: 1, n: 1 };   // Winkel und Stueckzahl sind keine Laengen
  function seiteRohr(name, opt) {
    const cfg = ROHR[name], { el, inh } = seiteBasis(cfg.titel), w = {};
    const erg = h('div', { style: { fontSize: '16px', whiteSpace: 'pre-line' } });
    const num = k => { const v = S.parseNum(w[k] == null ? '' : w[k]); return v == null ? NaN : (WINKELFELD[k] && !(name === 'hosenrohr' && k === 'b') ? v : v / 10); };
    const felder = cfg.felder.map(([k, lab, v]) => { w[k] = String(v); return S.feld(T(lab), String(v), { onChange: s => { w[k] = s; rechne(); } }); });
    const NAME = { BOGEN_ENDE: 't_bogen_ende', BOGEN_MITTE: 't_bogen_mitte', ROHR: 't_rohr', BEIN: 't_bein', KEGEL: 't_kegel' };
    function rechne() {
      try {
        let posten, fe = null; const z = isNaN(num('z')) ? 0 : num('z');
        if (name === 'rohrbogen') { fe = K.pruefeBogen(num('d'), num('r'), num('w'), num('n')); if (!fe) posten = K.RohrRechnung.postenBogen(K.Bogen(num('d'), num('r'), num('w'), Math.trunc(num('n')), z)); }
        else if (name === 'schwanenhals-alt') { const s = K.RohrSchwanenhals(num('d'), num('a'), num('g'), num('r'), Math.trunc(num('n')), z); fe = s.fehler(); if (!fe) posten = K.RohrRechnung.postenSchwanenhals(s); }
        else if (name === 'hosenrohr') { const s = K.Hosenrohr(num('d'), num('w'), num('b'), z); fe = s.fehler(); if (!fe) posten = K.RohrRechnung.postenHosenrohr(s); }
        else { fe = K.pruefeKegel(num('d1'), num('d2'), num('hh')); if (!fe) posten = K.RohrRechnung.postenReduktion(K.kegelstumpf(num('d1'), num('d2'), num('hh'), z)); }
        if (fe || !posten) { erg.textContent = T('fe_rot'); erg.style.color = 'var(--fehler)'; return; }
        erg.style.color = '';
        const r = K.RohrRechnung.rechnen(posten, 0.7, 7.2, 10, 100, 200);
        erg.textContent = r.posten.map(p => T('rz_posten', T(NAME[p.art]), p.stueck) + '\n' + T('rz_mass', fmtTrim(p.breite * 10, 1) + ' mm', fmtTrim(p.laenge * 10, 1) + ' mm', S.fmtM2(p.m2) + ' m²')).join('\n') + '\n' + T('rz_total', r.stueck, S.fmtM2(r.m2Verschnitt));
      } catch (e) { erg.textContent = T('fe_rot'); }
    }
    inh.append(mt(S.warnband(T('warn_preview'), 16), 6), mt(S.infoband(T('rohr_beispiel'), 15), 10), mt(S.karte(kopf(T('rohr_masse_titel')), ...felder), 10), mt(S.karte(kopf(T('rohr_ergebnis_titel')), erg), 10),
      mt(S.karte(S.text(T('ss_annahmen_titel'), 18, true), S.text(T('annahme_rohr'), 15)), 10), mt(S.rmKarte(name, T(cfg.titel), () => JSON.stringify(w)), 12));
    return { el, overlay: { zurueck: true }, nachEinbau() { rechne(); S.autosizeAlle(el); if (opt.scroll) el.scrollTop = +opt.scroll; }, layout() { S.autosizeAlle(el); }, zerstoere() { } };
  }

  // ---------------------------------------------------------------- Kamin alt (ohne 3D-Kopf)
  function seiteKaminAlt(opt) {
    const { el, inh } = seiteBasis('kamin_titel'), w = { hb: 50, sl: 50, sb: 50, vbo: 50, vbu: 50, vz: 20, vk: 20, hl: 30 }, st = { art: 0 };
    const erg = h('div', { style: { fontSize: '16px', whiteSpace: 'pre-line' } });
    const LAB = { hb: 'f_hb', sl: 'f_sl', sb: 'f_sb', vbo: 'f_vbo', vbu: 'f_vbu', vz: 'f_vz', vk: 'f_vk', hl: 'f_hl' };
    const felder = Object.keys(w).map(k => S.feld(T(LAB[k]) + ' (cm)', String(w[k]), { onChange: s => { w[k] = S.parseNum(s) || 0; rechne(); } }));
    function rechne() {
      try {
        const e = { art: K.ARTEN[st.art], werte: w, auf: 15, zl: 3, zb: 3, vsp: 10, dicke: 0.7, werkstoff: { dichte: 7.2 }, tb: 100, tl: 200, lm: 0, ueberlapp: 12, schrV: 0, schrH: 0, schrGrad: false };
        const r = K.rechnenKamin(e);
        erg.textContent = r.zeilen.map(z => T('rz_posten', z.teil.art, z.teil.stueck) + ': ' + fmtTrim(z.laenge, 1) + ' × ' + fmtTrim(z.breite, 1) + ' cm, ' + S.fmtM2(z.m2) + ' m²').join('\n') + '\n' + T('kpi_zeile', S.fmtM2(r.m2), S.fmtM2(r.m2Verschnitt), fmt(r.kg, 2), r.tafeln ? T('bedarf_tafeln', r.tafeln) : '');
      } catch (x) { erg.textContent = T('fe_rot'); }
    }
    inh.append(mt(S.warnband(T('warn_preview'), 16), 6), mt(S.karte(S.text(T('l_art'), 16, true), S.waehler(S.TA('arten'), 0, i => { st.art = i; rechne(); }), grau(T('kamin_hinweis'))), 10),
      mt(S.karte(kopf(T('masse_titel')), ...felder, grau(T('kamin_masse_hinweis'))), 10), mt(S.karte(kopf(T('h_zuschnitt')), erg), 10), mt(S.rmKarte('kamin', T('ablauf_kamin'), () => JSON.stringify(w)), 12));
    return { el, overlay: { zurueck: true }, nachEinbau() { rechne(); S.autosizeAlle(el); if (opt.scroll) el.scrollTop = +opt.scroll; }, layout() { S.autosizeAlle(el); }, zerstoere() { } };
  }

  S.seiteWeitereV1 = function (name, opt) {
    if (name === 'profil') return seiteProfil(opt);
    if (name === 'kamin-alt') return seiteKaminAlt(opt);
    if (ROHR[name]) return seiteRohr(name, opt);
    return null;
  };
})(window);
