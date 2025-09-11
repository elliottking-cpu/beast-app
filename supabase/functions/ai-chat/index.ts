// Edge Function v26 - Claude Sonnet 4 Integration (Manual Deployment)
// Uses correct claude-sonnet-4-20250514 model

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '3600'
};

serve(async (req) => {
  console.log('🚀 Edge Function v26 - Claude Sonnet 4 Integration (Manual Deployment)');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📥 Processing request...');
    
    // Parse request body
    const requestBody = await req.json();
    const { query, businessUnitId, userId } = requestBody;
    console.log('📝 Query:', query);
    console.log('🏢 Business Unit ID:', businessUnitId);
    console.log('👤 User ID:', userId);

    // Initialize Supabase client with service role for system operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase client initialized with service role');

    // Get Claude API key from business unit hierarchy
    console.log('🔍 Starting hierarchical API key lookup...');
    let currentBusinessUnitId = businessUnitId;
    let claudeApiKey = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (!claudeApiKey && currentBusinessUnitId && attempts < maxAttempts) {
      attempts++;
      console.log(`🔍 Checking business unit: ${currentBusinessUnitId} (attempt ${attempts})`);
      
      // Check for API key in current business unit
      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from('ai_config')
        .select('api_key')
        .eq('business_unit_id', currentBusinessUnitId)
        .eq('provider', 'claude')
        .single();

      if (apiKeyData?.api_key) {
        claudeApiKey = apiKeyData.api_key;
        console.log(`✅ Found Claude API key for business unit: ${currentBusinessUnitId}`);
        break;
      }

      // Get parent business unit
      const { data: parentData, error: parentError } = await supabase
        .from('business_units')
        .select('parent_id')
        .eq('id', currentBusinessUnitId)
        .single();

      if (parentError || !parentData?.parent_id) {
        console.log(`❌ No parent found for business unit: ${currentBusinessUnitId}`);
        break;
      }

      currentBusinessUnitId = parentData.parent_id;
      console.log(`⬆️ Moving to parent business unit: ${currentBusinessUnitId}`);
    }

    if (!claudeApiKey) {
      console.error('❌ No Claude API key found in business unit hierarchy');
      return new Response(JSON.stringify({
        error: 'No Claude API key configured for this business unit or its parents'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Call Claude API with CORRECT Claude Sonnet 4 model name
    console.log('🤖 Calling Claude Sonnet 4 API...');
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', // CORRECT CLAUDE SONNET 4 MODEL NAME
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are Claude, an AI assistant created by Anthropic. You're using the claude-sonnet-4-20250514 model, which gives you enhanced reasoning capabilities. You're helping with a septic tank service company's business operations. Please respond to this query: ${query}`
        }]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('❌ Claude API error:', claudeResponse.status, errorText);
      throw new Error(`Claude API error: ${claudeResponse.status} (${errorText})`);
    }

    const claudeData = await claudeResponse.json();
    console.log('✅ Claude Sonnet 4 response received successfully');
    console.log('📄 Raw Claude response structure:', JSON.stringify(claudeData, null, 2));

    // Format response
    const response = {
      explanation: claudeData.content[0].text,
      confidence: 0.95,
      model: 'claude-sonnet-4-20250514',
      rawResponse: claudeData // Include raw response for debugging
    };

    console.log('✅ Sending Claude Sonnet 4 response back to client');
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in Edge Function v26:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});