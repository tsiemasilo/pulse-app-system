import { db } from "./db";
import { users, userDepartmentAssignments, divisions, departments, sections } from "@shared/schema";
import { eq } from "drizzle-orm";

async function checkAssignments() {
  console.log("Checking all user department assignments...\n");

  // Get all agents
  const allAgents = await db.select().from(users).where(eq(users.role, 'agent'));
  console.log(`Total agents: ${allAgents.length}\n`);

  // Get all assignments
  const allAssignments = await db.select().from(userDepartmentAssignments);
  console.log(`Total assignments: ${allAssignments.length}\n`);

  // Get organizational data
  const allDivisions = await db.select().from(divisions);
  const allDepartments = await db.select().from(departments);
  const allSections = await db.select().from(sections);

  console.log("Agent Assignment Details:");
  console.log("=".repeat(80));

  for (const agent of allAgents) {
    const assignment = allAssignments.find(a => a.userId === agent.id);
    
    if (assignment) {
      const division = allDivisions.find(d => d.id === assignment.divisionId);
      const department = allDepartments.find(d => d.id === assignment.departmentId);
      const section = allSections.find(s => s.id === assignment.sectionId);

      console.log(`\n${agent.firstName} ${agent.lastName} (${agent.username})`);
      console.log(`  Agent ID: ${agent.id}`);
      console.log(`  Division: ${division?.name || 'NONE'} (${assignment.divisionId || 'null'})`);
      console.log(`  Department: ${department?.name || 'NONE'} (${assignment.departmentId || 'null'})`);
      console.log(`  Section: ${section?.name || 'NONE'} (${assignment.sectionId || 'null'})`);
    } else {
      console.log(`\n${agent.firstName} ${agent.lastName} (${agent.username})`);
      console.log(`  Agent ID: ${agent.id}`);
      console.log(`  *** NO ASSIGNMENT FOUND ***`);
    }
  }

  console.log("\n" + "=".repeat(80));
}

checkAssignments()
  .then(() => {
    console.log("\nCheck complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
