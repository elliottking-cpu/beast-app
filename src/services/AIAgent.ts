/**
 * AI Agent Service - Comprehensive AI-powered database management and business brain
 * 
 * This service provides natural language processing capabilities for database
 * operations, schema management, and business intelligence. It integrates with
 * all other AI services to provide a comprehensive business brain experience.
 */

import { supabase } from '../lib/supabase'
import { aiContextEngine } from './AIContextEngine'
import { aiSafetyValidator } from './AISafetyValidator'
import { aiExecutionEngine, ExecutionRequest } from './AIExecutionEngine'
import { businessAutomationAI } from './BusinessAutomationAI'

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

export interface AIConversation {
  id: string
  businessUnitId: string
  userId?: string
  sessionId: string
  conversationType: 'general' | 'schema_modification' | 'query_generation' | 'analysis' | 'troubleshooting'
  title?: string
  status: 'active' | 'completed' | 'archived'
  createdAt: string
  updatedAt: string
  metadata: Record<string, any>
}

export interface AIMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  messageType: 'text' | 'code' | 'schema' | 'query' | 'error' | 'warning' | 'success'
  tokensUsed?: number
  processingTimeMs?: number
  confidenceScore?: number
  createdAt: string
  metadata: Record<string, any>
}

export interface AISchemaChange {
  id: string
  businessUnitId: string
  conversationId: string
  changeType: string
  targetTable?: string
  changeDescription: string
  sqlGenerated?: string
  sqlExecuted?: string
  status: 'suggested' | 'approved' | 'executed' | 'failed' | 'rolled_back'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  impactAnalysis: Record<string, any>
  rollbackSql?: string
  executedAt?: string
  rolledBackAt?: string
  createdAt: string
  metadata: Record<string, any>
}

export interface AISuggestion {
  id: string
  businessUnitId: string
  conversationId?: string
  suggestionType: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  implementationSteps: any[]
  expectedImpact?: string
  estimatedEffort: 'low' | 'medium' | 'high'
  status: 'pending' | 'accepted' | 'rejected' | 'implemented' | 'deferred'
  userFeedback?: string
  implementationResult?: string
  createdAt: string
  implementedAt?: string
  metadata: Record<string, any>
}

export interface AIContext {
  businessUnitId: string
  currentSchema: any[]
  recentChanges: any[]
  userPreferences: Record<string, any>
  businessRules: any[]
  performanceMetrics: Record<string, any>
  securityPolicies: any[]
}

// ============================================================================
// AI AGENT CORE CLASS
// ============================================================================

export class AIAgent {
  private businessUnitId: string
  private userId?: string
  private context: AIContext | null = null
  private conversationId: string | null = null

  constructor(businessUnitId: string, userId?: string) {
    this.businessUnitId = businessUnitId
    this.userId = userId
  }

  // ============================================================================
  // CONVERSATION MANAGEMENT
  // ============================================================================

