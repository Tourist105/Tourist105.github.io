/* Spengler-Web: Kamin alt. Port von KaminActivity.kt (oberflaeche, d3KarteBauen, aktualisiere), Skizze.kt (Zeichner, FeldSkizze),
 * Zugaben.kt, kern/BlechTeil.kt und kern/Modell.kt (Modell.aus). Gleiche Mathematik wie Android, Zeichnung nach Canvas 2D. */
(function (root) {
  'use strict';
  const S = root.S, K = root.Kern, h = S.h, T = S.T, Ze = root.Ze, fmtTrim = Ze.fmtTrim, fmt = Ze.fmt, E = () => S.Einheit;
  const PI = Math.PI, cos = Math.cos, sin = Math.sin, min = Math.min, max = Math.max, tan = Math.tan;
  const WS = () => K.WERKSTOFFE;

  // ================================================================ kern/BlechTeil.kt
  function klemme(p, lim, kleiner) {
    const innen = q => kleiner ? q[1] <= lim + 1e-12 : q[1] >= lim - 1e-12, out = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length], ia = innen(a), ib = innen(b);
      if (ia) out.push(a);
      if (ia !== ib) { const t = (lim - a[1]) / (b[1] - a[1]); out.push([a[0] + t * (b[0] - a[0]), lim]); }
    }
    return out;
  }
  function BlechTeil(flach, falzY) {
    const ys = flach.map(q => q[1]), xs = flach.map(q => q[0]);
    const o = { flach, falzY, laenge: max(...ys) - min(...ys), breite: max(...xs) - min(...xs) };
    o.falten = f => {
      if (falzY <= 0 || falzY >= o.laenge) return [{ punkte: flach.map(q => [q[0], q[1] - falzY, 0]), aufkantung: false }];
      const w = min(1, max(0, f)) * PI / 2, unten = klemme(flach, falzY, true), oben = klemme(flach, falzY, false), out = [];
      if (unten.length >= 3) out.push({ punkte: unten.map(q => [q[0], -(falzY - q[1]) * cos(w), (falzY - q[1]) * sin(w)]), aufkantung: true });
      if (oben.length >= 3) out.push({ punkte: oben.map(q => [q[0], q[1] - falzY, 0]), aufkantung: false });
      return out;
    };
    return o;
  }
  const rechteck = (b, l, falzY) => BlechTeil([[-b / 2, 0], [b / 2, 0], [b / 2, l], [-b / 2, l]], falzY);
  const dreieck = (b, l) => BlechTeil([[-b / 2, 0], [b / 2, 0], [-b / 2, l]], 0);

  // ================================================================ kern/Modell.kt (Kamin-Altmodell)
  const Pose = (x, y, z, phi) => ({ x, y, z, phi, abbilden: p => { const c = cos(phi), s = sin(phi); return [x + p[0] * c - p[1] * s, y + p[0] * s + p[1] * c, z + p[2]]; } });
  const mischePose = (a, b, t) => { let d = b.phi - a.phi; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI; return Pose(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t, a.phi + d * t); };
  const faltGrad = s => s >= 0.5 ? min(1, max(0, (s - 0.5) * 2)) : 0;
  const ortGrad = s => { if (s >= 0.5) return 0; const p = min(1, max(0, 1 - s / 0.5)); return p * p * (3 - 2 * p); };
  const AUSEIN_CM = 25, SPALT = 12, ABSTAND = 0.15, NOTBREITE = 50;
  const aufFuer = (e, art) => { const v = art === 'VORDERTEIL' ? e.aufV : art === 'SEITENTEIL' ? e.aufS : (art === 'HINTERTEIL' || art === 'KEHLE') ? e.aufH : null; return v == null ? e.auf : v; };
  const norm3 = v => { const l = Math.hypot(v[0], v[1], v[2]); return l === 0 ? v : [v[0] / l, v[1] / l, v[2] / l]; };
  function profil(bo, bu, laenge, falzY, versatz) {
    const vers = min(max(versatz, 0), max(0, laenge - falzY - 0.5));
    return BlechTeil([[-bo / 2, 0], [bo / 2, 0], [bu / 2, laenge], [-bu / 2, laenge - vers]], falzY);
  }
  function modellAus(e, r) {
    if (e.art.typ !== 'KAMIN' || !r.zeilen.length) return null;
    const w = e.werte, v = k => w[k] || 0;
    const kb = [v('vbo'), v('hb'), v('vbu')].find(x => x > 0) || NOTBREITE, kt = v('sb') > 0 ? v('sb') : NOTBREITE;
    const kamin = { breite: kb, tiefe: kt, hoehe: 2 * max(e.auf, 5) };
    const roh = [], hinzu = (z, b, p, weg) => roh.push({ zeile: z, blech: b, pose: p, weg: norm3(weg) });
    for (const z of r.zeilen) {
      const t = z.teil, l = z.laenge, b = z.breite, n = max(1, Math.trunc(t.stueck));
      switch (t.art) {
        case 'VORDERTEIL': {
          const konisch = t.form === 'KONISCH', zb = b - t.breite, bo = konisch ? t.bo + zb : b, bu = konisch ? t.bu + zb : b;
          for (let k = 0; k < n; k++) {
            const bl = profil(bo, bu, l, aufFuer(e, 'VORDERTEIL'), t.versatz || 0);
            if (k === 0) hinzu(z, bl, Pose(0, -ABSTAND, 0, PI), [0, -1, 0.3]); else hinzu(z, bl, Pose(0, kt + ABSTAND, 0, 0), [0, 1, 0.3]);
          }
          break;
        }
        case 'HINTERTEIL': hinzu(z, profil(b, b, l, aufFuer(e, 'HINTERTEIL'), t.versatz || 0), Pose(0, kt + ABSTAND, 0, 0), [0, 1, 0.3]); break;
        case 'SEITENTEIL':
          for (let k = 0; k < n; k++) {
            const bl = rechteck(b, l, aufFuer(e, 'SEITENTEIL'));
            if (k === 0) hinzu(z, bl, Pose(kb / 2 + ABSTAND, kt / 2, 0, -PI / 2), [1, 0, 0.3]); else hinzu(z, bl, Pose(-kb / 2 - ABSTAND, kt / 2, 0, PI / 2), [-1, 0, 0.3]);
          }
          break;
        case 'SATTEL':
          for (let k = 0; k < n; k++) { const x0 = k === 0 ? -kb / 4 : kb / 4; hinzu(z, dreieck(b, l), Pose(x0, kt + 0.6, 0.45, 0), [k === 0 ? -0.4 : 0.4, 0.6, 1]); }
          break;
        case 'KEHLE': hinzu(z, rechteck(b, l, 0), Pose(-l / 2, kt + 0.6 + b / 2, 0.9, -PI / 2), [0, 0.6, 1]); break;
        default: break;
      }
    }
    if (!roh.length) return null;
    let total = -SPALT; for (const x of roh) total += x.blech.breite + SPALT;
    let cursor = -total / 2; const ins = [];
    for (const x of roh) {
      const cx = cursor + x.blech.breite / 2; cursor += x.blech.breite + SPALT;
      ins.push({ art: x.zeile.teil.art, zeile: x.zeile, blech: x.blech, montiert: x.pose, flach: Pose(cx, max(x.blech.falzY, 0), 0, 0), weg: x.weg });
    }
    const WF = root.Szene3D.WF;
    return {
      instanzen: ins, kamin, lattenmass: e.lm > 0 ? e.lm : 0, anzahl: ins.length, art: i => ins[i].art,
      flaechen(s, ausein) {
        const falz = faltGrad(s), ort = ortGrad(s), out = [];
        ins.forEach((x, i) => {
          const pose = mischePose(x.montiert, x.flach, ort), k = (ausein || 0) * AUSEIN_CM * (1 - ort), vv = [x.weg[0] * k, x.weg[1] * k, x.weg[2] * k];
          for (const f of x.blech.falten(falz)) out.push(WF(f.punkte.map(p => { const q = pose.abbilden(p); return [q[0] + vv[0], q[1] + vv[1], q[2] + vv[2]]; }), i, x.art, f.aufkantung));
        });
        return out;
      }
    };
  }

  // ================================================================ Zugaben.kt
  const NEIGUNG_MAX = 85, AUF_VORNE_VORSCHLAG = 10, AUF_SEITE_VORSCHLAG = 10, AUF_HINTEN_VORSCHLAG = 15, MAX_GRAD = 75, KAMIN_MAX_CM = 400, ROLLE_LAENGE = 100000;
  const neigungOderNull = g => g != null && g > 0 && g <= NEIGUNG_MAX ? g : null;
  function loeseZugaben(neigung, ueb, aufV, aufS, aufH, aufAllg, aufAllgEigen) {
    const n = neigungOderNull(neigung);
    const auf = (eingabe, vorschlag) => eingabe != null ? { cm: eingabe, herkunft: 'EINGEGEBEN' } : (n != null && !aufAllgEigen) ? { cm: vorschlag, herkunft: 'VORSCHLAG' } : aufAllgEigen ? { cm: aufAllg, herkunft: 'EINGEGEBEN' } : { cm: aufAllg, herkunft: 'STANDARD' };
    const u = ueb != null ? { cm: ueb, herkunft: 'EINGEGEBEN' } : n != null ? { cm: K.ueberlappVorschlag(n), herkunft: 'VORSCHLAG' } : { cm: K.UEBERLAPP_STANDARD, herkunft: 'STANDARD' };
    return { ueberlapp: u, aufVorne: auf(aufV, n != null ? K.aufVorneSeitlichVorschlag(n) : AUF_VORNE_VORSCHLAG), aufSeite: auf(aufS, n != null ? K.aufVorneSeitlichVorschlag(n) : AUF_SEITE_VORSCHLAG), aufHinten: auf(aufH, AUF_HINTEN_VORSCHLAG) };
  }
  function rolleRechnen(zeilen, rollenbreite, vsp) {
    let lauf = 0; const zuGross = [];
    for (const z of zeilen) {
      let best = Infinity;
      for (const [quer, run] of [[z.breite, z.laenge], [z.laenge, z.breite]]) {
        if (rollenbreite <= 0 || quer > rollenbreite + 1e-9 || quer <= 0) continue;
        const nebeneinander = max(Math.floor(rollenbreite / quer + 1e-9), 1), reihen = Math.ceil(z.teil.stueck / nebeneinander);
        best = min(best, reihen * run);
      }
      if (best === Infinity) zuGross.push(z.teil.art); else lauf += best;
    }
    return { laufCm: lauf, laufCmVerschnitt: lauf * (1 + vsp / 100), zuGross };
  }
  const versatzAusGrad = (grad, breite) => breite <= 0 || grad <= 0 ? 0 : breite * tan(min(grad, MAX_GRAD) * PI / 180);
  const erwarteteTeile = a => a.typ === 'KAMIN' ? ['VORDERTEIL', 'SEITENTEIL'].concat(a.keinHinten ? [] : ['HINTERTEIL'].concat(a.sattel ? ['SATTEL'] : [], a.kehle ? ['KEHLE'] : [])) : a.typ === 'RUND' ? ['MANSCHETTE', 'GRUNDBLECH'] : [a.stufe ? 'STUFE' : 'WAND'];
  const TEILNAME = { VORDERTEIL: 't_vorderteil', SEITENTEIL: 't_seitenteil', HINTERTEIL: 't_hinterteil', SATTEL: 't_sattel', KEHLE: 't_kehle', MANSCHETTE: 't_manschette', GRUNDBLECH: 't_grundblech', WAND: 't_wand', STUFE: 't_stufe' };
  const teilName = a => T(TEILNAME[a]);
  S.teilNameKamin = teilName;

  // ================================================================ Skizze.kt (Zeichner)
  const BLAU = '#0B5CAB', GRUEN = '#188246', LEICHT = '#EAF1FA', LEICHT_GRUEN = '#D6F0DE', BEIGE = '#F2EFE9', ROT = '#B03020', ORANGE = '#B26A12', GRAU = '#5D666F', SCHWARZ = '#000';
  const BREITE = 620, FELD_B = 84, FELD_H = 56, LATTEN_H = 165, ZEILEN_H = 205;
  const FONT = '"Roboto", sans-serif';
  const anim = (p, von, bis) => min(1, max(0, (p - von) / (bis - von)));

  class Zeichner {
    constructor() { this.art = K.ARTEN[0]; this.werte = {}; this.eIdx = 0; this.schrGrad = true; this.auf = 15; this.zug = null; this.fertig = new Set(); this.fortschritt = 1; this.puls = {}; }
    mit(cm) { return E().mit(this.eIdx, cm); }
    seitenZeilen() { const l = []; if (!this.art.keinHinten) l.push(['HINTERTEIL', T('t_hinterteil')]); l.push(['SEITENTEIL', T('t_seitenteil')]); l.push(['VORDERTEIL', T('t_vorderteil')]); return l; }
    hoehe(seite) { return seite ? LATTEN_H + this.seitenZeilen().length * ZEILEN_H + 34 : this.art.typ === 'KAMIN' ? 612 : this.art.typ === 'RUND' ? 500 : 480; }
    felder(seite) {
      const l = [], a = this.art, f = (k, x, y) => l.push({ key: k, caption: T('f_' + k), x, y });
      if (seite) {
        if (a.typ !== 'KAMIN') return l;
        f('lm', 210, 130);
        this.seitenZeilen().forEach(([teil], i) => {
          const y = LATTEN_H + i * ZEILEN_H + 164;
          if (teil === 'HINTERTEIL') f('hl', 340, y); else if (teil === 'SEITENTEIL') f('sl', 310, y); else { f('vz', 170, y); f('vk', 440, y); }
        });
        return l;
      }
      if (a.typ === 'KAMIN') {
        if (!a.keinHinten) { f('hb', 330, 68); f('sh', 545, 180); }
        f('sb', 95, 262); f('vbo', 330, 380); f('vbu', 330, 548); f('sv', 545, 410);
      } else if (a.typ === 'RUND') { f('rd', 330, 250); f('rh', 545, 250); f('gl', 85, 250); f('gb', 330, 428); }
      else { f('wl', 270, 400); f('wb', 540, 220); f('wa', 540, 340); }
      return l;
    }
    hint(k) { return (k === 'sh' || k === 'sv') ? (this.schrGrad ? 'Grad' : E().liste[this.eIdx].kurz) : k === 'wa' ? 'Stk' : E().liste[this.eIdx].kurz; }
    aufText(t) {
      const z = this.zug; if (!z) return T('sk_aufk') + ' ' + this.mit(this.auf);
      const w = t === 'HINTERTEIL' ? z.aufHinten : t === 'SEITENTEIL' ? z.aufSeite : z.aufVorne;
      return T('sk_aufk') + ' ' + this.mit(w.cm) + (w.herkunft === 'VORSCHLAG' ? ' ' + T('sk_vorschlag_klammer') : '');
    }
    ueberText() {
      const z = this.zug; if (!z) return T('sk_ueberlapp', this.mit(K.UEBERLAPP_STANDARD));
      const u = z.ueberlapp; return T(u.herkunft === 'VORSCHLAG' ? 'sk_ueberlapp_vorschlag' : u.herkunft === 'EINGEGEBEN' ? 'sk_ueberlapp_eigen' : 'sk_ueberlapp', this.mit(u.cm));
    }
    wertF(k) { return this.werte[k] || 0; }
    schrVisuell(k, breite) {
      const v = this.wertF(k); if (v <= 0) return 0;
      const versatz = this.schrGrad ? versatzAusGrad(v, max(breite, 1)) : v;
      return min(30, max(6, versatz / max(breite, 1) * 200));
    }

    // ---- Canvas-Helfer (Paint-Nachbau)
    _stift(c, farbe, breite, alpha) { c.strokeStyle = farbe; c.lineWidth = breite; c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = alpha == null ? 1 : alpha; c.setLineDash([]); }
    _pfad(c, pts, geschlossen) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); if (geschlossen) c.closePath(); }
    _rand(c, pts, geschlossen) {
      if (this.fortschritt >= 1) { this._pfad(c, pts, geschlossen); c.stroke(); return; }
      const p = geschlossen ? pts.concat([pts[0]]) : pts; let rest = 0, len = 0;
      for (let i = 1; i < p.length; i++) len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      rest = len * anim(this.fortschritt, 0, 0.8);
      c.beginPath(); c.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < p.length && rest > 0; i++) {
        const dl = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
        if (rest >= dl) { c.lineTo(p[i][0], p[i][1]); rest -= dl; } else { const t = rest / dl; c.lineTo(p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t); rest = 0; }
      }
      c.stroke();
    }
    _pulsRand(c, pts, geschlossen, teil, breite) {
      const t = this.puls[teil]; if (t == null || t >= 1) return;
      this._stift(c, GRUEN, breite + 16 * t, (150 * (1 - t)) / 255); this._pfad(c, pts, geschlossen); c.stroke(); c.globalAlpha = 1;
    }
    _form(c, pts, teil, stroke) {
      stroke = stroke || 3;
      const ok = teil != null && this.fertig.has(teil);
      c.globalAlpha = anim(this.fortschritt, 0.45, 1); c.fillStyle = ok ? LEICHT_GRUEN : LEICHT; this._pfad(c, pts, true); c.fill(); c.globalAlpha = 1;
      this._stift(c, ok ? GRUEN : BLAU, stroke); this._rand(c, pts, true);
      if (teil) this._pulsRand(c, pts, true, teil, stroke);
    }
    _text(c, t, x, y, farbe, left, klein) {
      c.font = (klein ? '400 17px ' : '700 21px ') + FONT; c.fillStyle = farbe || SCHWARZ; c.textAlign = left ? 'left' : 'center'; c.textBaseline = 'alphabetic'; c.fillText(t, x, y);
    }
    _dimH(c, x1, x2, y, farbe) {
      this._stift(c, farbe || ROT, 1.6);
      c.beginPath();
      c.moveTo(x1, y); c.lineTo(x2, y); c.moveTo(x1, y - 7); c.lineTo(x1, y + 7); c.moveTo(x2, y - 7); c.lineTo(x2, y + 7);
      c.moveTo(x1, y); c.lineTo(x1 + 9, y - 5); c.moveTo(x1, y); c.lineTo(x1 + 9, y + 5); c.moveTo(x2, y); c.lineTo(x2 - 9, y - 5); c.moveTo(x2, y); c.lineTo(x2 - 9, y + 5);
      c.stroke();
    }
    _linie(c, x1, y1, x2, y2, farbe, breite) { this._stift(c, farbe, breite); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
    _rechteck(c, x1, y1, x2, y2, fuell, rand, breite) { if (fuell) { c.fillStyle = fuell; c.fillRect(x1, y1, x2 - x1, y2 - y1); } if (rand) { this._stift(c, rand, breite); c.strokeRect(x1, y1, x2 - x1, y2 - y1); } }
    _leader(c, x1, y, x2) { this._linie(c, x1, y, x2, y, GRAU, 1.3); }

    zeichne(c, seite, breitePx, dpd) {
      const sc = breitePx / BREITE;
      c.save(); c.scale(sc, sc);
      if (seite) this.seitenAnsicht(c); else this.draufsicht(c);
      c.restore();
      c.globalAlpha = 1;
      for (const f of this.felder(seite)) {
        const oben = f.y * sc - FELD_H * dpd / 2, x = f.x * sc, y = oben - 4 * dpd;
        c.font = '700 ' + 11 * dpd + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        c.lineJoin = 'miter'; c.miterLimit = 4; c.lineWidth = 3.5 * dpd; c.strokeStyle = '#fff'; c.setLineDash([]); c.strokeText(f.caption, x, y);
        c.fillStyle = SCHWARZ; c.fillText(f.caption, x, y);
      }
    }

    seitenAnsicht(c) {
      this._linie(c, 20, 40, 600, 40, GRAU, 3);
      for (const x of [120, 300, 480]) c.fillStyle = 'rgb(160,120,70)', c.fillRect(x - 6, 12, 12, 28);
      this._dimH(c, 120, 300, 56);
      this._text(c, T('sk_latten'), 540, 32, GRAU, false, true);
      this.seitenZeilen().forEach(([teil, titel], i) => {
        const y0 = LATTEN_H + i * ZEILEN_H, ok = this.fertig.has(teil), farbe = ok ? GRUEN : BLAU;
        this._text(c, titel.toUpperCase(), 14, y0 + 26, farbe, true);
        const prof = [[40, y0 + 40], [40, y0 + 90], [580, y0 + 90]];
        this._stift(c, farbe, 4); this._rand(c, prof, false); this._pulsRand(c, prof, false, teil, 4);
        this._text(c, this.aufText(teil), 52, y0 + 62, SCHWARZ, true, true);
        if (teil === 'HINTERTEIL') {
          if (!this.art.keinUeberlapp) {
            this._linie(c, 40, y0 + 90, 100, y0 + 90, ORANGE, 7);
            this._dimH(c, 40, 100, y0 + 104, ORANGE);
            this._text(c, this.ueberText(), 70, y0 + 128, ORANGE, false, true);
          }
          this._dimH(c, this.art.keinUeberlapp ? 40 : 100, 580, y0 + 104);
        } else if (teil === 'SEITENTEIL') this._dimH(c, 40, 580, y0 + 104);
        else {
          this._dimH(c, 40, 300, y0 + 104, ROT); this._dimH(c, 300, 580, y0 + 104, ORANGE);
          c.globalAlpha = 1; c.fillStyle = SCHWARZ; c.beginPath(); c.arc(300, y0 + 90, 6, 0, 2 * PI); c.fill();
          this._text(c, '+', 305, y0 + 182, SCHWARZ, false, false);
          this._linie(c, 580, y0 + 90, 580, y0 + 74, farbe, 4);
        }
      });
      this._text(c, T('sk_zugaben'), 310, this.hoehe(true) - 2, GRAU, false, true);
    }

    draufsicht(c) { if (this.art.typ === 'KAMIN') this.draufKamin(c); else if (this.art.typ === 'RUND') this.draufRund(c); else this.draufWand(c); }

    draufKamin(c) {
      const bo = this.wertF('vbo'), bu = this.wertF('vbu'), mx = max(bo, bu, 1), wo = bo !== 0 ? 130 * bo / mx : 130, wu = bu !== 0 ? 130 * bu / mx : 130, a = this.art, fe = t => this.fertig.has(t) ? GRUEN : BLAU;
      c.globalAlpha = 1;
      this._rechteck(c, 250, 210, 410, 310, BEIGE, '#000', 2.2);
      this._text(c, T('sk_kamin'), 330, 268);
      this._form(c, [[200, 210], [250, 210], [250, 310], [200, 310]], 'SEITENTEIL');
      if (!a.eineSeite) this._form(c, [[410, 210], [460, 210], [460, 310], [410, 310]], 'SEITENTEIL');
      else { this._linie(c, 410, 205, 410, 315, '#000', 5); this._text(c, T('sk_mauer'), 440, 268, GRAU, true, true); }
      if (!a.keinHinten) {
        const off = this.schrVisuell('sh', this.wertF('hb'));
        this._form(c, [[200, 150], [460, 150 - off], [460, 210], [200, 210]], 'HINTERTEIL', 3.4);
        if (off > 0) this.schraegeBezug(c, 200, 150, 460, 150 - off, 168);
        this._text(c, T('t_hinterteil').toUpperCase(), 330, 198, fe('HINTERTEIL'));
        this._dimH(c, 200, 460, 112); this._leader(c, 460, 180, 487);
      }
      const offV = this.schrVisuell('sv', max(bo, bu));
      this._form(c, [[330 - wo, 310], [330 + wo, 310], [330 + wu, 440 + offV], [330 - wu, 440]], 'VORDERTEIL', 3.4);
      if (offV > 0) this.schraegeBezug(c, 330 - wu, 440, 330 + wu, 440 + offV, 464);
      this._text(c, T('t_vorderteil').toUpperCase(), 100, 380, fe('VORDERTEIL'));
      this._dimH(c, 330 - wu, 330 + wu, 490); this._leader(c, 330 + wu - 4, 410, 487);
      this._leader(c, 127, 262, 200);
      if (a.sattel) this._text(c, T('sk_sattel_hinweis'), 310, 604, GRAU, false, true);
      if (a.kehle) this._text(c, T('sk_kehle_hinweis'), 310, 604, GRAU, false, true);
      this._text(c, T('sk_first'), 14, 22, GRAU, true, true);
      this._text(c, T('sk_traufe'), 14, 582, GRAU, true, true);
    }
    schraegeBezug(c, x1, y1, x2, y2, textY) {
      this._stift(c, ORANGE, 1.6); c.setLineDash([7, 6]); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y1); c.stroke(); c.setLineDash([]);
      const r = 56, w = Math.atan2(y2 - y1, x2 - x1) * 180 / PI, start = min(0, w), sweep = max(Math.abs(w), 10);
      this._stift(c, ORANGE, 2); c.beginPath(); c.arc(x1, y1, r, start * PI / 180, (start + sweep) * PI / 180); c.stroke();
      this._text(c, T('sk_schr_bezug'), x1 + 6, textY, ORANGE, true, true);
    }
    draufRund(c) {
      this._form(c, [[200, 130], [460, 130], [460, 340], [200, 340]], 'GRUNDBLECH');
      c.globalAlpha = 1; c.fillStyle = BEIGE; c.beginPath(); c.arc(330, 235, 70, 0, 2 * PI); c.fill();
      this._stift(c, '#000', 2.2); c.beginPath(); c.arc(330, 235, 70, 0, 2 * PI); c.stroke();
      this._text(c, T('t_grundblech').toUpperCase(), 330, 160, this.fertig.has('GRUNDBLECH') ? GRUEN : BLAU);
      this._dimH(c, 200, 460, 360); this._leader(c, 470, 250, 515); this._leader(c, 138, 250, 200);
      this._text(c, T('t_manschette') + ': ' + T('sk_umfang'), 310, 492, GRAU, false, true);
    }
    draufWand(c) {
      c.globalAlpha = 1; this._rechteck(c, 90, 110, 450, 150, 'rgb(226,222,214)', '#000', 2.2);
      this._text(c, T('sk_mauer').toUpperCase(), 270, 137);
      const teil = this.art.stufe ? 'STUFE' : 'WAND';
      this._form(c, [[90, 150], [450, 150], [450, 290], [90, 290]], teil);
      this._text(c, T(this.art.stufe ? 't_stufe' : 't_wand').toUpperCase(), 270, 228, this.fertig.has(teil) ? GRUEN : BLAU);
      this._dimH(c, 90, 450, 312); this._leader(c, 450, 220, 482); this._leader(c, 450, 340, 482);
    }
  }

  // ================================================================ Skizze.kt (FeldSkizze)
  function FeldSkizze(z, seite, holeText, aenderung) {
    const box = h('div', { class: 'fskizze' }), cv = h('canvas', { 'aria-hidden': 'true' }); box.append(cv);
    const felder = {}, st = { setzt: false, fehler: new Set() }; let liste = [];
    box.beiFokus = () => { };
    function layout() {
      const w = box.clientWidth; if (!(w > 0)) return;
      const sc = w / BREITE, hh = Math.trunc(w * z.hoehe(seite) / BREITE);
      box.style.height = hh + 'px';
      for (const f of liste) { const e = felder[f.key]; e.style.left = Math.trunc(f.x * sc) - Math.trunc(FELD_B / 2) + 'px'; e.style.top = Math.trunc(f.y * sc) - Math.trunc(FELD_H / 2) + 'px'; }
      zeichneNeu();
    }
    function zeichneNeu() {
      const w = box.clientWidth; if (!(w > 0)) return;
      const hh = Math.trunc(w * z.hoehe(seite) / BREITE), dpr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hh * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr); }
      cv.style.height = hh + 'px';
      const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = '#fff'; c.fillRect(0, 0, w, hh); z.zeichne(c, seite, w, 1);
    }
    box.neuAufbauen = () => {
      for (const k in felder) { felder[k].remove(); delete felder[k]; }
      st.fehler.clear(); liste = z.felder(seite);
      liste.forEach((f, i) => {
        const e = h('input', { type: 'text', inputmode: 'decimal', enterkeyhint: i === liste.length - 1 ? 'done' : 'next', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off', 'aria-label': f.caption, placeholder: z.hint(f.key), class: 'fsfeld' });
        st.setzt = true; e.value = holeText(f.key); st.setzt = false;
        e.addEventListener('input', () => { if (!st.setzt) aenderung(f.key, e.value); });
        e.addEventListener('focus', () => { setTimeout(() => { try { e.select(); } catch (x) { /* */ } }, 0); box.beiFokus(f.key); });
        e.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); const n = felder[(liste[i + 1] || {}).key]; if (n) n.focus(); else e.blur(); } });
        felder[f.key] = e; box.append(e);
      });
      layout();
    };
    box.markiereFehler = keys => { for (const k in felder) felder[k].classList.toggle('fehler', keys.has(k)); };
    box.setzeText = (k, t) => { const e = felder[k]; if (!e || e.value === t) return; st.setzt = true; e.value = t; st.setzt = false; };
    box.zeichneNeu = zeichneNeu; box.layout = layout;
    box.ersterFeld = () => felder[(liste[0] || {}).key]; box.letztesFeld = () => felder[(liste[liste.length - 1] || {}).key];
    box.hint = () => { for (const f of liste) felder[f.key].placeholder = z.hint(f.key); };
    box.ro = new ResizeObserver(() => layout()); box.ro.observe(box);
    box.neuAufbauen();
    return box;
  }

  // ================================================================ Seite

  const BEISPIEL = { hb: 60, hl: 40, sl: 50, sb: 55, vbo: 65, vbu: 70, vz: 30, vk: 25 };
  const GLOBAL_LAENGE = ['g_auf', 'g_zl', 'g_zb', 'g_tb', 'g_tl', 'g_rb', 'g_aufv', 'g_aufs', 'g_aufh', 'g_ueb'];
  const datumHeute = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear(); };

  /** Szene fuer die Menuekachel "Kamin alt": das echte Modell mit den Beispielmassen. */
  root.KaminAltSzene = function () {
    const art = K.ARTEN[0], w = WS()[0], e0 = { werte: Object.assign({}, BEISPIEL), auf: 15, zl: 3, zb: 3, vsp: 10, tb: 100, tl: 200, dicke: w.dicken[S.dickeStandard(0)], werkstoff: w, art, lm: 0, schrV: 0, schrH: 0, schrGrad: false };
    const z = loeseZugaben(null, null, null, null, null, 15, false), e = Object.assign(e0, { ueberlapp: z.ueberlapp.cm, aufV: z.aufVorne.cm, aufS: z.aufSeite.cm, aufH: z.aufHinten.cm });
    return modellAus(e, K.rechnenKamin(e));
  };

  S.seiteKaminAlt = function (opt) {
    const mt = S.mt, grau = S.grau, text = S.text, quer = S.vp.quer;
    const eingabe = {}, st = { mat: 0, dicke: 1, art: 0, einheit: 0, grad: true, tab: 0, mehr: false };
    try { const j = JSON.parse(S.lies('kamin.state')); if (j) { Object.assign(eingabe, j.eingabe || {}); st.mat = j.mat | 0; st.dicke = j.dicke == null ? 1 : j.dicke; st.art = j.art | 0; st.einheit = j.einheit | 0; st.grad = j.grad !== false; st.tab = j.tab | 0; } } catch (e) { /* frisch */ }
    if (opt.modus === '3d') st.tab = 2; else if (opt.modus === 'oben') st.tab = 0; else if (opt.modus === 'seite') st.tab = 1;
    if (opt.mehr != null) st.mehr = opt.mehr;
    const wv = opt.werte || {};     // Testzustaende per Adresse: ?beispiel=1&art=6&f_vbo=65
    if (wv.art != null) st.art = +wv.art || 0;
    if (wv.beispiel === '1') for (const k in BEISPIEL) eingabe['f_' + k] = E().text(st.einheit, BEISPIEL[k]);
    for (const k in wv) if (k.startsWith('f_') || k.startsWith('g_')) eingabe[k] = wv[k];
    st.mat = min(WS().length - 1, max(0, st.mat)); st.art = min(K.ARTEN.length - 1, max(0, st.art)); st.dicke = min(WS()[st.mat].dicken.length - 1, max(0, st.dicke)); st.einheit = min(2, max(0, st.einheit)); st.tab = min(2, max(0, st.tab));
    const einheit = () => st.einheit, eu = () => E().liste[st.einheit];
    for (const [k, v] of [['g_auf', '15'], ['g_zl', '3'], ['g_zb', '3'], ['g_vsp', '10'], ['g_tb', '100'], ['g_tl', '200'], ['g_latten', '1']]) if (eingabe[k] == null) eingabe[k] = (k === 'g_vsp' || k === 'g_latten') ? v : E().text(einheit(), +v);
    if (eingabe.g_rb == null) eingabe.g_rb = E().text(einheit(), 60);
    if (eingabe.g_lief == null) eingabe.g_lief = '0';
    if (eingabe.o_datum == null) eingabe.o_datum = datumHeute();
    const speichere = () => S.schreibe('kamin.state', JSON.stringify({ eingabe, mat: st.mat, dicke: st.dicke, art: st.art, einheit: st.einheit, grad: st.grad, tab: st.tab }));
    const zahl = k => { if (eingabe[k] == null) return null; return S.parseNum(eingabe[k]); };
    const cm = k => { const v = zahl(k); return v == null ? 0 : E().zuCm(einheit(), v); };
    const cmOderNull = k => { const v = zahl(k); return v == null ? null : E().zuCm(einheit(), v); };
    const lieferform = () => min(3, max(0, parseInt(eingabe.g_lief || '0', 10) || 0));
    const aufAllgemeinEigen = () => eingabe.g_auf_eigen === '1' || Math.abs(cm('g_auf') - 15) > 0.05;
    const zeichner = new Zeichner(); zeichner.eIdx = st.einheit;     // nur noch fuer das Werkstattblatt (PDF)
    let zugAktuell = loeseZugaben(null, null, null, null, null, 15, false), letzte = null, letzteRolle = null, fehlerAktiv = false, letztesLive = null;
    const globale = {}, felder = {};
    const art = () => K.ARTEN[st.art], istKamin = () => art().typ === 'KAMIN';

    // ---- Live-3D im Kopf
    const teilZuFeld = k => ({ hl: 'HINTERTEIL', hb: 'HINTERTEIL', sh: 'HINTERTEIL', sl: 'SEITENTEIL', sb: 'SEITENTEIL', vz: 'VORDERTEIL', vk: 'VORDERTEIL', vbo: 'VORDERTEIL', vbu: 'VORDERTEIL', sv: 'VORDERTEIL', rd: 'MANSCHETTE', rh: 'MANSCHETTE', gl: 'GRUNDBLECH', gb: 'GRUNDBLECH', wl: 'WAND', wb: 'WAND', wa: 'WAND' })[k] || null;
    let liveTimer = null, fokusKey = null;
    const liveAus = () => { live.wahl = null; live.masseAn = false; live.zeichnen(); };
    const hebeHervor = k => { live.wahl = teilZuFeld(k); live.masseAn = true; live.zeichnen(); clearTimeout(liveTimer); if (fokusKey !== k) liveTimer = setTimeout(liveAus, 2500); };

    // ---- Kopf: Reiter, Skizze, 3D, Hauptfelder
    const karte = h('div', { class: 'skkarte' });
    const cv2 = h('canvas', { 'aria-label': T('ss_live') }); karte.append(cv2);
    const view = new S.SkizzenAnsicht(cv2); view.arten = [2, 1, 0];
    const cv3 = h('canvas', { 'aria-label': T('d3_rohr_beschreibung') }); karte.append(cv3);
    const live = new root.Szene3D.Ansicht3D(cv3); live.leerText = T('d3_leer'); live.fuellend = true; live.grundZoom = 0.95; live.grundstellung(0.6, 0.55);
    live.beschriftung = i => { const m = live.szene; return m && m.instanzen ? E().text(einheit(), m.instanzen[i].zeile.laenge) + ' x ' + E().text(einheit(), m.instanzen[i].zeile.breite) + ' ' + eu().kurz : ''; };
    const kippGross = h('button', { class: 'kippgross', 'aria-label': T('ss_tipp'), onclick: () => vollbild() }, S.iconVollbild());
    if (!quer) karte.append(kippGross);
    const namen = [T('ka_tab_oben'), T('ka_tab_seite'), T('ansicht_3d')];
    const chips = namen.map((n, i) => h('button', { class: 'chip', text: n, onclick: () => waehleTab(i) }));
    const pdfKnopf = h('button', { class: 'pdfknopf', text: T('ss_ansehen'), onclick: () => pdfErstellen() });
    const reiter = h('div', { class: 'reiterzeile' }, chips, pdfKnopf);
    const titel = h('h1', { class: 'sktitel' }, h('span', { text: T('ablauf_kamin') }));
    const titelSpan = titel.firstChild; S.autosizeTitel(titelSpan, 22, 16); titelSpan.style.display = 'block'; titelSpan.style.overflow = 'hidden'; titelSpan.style.width = '100%'; titelSpan.style.fontSize = '22px';
    if (S.opt.kopf === 'alt') { titel.style.height = '44px'; titel.style.alignItems = 'flex-start'; titel.style.lineHeight = '1.34'; }
    const primBox = h('div', { class: 'primbox' }), primReihe = h('div', { class: 'primreihe' }), extraBox = h('div', {});
    if (quer) primBox.style.cssText = 'padding:0;margin:0';
    const kopf = h('div', { class: 'skkopf' }, quer ? null : titel, reiter, karte, quer ? null : primBox);

    // ---- Leiste
    const leisteLabel = h('div', { class: 'll' }), leisteWert = h('div', { class: 'lw' });
    const teilenKnopf = h('button', { class: 'teilen', text: T('ss_blatt_teilen'), onclick: () => blattTeilen() });
    const leiste = h('div', { class: 'leiste' }, h('div', { class: 'lt' }, leisteLabel, leisteWert), teilenKnopf);
    S.autosize(leisteWert, 16, 26);
    let angezeigt = NaN, zaehlStopp = null;
    function zaehleHoch(ziel, tx) {
      const von = isNaN(angezeigt) ? ziel : angezeigt;
      if (zaehlStopp) zaehlStopp();
      if (von === ziel) { angezeigt = ziel; leisteWert.textContent = tx(ziel); leisteWert.style.transform = ''; return; }
      zaehlStopp = S.anim(320, S.decel, (e, t) => { const x = von + (ziel - von) * t; angezeigt = x; leisteWert.textContent = tx(x); const sc = 1 + 0.05 * (1 - Math.abs(2 * t - 1)); leisteWert.style.transform = 'scale(' + sc + ')'; },
        () => { angezeigt = ziel; leisteWert.textContent = tx(ziel); leisteWert.style.transform = ''; });
    }

    // ---- 3D-Karte im Inhalt
    const cvD3 = h('canvas', { 'aria-label': T('d3_rohr_beschreibung') }), d3Box = h('div', { style: { position: 'relative', width: '100%' } }, cvD3);
    cvD3.style.cssText = 'display:block;width:100%;height:100%';
    const d3 = new root.Szene3D.Ansicht3D(cvD3); d3.leerText = T('d3_leer'); d3.grundstellung(0.6, 0.55); d3.beschriftung = live.beschriftung = (i => { const m = d3.szene || live.szene; return m && m.instanzen ? E().text(einheit(), m.instanzen[i].zeile.laenge) + ' x ' + E().text(einheit(), m.instanzen[i].zeile.breite) + ' ' + eu().kurz : ''; });
    if (S.lies('d3.gedreht') !== 'true') d3.hinweis = T('d3_hinweis');
    d3.beiDrehen = () => { if (d3.hinweis) { d3.hinweis = null; S.schreibe('d3.gedreht', 'true'); } };
    const d3k = S.d3Karte({ d3, canvasBox: d3Box, grund: () => [0.6, 0.55], niedrig: 0.28, annahme: T('d3_annahme'), groesse: () => d3Groesse(), beschreibung: () => d3Beschreibung() });
    const d3Groesse = () => {
      const w = d3Box.clientWidth || 338, voll = max(260, min(w, 320)), flach = min(1, max(0, 1 - faltGrad(d3.regler))), hh = Math.trunc(voll * (1 - 0.4 * flach));
      d3Box.style.height = hh + 'px'; d3.setzeGroesse(w, hh, window.devicePixelRatio || 1);
    };
    d3.beiWahl = a => { d3.wahl = a; chipsZeichnen(); d3Beschreibung(); d3.zeichnen(); };
    let chipsFuer = [];
    const chipsZeichnen = () => {
      d3k.chipsBox.innerHTML = '';
      const chip = (label, an, onClick) => d3k.chipsBox.append(h('button', { class: 'chipk' + (an ? ' an' : ''), text: label, onclick: onClick }));
      chip(T('d3_alle'), d3.wahl == null, () => d3.beiWahl(null));
      for (const a of chipsFuer) chip(teilName(a), d3.wahl === a, () => d3.beiWahl(d3.wahl === a ? null : a));
    };
    const d3Beschreibung = () => {
      const r = letzte; if (!r || !r.zeilen.length) { d3k.text.textContent = T('d3_leer'); return; }
      const flach = d3.regler < 0.02, wahl = d3.wahl; let t;
      if (wahl == null) t = T('d3_summe', fmtTrim(r.stueck, 0), fmt(r.m2, 2));
      else {
        const z = r.zeilen.find(q => q.teil.art === wahl), auf = (wahl === 'SATTEL' || wahl === 'KEHLE') ? 0 : aufFuer(eingaben(), wahl), kz = eu().kurz;
        t = auf > 0 ? T('d3_teil_auf', teilName(wahl), fmtTrim(z.teil.stueck, 0), E().text(einheit(), z.laenge), E().text(einheit(), z.breite), E().text(einheit(), auf), E().text(einheit(), z.laenge - auf), kz)
          : T('d3_teil_flach', teilName(wahl), fmtTrim(z.teil.stueck, 0), E().text(einheit(), z.laenge), E().text(einheit(), z.breite), kz);
      }
      d3k.text.textContent = flach ? t + '\n' + T('d3_abwicklung') : t;
    };

    // ---- Felder
    const FELDER_KAMIN = () => { const a = art(), l = [['vbo', 'f_vbo'], ['sb', 'f_sb']]; if (!a.keinHinten) l.push(['hl', 'f_hl'], ['hb', 'f_hb']); else l.push(['vz', 'f_vz']); l.push(['sl', 'f_sl']); if (!a.keinHinten) l.push(['vz', 'f_vz']); l.push(['vk', 'f_vk'], ['vbu', 'f_vbu']); if (!a.keinHinten) l.push(['sh', 'f_sh']); l.push(['sv', 'f_sv'], ['lm', 'f_lm']); return l; };
    const feldListe = () => { const t = art().typ; return t === 'KAMIN' ? FELDER_KAMIN() : t === 'RUND' ? [['rd', 'f_rd'], ['gl', 'f_gl'], ['gb', 'f_gb'], ['rh', 'f_rh']] : [['wl', 'f_wl'], ['wb', 'f_wb'], ['wa', 'f_wa']]; };
    const feldEinheit = k => k === 'wa' ? 'Stk' : ((k === 'sh' || k === 'sv') && st.grad) ? 'Grad' : eu().kurz;
    const feldLabel = (k, res) => T(res) + ' (' + feldEinheit(k) + ')';
    const kaminFeld = (k, res) => {
      const f = S.feld(feldLabel(k, res), eingabe['f_' + k] || '', { onChange: v => { eingabe['f_' + k] = v; hebeHervor(k); aktualisiere(true); }, onFokus: an => fokus(k, an) });
      f._res = res; f.input.placeholder = feldEinheit(k); if (k === 'wa') f.input.setAttribute('inputmode', 'numeric'); felder[k] = f; return f;
    };
    function felderNeu() {
      for (const k in felder) delete felder[k];
      primReihe.innerHTML = ''; extraBox.innerHTML = '';
      const fl = feldListe();
      fl.slice(0, 3).forEach(([k, r]) => primReihe.append(kaminFeld(k, r)));
      const extra = fl.slice(3);
      for (let i = 0; i < extra.length; i += 2) {
        const a = kaminFeld(extra[i][0], extra[i][1]);
        extraBox.append(h('div', { style: { marginTop: '6px' } }, i + 1 < extra.length ? S.zweispalt(a, kaminFeld(extra[i + 1][0], extra[i + 1][1])) : a));
      }
    }
    const tabZuFeld = k => ['lm', 'vz', 'vk', 'g_ueb', 'g_auf'].includes(k) ? 1 : ['hb', 'sb', 'vbo', 'vbu', 'sh', 'sv'].includes(k) ? 0 : null;
    function fokus(k, an) {
      if (!an) { if (fokusKey === k) { fokusKey = null; clearTimeout(liveTimer); liveTimer = setTimeout(liveAus, 900); } if (view.aktiv === k) view.aktiv = null; return; }
      fokusKey = k; hebeHervor(k); view.aktiv = k;
      const z = tabZuFeld(k); if (istKamin() && z != null && st.tab !== 2 && st.tab !== z) waehleTab(z);
    }
    function fokusiere(key) {
      const f = felder[key] || globale[key]; if (!f) return;
      const unter = !!globale[key] || feldListe().findIndex(q => q[0] === key) >= 3;
      if (!st.mehr && unter) setzeMehr(true);
      f.input.focus();
    }
    view.beiMass = fokusiere; view.beiLeerTipp = () => vollbild();
    view.feldFuer = k => { const f = felder[k]; return f && f.input ? f.input : null; };
    function vollbild() { const a = st.tab; S.vollbildZeigen((w, hh) => view.zeichnungMit(a, w, hh), view.aktiv); }
    function waehleTab(i) {
      if (!istKamin()) i = 0;
      st.tab = i; const an3 = i === 2;
      cv3.style.display = an3 ? '' : 'none'; cv2.style.visibility = an3 ? 'hidden' : 'visible';
      kippGross.style.display = an3 || quer ? 'none' : '';
      chips.forEach((b, k) => b.classList.toggle('an', k === i));
      if (!an3) { view.ansicht = i; view.baue(false); } else live.zeichnen();
      speichere();
    }
    function tabsAnwenden() {
      const kamin = istKamin();
      chips[1].style.display = kamin ? '' : 'none'; chips[2].style.display = kamin ? '' : 'none';
      schrBox.style.display = kamin ? '' : 'none'; latteBox.style.display = kamin ? '' : 'none'; d3k.karte.style.display = kamin ? '' : 'none';
      artInfo.textContent = S.TA('art_info')[st.art];
      schrHinweis.textContent = T(st.grad ? 'schr_hinweis_grad' : 'schr_hinweis_versatz');
      waehleTab(kamin ? st.tab : 0);
    }

    // ---- Karten im Inhalt
    const warn = S.warnband(T('warn_preview'), 16);
    const beispielKnopf = S.knopf(T('beispiel_einsetzen'), false, () => { for (const k in BEISPIEL) eingabe['f_' + k] = E().text(einheit(), BEISPIEL[k]); speichere(); felderNeu(); aktualisiere(false); });
    const artInfo = text('', 14); artInfo.style.color = 'var(--text2)';
    const leerText = text('', 15, true); leerText.style.color = 'rgb(140,90,0)'; leerText.style.display = 'none';
    const spArt = S.waehler(S.TA('arten'), st.art, i => { if (i !== st.art) { st.art = i; felderNeu(); tabsAnwenden(); aktualisiere(false); } }); spArt.setAttribute('aria-label', T('l_art'));
    primBox.append(spArt, S.primHinweis(primReihe), primReihe); spArt.style.marginBottom = '6px';
    const mehrKnopf = h('button', { class: 'mehrknopf' }), mehrBox = h('div', {});
    function setzeMehr(an) {
      st.mehr = an; mehrBox.style.display = an ? '' : 'none';
      const kz = T(an ? 'ss_weniger' : 'ss_mehr'), info = T('ka_mehr_info');
      mehrKnopf.innerHTML = ''; mehrKnopf.append(h('b', {}, S.dreieck(an), kz), h('small', { text: info })); mehrKnopf.setAttribute('aria-label', kz + ', ' + info);
    }
    mehrKnopf.addEventListener('click', () => setzeMehr(!st.mehr));
    const einheitSeg = S.segment(E().liste.map((x, i) => i === 2 ? T('u_zoll') : x.kurz), st.einheit, n => einheitWechseln(n));
    const schrSeg = S.segment([T('schr_grad'), T('schr_versatz')], st.grad ? 0 : 1, i => {
      st.grad = i === 0; delete eingabe.f_sh; delete eingabe.f_sv;
      for (const k of ['sh', 'sv']) { const f = felder[k]; if (f) { f.lab.textContent = feldLabel(k, f._res); f.input.placeholder = feldEinheit(k); f.input.value = ''; } }
      schrHinweis.textContent = T(st.grad ? 'schr_hinweis_grad' : 'schr_hinweis_versatz'); aktualisiere(false);
    });
    const schrHinweis = text('', 14);
    const schrBox = h('div', {}, text(T('schr_titel'), 16, true), mt(schrSeg, 6), mt(schrHinweis, 6));
    const cb = h('input', { type: 'checkbox' }); cb.checked = eingabe.g_latten !== '0'; cb.addEventListener('change', () => { eingabe.g_latten = cb.checked ? '1' : '0'; aktualisiere(true); });
    const latteBox = h('div', {}, h('label', { class: 'haken' }, cb, h('span', { text: T('latten_auf') })), text(T('latten_info'), 14));
    const masseKarte = S.karte(text(T('l_einheit'), 16, true), einheitSeg, extraBox, grau(T('kamin_masse_hinweis'), 14), mt(schrBox, 12), mt(latteBox, 8));
    mehrBox.append(masseKarte);

    const lab = (k, res) => k === 'g_vsp' ? T(res) : T(res) + ' (' + eu().kurz + ')';
    const globalFeld = (k, res) => {
      const f = S.feld(lab(k, res), eingabe[k] == null ? '' : eingabe[k], { onChange: v => { eingabe[k] = v; if (k === 'g_auf' && document.activeElement === f.input) eingabe.g_auf_eigen = '1'; aktualisiere(true); }, onFokus: an => fokus(k, an) });
      f._res = res; globale[k] = f; return f;
    };
    const spMat = S.waehler(S.TA('werkstoffe'), st.mat, i => { if (i !== st.mat) { st.mat = i; st.dicke = S.dickeStandard(i); fuelleDicken(); aktualisiere(false); } });
    const spDicke = S.waehler(S.dickenTexte(st.mat), S.dickenReihenfolge(st.mat).indexOf(st.dicke), p => { const idx = S.dickenReihenfolge(st.mat)[p]; if (idx != null && idx !== st.dicke) { st.dicke = idx; sonderInfoZeigen(); aktualisiere(false); } });
    const dickeInfo = text(T('dicke_sonder_info'), 14);
    const fuelleDicken = () => { S.waehlerFuelle(spDicke, S.dickenTexte(st.mat), S.dickenReihenfolge(st.mat).indexOf(st.dicke)); sonderInfoZeigen(); };
    const sonderInfoZeigen = () => { dickeInfo.style.display = S.dickenTexte(st.mat)[S.dickenReihenfolge(st.mat).indexOf(st.dicke)].includes(T('dicke_sonder')) ? '' : 'none'; };
    const spLief = S.waehler(S.TA('lieferformen'), lieferform(), pos => { if (pos !== lieferform()) liefWechseln(pos); });
    const liefInfo = text('', 14);
    const tafelZeile = S.zweispalt(globalFeld('g_tb', 'l_tb'), globalFeld('g_tl', 'l_tl')), rolleZeile = globalFeld('g_rb', 'l_rb');
    const ortF = S.feld(T('o_ort'), eingabe.o_ort || '', { text: true, onChange: v => { eingabe.o_ort = v; speichere(); } }); ortF.input.placeholder = T('hint_ort');
    const nrF = S.feld(T('o_nr'), eingabe.o_nr || '', { text: true, onChange: v => { eingabe.o_nr = v; speichere(); } }); nrF.input.placeholder = T('hint_nr');
    const datF = S.feld(T('o_datum'), eingabe.o_datum, { text: true, onChange: v => { eingabe.o_datum = v; speichere(); } });
    const matKarte = S.karte(ortF, S.zweispalt(nrF, datF), text(T('l_material'), 16, true), spMat, text(T('l_dicke'), 16, true), spDicke, dickeInfo, text(T('l_lief'), 16, true), spLief, tafelZeile, rolleZeile, liefInfo);
    const spDeck = S.waehler(S.TA('deckungen'), min(2, max(0, parseInt(eingabe.g_deck || '0', 10) || 0)), pos => { eingabe.g_deck = String(pos); aktualisiere(false); });
    const neigFeld = S.feld(T('l_neig'), eingabe.g_neig || '', { onChange: v => { eingabe.g_neig = v; aktualisiere(true); } });
    const dachVorschlag = text('', 14), deckInfo = text(T('deck_eben_info'), 14);
    const dachKarte = S.karte(text(T('dach_titel'), 18, true), neigFeld, text(T('l_deck'), 16, true), spDeck, text(T('dach_info'), 14), dachVorschlag, deckInfo);
    const zugKarte = S.karte(text(T('zugaben_titel'), 18, true), S.zweispalt(globalFeld('g_auf', 'l_auf'), globalFeld('g_zl', 'l_zl')), S.zweispalt(globalFeld('g_zb', 'l_zb'), globalFeld('g_vsp', 'l_vsp')),
      S.zweispalt(globalFeld('g_aufv', 'l_auf_v'), globalFeld('g_aufs', 'l_auf_s')), S.zweispalt(globalFeld('g_aufh', 'l_auf_h'), globalFeld('g_ueb', 'l_ueb')), text(T('zug_opt_info'), 14), text(T('annahme_text'), 14));
    mehrBox.append(mt(dachKarte, 10), mt(zugKarte, 10));
    const tabelle = text('', 16), kpi = text('', 18, true), warnOut = text('', 16, true);
    tabelle.style.whiteSpace = 'pre-wrap'; kpi.style.whiteSpace = 'pre-line'; warnOut.style.whiteSpace = 'pre-line'; warnOut.style.color = 'var(--fehler)';
    const zuschnitt = S.karte(text(T('h_zuschnitt'), 22, true), tabelle, kpi, warnOut);
    const status = text('', 16); status.style.minHeight = '19px';
    const leeren = S.knopf(T('btn_leeren'), false, () => leerenFragen());

    const inh = h('div', { class: 'skinhalt' });
    if (quer) inh.append(S.karte(text(T('ka_masse'), 18, true), primBox));
    inh.append(mt(warn, quer ? 4 : 0), mt(artInfo, 6), mt(leerText, 6), mt(beispielKnopf, 8),
      mt(S.karte(text(T('an_karte_kamin'), 18, true), grau(T('an_karte_kamin_info'), 15), S.knopf(T('an_karte_knopf'), false, () => S.gehe('annahmen'))), 8),
      mt(mehrKnopf, 8), mt(mehrBox, 6), mt(matKarte, 10), mt(zuschnitt, 10), mt(d3k.karte, 10), mt(S.rmKarte('kamin', T('kamin_titel'), () => snapshot()), 12),
      mt(S.knopf(T('btn_teilen'), false, () => teilen()), 8), mt(leeren, 8), mt(status, 6));
    const scroll = h('div', { class: 'skscroll' }, inh);
    const el = h('div', { class: 'sk' + (quer ? ' quer' : '') });
    const hoch = !quer && S.kopfScrollt();
    if (quer) el.append(kopf, h('div', { class: 'skrechts' }, scroll, leiste)); else if (hoch) { scroll.prepend(kopf); el.append(scroll, leiste); } else el.append(kopf, scroll, leiste);

    function einheitWechseln(neu) {
      const alt = st.einheit; st.einheit = neu;
      for (const k of Object.keys(eingabe)) {
        const laenge = (k.startsWith('f_') && k !== 'f_wa' && !(st.grad && (k === 'f_sh' || k === 'f_sv'))) || GLOBAL_LAENGE.includes(k);
        if (laenge) eingabe[k] = E().umrechnen(alt, neu, eingabe[k] || '');
      }
      for (const k in globale) { const f = globale[k]; f.lab.textContent = lab(k, f._res); const t = eingabe[k] == null ? '' : eingabe[k]; if (f.input.value !== t) f.input.value = t; }
      for (const k in felder) { const f = felder[k]; f.lab.textContent = feldLabel(k, f._res); f.input.placeholder = feldEinheit(k); const t = eingabe['f_' + k] || ''; if (f.input.value !== t) f.input.value = t; }
      aktualisiere(false);
    }
    function liefWechseln(neu) {
      const alt = lieferform();
      if (neu === 2 && alt >= 0 && alt <= 1) { eingabe.g_tb = E().text(einheit(), 100); eingabe.g_tl = E().text(einheit(), alt === 0 ? 200 : 300); for (const k of ['g_tb', 'g_tl']) globale[k].input.value = eingabe[k]; }
      eingabe.g_lief = String(neu); liefSichtbar(); aktualisiere(false);
    }
    function liefSichtbar() { const l = lieferform(); tafelZeile.style.display = l === 2 ? '' : 'none'; rolleZeile.style.display = l === 3 ? '' : 'none'; liefInfo.textContent = T(l === 3 ? 'rolle_info' : 'lief_info'); }

    // ---- Rechnung (unveraendert gegenueber dem alten Aufbau)
    function eingaben() {
      const werte = {};
      for (const k of Object.keys(eingabe)) {
        if (!k.startsWith('f_')) continue;
        const n = S.parseNum(eingabe[k]) || 0, key = k.slice(2);
        werte[key] = key === 'wa' ? n : ((key === 'sh' || key === 'sv') && st.grad) ? n : E().zuCm(einheit(), n);
      }
      const w = WS()[st.mat]; let tb, tl;
      switch (lieferform()) { case 0: tb = 100; tl = 200; break; case 1: tb = 100; tl = 300; break; case 3: tb = cm('g_rb') || 60; tl = ROLLE_LAENGE; break; default: tb = cm('g_tb') || 100; tl = cm('g_tl') || 200; }
      zugAktuell = loeseZugaben(zahl('g_neig'), cmOderNull('g_ueb'), cmOderNull('g_aufv'), cmOderNull('g_aufs'), cmOderNull('g_aufh'), cm('g_auf'), aufAllgemeinEigen());
      const latten = eingabe.g_latten !== '0';
      return { werte, auf: cm('g_auf'), zl: cm('g_zl'), zb: cm('g_zb'), vsp: zahl('g_vsp') || 0, tb, tl, dicke: w.dicken[st.dicke], werkstoff: w, art: K.ARTEN[st.art], lm: latten ? (werte.lm || 0) : 0, schrV: werte.sv || 0, schrH: werte.sh || 0, schrGrad: st.grad,
        ueberlapp: zugAktuell.ueberlapp.cm, aufV: zugAktuell.aufVorne.cm, aufS: zugAktuell.aufSeite.cm, aufH: zugAktuell.aufHinten.cm };
    }
    const deckung = () => eingabe.g_deck === '1' ? 1 : eingabe.g_deck === '2' ? 2 : 0;
    const leereFelder = e => {
      if (e.art.typ !== 'KAMIN') return []; const l = [], leer = k => (e.werte[k] || 0) === 0;
      if (leer('sv')) l.push(T('f_sv')); if (!e.art.keinHinten && leer('sh')) l.push(T('f_sh')); if (eingabe.g_latten !== '0' && leer('lm')) l.push(T('f_lm')); return l;
    };
    function dachTexte(z) {
      const roh = eingabe.g_neig || '', n = neigungOderNull(zahl('g_neig')), mit = c => E().mit(einheit(), c);
      if (roh.trim() && n == null) { dachVorschlag.textContent = T('dach_ungueltig'); dachVorschlag.style.color = 'var(--fehler)'; }
      else if (n != null) {
        let t = T('dach_vorschlag', fmtTrim(n, 1), mit(K.ueberlappVorschlag(n)), mit(K.aufVorneSeitlichVorschlag(n)), mit(K.aufVorneSeitlichVorschlag(n)), mit(AUF_HINTEN_VORSCHLAG));
        if (z.aufVorne.herkunft !== 'VORSCHLAG' && aufAllgemeinEigen()) t += ' ' + T('dach_auf_eigen');
        dachVorschlag.textContent = t; dachVorschlag.style.color = 'var(--text2)';
      } else dachVorschlag.textContent = '';
      dachVorschlag.style.display = dachVorschlag.textContent ? '' : 'none';
      deckInfo.style.display = deckung() === 2 ? '' : 'none';
      const hinweis = (k, w, vorgabe) => { const e = globale[k] && globale[k].input; if (!e) return; e.placeholder = w.herkunft === 'VORSCHLAG' ? T('hint_vorschlag', mit(w.cm)) : vorgabe; e.classList.toggle('vorschlag', w.herkunft === 'VORSCHLAG'); };
      const wieAllg = T('hint_wie_allg');
      hinweis('g_aufv', z.aufVorne, wieAllg); hinweis('g_aufs', z.aufSeite, wieAllg); hinweis('g_aufh', z.aufHinten, wieAllg); hinweis('g_ueb', z.ueberlapp, T('hint_vorgabe', mit(K.UEBERLAPP_STANDARD)));
    }
    function kaminMeldung(key, t, winkel, prozent) {
      if (!t.trim()) return null;
      const v = S.parseNum(t); if (v == null) return T('fe_f_zahl'); if (v < 0) return T('fe_f_neg');
      if (key === 'wa') return Math.abs(v - Math.round(v)) > 1e-9 ? T('fe_f_ganz') : null;
      if (winkel) return v > MAX_GRAD ? T('fe_f_grad', fmtTrim(MAX_GRAD, 0)) : null;
      if (prozent) return v > 100 ? T('fe_f_vsp', '100') : null;
      return E().zuCm(einheit(), v) > KAMIN_MAX_CM ? T('fe_f_gross', E().text(einheit(), KAMIN_MAX_CM), eu().kurz) : null;
    }
    function feldFehlerPruefen() {
      let irgendeiner = false;
      for (const k in felder) { const m = kaminMeldung(k, eingabe['f_' + k] || '', (k === 'sh' || k === 'sv') && st.grad); felder[k].fehler(m); if (m != null) irgendeiner = true; }
      for (const k in globale) { const m = kaminMeldung(k, eingabe[k] || '', false, k === 'g_vsp'); globale[k].fehler(m); if (m != null) irgendeiner = true; }
      fehlerAktiv = irgendeiner;
      const nRoh = eingabe.g_neig || ''; neigFeld.fehler(nRoh.trim() && neigungOderNull(zahl('g_neig')) == null ? T('dach_ungueltig') : null);
    }
    const formText = (t, einheitIdx) => {
      const e = E(), ku = e.liste[einheitIdx].kurz; let s;
      switch (t.form) {
        case 'KONISCH': s = T('fo_konisch', e.text(einheitIdx, t.bo), e.text(einheitIdx, t.bu)) + ' ' + ku; break;
        case 'UEBERLAPPUNG': s = T('fo_ueberlappung', e.mit(einheitIdx, t.ueberlapp)); break;
        case 'DREIECK': s = T('fo_dreieck'); break; case 'RINNE': s = T('fo_rinne'); break; case 'RUND': s = T('fo_rund'); break; default: s = T('fo_gerade');
      }
      if (t.versatz > 0) s += ', ' + T('fo_schraege', e.mit(einheitIdx, t.versatz));
      return s;
    };
    function zeilenText(r) {
      let s = ''; const e = E(), ei = einheit(), ku = eu().kurz;
      for (const z of r.zeilen) {
        s += teilName(z.teil.art) + ', ' + fmtTrim(z.teil.stueck, 0) + ' Stk\n';
        s += '    ' + e.text(ei, z.laenge) + ' x ' + e.text(ei, z.breite) + ' ' + ku + '  (' + fmt(z.m2, 2) + ' m²)\n';
        s += '    ' + formText(z.teil, ei) + '\n';
        if (z.teil.art === 'VORDERTEIL' && (z.teil.vorneZiegel > 0 || z.teil.vorneLatte > 0)) s += '    ' + T('zeile_vorne', e.text(ei, z.teil.vorneZiegel), e.text(ei, z.teil.vorneLatte), ku) + '\n';
        if (z.teil.gemessen > 0) s += '    ' + T('zeile_latte', e.text(ei, z.teil.gemessen), e.text(ei, z.teil.aufLatte), ku) + '\n';
        s += '\n';
      }
      return s + T('r_total') + ': ' + fmtTrim(r.stueck, 0) + ' Stk, ' + fmt(r.m2, 2) + ' m²';
    }
    const bedarfText = r => letzteRolle ? T('bedarf_rolle', fmt(letzteRolle.laufCmVerschnitt / 100, 2)) : T('bedarf_tafeln', String(r.tafeln));
    const zuGrossListe = r => letzteRolle ? letzteRolle.zuGross : r.zuGross;
    const skizzenBauer = e => {
      const einh = st.einheit, daten = { art: art(), werte: e.werte, fmt: c => E().text(einh, c), schrGrad: st.grad, aufV: aufFuer(e, 'VORDERTEIL'), aufS: aufFuer(e, 'SEITENTEIL'), aufH: aufFuer(e, 'HINTERTEIL'), ueberlapp: e.ueberlapp, lattenAn: eingabe.g_latten !== '0' };
      const lb = { hinten: T('ka_hinten'), seiten: T('ka_seiten'), vorn: T('ka_vorn'), kamin: T('sk_kamin'), latten: T('sk_latten'), aufkantung: T('sk_aufk'), ueberlapp: T('ka_ueberlapp'), first: T('ka_first'), traufe: T('ka_traufe'),
        mauer: T('sk_mauer'), manschette: T('t_manschette'), grundblech: T('t_grundblech'), wand: T('t_wand'), stufe: T('t_stufe'), rohr: T('sk_rohr'), stueck: T('f_wa').split(' ')[0], sattelHinweis: T('sk_sattel_hinweis'), kehleHinweis: T('sk_kehle_hinweis') };
      return (a, w, hh, t) => KaminAltBlatt.zeichne(a, daten, w, hh, t, lb);
    };
    function aktualisiere(melden) {
      speichere();
      const e = eingaben(), r = K.rechnenKamin(e); letzte = r;
      beispielKnopf.style.display = !r.zeilen.length && st.art === 0 ? '' : 'none';
      zeichner.art = art(); zeichner.werte = e.werte; zeichner.eIdx = st.einheit; zeichner.schrGrad = st.grad; zeichner.auf = e.auf; zeichner.zug = zugAktuell;
      letzteRolle = lieferform() === 3 ? rolleRechnen(r.zeilen, e.tb, e.vsp) : null;
      dachTexte(zugAktuell); feldFehlerPruefen();
      const bauer = skizzenBauer(e); view.bauer = (a, w, hh) => bauer(a, w, hh, 14); cv2.style.opacity = fehlerAktiv ? .4 : 1; cv3.style.opacity = fehlerAktiv ? .4 : 1; view.baue(melden);
      const leer = leereFelder(e);
      leerText.textContent = leer.length && r.zeilen.length ? T('ka_leer_hinweis', leer.join(', ')) : ''; leerText.style.display = leerText.textContent ? '' : 'none';
      if (fehlerAktiv) { tabelle.textContent = T('fe_rot'); kpi.textContent = ''; }
      else if (!r.zeilen.length) { tabelle.textContent = T('leer_hinweis'); kpi.textContent = ''; }
      else { tabelle.textContent = zeilenText(r); kpi.textContent = T('kpi_zeile', fmt(r.m2, 2), fmt(r.m2Verschnitt, 2), fmt(r.kg, 1), bedarfText(r)); }
      warnOut.textContent = zuGrossListe(r).map(a => T(letzteRolle ? 'warn_gross_rolle' : 'warn_gross', teilName(a))).concat(S.werkstoffWarnungen(st.mat)).join('\n');
      warnOut.style.display = warnOut.textContent ? '' : 'none';
      leisteAktualisieren(r); d3Aktualisieren(e, r);
    }
    function leisteAktualisieren(r) {
      if (fehlerAktiv) { leisteLabel.textContent = T('ss_leiste_leer'); leisteWert.textContent = '-'; angezeigt = NaN; teilenKnopf.disabled = true; teilenKnopf.style.opacity = .5; }
      else if (!r.zeilen.length) { leisteLabel.textContent = T('leiste_leer'); leisteWert.textContent = '-'; angezeigt = NaN; teilenKnopf.disabled = true; teilenKnopf.style.opacity = .5; }
      else { leisteLabel.textContent = T('ss_ergebnis_kamin'); teilenKnopf.disabled = false; teilenKnopf.style.opacity = 1; zaehleHoch(r.m2Verschnitt, v => Ze.fmt(v, v < 0.1 ? 3 : 2) + ' m²'); }
    }
    function d3Aktualisieren(e, r) {
      const m = modellAus(e, r); d3.szene = m;
      let live3 = m, beispiel = null;
      if (m == null && K.ARTEN[st.art].typ === 'KAMIN') {
        const e2 = Object.assign({}, e, { werte: Object.assign({}, BEISPIEL) }); live3 = modellAus(e2, K.rechnenKamin(e2)); if (live3) beispiel = T('live_beispiel');
      }
      if (fehlerAktiv && letztesLive) { live.szene = letztesLive; live.veraltet = T('live_veraltet'); }
      else { if (beispiel == null) letztesLive = live3; live.szene = live3; live.veraltet = beispiel; }
      d3.veraltet = null;
      const arten = [...new Set(r.zeilen.map(z => z.teil.art))];
      if (d3.wahl != null && !arten.includes(d3.wahl)) d3.wahl = null;
      if (JSON.stringify(arten) !== JSON.stringify(chipsFuer)) { chipsFuer = arten; chipsZeichnen(); }
      d3Beschreibung(); live.zeichnen(); if (st.d3 && K.ARTEN[st.art].typ === 'KAMIN') d3.zeichnen();
    }
    function leerenFragen() {
      if (!window.confirm(T('leeren_frage'))) return;
      for (const k of Object.keys(eingabe)) if (k.startsWith('f_')) delete eingabe[k];
      delete eingabe.o_ort; delete eingabe.o_nr; for (const k of ['g_neig', 'g_deck', 'g_ueb', 'g_aufv', 'g_aufs', 'g_aufh']) delete eingabe[k];
      neigFeld.input.value = ''; ortF.input.value = ''; nrF.input.value = ''; spDeck.querySelector('select').value = '0';
      for (const k in felder) felder[k].input.value = '';
      for (const f of ['g_tb', 'g_tl', 'g_auf', 'g_zl', 'g_zb', 'g_vsp', 'g_ueb', 'g_aufv', 'g_aufs', 'g_aufh']) if (globale[f]) globale[f].input.value = eingabe[f] || '';
      aktualisiere(false);
    }
    function snapshot() {
      let s = S.TA('arten')[st.art] + ', ' + S.TA('werkstoffe')[st.mat] + ' ' + fmtTrim(WS()[st.mat].dicken[st.dicke], 2) + ' mm, Einheit ' + eu().kurz + '\n';
      s += Object.keys(eingabe).filter(k => String(eingabe[k]).trim() !== '' && (k.startsWith('f_') || k.startsWith('g_'))).sort().map(k => k + '=' + eingabe[k]).join(', ');
      if (letzte) for (const z of letzte.zeilen) s += '\n' + teilName(z.teil.art) + ': ' + fmtTrim(z.laenge * 10, 1) + ' x ' + fmtTrim(z.breite * 10, 1) + ' mm, ' + fmtTrim(z.teil.stueck, 0) + ' Stk';
      return s;
    }
    function teilen() {
      const r = letzte; if (fehlerAktiv) { status.textContent = T('fe_rot'); return; } if (!r || !r.zeilen.length) { status.textContent = T('status_leer'); return; }
      let s = T('share_vorschau') + '\n' + T('share_kopf', eingabe.o_ort || '-', eingabe.o_nr || '-') + '\n' + T('share_material', S.TA('werkstoffe')[st.mat], fmtTrim(WS()[st.mat].dicken[st.dicke], 2), S.TA('arten')[st.art]) + '\n';
      for (const z of r.zeilen) s += '- ' + teilName(z.teil.art) + ': ' + fmtTrim(z.teil.stueck, 0) + ' Stk, ' + fmtTrim(z.laenge * 10, 1) + ' x ' + fmtTrim(z.breite * 10, 1) + ' mm (' + fmt(z.laenge / 2.54, 2) + ' x ' + fmt(z.breite / 2.54, 2) + ' in), ' + formText(z.teil, 1) + '\n';
      s += T('share_summe', fmt(r.m2, 2), fmt(r.m2Verschnitt, 2), fmt(r.kg, 1), bedarfText(r));
      try { if (navigator.share) { navigator.share({ title: T('share_titel', eingabe.o_ort || ''), text: s }).catch(() => { }); return; } } catch (x) { /* */ }
      try { navigator.clipboard.writeText(s); status.textContent = T('status_no_app'); } catch (x) { status.textContent = T('status_no_app'); }
    }
    async function blattDatei() {
      const r = letzte; if (fehlerAktiv) { status.textContent = T('fe_rot'); return null; } if (!r || !r.zeilen.length) { status.textContent = T('status_leer'); return null; }
      status.textContent = '';
      try {
        const W = 1240, sk = Math.round((W - 80) * zeichner.hoehe(false) / BREITE), c = document.createElement('canvas'); c.width = W; const txt = zeilenText(r).split('\n');
        c.height = 190 + sk + 40 + txt.length * 32 + 60; const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, c.height);
        ctx.fillStyle = '#141C26'; ctx.font = '700 40px Roboto, sans-serif'; ctx.fillText(T('pdf_titel'), 40, 70);
        ctx.font = '24px Roboto, sans-serif'; ctx.fillText((eingabe.o_ort || '') + '   ' + (eingabe.o_nr || '') + '   ' + (eingabe.o_datum || ''), 40, 110);
        ctx.fillText(S.TA('arten')[st.art] + ', ' + S.TA('werkstoffe')[st.mat] + ' ' + fmtTrim(WS()[st.mat].dicken[st.dicke], 2) + ' mm', 40, 146);
        const sc = document.createElement('canvas'); sc.width = W - 80; sc.height = sk; const f0 = zeichner.fortschritt; zeichner.fortschritt = 1; zeichner.zeichne(sc.getContext('2d'), false, sc.width, 2.2); zeichner.fortschritt = f0; ctx.drawImage(sc, 40, 170);
        ctx.fillStyle = '#141C26'; txt.forEach((z, i) => ctx.fillText(z, 40, 170 + sk + 50 + i * 32));
        const blob = await new Promise(res => c.toBlob(res, 'image/png'));
        return { blob, name: 'Werkblatt_' + ((eingabe.o_ort || '').replace(/[^A-Za-z0-9äöüÄÖÜ]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'Kamin') + '.png' };
      } catch (x) { status.textContent = T('status_pdf_fehler'); return null; }
    }
    async function blattTeilen() {
      const d = await blattDatei(); if (!d) return;
      S.haptik(20);
      const vorher = teilenKnopf.textContent; teilenKnopf.textContent = '✓  ' + T('ss_blatt_fertig'); teilenKnopf.classList.add('ok');
      teilenKnopf.style.transform = 'scale(1.05)'; setTimeout(() => { teilenKnopf.style.transform = ''; }, 140);
      setTimeout(async () => { const r = await S.teilen(d.blob, d.name, T('share_titel', eingabe.o_ort || '')); if (r === 'download') status.textContent = d.name; }, 420);
      setTimeout(() => { teilenKnopf.textContent = vorher; teilenKnopf.classList.remove('ok'); }, 2200);
    }
    async function pdfErstellen(ohnePush) {
      const d = await blattDatei(); if (!d) return;
      S.pdfDialog(d.blob, d.name, T('share_titel', eingabe.o_ort || ''), m => { status.textContent = m; }, ohnePush);
    }

    // ---- Layout (Kopfhoehe, Tastatur)
    function layout() {
      const vp = S.vp;
      leiste.style.display = vp.tastatur ? 'none' : '';
      const insTop = S.inset('top'), insBot = S.inset('bottom');
      el.style.paddingBottom = (vp.tastatur ? Math.max(vp.ime, 0) : insBot) + 'px';
      if (!quer) {
        const wunsch = vp.voll * (vp.tastatur ? 0.52 : 0.80), frei = vp.h - insTop - (vp.tastatur ? vp.ime : insBot) - (vp.tastatur ? 0 : leiste.offsetHeight);
        let kh = wunsch;
        if (frei > 0 && S.opt.kopf !== 'alt') { kh = Math.min(wunsch, Math.max(300, frei - 96)); }
        if (hoch) { kopf.style.height = ''; karte.style.flex = 'none'; karte.style.height = S.karteHoch() + 'px'; } else kopf.style.height = kh + 'px';
        const klein = !hoch && (vp.tastatur || kh < 420); titel.style.visibility = klein ? 'hidden' : ''; reiter.style.visibility = klein ? 'hidden' : '';
      }
      view.groesse(karte.clientWidth, karte.clientHeight); live.setzeGroesse(karte.clientWidth, karte.clientHeight, window.devicePixelRatio || 1);
      if (st.mehr || true) d3Groesse();
      S.autosizeAlle(el);
    }
    const ro = new ResizeObserver(() => { view.groesse(karte.clientWidth, karte.clientHeight); live.setzeGroesse(karte.clientWidth, karte.clientHeight, window.devicePixelRatio || 1); });
    ro.observe(karte);

    liefSichtbar(); sonderInfoZeigen(); felderNeu(); setzeMehr(st.mehr);
    return {
      el, overlay: { zurueck: true },
      nachEinbau() { layout(); tabsAnwenden(); aktualisiere(false); S.nachLayout(() => { d3Groesse(); d3.zeichnen(); S.autosizeAlle(el); if (opt.scroll) scroll.scrollTop = +opt.scroll; }); if (opt.scroll) scroll.scrollTop = +opt.scroll;
        if (opt.fokus) setTimeout(() => { fokusiere(opt.fokus); layout(); }, 30); if (opt.dialog === 'pdf') pdfErstellen(true); if (opt.dialog === 'vollbild') vollbild(); },
      layout, speichere, zerstoere() { speichere(); ro.disconnect(); if (zaehlStopp) zaehlStopp(); clearTimeout(liveTimer); }
    };
  };
})(window);
