import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATEGORIES } from "@seen/shared";
import { generateAllQuestions } from "./question-bank";
import path from "path";
import { config } from "dotenv";

config({ path: path.resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Seen Jeem database...");

  for (const [i, cat] of CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {
        slug: cat.slug,
        nameAr: cat.name.ar,
        nameEn: cat.name.en,
        descriptionAr: cat.description.ar,
        descriptionEn: cat.description.en,
        icon: cat.icon,
        color: cat.color,
        accentColor: cat.accentColor,
        // Keep admin-uploaded covers; only set default if empty
        sortOrder: i,
        isActive: true,
      },
      create: {
        id: cat.id,
        slug: cat.slug,
        nameAr: cat.name.ar,
        nameEn: cat.name.en,
        descriptionAr: cat.description.ar,
        descriptionEn: cat.description.en,
        icon: cat.icon,
        color: cat.color,
        accentColor: cat.accentColor,
        imageUrl: cat.image || null,
        sortOrder: i,
      },
    });
  }
  console.log(`✓ ${CATEGORIES.length} categories`);

  const existing = await prisma.question.count();
  // Always refresh when bank.json is the curated source (force clean seed)
  const force = process.env.FORCE_RESEED === "1" || existing < 1000;
  // Also reseed if old placeholder-style questions remain
  const legacy = await prisma.question.findFirst({
    where: { questionTextAr: { contains: "تنويع" } },
  });
  const needsReseed = force || !!legacy || process.argv.includes("--force");

  if (needsReseed) {
    await prisma.question.deleteMany({});
    const questions = generateAllQuestions();
    const batchSize = 100;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      await prisma.question.createMany({
        data: batch.map((q) => ({
          categoryId: q.categoryId,
          difficulty: q.difficulty,
          points: q.points,
          type: q.type,
          language: q.language,
          questionTextAr: q.questionTextAr,
          questionTextEn: q.questionTextEn,
          answerAr: q.answerAr,
          answerEn: q.answerEn,
          acceptedAnswers: q.acceptedAnswers,
          optionsJson: q.optionsJson ?? undefined,
          explanationAr: q.explanationAr,
          explanationEn: q.explanationEn,
          hintAr: q.hintAr,
          hintEn: q.hintEn,
          mediaType: q.mediaType ?? null,
          mediaUrl: q.mediaUrl ?? null,
          mediaThumbnail: q.mediaThumbnail ?? null,
        })),
      });
    }
    console.log(`✓ ${questions.length} questions`);
  } else {
    console.log(`✓ Questions already seeded (${existing}) — set FORCE_RESEED=1 to refresh`);
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@seenjeem.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123456";
  const hash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: hash, role: "ADMIN", displayName: "المسؤول" },
    create: {
      email: adminEmail,
      passwordHash: hash,
      displayName: "المسؤول",
      role: "ADMIN",
      isGuest: false,
    },
  });
  console.log(`✓ Admin user: ${adminEmail}`);

  const count = await prisma.question.count();
  console.log(`\n✅ Seed complete — ${count} questions ready.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
