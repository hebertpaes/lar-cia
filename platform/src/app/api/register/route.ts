import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();
  if (!email || !password || String(password).length < 6) {
    return NextResponse.json({ error: "E-mail e senha (mín. 6 caracteres) são obrigatórios." }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    return NextResponse.json({ error: "Este e-mail já tem cadastro." }, { status: 409 });
  }
  const passwordHash = await bcrypt.hash(String(password), 10);
  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash },
  });
  return NextResponse.json({ ok: true });
}
