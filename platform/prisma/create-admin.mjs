// Cria/atualiza um usuário ADMIN com senha definida, para login imediato.
//   npm run db:admin
// Personalize por variáveis de ambiente (opcional):
//   ADMIN_EMAIL=ciencia@msn.com ADMIN_PASSWORD=MinhaSenha ADMIN_NAME="Hebert Paes" npm run db:admin
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const email = process.env.ADMIN_EMAIL || "ciencia@msn.com";
const password = process.env.ADMIN_PASSWORD || "LarCia@2026";
const name = process.env.ADMIN_NAME || "Hebert Paes";

async function main() {
  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: "ADMIN" },
    create: { email, name, passwordHash, role: "ADMIN" },
  });
  console.log("OK: admin pronto para login.");
  console.log("  E-mail: " + user.email);
  console.log("  Senha:  " + password);
  console.log("  Papel:  " + user.role);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
