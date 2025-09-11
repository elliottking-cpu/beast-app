// Edge Function v28 - Claude 4 Sonnet with Full Business Context Access
// Uses claude-sonnet-4-20250514 and injects comprehensive business data
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '3600'
};

serve(async (req) => {
  console.log('🚀 Edge Function v28 - Claude with Full Business Context Access');
  
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

    // Get comprehensive business context using our new AI data access function
    console.log('📊 Fetching comprehensive business context...');
    const { data: businessOverview, error: businessError } = await supabase.rpc('get_ai_business_overview', { 
      business_unit_uuid: businessUnitId 
    });
    
    if (businessError) {
      console.error('❌ Error fetching business context:', businessError);
    } else {
      console.log('✅ Business context loaded successfully');
    }

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

    // Prepare comprehensive business context for Claude
    const businessContextText = businessOverview ? `
COMPREHENSIVE BUSINESS DATA ACCESS:

BUSINESS SUMMARY:
- Total Customers: ${businessOverview.summary.total_customers}
- Total Jobs: ${businessOverview.summary.total_jobs}
- Active Jobs: ${businessOverview.summary.active_jobs}
- Completed Jobs: ${businessOverview.summary.completed_jobs}
- Current Month Revenue: £${businessOverview.summary.current_month_revenue}
- Previous Month Revenue: £${businessOverview.summary.previous_month_revenue}
- Revenue Growth: ${businessOverview.summary.revenue_growth_percent}%

RECENT CUSTOMERS:
${businessOverview.customers?.map(c => `- ${c.name} (${c.type}) - ${c.postcode}`).join('\n') || 'No customers found'}

RECENT JOBS:
${businessOverview.recent_jobs?.map(j => `- Job ${j.job_number}: ${j.title} - ${j.status} - £${j.total_cost} - Customer: ${j.customer_name}`).join('\n') || 'No jobs found'}

FINANCIAL SUMMARY:
- Total Invoiced: £${businessOverview.financial_summary?.total_invoiced || 0}
- Total Paid: £${businessOverview.financial_summary?.total_paid || 0}
- Outstanding: £${businessOverview.financial_summary?.outstanding || 0}

You have FULL ACCESS to this business data and can provide detailed insights, analysis, and recommendations based on real company performance.
` : 'Business data temporarily unavailable.';

    // Call Claude API with comprehensive business context
    console.log('🤖 Calling Claude 4 Sonnet API with comprehensive business context...');
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', // Claude 4 Sonnet model
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are Claude, an AI assistant created by Anthropic. You're using the claude-sonnet-4-20250514 model with enhanced reasoning and coding capabilities. You're helping with a septic tank service company's business operations.

${businessContextText}

IMPORTANT: You now have FULL ACCESS to the company's business data shown above. You can see customer records, job details, financial information, and performance metrics. Use this data to provide informed insights and recommendations.

User Query: ${query}

Please provide a helpful response based on the actual business data provided above.`
        }]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('❌ Claude API error:', claudeResponse.status, errorText);
      throw new Error(`Claude API error: ${claudeResponse.status} (${errorText})`);
    }

    const claudeData = await claudeResponse.json();
    console.log('✅ Claude response received successfully');

    // Format response with business context
    const response = {
      explanation: claudeData.content[0].text,
      confidence: 0.95,
      model: 'claude-sonnet-4-20250514',
      hasBusinessAccess: true,
      businessContext: businessOverview || null,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Sending Claude response with full business context back to client');
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in Edge Function v28:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
