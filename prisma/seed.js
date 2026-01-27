const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

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

async function main() {
  const list = [];
  const adminSifre = "1234";
  const adminHash = await bcrypt.hash(adminSifre, 10);

  await prisma.user.upsert({
    where: { name: "ADMIN" },
    create: { name: "ADMIN", passwordHash: adminHash, role: "admin" },
    update: { passwordHash: adminHash, role: "admin" },
  });
  list.push({ isim: "ADMIN", sifre: adminSifre, rol: "admin" });

  for (const isim of KULLANICI_ISIMLERI) {
    const sifre = rastgele4Haneli();
    const hash = await bcrypt.hash(sifre, 10);
    await prisma.user.upsert({
      where: { name: isim },
      create: { name: isim, passwordHash: hash, role: "scout" },
      update: { passwordHash: hash, role: "scout" },
    });
    list.push({ isim, sifre, rol: "scout" });
  }

  const metin =
    "FRC Scouting – İsim / Şifre listesi\n" +
    "=====================================\n\n" +
    list.map((x) => `${x.isim}\t${x.sifre}\t(${x.rol})`).join("\n") +
    "\n\nŞifreler 4 hanelidir. Giriş: isim + şifre.\n";

  const dosyaYolu = path.join(__dirname, "..", "SIFRELER.txt");
  fs.writeFileSync(dosyaYolu, metin, "utf8");

  console.log("Hesaplar oluşturuldu. Liste: " + dosyaYolu);
  console.log("\n--- İsim | Şifre | Rol ---");
  list.forEach((x) => console.log(x.isim, "|", x.sifre, "|", x.rol));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
