/* Rechenkern Spengler-Web: JS-Port der Kotlin-Kerne (Skizzen.kt, Rohr.kt, RohrRechnung.kt, Rechnung.kt, NeueTeile.kt).
 * Android-/DOM-frei, laeuft im Browser (window.Kern) und in node (test_ref.mjs). Masse in mm, Winkel in Grad,
 * ausser wo vermerkt (Rohr-Kern und Kamin-4-teilig rechnen wie im Original in cm, die Huelle in app.js rechnet um).
 * ENTWURF: Wo die Rechnung etwas deutet, steht es als ANNAHME in der Rueckgabe. */
(function (root) {
  'use strict';
  const PI = Math.PI, rad = d => d * PI / 180, sin = Math.sin, cos = Math.cos, tan = Math.tan;
  const aufrunden = x => Math.ceil(x - 1e-9);
  const MAX = 10000;

  // ---------------------------------------------------------------- Pruefhilfen
  function pos(out, v, f, max) { max = max || MAX; if (!isFinite(v) || v <= 0) out.push({ fehler: 'NICHT_POSITIV', feld: f }); else if (v > max) out.push({ fehler: 'ZU_GROSS', feld: f }); }
  function nichtNeg(out, v, f, max) { max = max || MAX; if (!isFinite(v) || v < 0) out.push({ fehler: 'NEGATIV', feld: f }); else if (v > max) out.push({ fehler: 'ZU_GROSS', feld: f }); }

  // ================================================================ Skizzen.kt
  // ---- Kamineinfassung (2-teilig: Hinterstueck + Vorderstueck mit Kerbe)
  function KaminSkizze(kaminBreite, kaminTiefe, streifenLinks, streifenRechts, ausladungHinten, ausladungVorne, aufkantung, umschlag) {
    const s = { kaminBreite, kaminTiefe, streifenLinks, streifenRechts, ausladungHinten, ausladungVorne, aufkantung, umschlag };
    s.breite = streifenLinks + kaminBreite + streifenRechts;
    s.kerbeTiefe = kaminTiefe / 2;
    function teil(name, ausladung) {
      const tiefe = s.kerbeTiefe + ausladung;
      const fl = s.breite * tiefe - kaminBreite * s.kerbeTiefe;
      const falt = kaminBreite + 2 * s.kerbeTiefe;
      const t = { name, breite: s.breite, tiefe, kerbeBreite: kaminBreite, kerbeTiefe: s.kerbeTiefe, flanschMm2: fl, faltLaengeMm: falt, aufkantungMm2: falt * aufkantung, umschlagMm2: s.breite * umschlag };
      t.gesamtMm2 = t.flanschMm2 + t.aufkantungMm2 + t.umschlagMm2; t.gesamtM2 = t.gesamtMm2 / 1e6; return t;
    }
    s.hinten = teil('hinten', ausladungHinten); s.vorne = teil('vorne', ausladungVorne);
    s.gesamtM2 = s.hinten.gesamtM2 + s.vorne.gesamtM2;
    return s;
  }
  KaminSkizze.pruefe = (k, t, sl, sr, ah, av, h, u) => { const o = []; pos(o, k, 'k'); pos(o, t, 't'); pos(o, sl, 'sl'); pos(o, sr, 'sr'); pos(o, ah, 'ah'); pos(o, av, 'av'); pos(o, h, 'h'); nichtNeg(o, u, 'u'); return o; };

  // ---- Schwanenhals nach Radius (zwei Boegen + Zwischenrohr). versatzDirekt (optional) = Herstellertabelle fuer zwei Boegen direkt.
  function SchwanenhalsSkizze(achsmass, bogenGrad, radius, steckung, versatzDirekt, steckungen) {
    const b = rad(bogenGrad), n = steckungen == null ? 2 : steckungen;
    const s = { achsmass, bogenGrad, radius, steckung };
    s.versatzBoegen = versatzDirekt != null ? versatzDirekt : 2 * radius * (1 - cos(b));
    s.luecke = (achsmass - s.versatzBoegen) / sin(b);
    s.rohrZuschnitt = s.luecke + n * steckung;
    s.neigungZurWaagrechten = 90 - bogenGrad;
    // Hoehe (Mittellinie): bei Tabellenversatz aus dem abgeleiteten Radius
    const rEff = versatzDirekt != null ? versatzDirekt / (2 * (1 - cos(b))) : radius;
    s.radiusEff = rEff;
    s.hoehe = 2 * rEff * sin(b) + s.luecke * cos(b);
    return s;
  }
  SchwanenhalsSkizze.pruefe = (a, bg, r, st, versatzDirekt) => {
    const o = []; pos(o, a, 'a'); pos(o, r, 'r'); nichtNeg(o, st, 's');
    if (!isFinite(bg) || bg <= 0 || bg >= 90) o.push({ fehler: 'WINKEL_BEREICH', feld: 'w' });
    const v = versatzDirekt != null ? versatzDirekt : 2 * r * (1 - cos(rad(bg)));
    if (!o.length && a <= v + 1e-9) o.push({ fehler: 'ACHSMASS_ZU_KLEIN', feld: 'a' });
    return o;
  };

  // ---- Dunstrohr
  function DunstrohrSkizze(d, breite, tiefe, streifen, rohrHoehe, umschlag, neigung, naht) {
    const a = rad(neigung), s = { d, breite, tiefe, streifen, rohrHoehe, umschlag, neigung, naht };
    s.lochQuer = d; s.lochLaengs = d / cos(a); s.lochMm2 = PI * (s.lochQuer / 2) * (s.lochLaengs / 2);
    s.umfang = PI * d; s.hoeheHoch = rohrHoehe + (d / 2) * tan(a); s.hoeheTief = rohrHoehe - (d / 2) * tan(a);
    s.mitte = breite - 2 * streifen; s.stutzenBreite = s.umfang + naht; s.stutzenMm2 = s.stutzenBreite * rohrHoehe;
    s.plattenMm2 = breite * tiefe - s.lochMm2; s.umschlagMm2 = breite * umschlag;
    s.gesamtMm2 = s.plattenMm2 + s.stutzenMm2 + s.umschlagMm2; s.gesamtM2 = s.gesamtMm2 / 1e6;
    s.fussWinkelHoch = 90 + neigung; s.fussWinkelTief = 90 - neigung;
    return s;
  }
  DunstrohrSkizze.NEIGUNG_MAX = 70;
  DunstrohrSkizze.pruefe = (d, b, t, s, h, u, n, naht) => {
    const o = []; pos(o, d, 'd'); pos(o, b, 'b'); pos(o, t, 't'); pos(o, s, 's'); pos(o, h, 'h'); nichtNeg(o, u, 'u'); nichtNeg(o, naht, 'z');
    if (!isFinite(n) || n < 0 || n > 70) o.push({ fehler: 'WINKEL_BEREICH', feld: 'n' });
    if (!o.length) {
      if (b - 2 * s < d) o.push({ fehler: 'PLATTE_ZU_SCHMAL', feld: 'b' });
      if (t < d / cos(rad(n))) o.push({ fehler: 'PLATTE_ZU_SCHMAL', feld: 't' });
      if (h - (d / 2) * tan(rad(n)) <= 0) o.push({ fehler: 'ROHR_ZU_NIEDRIG', feld: 'h' });
    }
    return o;
  };

  // ================================================================ Rohr.kt (cm, unitless)
  function flaecheVon(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }

  function Zylinderstueck(d, lc, tanUnten, tanOben, zugabe) {
    zugabe = zugabe || 0; const r = d / 2;
    const z = { d, lc, tanUnten, tanOben, zugabe, r };
    z.unten = u => -lc / 2 - r * tanUnten * cos(u / r);
    z.oben = u => lc / 2 + r * tanOben * cos(u / r);
    z.hoeheBei = phi => lc + r * (tanUnten + tanOben) * cos(phi);
    z.rueckenLaenge = z.hoeheBei(0); z.bauchLaenge = z.hoeheBei(PI);
    z.breite = PI * d + zugabe; z.laenge = lc + r * (tanUnten + tanOben);
    z.umriss = (n) => { n = Math.max(n || 96, 8); const halb = PI * r + zugabe / 2, out = []; for (let i = 0; i <= n; i++) { const u = -halb + 2 * halb * i / n; out.push([u, z.unten(u)]); } for (let i = n; i >= 0; i--) { const u = -halb + 2 * halb * i / n; out.push([u, z.oben(u)]); } return out; };
    z.flaeche = () => flaecheVon(z.umriss(720));
    return z;
  }

  function Kegelstumpf(d1, d2, h, zugabe) {
    zugabe = zugabe || 0; const k = { d1, d2, h, zugabe };
    k.rg = d1 / 2; k.rk = d2 / 2; k.ls = Math.sqrt(h * h + (k.rg - k.rk) * (k.rg - k.rk));
    k.lGross = k.rg * k.ls / (k.rg - k.rk); k.lKlein = k.lGross - k.ls;
    k.sektor = 2 * PI * k.rg / k.lGross; k.sektorGrad = k.sektor * 180 / PI;
    k.beta = Math.asin(k.rg / k.lGross); k.mantel = PI * (k.rg + k.rk) * k.ls;
    const zusatz = zugabe / k.lGross, pt = (rho, psi) => [rho * sin(psi), rho * cos(psi)];
    k.umriss = (n) => { n = Math.max(n || 96, 8); const halb = k.sektor / 2 + zusatz / 2, out = []; for (let i = 0; i <= n; i++) out.push(pt(k.lGross, -halb + 2 * halb * i / n)); for (let i = n; i >= 0; i--) out.push(pt(k.lKlein, -halb + 2 * halb * i / n)); return out; };
    k.flaeche = () => flaecheVon(k.umriss(720));
    const u = k.umriss(180); k.breite = Math.max(...u.map(p => p[0])) - Math.min(...u.map(p => p[0])); k.laenge = Math.max(...u.map(p => p[1])) - Math.min(...u.map(p => p[1]));
    return k;
  }
  const kegelstumpf = (a, b, h, z) => Kegelstumpf(Math.max(a, b), Math.min(a, b), h, z);

  function Bogen(d, radius, winkelGrad, n, zugabe) {
    const b = { d, radius, winkelGrad, n, zugabe: zugabe || 0 };
    b.alpha = rad(winkelGrad) / (2 * (n - 1)); b.alphaGrad = b.alpha * 180 / PI; b.tanA = tan(b.alpha);
    b.istEnde = j => j === 0 || j === n - 1;
    b.mittellinie = j => b.istEnde(j) ? radius * b.tanA : 2 * radius * b.tanA;
    b.stueck = j => Zylinderstueck(d, b.mittellinie(j), j === 0 ? 0 : b.tanA, j === n - 1 ? 0 : b.tanA, b.zugabe);
    b.mittellinieGesamt = () => { let s = 0; for (let j = 0; j < n; j++) s += b.mittellinie(j); return s; };
    return b;
  }
  function pruefeBogen(d, radius, w, n) {
    if (!(d > 0)) return 'DURCHMESSER'; if (!(radius > d / 2)) return 'RADIUS_ZU_KLEIN';
    if (!(w > 0 && w <= 180)) return 'WINKEL'; if (!(n >= 2 && n <= 12)) return 'SEGMENTE'; return null;
  }
  function RohrSchwanenhals(d, ausladung, gammaGrad, radius, n, zugabe) {
    const g = rad(gammaGrad), s = { d, ausladung, gammaGrad, radius, n };
    s.bogen = Bogen(d, radius, gammaGrad, n, zugabe);
    s.zwischen = (ausladung - 2 * radius * (1 - cos(g))) / sin(g);
    s.hoehe = 2 * radius * sin(g) + s.zwischen * cos(g);
    s.minAusladung = 2 * radius * (1 - cos(g));
    s.zwischenStueck = () => Zylinderstueck(d, Math.max(s.zwischen, 0), 0, 0, zugabe);
    s.fehler = () => { const b = pruefeBogen(d, radius, gammaGrad, n); if (b) return b; if (gammaGrad >= 90) return 'WINKEL'; if (ausladung <= 0 || s.zwischen < -1e-9) return 'AUSLADUNG_ZU_KLEIN'; return null; };
    return s;
  }
  function Hosenrohr(d, winkelGrad, bein, zugabe) {
    const h = { d, winkelGrad, bein }; h.beta = rad(winkelGrad / 2); h.tanB = tan(h.beta); h.gehrungGrad = winkelGrad / 2;
    h.stueck = () => Zylinderstueck(d, bein, h.tanB, 0, zugabe); h.fehler = () => pruefeHose(d, winkelGrad, bein); return h;
  }
  function pruefeHose(d, w, bein) {
    if (!(d > 0)) return 'DURCHMESSER'; if (!(w >= 10 && w <= 120)) return 'WINKEL_HOSE';
    if (!(bein > 0) || bein <= d / 2 * tan(rad(w / 2)) + 1e-9) return 'BEIN_ZU_KURZ'; return null;
  }
  function pruefeKegel(d1, d2, h) { if (!(d1 > 0) || !(d2 > 0)) return 'DURCHMESSER'; if (Math.abs(d1 - d2) < 1e-9) return 'KEGEL_GLEICH'; if (!(h > 0)) return 'HOEHE'; return null; }

  // RohrRechnung (cm; dickeMm, dichte g/cm3, Verschnitt %, Tafel tb x tl cm)
  function rohrPosten(art, stueck, mantel) { return { art, stueck, mantel, breite: mantel.breite, laenge: mantel.laenge, m2: mantel.flaeche() * stueck / 10000 }; }
  const RohrRechnung = {
    postenBogen(b) { const l = [rohrPosten('BOGEN_ENDE', 2, b.stueck(0))]; if (b.n > 2) l.push(rohrPosten('BOGEN_MITTE', b.n - 2, b.stueck(1))); return l; },
    postenSchwanenhals(s) { const l = [rohrPosten('BOGEN_ENDE', 4, s.bogen.stueck(0))]; if (s.n > 2) l.push(rohrPosten('BOGEN_MITTE', 2 * (s.n - 2), s.bogen.stueck(1))); if (s.zwischen > 1e-9) l.push(rohrPosten('ROHR', 1, s.zwischenStueck())); return l; },
    postenHosenrohr: h => [rohrPosten('BEIN', 2, h.stueck())],
    postenReduktion: k => [rohrPosten('KEGEL', 1, k)],
    rechnen(posten, dickeMm, dichte, verschnittProzent, tb, tl) {
      let m2 = 0, stk = 0, tafeln = 0; const zuGross = [];
      for (const p of posten) {
        m2 += p.m2; stk += p.stueck; const l = p.laenge, b = p.breite;
        const pro = Math.max(Math.floor(tl / l) * Math.floor(tb / b), Math.floor(tl / b) * Math.floor(tb / l));
        if (pro < 1) zuGross.push(p.art); else tafeln += p.stueck / pro;
      }
      const f = 1 + verschnittProzent / 100, m2v = m2 * f;
      return { posten, stueck: stk, m2, m2Verschnitt: m2v, kg: m2v * dickeMm * dichte, tafeln: tafeln > 0 ? Math.ceil(tafeln * f) : 0, zuGross };
    }
  };

  // ================================================================ Rechnung.kt (Kamin 4-teilig, cm)
  const WERKSTOFFE = [
    { name: 'Titanzink', dichte: 7.2, dicken: [0.6, 0.7, 0.8, 1.0], sonder: [0.6] },
    { name: 'Kupfer', dichte: 8.9, dicken: [0.55, 0.6, 0.7, 0.8, 1.0], sonder: [0.55] },
    { name: 'Aluminium', dichte: 2.7, dicken: [0.7, 0.8, 1.0, 1.2], sonder: [] },
    { name: 'Chromstahl', dichte: 7.9, dicken: [0.4, 0.5, 0.6, 0.8], sonder: [] },
    { name: 'Stahl verzinkt', dichte: 7.85, dicken: [0.5, 0.6, 0.75, 0.88], sonder: [] },
    { name: 'Stahl beschichtet', dichte: 7.85, dicken: [0.5, 0.6, 0.75], sonder: [] },
    { name: 'Blei', dichte: 11.34, dicken: [1.5, 2.0, 2.5, 1.25, 1.8, 2.24], sonder: [2.0, 2.5] }
  ];
  const ARTEN = [
    { typ: 'KAMIN' }, { typ: 'KAMIN', sattel: true }, { typ: 'KAMIN', kehle: true }, { typ: 'KAMIN', keinHinten: true, vorne2: true },
    { typ: 'KAMIN', eineSeite: true }, { typ: 'KAMIN', keinUeberlapp: true }, { typ: 'RUND' }, { typ: 'WAND' }, { typ: 'WAND', stufe: true }
  ];
  const UEBERLAPP_STANDARD = 12;
  function ueberlappVorschlag(n) { return n >= 22 ? 10 : n >= 15 ? 15 : 20; }
  function aufVorneSeitlichVorschlag(n) { return n < 5 ? 15 : n < 22 ? 10 : 8; }
  const aufVolleLatte = (m, lm) => (lm > 0 && m > 0) ? Math.max(1, Math.ceil((m - 0.05) / lm)) * lm : m;
  const schraege = (w, grad, breite) => w <= 0 ? 0 : grad ? (breite <= 0 ? 0 : breite * tan(rad(Math.min(w, 75)))) : w;
  function teileListe(e) {
    const w = k => e.werte[k] || 0, a = e.art, t = [];
    const aufFuer = art => { const v = art === 'VORDERTEIL' ? e.aufV : art === 'SEITENTEIL' ? e.aufS : (art === 'HINTERTEIL' || art === 'KEHLE') ? e.aufH : null; return v == null ? e.auf : v; };
    if (a.typ === 'KAMIN') {
      const bo = w('vbo'), bu = w('vbu'), vz = w('vz'), vkG = w('vk'), vk = aufVolleLatte(vkG, e.lm || 0), vl = vz + vk;
      if (vl !== 0 && (bo !== 0 || bu !== 0)) {
        const breite = Math.max(bo, bu), vers = schraege(e.schrV || 0, e.schrGrad, breite);
        t.push({ art: 'VORDERTEIL', stueck: a.vorne2 ? 2 : 1, laenge: vl + aufFuer('VORDERTEIL') + vers, breite, versatz: vers, form: (bo !== 0 && bu !== 0 && bo !== bu) ? 'KONISCH' : 'GERADE', bo, bu, gemessen: vk !== vkG ? vkG : 0, aufLatte: vk !== vkG ? vk : 0, vorneZiegel: vz, vorneLatte: vk });
      }
      if (w('sl') !== 0 && w('sb') !== 0) t.push({ art: 'SEITENTEIL', stueck: a.eineSeite ? 1 : 2, laenge: w('sl') + aufFuer('SEITENTEIL'), breite: w('sb'), form: 'GERADE' });
      const hlG = w('hhl') || w('hl'), hl = aufVolleLatte(hlG, e.lm || 0);
      if (!a.keinHinten && hl !== 0 && w('hb') !== 0) {
        const ueb = a.keinUeberlapp ? 0 : (e.ueberlapp == null ? UEBERLAPP_STANDARD : e.ueberlapp);
        const vers = schraege(e.schrH || 0, e.schrGrad, w('hb'));
        t.push({ art: 'HINTERTEIL', stueck: 1, laenge: hl + ueb + aufFuer('HINTERTEIL') + vers, breite: w('hb'), versatz: vers, ueberlapp: ueb, form: ueb > 0 ? 'UEBERLAPPUNG' : 'GERADE', gemessen: hl !== hlG ? hlG : 0, aufLatte: hl !== hlG ? hl : 0 });
        if (a.sattel) t.push({ art: 'SATTEL', stueck: 2, laenge: hl, breite: w('hb') / 2, form: 'DREIECK' });
        if (a.kehle) t.push({ art: 'KEHLE', stueck: 1, laenge: w('hb'), breite: hl + aufFuer('KEHLE'), form: 'RINNE' });
      }
    } else if (a.typ === 'RUND') {
      if (w('rd') && w('rh')) t.push({ art: 'MANSCHETTE', stueck: 1, laenge: w('rh'), breite: w('rd') * PI, form: 'RUND' });
      if (w('gl') && w('gb')) t.push({ art: 'GRUNDBLECH', stueck: 1, laenge: w('gl'), breite: w('gb'), form: 'GERADE' });
    } else {
      if (w('wl') && w('wb')) t.push({ art: a.stufe ? 'STUFE' : 'WAND', stueck: Math.max(1, w('wa') || 1), laenge: w('wl'), breite: w('wb'), form: 'GERADE' });
    }
    return t;
  }
  function rechnenKamin(e) {
    const zeilen = []; let m2 = 0, stk = 0, tafeln = 0; const zuGross = [];
    for (const t of teileListe(e)) {
      const l = t.laenge + e.zl, b = t.breite + e.zb, f = l * b / 10000 * t.stueck;
      m2 += f; stk += t.stueck; zeilen.push({ teil: t, laenge: l, breite: b, m2: f });
      const pro = Math.max(Math.floor(e.tl / l) * Math.floor(e.tb / b), Math.floor(e.tl / b) * Math.floor(e.tb / l));
      if (pro < 1) zuGross.push(t.art); else tafeln += t.stueck / pro;
    }
    const fa = 1 + e.vsp / 100, m2v = m2 * fa;
    return { zeilen, stueck: stk, m2, m2Verschnitt: m2v, kg: m2v * e.dicke * e.werkstoff.dichte, tafeln: tafeln > 0 ? Math.ceil(tafeln * fa) : 0, zuGross };
  }

  // ================================================================ NeueTeile.kt + VorgabenNeueTeile.kt (Stand 09.11.2026, 1:1 zu Kotlin)
  // Vorgaben, Chips, Werkstoffe und Annahmen-Listen kommen aus neueteile_daten.js (erzeugt vom Kotlin-Test NormteileTest.exportFuersWeb, nicht von Hand).
  const ND = root.NEUETEILE_DATEN || (typeof require !== 'undefined' ? require('./neueteile_daten.js') : null);
  const V = ND.vorgaben;
  function meldeVerschnitt(o, v) { if (!isFinite(v) || v < 0 || v > 0.5) o.push({ fehler: 'VERSCHNITT_BEREICH', feld: 'v' }); }
  const NEU_MAX = 100000;
  const nzahl = v => v === Math.round(v) ? String(Math.round(v)) : v.toFixed(1);
  const neuAnn = key => () => ND.annahmen[key].map(a => Object.assign({}, a));
  const NEU_WERKSTOFFE = ND.werkstoffe;

  const RINNE_VORGABE = { laenge: 10000, abwicklung: V.RINNE_ABWICKLUNG, gefaelle: V.RINNE_GEFAELLE, halterAbstand: V.RINNE_HALTER, dilatationAbstand: V.RINNE_DILATATION, tafelBreite: V.TAFEL_BREITE,
    ablaufMitte: false, verschnitt: 0.05, ablaeufe: 1, aussenEcken: 0, innenEcken: 0 };
  function RinneSkizze(e) {
    e = Object.assign({}, RINNE_VORGABE, e); const s = { e };
    s.laengeM = e.laenge / 1000; s.blechNettoM2 = e.laenge * e.abwicklung / 1e6; s.blechM2 = s.blechNettoM2 * (1 + e.verschnitt);
    s.halter = aufrunden(e.laenge / e.halterAbstand) + 1; s.wirksameLaengeM = e.ablaufMitte ? s.laengeM / 2 : s.laengeM; s.hoehenunterschied = s.wirksameLaengeM * e.gefaelle;
    s.dilatationen = Math.max(0, aufrunden(e.laenge / e.dilatationAbstand) - 1); s.streifenProBahn = Math.floor(e.tafelBreite / e.abwicklung + 1e-9);
    s.ablaeufe = e.ablaeufe; s.aussenEcken = e.aussenEcken; s.innenEcken = e.innenEcken;
    s.stueckliste = [['Rinnenhalter', s.halter], ['Rinnenwinkel aussen', e.aussenEcken], ['Rinnenwinkel innen', e.innenEcken], ['Rinnenstutzen (Ablauf)', e.ablaeufe], ['Dilatation', s.dilatationen]].filter(x => x[1] > 0);
    s.hinweise = () => { const o = [];
      if (!RinneSkizze.ABWICKLUNGEN.some(x => Math.abs(x - e.abwicklung) < 1e-9)) o.push({ id: 'abw_unueblich', feld: 'w', text: 'Abwicklung ist keine der üblichen 250 / 280 / 330 / 400 mm.' });
      if (e.gefaelle < 3 || e.gefaelle > 5) o.push({ id: 'gefaelle_bereich', feld: 'g', text: 'Gefälle ausserhalb 3 bis 5 mm/m. Empfehlung 5 mm/m (Entwurf prSIA 232/1), ohne Gefälle nur mit Berechnung, Gegengefälle nicht zulässig.' });
      if (e.halterAbstand < 500 || e.halterAbstand > 900) o.push({ id: 'halter_bereich', feld: 'h', text: 'Halterabstand ausserhalb 50 bis 90 cm (RHEINZINK 50 bis 80, VMZINC 70 bis 90). Bei Schnee 50 bis 60 cm.' });
      if (e.dilatationAbstand > 10000) o.push({ id: 'dil_ueber10', feld: 'd', text: 'Mehr als 10 m ist auch mit frei beweglichen Enden nicht gedeckt (Zink: 5 m mit Dehnelement, 10 m freie Enden, prSIA 232/1 Entwurf). Deutsche Hersteller erlauben bis 15 m.' });
      return o; };
    s.annahmen = RinneSkizze.annahmenListe;
    return s;
  }
  RinneSkizze.ABWICKLUNGEN = [250, 280, 330, 333, 400];
  RinneSkizze.pruefe = (e) => { e = Object.assign({}, RINNE_VORGABE, e); const o = []; pos(o, e.laenge, 'l', NEU_MAX); pos(o, e.abwicklung, 'w', 2000); pos(o, e.halterAbstand, 'h', NEU_MAX); pos(o, e.dilatationAbstand, 'd', NEU_MAX);
    nichtNeg(o, e.gefaelle, 'g', 100); meldeVerschnitt(o, e.verschnitt);
    if (e.ablaeufe < 0 || e.ablaeufe > 100) o.push({ fehler: 'NEGATIV', feld: 'a' }); if (e.aussenEcken < 0 || e.aussenEcken > 100) o.push({ fehler: 'NEGATIV', feld: 'ea' }); if (e.innenEcken < 0 || e.innenEcken > 100) o.push({ fehler: 'NEGATIV', feld: 'ei' });
    return o; };
  RinneSkizze.annahmenListe = neuAnn('rinne');

  const MAUER_VORGABE = { mauerBreite: 250, laenge: 4000, ueberstand: V.MAUER_UEBERSTAND, schenkel: V.MAUER_SCHENKEL, abkantung: V.MAUER_UMSCHLAG, gefaelle: V.MAUER_GEFAELLE, ecken: 0, stueckLaenge: V.MAUER_STUECK,
    dilatationAbstand: V.MAUER_DILATATION, verschnitt: 0.05, einhaengestreifen: false, haftenAbstand: V.MAUER_HAFTEN };
  function MauerSkizze(e) {
    e = Object.assign({}, MAUER_VORGABE, e); const s = { e };
    s.seitenabwicklung = e.ueberstand + e.schenkel + e.abkantung; s.abwicklung = e.mauerBreite + 2 * s.seitenabwicklung;
    s.abwicklungMitGefaelle = (e.mauerBreite + 2 * e.ueberstand) / cos(rad(e.gefaelle)) + 2 * (e.schenkel + e.abkantung);
    s.hoehenunterschied = e.mauerBreite * tan(rad(e.gefaelle));
    s.blechNettoM2 = e.laenge * s.abwicklung / 1e6; s.blechM2 = s.blechNettoM2 * (1 + e.verschnitt);
    s.stuecke = aufrunden(e.laenge / e.stueckLaenge); s.dilatationen = Math.max(0, aufrunden(e.laenge / e.dilatationAbstand) - 1);
    s.streifenLaenge = e.einhaengestreifen ? 2 * e.laenge : 0;
    s.haften = (e.einhaengestreifen || e.haftenAbstand <= 0) ? 0 : aufrunden(e.laenge / e.haftenAbstand) + 1;
    s.stossverbinder = Math.max(0, s.stuecke - 1);
    s.stueckliste = [['Abdeckung, Abwicklung ' + nzahl(s.abwicklung), s.stuecke], ['Stossverbinder (Steckschieber / Stossblech)', s.stossverbinder], ['Haften (Stahl 1,0 mm)', s.haften], ['Gehrung / Ecke', e.ecken], ['Dilatation', s.dilatationen]].filter(x => x[1] > 0);
    s.hinweise = () => { const o = [];
      if (e.ueberstand < 30) o.push({ id: 'ueberstand_min', feld: 'u', text: 'Tropfkante weniger als 30 mm von der Wand (Mindestmass Merkblatt Gebäudehülle Schweiz, Empfehlung 50).' });
      if (e.schenkel < 50) o.push({ id: 'schenkel_min', feld: 's', text: 'Senkrechter Schenkel unter 50 mm (Mindestmass, windexponiert 100 mm: Gebäudehülle Schweiz, RHEINZINK, KLM).' });
      if (e.abkantung > e.ueberstand) o.push({ id: 'abkantung_wand', feld: 't', text: 'Die Abkantung ist länger als der Abstand zur Wand: sie würde an der Mauer anstehen.' });
      if (e.gefaelle < 3) o.push({ id: 'gefaelle_min', feld: 'g', text: 'Gefälle unter 3 Grad (Mindestmass laut RHEINZINK).' });
      if (e.dilatationAbstand > 5000) o.push({ id: 'dil_ueber5', feld: 'd', text: 'Mehr als 5 m zwischen Dilatationen: Schweizer Wert für Zink ist 5 m (Merkblatt Gebäudehülle), RHEINZINK D erlaubt 8 m.' });
      if (s.abwicklung > 500) o.push({ id: 'abw_ueber500', feld: 'w', text: 'Abwicklung über 500 mm: der Devis-Standard ist 500, bis 5x abgekantet.' });
      if (s.abwicklung >= 800) o.push({ id: 'abw_800', feld: 'w', text: 'Ab 800 mm Abwicklung nennt RHEINZINK Stehfalz statt einer Tafel.' });
      return o; };
    s.annahmen = MauerSkizze.annahmenListe;
    return s;
  }
  MauerSkizze.pruefe = (e) => { e = Object.assign({}, MAUER_VORGABE, e); const o = []; pos(o, e.mauerBreite, 'b', NEU_MAX); pos(o, e.laenge, 'l', NEU_MAX); pos(o, e.ueberstand, 'u', 1000); pos(o, e.schenkel, 's', 1000);
    nichtNeg(o, e.abkantung, 't', 1000); pos(o, e.stueckLaenge, 'p', NEU_MAX); pos(o, e.dilatationAbstand, 'd', NEU_MAX); meldeVerschnitt(o, e.verschnitt);
    if (!isFinite(e.gefaelle) || e.gefaelle < 0 || e.gefaelle >= 45) o.push({ fehler: 'WINKEL_BEREICH', feld: 'g' }); if (e.ecken < 0 || e.ecken > 100) o.push({ fehler: 'NEGATIV', feld: 'e' }); return o; };
  MauerSkizze.annahmenListe = neuAnn('mauer');

  const KEHLE_VORGABE = { laenge: 4000, abwicklung: V.KEHLE_ABWICKLUNG, aufkantung: V.KEHLE_AUFKANTUNG, maxStueck: V.KEHLE_STUECK, ueberlappung: V.KEHLE_UEBERLAPPUNG, kehlwinkel: 130, verschnitt: 0.05 };
  function KehleSkizze(e) {
    e = Object.assign({}, KEHLE_VORGABE, e); const s = { e };
    s.schenkel = (e.abwicklung - 2 * e.aufkantung) / 2;
    s.stuecke = Math.max(1, aufrunden((e.laenge - e.ueberlappung) / (e.maxStueck - e.ueberlappung)));
    s.blechLaenge = e.laenge + (s.stuecke - 1) * e.ueberlappung; s.blechNettoM2 = e.laenge * e.abwicklung / 1e6;
    s.blechM2 = s.blechLaenge * e.abwicklung * (1 + e.verschnitt) / 1e6;
    s.schenkelNeigung = (180 - e.kehlwinkel) / 2; s.spannweite = 2 * s.schenkel * cos(rad(s.schenkelNeigung)); s.tiefe = s.schenkel * sin(rad(s.schenkelNeigung));
    s.stueckLaengen = () => { const r = []; for (let i = 0; i < s.stuecke; i++) r.push(Math.min(e.maxStueck, e.laenge - i * (e.maxStueck - e.ueberlappung))); return r; };
    s.stueckliste = [['Kehlblech, Abwicklung ' + nzahl(e.abwicklung), s.stuecke]];
    s.hinweise = () => { const o = [];
      if (e.abwicklung < 400 || e.abwicklung > 708) o.push({ id: 'abw_bereich', feld: 'w', text: 'Abwicklung ausserhalb 400 bis 708 mm (400 nur Metalldach mit Einfachfalz ab 25 Grad, RHEINZINK CH; Devis 500 / 670 / 708).' });
      if (e.maxStueck > 3000) o.push({ id: 'stueck_3m', feld: 'm', text: 'Einzelstücke über 3 m sind nicht durch die Quelle gedeckt (gefalzte Kehle bis 3 m: RHEINZINK CH; PREFA 3000).' });
      if (e.ueberlappung < 100) o.push({ id: 'ueberlappung_100', feld: 'u', text: 'Überlappung unter 100 mm: Braas und ddh.de nennen mindestens 100 mm (ab 22 Grad Kehlneigung), 150 mm darunter. Beide Quellen aus Deutschland.' });
      if (e.aufkantung < 15) o.push({ id: 'aufkantung_klein', feld: 'a', text: 'Aufkantung unter 15 mm: Debrunner Normfigur 107 zeigt 15, SAREI 15 (Abwicklung 333) und 20 (400).' });
      return o; };
    s.annahmen = KehleSkizze.annahmenListe;
    return s;
  }
  KehleSkizze.ABWICKLUNGEN = [400, 500, 670, 708];
  KehleSkizze.pruefe = (e) => { e = Object.assign({}, KEHLE_VORGABE, e); const o = []; pos(o, e.laenge, 'l', NEU_MAX); pos(o, e.abwicklung, 'w', 3000); nichtNeg(o, e.aufkantung, 'a', 1000); pos(o, e.maxStueck, 'm', NEU_MAX);
    nichtNeg(o, e.ueberlappung, 'u', NEU_MAX); meldeVerschnitt(o, e.verschnitt);
    if (!isFinite(e.kehlwinkel) || e.kehlwinkel <= 60 || e.kehlwinkel >= 180) o.push({ fehler: 'WINKEL_BEREICH', feld: 'k' });
    if (!o.length) { if (e.abwicklung - 2 * e.aufkantung <= 0) o.push({ fehler: 'KEHLE_AUFKANTUNG_ZU_GROSS', feld: 'a' }); if (e.maxStueck <= e.ueberlappung) o.push({ fehler: 'STUECK_KUERZER_ALS_UEBERLAPPUNG', feld: 'm' }); }
    return o; };
  KehleSkizze.annahmenListe = neuAnn('kehle');
  /** Ueberlappung nach Kehlneigung (Braas Tab. 3, ddh.de): ab 22 Grad 100, ab 15 Grad 150, darunter null (loeten). */
  const kehleUeberlappung = n => n >= 22 ? 100 : n >= 15 ? 150 : null;
  const kehlneigung = (dach, grundriss) => Math.atan(tan(rad(dach)) * sin(rad(grundriss == null ? 90 : grundriss) / 2)) * 180 / PI;
  const kehleMindestbreite = ueb => 2 * (ueb + 40 + 15);

  // ================================================================ Hersteller-Versatztabelle (zwei Boegen direkt, Achsmass in mm)
  // HBW "Ausladung der Fallrohrboegen" (praxis_haendler-boegen.md, rohr.md): 72 Grad 150/190/230, 85 Grad 210/260/310 fuer Rohr 60/80/100.
  const VERSATZ_TABELLE = { 72: { 60: 150, 80: 190, 100: 230 }, 85: { 60: 210, 80: 260, 100: 310 } };
  /** Durchmesser CH 60/75/100/120: 75 zaehlt als EU 80 (Annahme), 120 hat keinen Tabellenwert. */
  function versatzTabelle(winkel, d) { const dd = d === 75 ? 80 : d; const t = VERSATZ_TABELLE[winkel]; return t && t[dd] != null ? t[dd] : null; }
  /** Annahme-Radius der Mittellinie ohne Tabelle: 1,7 x Durchmesser (aus der 72-Grad-Tabelle abgeleitet, 1,66 bis 1,81). */
  const radiusAnnahme = d => 1.7 * d;

  root.Kern = { KaminSkizze, SchwanenhalsSkizze, DunstrohrSkizze, Zylinderstueck, Kegelstumpf, kegelstumpf, Bogen, pruefeBogen, RohrSchwanenhals, Hosenrohr, pruefeHose, pruefeKegel, RohrRechnung,
    WERKSTOFFE, ARTEN, teileListe, rechnenKamin, ueberlappVorschlag, aufVorneSeitlichVorschlag, UEBERLAPP_STANDARD, RinneSkizze, MauerSkizze, KehleSkizze, NEU_WERKSTOFFE, kehleUeberlappung, kehlneigung, kehleMindestbreite, NEU_DATEN: ND, VERSATZ_TABELLE, versatzTabelle, radiusAnnahme, flaecheVon };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Kern;
})(typeof window !== 'undefined' ? window : globalThis);
