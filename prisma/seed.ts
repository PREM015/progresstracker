import { prisma } from "../src/lib/prisma";
import { platforms } from "../src/config/platforms";

async function main() {
  console.log("🌱 Seeding all platforms from config...");

  // Map category names to database enum values
  const categoryMap: Record<string, string> = {
    dsa: "DSA",
    job: "JOB",
    git: "GIT",
    learning: "LEARNING",
    hackathon: "HACKATHON",
    opensource: "OPENSOURCE",
    company: "COMPANY",
  };

  // Map auth types to database enum values
  const authTypeMap: Record<string, string> = {
    oauth: "OAUTH",
    api: "API",
    scraping: "SCRAPING",
    manual: "MANUAL",
  };

  let created = 0;
  let updated = 0;

  for (const platform of platforms) {
    try {
      const category = categoryMap[platform.category as string] || "OTHER";
      const authType = authTypeMap[platform.authType as string] || "MANUAL";

      await prisma.platform.upsert({
        where: { slug: platform.slug }, // check by slug (unique)
        update: {
          name: platform.name,
          displayName: platform.displayName,
          category,
          authType,
          website: platform.website,
          icon: platform.icon || `/icons/${platform.slug}.svg`,
          color: platform.color,
          supportsAutoSync: platform.supportsAutoSync,
          dataPoints: platform.dataPoints.join(","),
          description: platform.description || "",
        },
        create: {
          id: platform.id,
          slug: platform.slug,
          name: platform.name,
          displayName: platform.displayName,
          category,
          authType,
          website: platform.website,
          icon: platform.icon || `/icons/${platform.slug}.svg`,
          color: platform.color,
          supportsAutoSync: platform.supportsAutoSync,
          dataPoints: platform.dataPoints.join(","),
          description: platform.description || "",
        },
      });

      // Count whether it existed or was new
      const existing = await prisma.platform.findUnique({
        where: { slug: platform.slug },
      });
      if (existing) updated++;
      else created++;
    } catch (error) {
      console.error(`❌ Failed to upsert ${platform.name}:`, error);
    }
  }

  console.log(`✅ Platforms upserted: ${platforms.length}`);
  console.log(`✅ Created: ${created}`);
  console.log(`🔄 Updated: ${updated}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