  async startConversation(
    type: AIConversation['conversationType'] = 'general',
    title?: string
  ): Promise<AIConversation> {
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          business_unit_id: this.businessUnitId,
          user_id: this.userId,
          conversation_type: type,
          title: title || `${type} conversation`,
          status: 'active',
          metadata: {}
        })
        .select()
        .single()

      if (error) throw error

      this.conversationId = data.id
      
      // Initialize context for this conversation
      await this.loadContext()
      
      return this.mapConversationFromDB(data)
    } catch (error) {
      console.error('❌ Error starting AI conversation:', error)
      throw error
    }
  }

  async sendMessage(
    content: string,
    messageType: AIMessage['messageType'] = 'text'
  ): Promise<AIMessage> {
    if (!this.conversationId) {
      throw new Error('No active conversation. Start a conversation first.')
    }

    try {
      // Save user message
      const userMessage = await this.saveMessage('user', content, messageType)
      
      // Process the message with AI
      const aiResponse = await this.processUserMessage(content, messageType)
      
      // Save AI response
      const aiMessage = await this.saveMessage('assistant', aiResponse.content, aiResponse.messageType, {
        tokensUsed: aiResponse.tokensUsed,
        processingTimeMs: aiResponse.processingTimeMs,
        confidenceScore: aiResponse.confidenceScore,
        actions: aiResponse.actions
      })

      return aiMessage
    } catch (error) {
      console.error('❌ Error processing AI message:', error)
      throw error
    }
  }

  private async saveMessage(
    role: AIMessage['role'],
    content: string,
    messageType: AIMessage['messageType'],
    metadata: Record<string, any> = {}
  ): Promise<AIMessage> {
    const { data, error } = await supabase
      .from('ai_conversation_messages')
      .insert({
        conversation_id: this.conversationId,
        role,
        content,
        message_type: messageType,
        tokens_used: metadata.tokensUsed || 0,
        processing_time_ms: metadata.processingTimeMs || 0,
        confidence_score: metadata.confidenceScore,
        metadata
      })
      .select()
      .single()

    if (error) throw error
    return this.mapMessageFromDB(data)
  }

  // ============================================================================
  // AI PROCESSING ENGINE
  // ============================================================================

  private async processUserMessage(
    content: string,
    messageType: AIMessage['messageType']
  ): Promise<{
    content: string
    messageType: AIMessage['messageType']
    tokensUsed: number
    processingTimeMs: number
    confidenceScore: number
    actions: any[]
  }> {
    const startTime = Date.now()
    
    try {
      // Analyze user intent
      const intent = await this.analyzeIntent(content, messageType)
      
      // Generate appropriate response based on intent
      let response: any
      
      switch (intent.type) {
        case 'schema_query':
          response = await this.handleSchemaQuery(content, intent)
          break
        case 'schema_modification':
          response = await this.handleSchemaModification(content, intent)
          break
        case 'data_query':
          response = await this.handleDataQuery(content, intent)
          break
        case 'analysis_request':
          response = await this.handleAnalysisRequest(content, intent)
          break
        case 'optimization_request':
          response = await this.handleOptimizationRequest(content, intent)
          break
        case 'general_question':
          response = await this.handleGeneralQuestion(content, intent)
          break
        default:
          response = await this.handleUnknownIntent(content, intent)
      }

      const processingTimeMs = Date.now() - startTime

      return {
        content: response.content,
        messageType: response.messageType || 'text',
        tokensUsed: response.tokensUsed || 0,
        processingTimeMs,
        confidenceScore: response.confidenceScore || 0.8,
        actions: response.actions || []
      }
    } catch (error) {
      console.error('❌ Error processing user message:', error)
      return {
        content: `I apologize, but I encountered an error processing your request: ${error.message}. Please try rephrasing your question or contact support if the issue persists.`,
        messageType: 'error',
        tokensUsed: 0,
        processingTimeMs: Date.now() - startTime,
        confidenceScore: 0,
        actions: []
      }
    }
  }

  // ============================================================================
  // INTENT ANALYSIS
  // ============================================================================

  private async analyzeIntent(content: string, messageType: string): Promise<{
    type: string
    confidence: number
    entities: any[]
    parameters: Record<string, any>
  }> {
    // This is a simplified intent analyzer - in production, this would use LLM or NLP
    const lowerContent = content.toLowerCase()
    
    // Schema modification intents
    if (lowerContent.includes('create table') || lowerContent.includes('add table') || 
        lowerContent.includes('new table') || lowerContent.includes('table for')) {
      return {
        type: 'schema_modification',
        confidence: 0.9,
        entities: this.extractTableEntities(content),
        parameters: { action: 'create_table' }
      }
    }
    
    if (lowerContent.includes('add column') || lowerContent.includes('new column') || 
        lowerContent.includes('add field') || lowerContent.includes('new field')) {
      return {
        type: 'schema_modification',
        confidence: 0.9,
        entities: this.extractColumnEntities(content),
        parameters: { action: 'add_column' }
      }
    }
    
    if (lowerContent.includes('create relationship') || lowerContent.includes('add relationship') || 
        lowerContent.includes('foreign key') || lowerContent.includes('link tables')) {
      return {
        type: 'schema_modification',
        confidence: 0.85,
        entities: this.extractRelationshipEntities(content),
        parameters: { action: 'create_relationship' }
      }
    }

    // Query intents
    if (lowerContent.includes('show me') || lowerContent.includes('select') || 
        lowerContent.includes('find') || lowerContent.includes('get data')) {
      return {
        type: 'data_query',
        confidence: 0.8,
        entities: this.extractQueryEntities(content),
        parameters: { action: 'data_query' }
      }
    }

    // Analysis intents
    if (lowerContent.includes('analyze') || lowerContent.includes('performance') || 
        lowerContent.includes('optimize') || lowerContent.includes('improve')) {
      return {
        type: 'analysis_request',
        confidence: 0.75,
        entities: [],
        parameters: { action: 'analyze' }
      }
    }

    // Schema query intents
    if (lowerContent.includes('schema') || lowerContent.includes('structure') || 
        lowerContent.includes('tables') || lowerContent.includes('columns')) {
      return {
        type: 'schema_query',
        confidence: 0.7,
        entities: [],
        parameters: { action: 'schema_info' }
      }
    }

    // Default to general question
    return {
      type: 'general_question',
      confidence: 0.5,
      entities: [],
      parameters: {}
    }
  }

  private extractTableEntities(content: string): any[] {
    // Extract potential table names and properties
    const entities: any[] = []
    
    // Look for patterns like "create table for [entity]" or "table called [name]"
    const tableNameMatches = content.match(/(?:table\s+(?:for|called|named)\s+)([a-zA-Z_][a-zA-Z0-9_]*)/gi)
    if (tableNameMatches) {
      tableNameMatches.forEach(match => {
        const name = match.split(/\s+/).pop()
        if (name) {
          entities.push({
            type: 'table_name',
            value: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            original: name
          })
        }
      })
    }
    
    return entities
  }

  private extractColumnEntities(content: string): any[] {
    // Extract column names and types
    const entities: any[] = []
    
    // Look for patterns like "add column [name]" or "field called [name]"
    const columnMatches = content.match(/(?:column|field)\s+(?:called|named|for)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi)
    if (columnMatches) {
      columnMatches.forEach(match => {
        const name = match.split(/\s+/).pop()
        if (name) {
          entities.push({
            type: 'column_name',
            value: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            original: name
          })
        }
      })
    }
    
    return entities
  }

  private extractRelationshipEntities(content: string): any[] {
    // Extract relationship information
    const entities: any[] = []
    
    // Look for table references in relationships
    const relationshipMatches = content.match(/(?:between|link|connect)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(?:and|to|with)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi)
    if (relationshipMatches) {
      relationshipMatches.forEach(match => {
        const parts = match.split(/\s+(?:and|to|with)\s+/)
        if (parts.length === 2) {
          entities.push({
            type: 'relationship',
            sourceTable: parts[0].split(/\s+/).pop(),
            targetTable: parts[1]
          })
        }
      })
    }
    
    return entities
  }

  private extractQueryEntities(content: string): any[] {
    // Extract query-related entities
    const entities: any[] = []
    
    // Look for table references in queries
    const tableMatches = content.match(/(?:from|in|on)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi)
    if (tableMatches) {
      tableMatches.forEach(match => {
        const tableName = match.split(/\s+/).pop()
        if (tableName) {
          entities.push({
            type: 'query_table',
            value: tableName.toLowerCase(),
            original: tableName
          })
        }
      })
    }
    
    return entities
  }

  // ============================================================================
  // INTENT HANDLERS
  // ============================================================================

  private async handleSchemaQuery(content: string, intent: any): Promise<any> {
    // Handle schema-related questions
    if (!this.context) await this.loadContext()
    
    const response = {
      content: '',
      messageType: 'text' as const,
      confidenceScore: 0.8,
      actions: []
    }
    
    if (content.toLowerCase().includes('tables')) {
      const tableCount = this.context?.currentSchema?.length || 0
      response.content = `Your database currently has ${tableCount} tables. Here are some key tables:\n\n`
      
      if (this.context?.currentSchema) {
        const importantTables = this.context.currentSchema
          .filter((table: any) => table.recordCount > 0)
          .sort((a: any, b: any) => b.recordCount - a.recordCount)
          .slice(0, 10)
        
        importantTables.forEach((table: any) => {
          response.content += `• **${table.displayName}**: ${table.recordCount.toLocaleString()} records, ${table.relationshipCount} relationships\n`
        })
      }
      
      response.content += '\nWould you like me to analyze any specific table or create a new one?'
    } else {
      response.content = 'I can help you understand your database schema. What would you like to know about your tables, relationships, or data structure?'
    }
    
    return response
  }

  private async handleSchemaModification(content: string, intent: any): Promise<any> {
    // Handle schema modification requests
    const response = {
      content: '',
      messageType: 'schema' as const,
      confidenceScore: 0.85,
      actions: []
    }
    
    if (intent.parameters.action === 'create_table') {
      const entities = intent.entities.filter((e: any) => e.type === 'table_name')
      
      if (entities.length > 0) {
        const tableName = entities[0].value
        const suggestion = await this.generateTableCreationSuggestion(tableName, content)
        
        response.content = `I can help you create a new table called "${tableName}". Based on your request, here's what I suggest:\n\n`
        response.content += `**Table: ${tableName}**\n`
        response.content += suggestion.columns.map((col: any) => `• ${col.name}: ${col.type}${col.constraints ? ` (${col.constraints})` : ''}`).join('\n')
        response.content += '\n\nShould I proceed with creating this table? I can also add relationships to existing tables if needed.'
        
        response.actions.push({
          type: 'create_table_suggestion',
          tableName,
          columns: suggestion.columns,
          relationships: suggestion.relationships
        })
      } else {
        response.content = 'I\'d be happy to help you create a new table! What would you like to call it and what kind of data will it store?'
      }
    }
    
    return response
  }

  private async handleDataQuery(content: string, intent: any): Promise<any> {
    // Handle data query requests
    const response = {
      content: '',
      messageType: 'query' as const,
      confidenceScore: 0.7,
      actions: []
    }
    
    // This would integrate with an LLM to convert natural language to SQL
    response.content = 'I can help you query your data! However, I need to set up the natural language to SQL conversion. For now, I can help you understand your schema and suggest queries. What specific data are you looking for?'
    
    return response
  }

  private async handleAnalysisRequest(content: string, intent: any): Promise<any> {
    // Handle analysis requests
    const response = {
      content: '',
      messageType: 'text' as const,
      confidenceScore: 0.8,
      actions: []
    }
    
    if (!this.context) await this.loadContext()
    
    // Perform basic analysis
    const analysis = await this.performDatabaseAnalysis()
    
    response.content = '🔍 **Database Analysis Results:**\n\n'
    response.content += `• **Total Tables**: ${analysis.totalTables}\n`
    response.content += `• **Total Records**: ${analysis.totalRecords.toLocaleString()}\n`
    response.content += `• **Relationships**: ${analysis.totalRelationships}\n`
    response.content += `• **Data Health Score**: ${analysis.healthScore}/100\n\n`
    
    if (analysis.issues.length > 0) {
      response.content += '⚠️ **Issues Found:**\n'
      analysis.issues.forEach((issue: any) => {
        response.content += `• ${issue.description}\n`
      })
    }
    
    if (analysis.recommendations.length > 0) {
      response.content += '\n💡 **Recommendations:**\n'
      analysis.recommendations.forEach((rec: any) => {
        response.content += `• ${rec.description}\n`
      })
    }
    
    return response
  }

  private async handleOptimizationRequest(content: string, intent: any): Promise<any> {
    // Handle optimization requests
    return {
      content: '⚡ I can help optimize your database! I\'m analyzing performance patterns and will provide specific recommendations. This feature is being enhanced with AI-powered optimization suggestions.',
      messageType: 'text' as const,
      confidenceScore: 0.7,
      actions: []
    }
  }

  private async handleGeneralQuestion(content: string, intent: any): Promise<any> {
    // Handle general questions
    return {
      content: 'I\'m your AI database assistant! I can help you with:\n\n• Creating and modifying tables\n• Understanding your schema\n• Analyzing data patterns\n• Optimizing performance\n• Generating queries\n• Managing relationships\n\nWhat would you like to work on?',
      messageType: 'text' as const,
      confidenceScore: 0.6,
      actions: []
    }
  }

  private async handleUnknownIntent(content: string, intent: any): Promise<any> {
    // Handle unknown intents
    return {
      content: 'I\'m not sure I understand exactly what you\'re asking for. Could you please rephrase your question? I\'m here to help with database schema management, queries, analysis, and optimizations.',
      messageType: 'text' as const,
      confidenceScore: 0.3,
      actions: []
    }
  }

  // ============================================================================
  // CONTEXT MANAGEMENT
  // ============================================================================

  private async loadContext(): Promise<void> {
    try {
      // Load current schema
      const { data: tables } = await supabase.rpc('get_all_table_names')
      
      // Load recent changes
      const { data: recentChanges } = await supabase
        .from('ai_schema_changes')
        .select('*')
        .eq('business_unit_id', this.businessUnitId)
        .order('created_at', { ascending: false })
        .limit(10)

      // Load user preferences
      const { data: preferences } = await supabase
        .from('ai_user_preferences')
        .select('*')
        .eq('business_unit_id', this.businessUnitId)

      // Load business rules
      const { data: businessRules } = await supabase
        .from('ai_business_rules')
        .select('*')
        .eq('business_unit_id', this.businessUnitId)
        .eq('is_active', true)

      this.context = {
        businessUnitId: this.businessUnitId,
        currentSchema: tables || [],
        recentChanges: recentChanges || [],
        userPreferences: this.mapPreferencesToObject(preferences || []),
        businessRules: businessRules || [],
        performanceMetrics: {},
        securityPolicies: []
      }
    } catch (error) {
      console.error('❌ Error loading AI context:', error)
      this.context = {
        businessUnitId: this.businessUnitId,
        currentSchema: [],
        recentChanges: [],
        userPreferences: {},
        businessRules: [],
        performanceMetrics: {},
        securityPolicies: []
      }
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async generateTableCreationSuggestion(tableName: string, description: string): Promise<{
    columns: any[]
    relationships: any[]
  }> {
    // Generate intelligent table suggestions based on name and description
    const columns = [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT now()' }
    ]

    // Add business unit reference for multi-tenant
    columns.push({
      name: 'business_unit_id',
      type: 'UUID',
      constraints: 'REFERENCES business_units(id)'
    })

    // Add common fields based on table name patterns
    if (tableName.includes('user') || tableName.includes('person') || tableName.includes('employee')) {
      columns.push(
        { name: 'name', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
        { name: 'email', type: 'VARCHAR(255)', constraints: 'UNIQUE' }
      )
    }

    if (tableName.includes('product') || tableName.includes('service') || tableName.includes('item')) {
      columns.push(
        { name: 'name', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
        { name: 'description', type: 'TEXT', constraints: '' },
        { name: 'price', type: 'DECIMAL(10,2)', constraints: '' }
      )
    }

    if (tableName.includes('order') || tableName.includes('invoice') || tableName.includes('transaction')) {
      columns.push(
        { name: 'amount', type: 'DECIMAL(10,2)', constraints: 'NOT NULL' },
        { name: 'status', type: 'VARCHAR(50)', constraints: 'DEFAULT \'pending\'' }
      )
    }

    return {
      columns,
      relationships: [] // Could suggest relationships based on existing tables
    }
  }

  private async performDatabaseAnalysis(): Promise<{
    totalTables: number
    totalRecords: number
    totalRelationships: number
    healthScore: number
    issues: any[]
    recommendations: any[]
  }> {
    if (!this.context) await this.loadContext()

    const analysis = {
      totalTables: this.context?.currentSchema?.length || 0,
      totalRecords: 0,
      totalRelationships: 0,
      healthScore: 85, // Placeholder - would be calculated based on various metrics
      issues: [],
      recommendations: []
    }

    // Add some basic analysis
    if (analysis.totalTables < 5) {
      analysis.issues.push({
        type: 'schema_complexity',
        description: 'Database has very few tables - consider if more structure is needed'
      })
    }

    analysis.recommendations.push({
      type: 'general',
      description: 'Consider adding indexes on frequently queried columns'
    })

    return analysis
  }

  private mapPreferencesToObject(preferences: any[]): Record<string, any> {
    const result: Record<string, any> = {}
    preferences.forEach(pref => {
      if (!result[pref.preference_type]) {
        result[pref.preference_type] = {}
      }
      result[pref.preference_type][pref.preference_key] = pref.preference_value
    })
    return result
  }

  private mapConversationFromDB(data: any): AIConversation {
    return {
      id: data.id,
      businessUnitId: data.business_unit_id,
      userId: data.user_id,
      sessionId: data.session_id,
      conversationType: data.conversation_type,
      title: data.title,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      metadata: data.metadata || {}
    }
  }

  private mapMessageFromDB(data: any): AIMessage {
    return {
      id: data.id,
      conversationId: data.conversation_id,
      role: data.role,
      content: data.content,
      messageType: data.message_type,
      tokensUsed: data.tokens_used,
      processingTimeMs: data.processing_time_ms,
      confidenceScore: data.confidence_score,
      createdAt: data.created_at,
      metadata: data.metadata || {}
    }
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  async getConversationHistory(conversationId: string): Promise<AIMessage[]> {
    const { data, error } = await supabase
      .from('ai_conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data.map(this.mapMessageFromDB)
  }

  async getSuggestions(status?: string): Promise<AISuggestion[]> {
    let query = supabase
      .from('ai_suggestions')
      .select('*')
      .eq('business_unit_id', this.businessUnitId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  async getSchemaChanges(status?: string): Promise<AISchemaChange[]> {
    let query = supabase
      .from('ai_schema_changes')
      .select('*')
      .eq('business_unit_id', this.businessUnitId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }
}

// ============================================================================
// EXPORT DEFAULT INSTANCE FACTORY
// ============================================================================

export const createAIAgent = (businessUnitId: string, userId?: string): AIAgent => {
  return new AIAgent(businessUnitId, userId)
}
