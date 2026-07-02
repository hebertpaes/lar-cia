import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { PNG } from "pngjs";
import gifenc from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifenc;

const dir = process.argv[2];
const out = process.argv[3];
const delay = Number(process.argv[4] || 110);
const files = readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
const gif = GIFEncoder();
let W = 0, H = 0;
for (const f of files) {
  const png = PNG.sync.read(readFileSync(`${dir}/${f}`));
  W = png.width; H = png.height;
  const rgba = new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.length);
  const palette = quantize(rgba, 256);
  const index = applyPalette(rgba, palette);
  gif.writeFrame(index, W, H, { palette, delay });
}
gif.finish();
writeFileSync(out, Buffer.from(gif.bytes()));
console.log(`OK: ${out} — ${files.length} frames ${W}x${H}`);
