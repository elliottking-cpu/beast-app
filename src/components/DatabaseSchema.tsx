import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import './DatabaseSchema.css'

interface TableInfo {
  name: string
  position: { x: number; y: number }
  id: string
  isExpanded: boolean
  hasHiddenRelationships: boolean
  relationshipCount: number
  level: number // For hierarchical positioning
  displayName?: string // Human-readable name
  isGroupManagement?: boolean // True only for the group management business unit
}

interface DirectRelationship {
  related_table: string
  relationship_type: 'incoming' | 'outgoing'
  source_column: string
  target_column: string
  constraint_name: string
  source_table?: string // Track which table this relationship came from
}

interface CardPosition {
  width: number
  height: number
  x: number
  y: number
}

const DatabaseSchema: React.FC = () => {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [visibleRelationships, setVisibleRelationships] = useState<DirectRelationship[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDragging, setIsDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isViewportDragging, setIsViewportDragging] = useState(false)
  const [viewportDragStart, setViewportDragStart] = useState({ x: 0, y: 0 })
  const [containerSize, setContainerSize] = useState({ width: 1800, height: 1200 })
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [cardPositions, setCardPositions] = useState<Record<string, CardPosition>>({})
  
  const containerRef = useRef<HTMLDivElement>(null)

  // Load neural network core
  useEffect(() => {
    loadNeuralNetworkCore()
  }, [])

  const loadNeuralNetworkCore = async () => {
    try {
      setIsLoading(true)
      console.log('🧠 Starting Neural Network Database Visualization...')
      
      // Step 1: Find the most connected table (neural network core)
      const coreTable = await findMostConnectedTable()
      if (!coreTable) {
        console.error('Could not find core table')
        return
      }

      console.log('🧠 Neural core table identified:', coreTable.name)
      console.log('🏢 Is Group Management:', coreTable.isGroupManagement)
      console.log('📊 Display Name:', coreTable.displayName)

      // Step 2: Start with just the core table
      const initialTable: TableInfo = {
        name: coreTable.name,
        id: `table-${coreTable.name}`,
        position: { x: 800, y: 400 }, // Center of viewport
        isExpanded: false, // Start collapsed so user can expand
        hasHiddenRelationships: true, // Has relationships to explore
        relationshipCount: coreTable.relationshipCount,
        level: 0,
        displayName: coreTable.displayName || coreTable.name,
        isGroupManagement: coreTable.isGroupManagement || false
      }

      setTables([initialTable])
      setVisibleRelationships([])
      
      // Step 3: Position the core table with dynamic sizing
      const coreCardSize = calculateCardSize(coreTable.relationshipCount)
      const initialPositions: Record<string, CardPosition> = {
        [coreTable.name]: {
          x: 800,
          y: 400,
          width: coreCardSize.width,
          height: coreCardSize.height
        }
      }
      
      setCardPositions(initialPositions)
      updateContainerSize()
      
      console.log('🧠 Neural network initialized with core table:', coreTable.name)
      
      // Step 4: Auto-expand all connected tables to create complete picture
      setTimeout(async () => {
        setIsLoading(true) // Show loading during auto-expansion
        await autoExpandAllConnections(coreTable.name)
        setIsLoading(false) // Hide loading when complete
      }, 500) // Small delay to ensure initial state is set
      
    } catch (error) {
      console.error('Error loading neural network core:', error)
      setIsLoading(false)
    }
  }

  // Find the group management business unit record (true neural core)
  const findMostConnectedTable = async () => {
    try {
      console.log('🔍 Finding Group Management Business Unit (neural core)...')
      
      // Get the specific Group Management business unit record
      const { data: groupUnit, error: groupError } = await supabase
        .from('business_units')
        .select('*')
        .eq('business_unit_type', 'group_management')
        .single()

      if (groupError) {
        console.error('Error finding group management unit:', groupError)
        // Fallback: find most connected table
        return await findMostConnectedTableFallback()
      }

      // Get relationship count for business_units table
      const { data: relationships, error: relError } = await supabase.rpc('get_direct_relationships', {
        table_name_param: 'business_units'
      })

      const relationshipCount = relationships ? relationships.length : 0

      console.log('🧠 Neural core found: Group Management Business Unit')
      console.log('🏢 Business Unit:', groupUnit.business_unit_name)
      console.log('🔗 Relationships:', relationshipCount)

      return {
        name: 'business_units',
        recordId: groupUnit.id,
        displayName: groupUnit.business_unit_name,
        relationshipCount: relationshipCount,
        isGroupManagement: true
      }
      
    } catch (error) {
      console.error('Error finding group management unit:', error)
      return await findMostConnectedTableFallback()
    }
  }

  // Fallback: find most connected table if group management not found
  const findMostConnectedTableFallback = async () => {
    try {
      const { data: allTableData, error: tableError } = await supabase.rpc('get_all_table_names')
      if (tableError) throw tableError

      let maxConnections = 0
      let coreTable = null

      const sampleTables = allTableData.slice(0, 20)
      
      for (const tableRow of sampleTables) {
        const tableName = tableRow.table_name
        
        const { data: relationships, error: relError } = await supabase.rpc('get_direct_relationships', {
          table_name_param: tableName
        })

        if (!relError && relationships) {
          const connectionCount = relationships.length
          
          if (connectionCount > maxConnections) {
            maxConnections = connectionCount
            coreTable = {
              name: tableName,
              relationshipCount: connectionCount,
              isGroupManagement: false
            }
          }
        }
      }

      return coreTable || {
        name: 'business_units',
        relationshipCount: 10,
        isGroupManagement: false
      }
      
    } catch (error) {
      return {
        name: 'business_units',
        relationshipCount: 10,
        isGroupManagement: false
      }
    }
  }

  // Add related tables to the neural network incrementally
  const addRelatedTables = async (sourceTableName: string) => {
    try {
      console.log('🧠 Adding neural connections for:', sourceTableName)
      
      // Get relationships for this specific table
      const { data: relationships, error: relError } = await supabase.rpc('get_direct_relationships', {
        table_name_param: sourceTableName
      })

      if (relError || !relationships || relationships.length === 0) {
        console.log('No relationships found for:', sourceTableName)
        return
      }

      console.log(`🔗 Found ${relationships.length} relationships for ${sourceTableName}`)

      // Get current table positions for optimal placement
      const currentTables = [...tables]
      const sourceTable = currentTables.find(t => t.name === sourceTableName)
      if (!sourceTable) return

      const sourcePos = cardPositions[sourceTableName]
      if (!sourcePos) return

      // Add each related table with optimal positioning
      const newTables: TableInfo[] = []
      const newRelationships: DirectRelationship[] = []
      const newPositions: Record<string, CardPosition> = { ...cardPositions }

      for (let index = 0; index < relationships.length; index++) {
        const rel = relationships[index]
        const relatedTableName = rel.related_table
        
        // Skip if table is already visible
        if (currentTables.some(t => t.name === relatedTableName)) {
          // Just add the relationship with source table info
          newRelationships.push({
            related_table: rel.related_table,
            relationship_type: rel.relationship_type,
            source_column: rel.source_column,
            target_column: rel.target_column,
            constraint_name: rel.constraint_name,
            source_table: sourceTableName // Track the source
          })
          continue
        }

        // Calculate optimal position around the source table
        const angle = (index / relationships.length) * 2 * Math.PI
        const distance = 300 // Distance from source table
        const newX = sourcePos.x + Math.cos(angle) * distance
        const newY = sourcePos.y + Math.sin(angle) * distance

        // Get relationship count for the new table
        const { data: newTableRels } = await supabase.rpc('get_direct_relationships', {
          table_name_param: relatedTableName
        })
        const newTableRelCount = newTableRels ? newTableRels.length : 0

        // Create new table
        const newTable: TableInfo = {
          name: relatedTableName,
          id: `table-${relatedTableName}`,
          position: { x: newX, y: newY },
          isExpanded: false,
          hasHiddenRelationships: true,
          relationshipCount: newTableRelCount,
          level: sourceTable.level + 1,
          displayName: relatedTableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }

        newTables.push(newTable)
        
        // Add position with dynamic sizing
        const cardSize = calculateCardSize(newTableRelCount)
        newPositions[relatedTableName] = {
          x: newX,
          y: newY,
          width: cardSize.width,
          height: cardSize.height
        }

        // Add relationship with source table info
        newRelationships.push({
          related_table: rel.related_table,
          relationship_type: rel.relationship_type,
          source_column: rel.source_column,
          target_column: rel.target_column,
          constraint_name: rel.constraint_name,
          source_table: sourceTableName // Track the source
        })
      }

      // Update state with new tables and relationships
      setTables([...currentTables, ...newTables])
      setVisibleRelationships([...visibleRelationships, ...newRelationships])
      setCardPositions(newPositions)

      // Mark source table as expanded
      const updatedTables = [...currentTables, ...newTables].map(table => 
        table.name === sourceTableName 
          ? { ...table, isExpanded: true, hasHiddenRelationships: false }
          : table
      )
      setTables(updatedTables)

      // Optimize positions after adding new tables
      setTimeout(() => {
        optimizeVisibleTablePositions()
        updateContainerSize()
      }, 100)

      console.log(`🧠 Added ${newTables.length} neural connections to ${sourceTableName}`)
      
    } catch (error) {
      console.error('Error adding related tables:', error)
    }
  }

  // Optimize positions of currently visible tables only
  const optimizeVisibleTablePositions = () => {
    if (tables.length <= 1) return

    console.log('🧠 Optimizing positions for', tables.length, 'visible tables')
    
    const optimizedPositions = calculateOptimalPositions(tables, visibleRelationships)
    setCardPositions(optimizedPositions)
  }

  // Calculate optimal positions for visible tables based on relationships
  const calculateOptimalPositions = (visibleTables: TableInfo[], relationships: DirectRelationship[]) => {
    const positions: Record<string, CardPosition> = { ...cardPositions }
    
    // Build relationship map for visible tables only
    const relationshipMap: Record<string, Set<string>> = {}
    visibleTables.forEach(table => {
      relationshipMap[table.name] = new Set()
    })

    relationships.forEach(rel => {
      const targetTable = rel.related_table
      // Find source table by checking which visible table this relationship belongs to
      visibleTables.forEach(table => {
        if (relationshipMap[table.name] && relationshipMap[targetTable]) {
          relationshipMap[table.name].add(targetTable)
          relationshipMap[targetTable].add(table.name)
        }
      })
    })

    // Apply light force-directed algorithm to visible tables only
    const iterations = 30
    const attractionStrength = 0.5
    const repulsionStrength = 3000
    const dampening = 0.8

    for (let iter = 0; iter < iterations; iter++) {
      const forces: Record<string, { x: number, y: number }> = {}
      
      // Initialize forces
      visibleTables.forEach(table => {
        forces[table.name] = { x: 0, y: 0 }
      })

      // Calculate attraction forces between related tables
      visibleTables.forEach(table1 => {
        const relatedTables = relationshipMap[table1.name]
        if (relatedTables) {
          relatedTables.forEach(table2Name => {
            if (positions[table1.name] && positions[table2Name]) {
              const dx = positions[table2Name].x - positions[table1.name].x
              const dy = positions[table2Name].y - positions[table1.name].y
              const distance = Math.sqrt(dx * dx + dy * dy) || 1
              
              const optimalDistance = 250
              const force = (distance - optimalDistance) * attractionStrength / distance
              
              forces[table1.name].x += dx * force
              forces[table1.name].y += dy * force
            }
          })
        }
      })

      // Calculate repulsion forces between all tables
      visibleTables.forEach(table1 => {
        visibleTables.forEach(table2 => {
          if (table1.name !== table2.name && positions[table1.name] && positions[table2.name]) {
            const dx = positions[table2.name].x - positions[table1.name].x
            const dy = positions[table2.name].y - positions[table1.name].y
            const distance = Math.sqrt(dx * dx + dy * dy) || 1
            
            const minDistance = 200
            if (distance < minDistance) {
              const force = repulsionStrength / (distance * distance)
              forces[table1.name].x -= (dx / distance) * force
              forces[table1.name].y -= (dy / distance) * force
            }
          }
        })
      })

      // Apply forces
      visibleTables.forEach(table => {
        if (positions[table.name] && forces[table.name]) {
          positions[table.name].x += forces[table.name].x * dampening
          positions[table.name].y += forces[table.name].y * dampening
        }
      })
    }

    return positions
  }

  // Hide a table and its orphaned relationships
  const hideTable = (tableNameToHide: string) => {
    console.log('🧠 Hiding table:', tableNameToHide)
    
    // Remove table from visible tables
    const updatedTables = tables.filter(table => table.name !== tableNameToHide)
    
    // Remove relationships that involve the hidden table
    const updatedRelationships = visibleRelationships.filter(rel => 
      rel.related_table !== tableNameToHide
    )
    
    // Remove position
    const updatedPositions = { ...cardPositions }
    delete updatedPositions[tableNameToHide]
    
    // Update states
    setTables(updatedTables)
    setVisibleRelationships(updatedRelationships)
    setCardPositions(updatedPositions)
    
    // Optimize remaining table positions
    setTimeout(() => {
      optimizeVisibleTablePositions()
      updateContainerSize()
    }, 100)
    
    console.log(`🧠 Hidden ${tableNameToHide}, ${updatedTables.length} tables remaining`)
  }

  // Reset to just the core table
  const resetToCore = async () => {
    console.log('🧠 Resetting neural network to core...')
    await loadNeuralNetworkCore()
  }

  // Calculate dynamic card size based on relationship count
  const calculateCardSize = (relationshipCount: number) => {
    const baseWidth = 220
    const baseHeight = 140
    const maxWidth = 320
    const maxHeight = 200
    
    // Scale factor based on relationship count (logarithmic scaling)
    const scaleFactor = Math.min(1 + Math.log10(Math.max(relationshipCount, 1)) * 0.3, 1.5)
    
    return {
      width: Math.min(baseWidth * scaleFactor, maxWidth),
      height: Math.min(baseHeight * scaleFactor, maxHeight)
    }
  }

  // Auto-expand all connected tables to create complete neural network picture
  const autoExpandAllConnections = async (startingTableName: string, processedTables: Set<string> = new Set(), maxDepth: number = 3, currentDepth: number = 0) => {
    try {
      console.log(`🧠 Auto-expanding level ${currentDepth} starting from:`, startingTableName)
      
      // Prevent infinite loops and limit depth
      if (processedTables.has(startingTableName) || currentDepth >= maxDepth) {
        console.log(`🛑 Stopping expansion for ${startingTableName} (processed: ${processedTables.has(startingTableName)}, depth: ${currentDepth})`)
        return
      }
      
      processedTables.add(startingTableName)
      
      // Get relationships for this table
      const { data: relationships, error: relError } = await supabase.rpc('get_direct_relationships', {
        table_name_param: startingTableName
      })

      if (relError || !relationships || relationships.length === 0) {
        console.log(`No relationships found for ${startingTableName}`)
        return
      }

      console.log(`🔗 Found ${relationships.length} relationships for ${startingTableName}`)

      // Add all related tables
      await addRelatedTables(startingTableName)
      
      // Wait a bit for the UI to update
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Recursively expand each newly added table
      for (const rel of relationships) {
        const relatedTableName = rel.related_table
        
        // Only expand if we haven't processed this table yet
        if (!processedTables.has(relatedTableName)) {
          await autoExpandAllConnections(relatedTableName, processedTables, maxDepth, currentDepth + 1)
        }
      }
      
      // Final optimization after all expansions at this level
      if (currentDepth === 0) {
        console.log('🧠 Auto-expansion complete, optimizing final layout...')
        setTimeout(() => {
          optimizeVisibleTablePositions()
          updateContainerSize()
          setTimeout(() => autoFitToView(), 500)
        }, 1000)
      }
      
    } catch (error) {
      console.error('Error in auto-expansion:', error)
    }
  }


  // Position tables in a hierarchical layout
  const positionTables = (tablesToPosition: TableInfo[]) => {
    const cardWidth = 220
    const cardHeight = 140
    const positions: Record<string, CardPosition> = {}
    
    // Find core table (level 0) and center it at top
    const coreTable = tablesToPosition.find(t => t.level === 0)
    if (coreTable) {
      // Center horizontally, position at top
      const centerX = 600 // Adjust based on container width
      positions[coreTable.name] = {
        x: centerX - cardWidth / 2,
        y: coreTable.position.y,
        width: cardWidth,
        height: cardHeight
      }
      coreTable.position = { x: centerX - cardWidth / 2, y: coreTable.position.y }
    }
    
    setCardPositions(positions)
    console.log('Positioned tables:', Object.keys(positions))
    updateContainerSize()
  }

  // Position tables in vertical hierarchy - now uses repositionAllTables
  const positionVerticalHierarchy = (tablesToPosition: TableInfo[]) => {
    console.log('Positioning vertical hierarchy')
    repositionAllTables(tablesToPosition)
  }

  // Expand a table to show its relationships
  const expandTable = async (tableName: string) => {
    try {
      console.log('🔄 EXPAND TABLE CALLED:', tableName)
      console.log('Current tables:', tables.map(t => ({ name: t.name, level: t.level, expanded: t.isExpanded })))
      
      // Special handling for core entity
      if (tableName === 'The Septics Group') {
        return expandCoreEntity()
      }
      
      // Get direct relationships for this table
      console.log('🔍 Calling RPC with table name:', tableName)
      const { data: relationshipsData, error } = await supabase
        .rpc('get_direct_relationships', { table_name_param: tableName })
      
      console.log('🔍 RPC Response - Error:', error)
      console.log('🔍 RPC Response - Data:', relationshipsData)
      console.log('🔍 RPC Response - Data type:', typeof relationshipsData)
      console.log('🔍 RPC Response - Is Array:', Array.isArray(relationshipsData))
      
      if (error) {
        console.error('Error getting relationships:', error)
        throw error
      }
      

      console.log('Found relationships for', tableName, ':', relationshipsData?.length || 0)
      console.log('Relationships data:', relationshipsData)

      if (!relationshipsData || relationshipsData.length === 0) {
        console.warn('No relationships found for table:', tableName)
        // Still mark as expanded but with no hidden relationships
        const updatedTables = tables.map(table => {
          if (table.name === tableName) {
            return {
              ...table,
              isExpanded: true,
              hasHiddenRelationships: false
            }
          }
          return table
        })
        setTables(updatedTables)
        return
      }

      console.log('Processing relationships for', tableName, 'with', relationshipsData.length, 'relationships')

      // Update the table to expanded state
      const updatedTables = tables.map(table => {
        if (table.name === tableName) {
          return {
            ...table,
            isExpanded: true,
            hasHiddenRelationships: false
          }
        }
        return table
      })

      // Add new related tables that aren't already visible
      const existingTableNames = new Set(updatedTables.map(t => t.name))
      const newTables: TableInfo[] = []
      
      relationshipsData?.forEach((rel: DirectRelationship) => {
        if (!existingTableNames.has(rel.related_table)) {
          // Determine the level for the new table
          const expandingTable = updatedTables.find(t => t.name === tableName)
          const newLevel = (expandingTable?.level || 1) + 1
          
          newTables.push({
            name: rel.related_table,
            id: rel.related_table,
            position: { x: 0, y: 0 },
            isExpanded: false,
            hasHiddenRelationships: true,
            relationshipCount: 0,
            level: newLevel
          })
          existingTableNames.add(rel.related_table)
        }
      })

      console.log('Adding new tables:', newTables.length, 'at level', newTables[0]?.level)
      console.log('New table names:', newTables.map(t => t.name))
      console.log('Existing tables before expansion:', updatedTables.map(t => t.name))

      const allTables = [...updatedTables, ...newTables]
      console.log('All tables after expansion:', allTables.map(t => ({ name: t.name, level: t.level })))
      
      setTables(allTables)
      
      // Add the actual database relationships to visible relationships
      const actualRelationships = relationshipsData?.map((rel: DirectRelationship) => ({
        ...rel,
        source_table: tableName // Make sure we know which table this came from
      })) || []
      
      console.log('Adding relationships:', actualRelationships.length)
      console.log('Relationship details:', actualRelationships)
      
      setVisibleRelationships(prev => {
        const newRels = [...prev, ...actualRelationships]
        console.log('Total visible relationships:', newRels.length)
        return newRels
      })
      
      // Also check for relationships between newly added tables
      checkInterTableRelationships(allTables)
      
      // Reposition tables to accommodate new ones
      positionExpandedTables(allTables, tableName)
      
    } catch (error) {
      console.error('Error expanding table:', error)
    }
  }

  // Expand the core entity to show main business tables
  const expandCoreEntity = () => {
    console.log('Expanding core entity')
    
    // Get the main business tables
    const businessTables = [
      'business_units', 'users', 'departments', 'services', 
      'leads', 'schedule_jobs', 'forms'
    ]
    
    const relationshipCounts: Record<string, number> = {
      'business_units': 44, 'users': 31, 'departments': 8, 'services': 15,
      'leads': 8, 'schedule_jobs': 6, 'forms': 7
    }

    // Update core table to expanded
    const updatedTables = tables.map(table => {
      if (table.id === 'septics-group-entity') {
        return { ...table, isExpanded: true, hasHiddenRelationships: false }
      }
      return table
    })

    // Add the main business tables
    const newTables: TableInfo[] = businessTables.map((tableName, index) => ({
      name: tableName,
      id: tableName,
      position: { x: 0, y: 0 }, // Will be positioned by layout
      isExpanded: false,
      hasHiddenRelationships: true,
      relationshipCount: relationshipCounts[tableName] || 0,
      level: 1
    }))

    const allTables = [...updatedTables, ...newTables]
    setTables(allTables)
    
    // Create conceptual relationships from core entity to business tables
    const conceptualRelationships: DirectRelationship[] = businessTables.map(tableName => ({
      related_table: tableName,
      relationship_type: 'outgoing' as const,
      source_column: 'entity',
      target_column: 'table',
      constraint_name: `conceptual_${tableName}`
    }))
    
    setVisibleRelationships(conceptualRelationships)
    
    // Position tables in vertical hierarchy
    positionVerticalHierarchy(allTables)
  }

  // Check for relationships between currently visible tables
  const checkInterTableRelationships = async (currentTables: TableInfo[]) => {
    console.log('Checking inter-table relationships for', currentTables.length, 'tables')
    
    const tableNames = currentTables.map(t => t.name)
    const newRelationships: DirectRelationship[] = []
    
    // Check each pair of tables for relationships
    for (const table1 of tableNames) {
      if (table1 === 'The Septics Group') continue // Skip core entity
      
      try {
        const { data: relationships } = await supabase
          .rpc('get_direct_relationships', { table_name_param: table1 })
        
        relationships?.forEach((rel: DirectRelationship) => {
          // If the related table is also visible, add the relationship
          if (tableNames.includes(rel.related_table) && rel.related_table !== table1) {
            newRelationships.push({
              ...rel,
              source_table: table1
            } as any)
          }
        })
      } catch (error) {
        console.error('Error checking relationships for', table1, error)
      }
    }
    
    console.log('Found inter-table relationships:', newRelationships.length)
    
    if (newRelationships.length > 0) {
      setVisibleRelationships(prev => {
        // Remove duplicates and add new ones
        const existing = prev.filter(r => !r.constraint_name.startsWith('inter_'))
        const marked = newRelationships.map(r => ({
          ...r,
          constraint_name: `inter_${r.constraint_name}`
        }))
        return [...existing, ...marked]
      })
    }
  }

  // Position all tables in hierarchical levels
  // Force-directed layout algorithm based on actual relationships
  const calculateNeuralLayout = (allTables: TableInfo[], relationships: DirectRelationship[]) => {
    console.log('🧠 Calculating neural layout for', allTables.length, 'tables')
    
    const cardWidth = 220
    const cardHeight = 140
    const padding = 500 // Reduced padding for more space
    
    // Step 1: Build comprehensive neural network relationship map
    const relationshipMap: Record<string, Set<string>> = {}
    allTables.forEach(table => {
      relationshipMap[table.name] = new Set()
    })
    
    console.log('🧠 Building neural connections from', relationships.length, 'relationships')
    
    // Map all actual relationships between ALL tables (neural connections)
    // Build proper relationship map from the loaded relationships
    const tableNames = new Set(allTables.map(t => t.name))
    
    relationships.forEach(rel => {
      const targetTable = rel.related_table
      
      // We need to find the source table for this relationship
      // Since we're getting relationships per table, we need to track which table we're processing
      // For now, let's create a more comprehensive approach
      
      if (tableNames.has(targetTable)) {
        // Add bidirectional relationships for all tables that have connections
        allTables.forEach(sourceTable => {
          // Check if this relationship involves the source table
          if (relationshipMap[sourceTable.name] && relationshipMap[targetTable]) {
            relationshipMap[sourceTable.name].add(targetTable)
            relationshipMap[targetTable].add(sourceTable.name)
          }
        })
      }
    })
    
    // Also create some basic connections based on common naming patterns
    allTables.forEach(table1 => {
      allTables.forEach(table2 => {
        if (table1.name !== table2.name) {
          // Connect tables with similar prefixes (e.g., business_unit_* tables)
          const prefix1 = table1.name.split('_')[0]
          const prefix2 = table2.name.split('_')[0]
          if (prefix1 === prefix2 && prefix1 !== 'id') {
            relationshipMap[table1.name].add(table2.name)
            relationshipMap[table2.name].add(table1.name)
          }
        }
      })
    })
    
    console.log('🧠 Neural connections built for', Object.keys(relationshipMap).length, 'tables')
    
    const relationshipMapForLog = Object.fromEntries(
      Object.entries(relationshipMap).map(([key, set]) => [key, Array.from(set)])
    )
    console.log('🕷️ Relationship map:', relationshipMapForLog)
    
    // Check if we have any relationships at all
    const totalRelationships = Object.values(relationshipMap).reduce((sum, set) => sum + set.size, 0)
    console.log('🕷️ Total relationships found:', totalRelationships)
    
    // Step 2: Initialize positions across a MUCH larger area for 121 tables
    const positions: Record<string, { x: number, y: number }> = {}
    
    // Calculate grid dimensions for 121 tables - ensure NO OVERLAP
    const cols = Math.ceil(Math.sqrt(allTables.length)) // ~11 columns
    const rows = Math.ceil(allTables.length / cols) // ~11 rows
    const cellWidth = 600 // MASSIVE spacing to prevent any overlap
    const cellHeight = 400 // MASSIVE spacing to prevent any overlap
    const startX = padding + 100
    const startY = padding + 100
    
    allTables.forEach((table, index) => {
      // Start with a grid layout, then add randomization
      const col = index % cols
      const row = Math.floor(index / cols)
      
      const baseX = startX + col * cellWidth
      const baseY = startY + row * cellHeight
      
      // Add minimal randomization to prevent exact overlap
      const randomX = (Math.random() - 0.5) * 50
      const randomY = (Math.random() - 0.5) * 50
      
      positions[table.name] = {
        x: baseX + randomX,
        y: baseY + randomY
      }
      
      console.log(`🧠 Initial position for ${table.name}:`, positions[table.name])
    })
    
    // Step 3: Minimal force-directed algorithm - start with good grid, light adjustments
    const iterations = 50 // Fewer iterations since we start with good spacing
    const attractionStrength = 0.3  // Very light attraction
    const repulsionStrength = 5000 // Moderate repulsion
    const dampening = 0.9 // Higher dampening for stability
    
    for (let iter = 0; iter < iterations; iter++) {
      const forces: Record<string, { x: number, y: number }> = {}
      
      // Initialize forces
      allTables.forEach(table => {
        forces[table.name] = { x: 0, y: 0 }
      })
      
      // Calculate attraction forces (tables with relationships pull toward each other)
      allTables.forEach(table1 => {
        const related = relationshipMap[table1.name]
        related.forEach(table2Name => {
          if (positions[table2Name]) {
            const dx = positions[table2Name].x - positions[table1.name].x
            const dy = positions[table2Name].y - positions[table1.name].y
            const distance = Math.sqrt(dx * dx + dy * dy) || 1
            
            // Optimal distance for related tables
            const optimalDistance = 350
            const force = distance > 1 ? (distance - optimalDistance) * attractionStrength / distance : 0
            
            forces[table1.name].x += dx * force
            forces[table1.name].y += dy * force
          }
        })
      })
      
      // Calculate repulsion forces (prevent card overlap)
      allTables.forEach(table1 => {
        allTables.forEach(table2 => {
          if (table1.name !== table2.name) {
            const dx = positions[table2.name].x - positions[table1.name].x
            const dy = positions[table2.name].y - positions[table1.name].y
            const distance = Math.sqrt(dx * dx + dy * dy) || 1
            
            // Much larger minimum safe distance to prevent stacking
            const minDistance = cardWidth + cardHeight + 120
            
            if (distance < minDistance && distance > 0) {
              // Strong repulsion when cards are too close
              const overlapAmount = minDistance - distance
              const force = (repulsionStrength * overlapAmount) / Math.max(distance * distance, 1)
              
              forces[table1.name].x -= (dx / Math.max(distance, 1)) * force
              forces[table1.name].y -= (dy / Math.max(distance, 1)) * force
            } else if (distance < 600 && distance > 0) {
              // Gentle repulsion for general spacing
              const force = repulsionStrength / Math.max(distance * distance, 1)
              forces[table1.name].x -= (dx / Math.max(distance, 1)) * force
              forces[table1.name].y -= (dy / Math.max(distance, 1)) * force
            }
          }
        })
      })
      
      // Much more aggressive collision detection and immediate separation
      allTables.forEach(table1 => {
        allTables.forEach(table2 => {
          if (table1.name !== table2.name) {
            const dx = positions[table2.name].x - positions[table1.name].x
            const dy = positions[table2.name].y - positions[table1.name].y
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            // Much larger minimum separation to prevent any stacking
            const minSeparation = Math.max(cardWidth, cardHeight) + 100
            
            if (distance < minSeparation) {
              // Very aggressive push apart - much stronger than before
              const pushDistance = (minSeparation - distance) / 2 + 20
              
              if (distance > 0) {
                const pushX = (dx / distance) * pushDistance
                const pushY = (dy / distance) * pushDistance
                
                positions[table1.name].x -= pushX
                positions[table1.name].y -= pushY
                positions[table2.name].x += pushX
                positions[table2.name].y += pushY
              } else {
                // If distance is 0 (exact overlap), push in random directions
                const randomAngle = Math.random() * 2 * Math.PI
                const pushX = Math.cos(randomAngle) * pushDistance
                const pushY = Math.sin(randomAngle) * pushDistance
                
                positions[table1.name].x -= pushX
                positions[table1.name].y -= pushY
                positions[table2.name].x += pushX
                positions[table2.name].y += pushY
              }
            }
          }
        })
      })
      
      // Apply forces with dampening and NaN protection
      allTables.forEach(table => {
        const forceX = forces[table.name].x * dampening
        const forceY = forces[table.name].y * dampening
        
        // Only apply forces if they're valid numbers
        if (!isNaN(forceX) && !isNaN(forceY) && isFinite(forceX) && isFinite(forceY)) {
          positions[table.name].x += forceX
          positions[table.name].y += forceY
        }
        
        // Ensure positions are valid numbers
        if (isNaN(positions[table.name].x) || !isFinite(positions[table.name].x)) {
          positions[table.name].x = padding + Math.random() * 1000
        }
        if (isNaN(positions[table.name].y) || !isFinite(positions[table.name].y)) {
          positions[table.name].y = padding + Math.random() * 800
        }
        
        // Keep within reasonable bounds (smaller area for better visibility)
        const maxX = padding + 2000
        const maxY = padding + 1500
        positions[table.name].x = Math.max(padding, Math.min(positions[table.name].x, maxX))
        positions[table.name].y = Math.max(padding, Math.min(positions[table.name].y, maxY))
      })
    }
    
    // Final overlap check and correction
    console.log('🕷️ Performing final overlap check...')
    let overlapFound = true
    let correctionAttempts = 0
    const maxCorrectionAttempts = 20
    
    while (overlapFound && correctionAttempts < maxCorrectionAttempts) {
      overlapFound = false
      correctionAttempts++
      
      allTables.forEach(table1 => {
        allTables.forEach(table2 => {
          if (table1.name !== table2.name) {
            const dx = positions[table2.name].x - positions[table1.name].x
            const dy = positions[table2.name].y - positions[table1.name].y
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            // Ensure minimum separation
            const minSeparation = Math.max(cardWidth, cardHeight) + 40
            
            if (distance < minSeparation && distance > 0) {
              overlapFound = true
              
              // Calculate push direction
              const angle = Math.atan2(dy, dx)
              const pushDistance = (minSeparation - distance) / 2 + 5
              
              positions[table1.name].x -= Math.cos(angle) * pushDistance
              positions[table1.name].y -= Math.sin(angle) * pushDistance
              positions[table2.name].x += Math.cos(angle) * pushDistance
              positions[table2.name].y += Math.sin(angle) * pushDistance
              
              // Keep within bounds (consistent with main bounds)
              const maxX = padding + 2000
              const maxY = padding + 1500
              positions[table1.name].x = Math.max(padding, Math.min(positions[table1.name].x, maxX))
              positions[table1.name].y = Math.max(padding, Math.min(positions[table1.name].y, maxY))
              positions[table2.name].x = Math.max(padding, Math.min(positions[table2.name].x, maxX))
              positions[table2.name].y = Math.max(padding, Math.min(positions[table2.name].y, maxY))
            }
          }
        })
      })
    }
    
    console.log(`🕷️ Overlap correction completed after ${correctionAttempts} attempts`)
    
    // Convert to CardPosition format
    const finalPositions: Record<string, CardPosition> = {}
    allTables.forEach(table => {
      const pos = positions[table.name]
      if (!pos) {
        console.error('🕷️ Missing position for table:', table.name)
        return
      }
      
      finalPositions[table.name] = {
        x: pos.x,
        y: pos.y,
        width: cardWidth,
        height: cardHeight
      }
      
      console.log(`🕷️ Final position for ${table.name}:`, { x: pos.x, y: pos.y })
    })
    
    console.log('🕷️ Force-directed positions calculated:', Object.keys(finalPositions).length, 'positions')
    return finalPositions
  }

  const repositionAllTables = (allTables: TableInfo[], relationships: DirectRelationship[] = []) => {
    console.log('🧠 Neural positioning', allTables.length, 'tables with', relationships.length, 'relationships')
    console.log('🧠 Table names:', allTables.map(t => t.name))
    
    try {
      // Use neural network force-directed layout for all tables
      const neuralPositions = calculateNeuralLayout(allTables, relationships)
      console.log('🧠 Neural positions calculated:', Object.keys(neuralPositions).length)
      
      // Verify positions are valid
      const validPositions = Object.values(neuralPositions).every(pos => 
        !isNaN(pos.x) && !isNaN(pos.y) && pos.x >= 0 && pos.y >= 0
      )
      
      if (validPositions && Object.keys(neuralPositions).length === allTables.length) {
        console.log('🧠 Using neural network layout')
        
        // Update table positions in state
        const updatedTables = allTables.map(table => ({
          ...table,
          position: { 
            x: neuralPositions[table.name].x, 
            y: neuralPositions[table.name].y 
          }
        }))
        
        setTables(updatedTables)
        setCardPositions(neuralPositions)
      } else {
        console.warn('🧠 Neural layout failed, using simple grid fallback')
        const gridPositions = createSimpleGridLayout(allTables)
        setCardPositions(gridPositions)
      }
    } catch (error) {
      console.error('🧠 Neural layout error:', error)
      console.log('🧠 Using simple grid fallback')
      const gridPositions = createSimpleGridLayout(allTables)
      setCardPositions(gridPositions)
    }
    
    // Update container size after positioning
    setTimeout(() => {
      updateContainerSize()
      setTimeout(() => autoFitToView(), 100)
    }, 50)
  }

  // Simple grid fallback layout
  const createSimpleGridLayout = (allTables: TableInfo[]) => {
    const positions: Record<string, CardPosition> = {}
    const cardWidth = 220
    const cardHeight = 140
    const padding = 1000
    const spacing = 300
    const cols = Math.ceil(Math.sqrt(allTables.length))
    
    allTables.forEach((table, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols
      
      positions[table.name] = {
        x: padding + col * spacing,
        y: padding + row * spacing,
        width: cardWidth,
        height: cardHeight
      }
    })
    
    console.log('📊 Grid layout created for', allTables.length, 'tables')
    return positions
  }

  // Legacy hierarchical layout (kept for reference but not used)
  const repositionAllTablesHierarchical = (allTables: TableInfo[]) => {
    const cardWidth = 220
    const cardHeight = 140
    const positions: Record<string, CardPosition> = {}
    
    // Group tables by level
    const tablesByLevel: Record<number, TableInfo[]> = {}
    allTables.forEach(table => {
      if (!tablesByLevel[table.level]) {
        tablesByLevel[table.level] = []
      }
      tablesByLevel[table.level].push(table)
    })
    
    const padding = 1000 // Define padding first
    const levelSpacing = 250 // Vertical spacing between levels
    const cardSpacing = 300 // Increased horizontal spacing to prevent overflow
    const startY = padding + 150 // Starting Y position with padding and top margin
    
    // Calculate the maximum width needed for any level
    let maxLevelWidth = 0
    Object.values(tablesByLevel).forEach(tablesAtLevel => {
      if (tablesAtLevel.length > 1) {
        const levelWidth = (tablesAtLevel.length - 1) * cardSpacing + cardWidth
        maxLevelWidth = Math.max(maxLevelWidth, levelWidth)
      }
    })
    
    // Calculate center X based on container size with padding - ensure proper centering
    const viewportWidth = containerRef.current?.clientWidth || 1400
    const centerX = padding + (viewportWidth / 2)
    
    console.log('Positioning with centerX:', centerX, 'maxLevelWidth:', maxLevelWidth, 'viewportWidth:', viewportWidth)
    
    // Position each level
    Object.keys(tablesByLevel).forEach(levelStr => {
      const level = parseInt(levelStr)
      const tablesAtLevel = tablesByLevel[level]
      const levelY = startY + level * levelSpacing
      
      if (level === 0) {
        // Core table - center it properly
        const coreTable = tablesAtLevel[0]
        const x = centerX - cardWidth / 2
        coreTable.position = { x, y: levelY }
        positions[coreTable.name] = { x, y: levelY, width: cardWidth, height: cardHeight }
      } else {
        // Child tables - arrange horizontally at same level
        if (tablesAtLevel.length === 1) {
          // Single table - center it
          const table = tablesAtLevel[0]
          const x = centerX - cardWidth / 2
          table.position = { x, y: levelY }
          positions[table.name] = { x, y: levelY, width: cardWidth, height: cardHeight }
        } else {
          // Multiple tables - spread them out
          const totalWidth = (tablesAtLevel.length - 1) * cardSpacing
          const startX = centerX - totalWidth / 2
          
          tablesAtLevel.forEach((table, index) => {
            const x = startX + index * cardSpacing - cardWidth / 2
            table.position = { x, y: levelY }
            positions[table.name] = { x, y: levelY, width: cardWidth, height: cardHeight }
          })
        }
      }
    })
    
    setCardPositions(positions)
    console.log('Repositioned all tables by hierarchy:', Object.keys(positions))
    
    // Update container size to accommodate all tables
    setTimeout(() => {
      updateContainerSize()
      // Auto-fit after positioning to ensure everything is visible
      setTimeout(() => autoFitToView(), 100)
    }, 50)
  }

  // Position tables after expansion - now uses hierarchical repositioning
  const positionExpandedTables = (allTables: TableInfo[], expandedTableName: string) => {
    console.log('Positioning expanded tables for:', expandedTableName)
    repositionAllTables(allTables)
  }

  // Collapse a table's relationships
  const collapseTable = (tableName: string) => {
    console.log('Collapsing table:', tableName)
    
    if (tableName === 'The Septics Group') {
      // Collapse core entity - return to initial state
      return resetToCore()
    }
    
    // For other tables, remove their expanded relationships
    const tableToCollapse = tables.find(t => t.name === tableName)
    if (!tableToCollapse) return
    
    // Mark table as collapsed
    const updatedTables = tables.map(table => {
      if (table.name === tableName) {
        return { ...table, isExpanded: false, hasHiddenRelationships: true }
      }
      return table
    }).filter(table => {
      // Remove tables that were added by this expansion (level > current table's level)
      return table.level <= tableToCollapse.level
    })
    
    // Remove relationships that came from this table
    const filteredRelationships = visibleRelationships.filter(rel => 
      (rel as any).source_table !== tableName
    )
    
    setTables(updatedTables)
    setVisibleRelationships(filteredRelationships)
    
    // Reposition remaining tables using hierarchical layout
    repositionAllTables(updatedTables)
  }


  // Drag and drop handlers
  const handleMouseDown = (e: React.MouseEvent, tableId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('Starting drag for:', tableId)
    
    // Find the table to get its name for position lookup
    const table = tables.find(t => t.id === tableId)
    const tableName = table?.name || tableId
    const position = cardPositions[tableName]
    
    if (!position) {
      console.error('No position found for table:', tableName, 'Available positions:', Object.keys(cardPositions))
      return
    }
    
    const rect = e.currentTarget.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    
    if (containerRect) {
      const clientX = e.clientX
      const clientY = e.clientY
      const containerLeft = containerRect.left
      const containerTop = containerRect.top
      
      console.log('Mouse position:', { clientX, clientY, containerLeft, containerTop, zoomLevel })
      console.log('Card position:', position)
      
      setDragOffset({
        x: (clientX - containerLeft) / zoomLevel - position.x,
        y: (clientY - containerTop) / zoomLevel - position.y
      })
      
      setIsDragging(tableId)
      console.log('Drag started for:', tableId)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    
    e.preventDefault()
    
    const containerRect = containerRef.current.getBoundingClientRect()
    const newX = (e.clientX - containerRect.left) / zoomLevel - dragOffset.x
    const newY = (e.clientY - containerRect.top) / zoomLevel - dragOffset.y
    
    // Find the table being dragged
    const draggedTable = tables.find(t => t.id === isDragging)
    if (!draggedTable) return
    
    // Update positions using table name
    const newPositions = { ...cardPositions }
    newPositions[draggedTable.name] = {
      ...newPositions[draggedTable.name],
      x: Math.max(0, newX),
      y: Math.max(0, newY)
    }
    
    setCardPositions(newPositions)
    
    // Update table position
    const tableIndex = tables.findIndex(t => t.id === isDragging)
    if (tableIndex !== -1) {
      const newTables = [...tables]
      newTables[tableIndex].position = { x: Math.max(0, newX), y: Math.max(0, newY) }
      setTables(newTables)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(null)
    setIsViewportDragging(false)
    updateContainerSize()
  }

  // Viewport panning handlers
  const handleViewportMouseDown = (e: React.MouseEvent) => {
    // Only start viewport drag if clicking on the container background, not on cards
    const target = e.target as HTMLElement
    const isBackground = target.classList.contains('schema-container') || 
                        target.classList.contains('schema-viewport') ||
                        target.tagName === 'svg' ||
                        target.classList.contains('connection-svg')
    
    if (isBackground && !isDragging) {
      setIsViewportDragging(true)
      setViewportDragStart({ 
        x: e.clientX + (containerRef.current?.scrollLeft || 0), 
        y: e.clientY + (containerRef.current?.scrollTop || 0)
      })
      e.preventDefault()
      console.log('Starting viewport drag at:', e.clientX, e.clientY)
    }
  }

  const handleViewportMouseMove = (e: React.MouseEvent) => {
    if (isViewportDragging && containerRef.current) {
      const newScrollLeft = viewportDragStart.x - e.clientX
      const newScrollTop = viewportDragStart.y - e.clientY
      
      const maxScrollLeft = containerRef.current.scrollWidth - containerRef.current.clientWidth
      const maxScrollTop = containerRef.current.scrollHeight - containerRef.current.clientHeight
      
      containerRef.current.scrollLeft = Math.max(0, Math.min(newScrollLeft, maxScrollLeft))
      containerRef.current.scrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop))
    }
  }

  const handleViewportMouseUp = () => {
    if (isViewportDragging) {
      console.log('Ending viewport drag')
    }
    setIsViewportDragging(false)
  }

  // Update container size based on card positions
  const updateContainerSize = () => {
    if (Object.keys(cardPositions).length === 0) {
      // Much larger default size for 121 tables
      setContainerSize({ width: 12000, height: 8000 })
      return
    }
    
    const cardWidth = 220
    const cardHeight = 140
    const positions = Object.values(cardPositions)
    
    // Calculate actual bounds including card dimensions
    const minX = Math.min(...positions.map(p => p.x))
    const minY = Math.min(...positions.map(p => p.y))
    const maxX = Math.max(...positions.map(p => p.x + cardWidth))
    const maxY = Math.max(...positions.map(p => p.y + cardHeight))
    
    // If any cards are at negative positions, shift everything to positive
    const offsetX = minX < 0 ? Math.abs(minX) + 100 : 0
    const offsetY = minY < 0 ? Math.abs(minY) + 100 : 0
    
    if (offsetX > 0 || offsetY > 0) {
      console.log('Shifting cards to positive coordinates:', { offsetX, offsetY })
      const shiftedPositions: Record<string, CardPosition> = {}
      Object.entries(cardPositions).forEach(([name, pos]) => {
        shiftedPositions[name] = {
          ...pos,
          x: pos.x + offsetX,
          y: pos.y + offsetY
        }
      })
      setCardPositions(shiftedPositions)
      return
    }
    
    // Calculate content dimensions
    const contentWidth = maxX - minX
    const contentHeight = maxY - minY
    
    // Add substantial padding for panning and zooming - much larger for 121 tables
    const padding = 1000
    const newSize = {
      width: Math.max(contentWidth + padding * 2, 12000), // Much larger minimum
      height: Math.max(contentHeight + padding * 2, 8000)  // Much larger minimum
    }
    
    console.log('Container size updated:', newSize)
    console.log('Content bounds:', { minX, minY, maxX, maxY, contentWidth, contentHeight })
    
    setContainerSize(newSize)
  }

  // Zoom controls
  const zoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 2))
  const zoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 0.2))
  
  const autoFitToView = () => {
    console.log('Auto-fitting to view, cardPositions:', Object.keys(cardPositions))
    
    if (Object.keys(cardPositions).length === 0) {
      console.log('No card positions available for auto-fit')
      return
    }
    
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0
    
    Object.values(cardPositions).forEach(pos => {
      minX = Math.min(minX, pos.x)
      minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x + (pos.width || 220))
      maxY = Math.max(maxY, pos.y + (pos.height || 140))
    })
    
    // Add padding around content
    const padding = 50
    const contentWidth = maxX - minX + padding * 2
    const contentHeight = maxY - minY + padding * 2
    
    console.log('Fit bounds:', { minX, minY, maxX, maxY, contentWidth, contentHeight })
    
    const viewportElement = containerRef.current
    if (viewportElement) {
      const viewportWidth = viewportElement.clientWidth - 20
      const viewportHeight = viewportElement.clientHeight - 20
      
      console.log('Viewport size:', { viewportWidth, viewportHeight })
      
      const scaleX = viewportWidth / contentWidth
      const scaleY = viewportHeight / contentHeight
      const scale = Math.min(scaleX, scaleY, 1.0) * 0.95 // Ensure everything fits with margin
      
      console.log('Calculated scale:', scale, 'from scaleX:', scaleX, 'scaleY:', scaleY)
      
      setZoomLevel(Math.max(scale, 0.1))
      
      // Center the content in viewport
      const scaledContentWidth = contentWidth * scale
      const scaledContentHeight = contentHeight * scale
      
      const scrollX = (minX - padding) * scale - (viewportWidth - scaledContentWidth) / 2
      const scrollY = (minY - padding) * scale - (viewportHeight - scaledContentHeight) / 2
      
      console.log('Scrolling to:', { scrollX, scrollY })
      
      setTimeout(() => {
        viewportElement.scrollTo({
          left: Math.max(0, scrollX),
          top: Math.max(0, scrollY),
          behavior: 'smooth'
        })
      }, 100)
    }
  }

  // Calculate simple, smooth curved connections
  const calculateConnectionPath = (sourceTableId: string, targetTableId: string) => {
    // Find source position by ID
    const sourceTable = tables.find(t => t.id === sourceTableId)
    const sourcePos = sourceTable ? cardPositions[sourceTable.name] : null
    
    // Find target position by ID
    const targetTable = tables.find(t => t.id === targetTableId)
    const targetPos = targetTable ? cardPositions[targetTable.name] : null
    
    if (!sourcePos || !targetPos) {
      console.log('❌ Missing positions for connection:', { sourceTable: sourceTable?.name, targetTable: targetTable?.name })
      return ''
    }
    
    // Simple center-to-center curved connections
    const sourceCenterX = sourcePos.x + (sourcePos.width || 220) / 2
    const sourceCenterY = sourcePos.y + (sourcePos.height || 140) / 2
    const targetCenterX = targetPos.x + (targetPos.width || 220) / 2
    const targetCenterY = targetPos.y + (targetPos.height || 140) / 2
    
    // Create smooth curved path between centers
    const dx = targetCenterX - sourceCenterX
    const dy = targetCenterY - sourceCenterY
    
    // Control points for smooth curve (offset by 1/3 of the distance)
    const cp1X = sourceCenterX + dx * 0.3
    const cp1Y = sourceCenterY
    const cp2X = targetCenterX - dx * 0.3  
    const cp2Y = targetCenterY
    
    const path = `M ${sourceCenterX} ${sourceCenterY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${targetCenterX} ${targetCenterY}`
    
    return path
  }

  if (isLoading) {
    return (
      <div className="database-schema">
        <div className="schema-header">
          <h1>Database Schema</h1>
          <p>Loading database schema...</p>
        </div>
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="database-schema">
      <div className="schema-header">
        <h1>Database Schema</h1>
        <p>🧠 Neural network database schema - {tables.length} tables connected, {visibleRelationships.length} neural pathways {isLoading && '(Auto-expanding...)'}</p>
        
        <div className="schema-controls">
          <button onClick={resetToCore} className="control-btn">
            Reset to Core
          </button>
          <div className="zoom-controls">
            <button onClick={zoomOut} className="zoom-btn">-</button>
            <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={zoomIn} className="zoom-btn">+</button>
            <button onClick={autoFitToView} className="fit-btn">Fit</button>
            <button 
              onClick={() => {
                console.log('🧠 Manual neural layout trigger')
                repositionAllTables(tables, visibleRelationships)
              }} 
              className="fit-btn"
              style={{ backgroundColor: '#8b5cf6' }}
            >
              🧠 Neural
            </button>
          </div>
        </div>
      </div>
      
      <div 
        className={`schema-viewport ${isViewportDragging ? 'dragging' : ''}`}
        ref={containerRef}
        onMouseDown={handleViewportMouseDown}
        onMouseMove={(e) => {
          handleMouseMove(e)
          handleViewportMouseMove(e)
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="schema-container"
          style={{
            width: containerSize.width,
            height: containerSize.height,
            transform: `scale(${zoomLevel})`,
            transformOrigin: '0 0'
          }}
        >
          {/* SVG for connection lines */}
          <svg 
            className="connection-overlay"
            width={containerSize.width}
            height={containerSize.height}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            {visibleRelationships.map((rel, index) => {
              
              // Find source and target tables
              let sourceTable: TableInfo | undefined
              let targetTable: TableInfo | undefined
              
              // Find target table
              targetTable = tables.find(t => t.name === rel.related_table)
              if (!targetTable) {
                return null
              }
              
              // Find source table using the tracked source_table info
              if (rel.source_table) {
                sourceTable = tables.find(t => t.name === rel.source_table)
              }
              
              // Fallback: find any other visible table that could be the source
              if (!sourceTable) {
                sourceTable = tables.find(t => t.name !== rel.related_table && t.isExpanded)
              }
              if (!sourceTable) {
                sourceTable = tables.find(t => t.name !== rel.related_table)
              }
              
              if (!sourceTable) {
                return null
              }
              
              const pathData = calculateConnectionPath(sourceTable.id, targetTable.id)
              if (!pathData) return null
              
              // Color coding based on relationship type
              let strokeColor = "#3b82f6" // Default blue
              if (rel.relationship_type === 'incoming') strokeColor = "#10b981" // Green for incoming
              if (rel.relationship_type === 'outgoing') strokeColor = "#f59e0b" // Orange for outgoing
              
              return (
                <g key={`${sourceTable.name}-${rel.related_table}-${index}`}>
                  <path
                    d={pathData}
                    stroke={strokeColor}
                    strokeWidth="2"
                    fill="none"
                    opacity="0.7"
                    className="relationship-line"
                    markerEnd="url(#arrowhead)"
                  />
                  {/* Static direction indicator for database relationships */}
                  <circle
                    cx={targetTable.position.x + (cardPositions[targetTable.name]?.width || 220) / 2}
                    cy={targetTable.position.y + (cardPositions[targetTable.name]?.height || 140) / 2}
                    r="4"
                    fill={strokeColor}
                    opacity="0.8"
                  />
                </g>
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
                  fill="#3b82f6"
                />
              </marker>
            </defs>
          </svg>
          
          {/* Table cards */}
          {tables.map(table => (
            <div
              key={table.id}
              className={`table-card ${isDragging === table.id ? 'dragging' : ''} ${table.isGroupManagement ? 'core-table' : ''}`}
              style={{
                position: 'absolute',
                left: cardPositions[table.name]?.x || 0,
                top: cardPositions[table.name]?.y || 0,
                width: cardPositions[table.name]?.width || 220,
                height: cardPositions[table.name]?.height || 140
              }}
              onMouseDown={(e) => handleMouseDown(e, table.id)}
            >
              <div className="card-header">
                <h3>{table.displayName || table.name}</h3>
                {table.isGroupManagement && <span className="core-badge">GROUP CORE</span>}
              </div>
              <div className="card-content">
                <div className="table-info">
                  <span className="table-type">Table</span>
                  <span className="relationship-count">
                    {table.relationshipCount} relations
                  </span>
                </div>
                
                {/* Neural network controls */}
                <div className="neural-controls">
                  {table.hasHiddenRelationships && !table.isExpanded && !isLoading && (
                    <button 
                      className="neural-btn expand-neural"
                      onClick={(e) => {
                        e.stopPropagation()
                        console.log('🧠 Expanding neural connections for:', table.name)
                        addRelatedTables(table.name)
                      }}
                    >
                      <span className="neural-icon">🔗</span>
                      <span className="neural-text">Show Connections</span>
                    </button>
                  )}
                  
                  {table.isExpanded && (
                    <button 
                      className="neural-btn collapse-neural"
                      onClick={(e) => {
                        e.stopPropagation()
                        console.log('🧠 Collapsing neural connections for:', table.name)
                        // Mark as collapsed but keep table visible
                        const updatedTables = tables.map(t => 
                          t.name === table.name 
                            ? { ...t, isExpanded: false, hasHiddenRelationships: true }
                            : t
                        )
                        setTables(updatedTables)
                      }}
                    >
                      <span className="neural-icon">🔗</span>
                      <span className="neural-text">Connections Shown</span>
                    </button>
                  )}
                  
                  {tables.length > 1 && (
                    <button 
                      className="neural-btn hide-neural"
                      onClick={(e) => {
                        e.stopPropagation()
                        hideTable(table.name)
                      }}
                    >
                      <span className="neural-icon">👁️</span>
                      <span className="neural-text">Hide Table</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DatabaseSchema
