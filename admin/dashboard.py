#!/usr/bin/env python3
"""
Painel web do Lar&Cia integrado ao Ghost (sem dependências — só stdlib).
Gerencia IMÓVEIS e USUÁRIOS/MEMBROS pela Ghost Admin API.

  GHOST_URL=http://localhost:2368 GHOST_ADMIN_KEY='id:secret' \
    python3 admin/dashboard.py            # abre em http://localhost:8700
"""
import html, os, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from ghost_client import GhostAdmin, GhostError, CATEGORIAS, FINALIDADES

URL = os.environ.get("GHOST_URL", "http://localhost:2368")
KEY = os.environ.get("GHOST_ADMIN_KEY")
PORT = int(os.environ.get("PORT", "8700"))
G = GhostAdmin(URL, KEY) if KEY else None

CSS = """
*{box-sizing:border-box}body{font-family:-apple-system,Inter,sans-serif;margin:0;background:#f6f8fb;color:#1a1f2b}
.top{background:#1976d2;color:#fff;padding:14px 24px;display:flex;gap:20px;align-items:center}
.top b{font-size:18px}.top a{color:#fff;text-decoration:none;opacity:.9}.top a:hover{opacity:1}
.wrap{max-width:1080px;margin:24px auto;padding:0 18px}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px}
.card{background:#fff;border:1px solid #e6eaf0;border-radius:14px;padding:20px}
.card b{font-size:30px;color:#1976d2}.card span{display:block;color:#5a6473;font-size:13px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e6eaf0}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #eef1f5;font-size:14px}
th{background:#f1f4f9;color:#5a6473}
form.inline{display:inline} button{font:inherit;cursor:pointer;border:none;border-radius:8px;padding:7px 12px}
.btn{background:#1976d2;color:#fff}.btn-d{background:#ffe9e9;color:#c0392b}
.panel{background:#fff;border:1px solid #e6eaf0;border-radius:14px;padding:20px;margin:18px 0}
.panel h3{margin:0 0 14px}input,select,textarea{font:inherit;padding:9px 11px;border:1px solid #dfe5ee;border-radius:8px;width:100%}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}label{font-size:12px;color:#5a6473;display:block;margin:8px 0 3px}
h2{margin:4px 0 16px}
"""

def page(title, body):
    return f"<!doctype html><html><head><meta charset=utf-8><title>{title}</title><style>{CSS}</style></head><body>" \
           f"<div class=top><b>Lar&amp;Cia · Painel</b><a href=/>Início</a><a href=/imoveis>Imóveis</a>" \
           f"<a href=/membros>Usuários</a><span style='margin-left:auto;opacity:.8'>Ghost Admin API</span></div>" \
           f"<div class=wrap>{body}</div></body></html>"

def home():
    s = G.stats()
    return page("Painel", f"<h2>Visão geral</h2><div class=cards>"
        f"<div class=card><b>{s['imoveis']}</b><span>Imóveis</span></div>"
        f"<div class=card><b>{s['membros']}</b><span>Usuários / membros</span></div>"
        f"<div class=card><b>{s['blog']}</b><span>Posts de blog</span></div></div>"
        "<p style='color:#5a6473'>Gerencie imóveis e usuários nas abas acima — tudo gravado direto no Ghost.</p>")

def membros():
    ms = G.members_list()
    rows = "".join(
        f"<tr><td>{html.escape(m.get('name') or '—')}</td><td>{html.escape(m['email'])}</td>"
        f"<td>{html.escape(','.join(l['name'] for l in m.get('labels',[])))}</td>"
        f"<td><form class=inline method=post action=/membros/del onsubmit=\"return confirm('Remover?')\">"
        f"<input type=hidden name=id value={m['id']}><button class=btn-d>Remover</button></form></td></tr>"
        for m in ms) or "<tr><td colspan=4 style='color:#8a93a3'>Nenhum usuário ainda.</td></tr>"
    form = ("<div class=panel><h3>Novo usuário</h3><form method=post action=/membros/add>"
            "<div class=grid><div><label>Nome</label><input name=name></div>"
            "<div><label>E-mail*</label><input name=email required></div>"
            "<div><label>Rótulos (vírgula)</label><input name=labels placeholder='lead,site'></div>"
            "<div><label>&nbsp;</label><button class=btn>Adicionar</button></div></div>"
            "<label>Nota</label><input name=note></form></div>")
    return page("Usuários", f"<h2>Usuários / membros ({len(ms)})</h2>{form}"
        f"<table><tr><th>Nome</th><th>E-mail</th><th>Rótulos</th><th></th></tr>{rows}</table>")

