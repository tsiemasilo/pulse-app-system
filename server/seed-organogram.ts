import { db } from "./db";
import { organizationalPositions } from "@shared/schema";

export async function seedOrganogram() {
  try {
    console.log("Seeding organizational structure...");

    // Create Head of Operations
    const [headOfOps] = await db.insert(organizationalPositions).values({
      title: "Head of Operations",
      subtitle: "Chief Operations Officer",
      parentId: null,
      division: null,
      level: 0,
      displayOrder: 0,
      isActive: true,
    }).returning();

    // Create RAF branch
    const [rafHead] = await db.insert(organizationalPositions).values({
      title: "Head of Operations: Contact Center (RAF)",
      subtitle: null,
      parentId: headOfOps.id,
      division: "RAF",
      level: 1,
      displayOrder: 0,
      isActive: true,
    }).returning();

    const [rafManager] = await db.insert(organizationalPositions).values({
      title: "Contact Center Manager",
      subtitle: "RAF Division",
      parentId: rafHead.id,
      division: "RAF",
      level: 2,
      displayOrder: 0,
      isActive: true,
    }).returning();

    const [rafTeamLeader] = await db.insert(organizationalPositions).values({
      title: "Team Leader",
      subtitle: "RAF Team",
      parentId: rafManager.id,
      division: "RAF",
      level: 3,
      displayOrder: 0,
      isActive: true,
    }).returning();

    await db.insert(organizationalPositions).values({
      title: "Agents",
      subtitle: "Front-line Staff",
      parentId: rafTeamLeader.id,
      division: "RAF",
      level: 4,
      displayOrder: 0,
      isActive: true,
    });

    // Create UIF branch
    const [uifHead] = await db.insert(organizationalPositions).values({
      title: "Head of Operations: Contact Center (UIF)",
      subtitle: null,
      parentId: headOfOps.id,
      division: "UIF",
      level: 1,
      displayOrder: 1,
      isActive: true,
    }).returning();

    const [uifManager] = await db.insert(organizationalPositions).values({
      title: "Contact Center Manager",
      subtitle: "UIF Division",
      parentId: uifHead.id,
      division: "UIF",
      level: 2,
      displayOrder: 0,
      isActive: true,
    }).returning();

    const [uifTeamLeader] = await db.insert(organizationalPositions).values({
      title: "Team Leader",
      subtitle: "UIF Team",
      parentId: uifManager.id,
      division: "UIF",
      level: 3,
      displayOrder: 0,
      isActive: true,
    }).returning();

    await db.insert(organizationalPositions).values({
      title: "Agents",
      subtitle: "Front-line Staff",
      parentId: uifTeamLeader.id,
      division: "UIF",
      level: 4,
      displayOrder: 0,
      isActive: true,
    });

    console.log("✓ Organizational structure seeded successfully");
  } catch (error) {
    console.error("Error seeding organogram:", error);
    throw error;
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedOrganogram()
    .then(() => {
      console.log("Seed completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}
