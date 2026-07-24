import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from leave-notifications Edge Function!")

serve(async (req) => {
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

    // Parse the payload (e.g. from a Database Webhook)
    const payload = await req.json()
    const record = payload.record || payload

    if (record.status === 'pending') {
      // Create a notification for the admin
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
      
      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          message: `New leave request submitted.`,
          is_read: false
        }))
        await supabase.from('notifications').insert(notifications)
      }
    } else if (record.status === 'approved' || record.status === 'rejected') {
      // Notify the employee
      await supabase.from('notifications').insert({
        user_id: record.employee_id,
        message: `Your leave request has been ${record.status}.`,
        is_read: false
      })
    }

    return new Response(
      JSON.stringify({ message: 'Notifications processed successfully' }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 400,
    })
  }
})
