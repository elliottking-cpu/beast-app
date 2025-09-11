// AI Prompt Engineering System - Advanced prompt templates for database operations
// This system provides sophisticated prompts for different AI operations

export interface PromptContext {
  businessUnitId: string
  currentSchema: any[]
  recentChanges: any[]
  userPreferences: Record<string, any>
  businessRules: any[]
  conversationHistory: any[]
  currentTables: string[]
  relationships: any[]
}

export interface PromptTemplate {
  id: string
  name: string
  category: 'schema_analysis' | 'query_generation' | 'optimization' | 'security' | 'general'
  template: string
  variables: string[]
  examples?: string[]
  metadata: Record<string, any>
}

// ============================================================================
// CORE PROMPT TEMPLATES
// ============================================================================

export class AIPromptEngine {
  private templates: Map<string, PromptTemplate> = new Map()

  constructor() {
    this.initializeTemplates()
  }

  private initializeTemplates() {
    // Schema Analysis Prompts
    this.addTemplate({
      id: 'schema_analysis_comprehensive',
      name: 'Comprehensive Schema Analysis',
      category: 'schema_analysis',
      template: `You are an expert database architect analyzing a PostgreSQL schema for a business management system.

CONTEXT:
- Business Unit: {{businessUnitName}}
- Current Schema: {{currentSchema}}
- Recent Changes: {{recentChanges}}
- Business Rules: {{businessRules}}

TASK: Analyze the current database schema and provide:
1. **Schema Health Assessment** (0-100 score)
2. **Missing Relationships** - Tables that should be connected but aren't
3. **Optimization Opportunities** - Performance improvements
4. **Security Concerns** - Potential vulnerabilities
5. **Business Logic Gaps** - Missing tables or fields for business processes

ANALYSIS GUIDELINES:
- Focus on multi-tenant architecture with business_units as the root
- Consider septic service business operations (scheduling, equipment, customers)
- Identify missing audit trails and compliance features
- Look for normalization issues and redundant data
- Check for proper indexing opportunities

Provide specific, actionable recommendations with SQL examples where appropriate.

RESPONSE FORMAT:
```json
{
  "healthScore": 85,
  "missingRelationships": [...],
  "optimizations": [...],
  "securityConcerns": [...],
  "businessGaps": [...],
  "recommendations": [...]
}
````,
      variables: ['businessUnitName', 'currentSchema', 'recentChanges', 'businessRules'],
      metadata: { complexity: 'high', estimatedTokens: 1500 }
    })

    this.addTemplate({
      id: 'table_creation_assistant',
      name: 'Table Creation Assistant',
      category: 'schema_analysis',
      template: `You are a database design expert helping create a new table for a business management system.

CONTEXT:
- Existing Schema: {{currentSchema}}
- Business Domain: Septic service management (scheduling, customers, equipment, invoicing)
- Multi-tenant: Each table should reference business_units(id)

USER REQUEST: "{{userRequest}}"

TASK: Design a complete table structure including:
1. **Table Name** - Follow naming conventions (lowercase, underscores)
2. **Columns** - All necessary fields with proper data types
3. **Constraints** - Primary keys, foreign keys, NOT NULL, UNIQUE
4. **Indexes** - Performance optimization
5. **Relationships** - How it connects to existing tables
6. **Business Logic** - Any triggers or functions needed

DESIGN PRINCIPLES:
- Use UUID primary keys with gen_random_uuid()
- Include created_at, updated_at timestamps
- Always include business_unit_id for multi-tenancy
- Follow PostgreSQL best practices
- Consider future scalability

RESPONSE FORMAT:
```sql
-- Table Creation SQL
CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID REFERENCES business_units(id) NOT NULL,
  -- other columns...
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_table_business_unit ON table_name(business_unit_id);

-- RLS Policy
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
CREATE POLICY table_name_business_unit_policy ON table_name FOR ALL USING (business_unit_id IN (SELECT id FROM business_units WHERE true));
```

Explain the design decisions and how this table fits into the overall business workflow.`,
      variables: ['currentSchema', 'userRequest'],
      metadata: { complexity: 'medium', estimatedTokens: 800 }
    })

    // Query Generation Prompts
    this.addTemplate({
      id: 'natural_language_to_sql',
      name: 'Natural Language to SQL Converter',
      category: 'query_generation',
      template: `You are an expert SQL query generator for a PostgreSQL database.

SCHEMA CONTEXT:
{{schemaContext}}

USER QUESTION: "{{userQuestion}}"

TASK: Convert the natural language question into a proper SQL query.

REQUIREMENTS:
- Use proper PostgreSQL syntax
- Include business_unit_id filtering for multi-tenancy
- Use appropriate JOINs for related data
- Add proper error handling
- Optimize for performance
- Include helpful comments

SAFETY CHECKS:
- No DROP, DELETE, or TRUNCATE operations
- No administrative functions
- Limit results to prevent overwhelming output
- Validate all table and column names exist

RESPONSE FORMAT:
```sql
-- Query: {{userQuestion}}
-- Description: [Brief explanation of what this query does]

SELECT 
  -- columns with clear aliases
FROM table_name t1
JOIN other_table t2 ON t1.id = t2.foreign_key_id
WHERE t1.business_unit_id = $1 -- Multi-tenant filtering
  AND [other conditions]
ORDER BY t1.created_at DESC
LIMIT 100;
```

If the question is ambiguous, provide multiple query options or ask for clarification.`,
      variables: ['schemaContext', 'userQuestion'],
      metadata: { complexity: 'medium', estimatedTokens: 600 }
    })

    // Optimization Prompts
    this.addTemplate({
      id: 'performance_optimizer',
      name: 'Database Performance Optimizer',
      category: 'optimization',
      template: `You are a PostgreSQL performance optimization expert.

DATABASE CONTEXT:
- Schema: {{currentSchema}}
- Performance Metrics: {{performanceMetrics}}
- Query Patterns: {{queryPatterns}}
- Current Issues: {{currentIssues}}

TASK: Analyze performance and provide optimization recommendations.

ANALYSIS AREAS:
1. **Index Optimization**
   - Missing indexes on frequently queried columns
   - Unused indexes consuming space
   - Composite index opportunities

2. **Query Optimization**
   - Slow query identification
   - Query rewriting suggestions
   - Join optimization

3. **Schema Optimization**
   - Normalization issues
   - Data type optimization
   - Partitioning opportunities

4. **Configuration Tuning**
   - PostgreSQL settings
   - Connection pooling
   - Memory allocation

PROVIDE:
- Specific SQL commands to implement changes
- Expected performance impact
- Risk assessment for each change
- Implementation priority (High/Medium/Low)

RESPONSE FORMAT:
```json
{
  "optimizations": [
    {
      "type": "index",
      "priority": "high",
      "description": "Add index on frequently queried column",
      "sql": "CREATE INDEX CONCURRENTLY idx_name ON table(column);",
      "expectedImprovement": "50% faster queries",
      "risk": "low"
    }
  ],
  "overallImpact": "Estimated 40% performance improvement",
  "implementationOrder": [...]
}
````,
      variables: ['currentSchema', 'performanceMetrics', 'queryPatterns', 'currentIssues'],
      metadata: { complexity: 'high', estimatedTokens: 1200 }
    })

    // Security Analysis Prompts
    this.addTemplate({
      id: 'security_analyzer',
      name: 'Database Security Analyzer',
      category: 'security',
      template: `You are a database security expert analyzing PostgreSQL security.

SECURITY CONTEXT:
- Schema: {{currentSchema}}
- Current RLS Policies: {{rlsPolicies}}
- User Roles: {{userRoles}}
- Sensitive Data: {{sensitiveDataTypes}}

TASK: Perform comprehensive security analysis covering:

1. **Row Level Security (RLS)**
   - Missing RLS policies
   - Policy effectiveness
   - Multi-tenant isolation

2. **Data Protection**
   - Sensitive data identification
   - Encryption recommendations
   - PII handling

3. **Access Control**
   - Role-based permissions
   - Principle of least privilege
   - Administrative access

4. **Compliance**
   - GDPR requirements
   - Data retention policies
   - Audit trail completeness

5. **Vulnerability Assessment**
   - SQL injection risks
   - Privilege escalation
   - Data exposure

PROVIDE:
- Security score (0-100)
- Critical vulnerabilities
- Remediation steps with SQL
- Compliance gaps

RESPONSE FORMAT:
```json
{
  "securityScore": 75,
  "criticalIssues": [...],
  "recommendations": [
    {
      "severity": "high",
      "issue": "Missing RLS policy",
      "table": "sensitive_table",
      "solution": "CREATE POLICY...",
      "compliance": ["GDPR", "SOX"]
    }
  ],
  "complianceStatus": {...}
}
````,
      variables: ['currentSchema', 'rlsPolicies', 'userRoles', 'sensitiveDataTypes'],
      metadata: { complexity: 'high', estimatedTokens: 1000 }
    })

    // General Assistant Prompts
    this.addTemplate({
      id: 'general_assistant',
      name: 'General Database Assistant',
      category: 'general',
      template: `You are an intelligent database assistant for a business management system.

CONTEXT:
- Business: Septic service management company
- Database: PostgreSQL with multi-tenant architecture
- User Role: {{userRole}}
- Current Schema: {{schemaOverview}}

USER MESSAGE: "{{userMessage}}"

CAPABILITIES:
- Schema analysis and design
- Query generation and optimization
- Performance tuning
- Security assessment
- Business process mapping
- Data migration assistance
- Compliance checking

RESPONSE GUIDELINES:
- Be helpful and professional
- Provide specific, actionable advice
- Include code examples when relevant
- Explain technical concepts clearly
- Ask clarifying questions if needed
- Consider business context in recommendations

If the user's request is unclear, ask specific questions to better understand their needs.

Format your response in a clear, structured way with:
- Summary of what you understand
- Specific recommendations or answers
- Next steps or follow-up questions`,
      variables: ['userRole', 'schemaOverview', 'userMessage'],
      metadata: { complexity: 'low', estimatedTokens: 400 }
    })
  }

