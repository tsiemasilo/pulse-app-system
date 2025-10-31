import { db } from "./db";
import { users, divisions, departments, sections, userDepartmentAssignments } from "@shared/schema";
import { notInArray, sql } from "drizzle-orm";

async function assignRandomDepartments() {
  console.log("Starting department assignment migration...");

  // Get all divisions, departments, and sections
  const allDivisions = await db.select().from(divisions);
  const allDepartments = await db.select().from(departments);
  const allSections = await db.select().from(sections);

  console.log(`Found ${allDivisions.length} divisions, ${allDepartments.length} departments, ${allSections.length} sections`);

  if (allDivisions.length === 0 || allDepartments.length === 0 || allSections.length === 0) {
    console.log("No organizational structure found. Please create divisions, departments, and sections first.");
    return;
  }

  // Get all user IDs that already have assignments
  const existingAssignments = await db
    .select({ userId: userDepartmentAssignments.userId })
    .from(userDepartmentAssignments);
  
  const assignedUserIds = existingAssignments.map(a => a.userId);

  // Get all agents without assignments
  let unassignedAgents;
  if (assignedUserIds.length > 0) {
    unassignedAgents = await db
      .select()
      .from(users)
      .where(sql`${users.role} = 'agent' AND ${users.id} NOT IN (${sql.join(assignedUserIds.map(id => sql`${id}`), sql`, `)})`);
  } else {
    unassignedAgents = await db
      .select()
      .from(users)
      .where(sql`${users.role} = 'agent'`);
  }

  console.log(`Found ${unassignedAgents.length} unassigned agents`);

  if (unassignedAgents.length === 0) {
    console.log("All agents are already assigned to departments.");
    return;
  }

  // Create valid division -> department -> section combinations
  const validCombinations: Array<{
    divisionId: string;
    departmentId: string;
    sectionId: string;
  }> = [];

  for (const division of allDivisions) {
    const divisionsoDepts = allDepartments.filter(d => d.divisionId === division.id);
    
    for (const dept of divisionsoDepts) {
      const deptSections = allSections.filter(s => s.departmentId === dept.id);
      
      if (deptSections.length > 0) {
        for (const section of deptSections) {
          validCombinations.push({
            divisionId: division.id,
            departmentId: dept.id,
            sectionId: section.id,
          });
        }
      }
    }
  }

  console.log(`Created ${validCombinations.length} valid organizational combinations`);

  if (validCombinations.length === 0) {
    console.log("No valid organizational combinations found. Please ensure divisions, departments, and sections are properly linked.");
    return;
  }

  // Assign each agent to a random combination
  let assignedCount = 0;
  for (const agent of unassignedAgents) {
    const randomIndex = Math.floor(Math.random() * validCombinations.length);
    const combo = validCombinations[randomIndex];

    await db.insert(userDepartmentAssignments).values({
      userId: agent.id,
      divisionId: combo.divisionId,
      departmentId: combo.departmentId,
      sectionId: combo.sectionId,
      assignedBy: agent.id, // Self-assigned for migration purposes
    });

    assignedCount++;
    console.log(`Assigned ${agent.firstName} ${agent.lastName} (${agent.username}) to division/department/section`);
  }

  console.log(`\nMigration complete! Assigned ${assignedCount} agents to departments.`);
}

// Run the migration
assignRandomDepartments()
  .then(() => {
    console.log("Migration finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
