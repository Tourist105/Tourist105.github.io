/* Spengler-Web: Port von kern/Zeichnung.kt, kern/SkizzenBlaetter.kt, kern/SkizzenSeiten.kt (Farben) und SkizzenRenderer.kt.
 * Gleiche Mathematik wie Kotlin (Zahlen als double, Kotlin rechnet teils in float: Abweichung unter 1e-4 Einheiten).
 * Elemente: {k:'l'|'f'|'t', ...}. Blattkoordinaten, y nach unten. */
(function (root) {
  'use strict';
  const PI = Math.PI, cos = Math.cos, sin = Math.sin, hypot = Math.hypot, max = Math.max, min = Math.min, abs = Math.abs;
  const Stift = { KANTE: 'KANTE', FALZ: 'FALZ', MASS: 'MASS', HILFE: 'HILFE', MITTEL: 'MITTEL' };
  const Fuell = { KEINE: 'KEINE', BLECH: 'BLECH', AUFKANT: 'AUFKANT', AUFKANT2: 'AUFKANT2', UMSCHLAG: 'UMSCHLAG', AKZENT: 'AKZENT', LOCH: 'LOCH', KAMIN: 'KAMIN', STUTZEN: 'STUTZEN', KASTEN: 'KASTEN', PAPIER: 'PAPIER', ROHR_HELL: 'ROHR_HELL', GLANZ: 'GLANZ', ROHR_DUNKEL: 'ROHR_DUNKEL', INNEN: 'INNEN', SCHATTEN: 'SCHATTEN', DACH: 'DACH' };
  const TFarbe = { TEXT: 'TEXT', GRAU: 'GRAU', BLAU: 'BLAU', AKZENT: 'AKZENT', WEISS: 'WEISS' };

  const FARBEN = {
    LINIE: '#1B2F6B', MASS: '#2E4C8C', HILFE: '#9AA4B2', AKZENT: '#E8740C', AKZENT_TEXT: '#C25500', TEXT: '#14202E', GRAU: '#5D6670', BLAU: '#0B3A6E', WEISS: '#FFFFFF',
    BLECH: '#CFE4F8', AUFKANT: '#8DB8E6', AUFKANT2: '#6D9FD6', UMSCHLAG: '#FFD8A8', STUTZEN: '#B4D2F0', KAMIN: '#E9ECF0', KASTEN: '#0B3A6E'
  };
  const FUELL = {
    KEINE: null, BLECH: FARBEN.BLECH, AUFKANT: FARBEN.AUFKANT, AUFKANT2: FARBEN.AUFKANT2, UMSCHLAG: FARBEN.UMSCHLAG, AKZENT: FARBEN.AKZENT, LOCH: FARBEN.WEISS, KAMIN: FARBEN.KAMIN,
    STUTZEN: FARBEN.STUTZEN, KASTEN: FARBEN.KASTEN, PAPIER: FARBEN.WEISS, ROHR_HELL: '#DCEBFA', GLANZ: '#F6FAFF', ROHR_DUNKEL: '#5F8CC4', INNEN: '#5C87BC', SCHATTEN: '#B5CBE3', DACH: '#C9CED6'
  };
  const TEXTFARBE = { TEXT: FARBEN.TEXT, GRAU: FARBEN.GRAU, BLAU: FARBEN.BLAU, AKZENT: FARBEN.AKZENT_TEXT, WEISS: FARBEN.WEISS };

  // ------------------------------------------------------------------ Format (Format.kt)
  const Fmt = { dez: ',' };
  function fmt(n, d) { return n.toFixed(d).replace('.', Fmt.dez); }
  function fmtTrim(n, d) { const s = fmt(n, d); return s.indexOf(Fmt.dez) >= 0 ? s.replace(/0+$/, '').replace(Fmt.dez === '.' ? /\.$/ : /,$/, '') : s; }
  function parseNum(s) { const v = parseFloat(String(s).trim().replace(',', '.')); return /^\s*[-+]?(\d+\.?\d*|\.\d+)\s*$/.test(String(s).trim().replace(',', '.')) && isFinite(v) ? v : null; }

  const RAND = 5, ABST = 1.0;
  function textBreite(s, g, fett) {
    let w = 0;
    for (const c of s) {
      if (c >= '0' && c <= '9') w += 0.58;
      else if (c === ',' || c === '.' || c === ' ' || c === ':') w += 0.30;
      else if (c === '°') w += 0.50;
      else if ('iljtfI|'.indexOf(c) >= 0) w += 0.36;
      else if ('mwMW'.indexOf(c) >= 0) w += 0.92;
      else if (c !== c.toLowerCase() && c === c.toUpperCase()) w += 0.70;
      else w += 0.58;
    }
    return w * g * (fett ? 1.05 : 1);
  }

  function textRect(e) {
    const b = textBreite(e.text, e.groesse, e.fett);
    const l = e.ausr === -1 ? e.x : e.ausr === 1 ? e.x - b : e.x - b / 2;
    return [l, e.y - e.groesse * 0.5, l + b, e.y + e.groesse * 0.5];
  }

  function rectSchneidetSeg(r, s) {
    const x1 = r[0] - ABST, y1 = r[1] - ABST, x2 = r[2] + ABST, y2 = r[3] + ABST;
    if (x2 <= x1 || y2 <= y1) return false;
    let t0 = 0, t1 = 1;
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    function clip(p, q) {
      if (abs(p) < 1e-9) return q >= 0;
      const rr = q / p;
      if (p < 0) { if (rr > t1) return false; if (rr > t0) t0 = rr; } else { if (rr < t0) return false; if (rr < t1) t1 = rr; }
      return true;
    }
    return clip(-dx, s.x1 - x1) && clip(dx, x2 - s.x1) && clip(-dy, s.y1 - y1) && clip(dy, y2 - s.y1) && t0 <= t1;
  }

  class Zeichnung {
    constructor(w, h, t) { this.w = w; this.h = h; this.t = t; this.elems = []; this.hind = []; this.gidZaehler = 0; this.istFertig = false; }
    neueGruppe() { return ++this.gidZaehler; }
    linie(x1, y1, x2, y2, stift, key, gid, dick) {
      key = key == null ? null : key; gid = gid || 0; dick = dick == null ? 1 : dick;
      this.elems.push({ k: 'l', x1, y1, x2, y2, stift, key, gid, dick });
      if (stift === 'KANTE' || stift === 'FALZ' || stift === 'MASS') this.hind.push({ x1, y1, x2, y2, gid });
    }
    poly(pts, stift, key, gid, geschlossen) {
      const n = pts.length / 2;
      for (let i = 0; i < n - 1; i++) this.linie(pts[2 * i], pts[2 * i + 1], pts[2 * i + 2], pts[2 * i + 3], stift, key, gid);
      if (geschlossen && n > 2) this.linie(pts[2 * n - 2], pts[2 * n - 1], pts[0], pts[1], stift, key, gid);
    }
    flaeche(pts, fuell, kante, key, gid) {
      if (kante === undefined) kante = 'KANTE';
      key = key == null ? null : key; gid = gid || 0;
      const n = pts.length / 2, xs = new Array(n), ys = new Array(n);
      for (let i = 0; i < n; i++) { xs[i] = pts[2 * i]; ys[i] = pts[2 * i + 1]; }
      this.elems.push({ k: 'f', xs, ys, fuell, kante, key, gid });
      if (kante === 'KANTE' || kante === 'FALZ') for (let i = 0; i < n; i++) { const j = (i + 1) % n; this.hind.push({ x1: xs[i], y1: ys[i], x2: xs[j], y2: ys[j], gid }); }
    }
    rechteck(x1, y1, x2, y2, fuell, kante, key) { this.flaeche([x1, y1, x2, y1, x2, y2, x1, y2], fuell, kante, key); }
    ellipse(cx, cy, rx, ry, fuell, kante, key, n) {
      n = n || 40; const p = new Array(2 * n);
      for (let i = 0; i < n; i++) { const a = 2 * PI * i / n; p[2 * i] = cx + rx * cos(a); p[2 * i + 1] = cy + ry * sin(a); }
      this.flaeche(p, fuell, kante, key);
    }
    bogen(cx, cy, r, w0, w1, stift, key, gid, n) {
      n = n || 14; const p = new Array(2 * (n + 1));
      for (let i = 0; i <= n; i++) { const a = (w0 + (w1 - w0) * i / n) * PI / 180; p[2 * i] = cx + r * cos(a); p[2 * i + 1] = cy - r * sin(a); }
      this.poly(p, stift, key, gid);
    }
    text(x, y, s, groesse, fett, ausr, farbe, key, gid) {
      this.elems.push({ k: 't', x, y, text: s, groesse: groesse == null ? this.t : groesse, fett: !!fett, ausr: ausr || 0, farbe: farbe || 'TEXT', key: key == null ? null : key, gid: gid || 0, tx: 0, ty: 0, ax: 0, ay: 0, beweglich: false, fuehrung: false, optional: false });
    }
    beweglich(x, y, s, tx, ty, ax, ay, groesse, fett, farbe, key, gid, fuehrung, optional) {
      this.elems.push({ k: 't', x, y, text: s, groesse: groesse == null ? this.t : groesse, fett: fett == null ? true : fett, ausr: 0, farbe: farbe || 'TEXT', key: key == null ? null : key, gid: gid || 0, tx, ty, ax, ay, beweglich: true, fuehrung: !!fuehrung, optional: !!optional });
    }
    mass(ax, ay, bx, by, ex, ey, off, s, key, td, farbe, fett, groesse, optional) {
      this.kette([[ax, ay], [bx, by]], ex, ey, off, [s], [key == null ? null : key], td == null ? 1 : td, farbe, fett, groesse, undefined, true, optional ? 0 : Infinity);
    }
    kette(pts, ex, ey, off, texte, keys, td, farbe, fett, groesse, gid, ticks, optionalAb) {
      td = td == null ? 1 : td; farbe = farbe || 'TEXT'; fett = fett == null ? true : fett; groesse = groesse == null ? this.t : groesse;
      gid = gid == null ? this.neueGruppe() : gid; ticks = ticks == null ? true : ticks; optionalAb = optionalAb == null ? Infinity : optionalAb;
      const t = this.t, n = pts.length;
      if (n < 2) return;
      const dx0 = pts[n - 1][0] - pts[0][0], dy0 = pts[n - 1][1] - pts[0][1];
      const l0 = hypot(dx0, dy0);
      if (l0 < 0.5) return;
      const dx = dx0 / l0, dy = dy0 / l0;
      let nx = -dy, ny = dx;
      if (nx * ex + ny * ey < 0) { nx = -nx; ny = -ny; }
      const ux0 = dx + nx, uy0 = dy + ny, ul = hypot(ux0, uy0), tk = 0.42 * t;
      const qx = pts.map(p => p[0] + ex * off), qy = pts.map(p => p[1] + ey * off);
      for (let i = 0; i < n; i++) this.linie(pts[i][0] + ex * 2, pts[i][1] + ey * 2, qx[i] + ex * 3, qy[i] + ey * 3, 'HILFE', null, gid);
      this.linie(qx[0], qy[0], qx[n - 1], qy[n - 1], 'MASS', keys.length ? keys[0] : null, gid);
      if (ticks) for (let i = 0; i < n; i++) this.linie(qx[i] - ux0 / ul * tk, qy[i] - uy0 / ul * tk, qx[i] + ux0 / ul * tk, qy[i] + uy0 / ul * tk, 'MASS', keys[min(i, n - 2)] == null ? null : keys[min(i, n - 2)], gid);
      const tdx = ex * td, tdy = ey * td;
      for (let i = 0; i < n - 1; i++) {
        const mx = (qx[i] + qx[i + 1]) / 2, my = (qy[i] + qy[i + 1]) / 2;
        const tw = textBreite(texte[i], groesse, fett);
        const halb = abs(tdx) * tw / 2 + abs(tdy) * groesse / 2;
        const gap = 0.30 * groesse + 1.5;
        this.beweglich(mx + tdx * (halb + gap), my + tdy * (halb + gap), texte[i], tdx, tdy, mx, my, groesse, fett, farbe, keys[i] == null ? null : keys[i], gid, false, i >= optionalAb);
      }
    }
    hinweis(ax, ay, dx, dy, abstand, s, key, farbe, fett, gid, optional) {
      fett = fett == null ? true : fett; gid = gid == null ? this.neueGruppe() : gid;
      const l = hypot(dx, dy), ex = dx / l, ey = dy / l, t = this.t;
      const tw = textBreite(s, t, fett);
      const halb = abs(ex) * tw / 2 + abs(ey) * t / 2;
      this.beweglich(ax + ex * (abstand + halb), ay + ey * (abstand + halb), s, ex, ey, ax, ay, t, fett, farbe || 'TEXT', key, gid, true, optional);
    }

    konflikte(r, gid, belegt) {
      let n = 0;
      if (!(r[0] >= RAND && r[1] >= RAND && r[2] <= this.w - RAND && r[3] <= this.h - RAND)) n += 3;
      for (const b of belegt) if (r[0] < b[2] - ABST && b[0] < r[2] - ABST && r[1] < b[3] - ABST && b[1] < r[3] - ABST) n++;
      for (const s of this.hind) if (s.gid !== gid || gid === 0) { if (rectSchneidetSeg(r, s)) n++; }
      return n;
    }

    fertig() {
      if (this.istFertig) return;
      this.istFertig = true;
      const H = ABST + 0.4;
      const belegt = [];
      for (const e of this.elems) if (e.k === 't' && !e.beweglich) belegt.push(textRect(e));
      const neu = [], fuehrungen = [];
      // Kandidatenraster (einmal): j 0..16, i -9..9, sortiert nach Kosten (stabil wie Kotlin sortBy)
      const kand = [];
      for (let j = 0; j <= 16; j++) for (let i = -9; i <= 9; i++) kand.push([i, j, j * 2.4 + abs(i) * 1.0 + (i < 0 ? 0.01 : 0), kand.length]);
      kand.sort((a, b) => a[2] - b[2] || a[3] - b[3]);
      for (const e of this.elems) {
        if (e.k !== 't' || !e.beweglich) { neu.push(e); continue; }
        const bw = textBreite(e.text, e.groesse, e.fett);
        const sn = e.groesse * 1.0, st = max(bw * 0.5, 6);
        let best = null, bestK = Infinity;
        const r0 = textRect(e);
        let bestRect = r0;
        for (const c of kand) {
          const ox = -e.ty * c[0] * st + e.tx * c[1] * sn;
          const oy = e.tx * c[0] * st + e.ty * c[1] * sn;
          const r = [r0[0] + ox, r0[1] + oy, r0[2] + ox, r0[3] + oy];
          let k = this.konflikte(r, e.gid, belegt);
          if (e.fuehrung || hypot(ox, oy) > 0.9 * e.groesse) {
            const px = min(max(e.ax, r[0] - H), r[2] + H), py = min(max(e.ay, r[1] - H), r[3] + H);
            if (hypot(px - e.ax, py - e.ay) > 2) { const sg = { x1: px, y1: py, x2: e.ax, y2: e.ay, gid: e.gid }; for (const b of belegt) if (rectSchneidetSeg(b, sg)) k++; }
          }
          if (k < bestK) { bestK = k; best = [ox, oy]; bestRect = r; }
          if (k === 0) break;
        }
        if (e.optional && bestK > 0) continue;
        const o = best || [0, 0];
        neu.push(Object.assign({}, e, { x: e.x + o[0], y: e.y + o[1], beweglich: false }));
        belegt.push(bestRect);
        const dist = hypot(o[0], o[1]);
        if (e.fuehrung || dist > 0.9 * e.groesse) {
          const px = min(max(e.ax, bestRect[0] - H), bestRect[2] + H), py = min(max(e.ay, bestRect[1] - H), bestRect[3] + H);
          if (hypot(px - e.ax, py - e.ay) > 2) {
            fuehrungen.push({ k: 'l', x1: px, y1: py, x2: e.ax, y2: e.ay, stift: 'HILFE', key: e.key, gid: e.gid, dick: 1 });
            this.hind.push({ x1: px, y1: py, x2: e.ax, y2: e.ay, gid: e.gid });
          }
        }
      }
      this.elems = neu.concat(fuehrungen);
    }

    kollisionen() {
      const out = [], tx = this.elems.filter(e => e.k === 't');
      for (let i = 0; i < tx.length; i++) {
        const a = tx[i], ra = textRect(a);
        if (!(ra[0] >= RAND && ra[1] >= RAND && ra[2] <= this.w - RAND && ra[3] <= this.h - RAND)) out.push("ausserhalb: '" + a.text + "'");
        for (let j = i + 1; j < tx.length; j++) { const rb = textRect(tx[j]); if (ra[0] < rb[2] - ABST && rb[0] < ra[2] - ABST && ra[1] < rb[3] - ABST && rb[1] < ra[3] - ABST) out.push("Text auf Text: '" + a.text + "' und '" + tx[j].text + "'"); }
        for (const s of this.hind) if ((s.gid !== a.gid || a.gid === 0) && rectSchneidetSeg(ra, s)) { out.push("Text auf Linie: '" + a.text + "'"); break; }
      }
      return out;
    }

    einfuegen(z, dx, dy) {
      const basis = this.gidZaehler + 1;
      this.gidZaehler += z.gidZaehler + 1;
      const g = v => v === 0 ? 0 : v + basis;
      for (const e of z.elems) {
        if (e.k === 'l') this.elems.push(Object.assign({}, e, { x1: e.x1 + dx, y1: e.y1 + dy, x2: e.x2 + dx, y2: e.y2 + dy, gid: g(e.gid) }));
        else if (e.k === 'f') this.elems.push(Object.assign({}, e, { xs: e.xs.map(v => v + dx), ys: e.ys.map(v => v + dy), gid: g(e.gid) }));
        else this.elems.push(Object.assign({}, e, { x: e.x + dx, y: e.y + dy, ax: e.ax + dx, ay: e.ay + dy, gid: g(e.gid), beweglich: false }));
      }
      for (const s of z.hind) this.hind.push({ x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy, gid: g(s.gid) });
      this.istFertig = true;
    }

    treffer(px, py, spiel) {
      let best = null, bestD = Infinity;
      for (const e of this.elems) if (e.k === 't' && e.key != null) {
        const r = textRect(e);
        const dx = max(max(r[0] - px, px - r[2]), 0), dy = max(max(r[1] - py, py - r[3]), 0);
        const d = hypot(dx, dy);
        if (d <= spiel && d < bestD) { bestD = d; best = e.key; }
      }
      return best;
    }

    inhalt() {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      const p = (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
      for (const e of this.elems) {
        if (e.k === 'l') { p(e.x1, e.y1); p(e.x2, e.y2); }
        else if (e.k === 'f') for (let i = 0; i < e.xs.length; i++) p(e.xs[i], e.ys[i]);
        else { const r = textRect(e); p(r[0], r[1]); p(r[2], r[3]); }
      }
      if (x0 > x1) return [0, 0, this.w, this.h];
      return [x0, y0, x1, y1];
    }

    anpassung(bw, bh, rand, maxS) {
      maxS = maxS == null ? 1.7 : maxS;
      const r = this.inhalt();
      const iw = max(1, r[2] - r[0]), ih = max(1, r[3] - r[1]);
      const s = max(0.2, min(maxS, min((bw - 2 * rand) / iw, (bh - 2 * rand) / ih)));
      return [s, (bw - iw * s) / 2 - r[0] * s, (bh - ih * s) / 2 - r[1] * s];
    }

    static mischen(a, b, f) {
      if (!a || f >= 1 || a.elems.length !== b.elems.length || a.w !== b.w || a.h !== b.h) return b;
      for (let i = 0; i < a.elems.length; i++) {
        const p = a.elems[i], q = b.elems[i];
        if (p.k !== q.k) return b;
        if (p.k === 'f' && p.xs.length !== q.xs.length) return b;
      }
      const z = new Zeichnung(b.w, b.h, b.t);
      const l = (x, y) => x + (y - x) * f;
      for (let i = 0; i < a.elems.length; i++) {
        const p = a.elems[i], q = b.elems[i];
        if (p.k === 'l') z.elems.push(Object.assign({}, q, { x1: l(p.x1, q.x1), y1: l(p.y1, q.y1), x2: l(p.x2, q.x2), y2: l(p.y2, q.y2) }));
        else if (p.k === 'f') z.elems.push(Object.assign({}, q, { xs: q.xs.map((v, j) => l(p.xs[j], v)), ys: q.ys.map((v, j) => l(p.ys[j], v)) }));
        else z.elems.push(Object.assign({}, q, { x: l(p.x, q.x), y: l(p.y, q.y) }));
      }
      z.istFertig = true;
      return z;
    }
  }

  // ================================================================ SkizzenBlaetter.kt
  const KD = 0.55, WINKEL = 33 * PI / 180, CX = KD * cos(WINKEL), CY = KD * sin(WINKEL);
  const mm = v => fmtTrim(v, 1);
  class Sb {
    constructor(ox, oy, s) { this.ox = ox; this.oy = oy; this.s = s; }
    x(x, g) { return this.ox + (x + g * CX) * this.s; }
    y(g, z) { return this.oy - (z + g * CY) * this.s; }
    p(x, g, z) { return [this.x(x, g), this.y(g, z)]; }
  }
  const pts = (...p) => { const o = []; for (const q of p) { o.push(q[0], q[1]); } return o; };
  const ptsA = arr => pts(...arr);

  const BESCHR_DE = { aufriss: 'Aufriss', grundriss: 'Grundriss', hinten: 'Hinterstück', vorne: 'Vorderstück', kamin: 'Kamin', achsmass: 'Achsmass', steckung: 'Steckung', rohr: 'Rohr', aufkantung: 'Aufkantung', umschlag: 'Umschlag', ausladung: 'Ausladung', kerbe: 'Kerbe', tiefe: 'Tiefe', hoehe: 'Höhe', zuschnitt: 'Zuschnitt', stutzen: 'Stutzen', neigung: 'Dachneigung', umfang: 'Umfang', naht: 'Naht', loch: 'Loch' };

  function kaminAufriss(k, w, h, t, lb, worte) {
    const z = new Zeichnung(w, h, t);
    const teile = [[k.hinten, lb.hinten, 'ah'], [k.vorne, lb.vorne, 'av']];
    const links = 14, rechts = worte ? 9.2 * t : 3.6 * t + 8, name = 1.9 * t, unten = 18 + 1.7 * t, fest = name + unten + 0.5 * t;
    const tMax = max(k.hinten.tiefe, k.vorne.tiefe);
    const breiteMm = k.breite + tMax * CX;
    const hoeheMm = teile.reduce((a, q) => a + q[0].tiefe * CY + k.aufkantung + k.umschlag, 0);
    const s = max(0.02, min((w - links - rechts) / breiteMm, (h - 2 * fest - 6) / hoeheMm));
    const gesH = hoeheMm * s + 2 * fest;
    let cursor = max(6, (h - gesH) / 2);
    const x0 = links + max(0, (w - links - rechts - breiteMm * s) / 2);
    for (const [p, nm, aKey] of teile) {
      const tt = p.tiefe, kt = k.kerbeTiefe, hm = tt * CY + k.aufkantung, oy = cursor + name + hm * s;
      const sb = new Sb(x0, oy, s);
      const B = k.breite, sl = k.streifenLinks, kb = k.kaminBreite, hh = k.aufkantung, u = k.umschlag, ausl = tt - kt;
      z.text(6, cursor + 0.55 * t, nm + '  ' + mm(B) + ' × ' + mm(tt), t * 1.1, true, -1, 'BLAU');
      const plate = pts(sb.p(0, 0, 0), sb.p(B, 0, 0), sb.p(B, tt, 0), sb.p(sl + kb, tt, 0), sb.p(sl + kb, tt - kt, 0), sb.p(sl, tt - kt, 0), sb.p(sl, tt, 0), sb.p(0, tt, 0));
      z.flaeche(plate, 'BLECH', null);
      if (u > 0) z.flaeche(pts(sb.p(0, 0, 0), sb.p(B, 0, 0), sb.p(B, 0, -max(u, 4 / s)), sb.p(0, 0, -max(u, 4 / s))), 'UMSCHLAG', 'KANTE', 'u');
      const wl = pts(sb.p(sl, tt - kt, 0), sb.p(sl, tt, 0), sb.p(sl, tt, hh), sb.p(sl, tt - kt, hh));
      const wr = pts(sb.p(sl + kb, tt - kt, 0), sb.p(sl + kb, tt, 0), sb.p(sl + kb, tt, hh), sb.p(sl + kb, tt - kt, hh));
      const wv = pts(sb.p(sl, tt - kt, 0), sb.p(sl + kb, tt - kt, 0), sb.p(sl + kb, tt - kt, hh), sb.p(sl, tt - kt, hh));
      z.flaeche(wl, 'AUFKANT2', 'KANTE', 'h'); z.flaeche(wr, 'AUFKANT2', 'KANTE', 'h'); z.flaeche(wv, 'AUFKANT', 'KANTE', 'h');
      const seg = (a, b, st) => z.linie(a[0], a[1], b[0], b[1], st);
      const pp = []; for (let i = 0; i < 8; i++) pp.push([plate[2 * i], plate[2 * i + 1]]);
      seg(pp[0], pp[1], u > 0 ? 'FALZ' : 'KANTE');
      seg(pp[1], pp[2], 'KANTE'); seg(pp[2], pp[3], 'KANTE');
      seg(pp[3], pp[4], 'FALZ'); seg(pp[4], pp[5], 'FALZ'); seg(pp[5], pp[6], 'FALZ');
      seg(pp[6], pp[7], 'KANTE'); seg(pp[7], pp[0], 'KANTE');
      const d = 7 / s;
      z.poly(pts(sb.p(sl, tt - kt + d, 0), sb.p(sl, tt - kt + d, d), sb.p(sl, tt - kt, d)), 'MASS');
      const c0 = sb.p(sl, tt - kt, 0);
      z.hinweis(c0[0], c0[1], -1, 0.15, 3, '90°', null, 'GRAU', false, undefined, true);
      const yb = sb.y(0, -max(u, 4 / s));
      const bx = [0, sl, sl + kb, B].map(v => [sb.x(v, 0), yb]);
      z.kette(bx, 0, 1, 8, [mm(sl), (worte ? lb.kamin + ' ' : '') + mm(kb), mm(k.streifenRechts)], ['sl', 'k', 'sr'], 1, 'TEXT');
      const dp = [0, ausl, tt].map(v => sb.p(B, v, 0));
      z.kette(dp, 1, 0, 10, [(worte ? lb.ausladung + ' ' : '') + mm(ausl), (worte ? lb.kerbe + ' ' : '') + mm(kt)], [aKey, 't'], 1, 'TEXT', undefined, undefined, undefined, undefined, 1);
      const h0 = sb.p(sl + kb, tt, 0), h1 = sb.p(sl + kb, tt, hh);
      z.mass(h0[0], h0[1], h1[0], h1[1], 1, 0, 12, (worte ? lb.aufkantung + ' ' : '') + mm(hh), 'h');
      if (u > 0) {
        const u0 = sb.p(B, 0, 0), u1 = sb.p(B, 0, -max(u, 4 / s));
        z.mass(u0[0], u0[1], u1[0], u1[1], 1, 0, 10, (worte ? lb.umschlag + ' ' : '') + mm(u), 'u', 1, 'AKZENT', undefined, undefined, !worte);
      }
      cursor += name + hm * s + max(u, 4 / s) * s + unten + 0.5 * t;
    }
    z.fertig();
    return z;
  }

  function kaminGrundriss(k, w, h, t, lb) {
    const z = new Zeichnung(w, h, t);
    const lg = 3.4 * t + 10, rg = 3.4 * t + 10, oben = 2.0 * t + 14, unten = 2.0 * t + 14, gap = 12;
    const th = k.hinten.tiefe, tv = k.vorne.tiefe, u = k.umschlag;
    const sx = (w - lg - rg) / k.breite, sy = (h - oben - unten - gap) / (th + tv + 2 * u);
    const s = max(0.02, min(sx, sy));
    const bw = k.breite * s, x0 = lg + (w - lg - rg - bw) / 2;
    const uh = u > 0 ? max(u * s, 3) : 0;
    const gesH = th * s + tv * s + 2 * uh + gap + oben + unten;
    const ytop = max(0, (h - gesH) / 2) + oben, yh0 = ytop + uh, hh = th * s, yv0 = yh0 + hh + gap, hv = tv * s;
    const sl = k.streifenLinks * s, kb = k.kaminBreite * s, kt = k.kerbeTiefe * s;
    const xs1 = x0 + sl, xs2 = x0 + sl + kb, x1 = x0 + bw, aufk = k.aufkantung * s;
    const ph = [x0, yh0, x1, yh0, x1, yh0 + hh, xs2, yh0 + hh, xs2, yh0 + hh - kt, xs1, yh0 + hh - kt, xs1, yh0 + hh, x0, yh0 + hh];
    const pv = [x0, yv0, xs1, yv0, xs1, yv0 + kt, xs2, yv0 + kt, xs2, yv0, x1, yv0, x1, yv0 + hv, x0, yv0 + hv];
    z.flaeche(ph, 'BLECH', null); z.flaeche(pv, 'BLECH', null);
    if (u > 0) { z.rechteck(x0, yh0 - uh, x1, yh0, 'UMSCHLAG', 'KANTE', 'u'); z.rechteck(x0, yv0 + hv, x1, yv0 + hv + uh, 'UMSCHLAG', 'KANTE', 'u'); }
    const a = min(aufk, min(kb / 2, kt));
    z.rechteck(xs1, yh0 + hh - kt, xs2, yh0 + hh - kt + a, 'AUFKANT', null, 'h');
    z.rechteck(xs1, yh0 + hh - kt, xs1 + a, yh0 + hh, 'AUFKANT', null, 'h');
    z.rechteck(xs2 - a, yh0 + hh - kt, xs2, yh0 + hh, 'AUFKANT', null, 'h');
    z.rechteck(xs1, yv0 + kt - a, xs2, yv0 + kt, 'AUFKANT', null, 'h');
    z.rechteck(xs1, yv0, xs1 + a, yv0 + kt, 'AUFKANT', null, 'h');
    z.rechteck(xs2 - a, yv0, xs2, yv0 + kt, 'AUFKANT', null, 'h');
    z.poly(ph, 'KANTE', null, 0, true); z.poly(pv, 'KANTE', null, 0, true);
    z.poly([xs1, yh0 + hh, xs1, yh0 + hh - kt, xs2, yh0 + hh - kt, xs2, yh0 + hh], 'FALZ');
    z.poly([xs1, yv0, xs1, yv0 + kt, xs2, yv0 + kt, xs2, yv0], 'FALZ');
    const ausH = (th - k.kerbeTiefe) * s / 2;
    z.beweglich(x0 + bw / 2, yh0 + ausH, lb.hinten, 0, 1, x0 + bw / 2, yh0 + ausH, t * 1.05, true, 'BLAU', null, 0, false, true);
    const ausV = (tv - k.kerbeTiefe) * s / 2;
    z.beweglich(x0 + bw / 2, yv0 + kt + ausV, lb.vorne, 0, -1, x0 + bw / 2, yv0 + kt + ausV, t * 1.05, true, 'BLAU', null, 0, false, true);
    z.rechteck(xs1, yh0 + hh - kt, xs2, yv0 + kt, 'KEINE', 'MITTEL');
    if (textBreite(lb.kamin, t, false) + 4 <= xs2 - xs1 && t + 6 <= (yv0 + kt) - (yh0 + hh - kt)) z.text((xs1 + xs2) / 2, (yh0 + hh + yv0) / 2, lb.kamin, t, false, 0, 'GRAU');
    const yt = yh0 - uh;
    z.kette([x0, xs1, xs2, x1].map(v => [v, yt]), 0, -1, 8, [mm(k.streifenLinks), mm(k.kaminBreite), mm(k.streifenRechts)], ['sl', 'k', 'sr'], 1);
    const yu = yv0 + hv + uh;
    z.mass(x0, yu, x1, yu, 0, 1, 8, mm(k.breite), null, 1);
    z.mass(x0, yh0, x0, yh0 + hh, -1, 0, 8, mm(th), null, 1);
    z.mass(x0, yv0, x0, yv0 + hv, -1, 0, 8, mm(tv), null, 1);
    z.kette([yh0, yh0 + hh - kt, yh0 + hh].map(v => [x1, v]), 1, 0, 8, [mm(th - k.kerbeTiefe), mm(k.kerbeTiefe)], ['ah', 't'], 1);
    z.kette([yv0, yv0 + kt, yv0 + hv].map(v => [x1, v]), 1, 0, 8, [mm(k.kerbeTiefe), mm(tv - k.kerbeTiefe)], ['t', 'av'], 1);
    if (u > 0) {
      z.mass(x0, yh0 - uh, x0, yh0, -1, 0, 8, mm(u), 'u', 1, 'AKZENT');
      z.mass(x0, yv0 + hv, x0, yv0 + hv + uh, -1, 0, 8, mm(u), 'u', 1, 'AKZENT');
    }
    z.fertig();
    return z;
  }

  function halsAufriss(hs, w, h, t, lb, bild) {
    const z = new Zeichnung(w, h, t);
    const b = hs.bogenGrad * PI / 180, rad = hs.radius;
    const ex = rad * (1 - cos(b)), ey = rad * sin(b);
    const e2x = ex + hs.luecke * sin(b), e2y = ey + hs.luecke * cos(b);
    const endX = e2x + rad * (1 - cos(b)), endY = e2y + rad * sin(b);
    const breiteMm = endX;
    const rand = bild ? 6 : 16 + 1.2 * t, obenR = bild ? 8 : 2.4 * t + 22, untenR = bild ? 8 : 14;
    const hwWunsch = min(22, max(10, w * 0.045));
    const sB = (w - 2 * rand - 3 * hwWunsch) / breiteMm;
    const vl0 = max(rad * 0.8, hs.achsmass * 0.12);
    const hFrei = h - obenR - untenR - 2 * hwWunsch;
    const vl = min(max(vl0, (hFrei / max(sB, 0.02) - endY) / 2), max(vl0, hs.achsmass * 0.45));
    const minY = -vl, maxY = endY + vl;
    const s = max(0.02, min(sB, hFrei / (maxY - minY)));
    const hw = min(hwWunsch, max(4, 0.72 * (rad * s)));
    const gesB = breiteMm * s, ox = (w - gesB) / 2;
    const oy = obenR + hw + 6 - minY * s + max(0, (h - obenR - untenR - 2 * hw - (maxY - minY) * s) / 2);
    const X = v => ox + v * s, Y = v => oy + v * s;
    const n = 30;
    const bogenA = [], bogenB = [];
    for (let i = 0; i <= n; i++) { const a = b * i / n; bogenA.push([X(rad * (1 - cos(a))), Y(rad * sin(a))]); }
    for (let i = 0; i <= n; i++) { const a = b - b * i / n; bogenB.push([X(e2x + rad * (cos(a) - cos(b))), Y(e2y + rad * (sin(b) - sin(a)))]); }
    const kopfA = [X(0), Y(-vl)], fussB = [X(endX), Y(endY + vl)];
    const dxn = sin(b), dyn = cos(b);
    const rohrA = [kopfA].concat(bogenA), rohrB = bogenB.concat([fussB]);
    function band(l, von, bis) {
      const m = l.length, a1 = new Array(2 * m), a2 = new Array(2 * m);
      for (let i = 0; i < m; i++) {
        const p0 = l[max(0, i - 1)], p1 = l[min(m - 1, i + 1)];
        let tx = p1[0] - p0[0], ty = p1[1] - p0[1];
        const tl = hypot(tx, ty); tx /= tl; ty /= tl;
        a1[2 * i] = l[i][0] - ty * von; a1[2 * i + 1] = l[i][1] + tx * von;
        a2[2 * i] = l[i][0] - ty * bis; a2[2 * i + 1] = l[i][1] + tx * bis;
      }
      const all = new Array(4 * m);
      for (let i = 0; i < m; i++) { all[2 * i] = a1[2 * i]; all[2 * i + 1] = a1[2 * i + 1]; }
      for (let i = 0; i < m; i++) { all[2 * (m + i)] = a2[2 * (m - 1 - i)]; all[2 * (m + i) + 1] = a2[2 * (m - 1 - i) + 1]; }
      return all;
    }
    const versch = (l, dx, dy) => l.map(p => [p[0] + dx, p[1] + dy]);
    function rohr(l, halb, grund, dunkel, key) {
      z.flaeche(band(l, halb, -halb), grund, null, key);
      z.flaeche(band(l, -0.34 * halb, -halb), dunkel, null, key);
      z.flaeche(band(l, 0.62 * halb, 0.36 * halb), 'GLANZ', null, key);
      z.flaeche(band(l, halb, -halb), 'KEINE', 'KANTE', key);
    }
    if (!bild) {
      z.linie(X(0), Y(-vl) - 10, X(0), Y(endY + vl) + 8, 'MITTEL');
      z.linie(X(endX), Y(-vl) - 10, X(endX), Y(endY + vl) + 8, 'MITTEL');
    }
    const e1 = bogenA[bogenA.length - 1], e2 = bogenB[0];
    const st = hs.steckung * s;
    const s1 = [e1[0] - dxn * st, e1[1] - dyn * st], s2 = [e2[0] + dxn * st, e2[1] + dyn * st];
    const sx = 0.34 * hw, sy = 0.5 * hw;
    z.flaeche(band(versch(rohrA, sx, sy), hw, -hw), 'SCHATTEN', null);
    z.flaeche(band(versch(rohrB, sx, sy), hw, -hw), 'SCHATTEN', null);
    z.flaeche(band(versch([s1, s2], sx, sy), hw, -hw), 'SCHATTEN', null);
    z.ellipse(fussB[0], fussB[1], hw, hw * 0.38, 'AUFKANT2', 'KANTE');
    rohr([s1, s2], hw, 'BLECH', 'STUTZEN', null);
    rohr(rohrA, hw, 'AUFKANT', 'AUFKANT2', 'r');
    rohr(rohrB, hw, 'AUFKANT', 'AUFKANT2', 'r');
    if (st > 1) {
      const mh = hw * 1.15;
      z.flaeche(band([s1, e1], mh, -mh), 'UMSCHLAG', null, 's');
      z.flaeche(band([s1, e1], 0.62 * mh, 0.4 * mh), 'GLANZ', null, 's');
      z.flaeche(band([e2, s2], mh, -mh), 'UMSCHLAG', null, 's');
      z.flaeche(band([e2, s2], 0.62 * mh, 0.4 * mh), 'GLANZ', null, 's');
      z.flaeche(band([s1, e1], mh, -mh), 'KEINE', 'KANTE', 's');
      z.flaeche(band([e2, s2], mh, -mh), 'KEINE', 'KANTE', 's');
    }
    z.ellipse(kopfA[0], kopfA[1], hw, hw * 0.38, 'BLECH', 'KANTE');
    z.ellipse(kopfA[0], kopfA[1] + hw * 0.04, hw * 0.8, hw * 0.28, 'INNEN', null);
    if (!bild) {
      z.mass(X(0), Y(-vl) - hw * 0.4, X(endX), Y(-vl) - hw * 0.4, 0, -1, 12 + 0.5 * t, lb.achsmass + ' ' + mm(hs.achsmass), 'a', 1);
      const nxu = cos(b), nyu = -sin(b);
      const pk = [s1, e1, e2, s2];
      z.kette(pk, nxu, nyu, hw * 1.15 + 8, [mm(hs.steckung), mm(hs.luecke), mm(hs.steckung)], ['s', 'a', 's'], 1);
      z.mass(s1[0], s1[1], s2[0], s2[1], nxu, nyu, hw * 1.15 + 8 + 2.3 * t + 8, lb.zuschnitt + ' ' + mm(hs.rohrZuschnitt), 's', 1, 'AKZENT');
      const v1 = [X(0), e1[1] - (e1[0] - X(0)) * dyn / dxn];
      const v2 = [X(endX), e2[1] + (X(endX) - e2[0]) * dyn / dxn];
      const ra = min(30, 0.1 * w), deg = hs.bogenGrad;
      z.bogen(v1[0], v1[1], ra, -90, deg - 90, 'MASS');
      z.bogen(v2[0], v2[1], ra, -90, deg - 90, 'MASS');
      const mid = (deg / 2 - 90) * PI / 180, txt = mm(hs.bogenGrad) + '°';
      z.hinweis(v1[0], v1[1], cos(mid), -sin(mid), ra + 2, txt, 'w', 'AKZENT');
      z.hinweis(v2[0], v2[1], cos(mid), -sin(mid), ra + 2, txt, 'w', 'AKZENT', undefined, undefined, true);
      const am = hs.bogenGrad / 2 * PI / 180;
      const pa = [X(rad * (1 - cos(am))), Y(rad * sin(am))];
      z.hinweis(pa[0], pa[1], -cos(am), sin(am), hw + 2, 'R ' + mm(hs.radius), 'r', 'GRAU', false);
    }
    z.fertig();
    return z;
  }

  function halsZuschnitt(hs, w, h, t, lb) {
    const z = new Zeichnung(w, h, t);
    const m = 22, s = (w - 2 * m) / hs.rohrZuschnitt, hb = min(0.26 * h, 26), y0 = h / 2 - hb / 2 + 4;
    const xs = [0, hs.steckung, hs.steckung + hs.luecke, hs.rohrZuschnitt].map(v => m + v * s);
    z.rechteck(xs[0], y0, xs[1], y0 + hb, 'UMSCHLAG', 'KANTE', 's');
    z.rechteck(xs[1], y0, xs[2], y0 + hb, 'BLECH', 'KANTE', 'a');
    z.rechteck(xs[2], y0, xs[3], y0 + hb, 'UMSCHLAG', 'KANTE', 's');
    z.kette(xs.map(v => [v, y0 + hb]), 0, 1, 8, [mm(hs.steckung), mm(hs.luecke), mm(hs.steckung)], ['s', 'a', 's'], 1);
    z.mass(xs[0], y0, xs[3], y0, 0, -1, 8, lb.zuschnitt + ' ' + mm(hs.rohrZuschnitt), 's', 1, 'AKZENT', true, t * 1.2);
    z.fertig();
    return z;
  }

  function dunstAufriss(d, w, h, t, lb, worte, bild) {
    const z = new Zeichnung(w, h, t);
    const n = d.neigung * PI / 180, B = d.breite, T = d.tiefe, r = d.d / 2;
    const gT = T * cos(n), zT = T * sin(n), gc = gT / 2, zc = zT / 2, xc = B / 2;
    const u = d.umschlag, uMm = u > 0 ? u : 0;
    const topZ = max(zT + gT * CY, zc + d.rohrHoehe + (gc + r) * CY);
    const breiteMm = B + gT * CX;
    const links = bild ? 6 : worte ? 8.2 * t + 6 : 3.2 * t + 6;
    const rechts = bild ? 6 : worte ? 9.2 * t : 3.2 * t + 6;
    const untenR = bild ? 8 : 2.0 * t * 2 + 26;
    const obenR = bild ? 8 : 2.2 * t + 8;
    const s = max(0.02, min((w - links - rechts) / breiteMm, (h - obenR - untenR) / (topZ + uMm)));
    const ox = links + max(0, (w - links - rechts - breiteMm * s) / 2);
    const gesH = (topZ + uMm) * s + obenR + untenR;
    const oy = max(0, (h - gesH) / 2) + obenR + topZ * s;
    const sb = new Sb(ox, oy, s);
    const plan = (x, v, zz) => sb.p(x, v * cos(n), v * sin(n) + (zz || 0));
    const sS = d.streifen;
    z.flaeche(pts(plan(0, 0), plan(B, 0), plan(B, T), plan(0, T)), 'BLECH', null);
    z.flaeche(pts(plan(0, 0), plan(sS, 0), plan(sS, T), plan(0, T)), 'AUFKANT', null, 's');
    z.flaeche(pts(plan(B - sS, 0), plan(B, 0), plan(B, T), plan(B - sS, T)), 'AUFKANT', null, 's');
    if (uMm > 0) { const ud = max(uMm, 4 / s); z.flaeche(pts(plan(0, 0), plan(B, 0), plan(B, 0, -ud), plan(0, 0, -ud)), 'UMSCHLAG', 'KANTE', 'u'); }
    z.poly(pts(plan(0, 0), plan(B, 0), plan(B, T), plan(0, T)), 'KANTE', null, 0, true);
    z.linie(plan(sS, 0)[0], plan(sS, 0)[1], plan(sS, T)[0], plan(sS, T)[1], 'FALZ', 's');
    z.linie(plan(B - sS, 0)[0], plan(B - sS, 0)[1], plan(B - sS, T)[0], plan(B - sS, T)[1], 'FALZ', 's');
    if (d.neigung > 0) {
      const q0 = sb.p(B, 0, 0), q1 = sb.p(B, gT, zT), q2 = sb.p(B, gT, 0);
      z.flaeche(pts(q0, q1, q2), 'DACH', 'KANTE', 'n');
      const ra = min(min(26, 0.11 * w), 0.5 * hypot(q1[0] - q0[0], q1[1] - q0[1]));
      const aSl = Math.atan2(q0[1] - q1[1], q1[0] - q0[0]) * 180 / PI;
      const aWa = Math.atan2(q0[1] - q2[1], q2[0] - q0[0]) * 180 / PI;
      if (!bild) z.bogen(q0[0], q0[1], ra, aWa, aSl, 'MASS', 'n');
      const am = (aSl + aWa) / 2 * PI / 180;
      if (!bild) z.hinweis(q0[0], q0[1], cos(am), -sin(am), ra + 2, (worte ? lb.neigung + ' ' : '') + mm(d.neigung) + '°', 'n', 'AKZENT');
    }
    const m = 40;
    const fc = sb.p(xc, gc, zc), kc = sb.p(xc, gc, zc + d.rohrHoehe);
    const rxP = r * s, ryP = rxP * 0.42;
    const fussX = (th, dx) => [fc[0] + rxP * cos(th) + (dx || 0) * s, fc[1] - ryP * sin(th)];
    const fuss = th => fussX(th, 0);
    const kopf = th => [kc[0] + rxP * cos(th), kc[1] - ryP * sin(th)];
    const wurf = min(d.rohrHoehe * 0.32, max(0, (B / 2 - r) * 0.8));
    if (wurf > 0) {
      const sh = [];
      for (let i = 0; i <= m / 2; i++) sh.push(fussX(-PI / 2 + PI * i / (m / 2), wurf));
      for (let i = 0; i <= m / 2; i++) sh.push(fussX(PI / 2 + PI * i / (m / 2)));
      z.flaeche(ptsA(sh), 'SCHATTEN', null);
    }
    z.ellipse(fc[0], fc[1], rxP * 1.16, ryP * 1.2, 'INNEN', 'KANTE');
    function bandD(a0, a1, f) {
      const k = max(2, Math.trunc((a1 - a0) / PI * 14));
      const pl = [];
      for (let i = 0; i <= k; i++) pl.push(fuss(a0 + (a1 - a0) * i / k));
      for (let i = 0; i <= k; i++) pl.push(kopf(a1 - (a1 - a0) * i / k));
      z.flaeche(ptsA(pl), f, null, 'd');
    }
    bandD(PI, 2 * PI, 'ROHR_HELL');
    bandD(1.30 * PI, 1.42 * PI, 'GLANZ');
    bandD(1.46 * PI, 1.70 * PI, 'STUTZEN');
    bandD(1.70 * PI, 2 * PI, 'ROHR_DUNKEL');
    const body = [];
    for (let i = 0; i <= m / 2; i++) body.push(fuss(PI + PI * i / (m / 2)));
    for (let i = 0; i <= m / 2; i++) body.push(kopf(2 * PI - PI * i / (m / 2)));
    z.flaeche(ptsA(body), 'KEINE', 'KANTE', 'd');
    const top = [];
    for (let i = 0; i < m; i++) top.push(kopf(2 * PI * i / m));
    z.flaeche(ptsA(top), 'ROHR_HELL', 'KANTE', 'd');
    const inn = [];
    for (let i = 0; i < m; i++) { const q = kopf(2 * PI * i / m); inn.push([kc[0] + (q[0] - kc[0]) * 0.82, kc[1] + (q[1] - kc[1]) * 0.82 + 0.5]); }
    z.flaeche(ptsA(inn), 'INNEN', null, 'd');
    if (!bild) {
      const c = fuss(PI);
      const dg = -cos(n) * CX, dyDown = sin(n) + cos(n) * CY;
      const ra = min(22, 0.06 * w);
      let a2 = Math.atan2(-dyDown, dg) * 180 / PI; if (a2 < 90) a2 += 360;
      z.bogen(c[0], c[1], ra, 90, a2, 'MASS');
      z.linie(c[0], c[1], c[0], c[1] - ra - 6, 'MASS');
      const ar = a2 * PI / 180; z.linie(c[0], c[1], c[0] + (ra + 6) * cos(ar), c[1] - (ra + 6) * sin(ar), 'MASS');
      const midA = (90 + a2) / 2 * PI / 180;
      z.hinweis(c[0], c[1], cos(midA), -sin(midA), ra + 2, mm(d.fussWinkelHoch) + '°', 'n', 'AKZENT');
      const k0 = kopf(PI), k1 = kopf(0);
      z.mass(k0[0], min(k0[1], k1[1]) - 6, k1[0], min(k0[1], k1[1]) - 6, 0, -1, 10, 'Ø ' + mm(d.d), 'd', 1);
      const f1 = fuss(0);
      z.mass(f1[0], f1[1], k1[0], k1[1], 1, 0, 14, (worte ? lb.hoehe + ' ' : '') + mm(d.rohrHoehe), 'h', 1);
      const t0 = plan(0, 0), t1 = plan(0, T);
      z.mass(t0[0], t0[1], t1[0], t1[1], -1, 0, 10, (worte ? lb.tiefe + ' ' : '') + mm(T), 't', 1);
      const yb = sb.y(0, -max(uMm, uMm > 0 ? 4 / s : 0));
      const bx = [0, sS, B - sS, B].map(v => [sb.x(v, 0), yb]);
      z.kette(bx, 0, 1, 8, [mm(sS), mm(d.mitte), mm(sS)], ['s', 'b', 's'], 1);
      z.mass(bx[0][0], yb, bx[3][0], yb, 0, 1, 8 + 2.0 * t + 6, mm(B), 'b', 1);
      if (uMm > 0) {
        const u0 = plan(B, 0), u1 = plan(B, 0, -max(uMm, 4 / s));
        z.mass(u0[0], u0[1], u1[0], u1[1], 1, 0, 10, (worte ? lb.umschlag + ' ' : '') + mm(uMm), 'u', 1, 'AKZENT');
      }
    }
    z.fertig();
    return z;
  }

  function dunstGrundriss(d, w, h, t, lb) {
    const z = new Zeichnung(w, h, t);
    const lg = 2.2 * t + 14, rg = 3.4 * t + 10, oben = 2.0 * t + 14, unten = 4.0 * t + 22, u = d.umschlag;
    const sx = (w - lg - rg) / d.breite, sy = (h - oben - unten) / (d.tiefe + u);
    const s = max(0.02, min(sx, sy));
    const bw = d.breite * s, th = d.tiefe * s, uh = u > 0 ? max(u * s, 3) : 0;
    const x0 = lg + (w - lg - rg - bw) / 2, y0 = max(0, (h - oben - unten - th - uh) / 2) + oben, ss = d.streifen * s;
    z.rechteck(x0, y0, x0 + bw, y0 + th, 'BLECH', null);
    z.rechteck(x0, y0, x0 + ss, y0 + th, 'AUFKANT', null, 's');
    z.rechteck(x0 + bw - ss, y0, x0 + bw, y0 + th, 'AUFKANT', null, 's');
    if (u > 0) z.rechteck(x0, y0 + th, x0 + bw, y0 + th + uh, 'UMSCHLAG', 'KANTE', 'u');
    z.rechteck(x0, y0, x0 + bw, y0 + th, 'KEINE', 'KANTE');
    z.linie(x0 + ss, y0, x0 + ss, y0 + th, 'FALZ', 's'); z.linie(x0 + bw - ss, y0, x0 + bw - ss, y0 + th, 'FALZ', 's');
    const cx = x0 + bw / 2, cy = y0 + th / 2, rx = d.lochQuer * s / 2, ry = d.lochLaengs * s / 2;
    z.ellipse(cx, cy, rx, ry, 'LOCH', 'KANTE', 'd');
    z.linie(cx - rx - 7, cy, cx - rx, cy, 'MITTEL'); z.linie(cx + rx, cy, cx + rx + 7, cy, 'MITTEL');
    z.linie(cx, cy - ry - 7, cx, cy - ry, 'MITTEL'); z.linie(cx, cy + ry, cx, cy + ry + 7, 'MITTEL');
    const lochTxt = 'Ø ' + mm(d.d);
    if (textBreite(lochTxt, t, true) + 4 <= 2 * rx * 0.9 && t + 2 <= 2 * ry) z.text(cx, cy, lochTxt, t, true, 0, 'TEXT', 'd');
    else z.beweglich(cx, cy + ry + 0.9 * t, lochTxt, 0, 1, cx, cy + ry, t, true, 'TEXT', 'd');
    z.kette([x0, x0 + ss, x0 + bw - ss, x0 + bw].map(v => [v, y0]), 0, -1, 8, [mm(d.streifen), mm(d.mitte), mm(d.streifen)], ['s', 'b', 's'], 1);
    const yu = y0 + th + uh;
    z.mass(x0, yu, x0 + bw, yu, 0, 1, 8, mm(d.breite), 'b', 1);
    z.mass(x0 + bw, y0, x0 + bw, y0 + th, 1, 0, 8, mm(d.tiefe), 't', 1);
    if (u > 0) z.mass(x0, y0 + th, x0, y0 + th + uh, -1, 0, 6, mm(u), 'u', 1, 'AKZENT');
    z.fertig();
    return z;
  }

  function dunstStutzen(d, w, h, t, lb) {
    const z = new Zeichnung(w, h, t);
    const lg = 6, rg = 3.4 * t + 10, oben = 4.6 * t + 22, unten = 12;
    const s = max(0.02, min((w - lg - rg) / d.stutzenBreite, (h - oben - unten) / d.rohrHoehe));
    const bw = d.stutzenBreite * s, hh = d.rohrHoehe * s;
    const x0 = lg + (w - lg - rg - bw) / 2, y0 = max(0, (h - oben - unten - hh) / 2) + oben, xu = x0 + d.umfang * s;
    z.rechteck(x0, y0, xu, y0 + hh, 'STUTZEN', 'KANTE', 'd');
    if (d.naht > 0) z.rechteck(xu, y0, x0 + bw, y0 + hh, 'UMSCHLAG', 'KANTE', 'z');
    if (d.naht > 0) z.linie(xu, y0, xu, y0 + hh, 'FALZ', 'z');
    const p1 = d.naht > 0 ? [x0, xu, x0 + bw] : [x0, x0 + bw];
    const t1 = d.naht > 0 ? [mm(d.umfang), mm(d.naht)] : [mm(d.umfang)];
    z.kette(p1.map(v => [v, y0]), 0, -1, 8, t1, d.naht > 0 ? ['d', 'z'] : ['d'], 1);
    z.mass(x0, y0, x0 + bw, y0, 0, -1, 8 + 2.0 * t + 6, mm(d.stutzenBreite), 'z', 1, 'AKZENT');
    z.mass(x0 + bw, y0, x0 + bw, y0 + hh, 1, 0, 8, mm(d.rohrHoehe), 'h', 1);
    z.fertig();
    return z;
  }

  function abschnittsKopf(z, x, y, titel, t) { z.text(x + 6, y + 0.8 * t, titel.toUpperCase(), t * 0.85, true, -1, 'GRAU'); }
  function kombi(w, h, t, anteil, a, b, bauA, bauB, minB, quer, titelImBild) {
    minB = minB || 0; quer = quer == null ? true : quer;
    const z = new Zeichnung(w, h, t);
    const kopf = titelImBild && !(quer && w > h * 1.25) ? 0 : 1.6 * t;
    if (quer && w > h * 1.25) {
      const wa = w * anteil;
      abschnittsKopf(z, 0, 0, a, t); z.einfuegen(bauA(wa, h - kopf), 0, kopf);
      abschnittsKopf(z, wa, 0, b, t); z.einfuegen(bauB(w - wa, h - kopf), wa, kopf);
    } else {
      const ha = max((h - 2 * kopf) * anteil, 0), hb = max(h - 2 * kopf - ha, minB), ha2 = h - 2 * kopf - hb;
      abschnittsKopf(z, 0, 0, a, t); z.einfuegen(bauA(w, ha2), 0, kopf);
      abschnittsKopf(z, 0, kopf + ha2, b, t); z.einfuegen(bauB(w, hb), 0, 2 * kopf + ha2);
    }
    z.fertig();
    return z;
  }
  const kaminBlatt = (k, w, h, t, lb, worte) => kombi(w, h, t, 0.55, lb.aufriss, lb.grundriss, (ww, hh) => kaminAufriss(k, ww, hh, t, lb, worte), (ww, hh) => kaminGrundriss(k, ww, hh, t, lb));
  const dunstBlatt = (d, w, h, t, lb, worte) => kombi(w, h, t, 0.56, lb.aufriss, lb.grundriss, (ww, hh) => dunstAufriss(d, ww, hh, t, lb, worte), (ww, hh) => dunstGrundriss(d, ww, hh, t, lb), 0, true, true);
  const halsBlatt = (hs, w, h, t, lb) => kombi(w, h, t, 0.76, lb.aufriss, lb.zuschnitt, (ww, hh) => halsAufriss(hs, ww, hh, t, lb), (ww, hh) => halsZuschnitt(hs, ww, hh, t, lb), 6 * t + 20, false);

  // ================================================================ SkizzenRenderer.kt (Canvas 2D)
  const ASC = 0.9277, DESC = 0.2441; // Roboto hhea
  function malen(ctx, z, scale, ox, oy, aktiv, alpha) {
    ox = ox || 0; oy = oy || 0; alpha = alpha == null ? 1 : alpha;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let durchgang = 0; durchgang < 2; durchgang++) for (const e of z.elems) {
      if ((e.k === 't') !== (durchgang === 1)) continue;
      const an = aktiv != null && e.key === aktiv;
      if (e.k === 'f') {
        ctx.beginPath();
        for (let i = 0; i < e.xs.length; i++) { const x = ox + e.xs[i] * scale, y = oy + e.ys[i] * scale; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.closePath();
        const f = FUELL[e.fuell];
        if (f) { ctx.globalAlpha = alpha; ctx.fillStyle = f; ctx.fill(); }
        // Kante der Flaeche: in Kotlin zeichnet die Flaeche selbst keine Kante, die Kante kommt als Linien nur ueber poly(). Hier nur Leuchte.
        if (an) { ctx.setLineDash([]); ctx.strokeStyle = FARBEN.AKZENT; ctx.lineWidth = 2.6 * scale; ctx.globalAlpha = alpha; ctx.stroke(); }
      } else if (e.k === 'l') {
        let farbe, breite;
        switch (e.stift) {
          case 'KANTE': farbe = FARBEN.LINIE; breite = 1.5; break;
          case 'FALZ': farbe = FARBEN.LINIE; breite = 1.1; break;
          case 'MASS': farbe = FARBEN.MASS; breite = 0.8; break;
          case 'HILFE': farbe = FARBEN.HILFE; breite = 0.5; break;
          default: farbe = FARBEN.HILFE; breite = 0.7;
        }
        ctx.strokeStyle = an ? FARBEN.AKZENT : farbe;
        ctx.lineWidth = (an ? breite * 2.2 : breite * e.dick) * scale;
        ctx.setLineDash(e.stift === 'FALZ' ? [4 * scale, 3 * scale] : e.stift === 'MITTEL' ? [10 * scale, 2 * scale, 2 * scale, 2 * scale] : []);
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.moveTo(ox + e.x1 * scale, oy + e.y1 * scale); ctx.lineTo(ox + e.x2 * scale, oy + e.y2 * scale); ctx.stroke();
      } else {
        ctx.setLineDash([]);
        ctx.font = (e.fett ? '700 ' : '400 ') + (e.groesse * scale) + 'px Roboto, sans-serif';
        const r = textRect(e);
        const bw = ctx.measureText(e.text).width;
        const links = e.ausr === -1 ? r[0] : e.ausr === 1 ? r[2] - bw / scale : (r[0] + r[2]) / 2 - bw / scale / 2;
        const by = oy + e.y * scale + (ASC - DESC) / 2 * e.groesse * scale;
        if (e.farbe !== 'WEISS') {
          ctx.globalAlpha = (an ? 70 : 215) / 255 * alpha;
          ctx.fillStyle = an ? FARBEN.AKZENT : '#FFFFFF';
          const x1 = ox + links * scale - 2 * scale, y1 = oy + r[1] * scale, ww = bw + 4 * scale, hh = (r[3] - r[1]) * scale, rr = 3 * scale;
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x1, y1, ww, hh, rr) : ctx.rect(x1, y1, ww, hh); ctx.fill();
        }
        ctx.globalAlpha = alpha; ctx.fillStyle = TEXTFARBE[e.farbe]; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
        ctx.fillText(e.text, ox + links * scale, by);
      }
    }
    ctx.restore();
  }

  root.Ze = { Zeichnung, Stift, Fuell, TFarbe, FARBEN, FUELL, Fmt, fmt, fmtTrim, parseNum, textBreite, textRect, BESCHR_DE,
    kaminAufriss, kaminGrundriss, halsAufriss, halsZuschnitt, dunstAufriss, dunstGrundriss, dunstStutzen, kaminBlatt, dunstBlatt, halsBlatt, malen, CX, CY };
  if (typeof module !== 'undefined') module.exports = root.Ze;
})(typeof window !== 'undefined' ? window : globalThis);
