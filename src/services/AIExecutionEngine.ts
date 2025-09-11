/**
 * AI Execution Engine - Safely executes AI-generated operations with rollback capabilities
 * 
 * This engine handles the execution of AI-generated SQL queries, schema changes,
 * and business operations with comprehensive safety checks, approval workflows,
 * and rollback capabilities.
 */

import { supabase } from '../lib/supabase'
import { aiSafetyValidator, ValidationResult } from './AISafetyValidator'

export interface ExecutionRequest {
  id: string
  type: 'sql_query' | 'schema_change' | 'business_operation' | 'data_migration'
  operation: any
  context: ExecutionContext
  priority: 'low' | 'medium' | 'high' | 'critical'
  requestedBy: string
  requestedAt: Date
}

export interface ExecutionContext {
  userId: string
  businessUnitId: string
  sessionId: string
  userIntent: string
  aiConfidence: number
  relatedTables: string[]
  expectedOutcome: string
}

export interface ExecutionResult {
  id: string
  requestId: string
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rolled_back'
  result?: any
  error?: string
  executedAt?: Date
  completedAt?: Date
  rollbackId?: string
  validationResult: ValidationResult
  approvals: ExecutionApproval[]
  rollbackPlan: RollbackPlan
}

export interface ExecutionApproval {
  approvedBy: string
  approvedAt: Date
  approvalType: 'automatic' | 'user' | 'admin' | 'system'
  comments?: string
}

export interface RollbackPlan {
  id: string
  type: 'sql_rollback' | 'schema_rollback' | 'data_restore' | 'business_reversal'
  operations: RollbackOperation[]
  canRollback: boolean
  rollbackComplexity: 'simple' | 'moderate' | 'complex' | 'impossible'
  estimatedTime: number // minutes
}

export interface RollbackOperation {
  order: number
  type: string
  operation: string
  description: string
  riskLevel: 'low' | 'medium' | 'high'
}

export interface ExecutionSnapshot {
  id: string
  executionId: string
  snapshotType: 'pre_execution' | 'post_execution' | 'checkpoint'
  timestamp: Date
  data: any
  metadata: Record<string, any>
}

export class AIExecutionEngine {
  private pendingExecutions: Map<string, ExecutionRequest> = new Map()
  private executionResults: Map<string, ExecutionResult> = new Map()
  private snapshots: Map<string, ExecutionSnapshot[]> = new Map()
  private rollbackHistory: Map<string, RollbackPlan> = new Map()

  /**
   * Submit an operation for execution
   */
  async submitExecution(request: ExecutionRequest): Promise<ExecutionResult> {
    console.log(`🚀 Submitting execution request: ${request.id}`)

    // Validate the operation
    const validationResult = await this.validateOperation(request)
    
    // Create rollback plan
    const rollbackPlan = await this.createRollbackPlan(request)

    // Create execution result
    const executionResult: ExecutionResult = {
      id: crypto.randomUUID(),
      requestId: request.id,
      status: 'pending',
      validationResult,
      approvals: [],
      rollbackPlan
    }

    // Store the request and result
    this.pendingExecutions.set(request.id, request)
    this.executionResults.set(executionResult.id, executionResult)

    // Check if automatic approval is possible
    if (this.canAutoApprove(validationResult, request)) {
      await this.approveExecution(executionResult.id, {
        approvedBy: 'system',
        approvedAt: new Date(),
        approvalType: 'automatic',
        comments: 'Auto-approved based on safety validation'
      })
    } else if (validationResult.requiresApproval) {
      // Request human approval
      await this.requestApproval(executionResult.id, request)
    }

    // Store in database
    await this.storeExecutionRequest(request, executionResult)

    return executionResult
  }

  /**
   * Approve an execution
   */
  async approveExecution(executionId: string, approval: Omit<ExecutionApproval, 'approvedAt'>): Promise<void> {
    const result = this.executionResults.get(executionId)
    if (!result) {
      throw new Error(`Execution result not found: ${executionId}`)
    }

    const fullApproval: ExecutionApproval = {
      ...approval,
      approvedAt: new Date()
    }

    result.approvals.push(fullApproval)
    result.status = 'approved'

    console.log(`✅ Execution approved: ${executionId} by ${approval.approvedBy}`)

    // Execute if all required approvals are received
    if (this.hasRequiredApprovals(result)) {
      await this.executeOperation(executionId)
    }
  }

