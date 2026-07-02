#!/usr/bin/env python3
"""
CLI de gestão do Lar&Cia integrada ao Ghost (sem dependências externas).

Config (variáveis de ambiente):
  GHOST_URL        ex.: http://localhost:2368
  GHOST_ADMIN_KEY  Admin API Key (Settings → Integrations → Add custom integration)

Exemplos:
  python3 admin/larcia.py stats
  python3 admin/larcia.py membros list
  python3 admin/larcia.py membros add --name "Maria" --email maria@x.com --note "Lead do site"
  python3 admin/larcia.py membros rm --email maria@x.com
  python3 admin/larcia.py imoveis list
  python3 admin/larcia.py imoveis add --json novo_imovel.json
  python3 admin/larcia.py imoveis rm --id 65f...
"""
import argparse, json, os, sys
from ghost_client import GhostAdmin, GhostError


def client():
    url = os.environ.get("GHOST_URL", "http://localhost:2368")
    key = os.environ.get("GHOST_ADMIN_KEY")
    if not key:
        sys.exit("Defina GHOST_ADMIN_KEY (Admin API Key do Ghost).")
    return GhostAdmin(url, key)


def cmd_stats(_a):
    s = client().stats()
    print(f"📊 Lar&Cia\n  Imóveis: {s['imoveis']}\n  Posts de blog: {s['blog']}\n  Membros: {s['membros']}")


def cmd_membros(a):
    g = client()
    if a.acao == "list":
        ms = g.members_list()
        print(f"👥 {len(ms)} membro(s):")
        for m in ms:
            labels = ",".join(l["name"] for l in m.get("labels", []))
            print(f"  • {m.get('name') or '(sem nome)':24} {m['email']:32} {labels}")
    elif a.acao == "add":
        m = g.member_create(a.name, a.email, a.note, a.labels.split(",") if a.labels else None)
        print(f"✓ membro criado: {m['email']} (id {m['id']})")
    elif a.acao == "rm":
        m = g.member_find(a.email)
        if not m:
            sys.exit("membro não encontrado: " + a.email)
        g.member_delete(m["id"])
        print(f"✓ membro removido: {a.email}")


def cmd_imoveis(a):
    g = client()
    if a.acao == "list":
        ps = g.properties_list()
        print(f"🏠 {len(ps)} imóvel(is):")
        for p in ps:
            print(f"  • [{p['id'][:8]}] {p['title'][:40]:40} {p.get('custom_excerpt','')[:60]}")
    elif a.acao == "add":
        data = json.load(open(a.json, encoding="utf-8"))
        for p in (data if isinstance(data, list) else [data]):
            post = g.property_create(p)
            print(f"✓ imóvel criado: {post['title']} → {post.get('url','')}")
    elif a.acao == "rm":
        g.property_delete(a.id)
        print(f"✓ imóvel removido: {a.id}")


def main():
    ap = argparse.ArgumentParser(description="Gestão Lar&Cia via Ghost Admin API")
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("stats").set_defaults(fn=cmd_stats)

    mp = sub.add_parser("membros"); mp.set_defaults(fn=cmd_membros)
    mp.add_argument("acao", choices=["list", "add", "rm"])
    mp.add_argument("--name"); mp.add_argument("--email"); mp.add_argument("--note"); mp.add_argument("--labels")

    ip = sub.add_parser("imoveis"); ip.set_defaults(fn=cmd_imoveis)
    ip.add_argument("acao", choices=["list", "add", "rm"])
    ip.add_argument("--json"); ip.add_argument("--id")

    a = ap.parse_args()
    try:
        a.fn(a)
    except GhostError as e:
        sys.exit("Erro Ghost: " + str(e))


if __name__ == "__main__":
    main()
