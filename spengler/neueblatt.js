/* Spengler-Web: Port von kern/NeueTeileSeiten.kt. A4-Blaetter der drei neuen Teile und die Materialliste als eigene Seite(n). */
(function (root) {
  'use strict';
  const Ze = root.Ze, Zeichnung = Ze.Zeichnung, Bl = root.Blatt, N = Ze.Neu, B = Bl.B, H = Bl.H, R = Bl.R, INH = Bl.INH;

  function abschluss(z, y0, tx) {
    let y = Bl.kasten(z, R, y0, INH, tx, 24) + 8;
    y = Bl.legendeZeile(z, R, y, tx) + 2;
    Bl.annahmen(z, R, y, INH, tx);
    Bl.fuss(z, tx);
    return z;
  }
  function rinne(r, tx, lb) {
    const z = new Zeichnung(B, H, 9); let y = Bl.kopf(z, tx);
    Bl.abschnitt(z, R, y, INH, tx.aufrissTitel);
    const ha = 250; z.einfuegen(N.rinneAnsicht(r, INH, ha, 9, lb), R, y + 14); y += 14 + ha + 6;
    Bl.abschnitt(z, R, y, INH, tx.grundrissTitel);
    const hb = 130; z.einfuegen(N.rinneAbwicklung(r, INH, hb, 9, lb), R, y + 14); y += 14 + hb + 8;
    return abschluss(z, y, tx);
  }
  function mauer(m, tx, lb) {
    const z = new Zeichnung(B, H, 9); let y = Bl.kopf(z, tx);
    Bl.abschnitt(z, R, y, INH, tx.aufrissTitel);
    const ha = 270; z.einfuegen(N.mauerQuerschnitt(m, INH, ha, 9, lb), R, y + 14); y += 14 + ha + 6;
    Bl.abschnitt(z, R, y, INH, tx.grundrissTitel);
    const hb = 120; z.einfuegen(N.mauerAbwicklung(m, INH, hb, 9, lb), R, y + 14); y += 14 + hb + 8;
    return abschluss(z, y, tx);
  }
  function kehle(k, tx, lb) {
    const z = new Zeichnung(B, H, 9); let y = Bl.kopf(z, tx);
    Bl.abschnitt(z, R, y, INH, tx.aufrissTitel);
    const ha = 210; z.einfuegen(N.kehleQuerschnitt(k, INH, ha, 9, lb), R, y + 14); y += 14 + ha + 6;
    Bl.abschnitt(z, R, y, INH, tx.grundrissTitel);
    const hb = 110; z.einfuegen(N.kehleAbwicklung(k, INH, hb, 9, lb), R, y + 14); y += 14 + hb + 6;
    Bl.abschnitt(z, R, y, INH, tx.zuschnittTitel);
    const hc = 100; z.einfuegen(N.kehleStuecke(k, INH, hc, 9, lb), R, y + 14); y += 14 + hc + 8;
    return abschluss(z, y, tx);
  }

  /** Materialliste, Summen, Hinweise und Annahmen mit Quelle: eine oder mehrere A4-Seiten. mt = { summen, hinweise, annahmen, status(s), beleg(b) }. */
  function material(ml, annahmen, tx, mt) {
    const NT = root.Normteile, nz = NT.nz, seiten = [];
    let z = new Zeichnung(B, H, 9), y = Bl.kopf(z, tx); seiten.push(z);
    const platz = hh => { if (y + hh > H - 34) { Bl.fuss(z, tx); z = new Zeichnung(B, H, 9); seiten.push(z); y = Bl.kopf(z, tx); } };
    const farbe = s => s === 'beleg' ? 'BLAU' : 'AKZENT';
    for (const zl of ml.zeilen) {
      const detail = Bl.umbrechen(zl.detail, 8.5, false, INH - 70), quelle = Bl.umbrechen(mt.status(zl.status) + ': ' + zl.quelle, 7.5, false, INH - 70);
      platz(16 + detail.length * 11 + quelle.length * 9.5 + 8);
      z.text(R, y + 6, nz(zl.menge, 2) + ' ' + zl.einheit, 10, true, -1, 'TEXT');
      z.text(R + 70, y + 6, zl.teil, 10, true, -1, 'TEXT');
      y += 16;
      for (const l of detail) { z.text(R + 70, y + 4, l, 8.5, false, -1, 'TEXT'); y += 11; }
      for (const l of quelle) { z.text(R + 70, y + 3.5, l, 7.5, false, -1, farbe(zl.status)); y += 9.5; }
      y += 4; z.linie(R, y, B - R, y, 'HILFE'); y += 4;
    }
    platz(30 + ml.summen.length * 12); y += 6;
    Bl.abschnitt(z, R, y, INH, mt.summen); y += 14;
    for (const [l, w] of ml.summen) { z.text(R, y + 4.5, l, 9, false, -1, 'GRAU'); z.text(R + 200, y + 4.5, w, 9, true, -1, 'TEXT'); y += 12; }
    if (ml.hinweise.length) {
      platz(30); y += 8; Bl.abschnitt(z, R, y, INH, mt.hinweise); y += 14;
      for (const [s, t] of ml.hinweise) {
        const l = Bl.umbrechen(mt.status(s) + ': ' + t, 8, false, INH); platz(l.length * 10 + 4);
        for (const x of l) { z.text(R, y + 4, x, 8, false, -1, farbe(s)); y += 10; }
        y += 3;
      }
    }
    if (annahmen.length) {
      platz(40); y += 8; Bl.abschnitt(z, R, y, INH, mt.annahmen); y += 14;
      for (const a of annahmen) {
        const l1 = Bl.umbrechen(a.text + ': ' + a.wert, 8, true, INH), q = mt.beleg(a.beleg) + (a.quelle.trim() ? '. ' + a.quelle : ''), l2 = Bl.umbrechen(q, 7.5, false, INH);
        platz(l1.length * 10 + l2.length * 9.5 + 5);
        for (const x of l1) { z.text(R, y + 4, x, 8, true, -1, 'TEXT'); y += 10; }
        for (const x of l2) { z.text(R, y + 3.5, x, 7.5, false, -1, a.beleg === 'ANNAHME' ? 'AKZENT' : 'GRAU'); y += 9.5; }
        y += 3;
      }
    }
    Bl.fuss(z, tx);
    return seiten;
  }
  Bl.neu = { rinne, mauer, kehle, material };
})(window);
