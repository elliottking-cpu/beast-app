// NEXUS - AI Business Partner Edge Function
// Claude 4 Sonnet with conversational personality and full business control
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '3600'
};

serve(async (req) => {
  console.log('🚀 NEXUS AI Business Partner - Edge Function');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📥 Processing NEXUS request...');
    
    // Parse request body
    const requestBody = await req.json();
    const { query, businessUnitId, userId, context, conversationHistory } = requestBody;
    
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

    // Get comprehensive business context using our AI data access function
    console.log('📊 Fetching comprehensive business context for NEXUS...');
    const { data: businessOverview, error: businessError } = await supabase.rpc('get_ai_business_overview', { 
      business_unit_uuid: businessUnitId 
    });
    
    if (businessError) {
      console.error('❌ Error fetching business context:', businessError);
    } else {
      console.log('✅ Business context loaded successfully for NEXUS');
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
        .select('parent_business_unit_id')
        .eq('id', currentBusinessUnitId)
        .single();
        
      if (parentError || !parentData?.parent_business_unit_id) {
        console.log(`❌ No parent found for business unit: ${currentBusinessUnitId}`);
        break;
      }
      
      currentBusinessUnitId = parentData.parent_business_unit_id;
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

    // Prepare conversation history context
    const conversationContext = conversationHistory && conversationHistory.length > 0 
      ? `\n\nRECENT CONVERSATION HISTORY:\n${conversationHistory.map(msg => 
          `${msg.type === 'user' ? 'User' : 'NEXUS'}: ${msg.content}`
        ).join('\n')}\n`
      : '';

    // Prepare comprehensive business context for NEXUS
    const businessContextText = businessOverview ? `
NEXUS BUSINESS DATA ACCESS:

BUSINESS PERFORMANCE OVERVIEW:
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

BUSINESS UNITS:
${businessOverview.business_units?.map(bu => `- ${bu.name} (${bu.type}) - ${bu.is_active ? 'Active' : 'Inactive'}`).join('\n') || 'No business units found'}

AI CONFIGURATION:
${businessOverview.ai_configuration?.map(ac => `- ${ac.provider} ${ac.model_name} for ${ac.business_unit_name} - ${ac.is_active ? 'Active' : 'Inactive'}`).join('\n') || 'No AI config found'}

DATABASE SCHEMA:
- Total Tables: ${businessOverview.database_schema?.total_tables || 0}
- Available Tables: ${businessOverview.database_schema?.table_list?.map(t => t.table_name).join(', ') || 'None'}
` : 'Business data temporarily unavailable.';

    // Call Claude API with NEXUS personality and comprehensive business context
    console.log('🤖 Calling Claude 4 Sonnet API as NEXUS...');
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', // Claude 4 Sonnet model
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are NEXUS, an advanced AI business partner created using Claude 4 Sonnet (claude-sonnet-4-20250514). You are NOT just a data retrieval system - you are a conversational, intelligent business partner with full access to and control over this septic tank service company's operations.

NEXUS PERSONALITY & CAPABILITIES:
- You are conversational, friendly, and intelligent - you can chat casually or dive deep into business strategy
- You can say "hi" back, make jokes, discuss weather, or have any normal conversation
- You are proactive - you spot opportunities, highlight problems, and suggest improvements
- You can create data (add customers, jobs, invoices) not just retrieve it
- You can analyze trends, predict outcomes, and provide strategic advice
- You can control the dynamic display window to show charts, reports, forms, or visualizations
- You have full business intelligence and can make recommendations
- You remember context and build relationships with users over time

DISPLAY CONTROL:
When you want to show something in the dynamic display panel, include a DISPLAY command in your response like:
DISPLAY: {"type": "chart", "title": "Revenue Trends", "data": {...}}
DISPLAY: {"type": "table", "title": "Customer List", "data": [...]}
DISPLAY: {"type": "report", "title": "Business Analysis", "data": {...}}
DISPLAY: {"type": "form", "title": "Add New Customer", "data": {...}}

${businessContextText}

${conversationContext}

CURRENT USER QUERY: ${query}

Respond as NEXUS - be conversational, intelligent, and helpful. If it's a simple greeting, respond naturally. If it's a business question, provide insights using the real data above. If you see opportunities for improvement or analysis, mention them. Remember, you're not just answering questions - you're a business partner who can take action and provide strategic value.`
        }]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('❌ Claude API error:', claudeResponse.status, errorText);
      throw new Error(`Claude API error: ${claudeResponse.status} (${errorText})`);
    }

    const claudeData = await claudeResponse.json();
    console.log('✅ NEXUS response received successfully');

    // Format response with business context
    const response = {
      explanation: claudeData.content[0].text,
      confidence: 0.98,
      model: 'claude-sonnet-4-20250514',
      aiName: 'NEXUS',
      hasBusinessAccess: true,
      businessContext: businessOverview || null,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Sending NEXUS response with full business context back to client');
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in NEXUS Edge Function:', error);
    return new Response(JSON.stringify({
      error: error.message || 'NEXUS encountered an internal error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
