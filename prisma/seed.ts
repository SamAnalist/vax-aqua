import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

type RosterRow = {
  id: string;
  r: string;
  n: string;
  t: string;
  p: string;
  cn: string;
  ro: string;
  ph: string;
  em?: string;
  lv?: string;
};

type RegionRow = {
  id: string;
  name: string;
  sub: string;
  code: string;
};

async function main() {
  const dataDir = join(process.cwd(), "prisma");
  const regions = JSON.parse(
    readFileSync(join(dataDir, "regions.json"), "utf8"),
  ) as RegionRow[];
  const roster = JSON.parse(
    readFileSync(join(dataDir, "roster.json"), "utf8"),
  ) as RosterRow[];

  const regionBySlug = new Map<string, { id: number; name: string }>();
  for (const region of regions) {
    const row = await prisma.region.upsert({
      where: { slug: region.id },
      update: { name: region.name, subtitle: region.sub, code: region.code },
      create: {
        slug: region.id,
        name: region.name,
        subtitle: region.sub,
        code: region.code,
      },
    });
    regionBySlug.set(region.id, { id: row.id, name: row.name });
  }

  const email = (process.env.SEED_EMAIL || "").trim().toLowerCase();
  const password = process.env.SEED_PASSWORD || "";
  if (!email || !password) {
    throw new Error("SEED_EMAIL and SEED_PASSWORD are required");
  }
  if (process.env.NODE_ENV === "production" && password.length < 12) {
    throw new Error("SEED_PASSWORD must be at least 12 characters in production");
  }
  const name = process.env.SEED_NAME || "דיא";
  const companyName = process.env.SEED_COMPANY || "אביזרי הולכת מים";
  const passwordHash = await bcrypt.hash(password, 12);

  const org = await prisma.organization.upsert({
    where: { slug: "vax-aqua" },
    update: { name: companyName },
    create: { slug: "vax-aqua", name: companyName },
  });

  const resetPassword = process.env.SEED_RESET_PASSWORD === "1";
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      companyName,
      organizationId: org.id,
      ...(resetPassword ? { passwordHash } : {}),
    },
    create: {
      email,
      passwordHash,
      name,
      companyName,
      role: "admin",
      organizationId: org.id,
    },
  });

  await prisma.settings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      silenceDays: 14,
      visitHour: 10,
      outreachTpl: `היי {קשר}, מדבר {אני} מ{חברה}.
עברו {ימים} יום מאז ששוחחנו ואני מתכנן סבב באזור {יישוב}.
אפשר לקפוץ אליך ב{יום}, {תאריך}, בסביבות {שעה}?
תאשר לי ואגיע עם דוגמאות של {מוצר}.`,
    },
  });

  let created = 0;
  let visits = 0;
  for (const row of roster) {
    const region = regionBySlug.get(row.r);
    if (!region) continue;
    const lastVisitAt = row.lv ? new Date(`${row.lv}T09:00:00`) : null;
    const address = row.p && row.p !== "—" ? row.p : region.name;

    const existing = await prisma.customer.findFirst({
      where: { organizationId: org.id, name: row.n, phone: row.ph },
    });
    if (existing) continue;

    const customer = await prisma.customer.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        regionId: region.id,
        name: row.n,
        type: row.t,
        place: row.p,
        contactName: row.cn,
        role: row.ro,
        phone: row.ph,
        email: row.em || "",
        address,
        lastVisitAt,
        status: "active",
        tier: "C",
      },
    });
    created += 1;

    if (lastVisitAt) {
      await prisma.call.create({
        data: {
          customerId: customer.id,
          at: lastVisitAt,
          kind: "visit",
          outcome: "follow",
          summary: `ביקור שטח מתועד ברשימת הלקוחות · ${row.p}`,
          minutes: 45,
        },
      });
      visits += 1;
    }
  }

  console.log(
    `Seed ready. user=${email} customers+${created} documentedVisits+${visits} regions=${regions.length}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
