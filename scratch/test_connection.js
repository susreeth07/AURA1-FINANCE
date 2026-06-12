import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// 1. Load VITE_ keys from .env.local manually to run inside raw Node context
const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const urlMatch = envContent.match(/VITE_SUPABASE_URL=["']?([^"'\r\n]+)/);
    const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=["']?([^"'\r\n]+)/);
    if (urlMatch) supabaseUrl = urlMatch[1];
    if (keyMatch) supabaseAnonKey = keyMatch[1];
  }
} catch (err) {
  console.error('Failed to read .env.local file:', err);
}

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-supabase-project')) {
  console.error('\n❌ ERROR: Supabase keys not configured in .env.local.');
  console.error('Please configure your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  const testEmail = `tester_${Math.floor(Math.random() * 10000)}@testdomain.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Aura Tester';

  console.log('==================================================');
  console.log('       AURA SUPABASE BACKEND INTEGRATION TEST       ');
  console.log('==================================================');
  console.log(`Connecting to: ${supabaseUrl}`);

  try {
    // 1. Create test account (Sign Up)
    console.log(`\n[1/5] Registering test account: ${testEmail}...`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: { name: testName }
      }
    });

    if (signUpError) throw signUpError;
    const userId = signUpData.user?.id;
    console.log(`✅ Registration Success. User UUID: ${userId}`);

    // 2. Wait for PostgreSQL Trigger to execute profile and settings generation
    console.log('\n[2/5] Waiting 2 seconds for PostgreSQL triggers to fire...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Verify public.profiles record was auto-created by auth trigger
    console.log('\n[3/5] Verifying profile record auto-creation...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('❌ Failed to fetch user profile row:', profileError.message);
      throw profileError;
    }
    
    console.log('✅ Profile row detected:');
    console.log(`   - Name: ${profile.name}`);
    console.log(`   - Email: ${profile.email}`);
    console.log(`   - Setup Done: ${profile.has_setup_profile} (Expected: false)`);

    // 4. Verify public.user_settings record was auto-created by trigger
    console.log('\n[4/5] Verifying user_settings record auto-creation...');
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (settingsError) {
      console.error('❌ Failed to fetch user settings row:', settingsError.message);
      throw settingsError;
    }

    console.log('✅ Settings row detected:');
    console.log(`   - Default Theme: ${settings.theme}`);
    console.log(`   - Lock Mode Enabled: ${settings.strict_lock}`);

    // 5. Sign Out
    console.log('\n[5/5] Revoking auth session (logging out)...');
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    console.log('✅ Session revoked successfully.');

    console.log('\n==================================================');
    console.log(' 🎉 SUCCESS: Authentication & Trigger Tests Passed!');
    console.log('==================================================');
    console.log('Note: You can delete this test user from the Auth panel of your Supabase dashboard.');

  } catch (error) {
    console.error('\n❌ TEST RUN FAILED:', error.message || error);
    console.log('==================================================');
    process.exit(1);
  }
}

runTests();
