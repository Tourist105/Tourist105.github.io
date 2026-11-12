/* Spengler-Web: englische Anzeige der Normteile-Texte (Materialliste, Quellen, Annahmen, Hinweise). Die Rechnung und die deutschen Texte bleiben unveraendert:
 * Im deutschen Modus gibt jede Funktion ihre Eingabe unveraendert zurueck, im englischen Modus werden die deutschen Saetze der Kataloge uebersetzt.
 * Zwei Stufen: (1) Katalogsaetze (en_daten.js, von Hand geschrieben) werden als Ganzes ersetzt, (2) die Satzgeruest-Regeln unten uebersetzen, was der Code aus Zahlen und
 * Kurzbausteinen zusammensetzt ("Nenn 100, Titanzink, Dicke 0,7 mm"). Dezimalkomma wird zum Punkt. Was keine Regel trifft, bleibt stehen: test_en.mjs meldet es. */
(function (root) {
  'use strict';
  const D = root.EN_DATEN || (typeof require !== 'undefined' ? require('./en_daten.js') : []);
  let erzwungen = null;
  const istEn = () => erzwungen != null ? erzwungen : (typeof root.S !== 'undefined' && root.S && root.S.sprache && root.S.sprache() === 'en');
  const EXAKT = new Map(D.map(p => [p[0], p[1]]));
  // Lange Saetze: als Teilstueck erkennen und vor den Regeln schuetzen. Kurze Bausteine (Namen, Labels): nur wenn der ganze Text passt.
  const LANG = D.filter(p => p[0].length >= 20 && /\s/.test(p[0])).sort((a, b) => b[0].length - a[0].length);
  const P0 = '', P1 = '';

  const WERKSTOFF = { 'Titanzink': 'Titanium zinc', 'Kupfer': 'Copper', 'Alu': 'Aluminium', 'Chromstahl verzinnt': 'Tinned stainless steel', 'Chromstahl': 'Stainless steel' };
  const TEIL = { 'Abdeckung': 'Coping', 'Kehlblech': 'Valley flashing', 'Gehrung / Ecke': 'Mitre / corner' };
  const LABEL = { 'Winkel': 'Angle', 'Durchmesser': 'Diameter', 'Dicke': 'Thickness', 'Stücklänge': 'Piece length', 'Abstand': 'Spacing', 'Anzahl': 'Number', 'Abwicklung': 'Girth', 'Baulänge': 'Overall length', 'Bauhöhe': 'Overall height' };
  const SUMME = { 'Werkstoff': 'Material', 'Werkstoff und Dicke': 'Material and thickness', 'Zuschnitt Zwischenrohr': 'Cut length of intermediate pipe', 'Laufmeter Rohr': 'Pipe, running metres', 'Steckung je Seite': 'Insertion depth per end',
    'Laufmeter Rinne': 'Gutter, running metres', 'Blech netto': 'Sheet, net', 'Blech mit Verschnitt': 'Sheet, with waste', 'Gewicht (Kontrolle)': 'Weight (check)', 'Streifen je Tafel': 'Strips per sheet', 'Laufmeter Abdeckung': 'Coping, running metres',
    'Blechlänge mit Überlappung': 'Sheet length with overlap', 'Gesamthöhe': 'Total height', 'Laufmeter Rohr (Zuschnitte)': 'Pipe, running metres (cuts)', 'Gewicht Rohre (Kontrolle)': 'Weight of pipes (check)' };
  const EINHEIT = { 'Stk': 'pcs', 'm': 'm' };

  // Regeln fuer das, was der Code zusammensetzt. Reihenfolge: Saetze vor Bausteinen.
  const Z = '([\\d.,]+)';
  const SAETZE = [
    [new RegExp('Radius der Mittellinie bei Nenn (\\d+): etwa (\\d+) mm \\(' + Z + ' x Nenn, abgeleitet\\)\\.', 'g'), 'Centre-line radius at DN $1: about $2 mm ($3 x DN, derived).'],
    [new RegExp('Eingegeben ist ' + Z + ' mm\\.', 'g'), 'Entered: $1 mm.'],
    [/Versatz (\d+): /g, 'Offset $1: '],
    [new RegExp('Händler-Richtwert für zwei ineinandergesteckte Bögen ' + Z + '° Nenn (\\d+): Achsversatz (\\d+) mm\\.', 'g'), 'Dealer guide value for two bends pushed into each other, $1° DN $2: axis offset $3 mm.'],
    [new RegExp('Dein Achsmass ' + Z + ' mm ist kleiner, mit zwei Normbögen nicht möglich\\.', 'g'), 'Your axis dimension of $1 mm is smaller, not possible with two standard bends.'],
    [new RegExp('Dein Achsmass ' + Z + ' mm ist grösser, das Zwischenrohr füllt den Rest\\.', 'g'), 'Your axis dimension of $1 mm is larger, the intermediate pipe fills the rest.'],
    [new RegExp("Die Steckung " + Z + " mm weicht von den 50 mm auf Alex' Skizze ab\\.", 'g'), "The insertion depth of $1 mm differs from the 50 mm on Alex's sketch."],
    [/Nenn (\d+) ist für eine Rinne mit Abwicklung (\d+) gross: der Katalog nennt Stutzen bis Nenn 100 \(330\) und Nenn 120 \(400\)\./g, 'DN $1 is large for a gutter with girth $2: the catalogue lists outlets up to DN 100 (330) and DN 120 (400).'],
    [/Zuschnitt aus Tafel 1000 x 2000: (\d+) Streifen je Tafel\. Was Alex lagert \(Tafel, Band, zugeschnitten\), weiss nur er\./g, 'Cut from a 1000 x 2000 sheet: $1 strips per sheet. What Alex keeps in stock (sheet, coil, pre-cut), only he knows.'],
    [/Unterkonstruktion \(Vollholz 24 mm oder OSB mind\. 25 mm\) ist nicht gerechnet\./g, 'The substructure (solid timber 24 mm or OSB at least 25 mm) is not calculated.'],
    [/Unterlage \(Bitumenbahn unter dem Kehlblech\) ist nicht gerechnet\. Breite und Länge misst Alex auf dem Dach\./g, 'The underlay (bitumen membrane under the valley flashing) is not calculated. Alex measures width and length on the roof.'],
    [new RegExp('Gesetzt sind (\\d+) Schellen, nach ' + Z + ' m Abstand wären (\\d+) nötig\\. Die Liste zählt (\\d+)\\.', 'g'), (m, a, b, c, d) => a + (a === '1' ? ' clip is' : ' clips are') + ' set; at ' + b + ' m spacing ' + c + ' would be needed. The list counts ' + d + '.'],
    [/Einzelner Bogen: die Höhe zählt bis zum Bogenende \(Radius mal Sinus des Winkels\)\. Was danach kommt, rechnet die App nicht\./g, 'Single bend: the height counts up to the end of the bend (radius times sine of the angle). What comes after it, the app does not calculate.'],
    [new RegExp('Es fehlen ' + Z + ' mm bis zur Gesamthöhe\\. Ein Rohrstück ohne Länge \\(Rest\\) macht sie voll\\.', 'g'), '$1 mm are missing up to the total height. A pipe piece without a length (remainder) makes it up.'],
    [/Oben steckt das Rohr in den Rinnenstutzen, die Steckung ist dort mitgerechnet\./g, 'At the top the pipe is pushed into the gutter outlet; the insertion depth is included there.'],
    [/Die Bauhöhen von Reduktion, Muffe, Endstück und Abzweiger sind Annahmen: Alex prüft und nennt die Masse seines Händlers\./g, 'The overall heights of reducer, coupling, end piece and branch are assumptions: Alex checks them and gives the dimensions of his dealer.']
  ];
  const REGELN = [
    // Quellen: Kopf eines Teilsatzes
    [new RegExp('(^|\\. )(' + Object.keys(LABEL).join('|') + '): ', 'g'), (m, a, l) => a + LABEL[l] + ': '],
    [/Kantprofil nach Mass, kein Normteil\./g, 'Bent profile made to measure, not a standard part.'],
    [/keine Normabwicklung, Alex prüft/g, 'no standard girth, Alex checks'],
    [/Annahme, nur Quellen aus Deutschland und Österreich/g, 'assumption, only sources from Germany and Austria'],
    [/Welche Länge Alex nimmt, ist offen/g, 'Which length Alex uses is open'],
    [/Teilung: Annahme/g, 'Spacing: assumption'],
    [/Zwei Seiten: Annahme/g, 'Two sides: assumption'],
    [/Debrunner Normfigur 100\.00 C, RHEINZINK\. Alex: Werkstatt oder Baustelle offen/g, 'Debrunner standard figure 100.00 C, RHEINZINK. Workshop or site: Alex to say'],
    [/von Hand eingegeben, Alex prüft/g, 'entered by hand, Alex checks'],
    [/Muffenlänge des grösseren Durchmessers als Annahme, Alex nennt das Mass seines Händlers/g, 'socket length of the larger diameter as an assumption; Alex gives the dimension from his dealer'],
    [/Winkel (\d+) steht nicht im Katalog/g, 'Angle $1 is not in the catalogue'],
    [/Nenn (\d+) steht nicht im Katalog/g, 'DN $1 is not in the catalogue'],
    [/nicht im Katalog/g, 'not in the catalogue'],
    [/Normwinkel im Katalog: ([\d, ]+)\. Ein anderer Winkel ist kein Fertigteil, Alex prüft/g, 'Standard angles in the catalogue: $1. Another angle is not a ready-made part, Alex checks'],
    [/ \(kein Normwinkel\)/g, ' (not a standard angle)'],
    // Zeile "Detail"
    [/(^|, )Nenn (\d+)/g, '$1DN $2'],
    [/Nenn (\d+)/g, 'DN $1'],
    [new RegExp(', Zuschnitt ' + Z + ' mm aus Stück ' + Z + ' m', 'g'), ', cut length $1 mm from $2 m lengths'],
    [new RegExp('(\d+) Zuschnitte: ', 'g'), (m, a) => a + (a === '1' ? ' cut: ' : ' cuts: ')],
    [new RegExp(', aus Stück ' + Z + ' m', 'g'), ', from $1 m lengths'],
    [new RegExp(', am Zwischenrohr, höchstens ' + Z + ' m Abstand', 'g'), ', on the intermediate pipe, at most $1 m apart'],
    [new RegExp(', (\\d+) gesetzt, nach ' + Z + ' m Abstand mindestens (\\d+)', 'g'), ', $1 set, at least $3 at $2 m spacing'],
    [/^Stücke minus 1$/, 'Pieces minus 1'],
    [/^Abstand (\d+) mm, Typ nach Rinne \(Schweizer Haken oder Kastenhalter\)$/, 'Spacing $1 mm, type to suit the gutter (Swiss hook or box bracket)'],
    [/^links und rechts, passend zur Abwicklung$/, 'Left and right, matching the girth'],
    [/^für Ablaufrohr /, 'For downpipe '],
    [/^90 Grad$/, '90 degrees'],
    [new RegExp('^höchstens alle ' + Z + ' m$'), 'At most every $1 m'],
    [/^Fuge etwa (\d+) mm$/, 'Gap about $1 mm'],
    [/^Teilung (\d+) mm$/, 'Spacing $1 mm'],
    [/^beidseitig, Abwicklung (\d+)$/, 'Both sides, girth $1'],
    [/^45 Grad, Werkstatt, gelötet$/, '45 degrees, workshop, soldered'],
    [new RegExp(', Bauhöhe ' + Z + ' mm', 'g'), ', overall height $1 mm'],
    [new RegExp(', Baulänge ' + Z + ' mm', 'g'), ', overall length $1 mm'],
    [new RegExp(', je Stück bis ' + Z + ' m, ' + Z + ' m gesamt', 'g'), ', up to $1 m per piece, $2 m in total'],
    [new RegExp(', Stücklänge ' + Z + ' m, ' + Z + ' m Rinne', 'g'), ', piece length $1 m, $2 m of gutter'],
    [new RegExp(', Stücke bis ' + Z + ' m, Überlappung ' + Z + ' mm, ' + Z + ' m Kehle', 'g'), ', pieces up to $1 m, overlap $2 mm, $3 m of valley'],
    [/, Dicke /g, ', thickness '],
    [/^Dicke /g, 'Thickness '],
    [/, Abwicklung (\d+)/g, ', girth $1'],
    [/ auf (\d+)$/g, ' to $1'],
    // Prefix/Teile
    [/\bRest\b/g, 'remainder']
  ];

  function werkstoffNamen(s) {
    for (const k of Object.keys(WERKSTOFF).sort((a, b) => b.length - a.length)) s = s.replace(new RegExp('(^|[^\\wäöüÄÖÜ])' + k + '(?=$|[^\\wäöüÄÖÜ])', 'g'), (m, a) => a + WERKSTOFF[k]);
    return s;
  }
  /** Ein Text (Satz, Zeile, Quelle). Im deutschen Modus unveraendert. */
  function t(s) {
    if (!istEn() || s == null || typeof s !== 'string' || s === '') return s;
    if (EXAKT.has(s)) return EXAKT.get(s);
    const store = [];
    let x = s;
    for (const r of SAETZE) x = x.replace(r[0], r[1]);
    for (const p of LANG) if (x.indexOf(p[0]) >= 0) { x = x.split(p[0]).join(P0 + store.length + P1); store.push(p[1]); }
    // ganzer Rest ist ein kurzer Baustein (Name, Label)
    if (TEIL[x]) x = TEIL[x]; else if (SUMME[x]) x = SUMME[x];
    for (const r of REGELN) x = x.replace(r[0], r[1]);
    x = werkstoffNamen(x);
    x = x.replace(/(\d),(\d)/g, '$1.$2');
    x = x.replace(new RegExp(P0 + '(\\d+)' + P1, 'g'), (m, i) => store[+i]);
    return x;
  }
  /** Name eines Teils der Materialliste ("Rinne halbrund, Abwicklung 330", "Fallrohrbogen 72°", "Reduktion (Rohrreduzierung) 100 auf 80"). */
  function teil(s) {
    if (!istEn()) return s;
    const m = String(s).match(/^(.*?)((?:, Abwicklung [\d.,]+)|(?: [\d.,]+°(?: \(kein Normwinkel\))?)|(?: \d+ auf \d+))?$/);
    const kopf = m ? m[1] : s, rest = m && m[2] ? m[2] : '';
    let k = EXAKT.get(kopf) || TEIL[kopf] || kopf;
    return t(k) + t(rest);
  }
  /** Materialliste einer Seite (Normteile.hals/rinne/mauer/kehle, Fallrohr.material): zeilen, summen, hinweise. */
  function liste(ml) {
    if (!istEn() || !ml) return ml;
    return Object.assign({}, ml, {
      titel: ({ 'Materialliste Schwanenhals': 'Bill of materials, swan neck', 'Materialliste Dachrinne': 'Bill of materials, gutter', 'Materialliste Mauerabdeckung': 'Bill of materials, wall coping', 'Materialliste Kehle': 'Bill of materials, valley', 'Materialliste Fallrohr': 'Bill of materials, downpipe' })[ml.titel] || ml.titel,
      zeilen: ml.zeilen.map(z => Object.assign({}, z, { teil: teil(z.teil), einheit: EINHEIT[z.einheit] || z.einheit, detail: t(z.detail), quelle: t(z.quelle) })),
      summen: ml.summen.map(([l, w]) => [t(l), t(w)]),
      hinweise: ml.hinweise.map(([s, x]) => [s, t(x)])
    });
  }
  /** Annahmenliste (K.RinneSkizze.annahmenListe() usw.): text, wert, quelle. */
  function ann(l) {
    if (!istEn() || !l) return l;
    return l.map(a => Object.assign({}, a, { text: t(a.text), wert: t(a.wert), quelle: t(a.quelle) }));
  }
  root.ENTXT = { t, teil, liste, ann, werkstoff: n => (istEn() ? (WERKSTOFF[n] || n) : n), istEn, erzwinge: v => { erzwungen = v; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ENTXT;
})(typeof window !== 'undefined' ? window : globalThis);
