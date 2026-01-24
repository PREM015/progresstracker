import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.platform.createMany({
    skipDuplicates: true,
    data: [
      {
        slug: "leetcode",
        name: "LeetCode",
        displayName: "LeetCode",
        category: "DSA",
        authType: "SCRAPING",
        supportsAutoSync: true,
        dataPoints: ["problemsSolved", "rating", "streak"],
        website: "https://leetcode.com",
      },
      {
        slug: "github",
        name: "GitHub",
        displayName: "GitHub",
        category: "GIT",
        authType: "OAUTH",
        supportsAutoSync: true,
        dataPoints: ["commits", "repos", "stars"],
        website: "https://github.com",
      },
    ],
  });
}

main()
  .then(() => console.log("✅ Seed complete"))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
