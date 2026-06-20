import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseAnonKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL=["']?([^"'\r\n]+)/);
  const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=["']?([^"'\r\n]+)/);
  if (urlMatch) supabaseUrl = urlMatch[1];
  if (keyMatch) supabaseAnonKey = keyMatch[1];
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const email = 'tester_2567@testdomain.com';
  const password = 'TestPassword123!';
  
  console.log(`Attempting to sign in with ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    console.error('Sign-in failed:', error.message);
  } else {
    console.log('Sign-in succeeded!');
    console.log('Session user ID:', data.user?.id);
    console.log('Access token exists:', !!data.session?.access_token);
    
    // Now let's try to query the profiles table as this authenticated user
    console.log('Querying profile...');
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', data.user?.id)
      .single();
      
    if (profileErr) {
      console.error('Profile query failed:', profileErr.message);
    } else {
      console.log('Profile query succeeded:', profile);
    }
  }
}

test();
