import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { detectMissingLinks, checkDataIntegrity, MissingLink, DataIntegrityIssue } from './CEOAnalysis'
import { aiContextEngine } from '../services/AIContextEngine'
import BusinessBrainInterface from './BusinessBrainInterface'
import './DatabaseSchemaNew.css'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TableInfo {
  id: string
  name: string
  displayName: string
  schema: string
  recordCount: number
  columnCount: number
  relationshipCount: number
  position: { x: number; y: number }
  size: { width: number; height: number }
  isSelected: boolean
  isHighlighted: boolean
  tableType: 'core' | 'lookup' | 'junction' | 'data'
  columns: ColumnInfo[]
  relationships: RelationshipInfo[]
}

interface ColumnInfo {
  name: string
  type: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  isNullable: boolean
  defaultValue?: string
  referencedTable?: string
  referencedColumn?: string
}

interface RelationshipInfo {
  id: string
  sourceTable: string
  targetTable: string
  sourceColumn: string
  targetColumn: string
  relationshipType: '1:1' | '1:many' | 'many:many'
  constraintName: string
  isActive: boolean
}

interface RecordInfo {
  id: string | number
  tableName: string
  data: Record<string, any>
  relatedRecords: Record<string, RecordInfo[]>
}

interface ViewportState {
  zoom: number
  pan: { x: number; y: number }
  bounds: { width: number; height: number }
}