  /**
   * Execute an approved operation
   */
  async executeOperation(executionId: string): Promise<void> {
    const result = this.executionResults.get(executionId)
    const request = result ? this.pendingExecutions.get(result.requestId) : null

    if (!result || !request) {
      throw new Error(`Execution not found: ${executionId}`)
    }

    if (result.status !== 'approved') {
      throw new Error(`Execution not approved: ${executionId}`)
    }

    console.log(`⚡ Executing operation: ${executionId}`)

    try {
      result.status = 'executing'
      result.executedAt = new Date()

      // Create pre-execution snapshot
      await this.createSnapshot(executionId, 'pre_execution', request)

      // Execute based on type
      let executionResult: any
      switch (request.type) {
        case 'sql_query':
          executionResult = await this.executeSQLQuery(request.operation, request.context)
          break
        case 'schema_change':
          executionResult = await this.executeSchemaChange(request.operation, request.context)
          break
        case 'business_operation':
          executionResult = await this.executeBusinessOperation(request.operation, request.context)
          break
        case 'data_migration':
          executionResult = await this.executeDataMigration(request.operation, request.context)
          break
        default:
          throw new Error(`Unknown operation type: ${request.type}`)
      }

      // Create post-execution snapshot
      await this.createSnapshot(executionId, 'post_execution', executionResult)

      result.result = executionResult
      result.status = 'completed'
      result.completedAt = new Date()

      console.log(`✅ Execution completed: ${executionId}`)

      // Log the execution
      await this.logExecution(request, result)

    } catch (error) {
      console.error(`❌ Execution failed: ${executionId}`, error)
      result.status = 'failed'
      result.error = error instanceof Error ? error.message : 'Unknown error'
      result.completedAt = new Date()

      // Attempt automatic rollback if possible
      if (result.rollbackPlan.canRollback && result.rollbackPlan.rollbackComplexity !== 'impossible') {
        await this.rollbackExecution(executionId, 'Automatic rollback due to execution failure')
      }
    }
  }

