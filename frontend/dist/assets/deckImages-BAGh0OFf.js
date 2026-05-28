import { s as e } from "./image-COc_CFJD.js";
var t = 480,
  n = 280,
  r = (e, t, n) =>
    `https://picsum.photos/seed/${encodeURIComponent(e)}/${t}/${n}`,
  i = (i, a) => {
    let o = `ambi-deck-cover-${a ?? `unknown`}`;
    return e(i, `MD`, o, t, n, !1) ?? r(o, t, n);
  };
export { i as t };
