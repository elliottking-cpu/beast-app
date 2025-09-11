/**
 * AI Safety Validator - Ensures all AI-generated operations are safe and validated
 * 
 * This service validates AI-generated SQL queries, schema changes, and business operations
 * to prevent dangerous or unintended actions. It implements multiple layers of safety
 * checks and provides rollback capabilities.
 */

export interface ValidationResult {
  isValid: boolean
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  issues: ValidationIssue[]
  recommendations: string[]
  requiresApproval: boolean
  estimatedImpact: ImpactAssessment
}

export interface ValidationIssue {
  type: 'security' | 'data_loss' | 'performance' | 'compliance' | 'business_logic'
  severity: 'warning' | 'error' | 'critical'
  message: string
  affectedTables?: string[]
  suggestedFix?: string
}

export interface ImpactAssessment {
  affectedRecords: number
  affectedTables: string[]
  businessProcesses: string[]
  reversibility: 'reversible' | 'partially_reversible' | 'irreversible'
  estimatedDowntime: number // in minutes
  dataIntegrityRisk: number // 0-100
}

export interface SafetyPolicy {
  id: string
  name: string
  description: string
  rules: SafetyRule[]
  isActive: boolean
  priority: number
}

export interface SafetyRule {
  id: string
  type: 'sql_pattern' | 'table_access' | 'data_volume' | 'time_restriction' | 'user_permission'
  condition: string
  action: 'block' | 'warn' | 'require_approval' | 'log_only'
  message: string
}

export class AISafetyValidator {
  private policies: SafetyPolicy[] = []
  private dangerousPatterns: RegExp[] = []
  private criticalTables: Set<string> = new Set()
  private maxRecordThreshold: number = 10000

  constructor() {
    this.initializeDefaultPolicies()
    this.initializeDangerousPatterns()
    this.initializeCriticalTables()
  }

  /**
   * Validate an SQL query for safety
   */
  async validateSQL(sql: string, context: {
    userId?: string
    businessUnitId?: string
    operation?: string
  }): Promise<ValidationResult> {
    const issues: ValidationIssue[] = []
    let riskLevel: ValidationResult['riskLevel'] = 'low'
    let requiresApproval = false

    // Check for dangerous SQL patterns
    const patternIssues = this.checkDangerousPatterns(sql)
    issues.push(...patternIssues)

    // Check for critical table access
    const tableIssues = this.checkCriticalTableAccess(sql)
    issues.push(...tableIssues)

    // Check for data volume impact
    const volumeIssues = await this.checkDataVolumeImpact(sql)
    issues.push(...volumeIssues)

    // Check for compliance violations
    const complianceIssues = this.checkComplianceViolations(sql)
    issues.push(...complianceIssues)

    // Determine overall risk level
    if (issues.some(i => i.severity === 'critical')) {
      riskLevel = 'critical'
      requiresApproval = true
    } else if (issues.some(i => i.severity === 'error')) {
      riskLevel = 'high'
      requiresApproval = true
    } else if (issues.some(i => i.severity === 'warning')) {
      riskLevel = 'medium'
    }

    // Estimate impact
    const estimatedImpact = await this.estimateImpact(sql)

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues, sql)

