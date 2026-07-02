import { writeFileSync, mkdirSync, rmSync } from "node:fs";

const W = 970, H = 250, N = 21;          // 21 frames
const ACCENT = process.argv[2] || "#C20017";
const SITE = process.argv[3] || "HOJE MT";
const dir = "/tmp/claude-0/-home-user-lar-cia/4e7fa3cb-1849-51db-baa4-a1d4dd051b7b/scratchpad/banner_frames";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const messages = ["ANUNCIE AQUI", "SUA MARCA EM DESTAQUE", "FALE COM O COMERCIAL"];

function frame(t) {
  const seg = Math.floor(t / 7) % 3, local = t % 7;
  const ty = Math.max(0, (1 - local / 2)) * 30;      // sobe
  const op = Math.min(1, local / 2.2);               // fade-in
  const shineX = -40 + (t / N) * 180;                // brilho atravessa
  const ctaScale = (1 + 0.06 * Math.sin((t / N) * Math.PI * 4)).toFixed(3);
  const bgShift = (t / N) * 30;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box;font-family:'Arial Black',Helvetica,Arial,sans-serif;}
  .b{position:relative;width:${W}px;height:${H}px;overflow:hidden;
     background:linear-gradient(${110 + bgShift}deg, #7a0010 0%, ${ACCENT} 55%, #e2001c 100%);}
  .dots{position:absolute;inset:0;opacity:.10;
     background-image:radial-gradient(circle, #fff 1.5px, transparent 1.6px);background-size:22px 22px;}
  .shine{position:absolute;top:-20%;left:0;width:160px;height:140%;
     background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);
     transform:translateX(${shineX}%) skewX(-18deg);}
  .pub{position:absolute;top:12px;right:16px;color:rgba(255,255,255,.65);
     font-family:Arial;font-size:11px;letter-spacing:3px;font-weight:700;}
  .wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 46px;}
  .left{max-width:600px;}
  .kicker{display:inline-block;background:#111;color:#ffd400;font-size:14px;font-weight:900;
     letter-spacing:1px;padding:5px 12px;border-radius:4px;margin-bottom:14px;font-family:Arial;}
  .msg{color:#fff;font-size:52px;line-height:1.02;letter-spacing:-1px;
     text-shadow:0 3px 14px rgba(0,0,0,.35);transform:translateY(${ty}px);opacity:${op};}
  .sub{color:#ffd9dd;font-family:Arial;font-weight:700;font-size:16px;margin-top:10px;opacity:${op};}
  .cta{display:flex;flex-direction:column;align-items:center;gap:6px;}
  .btn{background:#fff;color:${ACCENT};font-size:22px;font-weight:900;letter-spacing:.3px;
     padding:16px 26px;border-radius:50px;white-space:nowrap;transform:scale(${ctaScale});
     box-shadow:0 10px 24px rgba(0,0,0,.30);}
  .wa{color:#fff;font-family:Arial;font-size:12.5px;font-weight:700;opacity:.92;}
  </style></head><body>
  <div class="b"><div class="dots"></div><div class="shine"></div>
    <span class="pub">PUBLICIDADE</span>
    <div class="wrap">
      <div class="left">
        <span class="kicker">PORTAL ${SITE}</span>
        <div class="msg">${messages[seg]}</div>
        <div class="sub">Sua marca vista por milhares de leitores todos os dias.</div>
      </div>
      <div class="cta"><div class="btn">QUERO ANUNCIAR ›</div><div class="wa">📲 WhatsApp da redação</div></div>
    </div>
  </div></body></html>`;
}

for (let t = 0; t < N; t++) {
  writeFileSync(`${dir}/f${String(t).padStart(3, "0")}.html`, frame(t));
}
console.log(`OK: ${N} frames em ${dir}`);
