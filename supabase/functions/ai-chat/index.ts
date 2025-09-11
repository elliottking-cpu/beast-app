import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '3600',
}

interface LLMRequest {
  query: string
  context?: any
  conversationHistory?: any[]
  businessUnitId?: string
  userId?: string
}

interface LLMResponse {
  explanation: string
  confidence: number
  sql?: string
  data?: any
  actions?: any[]
  schemaActions?: any[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Parse request
    const { query, context, conversationHistory, businessUnitId, userId }: LLMRequest = await req.json()

    // Get Claude API key from database for the specific business unit
    let claudeApiKey = null
    
    if (businessUnitId) {
      const { data: configData } = await supabaseClient
        .from('ai_config')
        .select('api_key')
        .eq('business_unit_id', businessUnitId)
        .eq('provider', 'anthropic')
        .eq('is_active', true)
        .single()
      
      if (configData && configData.api_key) {
        claudeApiKey = configData.api_key
      }
    }
    
    // Fallback to environment variable if no database config
    if (!claudeApiKey) {
      claudeApiKey = Deno.env.get('CLAUDE_API_KEY')
    }
    
    if (!claudeApiKey) {
      throw new Error('Claude API key not configured. Please set up AI integration.')
    }

    // Build comprehensive business and user context
    const businessContext = await buildBusinessContext(supabaseClient, businessUnitId)
    const userProfile = await buildUserProfile(supabaseClient, businessUnitId, userId)
    
    // Generate sophisticated prompt with user personalization
    const prompt = await generateBusinessPrompt(query, businessContext, conversationHistory, context, userProfile)

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        temperature: 0.1,
        system: `You are an expert business intelligence AI for a septic tank service company. You have deep knowledge of business operations, database management, and strategic planning. Always provide actionable insights with confidence scores.`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('Claude API error:', errorText)
      throw new Error(`Claude API error: ${claudeResponse.status}`)
    }

    const claudeData = await claudeResponse.json()
    const aiResponse = claudeData.content[0].text

    // Parse AI response into structured format
    const structuredResponse = parseAIResponse(aiResponse, query)

    // Log conversation for learning and update user memory
    await logConversation(supabaseClient, userId, query, structuredResponse)
    await updateUserMemory(supabaseClient, businessUnitId, userId, query, structuredResponse)

