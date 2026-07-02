# Banners animados (house ads)

GIFs animados de "Anuncie aqui" (970×250) prontos para a zona **leaderboard** —
um por portal, na cor de cada marca:

- `anuncie-hojemt.gif` (vermelho)
- `anuncie-odiapolitico.gif` (vermelho)
- `anuncie-estadomt.gif` (verde MT)
- `anuncie-hebertpaes.gif` (verde-petróleo)
- `anuncie-larcia.gif` (azul)

Animação: 3 manchetes que giram (ANUNCIE AQUI → SUA MARCA EM DESTAQUE →
FALE COM O COMERCIAL), brilho passando e botão "QUERO ANUNCIAR" pulsando.

## Como usar no Ghost
1. Ghost Admin → **New post**
2. **Feature image** = o GIF do portal (ex.: `anuncie-hojemt.gif`)
3. **Post settings → Excerpt** = URL de destino (ex.: `/anuncie/`)
4. **Tags**: `#ad` + `#ad-leaderboard`
5. **Publish** → ele aparece no topo. Com 2+ banners na zona, giram a cada 5s.

## Regenerar (cor/nome diferentes)
No ambiente com Chromium + ffmpeg/gifenc:
```
node generate-banner.mjs "#C20017" "HOJE MT"     # gera os frames
# (renderiza frames com Chromium → banner_frames/*.png)
node build-gif.mjs banner_frames anuncie-x.gif 110
```
