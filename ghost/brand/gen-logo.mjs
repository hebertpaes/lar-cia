// Gera o logo HOJEMT (globo pixelado + wordmark) como SVG — variante colorida
// (fundo claro) e branca (fundo escuro). Globo = esfera wireframe ortográfica
// desenhada com quadradinhos, gradiente teal->verde.
import { writeFileSync } from "node:fs";

const rad = (d) => (d * Math.PI) / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const hex = (c) => "#" + c.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");
// paradas de cor do globo (dark teal -> teal -> verde)
const STOPS = [
  { t: 0.0, c: [11, 110, 106] },   // #0B6E6A
  { t: 0.55, c: [23, 162, 160] },  // #17A2A0
  { t: 1.0, c: [122, 191, 63] },   // #7ABF3F
];
function ramp(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i].t) {
      const a = STOPS[i - 1], b = STOPS[i];
      const k = (t - a.t) / (b.t - a.t);
      return hex([lerp(a.c[0], b.c[0], k), lerp(a.c[1], b.c[1], k), lerp(a.c[2], b.c[2], k)]);
    }
  }
  return hex(STOPS[STOPS.length - 1].c);
}

function globe({ cx, cy, R, white }) {
  const pts = [];
  const push = (lon, lat) => {
    const x = R * Math.cos(rad(lat)) * Math.sin(rad(lon));
    const y = R * Math.sin(rad(lat));
    const z = R * Math.cos(rad(lat)) * Math.cos(rad(lon));
    if (z < 0) return; // só hemisfério frontal
    pts.push({ sx: cx + x, sy: cy - y, z, x, y });
  };
  // paralelos
  for (let lat = -75; lat <= 75; lat += 15)
    for (let lon = -90; lon <= 90; lon += 6) push(lon, lat);
  // meridianos
  for (let lon = -90; lon <= 90; lon += 15)
    for (let lat = -90; lat <= 90; lat += 6) push(lon, lat);

  let rects = "";
  for (const p of pts) {
    const s = 2.0 + 1.7 * (p.z / R);            // frente um pouco maior
    const op = (0.5 + 0.5 * (p.z / R)).toFixed(2);
    let fill;
    if (white) fill = "#ffffff";
    else {
      const t = 0.55 * (0.5 + 0.5 * (p.x / R)) + 0.45 * (0.5 + 0.5 * (p.y / R));
      fill = ramp(t);
    }
    rects += `<rect x="${(p.sx - s / 2).toFixed(1)}" y="${(p.sy - s / 2).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" rx="0.6" fill="${fill}" opacity="${op}"/>`;
  }
  return rects;
}

function build({ white }) {
  const W = 470, H = 132, cx = 62, cy = 66, R = 54;
  const wordFill = white ? "#ffffff" : "#0C2A38";
  const labelFill = white ? "#ffffff" : "#0B857E";
  const labelOp = white ? "0.85" : "1";
  const g = globe({ cx, cy, R, white });
  const tx = 132; // início do texto
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="HOJEMT — Portal de Notícias">
  <g>${g}</g>
  <text x="${tx}" y="52" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="15" letter-spacing="7.5" fill="${labelFill}" opacity="${labelOp}">PORTAL DE NOTÍCIAS</text>
  <text x="${tx - 2}" y="104" font-family="Inter, Arial, sans-serif" font-weight="900" font-size="58" letter-spacing="-1" fill="${wordFill}">HOJEMT</text>
</svg>
`;
}

const dir = process.argv[2] || ".";
writeFileSync(`${dir}/hojemt-logo.svg`, build({ white: false }));
writeFileSync(`${dir}/hojemt-logo-branco.svg`, build({ white: true }));
console.log("OK: hojemt-logo.svg + hojemt-logo-branco.svg");
