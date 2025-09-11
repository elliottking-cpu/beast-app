/**
 * LLM Service - Simplified Supabase Edge Function Integration
 * 
 * This service provides a clean interface for AI chat using Supabase Edge Functions
 * with Anthropic Claude integration. Much simpler than the complex multi-provider approach.
 */

import { supabase } from '../lib/supabase'

export interface LLMRequest {
  query: string
  context?: any
  conversationHistory?: any[]
  businessUnitId?: string
  userId?: string
}

export interface LLMResponse {
  explanation: string
  confidence: number
  sql?: string
  data?: any
  actions?: any[]
  schemaActions?: any[]
}

class LLMService {
  private isInitialized = false

  constructor() {
    this.initialize()
  }

  private initialize() {
    try {
      // Check if we can access Supabase
      if (supabase) {
        this.isInitialized = true
        console.log('✅ LLM Service initialized with Supabase Edge Functions + Claude')
      }
    } catch (error) {
      console.error('❌ Failed to initialize LLM Service:', error)
    }
  }

  async processRequest(request: LLMRequest): Promise<LLMResponse> {
    if (!this.isInitialized) {
      return this.getFallbackResponse(request.query)
    }

    try {
      // Get user context automatically
      const userContext = await this.getUserContext()
      
      // Call Supabase Edge Function for AI processing (NEXUS with Claude 4 Sonnet)
      const { data, error } = await supabase.functions.invoke('ai-chat-nexus', {
        body: {
          query: request.query,
          context: request.context,
          conversationHistory: request.conversationHistory,
          businessUnitId: request.businessUnitId || userContext.businessUnitId,
          userId: request.userId || userContext.userId
        }
      })

      if (error) {
        console.error('🚨 Edge Function error:', error)
        return this.getFallbackResponse(request.query)
      }

      console.log('🤖 AI Response received:', data)
      return data as LLMResponse

    } catch (error) {
      console.error('🚨 LLM Service error:', error)
      return this.getFallbackResponse(request.query)
    }
  }

  private getFallbackResponse(query: string): LLMResponse {
    // Intelligent fallback based on query content
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('add') && lowerQuery.includes('customer')) {
      return {
        explanation: `## Add Customer (Offline Mode)

I can help you add a new customer to Yorkshire Septics. In offline mode, I can guide you through the process:

**Required Information:**
- Company/Customer name
- Primary contact details  
- Service address and postcode
- Business unit assignment

**Manual Steps:**
1. Navigate to Customer Management
2. Click "Add New Customer"
3. Fill in the required fields
4. Assign to Yorkshire Septics business unit
5. Save the customer record

**Note:** With AI enabled, I would automatically:
- Check for duplicate customers
- Validate postcode coverage
- Suggest service preferences
- Create the database records for you

To enable full AI capabilities, please configure the Claude API integration.`,
        confidence: 0.4,
        data: { fallback: true, category: 'customer_add' }
      }
    }

    if (lowerQuery.includes('yo') && (lowerQuery.includes('postcode') || lowerQuery.includes('jobs'))) {
      return {
        explanation: `## YO Postcode Jobs (Offline Mode)

I can help you find jobs in YO postcode areas. In offline mode, you can:

**Manual Query:**
\`\`\`sql
SELECT j.id, j.job_type, j.status, j.scheduled_date,
       c.company_name, ca.postcode, s.name as engineer
FROM jobs j
JOIN customer_contacts c ON j.customer_id = c.id
JOIN customer_addresses ca ON c.id = ca.customer_id  
LEFT JOIN staff s ON j.assigned_staff_id = s.id
WHERE ca.postcode LIKE 'YO%'
  AND j.scheduled_date >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY j.scheduled_date, ca.postcode;
\`\`\`

**With AI Enabled:**
- Interactive map visualization
- Route optimization suggestions
- Real-time job status updates
- Geographic clustering analysis
- Automated scheduling recommendations

Configure Claude API to unlock these advanced features.`,
        confidence: 0.5,
        sql: `SELECT j.id, j.job_type, j.status, j.scheduled_date, c.company_name, ca.postcode, s.name as engineer FROM jobs j JOIN customer_contacts c ON j.customer_id = c.id JOIN customer_addresses ca ON c.id = ca.customer_id LEFT JOIN staff s ON j.assigned_staff_id = s.id WHERE ca.postcode LIKE 'YO%' AND j.scheduled_date >= CURRENT_DATE - INTERVAL '1 day' ORDER BY j.scheduled_date, ca.postcode;`,
        data: { fallback: true, category: 'geographic_query' }
      }
    }

