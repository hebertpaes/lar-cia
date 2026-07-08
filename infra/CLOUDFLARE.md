# Cloudflare — CDN grátis na frente dos portais (carregamento rápido)

O Cloudflare fica na frente da VM: guarda cache das páginas/imagens em pontos
espalhados pelo mundo, comprime, e protege. É de graça no plano Free.

## Passo a passo
1. Crie conta em cloudflare.com → **Add a site** → `odiapolitico.com.br`
   (repita para `hojemt.com.br` e `pacunews.com.br`).
2. O Cloudflare importa os registros DNS. Confira os **A** apontando para o
   **IP da VM** (veja `README.md`).
3. Troque os **nameservers** no seu registrador (onde comprou o domínio) pelos
   dois que o Cloudflare mostrar. Propaga em minutos/horas.
4. Enquanto a Caddy ainda não emitiu o HTTPS, deixe cada registro em
   **DNS only (nuvem cinza)**. Depois que os sites abrirem em `https://`,
   ligue a **nuvem laranja (Proxied)**.

## Ajustes recomendados (por site)
- **SSL/TLS → Overview**: modo **Full (strict)** (a Caddy já tem certificado válido).
- **Speed → Optimization**: ligue **Brotli** e **Auto Minify** (JS/CSS/HTML).
- **Caching → Configuration**: *Caching Level* Standard; *Browser Cache TTL* 4h+.
- **Rules → Cache Rules** (opcional): cache agressivo em `/assets/*` e imagens
  (`/content/images/*`), e **bypass** em `/ghost/*` e `/members/*` (nunca cachear
  o admin nem área logada).

## Por que não dá pra eu fazer isso por você
A troca de nameserver e a conta Cloudflare estão no **seu** registrador/DNS —
este ambiente não tem acesso a eles. Os passos acima levam ~10 min.
