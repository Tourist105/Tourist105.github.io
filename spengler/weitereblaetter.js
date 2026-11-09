/* Spengler-Web: Zeichnungen der "Weiteren Teile" im Stil der Alex-Teile. Port von kern/WeitereBlaetter.kt (Android):
 * gekantetes Profil (Profil, Zuschnitt) und Rohrbogen, Schwanenhals (Segmente), Hosenrohr, Reduktion als Seitenansicht.
 * Reine Zeichnung (Ze.Zeichnung, mit fertig() und kollisionen() geprueft). Rechnung bleibt in alt.js (Profil) und kern.js/rohr.js (Rohr).
 * Schluessel der Masse (key) sind die Feldschluessel der Seite: s0.. und w0.. beim Profil, d, r, w, n, a, g, l, d1, d2, h beim Rohr. */
(function (root) {
  'use strict';
  const Ze = root.Ze || (typeof require !== 'undefined' ? require('./zeichnung.js') : null);
  const { Zeichnung, fmtTrim } = Ze;
  const PI = Math.PI, cos = Math.cos, sin = Math.sin, abs = Math.abs, min = Math.min, max = Math.max, hypot = Math.hypot, atan2 = Math.atan2;
  const mm = v => fmtTrim(v, 1);
  const sum = a => a.reduce((x, y) => x + y, 0);

  // ================================================================================ Gekantetes Profil
  /** Profil als Linienzug: Schenkel mit Buchstabe und Mass, Winkel mit Bogen. P = Profil (punkte, buchstabe). */
  function profil(e, w, h, t, P) {
    const z = new Zeichnung(w, h, t);
    if (!e.schenkel.length) { z.fertig(); return z; }
    const pt = P.punkte(e);
    const minX = min(...pt.map(p => p[0])), maxX = max(...pt.map(p => p[0])), minY = min(...pt.map(p => p[1])), maxY = max(...pt.map(p => p[1]));
    const bw = max(maxX - minX, 1), bh = max(maxY - minY, 1), rx = 4.2 * t, ry = 3.4 * t;
    const s = max(0.01, min((w - 2 * rx) / bw, (h - 2 * ry) / bh)), ox = (w - bw * s) / 2, oy = (h - bh * s) / 2;
    const px = pt.map(p => ox + (p[0] - minX) * s), py = pt.map(p => oy + (maxY - p[1]) * s);
    const cx = sum(px) / px.length, cy = sum(py) / py.length;
    for (let i = 0; i < e.schenkel.length; i++) z.linie(px[i], py[i], px[i + 1], py[i + 1], 'KANTE', 's' + i, 0, 2.7);
    z.ellipse(px[0], py[0], 3.4, 3.4, 'AKZENT', null);
    z.ellipse(px[px.length - 1], py[py.length - 1], 3.4, 3.4, 'AKZENT', null);
    for (let i = 0; i < e.schenkel.length; i++) {
      const mx = (px[i] + px[i + 1]) / 2, my = (py[i] + py[i + 1]) / 2;
      let nx = -(py[i + 1] - py[i]), ny = px[i + 1] - px[i];
      const l = max(hypot(nx, ny), 1e-3); nx /= l; ny /= l;
      if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
      const txt = P.buchstabe(i) + '  ' + mm(e.schenkel[i]);
      const tw = Ze.textBreite(txt, t, true);
      const halb = abs(nx) * tw / 2 + abs(ny) * t / 2 + 0.3 * t + 2;
      z.beweglich(mx + nx * halb, my + ny * halb, txt, nx, ny, mx, my, t, true, 'BLAU', 's' + i);
    }
    e.knicke.forEach((k, i) => {
      if (i + 2 >= pt.length) return;
      const vx = px[i + 1], vy = py[i + 1], ux = px[i] - vx, uy = py[i] - vy, wx = px[i + 2] - vx, wy = py[i + 2] - vy;
      const lu = max(hypot(ux, uy), 1e-3), lw = max(hypot(wx, wy), 1e-3), r = max(4, min(1.0 * t, 0.38 * min(lu, lw)));
      const au = atan2(-uy, ux) * 180 / PI, aw = atan2(-wy, wx) * 180 / PI;
      let d = aw - au; while (d > 180) d -= 360; while (d <= -180) d += 360;
      const recht = abs(k.oeffnung - 90) < 0.05;
      if (recht) {
        const a = r * 0.8;
        z.poly([vx + ux / lu * a, vy + uy / lu * a, vx + ux / lu * a + wx / lw * a, vy + uy / lu * a + wy / lw * a, vx + wx / lw * a, vy + wy / lw * a], 'MASS', 'w' + i);
      } else z.bogen(vx, vy, r, au, au + d, 'MASS', 'w' + i);
      const mid = (au + d / 2) * PI / 180, dx = cos(mid), dy = -sin(mid), txt = mm(k.oeffnung) + '°', tw = Ze.textBreite(txt, t * 0.92, true);
      const halb = abs(dx) * tw / 2 + abs(dy) * t * 0.92 / 2 + 0.3 * t + 2;
      z.beweglich(vx + dx * (r + halb), vy + dy * (r + halb), txt, dx, dy, vx + dx * r, vy + dy * r, t * 0.92, true, 'AKZENT', 'w' + i, undefined, undefined, recht || e.schenkel.length > 4);
    });
    z.fertig(); return z;
  }

  /** Flacher Streifen: Schenkellaengen zwischen den Falzen (nach Biegeabzug), Falze gestrichelt, Gesamtlaenge darunter. r = Profil.rechne(e). */
  function zuschnitt(e, r, w, h, t, P) {
    const z = new Zeichnung(w, h, t), n = e.schenkel.length;
    if (n === 0 || !(r.breite > 0)) { z.fertig(); return z; }
    const total = r.breite, mx = 2.0 * t, x0 = mx, x1 = w - mx, sc = (x1 - x0) / total;
    const bandH = max(2.4 * t, min(h * 0.30, 0.30 * (x1 - x0), 5.2 * t)), y0 = (h - bandH) / 2, y1 = y0 + bandH;
    z.rechteck(x0, y0, x1, y1, 'BLECH', 'KANTE');
    const abz = r.bieg.map(b => b.abzug), falz = []; let sm = 0, ab = 0;
    for (let i = 0; i < n - 1; i++) { sm += e.schenkel[i]; const a = i < abz.length ? abz[i] : 0; falz.push(sm - ab - a / 2); ab += a; }
    const punkte = [[x0, y0]];
    for (const f of falz) { const x = x0 + f * sc; punkte.push([x, y0]); z.linie(x, y0, x, y1, 'FALZ', null, 0, 1.4); }
    punkte.push([x1, y0]);
    const flach = [];
    for (let i = 0; i < n; i++) {
      const f = e.schenkel[i] - (i > 0 ? (i - 1 < abz.length ? abz[i - 1] : 0) / 2 : 0) - (i < n - 1 ? (i < abz.length ? abz[i] : 0) / 2 : 0);
      flach.push((n > 5 ? '' : P.buchstabe(i) + '  ') + mm(f));
    }
    const keys = flach.map((_, i) => 's' + i);
    if (n >= 2) z.kette(punkte, 0, -1, 12, flach, keys, 1, 'BLAU', true, n > 5 ? t * 0.85 : t, z.neueGruppe(), true, n > 4 ? 4 : Infinity);
    else z.mass(x0, y0, x1, y0, 0, -1, 12, flach[0], 's0', 1, 'BLAU');
    z.mass(x0, y1, x1, y1, 0, 1, 12, mm(total) + ' mm', null, 1, 'TEXT');
    falz.forEach((f, i) => {
      const k = e.knicke[i]; if (!k) return;
      const x = x0 + f * sc;
      z.beweglich(x + 0.8 * t, y0 + 0.9 * t, mm(k.oeffnung) + '°', 1, 0, x, y0 + 0.9 * t, t * 0.9, false, 'GRAU', 'w' + i, undefined, undefined, true);
    });
    z.fertig(); return z;
  }

  // ================================================================================ Rohrarbeiten (Seitenansicht)
  function profile(modell) {
    const G = root.RohrGeo, out = [];
    for (const tl of modell.teile) {
      const zy = tl.mantel; if (zy.lGross != null) continue;
      const pt = (u, oben) => tl.lage.abbilden(G.rolle(zy, [u, oben ? zy.oben(u) : zy.unten(u)], 1));
      const a = pt(0, false), b = pt(0, true), c = pt(PI * zy.r, true), d = pt(PI * zy.r, false);
      out.push({ x: [a[0], b[0], c[0], d[0]], z: [a[2], b[2], c[2], d[2]] });
    }
    return out;
  }

  /** Seitenansicht einer Rohrarbeit. art: rohrbogen, schwanenhals, hosenrohr, reduktion. fmt: Laenge in cm als Text (ohne Einheit). */
  function rohr(art, modell, bogen, hals, hose, kegel, fmt, w, h, t) {
    const z = new Zeichnung(w, h, t);
    let prof;
    if (art === 'reduktion') { if (!kegel) { z.fertig(); return z; } prof = [{ x: [-kegel.rk, -kegel.rg, kegel.rg, kegel.rk], z: [0, kegel.h, kegel.h, 0] }]; }
    else { if (!modell) { z.fertig(); return z; } prof = profile(modell); }
    if (!prof.length) { z.fertig(); return z; }
    const ex = [];
    for (const p of prof) for (let i = 0; i < 4; i++) ex.push([p.x[i], p.z[i]]);
    if (art === 'rohrbogen' && bogen) ex.push([bogen.radius, 0]);
    else if (art === 'schwanenhals' && hals) { ex.push([hals.ausladung, 0]); ex.push([0, hals.hoehe]); }
    else if (art === 'hosenrohr' && hose) ex.push([0, -(hose.d / 2) / sin(hose.beta)]);
    const x0 = min(...ex.map(q => q[0])), x1 = max(...ex.map(q => q[0])), z0 = min(...ex.map(q => q[1])), z1 = max(...ex.map(q => q[1]));
    const gw = max(x1 - x0, 1e-3), gh = max(z1 - z0, 1e-3), rx = 5.4 * t, ry = 4.2 * t;
    const s = max(0.001, min((w - 2 * rx) / gw, (h - 2 * ry) / gh)), ox = (w - gw * s) / 2 - x0 * s, oy = (h - gh * s) / 2 + z1 * s;
    const X = v => ox + v * s, Y = v => oy - v * s;
    for (const p of prof) z.flaeche([X(p.x[0]), Y(p.z[0]), X(p.x[1]), Y(p.z[1]), X(p.x[2]), Y(p.z[2]), X(p.x[3]), Y(p.z[3])], 'BLECH', 'KANTE');
    for (let j = 0; j < prof.length - 1; j++) z.linie(X(prof[j].x[1]), Y(prof[j].z[1]), X(prof[j].x[2]), Y(prof[j].z[2]), 'FALZ');
    const ext = 1.6 * t;
    const hinw = (ax, ay, dx, dy, str, key, farbe, optional) => { const l = hypot(dx, dy); z.hinweis(ax, ay, dx / l, dy / l, 5, str, key, farbe || 'TEXT', true, undefined, !!optional); };

    if (art === 'rohrbogen') {
      const b = bogen; if (!b) { z.fertig(); return z; }
      const p0 = prof[0], a = min(p0.x[0], p0.x[3]), c = max(p0.x[0], p0.x[3]), zu = min(p0.z[0], p0.z[3]);
      z.mass(X(a), Y(zu), X(c), Y(zu), 0, 1, 14, 'Ø ' + fmt(b.d), 'd');
      const cxp = X(b.radius), cyp = Y(0);
      z.linie(cxp, cyp, X(0), Y(0), 'MITTEL');
      const ew = b.winkelGrad * PI / 180;
      z.linie(cxp, cyp, X(b.radius - b.radius * cos(ew)), Y(b.radius * sin(ew)), 'MITTEL');
      z.ellipse(cxp, cyp, 2.6, 2.6, 'AKZENT', null);
      hinw((cxp + X(0)) / 2, cyp, 0, 1, 'R ' + fmt(b.radius), 'r', 'BLAU');
      const rr = min(0.45 * abs(cxp - X(0)), 2.6 * t), aStart = 180 - b.winkelGrad;
      z.bogen(cxp, cyp, rr, aStart, 180, 'MASS', 'w');
      const mid = (aStart + 180) / 2 * PI / 180;
      hinw(cxp + rr * cos(mid), cyp - rr * sin(mid), cos(mid), -sin(mid), fmtTrim(b.winkelGrad, 1) + '°', 'w', 'AKZENT');
      const mi = prof[Math.trunc(prof.length / 2)];
      hinw(X(sum(mi.x) / 4), Y(sum(mi.z) / 4), -1, 0, 'n ' + b.n, 'n', 'GRAU', true);
    } else if (art === 'schwanenhals') {
      const sh = hals; if (!sh) { z.fertig(); return z; }
      const aus = sh.ausladung, hh = sh.hoehe;
      z.linie(X(0), Y(hh) - ext, X(0), Y(0) + ext, 'MITTEL');
      z.linie(X(aus), Y(hh) - ext, X(aus), Y(0) + ext, 'MITTEL');
      z.mass(X(0), Y(0) + ext, X(aus), Y(0) + ext, 0, 1, 8, 'A ' + fmt(aus), 'a');
      const xl = min(...prof.map(p => min(...p.x)));
      z.mass(X(xl), Y(0), X(xl), Y(hh), -1, 0, 12, 'H ' + fmt(hh), null);
      const p0 = prof[0], a0 = min(p0.x[0], p0.x[3]), c0 = max(p0.x[0], p0.x[3]), oben = p0.z[0] >= p0.z[3] ? 0 : 3;
      z.mass(X(a0), Y(p0.z[oben]), X(c0), Y(p0.z[oben]), 0, -1, 12, 'Ø ' + fmt(sh.d), 'd');
      const zw = prof[sh.n], mxp = sum(zw.x) / 4, mzp = sum(zw.z) / 4;
      hinw(X(mxp), Y(mzp), 1, -0.9, 'γ ' + fmtTrim(sh.gammaGrad, 1) + '°', 'g', 'AKZENT');
      hinw(X(mxp), Y(mzp), -1, 0.9, 'Lz ' + fmt(sh.zwischen), null, 'GRAU', true);
      const bg = prof[max(0, Math.trunc(sh.n / 2))];
      hinw(X(sum(bg.x) / 4), Y(sum(bg.z) / 4), -1, -0.2, 'R ' + fmt(sh.radius), 'r', 'BLAU');
      const bg2 = prof[min(max(0, sh.n + 1 + Math.trunc(sh.n / 2)), prof.length - 1)];
      hinw(X(sum(bg2.x) / 4), Y(sum(bg2.z) / 4), 1, 0.3, 'n ' + sh.n, 'n', 'GRAU', true);
    } else if (art === 'hosenrohr') {
      const hs = hose; if (!hs) { z.fertig(); return z; }
      const b = hs.beta, x0b = hs.d / 2 / cos(b), iz = -(hs.d / 2) / sin(b), ix = X(0), iy = Y(iz), lang = x0b / sin(b) + hs.bein;
      for (const vz of [1, -1]) z.linie(ix, iy, X(vz * lang * sin(b)), Y(iz + lang * cos(b)), 'MITTEL');
      const rr = max(6, min(3.0 * t, 0.55 * abs(Y(0) - iy)));
      z.bogen(ix, iy, rr, 90 - hs.winkelGrad / 2, 90 + hs.winkelGrad / 2, 'MASS', 'w');
      hinw(ix, iy - rr, 0, -1, 'α ' + fmtTrim(hs.winkelGrad, 1) + '°', 'w', 'AKZENT');
      let rechts = prof[prof.length - 1], bestes = -Infinity; for (const p of prof) if (p.x[0] + p.x[3] > bestes) { bestes = p.x[0] + p.x[3]; rechts = p; }
      const oi = rechts.z[1] >= rechts.z[2] ? 1 : 2, ui = oi === 1 ? 2 : 1;
      z.mass(X(rechts.x[ui]), Y(rechts.z[ui]), X(rechts.x[oi]), Y(rechts.z[oi]), sin(b), -cos(b), 12, 'Ø ' + fmt(hs.d), 'd');
      const nxm = -cos(b), nzm = -sin(b), sx = -x0b, sz = 0, ex2 = -x0b - hs.bein * sin(b), ez2 = hs.bein * cos(b);
      z.mass(X(sx + nxm * hs.d / 2), Y(sz + nzm * hs.d / 2), X(ex2 + nxm * hs.d / 2), Y(ez2 + nzm * hs.d / 2), -cos(b), sin(b), 12, 'L ' + fmt(hs.bein), 'l');
    } else {
      const k = kegel; if (!k) { z.fertig(); return z; }
      z.linie(X(0), Y(k.h) - ext, X(0), Y(0) + ext, 'MITTEL');
      z.mass(X(-k.rg), Y(k.h), X(k.rg), Y(k.h), 0, -1, 12, 'D1 ' + fmt(k.d1), 'd1');
      z.mass(X(-k.rk), Y(0), X(k.rk), Y(0), 0, 1, 12, 'D2 ' + fmt(k.d2), 'd2');
      z.mass(X(-k.rg), Y(0), X(-k.rg), Y(k.h), -1, 0, 12, 'h ' + fmt(k.h), 'h');
    }
    z.fertig(); return z;
  }

  Ze.WB = { profil, zuschnitt, rohr };
  if (typeof module !== 'undefined') module.exports = Ze.WB;
})(typeof window !== 'undefined' ? window : globalThis);