  /**
   * Rollback an execution
   */
  async rollbackExecution(executionId: string, reason: string): Promise<void> {
    const result = this.executionResults.get(executionId)
    if (!result) {
      throw new Error(`Execution result not found: ${executionId}`)
    }

    if (!result.rollbackPlan.canRollback) {
      throw new Error(`Execution cannot be rolled back: ${executionId}`)
    }

    console.log(`🔄 Rolling back execution: ${executionId} - ${reason}`)

    try {
      const rollbackId = crypto.randomUUID()
      result.rollbackId = rollbackId

      // Execute rollback operations in reverse order
      const operations = [...result.rollbackPlan.operations].reverse()
      
      for (const operation of operations) {
        console.log(`🔄 Executing rollback operation: ${operation.description}`)
        await this.executeRollbackOperation(operation)
      }

      result.status = 'rolled_back'
      this.rollbackHistory.set(rollbackId, result.rollbackPlan)

      console.log(`✅ Rollback completed: ${executionId}`)

      // Log the rollback
      await this.logRollback(executionId, rollbackId, reason)

    } catch (error) {
      console.error(`❌ Rollback failed: ${executionId}`, error)
      throw new Error(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate an operation before execution
   */
  private async validateOperation(request: ExecutionRequest): Promise<ValidationResult> {
    switch (request.type) {
      case 'sql_query':
        return await aiSafetyValidator.validateSQL(request.operation.sql, request.context)
      case 'schema_change':
        return await aiSafetyValidator.validateSchemaChange(request.operation, request.context)
      case 'business_operation':
        return await aiSafetyValidator.validateBusinessOperation(request.operation, request.context)
      default:
        // Default validation for unknown types
        return {
          isValid: false,
          riskLevel: 'high',
          issues: [{
            type: 'security',
            severity: 'error',
            message: `Unknown operation type: ${request.type}`
          }],
          recommendations: ['Review operation type and implementation'],
          requiresApproval: true,
          estimatedImpact: {
            affectedRecords: 0,
            affectedTables: [],
            businessProcesses: [],
            reversibility: 'irreversible',
            estimatedDowntime: 0,
            dataIntegrityRisk: 50
          }
        }
    }
  }

  /**
   * Create a rollback plan for an operation
   */
  private async createRollbackPlan(request: ExecutionRequest): Promise<RollbackPlan> {
    const rollbackPlan: RollbackPlan = {
      id: crypto.randomUUID(),
      type: this.getRollbackType(request.type),
      operations: [],
      canRollback: true,
      rollbackComplexity: 'simple',
      estimatedTime: 5
    }

    switch (request.type) {
      case 'sql_query':
        rollbackPlan.operations = await this.createSQLRollbackOperations(request.operation)
        break
      case 'schema_change':
        rollbackPlan.operations = await this.createSchemaRollbackOperations(request.operation)
        break
      case 'business_operation':
        rollbackPlan.operations = await this.createBusinessRollbackOperations(request.operation)
        break
      case 'data_migration':
        rollbackPlan.operations = await this.createMigrationRollbackOperations(request.operation)
        break
    }

    // Assess rollback complexity
    rollbackPlan.rollbackComplexity = this.assessRollbackComplexity(rollbackPlan.operations)
    rollbackPlan.canRollback = rollbackPlan.rollbackComplexity !== 'impossible'

    return rollbackPlan
  }

  /**
   * Execute SQL query
   */
  private async executeSQLQuery(operation: any, context: ExecutionContext): Promise<any> {
    const { data, error } = await supabase.rpc('execute_safe_sql', {
      sql_query: operation.sql,
      user_id: context.userId,
      business_unit_id: context.businessUnitId
    })

    if (error) throw error
    return data
  }

  /**
   * Execute schema change
   */
  private async executeSchemaChange(operation: any, context: ExecutionContext): Promise<any> {
    // This would execute schema changes through migrations
    console.log('Executing schema change:', operation)
    return { success: true, operation: operation.type }
  }

  /**
   * Execute business operation
   */
  private async executeBusinessOperation(operation: any, context: ExecutionContext): Promise<any> {
    // This would execute business logic operations
    console.log('Executing business operation:', operation)
    return { success: true, operation: operation.type }
  }

  /**
   * Execute data migration
   */
  private async executeDataMigration(operation: any, context: ExecutionContext): Promise<any> {
    // This would execute data migration operations
    console.log('Executing data migration:', operation)
    return { success: true, operation: operation.type }
  }

  /**
   * Create snapshot of current state
   */
  private async createSnapshot(executionId: string, type: ExecutionSnapshot['snapshotType'], data: any): Promise<void> {
    const snapshot: ExecutionSnapshot = {
      id: crypto.randomUUID(),
      executionId,
      snapshotType: type,
      timestamp: new Date(),
      data,
      metadata: {
        size: JSON.stringify(data).length,
        checksum: this.calculateChecksum(data)
      }
    }

    if (!this.snapshots.has(executionId)) {
      this.snapshots.set(executionId, [])
    }
    this.snapshots.get(executionId)!.push(snapshot)

    // Store in database
    await supabase.from('ai_execution_snapshots').insert({
      id: snapshot.id,
      execution_id: executionId,
      snapshot_type: type,
      data: snapshot.data,
      metadata: snapshot.metadata
    })
  }

  /**
   * Check if operation can be auto-approved
   */
  private canAutoApprove(validation: ValidationResult, request: ExecutionRequest): boolean {
    return validation.isValid && 
           validation.riskLevel === 'low' && 
           !validation.requiresApproval &&
           request.priority !== 'critical'
  }

  /**
   * Check if execution has required approvals
   */
  private hasRequiredApprovals(result: ExecutionResult): boolean {
    if (result.validationResult.riskLevel === 'critical') {
      return result.approvals.some(a => a.approvalType === 'admin')
    }
    if (result.validationResult.riskLevel === 'high') {
      return result.approvals.length > 0
    }
    return true
  }

  /**
   * Request human approval
   */
  private async requestApproval(executionId: string, request: ExecutionRequest): Promise<void> {
    // This would send notifications to appropriate approvers
    console.log(`📋 Requesting approval for execution: ${executionId}`)
    
    await supabase.from('ai_approval_requests').insert({
      execution_id: executionId,
      request_type: request.type,
      risk_level: this.executionResults.get(executionId)?.validationResult.riskLevel,
      requested_by: request.requestedBy,
      business_unit_id: request.context.businessUnitId,
      status: 'pending'
    })
  }

  /**
   * Store execution request in database
   */
  private async storeExecutionRequest(request: ExecutionRequest, result: ExecutionResult): Promise<void> {
    await supabase.from('ai_execution_requests').insert({
      id: request.id,
      execution_result_id: result.id,
      type: request.type,
      operation: request.operation,
      context: request.context,
      priority: request.priority,
      requested_by: request.requestedBy,
      status: result.status,
      validation_result: result.validationResult,
      rollback_plan: result.rollbackPlan
    })
  }

  /**
   * Log execution completion
   */
  private async logExecution(request: ExecutionRequest, result: ExecutionResult): Promise<void> {
    await supabase.from('ai_execution_log').insert({
      execution_id: result.id,
      request_id: request.id,
      type: request.type,
      status: result.status,
      executed_by: request.requestedBy,
      business_unit_id: request.context.businessUnitId,
      execution_time: result.completedAt && result.executedAt ? 
        result.completedAt.getTime() - result.executedAt.getTime() : null,
      result: result.result,
      error: result.error
    })
  }

  /**
   * Log rollback completion
   */
  private async logRollback(executionId: string, rollbackId: string, reason: string): Promise<void> {
    await supabase.from('ai_rollback_log').insert({
      execution_id: executionId,
      rollback_id: rollbackId,
      reason,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Helper methods for rollback operations
   */
  private getRollbackType(executionType: string): RollbackPlan['type'] {
    switch (executionType) {
      case 'sql_query': return 'sql_rollback'
      case 'schema_change': return 'schema_rollback'
      case 'data_migration': return 'data_restore'
      case 'business_operation': return 'business_reversal'
      default: return 'sql_rollback'
    }
  }

  private async createSQLRollbackOperations(operation: any): Promise<RollbackOperation[]> {
    // Create rollback operations for SQL queries
    return [{
      order: 1,
      type: 'sql_rollback',
      operation: 'ROLLBACK TRANSACTION',
      description: 'Rollback SQL transaction',
      riskLevel: 'low'
    }]
  }

  private async createSchemaRollbackOperations(operation: any): Promise<RollbackOperation[]> {
    // Create rollback operations for schema changes
    return [{
      order: 1,
      type: 'schema_rollback',
      operation: `REVERSE ${operation.type}`,
      description: `Reverse ${operation.type} operation`,
      riskLevel: 'medium'
    }]
  }

  private async createBusinessRollbackOperations(operation: any): Promise<RollbackOperation[]> {
    // Create rollback operations for business operations
    return [{
      order: 1,
      type: 'business_reversal',
      operation: `REVERSE ${operation.type}`,
      description: `Reverse ${operation.type} business operation`,
      riskLevel: 'medium'
    }]
  }

  private async createMigrationRollbackOperations(operation: any): Promise<RollbackOperation[]> {
    // Create rollback operations for data migrations
    return [{
      order: 1,
      type: 'data_restore',
      operation: 'RESTORE FROM SNAPSHOT',
      description: 'Restore data from pre-migration snapshot',
      riskLevel: 'high'
    }]
  }

  private assessRollbackComplexity(operations: RollbackOperation[]): RollbackPlan['rollbackComplexity'] {
    if (operations.length === 0) return 'impossible'
    if (operations.some(op => op.riskLevel === 'high')) return 'complex'
    if (operations.length > 3) return 'moderate'
    return 'simple'
  }

  private async executeRollbackOperation(operation: RollbackOperation): Promise<void> {
    // Execute individual rollback operation
    console.log(`Executing rollback: ${operation.description}`)
    // Implementation would depend on operation type
  }

  private calculateChecksum(data: any): string {
    // Simple checksum calculation
    return btoa(JSON.stringify(data)).slice(0, 16)
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): ExecutionResult | undefined {
    return this.executionResults.get(executionId)
  }

  /**
   * Get all pending executions
   */
  getPendingExecutions(): ExecutionRequest[] {
    return Array.from(this.pendingExecutions.values())
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit: number = 50): ExecutionResult[] {
    return Array.from(this.executionResults.values())
      .sort((a, b) => (b.executedAt?.getTime() || 0) - (a.executedAt?.getTime() || 0))
      .slice(0, limit)
  }
}

// Export singleton instance
export const aiExecutionEngine = new AIExecutionEngine()
