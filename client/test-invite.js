import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY); // Wait, I need SERVICE ROLE KEY for inviteUserByEmail. Let me check if it's in .env.
// In client/.env there is no service role key.