def imoveis():
    ps = G.properties_list()
    rows = "".join(
        f"<tr><td>{html.escape(p['title'])}</td><td style='color:#5a6473'>{html.escape((p.get('custom_excerpt') or '')[:70])}</td>"
        f"<td><a href='{URL}{p.get('url','') if p.get('url','').startswith('/') else ''}' target=_blank>ver</a></td>"
        f"<td><form class=inline method=post action=/imoveis/del onsubmit=\"return confirm('Remover imóvel?')\">"
        f"<input type=hidden name=id value={p['id']}><button class=btn-d>Remover</button></form></td></tr>"
        for p in ps) or "<tr><td colspan=4 style='color:#8a93a3'>Nenhum imóvel.</td></tr>"
    cats = "".join(f"<option value={k}>{v}</option>" for k, v in CATEGORIAS.items())
    fins = "".join(f"<option value={k}>{v}</option>" for k, v in {"sale":"Venda","monthly":"Aluguel","daily":"Temporada"}.items())
    form = ("<div class=panel><h3>Novo imóvel</h3><form method=post action=/imoveis/add>"
            "<div class=grid>"
            "<div><label>Título*</label><input name=title required></div>"
            "<div><label>Local</label><input name=location></div>"
            "<div><label>Preço (R$)*</label><input name=price type=number required></div>"
            f"<div><label>Categoria</label><select name=category>{cats}</select></div>"
            f"<div><label>Finalidade</label><select name=rentalType>{fins}</select></div>"
            "<div><label>Quartos</label><input name=bedrooms type=number value=0></div>"
            "<div><label>Banheiros</label><input name=bathrooms type=number value=0></div>"
            "<div><label>Vagas</label><input name=garages type=number value=0></div>"
            "<div><label>Suítes</label><input name=suites type=number value=0></div>"
            "<div><label>Área (m²)</label><input name=area type=number value=0></div>"
            "<div style='grid-column:span 2'><label>Foto (URL)</label><input name=image></div>"
            "</div><label>Descrição</label><textarea name=description rows=2></textarea>"
            "<div style='margin-top:10px'><button class=btn>Publicar imóvel</button></div></form></div>")
    return page("Imóveis", f"<h2>Imóveis ({len(ps)})</h2>{form}"
        f"<table><tr><th>Título</th><th>Resumo</th><th></th><th></th></tr>{rows}</table>")

class H(BaseHTTPRequestHandler):
    def _send(self, body, code=200):
        b = body.encode(); self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8"); self.end_headers(); self.wfile.write(b)
    def _redir(self, to):
        self.send_response(303); self.send_header("Location", to); self.end_headers()
    def _form(self):
        n = int(self.headers.get("Content-Length", 0))
        return {k: v[0] for k, v in urllib.parse.parse_qs(self.rfile.read(n).decode()).items()}
    def log_message(self, *a): pass
    def do_GET(self):
        try:
            r = {"/": home, "/membros": membros, "/imoveis": imoveis}.get(self.path)
            self._send(r() if r else page("404", "<h2>404</h2>"), 200 if r else 404)
        except GhostError as e:
            self._send(page("Erro", f"<h2>Erro Ghost</h2><pre>{html.escape(str(e))}</pre>"), 500)
    def do_POST(self):
        try:
            f = self._form()
            if self.path == "/membros/add":
                G.member_create(f.get("name") or None, f["email"], f.get("note"),
                                f["labels"].split(",") if f.get("labels") else None); self._redir("/membros")
            elif self.path == "/membros/del":
                G.member_delete(f["id"]); self._redir("/membros")
            elif self.path == "/imoveis/add":
                p = {"title": f["title"], "location": f.get("location", ""), "price": float(f["price"]),
                     "category": f.get("category", "casa"), "rentalType": f.get("rentalType", "sale"),
                     "bedrooms": int(f.get("bedrooms", 0)), "bathrooms": int(f.get("bathrooms", 0)),
                     "garages": int(f.get("garages", 0)), "suites": int(f.get("suites", 0)),
                     "area": float(f.get("area", 0) or 0), "description": f.get("description", ""),
                     "images": [f["image"]] if f.get("image") else [], "isVerified": True}
                G.property_create(p); self._redir("/imoveis")
            elif self.path == "/imoveis/del":
                G.property_delete(f["id"]); self._redir("/imoveis")
            else:
                self._send(page("404", "<h2>404</h2>"), 404)
        except (GhostError, KeyError, ValueError) as e:
            self._send(page("Erro", f"<h2>Erro</h2><pre>{html.escape(str(e))}</pre>"), 400)

if __name__ == "__main__":
    if not KEY:
        raise SystemExit("Defina GHOST_ADMIN_KEY (Admin API Key do Ghost).")
    print(f"Painel Lar&Cia em http://localhost:{PORT}  (Ghost: {URL})")
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
