import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("delete-employee edge function starting up")

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }})
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const payload = await req.json()
    const { employeeId } = payload

    if (!employeeId) {
      throw new Error('Employee ID (UUID) is required.')
    }

    // 1. Delete from profiles
    const { error: profileErr } = await supabase.from('profiles').delete().eq('id', employeeId)
    if (profileErr) throw profileErr

    // 2. Delete auth user
    const { error: authErr } = await supabase.auth.admin.deleteUser(employeeId)
    if (authErr) throw authErr

    return new Response(
      JSON.stringify({ message: 'Employee deleted successfully' }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    )
  } catch (error) {
    console.error("Error deleting employee:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 400,
    })
  }
})
