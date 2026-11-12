/* Spengler-Web: DXF der Abwicklung fuer Dachrinne, Mauerabdeckung, Kehle, Dunstrohr (Stutzen) und die Rohrteile aus Segmenten (Rohrbogen, Schwanenhals aus Segmenten,
 * Hosenrohr, Reduktion). Wie Profil und Abzweig: ASCII R12, nur LINE und TEXT, Einheit mm, Lagen ZUSCHNITT, BIEGELINIE, NAHT, TEXT.
 * Nur dort, wo der Rechenkern die Kontur schon liefert: Streifen (Rechteck mit Biegelinien) und Zylinderstueck.umriss / Kegelstumpf.umriss.
 * Nicht gebaut (Geometrie im Code nur als Mass, nicht als Kontur): Kamineinfassung, Schwanenhals (gerades Rohr: Umfang haengt vom Rohrdurchmesser ab), Fallrohr (Normteile).
 * Die Rechnung wird nicht angefasst, die Funktionen lesen nur die Ergebnisse. */
(function (root) {
  'use strict';
  const z3 = n => (Math.round(n * 1000) / 1000).toString();
  const asc = s => String(s).replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss').replace(/[°]/g, ' Grad').replace(/[×]/g, 'x').replace(/[^\x20-\x7E]/g, '?');
  function Schreiber() {
    const o = [];
    const s = {
      linie: (lage, x1, y1, x2, y2) => o.push('0', 'LINE', '8', lage, '10', z3(x1), '20', z3(y1), '30', '0', '11', z3(x2), '21', z3(y2), '31', '0'),
      txt: (x, y, hoehe, t) => o.push('0', 'TEXT', '8', 'TEXT', '10', z3(x), '20', z3(y), '30', '0', '40', z3(hoehe), '1', asc(t)),
      ring: (lage, p, dx, dy, sy) => { for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-6) s.linie(lage, dx + a[0], dy + (sy || 1) * a[1], dx + b[0], dy + (sy || 1) * b[1]); } },
      rechteck: (lage, x, y, b, h) => { s.linie(lage, x, y, x + b, y); s.linie(lage, x + b, y, x + b, y + h); s.linie(lage, x + b, y + h, x, y + h); s.linie(lage, x, y + h, x, y); },
      text: () => ['0', 'SECTION', '2', 'ENTITIES'].concat(o, ['0', 'ENDSEC', '0', 'EOF']).join('\r\n') + '\r\n'
    };
    return s;
  }
  const th = b => Math.max(4, Math.min(12, b / 40));

  /** Streifen: Stuecke untereinander, je ein Rechteck laenge x breite mit Biegelinien bei den Teilbreiten (quer zur Laenge). */
  function streifen(w, laengen, breite, teile, titel, zusatz) {
    const hh = th(breite); let y = 0;
    laengen.forEach((l, i) => {
      w.rechteck('ZUSCHNITT', 0, y, l, breite);
      let c = 0; for (let j = 0; j < teile.length - 1; j++) { c += teile[j]; w.linie('BIEGELINIE', 0, y + c, l, y + c); }
      w.txt(2, y + breite + hh * 0.4, hh * 0.7, 'Stueck ' + (i + 1) + ': ' + z3(l) + ' x ' + z3(breite) + ' mm');
      y += breite + hh * 3;
    });
    w.txt(0, y + hh, hh, titel + (zusatz ? ', ' + zusatz : ''));
  }
  /** Dachrinne: Abwicklung (Breite) mal Stuecklaenge, ohne Biegelinien (die Rinne ist rund, Wulst nach Hersteller). r = K.RinneSkizze, stueck = Stuecklaenge in mm. */
  function rinne(r, stueck, titel) {
    const w = Schreiber(), L = r.e.laenge, n = Math.max(1, Math.ceil(L / stueck - 1e-9)), laengen = [];
    for (let i = 0; i < n; i++) laengen.push(i < n - 1 ? stueck : L - (n - 1) * stueck);
    streifen(w, laengen, r.e.abwicklung, [r.e.abwicklung], titel || 'Dachrinne', 'Abwicklung ' + z3(r.e.abwicklung) + ' mm, ' + z3(L) + ' mm Rinne, ' + n + ' Stueck');
    return w.text();
  }
  /** Mauerabdeckung: Stuecke mit Biegelinien Umschlag | Schenkel | Ueberstand | Mauer | Ueberstand | Schenkel | Umschlag. m = K.MauerSkizze. */
  function mauer(m, titel) {
    const w = Schreiber(), e = m.e, n = m.stuecke, laengen = [];
    for (let i = 0; i < n; i++) laengen.push(i < n - 1 ? e.stueckLaenge : e.laenge - (n - 1) * e.stueckLaenge);
    const teile = [e.abkantung, e.schenkel, e.ueberstand, e.mauerBreite, e.ueberstand, e.schenkel, e.abkantung];
    streifen(w, laengen, m.abwicklung, teile, titel || 'Mauerabdeckung', 'Abwicklung ' + z3(m.abwicklung) + ' mm, Gefaelle in der Abwicklung nicht gerechnet, ' + n + ' Stueck');
    if (m.streifenLaenge > 0) { const y = -(th(m.abwicklung) * 4 + 125); w.rechteck('ZUSCHNITT', 0, y, m.streifenLaenge, 125); w.txt(2, y + 125 + th(125) * 0.4, th(125) * 0.7, 'Einhaengestreifen: ' + z3(m.streifenLaenge) + ' x 125 mm'); }
    return w.text();
  }
  /** Kehle: Stuecke (mit Ueberlappung, Laengen aus k.stueckLaengen()), Biegelinien Aufkantung | Schenkel | Schenkel | Aufkantung. k = K.KehleSkizze. */
  function kehle(k, titel) {
    const w = Schreiber(), e = k.e;
    streifen(w, k.stueckLaengen(), e.abwicklung, [e.aufkantung, k.schenkel, k.schenkel, e.aufkantung], titel || 'Kehle', 'Abwicklung ' + z3(e.abwicklung) + ' mm, Ueberlappung ' + z3(e.ueberlappung) + ' mm, ' + k.stuecke + ' Stueck');
    return w.text();
  }
  /** Dunstrohr: Abwicklung des Stutzens, Rechteck (Umfang + Naht) mal Rohrhoehe, Naht als Biegelinie. d = K.DunstrohrSkizze. */
  function dunst(d, titel) {
    const w = Schreiber(), b = d.stutzenBreite, hh = th(b);
    w.rechteck('ZUSCHNITT', 0, 0, b, d.rohrHoehe);
    if (d.naht > 0) w.linie('NAHT', d.umfang, 0, d.umfang, d.rohrHoehe);
    w.txt(0, d.rohrHoehe + hh * 0.8, hh, (titel || 'Dunstrohr') + ' Stutzen, Zuschnitt ' + z3(b) + ' x ' + z3(d.rohrHoehe) + ' mm' + (d.naht > 0 ? ', Naht ' + z3(d.naht) + ' mm' : ''));
    return w.text();
  }
  /** Rohrteile aus Segmenten. Rechenkern in cm (faktor 10 nach mm). stuecke = [{name, anzahl, umriss: [[x,y],..]}]. */
  function konturen(stuecke, titel, faktor) {
    const w = Schreiber(); let x = 0; const f = faktor || 1;
    let hMax = 0; stuecke.forEach(s => { const ys = s.umriss.map(p => p[1] * f); hMax = Math.max(hMax, Math.max(...ys) - Math.min(...ys)); });
    const hh = th(hMax);
    stuecke.forEach(s => {
      const xs = s.umriss.map(p => p[0] * f), ys = s.umriss.map(p => p[1] * f), x0 = Math.min(...xs), y0 = Math.min(...ys);
      const pts = s.umriss.map(p => [p[0] * f - x0, p[1] * f - y0]);
      w.ring('ZUSCHNITT', pts, x, 0, 1);
      const b = Math.max(...xs) - x0;
      w.txt(x, -hh * 1.6, hh * 0.8, s.name + ', ' + s.anzahl + ' Stk, ' + z3(b) + ' x ' + z3(Math.max(...ys) - y0) + ' mm');
      x += b + 60;
    });
    w.txt(0, hMax + hh * 2, hh, titel || 'Rohr');
    return w.text();
  }
  /** bild = RohrBild der Rohrseite: bogen (K.Bogen), hals (K.RohrSchwanenhals), hose (K.Hosenrohr) oder kegel (K.kegelstumpf). Werte in cm. */
  function rohr(bild, titel) {
    const N = 120, st = [];
    if (bild.bogen) { const b = bild.bogen; st.push({ name: 'Endstueck', anzahl: 2, umriss: b.stueck(0).umriss(N) }); if (b.n > 2) st.push({ name: 'Mittelstueck', anzahl: b.n - 2, umriss: b.stueck(1).umriss(N) }); }
    else if (bild.hals) { const s = bild.hals, b = s.bogen; st.push({ name: 'Bogen Endstueck', anzahl: 4, umriss: b.stueck(0).umriss(N) }); if (b.n > 2) st.push({ name: 'Bogen Mittelstueck', anzahl: 2 * (b.n - 2), umriss: b.stueck(1).umriss(N) }); if (s.zwischen > 1e-9) st.push({ name: 'Zwischenrohr', anzahl: 1, umriss: s.zwischenStueck().umriss(N) }); }
    else if (bild.hose) st.push({ name: 'Bein', anzahl: 2, umriss: bild.hose.stueck().umriss(N) });
    else if (bild.kegel) st.push({ name: 'Kegelstumpf', anzahl: 1, umriss: bild.kegel.umriss(N) });
    else return null;
    return konturen(st, titel, 10);
  }
  root.Dxf = { rinne, mauer, kehle, dunst, rohr, konturen, streifen: null };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Dxf;
})(typeof window !== 'undefined' ? window : globalThis);
