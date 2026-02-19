import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-scraper-key',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Authentication: validate scraper API key ──────────────────────────────
  const scraperKey = req.headers.get('x-scraper-key');
  const expectedKey = Deno.env.get('SCRAPER_API_KEY');

  if (!scraperKey || scraperKey !== expectedKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: invalid scraper key' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ── Supabase admin client (service role — can bypass RLS) ─────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const body = await req.json();
    const action: string = body.action ?? 'upsert';

    // ── Action: archive expired jobs ─────────────────────────────────────────
    if (action === 'archive_expired') {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'expired', category: 'archived' })
        .lt('last_date', today)
        .neq('status', 'expired');

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, action: 'archive_expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Action: get existing job IDs (for deduplication) ─────────────────────
    if (action === 'get_ids') {
      const { data, error } = await supabase.from('jobs').select('id');
      if (error) throw error;
      const ids = (data ?? []).map((r: { id: string }) => r.id);
      return new Response(
        JSON.stringify({ success: true, ids }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Action: upsert a single job row ──────────────────────────────────────
    if (action === 'upsert') {
      const job = body.job;
      if (!job || !job.id || !job.title || !job.organization) {
        return new Response(
          JSON.stringify({ error: 'Missing required job fields: id, title, organization' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('jobs')
        .upsert(job, { onConflict: 'id', ignoreDuplicates: true });

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, action: 'upsert', id: job.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('ingest-jobs error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
