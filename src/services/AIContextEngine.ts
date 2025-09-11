/**
 * AI Context Engine - The Brain's Memory and Understanding System
 * 
 * This engine provides contextual awareness for the Business Brain AI,
 * understanding the current schema, business rules, user intent, and
 * maintaining persistent memory across sessions.
 */

import { supabase } from '../lib/supabase'

// Core interfaces for the AI Context Engine
export interface BusinessContext {
  businessUnit: {
    id: string
    name: string
    type: string
    parentId?: string
  }
  currentUser: {
    id: string
    name: string
    role: string
    permissions: string[]
  }
  sessionContext: {
    sessionId: string
    startTime: Date
    currentPage: string
    recentActions: ActionHistory[]
  }
}

export interface SchemaContext {
  tables: TableMetadata[]
  relationships: RelationshipMetadata[]
  businessRules: BusinessRule[]
  dataLineage: DataLineageMap
  performanceMetrics: PerformanceMetrics
}

export interface ActionHistory {
  id: string
  timestamp: Date
  action: string
  context: Record<string, any>
  outcome: 'success' | 'failure' | 'pending'
  aiConfidence?: number
}

export interface BusinessRule {
  id: string
  name: string
  description: string
  type: 'validation' | 'workflow' | 'calculation' | 'security'
  conditions: Record<string, any>
  actions: Record<string, any>
  isActive: boolean
  priority: number
}

export interface TableMetadata {
  name: string
  purpose: string
  businessFunction: string
  recordCount: number
  lastModified: Date
  accessFrequency: number
  criticalityScore: number
  complianceLevel: 'high' | 'medium' | 'low'
}

export interface RelationshipMetadata {
  fromTable: string
  toTable: string
  type: '1:1' | '1:many' | 'many:many'
  strength: number // 0-1 indicating relationship importance
  businessMeaning: string
}

export interface DataLineageMap {
  [tableName: string]: {
    sources: string[]
    destinations: string[]
    transformations: string[]
  }
}

export interface PerformanceMetrics {
  queryTimes: Record<string, number>
  bottlenecks: string[]
  optimizationOpportunities: string[]
}

export interface AIMemory {
  userPreferences: Record<string, any>
  learnedPatterns: Pattern[]
  decisionHistory: Decision[]
  businessInsights: Insight[]
}

export interface Pattern {
  id: string
  type: string
  description: string
  confidence: number
  occurrences: number
  lastSeen: Date
}

export interface Decision {
  id: string
  context: string
  decision: string
  reasoning: string
  outcome: string
  confidence: number
  timestamp: Date
}

export interface Insight {
  id: string
  category: string
  insight: string
  impact: 'high' | 'medium' | 'low'
  actionable: boolean
  timestamp: Date
}

export class AIContextEngine {
  private businessContext: BusinessContext | null = null
  private schemaContext: SchemaContext | null = null
  private aiMemory: AIMemory | null = null
  private contextCache: Map<string, any> = new Map()

  /**
   * Initialize the context engine with current business and user context
   */
  async initialize(businessUnitId: string, userId: string): Promise<void> {
    console.log('🧠 Initializing AI Context Engine...')
    
    try {
      // Load business context
      await this.loadBusinessContext(businessUnitId, userId)
      
      // Load schema context
      await this.loadSchemaContext()
      
      // Load AI memory
      await this.loadAIMemory(userId)
      
      console.log('✅ AI Context Engine initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize AI Context Engine:', error)
      throw error
    }
  }

