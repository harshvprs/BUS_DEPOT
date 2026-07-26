import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// WARNING: We need the Service Role key to bypass RLS and create users directly via admin API
// But since we can't easily get the service role key from the user without asking, 
// we will just use the anon key with normal signUp and then insert into profiles.
const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);

async function seed() {
  console.log('Seeding Supabase with demo users...');
  
  // Create admin
  const { data: adminAuth, error: adminErr } = await supabase.auth.signUp({
    email: 'manager01@busdepot.com',
    password: 'secretAdmin99',
  });
  
  if (adminErr) {
    console.error('Error creating admin:', adminErr.message);
  } else if (adminAuth.user) {
    const { error: profileErr } = await supabase.from('profiles').insert([
      {
        id: adminAuth.user.id,
        name: 'Admin User',
        employee_id: 'MANAGER01',
        role: 'admin'
      }
    ]);
    if (profileErr) console.error('Error creating admin profile:', profileErr.message);
    else console.log('Admin user created: MANAGER01 / secretAdmin99');
  }

  // Create employee
  const { data: empAuth, error: empErr } = await supabase.auth.signUp({
    email: 'staff01@busdepot.com',
    password: 'staffPass123',
  });

  if (empErr) {
    console.error('Error creating employee:', empErr.message);
  } else if (empAuth.user) {
    const { error: profileErr } = await supabase.from('profiles').insert([
      {
        id: empAuth.user.id,
        name: 'Demo Employee',
        employee_id: 'STAFF01',
        role: 'employee'
      }
    ]);
    if (profileErr) console.error('Error creating employee profile:', profileErr.message);
    else console.log('Employee user created: STAFF01 / staffPass123');
  }
}

seed();
