/* Spengler-Web: Abzweig. Stutzen auf Rohr und Stutzen auf Kegel (Trichter), je mit Ansicht und beiden Abwicklungen samt Ausschnitt.
 * Vorlage: Schulzeichnungen von Alex (Abwicklung Rohrabzweig, Kegel mit Abzweigung, 2021), Nils 11.11.2026.
 * Masse in mm, Durchmesser in Blechmitte. Rechnung: jede Mantellinie des Stutzens wird exakt mit dem Rohr bzw. dem Kegel geschnitten.
 * 12 Mantellinien sind nummeriert und als Tabelle ausgegeben, damit man die Abwicklung auch von Hand anreissen kann. */
(function (root) {
  'use strict';
  const PI = Math.PI, sin = Math.sin, cos = Math.cos, sqrt = Math.sqrt, max = Math.max, min = Math.min, atan2 = Math.atan2, asin = Math.asin, hypot = Math.hypot;
  const rad = g => g * PI / 180, M = 96;
  // Umriss der Stutzen-Abwicklung: gerade Kante unten, Sattelkurve oben, Nahtzugabe als Streifen rechts
  const umrissStutzen = (pts, B, zg) => { const o = [[0, 0], [B + zg, 0]]; if (zg > 0) o.push([B + zg, pts[M][1]]); for (let i = M; i >= 0; i--) o.push(pts[i]); return o; };

  const Abzweig = {
    M,
    /** Stutzen auf Rohr. e: D Rohr, d Stutzen, w Winkel der Achsen (Grad), l Stutzenlaenge ab Achsenschnitt, L Rohrlaenge, a Achsenschnitt ab linkem Rohrende, z Nahtzugabe. */
    pruefeRohr(e) {
      if (!(e.D > 0)) return 'D'; if (!(e.d > 0)) return 'd'; if (e.d > e.D + 1e-9) return 'd_gross';
      if (!(e.w >= 20 && e.w <= 90)) return 'w'; if (!(e.z >= 0)) return 'z';
      const R = e.D / 2, r = e.d / 2, al = rad(e.w);
      if (!(e.l > (R + r * cos(al)) / sin(al) + 1e-6)) return 'l';
      if (!(e.L > 0)) return 'L'; if (!(e.a >= 0)) return 'a';
      const g = Abzweig.rohr(e).haupt; if (!(e.a + g.xMin >= -1e-6 && e.a + g.xMax <= e.L + 1e-6)) return 'a';
      return null;
    },
    rohr(e) {
      const R = e.D / 2, r = e.d / 2, al = rad(e.w), sa = sin(al), ca = cos(al), zg = e.z || 0;
      // Abstand entlang der Stutzenachse vom Achsenschnitt bis zur Rohrwand, phi = 0 liegt an der stumpfen Seite, phi = 180 an der spitzen
      const t = f => (sqrt(max(R * R - r * r * sin(f) * sin(f), 0)) - r * cos(f) * ca) / sa;
      const B = 2 * PI * r, U = 2 * PI * R, pts = [], linien = [], loch = [], lochL = [];
      // Naht an der kuerzesten Mantellinie (phi = 180)
      for (let i = 0; i <= M; i++) pts.push([B * i / M, e.l - t(PI + 2 * PI * i / M)]);
      for (let k = 0; k <= 12; k++) linien.push({ nr: k % 12 + 1, s: B * k / 12, h: e.l - t(PI + 2 * PI * k / 12) });
      // Ausschnitt im Rohr: laengs ab Achsenschnitt, quer als Bogen ab der Mittellinie
      const lp = f => [t(f) * ca - r * cos(f) * sa, R * asin(max(-1, min(1, r * sin(f) / R)))];
      for (let i = 0; i < M; i++) loch.push(lp(PI + 2 * PI * i / M));
      for (let k = 0; k < 12; k++) { const p = lp(PI + 2 * PI * k / 12); lochL.push({ nr: k + 1, x: p[0], u: p[1] }); }
      const hs = pts.map(p => p[1]), xs = loch.map(p => p[0]), us = loch.map(p => p[1]);
      return { R, r, al, t,
        stutzen: { breite: B, pts, linien, hMin: min(...hs), hMax: max(...hs), umriss: umrissStutzen(pts, B, zg) },
        haupt: { umfang: U, laenge: e.L, a: e.a, loch, linien: lochL, xMin: min(...xs), xMax: max(...xs), uMax: max(...us) } };
    },
    /** Stutzen waagrecht auf Kegel. e: D1 unten, D2 oben (0 = Spitze), H Hoehe, d Stutzen, ha Achshoehe ab Unterkante, l Stutzenlaenge ab Kegelachse, z Nahtzugabe. */
    pruefeKegel(e) {
      if (!(e.D1 > 0)) return 'D1'; if (!(e.D2 >= 0) || !(e.D2 < e.D1)) return 'D2'; if (!(e.H > 0)) return 'H'; if (!(e.d > 0)) return 'd'; if (!(e.z >= 0)) return 'z';
      const r = e.d / 2; if (!(e.ha - r >= -1e-9 && e.ha + r <= e.H + 1e-9)) return 'ha';
      const R1 = e.D1 / 2, k = (R1 - e.D2 / 2) / e.H; let tm = 0;
      for (let i = 0; i < M; i++) { const f = 2 * PI * i / M, rho = R1 - k * (e.ha + r * cos(f)), q = rho * rho - r * r * sin(f) * sin(f); if (!(q > 1e-9)) return 'd_gross'; tm = max(tm, sqrt(q)); }
      if (!(e.l > tm + 1e-6)) return 'l';
      return null;
    },
    kegel(e) {
      const R1 = e.D1 / 2, R2 = e.D2 / 2, r = e.d / 2, k = (R1 - R2) / e.H, c = sqrt(1 + k * k), Ha = R1 / k, zg = e.z || 0;
      // phi = 0 oben, phi = 180 unten. t = Abstand der Kegelwand von der Kegelachse entlang der Stutzen-Mantellinie
      const zf = f => e.ha + r * cos(f), t = f => { const rho = R1 - k * zf(f); return sqrt(max(rho * rho - r * r * sin(f) * sin(f), 0)); };
      const B = 2 * PI * r, pts = [], linien = [], loch = [], lochL = [];
      for (let i = 0; i <= M; i++) pts.push([B * i / M, e.l - t(PI + 2 * PI * i / M)]);
      for (let i = 0; i <= 12; i++) linien.push({ nr: i % 12 + 1, s: B * i / 12, h: e.l - t(PI + 2 * PI * i / 12) });
      // Kegelmantel: Kreisringstueck, Spitze im Ursprung, Mittellinie nach unten. ra, ri = Mantellinien bis Unter- und Oberkante
      const ra = Ha * c, ri = (Ha - e.H) * c, om = 2 * PI * R1 / ra;
      const pol = f => [(Ha - zf(f)) * c, atan2(r * sin(f), t(f)) * R1 / ra], xy = (l, b) => [l * sin(b), l * cos(b)];
      for (let i = 0; i < M; i++) { const p = pol(PI + 2 * PI * i / M); loch.push(xy(p[0], p[1])); }
      for (let i = 0; i < 12; i++) { const p = pol(PI + 2 * PI * i / 12), q = xy(p[0], p[1]); lochL.push({ nr: i + 1, l: p[0], b: p[1] * ra, x: q[0], y: q[1] }); }
      const um = [], nb = 72;
      for (let i = 0; i <= nb; i++) um.push(xy(ra, -om / 2 + om * i / nb));
      const e1 = xy(ra, om / 2), e0 = xy(ri, om / 2), n = [cos(om / 2), -sin(om / 2)];
      if (zg > 0) um.push([e1[0] + n[0] * zg, e1[1] + n[1] * zg], [e0[0] + n[0] * zg, e0[1] + n[1] * zg]);
      if (ri > 1e-9) for (let i = nb; i >= 0; i--) um.push(xy(ri, -om / 2 + om * i / nb)); else um.push([0, 0]);
      const hs = pts.map(p => p[1]);
      return { R1, R2, r, k, t, zf,
        stutzen: { breite: B, pts, linien, hMin: min(...hs), hMax: max(...hs), umriss: umrissStutzen(pts, B, zg) },
        kegel: { ra, ri, om, loch, linien: lochL, umriss: um, naht: zg > 0 ? [e0, e1] : null, sehne: om < PI ? 2 * ra * sin(om / 2) : null, xy } };
    },
    /** DXF (R12, nur LINE und TEXT, mm): Stutzen links, Rohr bzw. Kegel rechts. Lagen ZUSCHNITT, AUSSCHNITT, NAHT, MANTELLINIE, MITTE, TEXT. */
    dxf(art, e, r, titel) {
      const z = n => (Math.round(n * 1000) / 1000).toString(), o = [];
      const linie = (lage, x1, y1, x2, y2) => o.push('0', 'LINE', '8', lage, '10', z(x1), '20', z(y1), '30', '0', '11', z(x2), '21', z(y2), '31', '0');
      const txt = (x, y, hoehe, s) => o.push('0', 'TEXT', '8', 'TEXT', '10', z(x), '20', z(y), '30', '0', '40', z(hoehe), '1', String(s).replace(/[^\x20-\x7E]/g, '?'));
      const kette = (lage, p, dx, dy, sy) => { for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; if (hypot(a[0] - b[0], a[1] - b[1]) > 1e-6) linie(lage, dx + a[0], dy + sy * a[1], dx + b[0], dy + sy * b[1]); } };
      const st = r.stutzen, zg = e.z || 0, th = max(3, min(10, st.breite / 40));
      kette('ZUSCHNITT', st.umriss, 0, 0, 1);
      if (zg > 0) linie('NAHT', st.breite, 0, st.breite, st.pts[M][1]);
      st.linien.forEach(l => { linie('MANTELLINIE', l.s, 0, l.s, l.h); txt(l.s + th * 0.2, th * 0.4, th * 0.7, l.nr); });
      txt(0, -th * 2, th, (titel || 'Abzweig') + ' Stutzen, Zuschnitt ' + z(st.breite + zg) + ' x ' + z(st.hMax) + ' mm');
      const x0 = st.breite + zg + 60;
      if (art === 'kegel') {
        const kg = r.kegel, xm = Math.min(...kg.umriss.map(p => p[0])), ym = Math.max(...kg.umriss.map(p => p[1])), dx = x0 - xm, dy = ym;
        kette('ZUSCHNITT', kg.umriss, dx, dy, -1); kette('AUSSCHNITT', kg.loch, dx, dy, -1);
        if (kg.naht) linie('NAHT', dx + kg.naht[0][0], dy - kg.naht[0][1], dx + kg.naht[1][0], dy - kg.naht[1][1]);
        linie('MITTE', dx, dy - kg.ri, dx, dy - kg.ra);
        kg.linien.forEach(l => txt(dx + l.x + th * 0.3, dy - l.y, th * 0.6, l.nr));
        txt(x0, -th * 2, th, (titel || 'Abzweig') + ' Kegel, Aussenradius ' + z(kg.ra) + ', Innenradius ' + z(kg.ri) + ', Winkel ' + z(kg.om * 180 / PI) + ' Grad');
      } else {
        const hp = r.haupt, U = hp.umfang;
        kette('ZUSCHNITT', [[0, 0], [e.L, 0], [e.L, U + zg], [0, U + zg]], x0, 0, 1);
        if (zg > 0) linie('NAHT', x0, U, x0 + e.L, U);
        kette('AUSSCHNITT', hp.loch.map(p => [e.a + p[0], U / 2 + p[1]]), x0, 0, 1);
        linie('MITTE', x0, U / 2, x0 + e.L, U / 2); linie('MITTE', x0 + e.a, 0, x0 + e.a, U);
        hp.linien.forEach(l => txt(x0 + e.a + l.x + th * 0.3, U / 2 + l.u, th * 0.6, l.nr));
        txt(x0, -th * 2, th, (titel || 'Abzweig') + ' Rohr, Zuschnitt ' + z(e.L) + ' x ' + z(U + zg) + ' mm');
      }
      return ['0', 'SECTION', '2', 'ENTITIES'].concat(o, ['0', 'ENDSEC', '0', 'EOF']).join('\r\n') + '\r\n';
    }
  };
  root.Abzweig = Abzweig;
  if (typeof module !== 'undefined') module.exports = Abzweig;
  const S = root.S; if (!S || !S.h) return;

  // ================================================================================ Zeichnungen
  const h = S.h, T = S.T, Ze = root.Ze, L = (de, en) => S.sprache() === 'en' ? en : de;
  const mm = v => Ze.fmtTrim(Math.abs(v) < 0.05 ? 0 : v, 1), flat = a => { const o = []; for (const p of a) o.push(p[0], p[1]); return o; };
  /** Welt (x nach rechts, y nach unten) in die Flaeche w x hh einpassen, Raender in px (links, oben, rechts, unten). */
  function passend(w, hh, x0, y0, x1, y1, rl, ro, rr, ru) {
    const bw = max(w - rl - rr, 20), bh = max(hh - ro - ru, 20), sc = min(bw / max(x1 - x0, 1e-6), bh / max(y1 - y0, 1e-6));
    const ox = rl + (bw - (x1 - x0) * sc) / 2 - x0 * sc, oy = ro + (bh - (y1 - y0) * sc) / 2 - y0 * sc;
    return { sc, X: x => ox + x * sc, Y: y => oy + y * sc };
  }
  /** Nummern 1 bis 12 aussen um den Ausschnitt herum. */
  function nummern(z, pkte, t) {
    const cx = pkte.reduce((s, p) => s + p[0], 0) / pkte.length, cy = pkte.reduce((s, p) => s + p[1], 0) / pkte.length;
    pkte.forEach(p => { const dx = p[0] - cx, dy = p[1] - cy, l = max(hypot(dx, dy), 1e-6); z.text(p[0] + dx / l * 0.85 * t, p[1] + dy / l * 0.85 * t, String(p[2]), 0.72 * t, false, 0, 'GRAU'); });
  }

  function ansichtRohr(e, r, w, hh, t) {
    const z = new Ze.Zeichnung(w, hh, t), R = r.R, rr = r.r, ca = cos(r.al), sa = sin(r.al);
    const P = (tl, q) => [tl * ca - q * sa, tl * sa + q * ca];   // tl laengs der Stutzenachse, q quer dazu (phi = 0 liegt bei +q)
    const E0 = P(e.l, rr), E1 = P(e.l, -rr), kurve = [];
    for (let i = 0; i <= 24; i++) { const f = PI * i / 24; kurve.push(P(r.t(f), rr * cos(f))); }
    const xs = [-e.a, e.L - e.a, E0[0], E1[0]], zs = [R, E0[1], E1[1]];
    const F = passend(w, hh, min(...xs), -max(...zs), max(...xs), R, 5.2 * t, 3.4 * t, 3.6 * t, 5.2 * t), X = F.X, Y = v => F.Y(-v), sc = F.sc;
    z.rechteck(X(-e.a), Y(R), X(e.L - e.a), Y(-R), 'ROHR_HELL', 'KANTE');
    z.flaeche(flat([E0, E1].concat(kurve.slice().reverse()).map(p => [X(p[0]), Y(p[1])])), 'STUTZEN', 'KANTE');
    const m = 1.2 * t / sc, A = P(e.l + m, 0);
    z.linie(X(-e.a - m), Y(0), X(e.L - e.a + m), Y(0), 'MITTEL'); z.linie(X(0), Y(0), X(A[0]), Y(A[1]), 'MITTEL');
    z.mass(X(-e.a), Y(R), X(-e.a), Y(-R), -1, 0, 1.3 * t, 'Ø ' + mm(e.D), 'D', 1, 'BLAU');
    z.mass(X(-e.a), Y(-R), X(0), Y(-R), 0, 1, 1.2 * t, mm(e.a), 'a', 1, 'BLAU');
    z.mass(X(-e.a), Y(-R), X(e.L - e.a), Y(-R), 0, 1, 3.4 * t, mm(e.L), 'L', 1, 'BLAU');
    z.mass(X(E0[0]), Y(E0[1]), X(E1[0]), Y(E1[1]), ca, -sa, 1.2 * t, 'Ø ' + mm(e.d), 'd', 1, 'BLAU');
    const Q = P(e.l, 0); z.mass(X(0), Y(0), X(Q[0]), Y(Q[1]), -sa, -ca, rr * sc + 1.3 * t, mm(e.l), 'l', 1, 'BLAU');
    const br = max(1.8 * t, min(0.45 * e.l * sc, 3.2 * t)), mid = rad(e.w / 2);
    z.bogen(X(0), Y(0), br, 0, e.w, 'MASS', 'w');
    z.beweglich(X(0) + cos(mid) * (br + 1.5 * t), Y(0) - sin(mid) * (br + 1.5 * t), mm(e.w) + '°', cos(mid), -sin(mid), X(0) + cos(mid) * br, Y(0) - sin(mid) * br, t * 0.95, true, 'AKZENT', 'w');
    z.fertig(); return z;
  }

  function ansichtKegel(e, r, w, hh, t) {
    const z = new Ze.Zeichnung(w, hh, t), R1 = r.R1, R2 = r.R2, rr = r.r, kurve = [];
    for (let i = 0; i <= 24; i++) { const f = PI * i / 24; kurve.push([r.t(f), r.zf(f)]); }
    const F = passend(w, hh, -R1, -e.H, max(R1, e.l), 0, 5.0 * t, 4.6 * t, 6.4 * t, 3.4 * t), X = F.X, Y = v => F.Y(-v), sc = F.sc;
    z.flaeche([X(-R1), Y(0), X(R1), Y(0), X(R2), Y(e.H), X(-R2), Y(e.H)], 'ROHR_HELL', 'KANTE');
    z.flaeche(flat([[e.l, e.ha + rr], [e.l, e.ha - rr]].concat(kurve.slice().reverse()).map(p => [X(p[0]), Y(p[1])])), 'STUTZEN', 'KANTE');
    const m = 1.2 * t / sc;
    z.linie(X(0), Y(-m), X(0), Y(e.H + m), 'MITTEL'); z.linie(X(0), Y(e.ha), X(e.l + m), Y(e.ha), 'MITTEL');
    z.mass(X(-R1), Y(0), X(R1), Y(0), 0, 1, 1.3 * t, 'Ø ' + mm(e.D1), 'D1', 1, 'BLAU');
    if (R2 > 0) z.mass(X(-R2), Y(e.H), X(R2), Y(e.H), 0, -1, 1.2 * t, 'Ø ' + mm(e.D2), 'D2', 1, 'BLAU');
    else z.hinweis(X(0), Y(e.H), -1, -0.6, 1.4 * t, 'Ø 0', 'D2', 'BLAU');
    z.mass(X(-R1), Y(0), X(-R1), Y(e.H), -1, 0, 1.3 * t, mm(e.H), 'H', 1, 'BLAU');
    z.mass(X(e.l), Y(0), X(e.l), Y(e.ha), 1, 0, 1.3 * t, mm(e.ha), 'ha', 1, 'BLAU');
    z.mass(X(e.l), Y(e.ha - rr), X(e.l), Y(e.ha + rr), 1, 0, 3.8 * t, 'Ø ' + mm(e.d), 'd', 1, 'BLAU');
    const zo = max(e.H, e.ha + rr); z.mass(X(0), Y(zo), X(e.l), Y(zo), 0, -1, (R2 > 0 ? 3.2 : 1.3) * t, mm(e.l), 'l', 1, 'BLAU');
    z.fertig(); return z;
  }

  /** Abwicklung des Stutzens: gerade Kante unten, 12 Mantellinien mit Nummer und Hoehe. */
  function abwStutzen(e, r, w, hh, t) {
    const z = new Ze.Zeichnung(w, hh, t), st = r.stutzen, zg = e.z || 0;
    const F = passend(w, hh, 0, -st.hMax, st.breite + zg, 0, 1.6 * t, 3.8 * t, 1.6 * t, 4.6 * t), X = F.X, Y = v => F.Y(-v);
    z.flaeche(flat(st.umriss.map(p => [X(p[0]), Y(p[1])])), 'BLECH', 'KANTE');
    if (zg > 0) z.linie(X(st.breite), Y(0), X(st.breite), Y(st.pts[M][1]), 'FALZ');
    const eng = (X(st.breite) - X(0)) / 12 < 2.9 * t;
    st.linien.forEach((l, i) => {
      z.linie(X(l.s), Y(0), X(l.s), Y(l.h), 'HILFE');
      z.text(X(l.s), Y(0) + 0.85 * t, String(l.nr), 0.78 * t, false, 0, 'GRAU');
      // Hoehen in zwei festen Zeilen ueber dem hoechsten Punkt (abwechselnd), sonst stossen sie an steilen Stellen zusammen
      z.text(X(l.s), Y(st.hMax) - (eng && i % 2 ? 2.0 : 0.9) * t, mm(l.h), 0.76 * t, true, 0, 'BLAU');
    });
    z.mass(X(0), Y(0), X(st.breite), Y(0), 0, 1, 2.1 * t, mm(st.breite) + ' mm', null, 1, 'TEXT');
    z.fertig(); return z;
  }

  /** Abwicklung des Rohrs mit Ausschnitt: Laenge waagrecht, Umfang senkrecht, Naht gegenueber dem Stutzen. */
  function abwHaupt(e, r, w, hh, t) {
    const z = new Ze.Zeichnung(w, hh, t), hp = r.haupt, U = hp.umfang, zg = e.z || 0;
    const F = passend(w, hh, 0, 0, e.L, U + zg, 5.6 * t, 3.2 * t, 1.6 * t, 3.2 * t), X = F.X, Y = F.Y;
    z.rechteck(X(0), Y(0), X(e.L), Y(U + zg), 'BLECH', 'KANTE');
    if (zg > 0) z.linie(X(0), Y(U), X(e.L), Y(U), 'FALZ');
    z.flaeche(flat(hp.loch.map(p => [X(e.a + p[0]), Y(U / 2 + p[1])])), 'LOCH', 'KANTE');
    z.linie(X(0), Y(U / 2), X(e.L), Y(U / 2), 'MITTEL'); z.linie(X(e.a), Y(0), X(e.a), Y(U), 'MITTEL');
    nummern(z, hp.linien.map(l => [X(e.a + l.x), Y(U / 2 + l.u), l.nr]), t);
    z.mass(X(0), Y(0), X(e.a), Y(0), 0, -1, 1.2 * t, mm(e.a), 'a', 1, 'BLAU');
    z.mass(X(0), Y(U + zg), X(e.L), Y(U + zg), 0, 1, 1.2 * t, mm(e.L), 'L', 1, 'BLAU');
    z.mass(X(0), Y(0), X(0), Y(U), -1, 0, 1.2 * t, mm(U), null, 1, 'TEXT');
    z.fertig(); return z;
  }

  /** Abwicklung des Kegels: Kreisringstueck mit Ausschnitt, Spitze oben, Naht gegenueber dem Stutzen. */
  function abwKegel(e, r, w, hh, t) {
    const z = new Ze.Zeichnung(w, hh, t), kg = r.kegel, alle = kg.umriss.concat([[0, 0]]);
    const xs = alle.map(p => p[0]), ys = alle.map(p => p[1]);
    const F = passend(w, hh, min(...xs), min(...ys), max(...xs), max(...ys), 4.6 * t, 2.6 * t, 2.2 * t, 2.2 * t), X = F.X, Y = F.Y;
    z.flaeche(flat(kg.umriss.map(p => [X(p[0]), Y(p[1])])), 'BLECH', 'KANTE');
    if (kg.naht) z.linie(X(kg.naht[0][0]), Y(kg.naht[0][1]), X(kg.naht[1][0]), Y(kg.naht[1][1]), 'FALZ');
    z.flaeche(flat(kg.loch.map(p => [X(p[0]), Y(p[1])])), 'LOCH', 'KANTE');
    z.linie(X(0), Y(0), X(0), Y(kg.ra), 'MITTEL');
    const b = -kg.om / 2, pa = kg.xy(kg.ra, b), pi = kg.xy(kg.ri, b), nx = -cos(b), ny = sin(b);
    if (kg.ri > 1e-9) { z.linie(X(0), Y(0), X(pi[0]), Y(pi[1]), 'HILFE'); const q = kg.xy(kg.ri, -b); z.linie(X(0), Y(0), X(q[0]), Y(q[1]), 'HILFE'); }
    nummern(z, kg.linien.map(l => [X(l.x), Y(l.y), l.nr]), t);
    z.mass(X(0), Y(0), X(pa[0]), Y(pa[1]), nx, ny, (kg.ri > 1e-9 ? 2.9 : 1.2) * t, 'R ' + mm(kg.ra), null, 1, 'TEXT');
    if (kg.ri > 1e-9) z.mass(X(0), Y(0), X(pi[0]), Y(pi[1]), nx, ny, 1.1 * t, 'r ' + mm(kg.ri), null, 1, 'TEXT');
    z.hinweis(X(0), Y(0), 1, -0.25, 1.0 * t, mm(kg.om * 180 / PI) + '°', null, 'TEXT');
    z.fertig(); return z;
  }

  // ================================================================================ Seite
  S.seiteAbzweig = function (art, opt) {
    opt = opt || {};
    const kegel = art === 'kegel', KEY = kegel ? 'kegelabzweig.state' : 'abzweig.state', titel = T(kegel ? 'ablauf_kegelabzweig' : 'ablauf_abzweig');
    const defs = kegel
      ? [['D1', L('Ø unten', 'Ø bottom'), '300'], ['D2', L('Ø oben (0 = Spitze)', 'Ø top (0 = apex)'), '100'], ['H', L('Höhe Kegel', 'Cone height'), '250'], ['d', L('Ø Stutzen', 'Ø branch'), '80'],
        ['ha', L('Achse ab Unterkante', 'Axis above base'), '110'], ['l', L('Stutzen ab Kegelachse', 'Branch from cone axis'), '260'], ['z', L('Nahtzugabe', 'Seam allowance'), '0']]
      : [['D', L('Ø Rohr', 'Ø pipe'), '100'], ['d', L('Ø Stutzen', 'Ø branch'), '80'], ['w', L('Winkel', 'Angle'), '60'], ['l', L('Stutzen ab Achse', 'Branch from axis'), '250'],
        ['L', L('Länge Rohr', 'Pipe length'), '400'], ['a', L('Achse ab links', 'Axis from left'), '200'], ['z', L('Nahtzugabe', 'Seam allowance'), '0']];
    const FEHLER = kegel
      ? { D1: L('Ø unten fehlt.', 'Bottom Ø is missing.'), D2: L('Ø oben muss kleiner sein als Ø unten.', 'Top Ø must be smaller than bottom Ø.'), H: L('Höhe fehlt.', 'Height is missing.'), d: L('Ø Stutzen fehlt.', 'Branch Ø is missing.'),
        d_gross: L('Der Stutzen ist an dieser Stelle zu gross für den Kegel.', 'The branch is too large for the cone at this height.'), ha: L('Der Stutzen muss ganz zwischen Unterkante und Oberkante liegen.', 'The branch must sit fully between base and top.'),
        l: L('Der Stutzen ist zu kurz, er endet im Kegel.', 'The branch is too short, it ends inside the cone.'), z: L('Nahtzugabe darf nicht negativ sein.', 'Seam allowance must not be negative.') }
      : { D: L('Ø Rohr fehlt.', 'Pipe Ø is missing.'), d: L('Ø Stutzen fehlt.', 'Branch Ø is missing.'), d_gross: L('Der Stutzen darf nicht grösser sein als das Rohr.', 'The branch must not be larger than the pipe.'),
        w: L('Winkel zwischen 20 und 90 Grad.', 'Angle between 20 and 90 degrees.'), l: L('Der Stutzen ist zu kurz, er endet im Rohr.', 'The branch is too short, it ends inside the pipe.'),
        L: L('Länge Rohr fehlt.', 'Pipe length is missing.'), a: L('Der Ausschnitt liegt nicht ganz auf dem Rohr.', 'The cut-out does not fit on the pipe.'), z: L('Nahtzugabe darf nicht negativ sein.', 'Seam allowance must not be negative.') };
    const st = { werte: {} }; defs.forEach(d => { st.werte[d[0]] = d[2]; });
    try { const j = JSON.parse(S.lies(KEY)); if (j && j.werte) defs.forEach(d => { if (typeof j.werte[d[0]] === 'string') st.werte[d[0]] = j.werte[d[0]]; }); } catch (x) { /* frisch */ }
    const speichere = () => S.schreibe(KEY, JSON.stringify(st));
    const mt = S.mt, grau = S.grau, text = S.text, felder = {};
    const primBox0 = h('div', { class: 'primbox' }), reihe = h('div', { class: 'primreihe', style: { flexWrap: 'wrap' } });
    defs.forEach(d => {
      const f = S.feld(d[1] + (d[0] === 'w' ? ' (°)' : ' (mm)'), st.werte[d[0]], { onChange: v => { st.werte[d[0]] = v; aktualisiere(); }, onFokus: an => { if (an) R.view.aktiv = d[0]; else if (R.view.aktiv === d[0]) R.view.aktiv = null; } });
      f.style.flex = '1 1 28%'; f.style.marginLeft = '0'; f.style.marginRight = '6px'; f.style.marginTop = '4px'; felder[d[0]] = f; reihe.append(f);
    });
    primBox0.append(S.primHinweis(reihe), reihe);
    const tabs = [T('ansicht_skizze'), L('Stutzen', 'Branch'), kegel ? L('Kegel', 'Cone') : L('Rohr', 'Pipe')];
    const R = S.weitereShell({ titel, tabs, dreiD: -1, primBox: primBox0, beiPdf: () => pdfErstellen(), beiDxf: () => dxfTeilen(), beiTeilen: () => blattTeilen(), anteil: 0.80 });

    const erg = text('', 16), tab = h('div', {}), fehlerText = text('', 16, true), status = text('', 16);
    erg.style.whiteSpace = 'pre-line'; fehlerText.style.color = 'var(--fehler)'; status.style.minHeight = '19px';
    const tabInfo = kegel
      ? L('Stutzen: Höhe ab der geraden Kante. Kegel: Abstand ab der Spitze und Bogen am Aussenrand ab der Mittellinie (minus = links).', 'Branch: height from the straight edge. Cone: distance from the apex and arc along the outer edge from the centre line (minus = left).')
      : L('Stutzen: Höhe ab der geraden Kante. Rohr: längs ab der Achslinie des Stutzens (plus = in Neigungsrichtung), quer ab der Mittellinie.', 'Branch: height from the straight edge. Pipe: along from the branch axis line (plus = in lean direction), across from the centre line.');
    const ergKarte = S.karte(text(L('Zuschnitt', 'Blank'), 18, true), erg, mt(text(L('12 Mantellinien zum Anreissen', '12 surface lines for marking out'), 16, true), 10), grau(tabInfo, 14), mt(tab, 6),
      mt(S.knopf(L('DXF für CAD und CNC', 'DXF for CAD and CNC'), false, () => dxfTeilen()), 10), grau(L('Beide Abwicklungen in mm, Ausschnitt und Mantellinien auf eigenen Lagen.', 'Both flat patterns in mm, cut-out and surface lines on their own layers.'), 14));
    const hinweise = S.klapp(T('hinweise_kurz'), [text(L('Entwurf zum Besprechen, Masse vor dem Zuschnitt prüfen. Durchmesser gelten in Blechmitte. Ausser der Nahtzugabe ist kein Falz und keine Überlappung eingerechnet. Die Naht liegt beim Stutzen an der kürzesten Mantellinie, beim Rohr und beim Kegel gegenüber dem Stutzen.',
      'Draft for discussion, check dimensions before cutting. Diameters are taken at mid sheet. Apart from the seam allowance no fold and no overlap is included. The seam is at the shortest line of the branch and opposite the branch on the pipe or cone.'), 14)]);
    if (S.vp.quer) R.inh.append(S.karte(text(T('ss_masse'), 18, true), primBox0));
    R.inh.append(mt(fehlerText, 6), mt(ergKarte, 6), mt(hinweise, 8), mt(S.rmKarte(kegel ? 'kegelabzweig' : 'abzweig', titel, () => snapshot()), 12), mt(status, 6));
    R.view.beiMass = k => { const f = felder[k]; if (!f) return; reihe.classList.add('offen'); f.input.focus(); };
    R.view.passung = zz => zz.anpassung(Math.max(160, R.view.w - 56), R.view.h, 12, 2.6, 20);
    R.view.feldFuer = k => { const f = felder[k]; return f && f.input ? f.input : null; };

    let letzteE = null, letztes = null;
    const num = k => { const v = S.parseNum(st.werte[k]); return v == null ? NaN : v; };
    const zelle = (s, kopf, links) => h(kopf ? 'th' : 'td', { text: s, style: { padding: '3px 6px', textAlign: links ? 'left' : 'right', fontWeight: kopf ? '700' : '400', borderBottom: '1px solid var(--feldrand)', fontSize: '15px' } });
    const zeilen = r => r.stutzen.linien.slice(0, 12).map((l, i) => kegel
      ? [String(l.nr), mm(l.h), mm(r.kegel.linien[i].l), mm(r.kegel.linien[i].b)] : [String(l.nr), mm(l.h), mm(r.haupt.linien[i].x), mm(r.haupt.linien[i].u)]);
    const koepfe = () => kegel ? [L('Nr.', 'No.'), L('Stutzen', 'Branch'), L('ab Spitze', 'from apex'), L('Bogen', 'Arc')] : [L('Nr.', 'No.'), L('Stutzen', 'Branch'), L('längs', 'along'), L('quer', 'across')];
    const zuschnittText = (e, r) => {
      const s = r.stutzen, o = [L('Stutzen', 'Branch') + ': ' + mm(s.breite + e.z) + ' × ' + mm(s.hMax) + ' mm (' + L('kürzeste Stelle', 'shortest') + ' ' + mm(s.hMin) + ')'];
      if (kegel) { const k = r.kegel; o.push(L('Kegel: Radius aussen ', 'Cone: outer radius ') + mm(k.ra) + ', ' + L('innen ', 'inner ') + mm(k.ri) + ' mm, ' + L('Winkel ', 'angle ') + mm(k.om * 180 / PI) + '°' + (k.sehne ? ', ' + L('Sehne ', 'chord ') + mm(k.sehne) + ' mm' : '')); }
      else { const p = r.haupt; o.push(L('Rohr', 'Pipe') + ': ' + mm(e.L) + ' × ' + mm(p.umfang + e.z) + ' mm', L('Ausschnitt', 'Cut-out') + ': ' + mm(p.xMax - p.xMin) + ' × ' + mm(2 * p.uMax) + ' mm'); }
      if (e.z > 0) o.push(L('Nahtzugabe ', 'Seam allowance ') + mm(e.z) + ' mm ' + L('eingerechnet', 'included'));
      return o;
    };
    function aktualisiere() {
      const e = {}; defs.forEach(d => { e[d[0]] = num(d[0]); felder[d[0]].fehler(null); });
      const f = kegel ? Abzweig.pruefeKegel(e) : Abzweig.pruefeRohr(e);
      if (f) {
        const k = f === 'd_gross' ? 'd' : f, msg = FEHLER[f] || f; if (felder[k]) felder[k].fehler(msg);
        letztes = null; R.cv2.style.opacity = S.dimm(); fehlerText.textContent = msg; erg.textContent = '-'; tab.innerHTML = ''; R.leiste_leer(msg); speichere(); return;
      }
      const r = kegel ? Abzweig.kegel(e) : Abzweig.rohr(e); letzteE = e; letztes = r; fehlerText.textContent = ''; R.cv2.style.opacity = 1;
      R.view.bauer = (a, w, hh, t) => a === 0 ? (kegel ? ansichtKegel : ansichtRohr)(e, r, w, hh, t) : a === 1 ? abwStutzen(e, r, w, hh, t) : (kegel ? abwKegel : abwHaupt)(e, r, w, hh, t);
      R.view.baue(true);
      erg.textContent = zuschnittText(e, r).join('\n');
      tab.innerHTML = '';
      tab.append(h('table', { style: { width: '100%', borderCollapse: 'collapse' } }, h('tr', {}, koepfe().map((s, i) => zelle(s, true, i === 0))), zeilen(r).map(zl => h('tr', {}, zl.map((s, i) => zelle(s, false, i === 0))))));
      R.leiste_gueltig(L('Stutzen, Zuschnitt', 'Branch blank'), r.stutzen.breite + e.z, v => mm(v) + ' × ' + mm(r.stutzen.hMax) + ' mm');
      speichere();
    }
    const snapshot = () => defs.map(d => d[1] + ' ' + st.werte[d[0]]).join(', ');
    const zeitName = () => S.zeitName();
    const datum = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear(); };
    /** Blatt A4 hoch: Ansicht und Tabelle oben, darunter beide Abwicklungen. */
    function blatt(e, r) {
      const B = root.Blatt.B, H = root.Blatt.H, R0 = 28, z = new Ze.Zeichnung(B, H, 9), bw = B - 2 * R0;
      z.text(R0, 34, titel, 17, true, -1, 'TEXT');
      z.text(R0, 52, snapshot() + ' (mm)', 8.5, false, -1, 'GRAU');
      z.einfuegen((kegel ? ansichtKegel : ansichtRohr)(e, r, 300, 236, 8.5), R0, 62);
      const xt = R0 + 312, sp = [0, 44, 110, 176]; let y = 78;
      z.text(xt, y, L('Zuschnitt', 'Blank'), 10.5, true, -1, 'TEXT'); y += 14;
      zuschnittText(e, r).forEach(s => { s.split(', ').forEach(tl => { z.text(xt, y, tl, 8.5, false, -1, 'TEXT'); y += 11.5; }); });
      y += 8; koepfe().forEach((s, i) => z.text(xt + sp[i], y, s, 8.5, true, -1, 'TEXT')); y += 12;
      zeilen(r).forEach(zl => { zl.forEach((s, i) => z.text(xt + sp[i], y, s, 8.5, false, -1, 'TEXT')); y += 11.5; });
      z.text(R0, 316, L('Abwicklung Stutzen', 'Branch flat pattern'), 10.5, true, -1, 'TEXT'); z.einfuegen(abwStutzen(e, r, bw, 214, 8.5), R0, 322);
      z.text(R0, 556, kegel ? L('Abwicklung Kegel mit Ausschnitt', 'Cone flat pattern with cut-out') : L('Abwicklung Rohr mit Ausschnitt', 'Pipe flat pattern with cut-out'), 10.5, true, -1, 'TEXT');
      z.einfuegen((kegel ? abwKegel : abwHaupt)(e, r, bw, 236, 8.5), R0, 562);
      z.text(R0, H - 20, datum() + '  ' + L('Entwurf, Masse vor dem Zuschnitt prüfen. Durchmesser in Blechmitte, ohne Falz.', 'Draft, check dimensions before cutting. Diameters at mid sheet, no fold.'), 8, false, -1, 'GRAU');
      z.fertig(); return z;
    }
    const dxfName = () => (kegel ? 'Kegelabzweig_' : 'Abzweig_') + defs.slice(0, kegel ? 4 : 3).map(d => String(st.werte[d[0]]).replace(',', '.')).join('-') + '.dxf';
    const dxfBlob = () => new Blob([Abzweig.dxf(art, letzteE, letztes, titel)], { type: 'application/dxf' });
    async function blattDatei() { if (!letztes) return null; const blob = await root.Blatt.alsPng(blatt(letzteE, letztes), 2); return { blob, name: (kegel ? 'Kegelabzweig_' : 'Abzweig_') + zeitName() + '.png', titel }; }
    async function pdfErstellen() {
      if (!letztes) { status.textContent = T('status_leer'); return; }
      status.textContent = '';
      try { const d = await blattDatei(); S.pdfDialog(d.blob, d.name, d.titel, m => { status.textContent = m; }); } catch (x) { status.textContent = T('status_pdf_fehler'); }
    }
    async function dxfTeilen() {
      if (!letztes) { status.textContent = T('status_leer'); return; }
      const name = dxfName(), r = await S.teilen(dxfBlob(), name, titel); if (r === 'download') status.textContent = name;
    }
    async function blattTeilen() {
      if (!letztes) { status.textContent = T('status_leer'); return; }
      let d; try { d = await blattDatei(); } catch (x) { d = null; }
      if (!d) { status.textContent = T('status_pdf_fehler'); return; }
      status.textContent = ''; const dx = { blob: dxfBlob(), name: dxfName() };
      R.teilenFertig(async () => { const r = await S.teilen(d.blob, d.name, d.titel, [dx]); if (r === 'download') status.textContent = d.name + ', ' + dx.name; });
    }
    return { el: R.el, overlay: { zurueck: true }, art: kegel ? 'kegelabzweig' : 'abzweig',
      nachEinbau() { R.layout(); aktualisiere(); R.setzeTab(opt.ansicht === 'stutzen' ? 1 : opt.ansicht === 'haupt' ? 2 : 0, false); S.autosizeAlle(R.el); S.nachLayout(() => { S.autosizeAlle(R.el); }); S.setzeScroll(R, opt); },
      kontext() { return { ansicht: tabs[R.tab], eingaben: snapshot() }; },
      layout() { R.layout(); }, speichere, zerstoere() { speichere(); R.ro.disconnect(); } };
  };
})(typeof window !== 'undefined' ? window : globalThis);
