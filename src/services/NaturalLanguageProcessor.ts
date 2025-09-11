/**
 * Natural Language Processor - Converts human language to database operations
 * 
 * This service enables users to interact with the database using natural language,
 * converting queries like "Show me all customers from London" into SQL queries
 * and schema modifications like "Add an email column to users table".
 */

import { supabase } from '../lib/supabase'
import { aiSafetyValidator } from './AISafetyValidator'
import { aiContextEngine } from './AIContextEngine'
import { llmService, LLMRequest } from './LLMService'

export interface NLQuery {
  id: string
  userInput: string
  intent: QueryIntent
  confidence: number
  generatedSQL?: string
  explanation: string
  safetyCheck: boolean
  estimatedRows?: number
  affectedTables: string[]
}

export interface QueryIntent {
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE_TABLE' | 'ALTER_TABLE' | 'CREATE_RELATIONSHIP' | 'ANALYZE' | 'REPORT'
  entities: string[] // Tables, columns, etc.
  conditions: QueryCondition[]
  operations: QueryOperation[]
}

export interface QueryCondition {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'like'
  value: any
  table?: string
}

export interface QueryOperation {
  type: 'join' | 'group_by' | 'order_by' | 'limit' | 'aggregate'
  details: Record<string, any>
}

export class NaturalLanguageProcessor {
  private queryPatterns: Map<RegExp, QueryIntent> = new Map()
  private entityMappings: Map<string, string> = new Map()
  private contextCache: Map<string, any> = new Map()

  constructor() {
    this.initializePatterns()
    this.initializeEntityMappings()
  }

  /**
   * Process natural language input and convert to database operation
   */
  async processQuery(userInput: string, userId?: string): Promise<NLQuery> {
    const queryId = crypto.randomUUID()
    
    try {
      console.log('🗣️ Processing natural language query:', userInput)
      
      // Analyze intent and extract entities
      const intent = await this.analyzeIntent(userInput)
      const confidence = this.calculateConfidence(userInput, intent)
      
      // Generate SQL based on intent
      const generatedSQL = await this.generateSQL(intent, userInput)
      
      // Safety validation
      const safetyResult = await aiSafetyValidator.validateSQL(generatedSQL, {
        userId: userId || 'anonymous',
        source: 'natural_language',
        originalQuery: userInput
      })
      
      // Create explanation
      const explanation = this.generateExplanation(intent, generatedSQL, userInput)
      
      // Estimate impact
      const estimatedRows = await this.estimateQueryImpact(generatedSQL, intent)
      
      const nlQuery: NLQuery = {
        id: queryId,
        userInput,
        intent,
        confidence,
        generatedSQL,
        explanation,
        safetyCheck: safetyResult.isValid,
        estimatedRows,
        affectedTables: intent.entities
      }

      // Store in context for learning
      await this.storeQueryContext(nlQuery, userId)
      
      return nlQuery
      
    } catch (error) {
      console.error('❌ Failed to process natural language query:', error)
      
      return {
        id: queryId,
        userInput,
        intent: { type: 'SELECT', entities: [], conditions: [], operations: [] },
        confidence: 0,
        explanation: `I couldn't understand your request: "${userInput}". Please try rephrasing or use more specific terms.`,
        safetyCheck: false,
        affectedTables: []
      }
    }
  }

  /**
   * Analyze user intent from natural language input
   */
  private async analyzeIntent(userInput: string): Promise<QueryIntent> {
    const input = userInput.toLowerCase().trim()
    
    // First try LLM-powered analysis for better accuracy
    try {
      const llmIntent = await this.analyzeLLMIntent(userInput)
      if (llmIntent) return llmIntent
    } catch (error) {
      console.warn('LLM intent analysis failed, falling back to pattern matching:', error)
    }
    
    // Check for common patterns
    for (const [pattern, baseIntent] of this.queryPatterns) {
      const match = input.match(pattern)
      if (match) {
        return this.enrichIntent(baseIntent, match, input)
      }
    }
    
    // Fallback: analyze using keywords
    return this.analyzeByKeywords(input)
  }

