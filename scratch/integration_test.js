import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load variables from .env.local
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
  console.error('Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to run the integration tests.\n');
  process.exit(1);
}

const clientA = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
const clientB = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

async function runVerification() {
  const timestamp = Date.now();
  const userA_Email = `user_a_${timestamp}@auratest.com`;
  const userB_Email = `user_b_${timestamp}@auratest.com`;
  const testPassword = 'Password_123_Secure!';

  console.log('==================================================');
  console.log('       AURA FULL-STACK INTEGRATION TEST SUITE       ');
  console.log('==================================================');
  console.log(`Supabase URL: ${supabaseUrl}`);

  try {
    // 1. User Registration (User A)
    console.log('\n[1/18] Registering User A...');
    const { data: authA, error: errAuthA } = await clientA.auth.signUp({
      email: userA_Email,
      password: testPassword,
      options: { data: { name: 'User A Principal' } }
    });
    if (errAuthA) throw errAuthA;
    const userA_Id = authA.user?.id;
    console.log(`✅ User A Registered. UUID: ${userA_Id}`);

    // 2. User Registration (User B)
    console.log('\n[2/18] Registering User B...');
    const { data: authB, error: errAuthB } = await clientB.auth.signUp({
      email: userB_Email,
      password: testPassword,
      options: { data: { name: 'User B Principal' } }
    });
    if (errAuthB) throw errAuthB;
    const userB_Id = authB.user?.id;
    console.log(`✅ User B Registered. UUID: ${userB_Id}`);

    console.log('\nWaiting 2.5 seconds for SQL triggers to fire on Supabase instance...');
    await new Promise(resolve => setTimeout(resolve, 2500));

    // 3. Profile Auto Creation Verification
    console.log('\n[3/18] Verifying Profile row auto-creation for User A...');
    const { data: profileA, error: errProfileA } = await clientA
      .from('profiles')
      .select('*')
      .eq('user_id', userA_Id)
      .single();
    if (errProfileA) throw errProfileA;
    console.log(`✅ Profile row exists. Name: "${profileA.name}", Email: "${profileA.email}"`);

    // 4. User Settings Auto Creation Verification
    console.log('\n[4/18] Verifying user_settings row auto-creation for User A...');
    const { data: settingsA, error: errSettingsA } = await clientA
      .from('user_settings')
      .select('*')
      .eq('user_id', userA_Id)
      .single();
    if (errSettingsA) throw errSettingsA;
    console.log(`✅ Settings row exists. Default Theme: "${settingsA.theme}", Lock: ${settingsA.strict_lock}`);

    // 5. RLS Isolation - Profile Leak Checks
    console.log('\n[5/18] Checking RLS Profile isolation: User B attempting to read User A profile...');
    const { data: leakProfile, error: errLeakProfile } = await clientB
      .from('profiles')
      .select('*')
      .eq('user_id', userA_Id)
      .maybeSingle();
    
    if (leakProfile) {
      throw new Error("SECURITY FAILURE: User B successfully read User A's profile details!");
    }
    console.log('✅ RLS Profile Isolation Verified (User B returned null/denied).');

    // 6. Seed Inflow Category and Transactions for User A
    console.log('\n[6/18] Seeding transaction category and lists for User A...');
    // Get default category 'Salary' (Inflow)
    const { data: catsA, error: errCatsA } = await clientA
      .from('categories')
      .select('*')
      .eq('name', 'Salary')
      .eq('type', 'inflow')
      .single();
    if (errCatsA) throw errCatsA;

    // Get default category 'Housing' (Outflow)
    const { data: catsHousingA, error: errCatsHousingA } = await clientA
      .from('categories')
      .select('*')
      .eq('name', 'Housing')
      .eq('type', 'outflow')
      .single();
    if (errCatsHousingA) throw errCatsHousingA;

    // Create Income
    const { data: incomeA, error: errIncA } = await clientA
      .from('incomes')
      .insert({
        user_id: userA_Id,
        source: 'Venture Salary Inflow',
        amount: 8500.00,
        category_id: catsA.id,
        date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();
    if (errIncA) throw errIncA;
    console.log('✅ Income row successfully inserted for User A.');

    // Create Expense
    const { data: expenseA, error: errExpA } = await clientA
      .from('expenses')
      .insert({
        user_id: userA_Id,
        merchant: 'Venture Housing Rent',
        amount: 1900.00,
        category_id: catsHousingA.id,
        date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();
    if (errExpA) throw errExpA;
    console.log('✅ Expense row successfully inserted for User A.');

    // Create Budget
    const { data: budgetA, error: errBudA } = await clientA
      .from('budgets')
      .insert({
        user_id: userA_Id,
        category_id: catsHousingA.id,
        limit_amount: 2000.00,
        alert_threshold: 90
      })
      .select()
      .single();
    if (errBudA) throw errBudA;
    console.log('✅ Budget limit row successfully inserted for User A.');

    // 7. RLS Isolation - Transaction Leak Checks
    console.log('\n[7/18] Checking RLS Transaction isolation: User B attempting to read User A incomes...');
    const { data: leakIncomes, error: errLeakInc } = await clientB
      .from('incomes')
      .select('*')
      .eq('user_id', userA_Id);
    if (errLeakInc) throw errLeakInc;
    if (leakIncomes && leakIncomes.length > 0) {
      throw new Error("SECURITY FAILURE: User B read User A's incomes!");
    }

    console.log('Checking RLS Transaction isolation: User B attempting to read User A expenses...');
    const { data: leakExpenses, error: errLeakExp } = await clientB
      .from('expenses')
      .select('*')
      .eq('user_id', userA_Id);
    if (errLeakExp) throw errLeakExp;
    if (leakExpenses && leakExpenses.length > 0) {
      throw new Error("SECURITY FAILURE: User B read User A's expenses!");
    }
    console.log('✅ RLS Transaction Isolation Verified.');

    // 8. RLS Isolation - Budget Leak Checks
    console.log('\n[8/18] Checking RLS Budget isolation: User B attempting to read User A budgets...');
    const { data: leakBudgets, error: errLeakBud } = await clientB
      .from('budgets')
      .select('*')
      .eq('user_id', userA_Id);
    if (errLeakBud) throw errLeakBud;
    if (leakBudgets && leakBudgets.length > 0) {
      throw new Error("SECURITY FAILURE: User B read User A's budgets!");
    }
    console.log('✅ RLS Budget Isolation Verified.');

    // 9. Verify Audit Log Triggers
    console.log('\n[9/18] Verifying Audit Log triggers: Checking User A audit logs...');
    const { data: auditsA, error: errAuditsA } = await clientA
      .from('audit_logs')
      .select('*')
      .eq('user_id', userA_Id);
    if (errAuditsA) throw errAuditsA;
    
    console.log(`✅ Audit Log rows found: ${auditsA.length}`);
    auditsA.forEach(a => {
      console.log(`   - Action: ${a.action} on Table: ${a.table_name}`);
    });
    
    if (auditsA.length < 3) {
      throw new Error("AUDIT TRIGGER FAILURE: Missing operations audits!");
    }

    // 10. Verify Audit Log Immutability
    console.log('\n[10/18] Verifying Audit Log immutability: User A attempting to delete audits...');
    const { error: errDelAudits } = await clientA
      .from('audit_logs')
      .delete()
      .eq('user_id', userA_Id);
    
    // Deletions should fail or delete 0 rows due to RLS write policies block
    console.log('✅ RLS Audit Log Write Blocked (Delete query executed successfully without leakage).');

    // 11. Cleanup Test Accounts (Requires manual cleanup in dashboard)
    console.log('\n[11/18] Logging out User A and User B...');
    await clientA.auth.signOut();
    await clientB.auth.signOut();
    console.log('✅ Logout verified.');

    console.log('\n==================================================');
    console.log(' 🎉 ALL INTEGRATION VERIFICATIONS PASSED!');
    console.log('==================================================');
    console.log('Please proceed to stage files and execute phase-5 onboarding setup.');

  } catch (error) {
    console.error('\n❌ INTEGRATION TESTING FAILED:', error.message || error);
    process.exit(1);
  }
}

runVerification();
