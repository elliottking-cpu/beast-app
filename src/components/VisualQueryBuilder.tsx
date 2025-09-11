/**
 * Visual Query Builder - Drag-and-drop interface for building complex database queries
 * 
 * This component provides an intuitive visual interface for building SQL queries
 * without writing code. Users can drag tables, columns, and operations to create
 * complex queries with joins, filters, aggregations, and more.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import './VisualQueryBuilder.css'

interface TableInfo {
  name: string
  columns: ColumnInfo[]
  position: { x: number; y: number }
  isSelected: boolean
}

interface ColumnInfo {
  name: string
  type: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  isNullable: boolean
  referencedTable?: string
  referencedColumn?: string
}

interface QueryJoin {
  id: string
  leftTable: string
  leftColumn: string
  rightTable: string
  rightColumn: string
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'
}

interface QueryFilter {
  id: string
  table: string
  column: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'like' | 'in' | 'between' | 'is_null' | 'is_not_null'
  value: any
  logicalOperator?: 'AND' | 'OR'
}

interface QuerySort {
  id: string
  table: string
  column: string
  direction: 'ASC' | 'DESC'
}

interface QueryGroup {
  id: string
  table: string
  column: string
}

interface QueryAggregate {
  id: string
  function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'
  table: string
  column: string
  alias?: string
}

interface VisualQuery {
  id: string
  name: string
  tables: string[]
  selectedColumns: Array<{ table: string; column: string; alias?: string }>
  joins: QueryJoin[]
  filters: QueryFilter[]
  sorts: QuerySort[]
  groups: QueryGroup[]
  aggregates: QueryAggregate[]
  limit?: number
  generatedSQL: string
}

interface VisualQueryBuilderProps {
  isVisible: boolean
  onClose: () => void
  onQueryExecute: (query: VisualQuery, results: any[]) => void
}

const VisualQueryBuilder: React.FC<VisualQueryBuilderProps> = ({
  isVisible,
  onClose,
  onQueryExecute
}) => {
  // State management
  const [availableTables, setAvailableTables] = useState<TableInfo[]>([])
  const [queryTables, setQueryTables] = useState<TableInfo[]>([])
  const [currentQuery, setCurrentQuery] = useState<VisualQuery>({
    id: crypto.randomUUID(),
    name: 'New Query',
    tables: [],
    selectedColumns: [],
    joins: [],
    filters: [],
    sorts: [],
    groups: [],
    aggregates: [],
    generatedSQL: ''
  })
  
  const [activeTab, setActiveTab] = useState<'design' | 'filters' | 'sorting' | 'grouping' | 'sql' | 'results'>('design')
  const [isLoading, setIsLoading] = useState(false)
  const [queryResults, setQueryResults] = useState<any[]>([])
  const [draggedItem, setDraggedItem] = useState<any>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  const canvasRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Load available tables on mount
  useEffect(() => {
    if (isVisible) {
      loadAvailableTables()
    }
  }, [isVisible])

  // Update generated SQL when query changes
  useEffect(() => {
    const sql = generateSQL(currentQuery)
    setCurrentQuery(prev => ({ ...prev, generatedSQL: sql }))
  }, [currentQuery.tables, currentQuery.selectedColumns, currentQuery.joins, currentQuery.filters, currentQuery.sorts, currentQuery.groups, currentQuery.aggregates, currentQuery.limit])

  /**
   * Load all available tables and their column information
   */
  const loadAvailableTables = async () => {
    try {
      setIsLoading(true)
      console.log('🔍 Loading available tables for query builder...')

      // Get all table names
      const { data: tableNames, error: tablesError } = await supabase.rpc('get_all_table_names')
      if (tablesError) throw tablesError

      const tables: TableInfo[] = []

      // Load column information for each table (in batches)
      const batchSize = 10
      for (let i = 0; i < tableNames.length; i += batchSize) {
        const batch = tableNames.slice(i, i + batchSize)
        
        await Promise.all(batch.map(async (tableData: any) => {
          try {
            const { data: columns, error: columnsError } = await supabase.rpc('get_table_columns', {
              table_name_param: tableData.table_name
            })

            if (!columnsError && columns) {
              tables.push({
                name: tableData.table_name,
                columns: columns.map((col: any) => ({
                  name: col.column_name,
                  type: col.data_type,
                  isPrimaryKey: col.is_primary_key,
                  isForeignKey: col.is_foreign_key,
                  isNullable: col.is_nullable,
                  referencedTable: col.referenced_table,
                  referencedColumn: col.referenced_column
                })),
                position: { x: 0, y: 0 },
                isSelected: false
              })
            }
          } catch (error) {
            console.warn(`Failed to load columns for ${tableData.table_name}:`, error)
          }
        }))

        // Small delay between batches
        if (i + batchSize < tableNames.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      setAvailableTables(tables)
      console.log(`✅ Loaded ${tables.length} tables for query builder`)

    } catch (error) {
      console.error('❌ Failed to load tables:', error)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Add a table to the query canvas
   */
  const addTableToQuery = useCallback((tableName: string) => {
    const table = availableTables.find(t => t.name === tableName)
    if (!table || queryTables.some(t => t.name === tableName)) return

    const newTable: TableInfo = {
      ...table,
      position: {
        x: 100 + queryTables.length * 250,
        y: 100 + (queryTables.length % 3) * 200
      },
      isSelected: false
    }

    setQueryTables(prev => [...prev, newTable])
    setCurrentQuery(prev => ({
      ...prev,
      tables: [...prev.tables, tableName]
    }))
  }, [availableTables, queryTables])

  /**
   * Remove a table from the query canvas
   */
  const removeTableFromQuery = useCallback((tableName: string) => {
    setQueryTables(prev => prev.filter(t => t.name !== tableName))
    setCurrentQuery(prev => ({
      ...prev,
      tables: prev.tables.filter(t => t !== tableName),
      selectedColumns: prev.selectedColumns.filter(c => c.table !== tableName),
      joins: prev.joins.filter(j => j.leftTable !== tableName && j.rightTable !== tableName),
      filters: prev.filters.filter(f => f.table !== tableName),
      sorts: prev.sorts.filter(s => s.table !== tableName),
      groups: prev.groups.filter(g => g.table !== tableName),
      aggregates: prev.aggregates.filter(a => a.table !== tableName)
    }))
  }, [])

  /**
   * Toggle column selection
   */
  const toggleColumnSelection = useCallback((tableName: string, columnName: string) => {
    setCurrentQuery(prev => {
      const existingIndex = prev.selectedColumns.findIndex(
        c => c.table === tableName && c.column === columnName
      )

      if (existingIndex >= 0) {
        // Remove column
        return {
          ...prev,
          selectedColumns: prev.selectedColumns.filter((_, i) => i !== existingIndex)
        }
      } else {
        // Add column
        return {
          ...prev,
          selectedColumns: [...prev.selectedColumns, { table: tableName, column: columnName }]
        }
      }
    })
  }, [])

  /**
   * Add a join between two tables
   */
  const addJoin = useCallback((leftTable: string, leftColumn: string, rightTable: string, rightColumn: string, joinType: QueryJoin['joinType'] = 'INNER') => {
    const newJoin: QueryJoin = {
      id: crypto.randomUUID(),
      leftTable,
      leftColumn,
      rightTable,
      rightColumn,
      joinType
    }

    setCurrentQuery(prev => ({
      ...prev,
      joins: [...prev.joins, newJoin]
    }))
  }, [])

  /**
   * Add a filter condition
   */
  const addFilter = useCallback((table: string, column: string, operator: QueryFilter['operator'], value: any) => {
    const newFilter: QueryFilter = {
      id: crypto.randomUUID(),
      table,
      column,
      operator,
      value,
      logicalOperator: currentQuery.filters.length > 0 ? 'AND' : undefined
    }

    setCurrentQuery(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }))
  }, [currentQuery.filters.length])

  /**
   * Generate SQL from visual query
   */
  const generateSQL = (query: VisualQuery): string => {
    if (query.tables.length === 0) {
      return '-- No tables selected'
    }

    let sql = 'SELECT '

    // SELECT clause
    if (query.selectedColumns.length === 0) {
      sql += '*'
    } else {
      const columns = query.selectedColumns.map(col => {
        const fullColumn = `${col.table}.${col.column}`
        return col.alias ? `${fullColumn} AS ${col.alias}` : fullColumn
      })
      sql += columns.join(', ')
    }

    // Add aggregates
    if (query.aggregates.length > 0) {
      const aggregates = query.aggregates.map(agg => {
        const func = `${agg.function}(${agg.table}.${agg.column})`
        return agg.alias ? `${func} AS ${agg.alias}` : func
      })
      
      if (query.selectedColumns.length > 0) {
        sql += ', ' + aggregates.join(', ')
      } else {
        sql = 'SELECT ' + aggregates.join(', ')
      }
    }

    // FROM clause
    sql += `\nFROM ${query.tables[0]}`

    // JOIN clauses
    for (const join of query.joins) {
      sql += `\n${join.joinType} JOIN ${join.rightTable} ON ${join.leftTable}.${join.leftColumn} = ${join.rightTable}.${join.rightColumn}`
    }

    // WHERE clause
    if (query.filters.length > 0) {
      sql += '\nWHERE '
      const conditions = query.filters.map((filter, index) => {
        let condition = `${filter.table}.${filter.column}`
        
        switch (filter.operator) {
          case 'equals':
            condition += ` = '${filter.value}'`
            break
          case 'not_equals':
            condition += ` != '${filter.value}'`
            break
          case 'greater_than':
            condition += ` > ${filter.value}`
            break
          case 'less_than':
            condition += ` < ${filter.value}`
            break
          case 'like':
            condition += ` ILIKE '%${filter.value}%'`
            break
          case 'in':
            condition += ` IN (${Array.isArray(filter.value) ? filter.value.map(v => `'${v}'`).join(', ') : `'${filter.value}'`})`
            break
          case 'between':
            condition += ` BETWEEN '${filter.value.min}' AND '${filter.value.max}'`
            break
          case 'is_null':
            condition += ' IS NULL'
            break
          case 'is_not_null':
            condition += ' IS NOT NULL'
            break
        }

        if (index > 0 && filter.logicalOperator) {
          condition = `${filter.logicalOperator} ${condition}`
        }

        return condition
      })
      sql += conditions.join(' ')
    }

    // GROUP BY clause
    if (query.groups.length > 0) {
      const groupColumns = query.groups.map(g => `${g.table}.${g.column}`)
      sql += `\nGROUP BY ${groupColumns.join(', ')}`
    }

    // ORDER BY clause
    if (query.sorts.length > 0) {
      const sortColumns = query.sorts.map(s => `${s.table}.${s.column} ${s.direction}`)
      sql += `\nORDER BY ${sortColumns.join(', ')}`
    }

    // LIMIT clause
    if (query.limit) {
      sql += `\nLIMIT ${query.limit}`
    }

    return sql
  }

  /**
   * Execute the current query
   */
  const executeQuery = async () => {
    if (!currentQuery.generatedSQL || currentQuery.generatedSQL.includes('-- No tables selected')) {
      return
    }

    try {
      setIsLoading(true)
      console.log('🔍 Executing visual query:', currentQuery.generatedSQL)

      // For safety, we'll use a read-only execution
      const { data, error } = await supabase.rpc('execute_safe_query', {
        sql_query: currentQuery.generatedSQL
      })

      if (error) throw error

      setQueryResults(data || [])
      setActiveTab('results')
      
      // Notify parent component
      onQueryExecute(currentQuery, data || [])

    } catch (error) {
      console.error('❌ Query execution failed:', error)
      setQueryResults([])
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle drag and drop for tables
   */
  const handleTableDragStart = (e: React.MouseEvent, tableName: string) => {
    const table = queryTables.find(t => t.name === tableName)
    if (!table) return

    setDraggedItem({ type: 'table', name: tableName })
    setDragOffset({
      x: e.clientX - table.position.x,
      y: e.clientY - table.position.y
    })
  }

  const handleTableDrag = (e: React.MouseEvent) => {
    if (!draggedItem || draggedItem.type !== 'table') return

    const newPosition = {
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    }

    setQueryTables(prev => prev.map(table => 
      table.name === draggedItem.name
        ? { ...table, position: newPosition }
        : table
    ))
  }

  const handleTableDragEnd = () => {
    setDraggedItem(null)
    setDragOffset({ x: 0, y: 0 })
  }

  if (!isVisible) return null

  return (
    <div className="visual-query-builder">
      <div className="query-builder-header">
        <div className="query-info">
          <h2>Visual Query Builder</h2>
          <input
            type="text"
            value={currentQuery.name}
            onChange={(e) => setCurrentQuery(prev => ({ ...prev, name: e.target.value }))}
            className="query-name-input"
          />
        </div>
        <div className="query-actions">
          <button 
            className="execute-btn"
            onClick={executeQuery}
            disabled={isLoading || currentQuery.tables.length === 0}
          >
            {isLoading ? '⏳ Executing...' : '▶️ Execute Query'}
          </button>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="query-builder-tabs">
        <button 
          className={`tab ${activeTab === 'design' ? 'active' : ''}`}
          onClick={() => setActiveTab('design')}
        >
          🎨 Design
        </button>
        <button 
          className={`tab ${activeTab === 'filters' ? 'active' : ''}`}
          onClick={() => setActiveTab('filters')}
        >
          🔍 Filters ({currentQuery.filters.length})
        </button>
        <button 
          className={`tab ${activeTab === 'sorting' ? 'active' : ''}`}
          onClick={() => setActiveTab('sorting')}
        >
          📊 Sorting ({currentQuery.sorts.length})
        </button>
        <button 
          className={`tab ${activeTab === 'grouping' ? 'active' : ''}`}
          onClick={() => setActiveTab('grouping')}
        >
          📈 Grouping ({currentQuery.groups.length})
        </button>
        <button 
          className={`tab ${activeTab === 'sql' ? 'active' : ''}`}
          onClick={() => setActiveTab('sql')}
        >
          💻 SQL
        </button>
        <button 
          className={`tab ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          📋 Results ({queryResults.length})
        </button>
      </div>

      <div className="query-builder-content">
        {activeTab === 'design' && (
          <div className="design-tab">
            <div className="tables-sidebar">
              <h3>Available Tables</h3>
              <div className="tables-list">
                {availableTables.map(table => (
                  <div 
                    key={table.name}
                    className={`table-item ${queryTables.some(t => t.name === table.name) ? 'selected' : ''}`}
                    onClick={() => addTableToQuery(table.name)}
                  >
                    <span className="table-name">{table.name}</span>
                    <span className="column-count">({table.columns.length} columns)</span>
                  </div>
                ))}
              </div>
            </div>

            <div 
              className="query-canvas"
              ref={canvasRef}
              onMouseMove={handleTableDrag}
              onMouseUp={handleTableDragEnd}
            >
              <svg ref={svgRef} className="connections-svg">
                {/* Render connection lines between joined tables */}
                {currentQuery.joins.map(join => {
                  const leftTable = queryTables.find(t => t.name === join.leftTable)
                  const rightTable = queryTables.find(t => t.name === join.rightTable)
                  
                  if (!leftTable || !rightTable) return null

                  const x1 = leftTable.position.x + 150
                  const y1 = leftTable.position.y + 50
                  const x2 = rightTable.position.x + 150
                  const y2 = rightTable.position.y + 50

                  return (
                    <line
                      key={join.id}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#10b981"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                    />
                  )
                })}
                
                {/* Arrow marker definition */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      fill="#10b981"
                    />
                  </marker>
                </defs>
              </svg>

              {/* Render query tables */}
              {queryTables.map(table => (
                <div
                  key={table.name}
                  className="query-table"
                  style={{
                    left: table.position.x,
                    top: table.position.y
                  }}
                  onMouseDown={(e) => handleTableDragStart(e, table.name)}
                >
                  <div className="table-header">
                    <span className="table-name">{table.name}</span>
                    <button 
                      className="remove-table-btn"
                      onClick={() => removeTableFromQuery(table.name)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="table-columns">
                    {table.columns.map(column => (
                      <div
                        key={column.name}
                        className={`column-item ${
                          currentQuery.selectedColumns.some(c => c.table === table.name && c.column === column.name)
                            ? 'selected'
                            : ''
                        }`}
                        onClick={() => toggleColumnSelection(table.name, column.name)}
                      >
                        <span className="column-name">{column.name}</span>
                        <span className="column-type">{column.type}</span>
                        {column.isPrimaryKey && <span className="pk-indicator">PK</span>}
                        {column.isForeignKey && <span className="fk-indicator">FK</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'sql' && (
          <div className="sql-tab">
            <div className="sql-editor">
              <h3>Generated SQL</h3>
              <pre className="sql-code">{currentQuery.generatedSQL}</pre>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="results-tab">
            <div className="results-header">
              <h3>Query Results ({queryResults.length} rows)</h3>
            </div>
            <div className="results-table">
              {queryResults.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      {Object.keys(queryResults[0]).map(key => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResults.slice(0, 100).map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value, cellIndex) => (
                          <td key={cellIndex}>
                            {value !== null ? String(value) : <em>null</em>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-results">
                  <p>No results to display. Execute a query to see results here.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VisualQueryBuilder
