import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("create-employee edge function starting up")

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
    const { email, name, employee_id, phone } = payload

    if (!email || !name || !employee_id) {
      throw new Error('Email, name, and employee_id are required.')
    }

    // 1. Generate the invite link (this creates the auth user but does NOT send an email)
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      data: { role: 'employee', employee_id, name },
      options: {
        redirectTo: 'https://busdepot.gramoora.com/employee/settings'
      }
    })

    if (linkErr) throw linkErr
    if (!linkData.user) {
      throw new Error('Failed to create user object.')
    }

    // 2. Send the email directly via Resend API (bypassing Supabase SMTP issues)
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is missing from Edge Function Secrets!");
    }
    const actionLink = linkData.properties.action_link;
    
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'BUS_DEPOT <noreply@busdepot.gramoora.com>',
        to: [email],
        subject: 'You have been invited to DepotFlow',
        html: `
          <h2>Welcome to DepotFlow, ${name}!</h2>
          <p>You have been added as an employee with ID: <strong>${employee_id}</strong>.</p>
          <p>Please click the link below to accept your invitation and set up your password:</p>
          <a href="${actionLink}" style="display:inline-block;padding:10px 20px;background-color:#1e3a8a;color:white;text-decoration:none;border-radius:5px;margin-top:10px;">Accept Invitation</a>
          <p style="margin-top:20px;color:#6b7280;font-size:12px;">If you did not expect this invitation, please ignore this email.</p>
        `
      })
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      // Clean up the user since the email failed
      await supabase.auth.admin.deleteUser(linkData.user.id)
      throw new Error(`Resend API Error: ${errText}`);
    }

    const authData = { user: linkData.user };

    // 2. Insert into profiles table
    const { error: profileErr } = await supabase.from('profiles').insert({
      id: authData.user.id,
      name,
      email,
      employee_id,
      phone: phone || null,
      role: 'employee'
    })

    if (profileErr) {
      // Clean up the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw profileErr
    }

    return new Response(
      JSON.stringify({ message: 'Employee created and invited successfully', user: authData.user }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    )
  } catch (error) {
    let debugInfo = "";
    try {
      debugInfo = `Type: ${typeof error} | Constructor: ${error && error.constructor ? error.constructor.name : 'none'} | Keys: ${Object.keys(error || {}).join(',')} | String: ${String(error)} | JSON: ${JSON.stringify(error)}`;
    } catch (e) {
      debugInfo = "Failed to serialize error";
    }
    return new Response(JSON.stringify({ error: debugInfo, rawError: error }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 400,
    })
  }
})
