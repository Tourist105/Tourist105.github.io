/* Spengler-Web: Port von kern/Fallrohr.kt, FallrohrBlaetter.kt und NeueTeileSeiten.fallrohr (Fallrohr als Normteile-Planer).
 * Bauteile von oben nach unten, die App rechnet nur die Rohrlaenge dazwischen. Alles aus dem Katalog normteile.json (Status Beleg/Annahme/Unsicher).
 * Gleiche Zahlen und Texte wie die App: test_normteile.mjs vergleicht gegen ref/fallrohr_ref.txt. */
(function (root) {
  'use strict';
  const K = root.Kern, NT = root.Normteile, ND = root.NEUETEILE_DATEN || (typeof require !== 'undefined' ? require('./neueteile_daten.js') : null);
  const nz = NT.nz, min = Math.min, max = Math.max, sin = Math.sin, cos = Math.cos;
  const NEU_MAX = 100000, MAX_TEILE = 24;
  const rad = d => d * Math.PI / 180;
  // Texte der Kachel und Hinweis auf die alten Rechner (wie Android strings.xml, strings_rohr.xml)
  if (root.TEXTE) {
    const dz = { de: { ablauf_fallrohr: 'Fallrohr', ablauf_fallrohr_info: 'Normteile wählen, nur die Rohrlänge rechnen, Materialliste' },
      en: { ablauf_fallrohr: 'Downpipe', ablauf_fallrohr_info: 'Choose standard parts, calculate only the pipe length, bill of materials' } };
    for (const l in dz) {
      const t = root.TEXTE[l]; if (!t) continue;
      for (const k in dz[l]) t[k] = dz[l][k];
    }
  }
  const aufrunden = x => Math.ceil(x - 1e-9);
  const TYPEN = ['rohr', 'versatz', 'bogen', 'abzweig', 'reduktion', 'muffe', 'schelle', 'endstueck'];
  const FT = (typ, w, m) => ({ typ, w: w == null ? NaN : w, m: m == null ? NaN : m });
  const STANDARD = () => [FT('rohr'), FT('versatz', 72, 250), FT('rohr')];
  const radius = dn => NT.radiusFaktor.v * dn;
  const muffe = dn => { const d = NT.dnVon(dn); return d ? d.muffe : 0; };
  const abzweig = g => (NT.D.abzweig || []).find(a => Math.abs(a.grad - g) < 1e-9) || null;
  const stat = s => s;

  const zt = v => isNaN(v) ? '' : (v === Math.round(v) && Math.abs(v) < 1e15) ? String(Math.round(v)) : String(v);
  const teileText = l => l.map(t => t.typ + ':' + zt(t.w) + ':' + zt(t.m)).join(';');
  function teileVon(s) {
    if (s == null) return null;
    if (s.trim() === '') return [];
    const out = [];
    for (const part of s.split(';')) {
      const p = part.split(':');
      if (!TYPEN.includes(p[0])) return null;
      const w = p.length > 1 && p[1] !== '' ? parseFloat(p[1]) : NaN, m = p.length > 2 && p[2] !== '' ? parseFloat(p[2]) : NaN;
      out.push(FT(p[0], isNaN(w) ? NaN : w, isNaN(m) ? NaN : m));
    }
    return out;
  }

  /** Prueft die Eingaben (Feldschluessel "h", "s", "p0", "p1", ...). e = {hoehe, steckung, dn, teile}. */
  function pruefe(e) {
    const out = [];
    if (!isFinite(e.hoehe) || e.hoehe <= 0) out.push({ fehler: 'NICHT_POSITIV', feld: 'h' });
    else if (e.hoehe > NEU_MAX) out.push({ fehler: 'ZU_GROSS', feld: 'h' });
    if (!isFinite(e.steckung) || e.steckung < 0) out.push({ fehler: 'NEGATIV', feld: 's' });
    else if (e.steckung > 500) out.push({ fehler: 'ZU_GROSS', feld: 's' });
    let dn = e.dn;
    const boegenEnde = e.teile.findIndex(t => t.typ === 'bogen');
    e.teile.forEach((t, i) => {
      const k = 'p' + i;
      const mPos = () => { if (!isFinite(t.m) || t.m <= 0) out.push({ fehler: 'NICHT_POSITIV', feld: k }); else if (t.m > NEU_MAX) out.push({ fehler: 'ZU_GROSS', feld: k }); };
      const mOpt = () => { if (!isNaN(t.m)) { if (!isFinite(t.m) || t.m < 0) out.push({ fehler: 'NEGATIV', feld: k }); else if (t.m > NEU_MAX) out.push({ fehler: 'ZU_GROSS', feld: k }); } };
      switch (t.typ) {
        case 'rohr': if (!isNaN(t.m)) mPos(); break;
        case 'versatz':
          if (!isFinite(t.w) || t.w <= 0 || t.w >= 90) out.push({ fehler: 'WINKEL_BEREICH', feld: k });
          else if (!isFinite(t.m) || t.m <= 0) out.push({ fehler: 'NICHT_POSITIV', feld: k });
          else if (t.m > NEU_MAX) out.push({ fehler: 'ZU_GROSS', feld: k });
          else if (t.m - 2 * radius(dn) * (1 - cos(rad(t.w))) < 0) out.push({ fehler: 'FALLROHR_ACHS_ZU_KLEIN', feld: k });
          break;
        case 'bogen':
          if (!isFinite(t.w) || t.w <= 0 || t.w > 90) out.push({ fehler: 'WINKEL_BEREICH', feld: k });
          if (boegenEnde === i && e.teile.slice(i + 1).some(x => x.typ !== 'schelle' && x.typ !== 'endstueck')) out.push({ fehler: 'FALLROHR_BOGEN_ENDE', feld: k });
          break;
        case 'abzweig': if (!isFinite(t.w) || t.w <= 0 || t.w >= 90) out.push({ fehler: 'WINKEL_BEREICH', feld: k }); mOpt(); break;
        case 'reduktion': {
          const nach = isFinite(t.w) ? Math.trunc(t.w) : -1;
          if (NT.dnVon(nach) == null || nach >= dn) out.push({ fehler: 'FALLROHR_REDUKTION', feld: k }); else dn = nach;
          mOpt(); break;
        }
        case 'muffe': case 'endstueck': mOpt(); break;
        default: break;
      }
    });
    if (e.teile.length > MAX_TEILE) out.push({ fehler: 'ZU_GROSS', feld: 'p' + MAX_TEILE });
    if (!out.length) { const s = Fallrohr(e); if (s.restLaenge < -1e-9) out.push({ fehler: 'FALLROHR_ZU_HOCH', feld: 'h' }); }
    return out;
  }

  function Fallrohr(e) {
    let dn = e.dn, fest = 0, rest = 0;
    const t = e.teile, zeilen = [];
    const vor = i => { let j = i - 1; while (j >= 0 && t[j].typ === 'schelle') j--; return j >= 0 ? t[j] : null; };
    const nach = i => { let j = i + 1; while (j < t.length && t[j].typ === 'schelle') j++; return j < t.length ? t[j] : null; };
    t.forEach((p, i) => {
      let sicht = 0, zu = 0, ends = 0, isRest = false, sk = null, kat = true, st = 'beleg', dnNach = dn;
      switch (p.typ) {
        case 'rohr': {
          if (isNaN(p.m)) { isRest = true; rest++; } else { sicht = p.m; fest += sicht; }
          const o = vor(i), u = nach(i);
          ends = (o == null || o.typ !== 'rohr' ? 1 : 0) + (u != null && u.typ !== 'rohr' ? 1 : 0);
          kat = false; break;
        }
        case 'versatz': sk = K.SchwanenhalsSkizze(p.m, p.w, radius(dn), e.steckung); sicht = sk.hoehe; zu = sk.rohrZuschnitt; fest += sicht; kat = false; break;
        case 'bogen': sicht = radius(dn) * sin(rad(p.w)); fest += sicht; kat = false; break;
        case 'abzweig': {
          const a = abzweig(p.w);
          if (isNaN(p.m)) { sicht = a ? a.bh : 0; st = a ? a.s : 'unsicher'; } else { sicht = p.m; kat = false; }
          fest += sicht; break;
        }
        case 'reduktion':
          dnNach = Math.trunc(p.w);
          if (isNaN(p.m)) { sicht = max(muffe(dn), muffe(dnNach)); st = 'unsicher'; } else { sicht = p.m; kat = false; }
          fest += sicht; break;
        case 'muffe': {
          if (isNaN(p.m)) { sicht = muffe(dn); const d = NT.dnVon(dn); st = d ? d.muffeStatus : 'unsicher'; } else { sicht = p.m; kat = false; }
          fest += sicht; break;
        }
        case 'endstueck':
          if (isNaN(p.m)) { sicht = 0; st = 'unsicher'; } else { sicht = p.m; kat = false; }
          fest += sicht; break;
        default: break;
      }
      zeilen.push({ index: i, teil: p, dn, dnNach, sichtbar: sicht, zuschnitt: zu, steckEnden: ends, rest: isRest, sk, ausKatalog: kat, katalogStatus: st });
      dn = dnNach;
    });
    const r = e.hoehe - fest;
    const restLaenge = rest > 0 ? r / rest : r;
    const s = { e, n: NT, zeilen, nRest: rest, festSumme: fest, restLaenge, fehlend: rest === 0 && r > 0.5 ? r : 0, schlussDn: dn };
    if (rest > 0) zeilen.forEach((z, i) => { if (z.rest) { const sicht = max(restLaenge, 0); zeilen[i] = Object.assign({}, z, { sichtbar: sicht, zuschnitt: sicht > 1e-9 ? sicht + z.steckEnden * e.steckung : 0, sk: null, ausKatalog: false }); } });
    zeilen.forEach((z, i) => { if (z.teil.typ === 'rohr' && !z.rest) zeilen[i] = Object.assign({}, z, { zuschnitt: z.sichtbar > 1e-9 ? z.sichtbar + z.steckEnden * e.steckung : 0 }); });
    s.schnitte = [];
    for (const z of zeilen) {
      if (z.teil.typ === 'rohr' && z.zuschnitt > 0) s.schnitte.push({ index: z.index, dn: z.dn, zuschnitt: z.zuschnitt, sichtbar: z.sichtbar, versatz: false });
      else if (z.teil.typ === 'versatz') s.schnitte.push({ index: z.index, dn: z.dn, zuschnitt: z.sk.rohrZuschnitt, sichtbar: z.sk.luecke, versatz: true });
    }
    s.laufmeterRohr = s.schnitte.reduce((a, c) => a + c.zuschnitt, 0) / 1000;
    s.bogenAnzahl = zeilen.reduce((a, z) => a + (z.teil.typ === 'versatz' ? 2 : z.teil.typ === 'bogen' ? 1 : 0), 0);
    s.schellenGesetzt = zeilen.filter(z => z.teil.typ === 'schelle').length;
    return s;
  }

  const annahmenListe = () => ND.annahmen.fallrohr;

  const quelleVon = (...t) => t.filter(x => x[1] && x[1].trim() !== '').map(x => x[0] === '' ? x[1] : x[0] + ': ' + x[1]).join('. ');
  const zahlAus = s => { const m = /[0-9]+([,.][0-9]+)?/.exec(s); if (!m) return null; const v = parseFloat(m[0].replace(',', '.')); return isNaN(v) ? null : v; };
  const Z = (teil, menge, einheit, detail, status, quelle) => ({ teil, menge, einheit, detail, status, quelle });

  /** Materialliste des Fallrohr-Planers (gleiche Zeilen wie Normteile.fallrohr in Kotlin). wahl = {dn, werkstoff, rohrStueck}. */
  function material(f, wahl) {
    const wk = NT.werkstoff(wahl.werkstoff), z = [], h = [];
    const dnS = dn => { const d = NT.dnVon(dn); return d ? d.s : 'unsicher'; };
    const dnQ = dn => { const d = NT.dnVon(dn); return d ? d.q : 'Nenn ' + dn + ' steht nicht im Katalog'; };
    const sl = NT.schlechter;
    const rohrT = NT.teil('rohr'), bogenT = NT.teil('bogen'), schT = NT.teil('schelle'), stueck = NT.regelZahl('rohr_stueck');
    const rohrStueck = wahl.rohrStueck == null ? 2000 : wahl.rohrStueck;
    const dns = []; for (const s of f.schnitte) if (!dns.includes(s.dn)) dns.push(s.dn);
    let kgGesamt = 0, kgDa = false;
    for (const dn of dns) {
      const sc = f.schnitte.filter(s => s.dn === dn);
      const stk = sc.reduce((a, s) => a + aufrunden(s.zuschnitt / rohrStueck), 0);
      const lm = sc.reduce((a, s) => a + s.zuschnitt, 0) / 1000;
      z.push(Z(rohrT.name, stk, 'Stk', 'Nenn ' + dn + ', ' + wk.name + ', Dicke ' + wk.rohrDicke.fuer(dn) + ', ' + sc.length + ' Zuschnitte: ' + sc.map(s => nz(s.zuschnitt, 1)).join(', ') + ' mm, ' + nz(lm, 2) + ' m, aus Stück ' + nz(rohrStueck / 1000, 1) + ' m',
        sl(sl(stueck.s, dnS(dn)), wk.rohrDicke.s), quelleVon(['', rohrT.q], ['Stücklänge', stueck.q], ['Dicke', wk.rohrDicke.q])));
      const d = zahlAus(wk.rohrDicke.fuer(dn));
      if (wk.dichte > 0 && d != null) { kgGesamt += Math.PI * dn / 1000 * lm * d * wk.dichte; kgDa = true; }
    }
    // Boegen
    const boegen = new Map();
    for (const r of f.zeilen) {
      const add = c => { const k = r.teil.w + '|' + r.dn; const v = boegen.get(k) || { grad: r.teil.w, dn: r.dn, c: 0 }; v.c += c; boegen.set(k, v); };
      if (r.teil.typ === 'versatz') add(2);
      if (r.teil.typ === 'bogen') add(1);
    }
    for (const k of boegen.values()) {
      const wi = NT.winkelVon(k.grad);
      const winkelQ = wi ? wi.q : 'Normwinkel im Katalog: ' + NT.winkel.map(w => nz(w.grad, 0)).join(', ') + '. Ein anderer Winkel ist kein Fertigteil, Alex prüft';
      z.push(Z(bogenT.name + ' ' + nz(k.grad, 1) + '°' + (wi ? '' : ' (kein Normwinkel)'), k.c, 'Stk', 'Nenn ' + k.dn + ', ' + wk.name + ', Dicke ' + wk.bogenDicke.fuer(k.dn),
        sl(sl(wi ? wi.s : 'unsicher', dnS(k.dn)), wk.bogenDicke.s), quelleVon(['', bogenT.q], ['Winkel', winkelQ], ['Durchmesser', dnQ(k.dn)], ['Dicke', wk.bogenDicke.q])));
    }
    // Abzweiger
    const abz = new Map(), abT = NT.teil('abzweig');
    for (const r of f.zeilen) if (r.teil.typ === 'abzweig') { const k = r.teil.w + '|' + r.dn + '|' + r.sichtbar + '|' + r.ausKatalog; const v = abz.get(k) || { grad: r.teil.w, dn: r.dn, bh: r.sichtbar, kat: r.ausKatalog, c: 0 }; v.c++; abz.set(k, v); }
    for (const k of abz.values()) {
      const a = abzweig(k.grad);
      const bhS = k.kat ? (a ? a.s : 'unsicher') : 'annahme';
      const bhQ = k.kat ? (a ? a.q : 'Winkel ' + nz(k.grad, 0) + ' steht nicht im Katalog') : 'von Hand eingegeben, Alex prüft';
      z.push(Z(abT.name + ' ' + nz(k.grad, 0) + '°', k.c, 'Stk', 'Nenn ' + k.dn + ', ' + wk.name + ', Bauhöhe ' + nz(k.bh, 0) + ' mm', sl(sl(abT.s, dnS(k.dn)), bhS), quelleVon(['', abT.q], ['Durchmesser', dnQ(k.dn)], ['Bauhöhe', bhQ])));
    }
    // Reduktionen
    const red = new Map(), reT = NT.teil('reduktion');
    for (const r of f.zeilen) if (r.teil.typ === 'reduktion') { const k = r.dn + '|' + r.dnNach + '|' + r.sichtbar + '|' + r.ausKatalog; const v = red.get(k) || { von: r.dn, nach: r.dnNach, bh: r.sichtbar, kat: r.ausKatalog, c: 0 }; v.c++; red.set(k, v); }
    for (const k of red.values()) {
      z.push(Z(reT.name + ' ' + k.von + ' auf ' + k.nach, k.c, 'Stk', wk.name + ', Baulänge ' + nz(k.bh, 0) + ' mm', sl(sl(reT.s, dnS(k.von)), dnS(k.nach)),
        quelleVon(['', reT.q], ['Baulänge', k.kat ? 'Muffenlänge des grösseren Durchmessers als Annahme, Alex nennt das Mass seines Händlers' : 'von Hand eingegeben, Alex prüft'])));
    }
    // Muffen
    const muf = new Map(), muT = NT.teil('muffe');
    for (const r of f.zeilen) if (r.teil.typ === 'muffe') { const k = r.dn + '|' + r.sichtbar + '|' + r.ausKatalog; const v = muf.get(k) || { dn: r.dn, bh: r.sichtbar, kat: r.ausKatalog, c: 0 }; v.c++; muf.set(k, v); }
    for (const k of muf.values()) {
      const d = NT.dnVon(k.dn);
      z.push(Z(muT.name, k.c, 'Stk', 'Nenn ' + k.dn + ', ' + wk.name + ', Baulänge ' + nz(k.bh, 0) + ' mm', sl(sl(muT.s, dnS(k.dn)), k.kat ? (d ? d.muffeStatus : 'unsicher') : 'annahme'),
        quelleVon(['', muT.q], ['Durchmesser', dnQ(k.dn)], ['Baulänge', k.kat ? (d ? d.muffeQuelle : '') : 'von Hand eingegeben, Alex prüft'])));
    }
    // Schellen
    const ab = NT.regelZahl('schelle_abstand');
    const noetig = f.schnitte.reduce((a, s) => a + max(1, aufrunden(s.sichtbar / ab.v)), 0);
    const gesetzt = f.schellenGesetzt, schMenge = max(gesetzt, noetig);
    if (schMenge > 0) z.push(Z(schT.name, schMenge, 'Stk', 'Nenn ' + f.e.dn + ', ' + wk.name + ', ' + gesetzt + ' gesetzt, nach ' + nz(ab.v / 1000, 1) + ' m Abstand mindestens ' + noetig,
      sl(sl(ab.s, dnS(f.e.dn)), schT.s), quelleVon(['', schT.q], ['Abstand', ab.q])));
    if (gesetzt >= 0 && gesetzt < noetig && f.schnitte.length > 0) h.push(['annahme', 'Gesetzt sind ' + gesetzt + ' Schellen, nach ' + nz(ab.v / 1000, 1) + ' m Abstand wären ' + noetig + ' nötig. Die Liste zählt ' + schMenge + '.']);
    // Endstuecke
    const enT = NT.teil('endstueck'), en = f.zeilen.filter(r => r.teil.typ === 'endstueck');
    if (en.length) z.push(Z(enT.name, en.length, 'Stk', 'Nenn ' + en[0].dn + ', ' + wk.name + ', Baulänge ' + nz(en[0].sichtbar, 0) + ' mm', sl(enT.s, dnS(en[0].dn)), enT.q));

    const st = NT.regelZahl('steckung');
    const sum = [['Werkstoff', wk.name], ['Gesamthöhe', nz(f.e.hoehe, 1) + ' mm'], ['Laufmeter Rohr (Zuschnitte)', nz(f.laufmeterRohr, 2) + ' m'], ['Steckung je Seite', nz(f.e.steckung, 1) + ' mm']];
    if (kgDa) sum.push(['Gewicht Rohre (Kontrolle)', nz(kgGesamt, 1) + ' kg']);
    if (f.bogenAnzahl > 0) {
      const rf = NT.radiusFaktor;
      h.push([rf.s, 'Radius der Mittellinie bei Nenn ' + f.e.dn + ': etwa ' + nz(rf.v * f.e.dn, 0) + ' mm (' + nz(rf.v, 1) + ' x Nenn, abgeleitet). ' + rf.q]);
    }
    for (const r of f.zeilen) if (r.teil.typ === 'versatz') {
      const v = NT.versatz(r.teil.w, r.dn);
      if (v != null) {
        const vq = NT.versatzQuelle;
        h.push([vq.s, 'Versatz ' + (r.index + 1) + ': Händler-Richtwert für zwei ineinandergesteckte Bögen ' + nz(r.teil.w, 0) + '° Nenn ' + r.dn + ': Achsversatz ' + v + ' mm. ' +
          (r.teil.m < v ? 'Dein Achsmass ' + nz(r.teil.m, 1) + ' mm ist kleiner, mit zwei Normbögen nicht möglich. ' : 'Dein Achsmass ' + nz(r.teil.m, 1) + ' mm ist grösser, das Zwischenrohr füllt den Rest. ') + vq.q]);
      }
    }
    if (f.zeilen.some(r => r.teil.typ === 'bogen')) h.push(['unsicher', 'Einzelner Bogen: die Höhe zählt bis zum Bogenende (Radius mal Sinus des Winkels). Was danach kommt, rechnet die App nicht.']);
    if (f.fehlend > 0) h.push(['annahme', 'Es fehlen ' + nz(f.fehlend, 1) + ' mm bis zur Gesamthöhe. Ein Rohrstück ohne Länge (Rest) macht sie voll.']);
    if (f.zeilen.some(r => r.teil.typ === 'rohr' && r.steckEnden > 0)) h.push([st.s, 'Oben steckt das Rohr in den Rinnenstutzen, die Steckung ist dort mitgerechnet. ' + st.q]);
    if (st.v !== f.e.steckung) h.push(['annahme', 'Die Steckung ' + nz(f.e.steckung, 1) + " mm weicht von den 50 mm auf Alex' Skizze ab."]);
    h.push(['annahme', 'Die Bauhöhen von Reduktion, Muffe, Endstück und Abzweiger sind Annahmen: Alex prüft und nennt die Masse seines Händlers.']);
    return { titel: 'Materialliste Fallrohr', zeilen: z, summen: sum, hinweise: h };
  }

  // ================================================================ Zeichnungen
  const Ze = new Proxy({}, { get: (_, k) => root.Ze[k] });
  const mm = v => Ze.fmtTrim(v, 1);
  const FR_BESCHR_DE = { name: t => ({ rohr: 'Rohr', versatz: 'Versatz', bogen: 'Bogen', abzweig: 'Abzweiger', reduktion: 'Reduktion', muffe: 'Muffe', schelle: 'Schelle', endstueck: 'Endstück' })[t],
    ansicht: 'Ansicht', zuschnitt: 'Zuschnitt', rest: 'Rest', achs: 'Achsmass', leer: 'Kein Rohrstück' };
  const basisHoehe = t => ({ versatz: 46, bogen: 30, abzweig: 30, reduktion: 24, muffe: 16, schelle: 12, endstueck: 16, rohr: 0 })[t];

  function etikett(f, r, lb, stufe) {
    const n = lb.name(r.teil.typ);
    switch (r.teil.typ) {
      case 'rohr':
        if (r.zuschnitt <= 0) return n + ' 0';
        return stufe === 0 ? n + ' ' + mm(r.sichtbar) + (r.rest ? ' (' + lb.rest + ')' : '') + ' · ' + lb.zuschnitt + ' ' + mm(r.zuschnitt)
          : stufe === 1 ? n + ' ' + mm(r.sichtbar) + (r.rest ? ' (' + lb.rest + ')' : '') : n + ' ' + mm(r.sichtbar);
      case 'versatz':
        return stufe === 0 ? n + ' ' + mm(r.teil.w) + '° · ' + lb.achs + ' ' + mm(r.teil.m) + ' · ' + lb.name('rohr') + ' ' + mm(r.zuschnitt)
          : stufe === 1 ? n + ' ' + mm(r.teil.w) + '° · ' + lb.achs + ' ' + mm(r.teil.m) : n + ' ' + mm(r.teil.w) + '°';
      case 'bogen': return n + ' ' + mm(r.teil.w) + '°';
      case 'abzweig': return stufe === 2 ? n + ' ' + mm(r.teil.w) + '°' : n + ' ' + mm(r.teil.w) + '° · ' + mm(r.sichtbar);
      case 'reduktion': return n + ' ' + r.dn + ' → ' + r.dnNach;
      case 'muffe': return n + ' ' + mm(r.sichtbar);
      case 'schelle': return n;
      default: return n + (r.sichtbar > 0 ? ' ' + mm(r.sichtbar) : '');
    }
  }

  const schrift = (t, platz, n) => n <= 0 ? t : min(t, max(6, (platz / n - 2) / 1.25));

  function ansicht(f, w, h, t0, lb) {
    const t = schrift(t0, h - 1.2 * t0 - 16, f.zeilen.length);
    const z = new Ze.Zeichnung(w, h, t);
    const rows = f.zeilen, oben = 1.2 * t + 8, unten = 8, avail = h - oben - unten, minH = 1.25 * t + 2;
    const hs = new Array(rows.length).fill(0);
    let fix = 0, nR = 0;
    rows.forEach((r, i) => { if (r.teil.typ === 'rohr') nR++; else { hs[i] = max(minH, basisHoehe(r.teil.typ)); fix += hs[i]; } });
    const rest = max(avail - fix, nR * (minH + 4));
    const rohrSumme = max(1, rows.filter(r => r.teil.typ === 'rohr').reduce((a, r) => a + max(r.sichtbar, 1), 0));
    rows.forEach((r, i) => { if (r.teil.typ === 'rohr') hs[i] = max(minH + 4, rest * (max(r.sichtbar, 1) / rohrSumme)); });
    let total = hs.reduce((a, c) => a + c, 0);
    if (total > avail) {
      const minGes = minH * hs.length, ueber = hs.reduce((a, c) => a + max(0, c - minH), 0), brauch = total - avail;
      const f2 = ueber > 1e-3 ? max(0, 1 - brauch / ueber) : 0;
      for (let i = 0; i < hs.length; i++) hs[i] = hs[i] > minH ? minH + (hs[i] - minH) * f2 : hs[i];
      total = hs.reduce((a, c) => a + c, 0);
      if (minGes > avail) for (let i = 0; i < hs.length; i++) hs[i] = hs[i] * avail / total;
    }
    const pw = Math.min(13, Math.max(8, 0.9 * t + 5)), lg = 3.6 * t + 18, xc0 = lg + 34;
    let y = oben, x = xc0, vz = 1;
    z.linie(xc0 - pw, oben, xc0 + pw, oben, 'KANTE');
    const labelX0 = xc0 + pw + 30, y0 = y;
    rows.forEach((r, i) => {
      const hh = hs[i], y1 = y + hh, key = 'p' + i, tp = r.teil.typ;
      switch (tp) {
        case 'rohr': z.rechteck(x - pw / 2, y, x + pw / 2, y1, 'STUTZEN', 'KANTE', key); break;
        case 'versatz': {
          const o = 14 * vz, ya = y + hh * 0.22, yb = y + hh * 0.78;
          z.flaeche([x - pw / 2, y, x + pw / 2, y, x + pw / 2, ya, x + o + pw / 2, yb, x + o + pw / 2, y1, x + o - pw / 2, y1, x + o - pw / 2, yb, x - pw / 2, ya], 'BLECH', 'KANTE', key);
          x += o; vz = -vz; break;
        }
        case 'bogen': z.flaeche([x - pw / 2, y, x + pw / 2, y, x + pw / 2, y + hh * 0.35, x + pw / 2 + 14, y1, x - pw / 2 + 14, y1, x - pw / 2, y + hh * 0.5], 'BLECH', 'KANTE', key); break;
        case 'abzweig':
          z.rechteck(x - pw / 2, y, x + pw / 2, y1, 'BLECH', 'KANTE', key);
          z.flaeche([x + pw / 2, y + hh * 0.25, x + pw / 2 + 16, y1, x + pw / 2 + 16 - pw * 0.7, y1, x + pw / 2, y + hh * 0.25 + pw * 0.7], 'BLECH', 'KANTE', key); break;
        case 'reduktion': z.flaeche([x - pw / 2 - 3, y, x + pw / 2 + 3, y, x + pw / 2 - 2, y1, x - pw / 2 + 2, y1], 'AKZENT', 'KANTE', key); break;
        case 'muffe': z.rechteck(x - pw / 2 - 3, y + hh * 0.1, x + pw / 2 + 3, y1 - hh * 0.1, 'AUFKANT2', 'KANTE', key); break;
        case 'schelle': { const ym = (y + y1) / 2; z.rechteck(x - pw / 2 - 6, ym - 2.5, x + pw / 2 + 6, ym + 2.5, 'UMSCHLAG', 'KANTE', key); break; }
        default: z.rechteck(x - pw / 2 + 1, y + hh * 0.15, x + pw / 2 - 1, y1 - hh * 0.15, 'KASTEN', 'KANTE', key);
      }
      const fett = tp === 'rohr' || tp === 'versatz';
      let gs = t, s = etikett(f, r, lb, 0), gefunden = false;
      for (const g of [t, t * 0.85, t * 0.72]) { for (let st = 0; st <= 2 && !gefunden; st++) { const c = etikett(f, r, lb, st); if (labelX0 + Ze.textBreite(c, g, fett) <= w - 6) { s = c; gs = g; gefunden = true; } } if (gefunden) break; }
      if (!gefunden) { s = etikett(f, r, lb, 2); gs = t * 0.72; }
      z.text(labelX0, (y + y1) / 2, s, gs, fett, -1, r.rest ? 'AKZENT' : 'TEXT', key);
      y = y1;
    });
    z.mass(xc0 - pw - 10, y0, xc0 - pw - 10, y, -1, 0, 6, mm(f.e.hoehe), 'h', 1);
    z.fertig();
    return z;
  }

  function zuschnitt(f, w, h, t0, lb) {
    const sc = f.schnitte, t = schrift(t0, h - 16, sc.length), z = new Ze.Zeichnung(w, h, t);
    if (!sc.length) { z.text(w / 2, h / 2, lb.leer, t, false, 0, 'GRAU'); z.fertig(); return z; }
    const top = w < 220 ? 44 : 8, rh = Math.min(2.6 * t + 6, Math.max(1.25 * t + 2, (h - top - 8) / sc.length));
    const nm = s => lb.name(s.versatz ? 'versatz' : 'rohr') + ' ' + (s.index + 1);
    const labelW = Math.max(...sc.map(s => Ze.textBreite(nm(s), t, false))) + 8, valW = Math.max(...sc.map(s => Ze.textBreite(mm(s.zuschnitt), t, true))) + 6;
    const bx = 8 + labelW, bmax = max(10, w - bx - valW - 10), m = Math.max(...sc.map(s => s.zuschnitt));
    let y = top;
    for (const s of sc) {
      const bl = max(3, bmax * (s.zuschnitt / m)), key = 'p' + s.index, ym = y + rh / 2;
      z.text(8, ym, nm(s), t, false, -1, 'GRAU', key);
      z.rechteck(bx, ym - rh * 0.3, bx + bl, ym + rh * 0.3, s.versatz ? 'BLECH' : 'STUTZEN', 'KANTE', key);
      z.text(bx + bl + 4, ym, mm(s.zuschnitt), t, true, -1, 'TEXT', key);
      y += rh;
    }
    z.fertig();
    return z;
  }

  const blatt = (f, w, h, t, lb) => Ze.Neu.kombi(w, h, t, 0.64, lb.ansicht, lb.zuschnitt, (ww, hh) => ansicht(f, ww, hh, t, lb), (ww, hh) => zuschnitt(f, ww, hh, t, lb));

  // ================================================================ A4-Seite (Bl.neu.fallrohr)
  function seite(f, tx, lb) {
    const Bl = root.Blatt, B = Bl.B, H = Bl.H, R = Bl.R, INH = Bl.INH;
    const z = new Ze.Zeichnung(B, H, 9); let y = Bl.kopf(z, tx);
    Bl.abschnitt(z, R, y, INH, tx.aufrissTitel);
    const ha = 300; z.einfuegen(ansicht(f, INH, ha, 9, lb), R, y + 14); y += 14 + ha + 6;
    Bl.abschnitt(z, R, y, INH, tx.zuschnittTitel);
    const hb = Math.min(150, Math.max(70, 24 + 22 * f.schnitte.length)); z.einfuegen(zuschnitt(f, INH, hb, 9, lb), R, y + 14); y += 14 + hb + 8;
    y = Bl.kasten(z, R, y, INH, tx, 24) + 8;
    y = Bl.legendeZeile(z, R, y, tx) + 2;
    Bl.annahmen(z, R, y, INH, tx);
    Bl.fuss(z, tx);
    return z;
  }
  if (root.Blatt && root.Blatt.neu) root.Blatt.neu.fallrohr = seite;

  root.Fallrohr = { TYPEN, FT, STANDARD, MAX_TEILE, pruefe, Fallrohr, annahmenListe, material, teileText, teileVon, radius, muffe, abzweig,
    ansicht, zuschnitt, blatt, seite, FR_BESCHR_DE, etikett };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Fallrohr;
})(typeof window !== 'undefined' ? window : globalThis);