  /**
   * Load business context including user, business unit, and session info
   */
  private async loadBusinessContext(businessUnitId: string, userId: string): Promise<void> {
    // Load business unit info
    const { data: businessUnit, error: buError } = await supabase
      .from('business_units')
      .select(`
        id, 
        name, 
        parent_business_unit_id,
        business_unit_types!inner(name)
      `)
      .eq('id', businessUnitId)
      .single()

    if (buError) throw buError

    // Load user info with permissions
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id, first_name, last_name, email,
        job_role:job_roles(name),
        user_type:user_types(name)
      `)
      .eq('id', userId)
      .single()

    if (userError) throw userError

    // Create session context
    const sessionId = crypto.randomUUID()
    
    this.businessContext = {
      businessUnit: {
        id: businessUnit.id,
        name: businessUnit.name,
        type: businessUnit.business_unit_types?.name || 'Unknown',
        parentId: businessUnit.parent_business_unit_id
      },
      currentUser: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        role: user.job_role?.name || 'Unknown',
        permissions: [] // TODO: Load actual permissions
      },
      sessionContext: {
        sessionId,
        startTime: new Date(),
        currentPage: 'business-brain',
        recentActions: []
      }
    }

    // Store session in database
    await supabase.from('ai_conversations').insert({
      business_unit_id: businessUnitId,
      user_id: userId,
      session_id: sessionId,
      conversation_type: 'business_brain',
      title: 'Business Brain Session',
      status: 'active'
    })
  }

  /**
   * Load schema context including tables, relationships, and business rules
   */
  private async loadSchemaContext(): Promise<void> {
    // Get all tables with metadata
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_tables_basic_info')

    if (tablesError) throw tablesError

    // Build table metadata
    const tableMetadata: TableMetadata[] = tables.map(table => ({
      name: table.table_name,
      purpose: this.inferTablePurpose(table.table_name),
      businessFunction: this.inferBusinessFunction(table.table_name),
      recordCount: table.estimated_row_count || 0,
      lastModified: new Date(), // TODO: Get actual last modified
      accessFrequency: 0, // TODO: Calculate from logs
      criticalityScore: this.calculateCriticalityScore(table.table_name),
      complianceLevel: this.assessComplianceLevel(table.table_name)
    }))

    // Load business rules
    const { data: businessRules, error: rulesError } = await supabase
      .from('ai_business_rules')
      .select('*')
      .eq('is_active', true)

    const rules: BusinessRule[] = businessRules?.map(rule => ({
      id: rule.id,
      name: rule.rule_name,
      description: rule.description,
      type: rule.rule_type,
      conditions: rule.conditions,
      actions: rule.actions,
      isActive: rule.is_active,
      priority: rule.priority || 0
    })) || []

    this.schemaContext = {
      tables: tableMetadata,
      relationships: [], // TODO: Load relationship metadata
      businessRules: rules,
      dataLineage: {}, // TODO: Build data lineage map
      performanceMetrics: {
        queryTimes: {},
        bottlenecks: [],
        optimizationOpportunities: []
      }
    }
  }

  /**
   * Load AI memory including preferences, patterns, and insights
   */
  private async loadAIMemory(userId: string): Promise<void> {
    // Load user preferences
    const { data: preferences, error: prefError } = await supabase
      .from('ai_user_preferences')
      .select('*')
      .eq('user_id', userId)

    // Load learned patterns
    const { data: patterns, error: patternsError } = await supabase
      .from('ai_performance_metrics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    this.aiMemory = {
      userPreferences: preferences?.[0]?.preferences || {},
      learnedPatterns: [], // TODO: Process patterns data
      decisionHistory: [], // TODO: Load decision history
      businessInsights: [] // TODO: Load insights
    }
  }

  /**
   * Get current business context
   */
  getBusinessContext(): BusinessContext | null {
    return this.businessContext
  }

  /**
   * Get current schema context
   */
  getSchemaContext(): SchemaContext | null {
    return this.schemaContext
  }

  /**
   * Get AI memory
   */
  getAIMemory(): AIMemory | null {
    return this.aiMemory
  }

  /**
   * Record an action in the context history
   */
  async recordAction(action: string, context: Record<string, any>, outcome: 'success' | 'failure' | 'pending'): Promise<void> {
    if (!this.businessContext) return

    const actionRecord: ActionHistory = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      action,
      context,
      outcome
    }

    this.businessContext.sessionContext.recentActions.push(actionRecord)

    // Keep only last 50 actions in memory
    if (this.businessContext.sessionContext.recentActions.length > 50) {
      this.businessContext.sessionContext.recentActions = 
        this.businessContext.sessionContext.recentActions.slice(-50)
    }

    // Store in database
    await supabase.from('ai_audit_log').insert({
      business_unit_id: this.businessContext.businessUnit.id,
      user_id: this.businessContext.currentUser.id,
      action_type: action,
      action_details: context,
      outcome,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Learn from user interaction
   */
  async learnFromInteraction(interaction: {
    userInput: string
    aiResponse: string
    userFeedback?: 'positive' | 'negative' | 'neutral'
    context: Record<string, any>
  }): Promise<void> {
    if (!this.businessContext || !this.aiMemory) return

    // Store interaction for learning
    await supabase.from('ai_conversation_messages').insert({
      conversation_id: this.businessContext.sessionContext.sessionId,
      message_type: 'learning_interaction',
      content: interaction.userInput,
      ai_response: interaction.aiResponse,
      metadata: {
        feedback: interaction.userFeedback,
        context: interaction.context
      }
    })

    // Update patterns based on interaction
    // TODO: Implement pattern recognition and learning algorithms
  }

  /**
   * Get contextual recommendations based on current state
   */
  async getContextualRecommendations(): Promise<string[]> {
    if (!this.businessContext || !this.schemaContext) return []

    const recommendations: string[] = []

    // Analyze recent actions for patterns
    const recentActions = this.businessContext.sessionContext.recentActions
    if (recentActions.length > 0) {
      const lastAction = recentActions[recentActions.length - 1]
      
      if (lastAction.action === 'view_table' && lastAction.outcome === 'success') {
        recommendations.push('Consider analyzing relationships for this table')
        recommendations.push('Check data quality metrics for this table')
      }
    }

    // Schema-based recommendations
    const criticalTables = this.schemaContext.tables.filter(t => t.criticalityScore > 0.8)
    if (criticalTables.length > 0) {
      recommendations.push(`Review ${criticalTables.length} critical tables for optimization`)
    }

    return recommendations
  }

  /**
   * Infer table purpose from name
   */
  private inferTablePurpose(tableName: string): string {
    const name = tableName.toLowerCase()
    
    if (name.includes('user') || name.includes('employee')) return 'User Management'
    if (name.includes('customer') || name.includes('client')) return 'Customer Management'
    if (name.includes('order') || name.includes('booking')) return 'Order Management'
    if (name.includes('product') || name.includes('service')) return 'Product/Service Catalog'
    if (name.includes('payment') || name.includes('invoice')) return 'Financial Management'
    if (name.includes('equipment') || name.includes('asset')) return 'Asset Management'
    if (name.includes('schedule') || name.includes('appointment')) return 'Scheduling'
    if (name.includes('business_unit') || name.includes('department')) return 'Organizational Structure'
    if (name.includes('ai_') || name.includes('audit')) return 'System Management'
    
    return 'General Data Storage'
  }

  /**
   * Infer business function from table name
   */
  private inferBusinessFunction(tableName: string): string {
    const name = tableName.toLowerCase()
    
    if (name.includes('sales') || name.includes('lead')) return 'Sales'
    if (name.includes('hr') || name.includes('employee')) return 'Human Resources'
    if (name.includes('finance') || name.includes('accounting')) return 'Finance'
    if (name.includes('operation') || name.includes('job')) return 'Operations'
    if (name.includes('marketing') || name.includes('campaign')) return 'Marketing'
    if (name.includes('support') || name.includes('ticket')) return 'Customer Support'
    if (name.includes('inventory') || name.includes('stock')) return 'Inventory Management'
    if (name.includes('compliance') || name.includes('audit')) return 'Compliance'
    
    return 'Core Business'
  }

  /**
   * Calculate criticality score for a table (0-1)
   */
  private calculateCriticalityScore(tableName: string): number {
    const name = tableName.toLowerCase()
    
    // Core business tables
    if (name.includes('business_unit') || name.includes('user') || name.includes('customer')) return 1.0
    if (name.includes('order') || name.includes('booking') || name.includes('payment')) return 0.9
    if (name.includes('employee') || name.includes('service') || name.includes('product')) return 0.8
    if (name.includes('schedule') || name.includes('equipment') || name.includes('lead')) return 0.7
    if (name.includes('department') || name.includes('skill') || name.includes('contact')) return 0.6
    
    // System/support tables
    if (name.includes('ai_') || name.includes('log') || name.includes('audit')) return 0.4
    if (name.includes('config') || name.includes('setting') || name.includes('preference')) return 0.3
    
    return 0.5 // Default medium criticality
  }

  /**
   * Assess compliance level for a table
   */
  private assessComplianceLevel(tableName: string): 'high' | 'medium' | 'low' {
    const name = tableName.toLowerCase()
    
    // High compliance requirements
    if (name.includes('user') || name.includes('customer') || name.includes('employee')) return 'high'
    if (name.includes('payment') || name.includes('financial') || name.includes('personal')) return 'high'
    if (name.includes('audit') || name.includes('compliance') || name.includes('gdpr')) return 'high'
    
    // Medium compliance requirements
    if (name.includes('contact') || name.includes('address') || name.includes('phone')) return 'medium'
    if (name.includes('booking') || name.includes('order') || name.includes('service')) return 'medium'
    
    // Low compliance requirements
    return 'low'
  }

  /**
   * Clear context cache
   */
  clearCache(): void {
    this.contextCache.clear()
  }

  /**
   * Get cached value
   */
  getCached<T>(key: string): T | undefined {
    return this.contextCache.get(key)
  }

  /**
   * Set cached value
   */
  setCached<T>(key: string, value: T): void {
    this.contextCache.set(key, value)
  }
}

// Export singleton instance
export const aiContextEngine = new AIContextEngine()
