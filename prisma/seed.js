const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

const TEAM_NUMBER = 9024;
const KULLANICI_ISIMLERI = [
  "ILGAZ",
  "BATUHAN",
  "BENAN",
  "BERIL",
  "YUSUF",
  "DEMIR BOSTANCI",
  "DEMIR SANGU",
  "DERIN BAGCI",
  "DORUK SAHIN",
  "ALI KAAN",
  "DORUK YILMAZ",
  "MINA",
  "NAZ",
  "NIL",
  "OGUZHAN",
  "RUYA",
  "SARE",
  "SELIN",
  "TOPRAK",
  "CAGAN",
  "ZEYNEP",
  "ILGIN",
  "ONUR",
];

function rastgele4Haneli() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function isimToEmail(isim) {
  return isim.toLowerCase().replace(/\s+/g, ".") + "@placeholder.local";
}

async function main() {
  const list = [];

  // Backfill existing users without email
  const existing = await prisma.user.findMany({ where: { email: null } });
  for (const u of existing) {
    const base = (u.name || u.id).toString().replace(/\s+/g, ".").replace(/[^a-z0-9.-]/gi, "");
    const email = (base + "+" + u.id.slice(-6) + "@placeholder.local").toLowerCase();
    await prisma.user.update({
      where: { id: u.id },
      data: {
        email: email.toLowerCase(),
        fullName: u.name || "User",
        teamNumber: TEAM_NUMBER,
      },
    });
  }

  const adminSifre = "1234";
  const adminHash = await bcrypt.hash(adminSifre, 10);
  const adminEmail = "admin@callister9024.local";

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      fullName: "ADMIN",
      teamNumber: TEAM_NUMBER,
      name: "ADMIN",
      passwordHash: adminHash,
      role: "admin",
    },
    update: { passwordHash: adminHash, fullName: "ADMIN", teamNumber: TEAM_NUMBER },
  });
  list.push({ isim: "ADMIN", email: adminEmail, sifre: adminSifre, rol: "admin" });

  for (const isim of KULLANICI_ISIMLERI) {
    const sifre = rastgele4Haneli();
    const hash = await bcrypt.hash(sifre, 10);
    const email = isimToEmail(isim);
    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        fullName: isim,
        teamNumber: TEAM_NUMBER,
        name: isim,
        passwordHash: hash,
        role: "scout",
      },
      update: { passwordHash: hash, fullName: isim, teamNumber: TEAM_NUMBER },
    });
    list.push({ isim, email, sifre, rol: "scout" });
  }

  const metin =
    "FRC Scouting – Giriş bilgileri\n" +
    "=====================================\n\n" +
    list.map((x) => `${x.email}\t${x.sifre}\t${x.isim}\t(${x.rol})`).join("\n") +
    "\n\nGiriş: e-posta + şifre.\n";

  const dosyaYolu = path.join(__dirname, "..", "SIFRELER.txt");
  fs.writeFileSync(dosyaYolu, metin, "utf8");

  console.log("Hesaplar oluşturuldu. Liste: " + dosyaYolu);
  console.log("\n--- E-posta | Şifre | Ad | Rol ---");
  list.forEach((x) => console.log(x.email, "|", x.sifre, "|", x.isim, "|", x.rol));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
