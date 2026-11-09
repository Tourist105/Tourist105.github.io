/* Spengler-Web: Verteiler der Weitere-Teile-Seiten. */
(function (root) {
  'use strict';
  const S = root.S;
  S.seiteWeitere = function (name, opt) {
    if (name === 'profil') return S.seiteProfil(opt);
    if (S.seiteRohr && ['rohrbogen', 'schwanenhals-alt', 'hosenrohr', 'reduktion'].includes(name)) return S.seiteRohr(name, opt);
    if (S.seiteKaminAlt && name === 'kamin-alt') return S.seiteKaminAlt(opt);
    return S.seiteWeitereV1(name, opt);
  };
})(window);