    if (lowerQuery.includes('customer') || lowerQuery.includes('client')) {
      return {
        explanation: `## Customer Analysis (Offline Mode)

Basic customer management available in offline mode:

**Available Operations:**
- View customer database and contact information
- Track service history and preferences  
- Manage billing and payment status
- Schedule follow-up services

**Sample Customer Query:**
\`\`\`sql
SELECT c.company_name, c.contact_name, c.email, c.phone,
       COUNT(j.id) as total_jobs,
       MAX(j.scheduled_date) as last_service,
       SUM(j.total_amount) as total_revenue
FROM customer_contacts c
LEFT JOIN jobs j ON c.id = j.customer_id
GROUP BY c.id, c.company_name, c.contact_name, c.email, c.phone
ORDER BY total_revenue DESC;
\`\`\`

**AI-Powered Features (Requires Setup):**
- Predictive customer behavior analysis
- Automated retention campaigns
- Customer lifetime value calculations
- Personalized service recommendations

Set up Claude API integration for advanced customer intelligence.`,
        confidence: 0.4,
        sql: `SELECT c.company_name, c.contact_name, c.email, c.phone, COUNT(j.id) as total_jobs, MAX(j.scheduled_date) as last_service, SUM(j.total_amount) as total_revenue FROM customer_contacts c LEFT JOIN jobs j ON c.id = j.customer_id GROUP BY c.id, c.company_name, c.contact_name, c.email, c.phone ORDER BY total_revenue DESC;`,
        data: { fallback: true, category: 'customer' }
      }
    }

    if (lowerQuery.includes('revenue') || lowerQuery.includes('financial')) {
      return {
        explanation: `## Financial Analysis (Offline Mode)

Basic financial insights available:

**Revenue Query:**
\`\`\`sql
SELECT 
  DATE_TRUNC('month', j.scheduled_date) as month,
  COUNT(j.id) as total_jobs,
  SUM(j.total_amount) as monthly_revenue,
  AVG(j.total_amount) as avg_job_value
FROM jobs j
WHERE j.scheduled_date >= CURRENT_DATE - INTERVAL '12 months'
  AND j.status = 'completed'
GROUP BY DATE_TRUNC('month', j.scheduled_date)
ORDER BY month DESC;
\`\`\`

**Key Metrics Available:**
- Monthly and quarterly revenue reports
- Service type profitability analysis
- Customer payment status monitoring
- Outstanding invoice management

**AI-Enhanced Features (Requires Setup):**
- Revenue forecasting and trend analysis
- Pricing optimization recommendations
- Profit margin analysis by service type
- Automated financial reporting

Configure Claude API for advanced financial intelligence.`,
        confidence: 0.5,
        sql: `SELECT DATE_TRUNC('month', j.scheduled_date) as month, COUNT(j.id) as total_jobs, SUM(j.total_amount) as monthly_revenue, AVG(j.total_amount) as avg_job_value FROM jobs j WHERE j.scheduled_date >= CURRENT_DATE - INTERVAL '12 months' AND j.status = 'completed' GROUP BY DATE_TRUNC('month', j.scheduled_date) ORDER BY month DESC;`,
        data: { fallback: true, category: 'financial' }
      }
    }

    return {
      explanation: `## AI Service Configuration Required

I'm currently running in offline mode and cannot fully process: "${query}"

**Current Capabilities (Offline):**
- Basic database queries and operations
- Manual report generation  
- Standard business workflows
- Data entry and updates

**AI-Powered Features (Requires Setup):**
- Natural language query processing
- Predictive business analytics
- Automated optimization suggestions
- Advanced reporting and insights
- Interactive schema visualization
- Real-time business intelligence

**To Enable Full AI:**
1. Get Anthropic Claude API key
2. Add to Supabase environment variables
3. Deploy the Edge Function
4. Restart the application

Once configured, I'll provide intelligent, context-aware assistance for all your business operations.`,
      confidence: 0.2,
      data: { fallback: true, query, setupRequired: true }
    }
  }

  // Helper method to get user context for AI requests
  async getUserContext(): Promise<{ businessUnitId?: string; userId?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Get user's business unit from the users table
        try {
          const { data: userRecord } = await supabase
            .from('users')
            .select('business_unit_id')
            .eq('id', user.id)
            .single()

          return {
            userId: user.id,
            businessUnitId: userRecord?.business_unit_id
          }
        } catch (profileError) {
          console.warn('Could not get user business unit:', profileError)
          // Return user ID with default business unit (The Septics Group)
          return {
            userId: user.id,
            businessUnitId: 'fcb2dc0c-d521-4b63-bfdb-bb5680474807' // Default to The Septics Group
          }
        }
      }
    } catch (error) {
      console.warn('Could not get user context:', error)
    }

    // Return default context for anonymous users
    return {
      businessUnitId: 'fcb2dc0c-d521-4b63-bfdb-bb5680474807' // Default to The Septics Group
    }
  }

  isAvailable(): boolean {
    return this.isInitialized
  }

  // Check if AI is properly configured (has API key)
  async isAIConfigured(): Promise<boolean> {
    try {
      // Test the edge function with a simple query
      const { error } = await supabase.functions.invoke('ai-chat', {
        body: { query: 'test', context: { test: true } }
      })
      
      // If no error or specific "API key not configured" error, AI is not configured
      return !error || !error.message?.includes('Claude API key not configured')
    } catch (error) {
      return false
    }
  }

  // Get service status for debugging
  async getServiceStatus() {
    const userContext = await this.getUserContext()
    const aiConfigured = await this.isAIConfigured()
    
    return {
      initialized: this.isInitialized,
      aiConfigured,
      userContext,
      supabaseConnected: !!supabase,
      timestamp: new Date().toISOString()
    }
  }
}

// Export singleton instance
export const llmService = new LLMService()

// Export types for use in other components
export type { LLMRequest, LLMResponse }
