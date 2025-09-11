// CEO Analysis Functions for Database Schema
// This module provides advanced analysis capabilities for database oversight

export interface MissingLink {
  id: string
  sourceTable: string
  targetTable: string
  confidence: number
  reason: string
  businessImpact: 'high' | 'medium' | 'low'
  suggestedColumns: string[]
}

export interface DataIntegrityIssue {
  id: string
  type: 'orphaned_records' | 'missing_constraints' | 'duplicate_data' | 'invalid_references'
  tableName: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  recordCount: number
}

export interface TableInfo {
  id: string
  name: string
  displayName: string
  recordCount: number
  relationshipCount: number
  columns: Array<{
    name: string
    isForeignKey: boolean
  }>
}

export interface RelationshipInfo {
  sourceTable: string
  targetTable: string
}

export const detectMissingLinks = (
  tables: TableInfo[], 
  relationships: RelationshipInfo[]
): MissingLink[] => {
  const potentialLinks: MissingLink[] = []
  
  // Analyze table naming patterns and suggest missing relationships
  tables.forEach(sourceTable => {
    tables.forEach(targetTable => {
      if (sourceTable.id === targetTable.id) return
      
      // Check if relationship already exists
      const existingRel = relationships.find(rel => 
        (rel.sourceTable === sourceTable.name && rel.targetTable === targetTable.name) ||
        (rel.sourceTable === targetTable.name && rel.targetTable === sourceTable.name)
      )
      
      if (existingRel) return
      
      // Business logic analysis
      const confidence = calculateRelationshipConfidence(sourceTable, targetTable)
      
      if (confidence > 0.6) {
        potentialLinks.push({
          id: `missing-${sourceTable.name}-${targetTable.name}`,
          sourceTable: sourceTable.name,
          targetTable: targetTable.name,
          confidence,
          reason: generateMissingLinkReason(sourceTable, targetTable),
          businessImpact: confidence > 0.8 ? 'high' : confidence > 0.7 ? 'medium' : 'low',
          suggestedColumns: suggestLinkingColumns(sourceTable, targetTable)
        })
      }
    })
  })
  
  return potentialLinks.sort((a, b) => b.confidence - a.confidence)
}

const calculateRelationshipConfidence = (table1: TableInfo, table2: TableInfo): number => {
  let confidence = 0
  
  // Business unit relationships (high priority for CEO)
  if (table1.name.includes('business') || table2.name.includes('business')) {
    confidence += 0.3
  }
  
  // Common business patterns
  const businessPatterns = [
    ['users', 'employees'], ['employees', 'departments'], ['departments', 'business_units'],
    ['customers', 'leads'], ['leads', 'services'], ['services', 'equipment'],
    ['jobs', 'visits'], ['visits', 'employees'], ['equipment', 'equipment_categories']
  ]
  
  businessPatterns.forEach(([pattern1, pattern2]) => {
    if ((table1.name.includes(pattern1) && table2.name.includes(pattern2)) ||
        (table1.name.includes(pattern2) && table2.name.includes(pattern1))) {
      confidence += 0.4
    }
  })
  
  // Column name analysis
  table1.columns.forEach(col1 => {
    table2.columns.forEach(col2 => {
      if (col1.name === col2.name && col1.name.includes('id')) {
        confidence += 0.2
      }
      if (col1.name === `${table2.name}_id` || col2.name === `${table1.name}_id`) {
        confidence += 0.3
      }
    })
  })
  
  return Math.min(confidence, 1.0)
}

const generateMissingLinkReason = (table1: TableInfo, table2: TableInfo): string => {
  if (table1.name.includes('business') || table2.name.includes('business')) {
    return 'Critical business unit relationship for multi-tenant structure'
  }
  if (table1.name.includes('employee') || table2.name.includes('employee')) {
    return 'Employee workflow and organizational structure'
  }
  if (table1.name.includes('customer') || table2.name.includes('lead')) {
    return 'Customer journey and sales pipeline'
  }
  return 'Potential operational efficiency improvement'
}

const suggestLinkingColumns = (table1: TableInfo, table2: TableInfo): string[] => {
  const suggestions: string[] = []
  
  // Look for existing ID columns that could be foreign keys
  table1.columns.forEach(col => {
    if (col.name.includes('id') && !col.isForeignKey) {
      suggestions.push(`${table1.name}.${col.name} → ${table2.name}.id`)
    }
  })
  
  table2.columns.forEach(col => {
    if (col.name.includes('id') && !col.isForeignKey) {
      suggestions.push(`${table2.name}.${col.name} → ${table1.name}.id`)
    }
  })
  
  // Suggest new columns if none exist
  if (suggestions.length === 0) {
    suggestions.push(`Add ${table2.name}_id to ${table1.name}`)
    suggestions.push(`Add ${table1.name}_id to ${table2.name}`)
  }
  
  return suggestions
}

export const checkDataIntegrity = (
  tables: TableInfo[], 
  relationships: RelationshipInfo[]
): DataIntegrityIssue[] => {
  const issues: DataIntegrityIssue[] = []
  
  // Check for tables without proper relationships (isolated tables)
  tables.forEach(table => {
    if (table.relationshipCount === 0 && table.recordCount > 0) {
      issues.push({
        id: `isolated-${table.name}`,
        type: 'missing_constraints',
        tableName: table.name,
        description: `Table '${table.displayName}' has ${table.recordCount} records but no relationships`,
        severity: 'warning',
        recordCount: table.recordCount
      })
    }
  })
  
  // Check for tables with suspicious record counts
  const avgRecordCount = tables.reduce((sum, t) => sum + t.recordCount, 0) / tables.length
  tables.forEach(table => {
    if (table.recordCount > avgRecordCount * 10) {
      issues.push({
        id: `large-table-${table.name}`,
        type: 'duplicate_data',
        tableName: table.name,
        description: `Table '${table.displayName}' has unusually high record count (${table.recordCount.toLocaleString()})`,
        severity: 'info',
        recordCount: table.recordCount
      })
    }
  })
  
  // Check for missing business unit relationships
  const businessUnitTable = tables.find(t => t.name === 'business_units')
  if (businessUnitTable) {
    tables.forEach(table => {
      if (table.name !== 'business_units' && !hasRelationshipWith(table, businessUnitTable, relationships)) {
        issues.push({
          id: `no-business-unit-${table.name}`,
          type: 'missing_constraints',
          tableName: table.name,
          description: `Table '${table.displayName}' not linked to business units (multi-tenant concern)`,
          severity: 'critical',
          recordCount: table.recordCount
        })
      }
    })
  }
  
  return issues.sort((a, b) => {
    const severityOrder = { critical: 3, warning: 2, info: 1 }
    return severityOrder[b.severity] - severityOrder[a.severity]
  })
}

const hasRelationshipWith = (
  table1: TableInfo, 
  table2: TableInfo, 
  relationships: RelationshipInfo[]
): boolean => {
  return relationships.some(rel => 
    (rel.sourceTable === table1.name && rel.targetTable === table2.name) ||
    (rel.sourceTable === table2.name && rel.targetTable === table1.name)
  )
}
