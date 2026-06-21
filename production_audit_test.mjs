import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env.local file to get variables
const envLocalContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envLocalContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#\s=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[match[1]] = val;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in .env.local');
  process.exit(1);
}

// Create admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const testEmail = `prod-auth-audit-${Date.now()}@example.com`;
const testPassword = `SuperSecurePass123!`;
let testUserId = null;

async function setupTestUser() {
  console.log(`[SETUP] Creating test user ${testEmail}...`);
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { name: 'Prod Audit Tester' }
  });
  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }
  testUserId = data.user.id;
  console.log(`[SETUP] User created with ID: ${testUserId}`);

  // Update profile to mark has_setup_profile = true
  console.log(`[SETUP] Marking profile as completed for user...`);
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ has_setup_profile: true })
    .eq('user_id', testUserId);

  if (profileError) {
    console.error(`[SETUP] Warning: Failed to update profiles table: ${profileError.message}`);
  } else {
    console.log('[SETUP] Profile set to completed (has_setup_profile = true).');
  }
}

async function cleanupTestUser() {
  if (testUserId) {
    console.log(`[CLEANUP] Deleting test user ${testUserId}...`);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(testUserId);
    if (error) {
      console.error(`[CLEANUP] Warning: Failed to delete test user: ${error.message}`);
    } else {
      console.log('[CLEANUP] Test user deleted successfully.');
    }
  }
}

(async () => {
  try {
    await setupTestUser();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Registry for all network traffic
  const trafficRegistry = [];

  page.on('request', request => {
    const url = request.url();
    if (url.includes('/auth/v1/')) {
      const authEndpoint = url.split('/auth/v1/')[1].split('?')[0];
      const payload = {
        type: 'request',
        endpoint: authEndpoint,
        url: url,
        method: request.method(),
        postData: request.postData() ? JSON.parse(request.postData()) : null,
        timestamp: new Date().toISOString()
      };
      trafficRegistry.push(payload);
      console.log(`[NETWORK REQ] ${request.method()} /auth/v1/${authEndpoint}`);
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/auth/v1/')) {
      const authEndpoint = url.split('/auth/v1/')[1].split('?')[0];
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch (err) {
        bodyText = `<failed to parse: ${err.message}>`;
      }
      const payload = {
        type: 'response',
        endpoint: authEndpoint,
        status: response.status(),
        body: bodyText,
        timestamp: new Date().toISOString()
      };
      trafficRegistry.push(payload);
      console.log(`[NETWORK RES] /auth/v1/${authEndpoint} -> Status ${response.status()}`);
    }
  });

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`[BROWSER PAGE ERROR] ${err.stack}`);
  });

  try {
    console.log('\n==================================================');
    console.log('STEP 1: Test New Account Signup against Production');
    console.log('==================================================');
    await page.goto('https://aura-1-finance.vercel.app');
    await page.waitForLoadState('networkidle');

    await page.click('text=Get Started Free');
    await page.waitForTimeout(1000);

    const signupEmail = `signup-fresh-${Date.now()}@example.com`;
    await page.fill('input[placeholder="Your name"]', 'Prod Audit Tester');
    await page.fill('input[type="email"]', signupEmail);
    await page.fill('input[placeholder="Create a strong password"]', 'SuperSecurePass123!');
    
    // Check agreement
    const isChecked = await page.isChecked('input[type="checkbox"]');
    if (!isChecked) {
      await page.click('input[type="checkbox"]');
    }

    // Submit signup
    await page.click('button:has-text("Sign Up")');
    await page.waitForTimeout(6000);

    // Clear session to reset state for the login test
    console.log('Clearing session state to prepare for login audit...');
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    console.log('\n==================================================');
    console.log('STEP 2: Test User Login (Verified User) against Production');
    console.log('==================================================');
    await page.goto('https://aura-1-finance.vercel.app');
    await page.waitForLoadState('networkidle');

    await page.click('text=Log In');
    await page.waitForTimeout(1000);

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[placeholder="Enter your password"]', testPassword);
    await page.click('button:has-text("Log In")');
    await page.waitForTimeout(8000);

    await page.screenshot({ path: 'C:/Users/susre/.gemini/antigravity/brain/57f9617e-51e1-43af-b78c-a54fe84b1182/scratch/production_dashboard_view.png' });

    console.log('\n==================================================');
    console.log('STEP 3: Test Logout against Production');
    console.log('==================================================');
    const logoutBtn = page.locator('button:has(svg.lucide-log-out)');
    await logoutBtn.click();
    console.log('Logout button clicked.');
    await page.waitForTimeout(5000);

    // Capture screenshot after logout to see what view is shown
    await page.screenshot({ path: 'C:/Users/susre/.gemini/antigravity/brain/57f9617e-51e1-43af-b78c-a54fe84b1182/scratch/production_after_logout.png' });
    console.log('Captured production_after_logout.png screenshot.');

    console.log('\n==================================================');
    console.log('STEP 4: Test Login Again against Production');
    console.log('==================================================');
    await page.click('text=Log In');
    await page.waitForTimeout(1000);

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[placeholder="Enter your password"]', testPassword);
    await page.click('button:has-text("Log In")');
    await page.waitForTimeout(8000);

    console.log('\n==================================================');
    console.log('STEP 5: Test Browser Refresh & Session Restore against Production');
    console.log('==================================================');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(8000);

    fs.writeFileSync(
      'C:/Users/susre/.gemini/antigravity/brain/57f9617e-51e1-43af-b78c-a54fe84b1182/scratch/production_auth_audit_traffic.json',
      JSON.stringify(trafficRegistry, null, 2)
    );
    console.log('Traffic registry saved.');

  } catch (err) {
    console.error('Error during production test execution:', err);
  } finally {
    await browser.close();
    await cleanupTestUser();
  }
})();
