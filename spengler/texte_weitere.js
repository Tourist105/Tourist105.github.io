/* Spengler-Web: Texte der neu gestalteten Weiteren Teile (Rohr, Profil), aus Android res values und values-en, strings_weitere.xml. Ergaenzt texte.js. */
(function () {
  const dazu = { de: { w_mehr_profil: 'Material, Dicke, Länge, Stück, Biegeabzug', w_mehr_rohr: 'Zugabe, Einheit, Material, Baustelle', w_winkel_titel: 'Winkel und Richtung', w_beispiele: 'Beispiele', w_ergebnis_profil: 'Zuschnittbreite', w_abwicklung_titel: '3D und Abwicklung', profil_schenkel_kurz: '%1$s (mm)' },
    en: { w_mehr_profil: 'Material, thickness, length, pieces, bend deduction', w_mehr_rohr: 'Allowance, unit, material, site', w_winkel_titel: 'Angles and direction', w_beispiele: 'Examples', w_ergebnis_profil: 'Blank width', w_abwicklung_titel: '3D and development', profil_schenkel_kurz: '%1$s (mm)' } };
  for (const l in dazu) { const t = window.TEXTE[l]; for (const k in dazu[l]) if (t[k] == null) t[k] = dazu[l][k]; }
})();