  /**
   * Use LLM to analyze user intent with high accuracy
   */
  private async analyzeLLMIntent(userInput: string): Promise<QueryIntent | null> {
    try {
      const context = aiContextEngine.getSchemaContext()
      const availableTables = context?.tables?.map(t => t.name).join(', ') || 'No tables available'
      
      const systemMessage = `You are a database query intent analyzer. Analyze user requests and return structured intent information.

Available tables: ${availableTables}

Return a JSON object with this structure:
{
  "type": "SELECT|INSERT|UPDATE|DELETE|CREATE_TABLE|ALTER_TABLE|CREATE_RELATIONSHIP|ANALYZE|REPORT",
  "entities": ["table1", "table2", "column1"],
  "conditions": [{"field": "column", "operator": "equals", "value": "something"}],
  "operations": [{"type": "order_by", "details": {"direction": "ASC"}}],
  "confidence": 0.95
}

Only return valid JSON, no explanations.`

      const llmRequest: LLMRequest = {
        id: crypto.randomUUID(),
        prompt: `Analyze this database request: "${userInput}"`,
        systemMessage,
        context: `Available tables: ${availableTables}`,
        temperature: 0.1, // Low temperature for consistent structured output
        maxTokens: 500
      }

      const response = await llmService.processRequest(llmRequest)
      
      if (response.content) {
        // Try to parse JSON response
        const jsonMatch = response.content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const intentData = JSON.parse(jsonMatch[0])
          
          return {
            type: intentData.type || 'SELECT',
            entities: intentData.entities || [],
            conditions: intentData.conditions || [],
            operations: intentData.operations || []
          }
        }
      }
      
      return null
      
    } catch (error) {
      console.warn('LLM intent analysis failed:', error)
      return null
    }
  }

  /**
   * Generate SQL from analyzed intent
   */
  private async generateSQL(intent: QueryIntent, originalInput: string): Promise<string> {
    const context = aiContextEngine.getSchemaContext()
    
    // Try LLM-powered SQL generation for complex queries
    if (intent.entities.length > 2 || intent.conditions.length > 1 || originalInput.length > 50) {
      try {
        const llmSQL = await this.generateLLMSQL(intent, originalInput, context)
        if (llmSQL) return llmSQL
      } catch (error) {
        console.warn('LLM SQL generation failed, using template-based generation:', error)
      }
    }
    
    // Fallback to template-based generation
    switch (intent.type) {
      case 'SELECT':
        return this.generateSelectQuery(intent, context)
      
      case 'INSERT':
        return this.generateInsertQuery(intent, context)
      
      case 'UPDATE':
        return this.generateUpdateQuery(intent, context)
      
      case 'CREATE_TABLE':
        return this.generateCreateTableQuery(intent, context)
      
      case 'ALTER_TABLE':
        return this.generateAlterTableQuery(intent, context)
      
      case 'ANALYZE':
        return this.generateAnalysisQuery(intent, context)
      
      case 'REPORT':
        return this.generateReportQuery(intent, context)
      
      default:
        throw new Error(`Unsupported query type: ${intent.type}`)
    }
  }

  /**
   * Use LLM to generate sophisticated SQL queries
   */
  private async generateLLMSQL(intent: QueryIntent, originalInput: string, context: any): Promise<string | null> {
    try {
      const schemaInfo = this.buildSchemaInfo(context)
      
      const systemMessage = `You are an expert SQL query generator for PostgreSQL/Supabase databases.

Database Schema:
${schemaInfo}

Rules:
1. Generate ONLY valid PostgreSQL SQL
2. Use proper table and column names from the schema
3. Include appropriate JOINs for related tables
4. Add reasonable WHERE clauses and LIMIT statements
5. Use proper data types and casting
6. Return only the SQL query, no explanations
7. Ensure queries are safe (no DROP, TRUNCATE, or dangerous operations)

Example format:
SELECT column1, column2 FROM table1 WHERE condition LIMIT 10;`

      const llmRequest: LLMRequest = {
        id: crypto.randomUUID(),
        prompt: `Generate a SQL query for: "${originalInput}"

Intent analysis shows:
- Query type: ${intent.type}
- Tables/entities: ${intent.entities.join(', ')}
- Conditions: ${JSON.stringify(intent.conditions)}
- Operations: ${JSON.stringify(intent.operations)}

Generate the appropriate SQL query:`,
        systemMessage,
        context: schemaInfo,
        temperature: 0.1,
        maxTokens: 800
      }

      const response = await llmService.processRequest(llmRequest)
      
      if (response.content) {
        // Extract SQL from response
        const sqlMatch = response.content.match(/```sql\n([\s\S]*?)\n```/) || 
                        response.content.match(/```\n([\s\S]*?)\n```/) ||
                        [null, response.content.trim()]
        
        if (sqlMatch && sqlMatch[1]) {
          const sql = sqlMatch[1].trim()
          
          // Basic validation
          if (sql.toUpperCase().includes('SELECT') || 
              sql.toUpperCase().includes('CREATE') ||
              sql.toUpperCase().includes('ALTER')) {
            return sql
          }
        }
      }
      
      return null
      
    } catch (error) {
      console.warn('LLM SQL generation failed:', error)
      return null
    }
  }

  /**
   * Build schema information string for LLM context
   */
  private buildSchemaInfo(context: any): string {
    if (!context?.tables) return 'No schema information available'
    
    const schemaLines = []
    
    for (const table of context.tables.slice(0, 20)) { // Limit to prevent token overflow
      schemaLines.push(`Table: ${table.name}`)
      if (table.columns) {
        for (const column of table.columns.slice(0, 10)) { // Limit columns
          const constraints = []
          if (column.isPrimaryKey) constraints.push('PRIMARY KEY')
          if (column.isForeignKey) constraints.push('FOREIGN KEY')
          if (!column.isNullable) constraints.push('NOT NULL')
          
          schemaLines.push(`  - ${column.name}: ${column.type} ${constraints.join(' ')}`)
        }
      }
      schemaLines.push('')
    }
    
    return schemaLines.join('\n')
  }

  /**
   * Generate SELECT query from intent
   */
  private generateSelectQuery(intent: QueryIntent, context: any): string {
    const tables = intent.entities.filter(e => this.isTableName(e))
    const columns = intent.entities.filter(e => this.isColumnName(e))
    
    if (tables.length === 0) {
      throw new Error('No valid tables found in query')
    }
    
    const mainTable = tables[0]
    const selectColumns = columns.length > 0 ? columns.join(', ') : '*'
    
    let query = `SELECT ${selectColumns} FROM ${mainTable}`
    
    // Add JOINs for related tables
    if (tables.length > 1) {
      for (let i = 1; i < tables.length; i++) {
        const joinTable = tables[i]
        const relationship = this.findRelationship(mainTable, joinTable)
        if (relationship) {
          query += ` LEFT JOIN ${joinTable} ON ${relationship}`
        }
      }
    }
    
    // Add WHERE conditions
    if (intent.conditions.length > 0) {
      const whereClause = intent.conditions
        .map(condition => this.buildCondition(condition))
        .join(' AND ')
      query += ` WHERE ${whereClause}`
    }
    
    // Add operations (ORDER BY, GROUP BY, etc.)
    for (const operation of intent.operations) {
      query += this.buildOperation(operation)
    }
    
    return query
  }

  /**
   * Generate CREATE TABLE query from intent
   */
  private generateCreateTableQuery(intent: QueryIntent, context: any): string {
    const tableName = intent.entities[0]
    if (!tableName) {
      throw new Error('Table name not specified')
    }
    
    // Extract column definitions from conditions/operations
    const columns = this.extractColumnDefinitions(intent)
    
    if (columns.length === 0) {
      // Default columns for business tables
      columns.push(
        'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
        'created_at TIMESTAMPTZ DEFAULT now()',
        'updated_at TIMESTAMPTZ DEFAULT now()',
        'is_active BOOLEAN DEFAULT true'
      )
    }
    
    let query = `CREATE TABLE ${tableName} (\n  ${columns.join(',\n  ')}\n)`
    
    // Add RLS
    query += `;\nALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`
    
    return query
  }

  /**
   * Generate ALTER TABLE query from intent
   */
  private generateAlterTableQuery(intent: QueryIntent, context: any): string {
    const tableName = intent.entities[0]
    if (!tableName) {
      throw new Error('Table name not specified')
    }
    
    const operations = intent.operations
    if (operations.length === 0) {
      throw new Error('No alter operations specified')
    }
    
    const alterStatements = operations.map(op => {
      switch (op.type) {
        case 'add_column':
          return `ALTER TABLE ${tableName} ADD COLUMN ${op.details.columnName} ${op.details.dataType}`
        case 'drop_column':
          return `ALTER TABLE ${tableName} DROP COLUMN ${op.details.columnName}`
        case 'modify_column':
          return `ALTER TABLE ${tableName} ALTER COLUMN ${op.details.columnName} TYPE ${op.details.newDataType}`
        default:
          return `-- Unknown operation: ${op.type}`
      }
    })
    
    return alterStatements.join(';\n')
  }

  /**
   * Generate analysis query for business intelligence
   */
  private generateAnalysisQuery(intent: QueryIntent, context: any): string {
    const tables = intent.entities.filter(e => this.isTableName(e))
    
    if (tables.length === 0) {
      return `-- Analysis query for all tables
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables
ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC`
    }
    
    const table = tables[0]
    return `-- Analysis for ${table}
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT created_at::date) as active_days,
  MIN(created_at) as first_record,
  MAX(created_at) as latest_record
FROM ${table}`
  }

  /**
   * Calculate confidence score for intent analysis
   */
  private calculateConfidence(userInput: string, intent: QueryIntent): number {
    let confidence = 0.5 // Base confidence
    
    // Boost confidence for recognized patterns
    if (intent.entities.length > 0) confidence += 0.2
    if (intent.conditions.length > 0) confidence += 0.1
    if (intent.operations.length > 0) confidence += 0.1
    
    // Boost for specific keywords
    const keywords = ['show', 'get', 'find', 'create', 'add', 'update', 'delete', 'analyze']
    const foundKeywords = keywords.filter(keyword => 
      userInput.toLowerCase().includes(keyword)
    )
    confidence += foundKeywords.length * 0.05
    
    return Math.min(confidence, 1.0)
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(intent: QueryIntent, sql: string, originalInput: string): string {
    switch (intent.type) {
      case 'SELECT':
        return `I'll search the ${intent.entities.join(', ')} table(s) ${
          intent.conditions.length > 0 
            ? `with conditions: ${intent.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(', ')}`
            : 'for all records'
        }.`
      
      case 'CREATE_TABLE':
        return `I'll create a new table called "${intent.entities[0]}" with appropriate columns and security settings.`
      
      case 'ALTER_TABLE':
        return `I'll modify the "${intent.entities[0]}" table structure as requested.`
      
      case 'ANALYZE':
        return `I'll analyze the data patterns and provide insights about ${intent.entities.join(', ')}.`
      
      default:
        return `I'll execute a ${intent.type} operation on ${intent.entities.join(', ')}.`
    }
  }

  /**
   * Initialize common query patterns
   */
  private initializePatterns(): void {
    // SELECT patterns
    this.queryPatterns.set(
      /show me (all )?(\w+)( from (\w+))?( where (.+))?/,
      { type: 'SELECT', entities: [], conditions: [], operations: [] }
    )
    
    this.queryPatterns.set(
      /get (all )?(\w+)( with (.+))?/,
      { type: 'SELECT', entities: [], conditions: [], operations: [] }
    )
    
    this.queryPatterns.set(
      /find (\w+)( where (.+))?/,
      { type: 'SELECT', entities: [], conditions: [], operations: [] }
    )
    
    // CREATE patterns
    this.queryPatterns.set(
      /create (a )?table (called )?(\w+)/,
      { type: 'CREATE_TABLE', entities: [], conditions: [], operations: [] }
    )
    
    this.queryPatterns.set(
      /add (a )?table (called )?(\w+)/,
      { type: 'CREATE_TABLE', entities: [], conditions: [], operations: [] }
    )
    
    // ALTER patterns
    this.queryPatterns.set(
      /add (a )?column (\w+) to (\w+)/,
      { type: 'ALTER_TABLE', entities: [], conditions: [], operations: [] }
    )
    
    // ANALYSIS patterns
    this.queryPatterns.set(
      /analyze (\w+)/,
      { type: 'ANALYZE', entities: [], conditions: [], operations: [] }
    )
    
    this.queryPatterns.set(
      /show me (the )?stats for (\w+)/,
      { type: 'ANALYZE', entities: [], conditions: [], operations: [] }
    )
  }

  /**
   * Initialize entity mappings (common terms to database entities)
   */
  private initializeEntityMappings(): void {
    // Common business terms to table names
    this.entityMappings.set('customers', 'customer_contacts')
    this.entityMappings.set('users', 'users')
    this.entityMappings.set('employees', 'users')
    this.entityMappings.set('jobs', 'schedule_jobs')
    this.entityMappings.set('bookings', 'schedule_jobs')
    this.entityMappings.set('appointments', 'schedule_visits')
    this.entityMappings.set('visits', 'schedule_visits')
    this.entityMappings.set('services', 'services')
    this.entityMappings.set('equipment', 'tanker_equipment')
    this.entityMappings.set('vehicles', 'business_unit_vehicles')
    this.entityMappings.set('leads', 'leads')
    this.entityMappings.set('departments', 'departments')
    this.entityMappings.set('business units', 'business_units')
    this.entityMappings.set('companies', 'business_units')
  }

  /**
   * Helper methods
   */
  private enrichIntent(baseIntent: QueryIntent, match: RegExpMatchArray, input: string): QueryIntent {
    // Extract entities from regex match
    const entities = []
    for (let i = 1; i < match.length; i++) {
      if (match[i] && match[i].trim()) {
        const entity = this.normalizeEntity(match[i].trim())
        if (entity) entities.push(entity)
      }
    }
    
    return {
      ...baseIntent,
      entities: [...baseIntent.entities, ...entities],
      conditions: this.extractConditions(input),
      operations: this.extractOperations(input)
    }
  }

  private analyzeByKeywords(input: string): QueryIntent {
    const intent: QueryIntent = {
      type: 'SELECT',
      entities: [],
      conditions: [],
      operations: []
    }
    
    // Determine intent type
    if (input.includes('create') || input.includes('add table')) {
      intent.type = 'CREATE_TABLE'
    } else if (input.includes('add column') || input.includes('modify')) {
      intent.type = 'ALTER_TABLE'
    } else if (input.includes('analyze') || input.includes('stats')) {
      intent.type = 'ANALYZE'
    }
    
    // Extract entities
    for (const [term, entity] of this.entityMappings) {
      if (input.includes(term)) {
        intent.entities.push(entity)
      }
    }
    
    return intent
  }

  private normalizeEntity(entity: string): string | null {
    const normalized = entity.toLowerCase()
    return this.entityMappings.get(normalized) || entity
  }

  private extractConditions(input: string): QueryCondition[] {
    const conditions: QueryCondition[] = []
    
    // Simple condition patterns
    const conditionPatterns = [
      /where (\w+) (equals?|is|=) (.+)/,
      /with (\w+) (like|containing) (.+)/,
      /(\w+) (greater than|>) (\d+)/,
      /(\w+) (less than|<) (\d+)/
    ]
    
    for (const pattern of conditionPatterns) {
      const match = input.match(pattern)
      if (match) {
        conditions.push({
          field: match[1],
          operator: this.normalizeOperator(match[2]),
          value: match[3]
        })
      }
    }
    
    return conditions
  }

  private extractOperations(input: string): QueryOperation[] {
    const operations: QueryOperation[] = []
    
    if (input.includes('order by') || input.includes('sort by')) {
      operations.push({
        type: 'order_by',
        details: { direction: input.includes('desc') ? 'DESC' : 'ASC' }
      })
    }
    
    if (input.includes('limit') || input.includes('top')) {
      const limitMatch = input.match(/(?:limit|top) (\d+)/)
      if (limitMatch) {
        operations.push({
          type: 'limit',
          details: { count: parseInt(limitMatch[1]) }
        })
      }
    }
    
    return operations
  }

  private normalizeOperator(operator: string): QueryCondition['operator'] {
    const op = operator.toLowerCase()
    if (op.includes('equal') || op === '=' || op === 'is') return 'equals'
    if (op.includes('like') || op.includes('contain')) return 'like'
    if (op.includes('greater') || op === '>') return 'greater_than'
    if (op.includes('less') || op === '<') return 'less_than'
    return 'equals'
  }

  private isTableName(entity: string): boolean {
    // Check if entity matches known table patterns
    const context = aiContextEngine.getSchemaContext()
    return context?.tables?.some(table => 
      table.name === entity || table.name.includes(entity)
    ) || false
  }

  private isColumnName(entity: string): boolean {
    // Simple heuristic for column names
    return entity.includes('_') || ['id', 'name', 'email', 'phone', 'address'].includes(entity)
  }

  private findRelationship(table1: string, table2: string): string | null {
    // Simplified relationship detection
    return `${table1}.id = ${table2}.${table1}_id`
  }

  private buildCondition(condition: QueryCondition): string {
    const { field, operator, value } = condition
    
    switch (operator) {
      case 'equals':
        return `${field} = '${value}'`
      case 'like':
        return `${field} ILIKE '%${value}%'`
      case 'greater_than':
        return `${field} > ${value}`
      case 'less_than':
        return `${field} < ${value}`
      default:
        return `${field} = '${value}'`
    }
  }

  private buildOperation(operation: QueryOperation): string {
    switch (operation.type) {
      case 'order_by':
        return ` ORDER BY created_at ${operation.details.direction || 'ASC'}`
      case 'limit':
        return ` LIMIT ${operation.details.count}`
      case 'group_by':
        return ` GROUP BY ${operation.details.column}`
      default:
        return ''
    }
  }

  private extractColumnDefinitions(intent: QueryIntent): string[] {
    // Extract column definitions from intent
    const columns: string[] = []
    
    for (const condition of intent.conditions) {
      if (condition.field && condition.value) {
        const dataType = this.inferDataType(condition.value)
        columns.push(`${condition.field} ${dataType}`)
      }
    }
    
    return columns
  }

  private inferDataType(value: any): string {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'INTEGER' : 'NUMERIC'
    }
    if (typeof value === 'boolean') {
      return 'BOOLEAN'
    }
    if (value && value.includes('@')) {
      return 'TEXT' // Email
    }
    if (value && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return 'DATE'
    }
    return 'TEXT'
  }

  private async estimateQueryImpact(sql: string, intent: QueryIntent): Promise<number> {
    // Simple estimation based on query type and tables
    if (intent.type === 'SELECT') {
      return intent.conditions.length > 0 ? 100 : 1000 // Estimated rows
    }
    return 1
  }

  private async storeQueryContext(query: NLQuery, userId?: string): Promise<void> {
    try {
      await supabase.from('ai_conversation_messages').insert({
        conversation_id: crypto.randomUUID(),
        role: 'user',
        content: query.userInput,
        message_type: 'natural_language_query',
        metadata: {
          intent: query.intent,
          confidence: query.confidence,
          generated_sql: query.generatedSQL,
          safety_check: query.safetyCheck
        }
      })
    } catch (error) {
      console.warn('Failed to store query context:', error)
    }
  }
}

// Export singleton instance
export const naturalLanguageProcessor = new NaturalLanguageProcessor()