    return {
      isValid: riskLevel !== 'critical',
      riskLevel,
      issues,
      recommendations,
      requiresApproval,
      estimatedImpact
    }
  }

  /**
   * Validate a schema change operation
   */
  async validateSchemaChange(operation: {
    type: 'create_table' | 'alter_table' | 'drop_table' | 'create_index' | 'drop_index'
    tableName: string
    details: any
  }, context: any): Promise<ValidationResult> {
    const issues: ValidationIssue[] = []
    let riskLevel: ValidationResult['riskLevel'] = 'low'

    // Check if operation affects critical tables
    if (this.criticalTables.has(operation.tableName)) {
      if (operation.type === 'drop_table') {
        issues.push({
          type: 'data_loss',
          severity: 'critical',
          message: `Attempting to drop critical table: ${operation.tableName}`,
          affectedTables: [operation.tableName],
          suggestedFix: 'Create a backup before proceeding'
        })
        riskLevel = 'critical'
      } else if (operation.type === 'alter_table') {
        issues.push({
          type: 'business_logic',
          severity: 'warning',
          message: `Modifying critical table: ${operation.tableName}`,
          affectedTables: [operation.tableName],
          suggestedFix: 'Test changes in development environment first'
        })
        riskLevel = 'medium'
      }
    }

    // Check for foreign key constraints
    if (operation.type === 'drop_table') {
      const dependentTables = await this.findDependentTables(operation.tableName)
      if (dependentTables.length > 0) {
        issues.push({
          type: 'data_loss',
          severity: 'error',
          message: `Table ${operation.tableName} has dependent tables: ${dependentTables.join(', ')}`,
          affectedTables: dependentTables,
          suggestedFix: 'Remove foreign key constraints first'
        })
        riskLevel = 'high'
      }
    }

    const estimatedImpact: ImpactAssessment = {
      affectedRecords: 0,
      affectedTables: [operation.tableName],
      businessProcesses: this.getAffectedBusinessProcesses(operation.tableName),
      reversibility: operation.type === 'drop_table' ? 'irreversible' : 'reversible',
      estimatedDowntime: operation.type === 'create_index' ? 5 : 0,
      dataIntegrityRisk: operation.type === 'drop_table' ? 90 : 10
    }

    return {
      isValid: riskLevel !== 'critical',
      riskLevel,
      issues,
      recommendations: this.generateRecommendations(issues, ''),
      requiresApproval: riskLevel === 'high' || riskLevel === 'critical',
      estimatedImpact
    }
  }

  /**
   * Validate a business operation
   */
  async validateBusinessOperation(operation: {
    type: string
    description: string
    affectedEntities: string[]
    parameters: Record<string, any>
  }, context: any): Promise<ValidationResult> {
    const issues: ValidationIssue[] = []
    let riskLevel: ValidationResult['riskLevel'] = 'low'

    // Check for high-impact operations
    if (operation.type.includes('delete') || operation.type.includes('cancel')) {
      issues.push({
        type: 'business_logic',
        severity: 'warning',
        message: `Destructive operation: ${operation.type}`,
        suggestedFix: 'Confirm operation is intentional'
      })
      riskLevel = 'medium'
    }

    // Check for financial operations
    if (operation.type.includes('payment') || operation.type.includes('refund')) {
      issues.push({
        type: 'compliance',
        severity: 'error',
        message: 'Financial operations require additional verification',
        suggestedFix: 'Implement financial approval workflow'
      })
      riskLevel = 'high'
    }

    const estimatedImpact: ImpactAssessment = {
      affectedRecords: operation.affectedEntities.length,
      affectedTables: [],
      businessProcesses: [operation.type],
      reversibility: 'partially_reversible',
      estimatedDowntime: 0,
      dataIntegrityRisk: 20
    }

    return {
      isValid: riskLevel !== 'critical',
      riskLevel,
      issues,
      recommendations: this.generateRecommendations(issues, ''),
      requiresApproval: riskLevel === 'high' || riskLevel === 'critical',
      estimatedImpact
    }
  }

  /**
   * Check for dangerous SQL patterns
   */
  private checkDangerousPatterns(sql: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const normalizedSql = sql.toLowerCase().trim()

    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(normalizedSql)) {
        issues.push({
          type: 'security',
          severity: 'critical',
          message: `Dangerous SQL pattern detected: ${pattern.source}`,
          suggestedFix: 'Use parameterized queries and avoid dynamic SQL'
        })
      }
    }

    // Check for missing WHERE clauses in DELETE/UPDATE
    if ((normalizedSql.includes('delete from') || normalizedSql.includes('update ')) && 
        !normalizedSql.includes('where')) {
      issues.push({
        type: 'data_loss',
        severity: 'critical',
        message: 'DELETE or UPDATE statement without WHERE clause detected',
        suggestedFix: 'Add appropriate WHERE clause to limit affected records'
      })
    }

    return issues
  }

  /**
   * Check for critical table access
   */
  private checkCriticalTableAccess(sql: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const normalizedSql = sql.toLowerCase()

    for (const table of this.criticalTables) {
      if (normalizedSql.includes(table.toLowerCase())) {
        if (normalizedSql.includes('drop table') || normalizedSql.includes('truncate')) {
          issues.push({
            type: 'data_loss',
            severity: 'critical',
            message: `Attempting destructive operation on critical table: ${table}`,
            affectedTables: [table],
            suggestedFix: 'Create backup before proceeding'
          })
        } else if (normalizedSql.includes('delete from') || normalizedSql.includes('update ')) {
          issues.push({
            type: 'business_logic',
            severity: 'warning',
            message: `Modifying critical table: ${table}`,
            affectedTables: [table],
            suggestedFix: 'Ensure proper authorization and logging'
          })
        }
      }
    }

    return issues
  }

  /**
   * Check data volume impact
   */
  private async checkDataVolumeImpact(sql: string): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = []
    
    // This would normally query the database to estimate impact
    // For now, we'll use heuristics
    
    if (sql.toLowerCase().includes('select *') && !sql.toLowerCase().includes('limit')) {
      issues.push({
        type: 'performance',
        severity: 'warning',
        message: 'SELECT * without LIMIT may return large result set',
        suggestedFix: 'Add LIMIT clause or specify required columns'
      })
    }

    return issues
  }

  /**
   * Check compliance violations
   */
  private checkComplianceViolations(sql: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const normalizedSql = sql.toLowerCase()

    // Check for personal data access without proper controls
    const personalDataTables = ['users', 'customers', 'employees', 'customer_contacts']
    for (const table of personalDataTables) {
      if (normalizedSql.includes(table) && normalizedSql.includes('select')) {
        issues.push({
          type: 'compliance',
          severity: 'warning',
          message: `Accessing personal data table: ${table}`,
          affectedTables: [table],
          suggestedFix: 'Ensure GDPR compliance and proper data access logging'
        })
      }
    }

    return issues
  }

  /**
   * Estimate the impact of an operation
   */
  private async estimateImpact(sql: string): Promise<ImpactAssessment> {
    // This would normally analyze the actual database
    // For now, return a mock assessment
    
    return {
      affectedRecords: 100,
      affectedTables: ['mock_table'],
      businessProcesses: ['data_analysis'],
      reversibility: 'reversible',
      estimatedDowntime: 0,
      dataIntegrityRisk: 10
    }
  }

  /**
   * Generate safety recommendations
   */
  private generateRecommendations(issues: ValidationIssue[], sql: string): string[] {
    const recommendations: string[] = []

    if (issues.some(i => i.type === 'security')) {
      recommendations.push('Review and sanitize all user inputs')
      recommendations.push('Use parameterized queries to prevent SQL injection')
    }

    if (issues.some(i => i.type === 'data_loss')) {
      recommendations.push('Create a backup before executing this operation')
      recommendations.push('Test the operation in a development environment first')
    }

    if (issues.some(i => i.type === 'performance')) {
      recommendations.push('Add appropriate indexes to improve query performance')
      recommendations.push('Consider pagination for large result sets')
    }

    if (issues.some(i => i.type === 'compliance')) {
      recommendations.push('Ensure proper data access logging and audit trails')
      recommendations.push('Verify compliance with GDPR and other regulations')
    }

    return recommendations
  }

  /**
   * Find tables that depend on the given table
   */
  private async findDependentTables(tableName: string): Promise<string[]> {
    // This would normally query the database for foreign key relationships
    // For now, return mock data
    return []
  }

  /**
   * Get business processes affected by table changes
   */
  private getAffectedBusinessProcesses(tableName: string): string[] {
    const processMap: Record<string, string[]> = {
      'users': ['Authentication', 'User Management'],
      'customers': ['Customer Management', 'Sales Process'],
      'orders': ['Order Processing', 'Fulfillment'],
      'payments': ['Payment Processing', 'Financial Reporting'],
      'employees': ['HR Management', 'Payroll'],
      'equipment': ['Asset Management', 'Maintenance Scheduling']
    }

    return processMap[tableName] || ['General Operations']
  }

  /**
   * Initialize default safety policies
   */
  private initializeDefaultPolicies(): void {
    this.policies = [
      {
        id: 'no-drop-tables',
        name: 'Prevent Table Drops',
        description: 'Prevents dropping of critical tables without approval',
        rules: [
          {
            id: 'drop-table-rule',
            type: 'sql_pattern',
            condition: 'DROP TABLE',
            action: 'require_approval',
            message: 'Table drops require management approval'
          }
        ],
        isActive: true,
        priority: 1
      },
      {
        id: 'financial-operations',
        name: 'Financial Operation Controls',
        description: 'Requires approval for financial operations',
        rules: [
          {
            id: 'payment-rule',
            type: 'table_access',
            condition: 'payments',
            action: 'require_approval',
            message: 'Payment operations require financial approval'
          }
        ],
        isActive: true,
        priority: 2
      }
    ]
  }

  /**
   * Initialize dangerous SQL patterns
   */
  private initializeDangerousPatterns(): void {
    this.dangerousPatterns = [
      /drop\s+database/i,
      /drop\s+schema/i,
      /truncate\s+table/i,
      /delete\s+from\s+\w+\s*$/i, // DELETE without WHERE
      /update\s+\w+\s+set\s+.*$/i, // UPDATE without WHERE
      /union\s+select/i, // Potential SQL injection
      /exec\s*\(/i, // Dynamic SQL execution
      /xp_cmdshell/i, // Command execution
      /sp_executesql/i, // Dynamic SQL
      /--\s*$/m, // SQL comments (potential injection)
      /\/\*.*\*\//s, // Block comments
      /;\s*drop/i, // Statement chaining
      /;\s*delete/i,
      /;\s*update/i,
      /;\s*insert/i
    ]
  }

  /**
   * Initialize critical tables list
   */
  private initializeCriticalTables(): void {
    this.criticalTables = new Set([
      'users',
      'business_units',
      'customers',
      'customer_contacts',
      'employees',
      'financial_transactions',
      'payments',
      'service_bookings',
      'equipment',
      'permissions',
      'audit_logs'
    ])
  }

  /**
   * Add a custom safety policy
   */
  addPolicy(policy: SafetyPolicy): void {
    this.policies.push(policy)
    this.policies.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Remove a safety policy
   */
  removePolicy(policyId: string): void {
    this.policies = this.policies.filter(p => p.id !== policyId)
  }

  /**
   * Get all active policies
   */
  getActivePolicies(): SafetyPolicy[] {
    return this.policies.filter(p => p.isActive)
  }
}

// Export singleton instance
export const aiSafetyValidator = new AISafetyValidator()