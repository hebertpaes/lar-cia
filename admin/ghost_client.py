"""
Cliente Python da Ghost Admin API — integração para o painel Lar&Cia.
Sem dependências externas (só stdlib). Gerencia IMÓVEIS (posts #imovel) e
USUÁRIOS/MEMBROS (Members API) — o mesmo mecanismo que o Ghost.org usa para
administrar sua comunidade de membros.

Auth: JWT de curta duração assinado com a Admin API Key (formato id:secret),
exatamente como o cliente oficial do Ghost.
"""
from __future__ import annotations
import base64, hashlib, hmac, json, time, urllib.request, urllib.error
from html import escape

API_VERSION = "v5.0"


def _b64url(raw: bytes) -> bytes:
    return base64.urlsafe_b64encode(raw).rstrip(b"=")


def _make_token(admin_key: str) -> str:
    kid, secret = admin_key.split(":")
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT", "kid": kid},
                                separators=(",", ":")).encode())
    now = int(time.time())
    payload = _b64url(json.dumps({"iat": now, "exp": now + 300, "aud": "/admin/"},
                                 separators=(",", ":")).encode())
    signing = header + b"." + payload
    sig = hmac.new(bytes.fromhex(secret), signing, hashlib.sha256).digest()
    return (signing + b"." + _b64url(sig)).decode()


# ---- formatação de imóvel ------------------------------------------------
CATEGORIAS = {
    "casa": "Casas", "apartamento": "Apartamentos", "luxo": "Alto padrão",
    "condominio": "Condomínio", "piscina": "Com piscina", "fazenda": "Fazendas",
    "sitios_chacaras": "Sítios e chácaras", "florais_da_mata": "Florais da Mata",
    "rural": "Rural", "cuiaba": "Cuiabá", "comercial": "Comercial", "terreno": "Terrenos",
    "praia": "Beira-mar", "exotico": "Exóticos",
}
FINALIDADES = {"sale": "Venda", "monthly": "Aluguel", "daily": "Temporada", "seasonal": "Temporada"}


def brl(n: float) -> str:
    return "R$ " + f"{int(round(n)):,}".replace(",", ".")


def _slug(s: str) -> str:
    import unicodedata, re
    s = unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s)).strip("-")


def property_excerpt(p: dict) -> str:
    suf = "" if p.get("rentalType") == "sale" else ("/diária" if p.get("rentalType") == "daily" else "/mês")
    g = f" 🚗 {p['garages']}" if p.get("garages") else ""
    area = p.get("area", 0)
    area_s = f"{area/10000:.0f} ha" if area >= 10000 else f"{area} m²"
    return f"{brl(p['price'])}{suf} · 🛏 {p.get('bedrooms',0)} 🛁 {p.get('bathrooms',0)}{g} · {area_s} · 📍 {p.get('location','')}"


def property_html(p: dict) -> str:
    imgs = p.get("images", [])
    gallery = ""
    if imgs:
        side = ("<div class='g-side'><img src='%s'><img src='%s'></div>" % (
            escape(imgs[1] if len(imgs) > 1 else imgs[0]),
            escape(imgs[2] if len(imgs) > 2 else imgs[0]))) if len(imgs) > 1 else ""
        gallery = f"<div class='prop-gallery'><img src='{escape(imgs[0])}'>{side}</div>"
    suf = "" if p.get("rentalType") == "sale" else ("/diária" if p.get("rentalType") == "daily" else "/mês")
    area = p.get("area", 0)
    area_s = f"{area/10000:.0f} ha" if area >= 10000 else f"{area} m²"
    specs = (f"<div class='prop-specs'>"
             f"<div class='spec'><b>{p.get('bedrooms',0)}</b><span>Quartos</span></div>"
             f"<div class='spec'><b>{p.get('suites',0)}</b><span>Suítes</span></div>"
             f"<div class='spec'><b>{p.get('bathrooms',0)}</b><span>Banheiros</span></div>"
             f"<div class='spec'><b>{p.get('garages',0)}</b><span>Vagas</span></div>"
             f"<div class='spec'><b>{area_s}</b><span>Área</span></div></div>")
    return f"{gallery}<div class='prop-price'>{brl(p['price'])}{suf}</div>{specs}<p>{escape(p.get('description',''))}</p>"


def property_tags(p: dict) -> list:
    tags = [{"name": CATEGORIAS.get(p["category"], p["category"]), "slug": _slug(p["category"])},
            {"name": FINALIDADES.get(p.get("rentalType", "sale"), "Venda"),
             "slug": _slug(FINALIDADES.get(p.get("rentalType", "sale"), "Venda"))},
            {"name": "#imovel"}]
    if p.get("isVerified"):
        tags.append({"name": "#verificado"})
    return tags


# ---- cliente -------------------------------------------------------------
class GhostError(Exception):
    pass


class GhostAdmin:
    def __init__(self, base_url: str, admin_key: str):
        self.base = base_url.rstrip("/")
        self.admin_key = admin_key

    def _req(self, method: str, path: str, data=None):
        url = f"{self.base}/ghost/api/admin{path}"
        headers = {"Authorization": "Ghost " + _make_token(self.admin_key),
                   "Accept-Version": API_VERSION}
        body = None
        if data is not None:
            body = json.dumps(data).encode()
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                txt = r.read().decode()
                return json.loads(txt) if txt else {}
        except urllib.error.HTTPError as e:
            detail = e.read().decode()
            try:
                detail = json.loads(detail)["errors"][0]["message"]
            except Exception:
                pass
            raise GhostError(f"{e.code} {method} {path}: {detail}")

    # --- site / stats ---
    def site(self):
        return self._req("GET", "/site/")["site"]

    def stats(self):
        imv = self._req("GET", "/posts/?filter=tag:hash-imovel&limit=1&fields=id")["meta"]["pagination"]["total"]
        blog = self._req("GET", "/posts/?filter=tag:hash-post&limit=1&fields=id")["meta"]["pagination"]["total"]
        mem = self._req("GET", "/members/?limit=1")["meta"]["pagination"]["total"]
        return {"imoveis": imv, "blog": blog, "membros": mem}

    # --- MEMBROS (a "comunidade de usuários", como no Ghost.org) ---
    def members_list(self, limit="all"):
        return self._req("GET", f"/members/?limit={limit}&order=created_at%20desc").get("members", [])

    def member_create(self, name, email, note=None, labels=None):
        m = {"name": name, "email": email}
        if note:
            m["note"] = note
        if labels:
            m["labels"] = [{"name": l, "slug": _slug(l)} for l in labels]
        return self._req("POST", "/members/", {"members": [m]})["members"][0]

    def member_delete(self, member_id):
        return self._req("DELETE", f"/members/{member_id}/")

    def member_find(self, email):
        res = self._req("GET", f"/members/?filter=email:'{email}'&limit=1").get("members", [])
        return res[0] if res else None

    # --- IMÓVEIS (posts #imovel) ---
    def properties_list(self, limit="all"):
        return self._req("GET", f"/posts/?filter=tag:hash-imovel&limit={limit}&order=published_at%20desc"
                                f"&fields=id,title,slug,url,status,custom_excerpt,updated_at").get("posts", [])

    def property_create(self, p: dict):
        post = {"title": p["title"], "status": "published",
                "tags": property_tags(p), "custom_excerpt": property_excerpt(p),
                "feature_image": (p.get("images") or [None])[0], "html": property_html(p)}
        return self._req("POST", "/posts/?source=html", {"posts": [post]})["posts"][0]

    def property_delete(self, post_id):
        return self._req("DELETE", f"/posts/{post_id}/")