interface FilterState {
  searchTerm: string
  tableTypes: string[]
  relationshipTypes: string[]
  minRelationships: number
  maxRelationships: number
  showEmptyTables: boolean
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DatabaseSchemaNew: React.FC = () => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [tables, setTables] = useState<TableInfo[]>([])
  const [relationships, setRelationships] = useState<RelationshipInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<RecordInfo | null>(null)
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    bounds: { width: 1200, height: 800 }
  })
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    tableTypes: ['core', 'lookup', 'junction', 'data'],
    relationshipTypes: ['1:1', '1:many', 'many:many'],
    minRelationships: 0,
    maxRelationships: 100,
    showEmptyTables: true
  })
  const [layoutMode, setLayoutMode] = useState<'force' | 'hierarchical' | 'circular'>('force')
  const [isLoading, setIsLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showMiniMap, setShowMiniMap] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isTableDragging, setIsTableDragging] = useState(false)
  const [draggedTable, setDraggedTable] = useState<string | null>(null)
  const [missingLinks, setMissingLinks] = useState<MissingLink[]>([])
  const [dataIntegrityIssues, setDataIntegrityIssues] = useState<DataIntegrityIssue[]>([])
  const [showCEOAnalysis, setShowCEOAnalysis] = useState(false)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [tableRecords, setTableRecords] = useState<Record<string, any[]>>({})

  // AI Brain states
  const [aiInitialized, setAiInitialized] = useState(false)
  const [businessContext, setBusinessContext] = useState<any>(null)
  const [aiMetrics, setAiMetrics] = useState<any[]>([])
  const [businessInsights, setBusinessInsights] = useState<any[]>([])
  const [activityFeed, setActivityFeed] = useState<any[]>([])
  const [aiLearningProgress, setAiLearningProgress] = useState<any[]>([])
  const [showAIInterface, setShowAIInterface] = useState(false)
  const [recordsLoading, setRecordsLoading] = useState<string | null>(null)
  const [hoveredTable, setHoveredTable] = useState<string | null>(null)
  const [highlightedTables, setHighlightedTables] = useState<Set<string>>(new Set())
  const [pathTracingMode, setPathTracingMode] = useState(false)
  const [selectedTablesForPath, setSelectedTablesForPath] = useState<string[]>([])

  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadDatabaseSchema = useCallback(async () => {
    try {
      setIsLoading(true)
      console.log('🔍 Loading complete database schema with optimized batch processing...')

      // Step 1: Get basic table info quickly
      const { data: basicTableInfo, error: basicError } = await supabase.rpc('get_tables_basic_info')
      if (basicError) throw basicError

      console.log(`📊 Found ${basicTableInfo.length} tables - loading in batches...`)

      // Step 2: Process tables in batches to prevent timeouts
      const batchSize = 10
      const loadedTables: TableInfo[] = []
      const allRelationships: RelationshipInfo[] = []

      for (let i = 0; i < basicTableInfo.length; i += batchSize) {
        const batch = basicTableInfo.slice(i, i + batchSize)
        console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(basicTableInfo.length/batchSize)} (${batch.length} tables)`)

        const batchPromises = batch.map(async (tableRow: any) => {
          const tableName = tableRow.table_name
          const estimatedCount = tableRow.estimated_row_count || 0
          
          try {
            // Get relationships (faster than columns)
            const { data: rels } = await supabase.rpc('get_direct_relationships', { table_name_param: tableName })
            
            // Get columns only for important tables or on demand
            let columns: any[] = []
            const isImportantTable = tableName.includes('business') || tableName.includes('user') || estimatedCount > 100
            
            if (isImportantTable) {
              const { data: cols } = await supabase.rpc('get_table_columns', { table_name_param: tableName })
              columns = cols || []
            }

            // Determine table type based on analysis
            const tableType = determineTableType(tableName, columns, rels || [])

            const tableInfo: TableInfo = {
              id: `table-${tableName}`,
              name: tableName,
              displayName: formatTableName(tableName),
              schema: 'public',
              recordCount: estimatedCount,
              columnCount: columns.length,
              relationshipCount: rels?.length || 0,
              position: { x: 0, y: 0 }, // Will be set by layout algorithm
              size: calculateTableSize(estimatedCount, columns.length, rels?.length || 0),
              isSelected: false,
              isHighlighted: false,
              tableType,
              columns: columns.map((col: any) => ({
                name: col.column_name,
                type: col.data_type,
                isPrimaryKey: col.is_primary_key || false,
                isForeignKey: col.is_foreign_key || false,
                isNullable: col.is_nullable === 'YES',
                defaultValue: col.column_default,
                referencedTable: col.referenced_table,
                referencedColumn: col.referenced_column
              })),
              relationships: (rels || []).map((rel: any, index: number) => ({
                id: `rel-${tableName}-${rel.related_table}-${index}`,
                sourceTable: tableName,
                targetTable: rel.related_table,
                sourceColumn: rel.source_column,
                targetColumn: rel.target_column,
                relationshipType: determineRelationshipType(rel),
                constraintName: rel.constraint_name,
                isActive: true
              }))
            }

            // Collect relationships
            tableInfo.relationships.forEach(rel => {
              if (!allRelationships.find(r => 
                (r.sourceTable === rel.sourceTable && r.targetTable === rel.targetTable) ||
                (r.sourceTable === rel.targetTable && r.targetTable === rel.sourceTable)
              )) {
                allRelationships.push(rel)
              }
            })

            return tableInfo
          } catch (error) {
            console.warn(`⚠️ Error loading table ${tableName}:`, error)
            // Return minimal table info on error
            return {
              id: `table-${tableName}`,
              name: tableName,
              displayName: formatTableName(tableName),
              schema: 'public',
              recordCount: estimatedCount,
              columnCount: 0,
              relationshipCount: 0,
              position: { x: 0, y: 0 },
              size: calculateTableSize(estimatedCount, 0, 0),
              isSelected: false,
              isHighlighted: false,
              tableType: 'data' as const,
              columns: [],
              relationships: []
            } as TableInfo
          }
        })

        const batchResults = await Promise.all(batchPromises)
        loadedTables.push(...batchResults)
        
        // Small delay between batches to prevent overwhelming the server
        if (i + batchSize < basicTableInfo.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      setTables(loadedTables)
      setRelationships(allRelationships)

      // Apply initial layout
      applyLayout(loadedTables, layoutMode)

      console.log(`✅ Loaded ${loadedTables.length} tables with ${allRelationships.length} relationships using batch processing`)

    } catch (error) {
      console.error('❌ Error loading database schema:', error)
    } finally {
      setIsLoading(false)
    }
  }, [layoutMode])

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const determineTableType = (tableName: string, columns: any[], relationships: any[]): TableInfo['tableType'] => {
    // Core business tables (high relationship count, many columns)
    if (relationships.length > 5 && columns.length > 8) return 'core'
    
    // Lookup tables (few columns, referenced by many)
    if (columns.length <= 4 && tableName.includes('type')) return 'lookup'
    
    // Junction tables (few columns, multiple foreign keys)
    const foreignKeyCount = columns.filter(col => col.is_foreign_key).length
    if (foreignKeyCount >= 2 && columns.length <= 6) return 'junction'
    
    // Data tables (default)
    return 'data'
  }

  const determineRelationshipType = (relationship: any): RelationshipInfo['relationshipType'] => {
    // This is simplified - in a real implementation, you'd analyze the actual constraints
    return '1:many' // Default for now
  }

  const formatTableName = (tableName: string): string => {
    return tableName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const calculateTableSize = (recordCount: number, columnCount: number, relationshipCount: number): { width: number; height: number } => {
    const baseWidth = 200
    const baseHeight = 120
    
    // Scale based on complexity
    const complexityFactor = Math.log10(Math.max(recordCount, 1)) * 0.1 + 
                            columnCount * 0.02 + 
                            relationshipCount * 0.05
    
    return {
      width: Math.min(baseWidth * (1 + complexityFactor), 350),
      height: Math.min(baseHeight * (1 + complexityFactor * 0.5), 200)
    }
  }

  // ============================================================================
  // LAYOUT ALGORITHMS
  // ============================================================================

  const applyLayout = (tablesToLayout: TableInfo[], mode: string) => {
    console.log(`🎯 Applying ${mode} layout to ${tablesToLayout.length} tables`)
    
    switch (mode) {
      case 'force':
        applyForceDirectedLayout(tablesToLayout)
        break
      case 'hierarchical':
        applyHierarchicalLayout(tablesToLayout)
        break
      case 'circular':
        applyCircularLayout(tablesToLayout)
        break
      default:
        applyForceDirectedLayout(tablesToLayout)
    }
  }

  const applyForceDirectedLayout = (tablesToLayout: TableInfo[]) => {
    console.log('🌐 Applying sophisticated force-directed layout...')
    
    // Find the group management business unit as the central hub
    const groupManagementTable = tablesToLayout.find(table => 
      table.name === 'business_units' || 
      table.name.includes('group') ||
      table.tableType === 'core'
    )
    
    // Build relationship map for force calculations
    const relationshipMap = new Map<string, string[]>()
    relationships.forEach(rel => {
      if (!relationshipMap.has(rel.sourceTable)) {
        relationshipMap.set(rel.sourceTable, [])
      }
      if (!relationshipMap.has(rel.targetTable)) {
        relationshipMap.set(rel.targetTable, [])
      }
      relationshipMap.get(rel.sourceTable)?.push(rel.targetTable)
      relationshipMap.get(rel.targetTable)?.push(rel.sourceTable)
    })

    // Initialize positions with group management at center
    const centerX = 800
    const centerY = 400
    
    const updatedTables = tablesToLayout.map((table, index) => {
      if (table === groupManagementTable) {
        return {
          ...table,
          position: { x: centerX, y: centerY },
          tableType: 'core' as const
        }
      }
      
      // Position other tables in expanding rings based on relationship distance
      const relationshipDistance = calculateRelationshipDistance(table, groupManagementTable, relationshipMap)
      const ring = Math.min(relationshipDistance, 4) // Max 4 rings
      const radius = 200 + (ring * 150)
      const angle = (index / tablesToLayout.length) * 2 * Math.PI + (ring * 0.5)
      
      return {
        ...table,
        position: {
          x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 100,
          y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 100
        }
      }
    })

    // Apply force-directed simulation
    const simulatedTables = runForceSimulation(updatedTables, relationshipMap)
    setTables(simulatedTables)
  }

  const calculateRelationshipDistance = (table: TableInfo, targetTable: TableInfo | undefined, relationshipMap: Map<string, string[]>): number => {
    if (!targetTable || table === targetTable) return 0
    
    // BFS to find shortest path
    const visited = new Set<string>()
    const queue: Array<{table: string, distance: number}> = [{table: table.name, distance: 0}]
    
    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current.table)) continue
      visited.add(current.table)
      
      if (current.table === targetTable.name) {
        return current.distance
      }
      
      const neighbors = relationshipMap.get(current.table) || []
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          queue.push({table: neighbor, distance: current.distance + 1})
        }
      })
    }
    
    return 999 // No connection found
  }

  const runForceSimulation = (initialTables: TableInfo[], relationshipMap: Map<string, string[]>): TableInfo[] => {
    let tables = [...initialTables]
    const iterations = 100
    const attractionStrength = 2.0
    const repulsionStrength = 8000
    const dampening = 0.85
    
    for (let i = 0; i < iterations; i++) {
      const forces = new Map<string, {x: number, y: number}>()
      
      // Initialize forces
      tables.forEach(table => {
        forces.set(table.id, {x: 0, y: 0})
      })
      
      // Calculate attraction forces (connected tables)
      relationships.forEach(rel => {
        const sourceTable = tables.find(t => t.name === rel.sourceTable)
        const targetTable = tables.find(t => t.name === rel.targetTable)
        
        if (sourceTable && targetTable) {
          const dx = targetTable.position.x - sourceTable.position.x
          const dy = targetTable.position.y - sourceTable.position.y
          const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
          const optimalDistance = 250
          
          if (distance > optimalDistance) {
            const force = attractionStrength * (distance - optimalDistance) / distance
            const fx = (dx / distance) * force
            const fy = (dy / distance) * force
            
            const sourceForce = forces.get(sourceTable.id)!
            const targetForce = forces.get(targetTable.id)!
            
            sourceForce.x += fx
            sourceForce.y += fy
            targetForce.x -= fx
            targetForce.y -= fy
          }
        }
      })
      
      // Calculate repulsion forces (all tables)
      for (let j = 0; j < tables.length; j++) {
        for (let k = j + 1; k < tables.length; k++) {
          const table1 = tables[j]
          const table2 = tables[k]
          
          const dx = table2.position.x - table1.position.x
          const dy = table2.position.y - table1.position.y
          const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
          
          const force = repulsionStrength / (distance * distance)
          const fx = (dx / distance) * force
          const fy = (dy / distance) * force
          
          const force1 = forces.get(table1.id)!
          const force2 = forces.get(table2.id)!
          
          force1.x -= fx
          force1.y -= fy
          force2.x += fx
          force2.y += fy
        }
      }
      
      // Apply forces with dampening
      tables = tables.map(table => {
        const force = forces.get(table.id)!
        
        // Don't move the core table too much
        const movementFactor = table.tableType === 'core' ? 0.1 : 1.0
        
        return {
          ...table,
          position: {
            x: table.position.x + (force.x * dampening * movementFactor),
            y: table.position.y + (force.y * dampening * movementFactor)
          }
        }
      })
      
      // Collision detection and correction
      tables = preventOverlaps(tables)
    }
    
    return tables
  }

  const preventOverlaps = (tables: TableInfo[]): TableInfo[] => {
    const minSeparation = 50
    
    for (let i = 0; i < tables.length; i++) {
      for (let j = i + 1; j < tables.length; j++) {
        const table1 = tables[i]
        const table2 = tables[j]
        
        const dx = table2.position.x - table1.position.x
        const dy = table2.position.y - table1.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        const minDistance = (table1.size.width + table2.size.width) / 2 + minSeparation
        
        if (distance < minDistance && distance > 0) {
          const pushDistance = (minDistance - distance) / 2
          const pushX = (dx / distance) * pushDistance
          const pushY = (dy / distance) * pushDistance
          
          // Don't push the core table
          if (table1.tableType !== 'core') {
            table1.position.x -= pushX
            table1.position.y -= pushY
          }
          if (table2.tableType !== 'core') {
            table2.position.x += pushX
            table2.position.y += pushY
          }
        }
      }
    }
    
    return tables
  }

  const applyHierarchicalLayout = (tablesToLayout: TableInfo[]) => {
    console.log('🏗️ Applying hierarchical layout...')
    // Implementation coming next
  }

  const applyCircularLayout = (tablesToLayout: TableInfo[]) => {
    console.log('⭕ Applying circular layout...')
    // Implementation coming next
  }

  // ============================================================================
  // INTERACTION HANDLERS
  // ============================================================================

  const handleZoomIn = () => {
    setViewport(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.2, 3)
    }))
  }

  const handleZoomOut = () => {
    setViewport(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom / 1.2, 0.1)
    }))
  }

  const handleResetView = () => {
    setViewport({
      zoom: 1,
      pan: { x: 0, y: 0 },
      bounds: { width: 1200, height: 800 }
    })
  }

  const handleFitToView = () => {
    if (tables.length === 0) return
    
    const padding = 100
    const minX = Math.min(...tables.map(t => t.position.x)) - padding
    const maxX = Math.max(...tables.map(t => t.position.x + t.size.width)) + padding
    const minY = Math.min(...tables.map(t => t.position.y)) - padding
    const maxY = Math.max(...tables.map(t => t.position.y + t.size.height)) + padding
    
    const contentWidth = maxX - minX
    const contentHeight = maxY - minY
    const containerWidth = containerRef.current?.clientWidth || 1200
    const containerHeight = containerRef.current?.clientHeight || 800
    
    const scaleX = containerWidth / contentWidth
    const scaleY = containerHeight / contentHeight
    const scale = Math.min(scaleX, scaleY, 1)
    
    setViewport({
      zoom: scale,
      pan: { x: minX, y: minY },
      bounds: { width: containerWidth, height: containerHeight }
    })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = (e.clientX - dragStart.x) / viewport.zoom
      const deltaY = (e.clientY - dragStart.y) / viewport.zoom
      
      setViewport(prev => ({
        ...prev,
        pan: {
          x: prev.pan.x - deltaX,
          y: prev.pan.y - deltaY
        }
      }))
      
      setDragStart({ x: e.clientX, y: e.clientY })
    }
    
    if (isTableDragging && draggedTable) {
      const rect = svgRef.current?.getBoundingClientRect()
      if (rect) {
        const x = (e.clientX - rect.left) / viewport.zoom + viewport.pan.x
        const y = (e.clientY - rect.top) / viewport.zoom + viewport.pan.y
        
        setTables(prev => prev.map(table => 
          table.id === draggedTable
            ? { ...table, position: { x: x - table.size.width / 2, y: y - table.size.height / 2 } }
            : table
        ))
      }
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsTableDragging(false)
    setDraggedTable(null)
  }

  const handleTableMouseDown = (e: React.MouseEvent, tableId: string) => {
    e.stopPropagation()
    setIsTableDragging(true)
    setDraggedTable(tableId)
  }

  const handleTableClick = (table: TableInfo) => {
    if (!isTableDragging) {
      setSelectedTable(table)
      setTables(prev => prev.map(t => ({
        ...t,
        isSelected: t.id === table.id
      })))
    }
  }

  const handleLayoutChange = (newLayout: 'force' | 'hierarchical' | 'circular') => {
    setLayoutMode(newLayout)
    applyLayout(tables, newLayout)
  }

  const runCEOAnalysis = async () => {
    setAnalysisLoading(true)
    console.log('🔍 Running CEO Database Analysis...')
    
    try {
      // Run analysis functions
      const missingLinksResult = detectMissingLinks(tables, relationships)
      const integrityIssuesResult = checkDataIntegrity(tables, relationships)
      
      setMissingLinks(missingLinksResult)
      setDataIntegrityIssues(integrityIssuesResult)
      setShowCEOAnalysis(true)
      
      console.log(`✅ Analysis complete: ${missingLinksResult.length} missing links, ${integrityIssuesResult.length} integrity issues`)
    } catch (error) {
      console.error('❌ CEO Analysis failed:', error)
    } finally {
      setAnalysisLoading(false)
    }
  }

  const handleTableHover = useCallback((tableName: string | null) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    
    // Debounce hover events to prevent rapid state changes
    if (hoveredTable === tableName) return
    
    // Throttle the hover effect
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTable(tableName)
      
      if (tableName) {
        // Find all related tables
        const relatedTables = new Set<string>()
        relatedTables.add(tableName) // Include the hovered table itself
        
        relationships.forEach(rel => {
          if (rel.sourceTable === tableName) {
            relatedTables.add(rel.targetTable)
          }
          if (rel.targetTable === tableName) {
            relatedTables.add(rel.sourceTable)
          }
        })
        
        setHighlightedTables(relatedTables)
        
        // Batch update table highlighting states
        setTables(prev => prev.map(table => {
          const shouldHighlight = relatedTables.has(table.name)
          if (table.isHighlighted !== shouldHighlight) {
            return { ...table, isHighlighted: shouldHighlight }
          }
          return table
        }))
      } else {
        setHighlightedTables(new Set())
        setTables(prev => prev.map(table => {
          if (table.isHighlighted) {
            return { ...table, isHighlighted: false }
          }
          return table
        }))
      }
    }, 50) // 50ms throttle
  }, [hoveredTable, relationships])

  const togglePathTracingMode = () => {
    setPathTracingMode(!pathTracingMode)
    setSelectedTablesForPath([])
    if (!pathTracingMode) {
      console.log('🛤️ Path tracing mode enabled - click two tables to see connection path')
    }
  }

  // ============================================================================
  // COMPONENT LIFECYCLE
  // ============================================================================

  useEffect(() => {
    loadDatabaseSchema()
    initializeAIBrain()
  }, [loadDatabaseSchema])

  // Initialize AI Brain
  const initializeAIBrain = async () => {
    try {
      console.log('🧠 Initializing AI Brain...')
      
      // Mock business unit and user IDs - in real app, get from auth context
      const businessUnitId = 'mock-business-unit-id'
      const userId = 'mock-user-id'
      
      // Initialize AI Context Engine with error handling
      try {
        await aiContextEngine.initialize(businessUnitId, userId)
        console.log('✅ AI Context Engine initialized')
      } catch (contextError) {
        console.warn('⚠️ AI Context Engine initialization failed, continuing with fallbacks:', contextError)
      }
      
      // Load business context from backend with error handling
      try {
        await loadBusinessContext(businessUnitId, userId)
      } catch (error) {
        console.warn('⚠️ Business context loading failed:', error)
      }
      
      // Load AI metrics and insights with error handling
      try {
        await loadAIMetrics(businessUnitId)
      } catch (error) {
        console.warn('⚠️ AI metrics loading failed:', error)
      }
      
      try {
        await loadBusinessInsights(businessUnitId)
      } catch (error) {
        console.warn('⚠️ Business insights loading failed:', error)
      }
      
      try {
        await loadActivityFeed(businessUnitId)
      } catch (error) {
        console.warn('⚠️ Activity feed loading failed:', error)
      }
      
      try {
        await loadAILearningProgress(businessUnitId)
      } catch (error) {
        console.warn('⚠️ AI learning progress loading failed:', error)
      }
      
      setAiInitialized(true)
      console.log('✅ AI Brain initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize AI Brain:', error)
      // Still set as initialized to prevent infinite loops
      setAiInitialized(true)
    }
  }

  // Load business context
  const loadBusinessContext = async (businessUnitId: string, userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_business_context', {
        business_unit_id_param: businessUnitId,
        user_id_param: userId
      })
      
      if (error) throw error
      if (data && data.length > 0) {
        setBusinessContext(data[0])
      } else {
        // Fallback data
        setBusinessContext({
          businessUnit: { name: 'Group Management Center', type: 'Group Management' },
          departments: [],
          services: [],
          totalRecords: 0
        })
      }
    } catch (error) {
      console.error('Failed to load business context:', error)
      // Fallback data
      setBusinessContext({
        businessUnit: { name: 'Group Management Center', type: 'Group Management' },
        departments: [],
        services: [],
        totalRecords: 0
      })
    }
  }

  // Load AI metrics
  const loadAIMetrics = async (businessUnitId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_ai_brain_metrics', {
        business_unit_id_param: businessUnitId
      })
      
      if (error) throw error
      setAiMetrics(data || {
        totalOperations: 0,
        successRate: 0,
        avgResponseTime: 0,
        learningAccuracy: 0
      })
    } catch (error) {
      console.error('Failed to load AI metrics:', error)
      setAiMetrics({
        totalOperations: 0,
        successRate: 0,
        avgResponseTime: 0,
        learningAccuracy: 0
      })
    }
  }

  // Load business insights
  const loadBusinessInsights = async (businessUnitId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_business_insights', {
        business_unit_id_param: businessUnitId,
        limit_param: 10
      })
      
      if (error) throw error
      setBusinessInsights(data || [])
    } catch (error) {
      console.error('Failed to load business insights:', error)
      setBusinessInsights([])
    }
  }

  // Load activity feed
  const loadActivityFeed = async (businessUnitId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_business_activity_feed', {
        business_unit_id_param: businessUnitId,
        limit_param: 20
      })
      
      if (error) throw error
      setActivityFeed(data || [])
    } catch (error) {
      console.error('Failed to load activity feed:', error)
      setActivityFeed([])
    }
  }

  // Load AI learning progress
  const loadAILearningProgress = async (businessUnitId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_ai_learning_progress', {
        business_unit_id_param: businessUnitId
      })
      
      if (error) throw error
      setAiLearningProgress(data || [])
    } catch (error) {
      console.error('Failed to load AI learning progress:', error)
      setAiLearningProgress([])
    }
  }

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging || isTableDragging) {
        handleMouseMove(e as any)
      }
    }

    const handleGlobalMouseUp = () => {
      handleMouseUp()
    }

    if (isDragging || isTableDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, isTableDragging, dragStart, viewport, draggedTable])

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="database-schema-new">
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <h2>🧠 Initializing Business Brain</h2>
        <p>Discovering tables, relationships, and building neural network...</p>
        <div className="loading-details">
          <p>📊 Processing 121+ tables in optimized batches</p>
          <p>🔗 Building relationship map for CEO analysis</p>
          <p>⚡ Using advanced algorithms to prevent timeouts</p>
        </div>
      </div>
      </div>
    )
  }

  return (
    <div className="database-schema-new">
      {/* Header */}
      <div className="schema-header">
        <div className="header-left">
          <h1>🧠 Group Business Management Brain</h1>
          <div className="schema-stats">
            <span className="stat">📊 {tables.length} Tables</span>
            <span className="stat">🔗 {relationships.length} Relationships</span>
            <span className="stat">🎯 {layoutMode} Layout</span>
          </div>
        </div>
        
        <div className="header-controls">
          <div className="zoom-controls">
            <button className="control-btn zoom-btn" onClick={handleZoomOut} title="Zoom Out">
              🔍➖
            </button>
            <span className="zoom-level">{Math.round(viewport.zoom * 100)}%</span>
            <button className="control-btn zoom-btn" onClick={handleZoomIn} title="Zoom In">
              🔍➕
            </button>
            <button className="control-btn" onClick={handleFitToView} title="Fit to View">
              📐 Fit
            </button>
            <button className="control-btn" onClick={handleResetView} title="Reset View">
              🎯 Reset
            </button>
          </div>
          <div className="main-controls">
            <button 
              onClick={() => setShowAIInterface(!showAIInterface)}
              className={`control-btn ai-brain-btn ${showAIInterface ? 'active' : ''} ${aiInitialized ? 'initialized' : 'loading'}`}
              title="AI Business Brain - Complete business automation and intelligence"
            >
              {aiInitialized ? '🧠 AI Brain' : '⏳ Initializing...'}
            </button>
            <button 
              className={`control-btn ceo-btn ${analysisLoading ? 'loading' : ''}`} 
              onClick={runCEOAnalysis}
              disabled={analysisLoading}
            >
              {analysisLoading ? '🔄 Analyzing...' : '👑 CEO Analysis'}
            </button>
            <button className="control-btn" onClick={() => setShowSettings(!showSettings)}>
              ⚙️ Settings
            </button>
            <button className="control-btn" onClick={() => setShowMiniMap(!showMiniMap)}>
              🗺️ Mini Map
            </button>
            <button className="control-btn" onClick={() => loadDatabaseSchema()}>
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="schema-content">
        {/* Sidebar */}
        <div className="schema-sidebar">
          <div className="sidebar-section">
            <h3>🔍 Search & Filter</h3>
            <input
              type="text"
              placeholder="Search tables..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="search-input"
            />
          </div>

          <div className="sidebar-section">
            <h3>🎨 Layout</h3>
            <div className="layout-buttons">
              {[
                { key: 'force', label: '🕸️ Neural', desc: 'AI-driven positioning' },
                { key: 'hierarchical', label: '🏗️ Hierarchy', desc: 'Business structure' },
                { key: 'circular', label: '⭕ Circular', desc: 'Radial layout' }
              ].map(mode => (
                <button
                  key={mode.key}
                  className={`layout-btn ${layoutMode === mode.key ? 'active' : ''}`}
                  onClick={() => handleLayoutChange(mode.key as any)}
                  title={mode.desc}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>📋 Table List</h3>
            <div className="table-list">
              {tables
                .filter(table => 
                  table.displayName.toLowerCase().includes(filters.searchTerm.toLowerCase())
                )
                .map(table => (
                  <div
                    key={table.id}
                    className={`table-item ${table.isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedTable(table)}
                  >
                    <div className="table-item-header">
                      <span className="table-name">{table.displayName}</span>
                      <span className={`table-type ${table.tableType}`}>{table.tableType}</span>
                    </div>
                    <div className="table-item-stats">
                      <span>📊 {table.recordCount} records</span>
                      <span>🔗 {table.relationshipCount} relations</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Main Visualization */}
        <div className="schema-visualization" ref={containerRef}>
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`${viewport.pan.x} ${viewport.pan.y} ${viewport.bounds.width / viewport.zoom} ${viewport.bounds.height / viewport.zoom}`}
            className={`schema-svg ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* SVG Gradients for table types */}
            <defs>
              <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="lookupGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="junctionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
              <linearGradient id="dataGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
              </marker>
            </defs>
            {/* Relationship Lines */}
            <g className="relationships-layer">
              {relationships.map(rel => {
                const sourceTable = tables.find(t => t.name === rel.sourceTable)
                const targetTable = tables.find(t => t.name === rel.targetTable)
                
                if (!sourceTable || !targetTable) return null

                const path = calculateConnectionPath(sourceTable, targetTable)
                const isHighlighted = selectedTable && 
                  (selectedTable.name === rel.sourceTable || selectedTable.name === rel.targetTable)
                
                return (
                  <g key={rel.id}>
                    <path
                      d={path}
                      stroke={isHighlighted ? "#f59e0b" : "#3b82f6"}
                      strokeWidth={isHighlighted ? "3" : "2"}
                      fill="none"
                      opacity={isHighlighted ? "1" : "0.6"}
                      className="relationship-line"
                      markerEnd="url(#arrowhead)"
                    />
                    {/* Relationship type indicator */}
                    {isHighlighted && (
                      <text
                        x={(sourceTable.position.x + targetTable.position.x) / 2}
                        y={(sourceTable.position.y + targetTable.position.y) / 2 - 10}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#f59e0b"
                        fontWeight="600"
                      >
                        {rel.relationshipType}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>

            {/* Table Cards */}
            <g className="tables-layer">
              {tables.map(table => (
                <g
                  key={table.id}
                  transform={`translate(${table.position.x}, ${table.position.y})`}
                  className={`table-card ${table.tableType} ${table.isSelected ? 'selected' : ''} ${draggedTable === table.id ? 'dragging' : ''}`}
                  onMouseDown={(e) => handleTableMouseDown(e, table.id)}
                  onClick={() => handleTableClick(table)}
                  style={{ cursor: isTableDragging && draggedTable === table.id ? 'grabbing' : 'grab' }}
                >
                  {/* Card Background */}
                  <rect
                    width={table.size.width}
                    height={table.size.height}
                    rx="8"
                    fill="white"
                    stroke={table.isSelected ? "#f59e0b" : "#e5e7eb"}
                    strokeWidth={table.isSelected ? "3" : "2"}
                    className="table-background"
                    filter={table.tableType === 'core' ? 'url(#glow)' : 'none'}
                  />
                  
                  {/* Card Header */}
                  <rect
                    width={table.size.width}
                    height="40"
                    rx="8"
                    fill={`url(#${table.tableType}Gradient)`}
                    className="table-header"
                  />
                  
                  {/* CEO Badge for core table */}
                  {table.tableType === 'core' && (
                    <rect
                      x={table.size.width - 60}
                      y="5"
                      width="55"
                      height="20"
                      rx="10"
                      fill="rgba(255,255,255,0.9)"
                    />
                  )}
                  {table.tableType === 'core' && (
                    <text
                      x={table.size.width - 32}
                      y="17"
                      textAnchor="middle"
                      fill="#f59e0b"
                      fontSize="10"
                      fontWeight="700"
                    >
                      👑 CEO
                    </text>
                  )}
                  
                  {/* Table Name */}
                  <text
                    x={table.size.width / 2}
                    y="25"
                    textAnchor="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="600"
                    className="table-name"
                  >
                    {table.displayName}
                  </text>
                  
                  {/* Table Stats */}
                  <text
                    x="10"
                    y="60"
                    fill="#374151"
                    fontSize="12"
                    className="table-stats"
                  >
                    📊 {table.recordCount.toLocaleString()} records
                  </text>
                  
                  <text
                    x="10"
                    y="80"
                    fill="#374151"
                    fontSize="12"
                    className="table-stats"
                  >
                    🔗 {table.relationshipCount} relations
                  </text>
                  
                  <text
                    x="10"
                    y="100"
                    fill="#6b7280"
                    fontSize="11"
                    className="table-stats"
                  >
                    📋 {table.columnCount} columns
                  </text>
                  
                  {/* Action buttons for CEO */}
                  {table.tableType === 'core' && (
                    <g className="ceo-actions">
                      <rect
                        x="10"
                        y={table.size.height - 30}
                        width="80"
                        height="20"
                        rx="10"
                        fill="#f59e0b"
                        className="action-btn"
                      />
                      <text
                        x="50"
                        y={table.size.height - 17}
                        textAnchor="middle"
                        fill="white"
                        fontSize="10"
                        fontWeight="600"
                      >
                        🔍 Analyze
                      </text>
                    </g>
                  )}
                </g>
              ))}
            </g>
          </svg>
          
          {/* Floating Controls */}
          <div className="floating-controls">
            <div className="control-group">
              <button className="floating-btn" onClick={handleZoomIn} title="Zoom In">
                ➕
              </button>
              <button className="floating-btn" onClick={handleZoomOut} title="Zoom Out">
                ➖
              </button>
              <button className="floating-btn" onClick={handleFitToView} title="Fit to View">
                📐
              </button>
              <button className="floating-btn" onClick={handleResetView} title="Reset View">
                🎯
              </button>
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="status-bar">
            <span>🔍 Zoom: {Math.round(viewport.zoom * 100)}%</span>
            <span>📊 Tables: {tables.length}</span>
            <span>🔗 Connections: {relationships.length}</span>
            <span>🎯 Layout: {layoutMode}</span>
            {selectedTable && (
              <span>👆 Selected: {selectedTable.displayName}</span>
            )}
          </div>
        </div>

        {/* Details Panel */}
        {selectedTable && (
          <div className="details-panel">
            <div className="panel-header">
              <h3>📋 {selectedTable.displayName}</h3>
              <button onClick={() => setSelectedTable(null)}>✕</button>
            </div>
            
            <div className="panel-content">
              <div className="panel-section">
                <h4>📊 Statistics</h4>
                <p>Records: {selectedTable.recordCount}</p>
                <p>Columns: {selectedTable.columnCount}</p>
                <p>Relationships: {selectedTable.relationshipCount}</p>
              </div>
              
              <div className="panel-section">
                <h4>📋 Columns</h4>
                <div className="columns-list">
                  {selectedTable.columns.map(col => (
                    <div key={col.name} className="column-item">
                      <span className="column-name">{col.name}</span>
                      <span className="column-type">{col.type}</span>
                      {col.isPrimaryKey && <span className="badge primary">PK</span>}
                      {col.isForeignKey && <span className="badge foreign">FK</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Business Brain Interface */}
      <BusinessBrainInterface
        isVisible={showAIInterface}
        onClose={() => setShowAIInterface(false)}
        businessUnitId="mock-business-unit-id"
      />
    </div>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const calculateConnectionPath = (sourceTable: TableInfo, targetTable: TableInfo): string => {
  const sourceX = sourceTable.position.x + sourceTable.size.width / 2
  const sourceY = sourceTable.position.y + sourceTable.size.height / 2
  const targetX = targetTable.position.x + targetTable.size.width / 2
  const targetY = targetTable.position.y + targetTable.size.height / 2

  const dx = targetX - sourceX
  const dy = targetY - sourceY

  const cp1X = sourceX + dx * 0.3
  const cp1Y = sourceY
  const cp2X = targetX - dx * 0.3
  const cp2Y = targetY

  return `M ${sourceX} ${sourceY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${targetX} ${targetY}`
}

export default DatabaseSchemaNew
