// Gera o logo do Pacu News (peixe pixelado + wordmark) como SVG — variante
// colorida (fundo claro) e branca (fundo escuro). O "pacu" é um peixe; o mark é
// um peixe formado por quadradinhos com gradiente vermelho (cor da marca), no
// mesmo estilo pixel do logo do Hoje MT (consistência de rede).
import { writeFileSync } from "node:fs";

const lerp = (a, b, t) => a + (b - a) * t;
const hex = (c) => "#" + c.map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0")).join("");
const STOPS = [
  { t: 0.0, c: [120, 20, 20] },   // #781414 (cauda, vinho mais escuro)
  { t: 0.55, c: [214, 40, 40] },  // #D62828 (vermelho da marca)
  { t: 1.0, c: [240, 96, 96] },   // #F06060 (frente, mais claro)
];
function ramp(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i].t) {
      const a = STOPS[i - 1], b = STOPS[i], k = (t - a.t) / (b.t - a.t);
      return hex([lerp(a.c[0], b.c[0], k), lerp(a.c[1], b.c[1], k), lerp(a.c[2], b.c[2], k)]);
    }
  }
  return hex(STOPS[STOPS.length - 1].c);
}

// geometria do peixe (olhando p/ a direita)
const inEllipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
function inTri(px, py, a, b, c) {
  const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  const s = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / d;
  const t = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / d;
  return s >= 0 && t >= 0 && s + t <= 1;
}

function fish({ white }) {
  const cx = 60, cy = 64, rx = 38, ry = 23;          // corpo
  const tail = [[8, 64], [31, 46], [31, 82]];        // cauda (triângulo)
  const finTop = [[62, 30], [46, 54], [80, 54]];     // barbatana dorsal
  const eye = { x: 86, y: 55, r: 4.2 };
  let rects = "";
  const step = 6.2;
  for (let y = 26; y <= 100; y += step) {
    for (let x = 4; x <= 106; x += step) {
      const inside = inEllipse(x, y, cx, cy, rx, ry) || inTri(x, y, tail[0], tail[1], tail[2]) || inTri(x, y, finTop[0], finTop[1], finTop[2]);
      if (!inside) continue;
      if ((x - eye.x) ** 2 + (y - eye.y) ** 2 <= eye.r ** 2) continue; // buraco do olho
      const s = 4.6;
      const t = (x - 8) / (106 - 8);
      const fill = white ? "#ffffff" : ramp(t);
      const op = white ? (0.55 + 0.45 * t).toFixed(2) : "1";
      rects += `<rect x="${(x - s / 2).toFixed(1)}" y="${(y - s / 2).toFixed(1)}" width="${s}" height="${s}" rx="0.6" fill="${fill}" opacity="${op}"/>`;
    }
  }
  // pupila (um quadradinho escuro no meio do buraco)
  const pup = white ? "#0b1220" : "#3a1414";
  rects += `<rect x="${eye.x - 2}" y="${eye.y - 2}" width="4" height="4" rx="1" fill="${pup}"/>`;
  return rects;
}

function build({ white }) {
  const W = 470, H = 132;
  const wordFill = white ? "#ffffff" : "#17181d";
  const labelFill = white ? "#ffffff" : "#D62828";
  const labelOp = white ? "0.85" : "1";
  const tx = 128;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="Pacu News — Portal de Notícias">
  <g>${fish({ white })}</g>
  <text x="${tx}" y="52" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="15" letter-spacing="7" fill="${labelFill}" opacity="${labelOp}">PORTAL DE NOTÍCIAS</text>
  <text x="${tx - 2}" y="104" font-family="Inter, Arial, sans-serif" font-weight="900" font-size="49" letter-spacing="-1" fill="${wordFill}">PACU NEWS</text>
</svg>
`;
}

const dir = process.argv[2] || ".";
writeFileSync(`${dir}/pacunews-logo.svg`, build({ white: false }));
writeFileSync(`${dir}/pacunews-logo-branco.svg`, build({ white: true }));
console.log("OK: pacunews-logo.svg + pacunews-logo-branco.svg");
