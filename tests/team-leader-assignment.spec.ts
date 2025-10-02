import { test, expect } from '@playwright/test';

test.describe('Team Leader Assignment Fix', () => {
  test('should save and display team leader assignment when creating a new user', async ({ page }) => {
    console.log('Starting team leader assignment test...');

    // Generate unique username using timestamp
    const timestamp = Date.now();
    const testUsername = `testassignment${timestamp}`;
    const testEmail = `testassignment${timestamp}@test.com`;

    // Step 1: Navigate to login page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Step 2: Log in as admin
    console.log('Logging in as admin...');
    await page.fill('[data-testid="input-username"]', 'admin');
    await page.fill('[data-testid="input-password"]', 'password123');
    await page.click('[data-testid="button-signin"]');

    // Wait for redirect to admin dashboard
    await page.waitForURL('/', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the admin dashboard
    await expect(page.locator('text=System Administration')).toBeVisible({ timeout: 10000 });
    console.log('Successfully logged in and navigated to admin dashboard');

    // Step 3: Open the "Create New User" dialog
    console.log('Opening Create New User dialog...');
    const createButton = page.locator('[data-testid="button-create-user"]');
    await createButton.waitFor({ state: 'visible', timeout: 10000 });
    await createButton.click();

    // Wait for dialog to open
    await page.waitForSelector('[data-testid="input-username"]', { timeout: 10000 });
    console.log('Create User dialog opened');

    // Step 4: Fill in the form
    console.log('Filling in user form...');
    
    // Fill in basic fields
    await page.fill('[data-testid="input-username"]', testUsername);
    await page.fill('[data-testid="input-password"]', 'test123');
    await page.fill('[data-testid="input-firstname"]', 'Test');
    await page.fill('[data-testid="input-lastname"]', 'Assignment');
    await page.fill('[data-testid="input-email"]', testEmail);

    // Select Agent role
    console.log('Selecting Agent role...');
    await page.locator('[data-testid="select-role"]').click();
    await page.locator('[role="option"]', { hasText: 'Agent' }).click();
    
    // Wait for team leader dropdown to appear (only visible for Agent role)
    await page.waitForSelector('[data-testid="select-team-leader"]', { timeout: 5000 });
    console.log('Team leader dropdown is now visible');

    // Select a team leader
    console.log('Selecting a team leader...');
    await page.locator('[data-testid="select-team-leader"]').click();
    
    // Wait for the dropdown options to appear
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    
    // Get all team leader options (excluding "No Team Leader")
    const teamLeaderOptions = page.locator('[role="option"]:not(:has-text("No Team Leader"))');
    const optionCount = await teamLeaderOptions.count();
    
    if (optionCount === 0) {
      console.log('No team leaders available. Creating a team leader first...');
      
      // Close the current dialog
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      // Create a team leader first
      await page.locator('[data-testid="button-create-user"]').click();
      await page.waitForSelector('[data-testid="input-username"]');
      
      await page.fill('[data-testid="input-username"]', `teamleader${timestamp}`);
      await page.fill('[data-testid="input-password"]', 'test123');
      await page.fill('[data-testid="input-firstname"]', 'Team');
      await page.fill('[data-testid="input-lastname"]', 'Leader');
      await page.fill('[data-testid="input-email"]', 'teamleader@test.com');
      
      await page.locator('[data-testid="select-role"]').click();
      await page.locator('[role="option"]', { hasText: 'Team Leader' }).click();
      
      await page.locator('[data-testid="button-submit"]').click();
      
      // Wait for success and dialog to close
      await page.waitForTimeout(2000);
      
      // Now try creating the agent again
      await page.locator('[data-testid="button-create-user"]').click();
      await page.waitForSelector('[data-testid="input-username"]');
      
      await page.fill('[data-testid="input-username"]', testUsername);
      await page.fill('[data-testid="input-password"]', 'test123');
      await page.fill('[data-testid="input-firstname"]', 'Test');
      await page.fill('[data-testid="input-lastname"]', 'Assignment');
      await page.fill('[data-testid="input-email"]', testEmail);
      
      await page.locator('[data-testid="select-role"]').click();
      await page.locator('[role="option"]', { hasText: 'Agent' }).click();
      
      await page.waitForSelector('[data-testid="select-team-leader"]');
      await page.locator('[data-testid="select-team-leader"]').click();
      await page.waitForSelector('[role="option"]');
    }
    
    // Select the first available team leader (not "No Team Leader")
    const firstTeamLeader = page.locator('[role="option"]:not(:has-text("No Team Leader"))').first();
    const selectedTeamLeaderName = await firstTeamLeader.textContent();
    console.log(`Selecting team leader: ${selectedTeamLeaderName}`);
    await firstTeamLeader.click();
    
    // Step 5: Submit the form
    console.log('Submitting form...');
    await page.locator('[data-testid="button-submit"]').click();

    // Step 6: Wait for success confirmation (toast message or dialog closes)
    await page.waitForTimeout(2000); // Give time for the user to be created and dialog to close
    console.log('User created successfully');

    // Step 7: Find and click edit on the newly created user
    console.log('Finding the newly created user in the table...');
    
    // Wait for the table to update - the user should appear in the table
    await page.waitForTimeout(3000);
    
    // Find the row with username - it should be visible after cache invalidation
    const userRow = page.locator('tr', { hasText: testUsername });
    await userRow.waitFor({ state: 'visible', timeout: 15000 });
    
    // Find and click the edit button
    const editButton = userRow.locator('button', { hasText: 'Edit' });
    await editButton.waitFor({ state: 'visible', timeout: 5000 });
    await editButton.click();
    console.log(`Clicked edit button for ${testUsername} user`);

    // Wait for edit dialog to open
    await page.waitForSelector('[data-testid="dialog-edit-user"]', { timeout: 10000 });
    console.log('Edit dialog opened');

    // Step 8: Verify that the team leader dropdown shows the selected team leader
    console.log('Verifying team leader assignment...');
    
    // Wait for the form to fully load
    await page.waitForTimeout(2000);
    
    // Check if the team leader dropdown is visible (it should be for agent role)
    const teamLeaderSelect = page.locator('[data-testid="select-team-leader"]');
    const isTeamLeaderVisible = await teamLeaderSelect.isVisible().catch(() => false);
    
    if (isTeamLeaderVisible) {
      console.log('✅ Team leader dropdown is visible in the edit dialog');
      
      // Get the displayed value from the select trigger
      const displayedValue = await teamLeaderSelect.textContent();
      console.log(`Displayed team leader value: "${displayedValue}"`);
      
      // Verify it contains the selected team leader name and is not "No Team Leader"
      if (displayedValue && !displayedValue.includes('No Team Leader') && displayedValue.includes(selectedTeamLeaderName || '')) {
        console.log('✅ SUCCESS: Team leader assignment was saved correctly!');
        console.log(`Selected team leader "${selectedTeamLeaderName}" is properly displayed in the edit dialog.`);
      } else {
        console.log(`❌ FAILED: Expected "${selectedTeamLeaderName}" but found "${displayedValue}"`);
        throw new Error(`Team leader not saved correctly. Expected "${selectedTeamLeaderName}" but found "${displayedValue}"`);
      }
    } else {
      console.log('❌ FAILED: Team leader dropdown is not visible (user might not be an agent)');
      throw new Error('Team leader dropdown not visible in edit dialog');
    }

    // Step 9: Close the edit dialog
    const cancelButton = page.locator('[data-testid="button-cancel"]');
    await cancelButton.click();
    await page.waitForTimeout(500);
    console.log('Edit dialog closed');

    // Step 10: Report the result
    console.log('\n=== TEST RESULT ===');
    console.log('✅ Team leader assignment fix is working correctly!');
    console.log(`The team leader "${selectedTeamLeaderName}" was successfully saved and displayed when editing the user.`);
    console.log('===================\n');
  });
});
