import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const buildCorsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
});

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("Origin"));
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response("Missing Supabase env vars", { status: 500, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authUser, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authUser?.user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const { data: requesterProfile, error: requesterError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", authUser.user.id)
      .maybeSingle();

    if (requesterError || requesterProfile?.role !== "super_admin") {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { email, password, full_name, username } = body ?? {};

    if (!email || !password || !full_name) {
      return new Response("Missing required fields", { status: 400, headers: corsHeaders });
    }

    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        username,
      },
    });

    if (createError || !createdUser?.user) {
      return new Response(createError?.message ?? "Unable to create user", { status: 400, headers: corsHeaders });
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: createdUser.user.id,
      email,
      full_name,
      username,
      role: "sub_admin",
    });

    if (profileError) {
      return new Response(profileError.message, { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ id: createdUser.user.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-sub-admin error", error);
    return new Response("Internal server error", { status: 500, headers: corsHeaders });
  }
});