  // ============================================================================
  // TEMPLATE MANAGEMENT
  // ============================================================================

  private addTemplate(template: PromptTemplate) {
    this.templates.set(template.id, template)
  }

  getTemplate(templateId: string): PromptTemplate | null {
    return this.templates.get(templateId) || null
  }

  getTemplatesByCategory(category: PromptTemplate['category']): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category)
  }

  // ============================================================================
  // PROMPT GENERATION
  // ============================================================================

  generatePrompt(templateId: string, context: PromptContext, variables: Record<string, any> = {}): string {
    const template = this.getTemplate(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    let prompt = template.template

    // Replace template variables
    template.variables.forEach(variable => {
      const value = variables[variable] || this.getContextValue(variable, context) || `[${variable} not provided]`
      const placeholder = `{{${variable}}}`
      prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value))
    })

    return prompt
  }

  private getContextValue(variable: string, context: PromptContext): any {
    switch (variable) {
      case 'businessUnitName':
        return 'Current Business Unit' // Would be fetched from context
      case 'currentSchema':
        return this.formatSchemaForPrompt(context.currentSchema)
      case 'recentChanges':
        return this.formatChangesForPrompt(context.recentChanges)
      case 'businessRules':
        return this.formatBusinessRulesForPrompt(context.businessRules)
      case 'schemaContext':
        return this.formatSchemaContextForPrompt(context)
      case 'schemaOverview':
        return this.formatSchemaOverview(context.currentSchema)
      case 'userRole':
        return 'Database Administrator' // Would be determined from context
      default:
        return null
    }
  }

  // ============================================================================
  // FORMATTING HELPERS
  // ============================================================================

  private formatSchemaForPrompt(schema: any[]): string {
    if (!schema || schema.length === 0) {
      return 'No schema information available'
    }

    return schema.map(table => {
      return `Table: ${table.name}\n` +
             `  Records: ${table.recordCount || 0}\n` +
             `  Relationships: ${table.relationshipCount || 0}\n` +
             `  Columns: ${table.columns?.length || 0}`
    }).join('\n\n')
  }

  private formatChangesForPrompt(changes: any[]): string {
    if (!changes || changes.length === 0) {
      return 'No recent changes'
    }

    return changes.map(change => {
      return `- ${change.changeType}: ${change.changeDescription} (${change.status})`
    }).join('\n')
  }

  private formatBusinessRulesForPrompt(rules: any[]): string {
    if (!rules || rules.length === 0) {
      return 'No business rules defined'
    }

    return rules.map(rule => {
      return `- ${rule.ruleName}: ${rule.ruleDescription}`
    }).join('\n')
  }

  private formatSchemaContextForPrompt(context: PromptContext): string {
    const tables = context.currentTables || []
    const relationships = context.relationships || []

    return `Tables: ${tables.join(', ')}\n` +
           `Relationships: ${relationships.length} foreign key relationships\n` +
           `Business Unit: ${context.businessUnitId}`
  }

  private formatSchemaOverview(schema: any[]): string {
    if (!schema || schema.length === 0) {
      return 'Database schema is being analyzed...'
    }

    const tableCount = schema.length
    const totalRecords = schema.reduce((sum, table) => sum + (table.recordCount || 0), 0)
    const totalRelationships = schema.reduce((sum, table) => sum + (table.relationshipCount || 0), 0)

    return `${tableCount} tables, ${totalRecords.toLocaleString()} total records, ${totalRelationships} relationships`
  }

  // ============================================================================
  // DYNAMIC PROMPT GENERATION
  // ============================================================================

  generateContextualPrompt(
    intent: string,
    userMessage: string,
    context: PromptContext,
    additionalVariables: Record<string, any> = {}
  ): string {
    // Select appropriate template based on intent
    let templateId: string

    switch (intent) {
      case 'schema_analysis':
        templateId = 'schema_analysis_comprehensive'
        break
      case 'table_creation':
        templateId = 'table_creation_assistant'
        break
      case 'query_generation':
        templateId = 'natural_language_to_sql'
        break
      case 'optimization':
        templateId = 'performance_optimizer'
        break
      case 'security_analysis':
        templateId = 'security_analyzer'
        break
      default:
        templateId = 'general_assistant'
    }

    const variables = {
      userMessage,
      userQuestion: userMessage,
      userRequest: userMessage,
      ...additionalVariables
    }

    return this.generatePrompt(templateId, context, variables)
  }

  // ============================================================================
  // PROMPT OPTIMIZATION
  // ============================================================================

  estimateTokens(prompt: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(prompt.length / 4)
  }

  optimizePromptLength(prompt: string, maxTokens: number = 4000): string {
    const estimatedTokens = this.estimateTokens(prompt)
    
    if (estimatedTokens <= maxTokens) {
      return prompt
    }

    // Truncate while preserving structure
    const targetLength = maxTokens * 4 * 0.9 // 90% of max to be safe
    
    if (prompt.length <= targetLength) {
      return prompt
    }

    // Find good truncation points (end of sentences or sections)
    const truncatedPrompt = prompt.substring(0, targetLength)
    const lastSentence = truncatedPrompt.lastIndexOf('.')
    const lastSection = truncatedPrompt.lastIndexOf('\n\n')
    
    const cutPoint = Math.max(lastSentence, lastSection)
    
    if (cutPoint > targetLength * 0.7) {
      return prompt.substring(0, cutPoint + 1) + '\n\n[Content truncated for length]'
    }
    
    return truncatedPrompt + '\n\n[Content truncated for length]'
  }
}

// ============================================================================
// EXPORT DEFAULT INSTANCE
// ============================================================================

export const promptEngine = new AIPromptEngine()
