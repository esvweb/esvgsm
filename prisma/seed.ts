import { PrismaClient, PersonUserType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.package.upsert({
    where: { name: "Vodafone Red 40" },
    update: {},
    create: {
      name: "Vodafone Red 40",
      listPriceTRY: 528,
      isAssignable: true,
      allowedUserTypes: [PersonUserType.SALES_AGENT, PersonUserType.HEAVY_DATA_USER],
    },
  });

  await prisma.package.upsert({
    where: { name: "İşim Yanımda 8" },
    update: {},
    create: {
      name: "İşim Yanımda 8",
      listPriceTRY: 264,
      isAssignable: true,
      allowedUserTypes: [PersonUserType.OFFICE_USER],
    },
  });

  await prisma.package.upsert({
    where: { name: "Minimum Restricted" },
    update: {},
    create: {
      name: "Minimum Restricted",
      listPriceTRY: 0,
      isAssignable: false,
      allowedUserTypes: [],
    },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@esvita.space";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
    },
  });

  console.log("Seed complete.");
  console.log(`Admin login: ${adminEmail} / ${adminPassword} (change after first login)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