    // Return structured response
    return new Response(
      JSON.stringify(structuredResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('AI Chat Error:', error)
    
    // Return fallback response
    const fallbackResponse: LLMResponse = {
      explanation: `I encountered an issue processing your request: "${query}". I'm currently running in fallback mode. Please try rephrasing your question or contact support if this persists.`,
      confidence: 0.1,
      data: { error: true, fallback: true }
    }

    return new Response(
      JSON.stringify(fallbackResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  }
})

async function buildBusinessContext(supabase: any, businessUnitId?: string) {
  try {
    // Get business unit info
    let businessUnit = null
    if (businessUnitId) {
      const { data } = await supabase
        .from('business_units')
        .select(`
          id, name, 
          business_unit_types!inner(name)
        `)
        .eq('id', businessUnitId)
        .single()
      businessUnit = data
    }

    // Get schema information
    const { data: tables } = await supabase.rpc('get_all_table_names')
    
    // Get recent business metrics
    const { data: metrics } = await supabase.rpc('get_business_metrics')

    return {
      businessUnit: businessUnit ? {
        id: businessUnit.id,
        name: businessUnit.name,
        type: businessUnit.business_unit_types?.name || 'Unknown'
      } : null,
      availableTables: tables || [],
      currentMetrics: metrics || {},
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error building business context:', error)
    return {
      businessUnit: null,
      availableTables: [],
      currentMetrics: {},
      timestamp: new Date().toISOString(),
      error: 'Failed to load business context'
    }
  }
}

async function buildUserProfile(supabase: any, businessUnitId?: string, userId?: string) {
  if (!businessUnitId || !userId) {
    return null
  }

  try {
    const { data: userProfile } = await supabase.rpc('get_ai_user_profile', {
      p_business_unit_id: businessUnitId,
      p_user_id: userId
    })

    return userProfile && userProfile.length > 0 ? userProfile[0] : null
  } catch (error) {
    console.error('Error building user profile:', error)
    return null
  }
}

async function updateUserMemory(supabase: any, businessUnitId: string, userId: string, query: string, response: any) {
  if (!businessUnitId || !userId) return

  try {
    // Create a simple embedding (in production, you'd use a real embedding service)
    const simpleEmbedding = Array(1536).fill(0).map(() => Math.random() * 0.1)

    // Record the interaction
    await supabase.rpc('record_user_ai_interaction', {
      p_business_unit_id: businessUnitId,
      p_user_id: userId,
      p_interaction_type: 'query',
      p_interaction_data: {
        query: query,
        response_confidence: response.confidence,
        query_type: inferQueryType(query),
        timestamp: new Date().toISOString()
      },
      p_embedding: simpleEmbedding,
      p_outcome_success: response.confidence > 0.7
    })

    // Update user expertise based on query complexity and domain
    const domain = inferDomain(query)
    if (domain) {
      const performanceIndicator = response.confidence || 0.5
      await supabase.rpc('update_user_expertise', {
        p_business_unit_id: businessUnitId,
        p_user_id: userId,
        p_domain: domain,
        p_evidence_data: {
          query: query,
          confidence: response.confidence,
          timestamp: new Date().toISOString()
        },
        p_embedding: simpleEmbedding,
        p_performance_indicator: performanceIndicator
      })
    }

  } catch (error) {
    console.error('Error updating user memory:', error)
  }
}

function inferQueryType(query: string): string {
  const lowerQuery = query.toLowerCase()
  
  if (lowerQuery.includes('add') || lowerQuery.includes('create')) return 'creation'
  if (lowerQuery.includes('show') || lowerQuery.includes('list') || lowerQuery.includes('find')) return 'retrieval'
  if (lowerQuery.includes('analyze') || lowerQuery.includes('report')) return 'analysis'
  if (lowerQuery.includes('update') || lowerQuery.includes('change')) return 'modification'
  if (lowerQuery.includes('delete') || lowerQuery.includes('remove')) return 'deletion'
  if (lowerQuery.includes('help') || lowerQuery.includes('how')) return 'assistance'
  
  return 'general'
}

function inferDomain(query: string): string | null {
  const lowerQuery = query.toLowerCase()
  
  if (lowerQuery.includes('customer') || lowerQuery.includes('client')) return 'customer_management'
  if (lowerQuery.includes('job') || lowerQuery.includes('schedule') || lowerQuery.includes('booking')) return 'job_scheduling'
  if (lowerQuery.includes('revenue') || lowerQuery.includes('financial') || lowerQuery.includes('invoice')) return 'financial_analysis'
  if (lowerQuery.includes('sql') || lowerQuery.includes('query') || lowerQuery.includes('database')) return 'database_queries'
  if (lowerQuery.includes('report') || lowerQuery.includes('analyze') || lowerQuery.includes('insight')) return 'business_analysis'
  if (lowerQuery.includes('staff') || lowerQuery.includes('employee') || lowerQuery.includes('team')) return 'hr_management'
  
  return null
}

function getUserResponseStyle(userProfile: any): string {
  if (!userProfile || !userProfile.communication_preferences) {
    return 'Professional and helpful'
  }
  
  const prefs = userProfile.communication_preferences
  let style = 'Professional'
  
  // Check for formality preference
  const formalityPref = prefs.find((p: any) => p.aspect === 'formality_level')
  if (formalityPref) {
    if (formalityPref.preference.level === 'casual') style = 'Friendly and casual'
    else if (formalityPref.preference.level === 'formal') style = 'Formal and structured'
  }
  
  // Check for detail preference
  const detailPref = prefs.find((p: any) => p.aspect === 'detail_preference')
  if (detailPref) {
    if (detailPref.preference.level === 'concise') style += ', concise responses'
    else if (detailPref.preference.level === 'detailed') style += ', detailed explanations'
  }
  
  return style
}

function generateBusinessPrompt(query: string, businessContext: any, conversationHistory: any[] = [], context: any = {}, userProfile: any = null) {
  const { businessUnit, availableTables, currentMetrics } = businessContext
  
  // Build user personalization context
  let userPersonalization = ''
  if (userProfile) {
    const expertise = userProfile.user_expertise || []
    const communication = userProfile.communication_preferences || []
    const patterns = userProfile.behavior_patterns || []
    const goals = userProfile.active_goals || []
    
    userPersonalization = `
USER PERSONALIZATION:
- Expertise Levels: ${expertise.map((e: any) => `${e.domain}: ${Math.round(e.level * 100)}%`).join(', ') || 'Learning user patterns'}
- Communication Style: ${communication.map((c: any) => `${c.aspect}: ${JSON.stringify(c.preference)}`).join(', ') || 'Adapting to user'}
- Behavior Patterns: ${patterns.map((p: any) => p.type).join(', ') || 'Observing user habits'}
- Active Goals: ${goals.map((g: any) => g.title).join(', ') || 'No active goals set'}
- Preferred Response Style: ${getUserResponseStyle(userProfile)}

PERSONALIZATION INSTRUCTIONS:
- Adapt explanation depth based on user's expertise in the relevant domain
- Use communication style preferences (formal/casual, detailed/concise)
- Reference user's goals when providing recommendations
- Suggest shortcuts for repeated tasks based on behavior patterns
- Remember this user's preferences for future interactions`
  }

  const systemContext = `
BUSINESS CONTEXT:
- Company: Yorkshire Septics (Septic tank services)
- Business Unit: ${businessUnit?.name || 'Unknown'} (${businessUnit?.type || 'Unknown'})
- Available Tables: ${availableTables.slice(0, 20).join(', ')}${availableTables.length > 20 ? '...' : ''}
- Current Metrics: ${JSON.stringify(currentMetrics, null, 2)}

${userPersonalization}

CONVERSATION HISTORY:
${conversationHistory.slice(-3).map((msg: any, i: number) => 
  `${i + 1}. ${msg.type === 'user' ? 'User' : 'AI'}: ${msg.content?.substring(0, 200)}...`
).join('\n')}

CURRENT QUERY: "${query}"

INSTRUCTIONS:
1. Analyze the user's query in the context of septic tank service business operations
2. Provide actionable business insights with specific recommendations
3. PERSONALIZE your response based on the user's expertise, communication style, and goals
4. If database operations are needed, generate appropriate SQL
5. Include confidence score (0.0-1.0) based on data availability and query complexity
6. Suggest schema actions if the AI should highlight tables or show data windows
7. Remember this interaction to improve future responses for this user
8. Format response as JSON with this structure:
{
  "explanation": "Detailed markdown-formatted business analysis (personalized for this user)",
  "confidence": 0.95,
  "sql": "SELECT ... (if database query needed)",
  "data": { "key insights and metrics" },
  "schemaActions": [
    {
      "type": "highlight_tables",
      "tables": ["table1", "table2"],
      "context": "reason for highlighting"
    },
    {
      "type": "show_data_window",
      "windowType": "form|chart|map|workflow",
      "title": "Window Title",
      "content": { "window specific data" }
    }
  ],
  "userLearning": {
    "detectedExpertise": "domain where user showed expertise",
    "suggestedShortcut": "shortcut suggestion based on repeated patterns",
    "goalProgress": "how this relates to user's goals"
  }
}

Focus on practical business value, actionable insights, and personalized user experience.`

  return systemContext
}

function parseAIResponse(aiResponse: string, originalQuery: string): LLMResponse {
  try {
    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        explanation: parsed.explanation || aiResponse,
        confidence: parsed.confidence || 0.8,
        sql: parsed.sql || undefined,
        data: parsed.data || null,
        actions: parsed.actions || [],
        schemaActions: parsed.schemaActions || []
      }
    }
  } catch (error) {
    console.error('Error parsing AI response as JSON:', error)
  }

  // Fallback to text response
  return {
    explanation: aiResponse,
    confidence: 0.7,
    data: { originalQuery, responseType: 'text' }
  }
}

async function logConversation(supabase: any, userId: string | undefined, query: string, response: LLMResponse) {
  try {
    if (!userId) return

    await supabase
      .from('ai_conversations')
      .insert({
        user_id: userId,
        query: query,
        response: response.explanation,
        confidence: response.confidence,
        sql_generated: response.sql,
        metadata: {
          actions: response.actions,
          schemaActions: response.schemaActions,
          data: response.data
        }
      })
  } catch (error) {
    console.error('Error logging conversation:', error)
  }
}
