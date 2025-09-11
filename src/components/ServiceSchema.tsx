import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './ServiceSchema.css'

interface SchemaRelationship {
  table: string
  relationship: string
  description: string
  status: 'implemented' | 'partial' | 'not-implemented' | 'testing'
  actionType: 'inline' | 'page' | 'disabled'
  route?: string
  recordCount?: number
  relatedRecords?: string[]
  position?: { x: number; y: number }
  id: string
}

interface CardPosition {
  id: string
  x: number
  y: number
  width: number
  height: number
}

interface ServiceSchemaProps {
  serviceData?: any
}

const ServiceSchema = ({ serviceData }: ServiceSchemaProps) => {
  console.log('ServiceSchema received serviceData:', serviceData)
  const navigate = useNavigate()
  const { serviceId } = useParams<{ serviceId: string }>()
  const [isTesting, setIsTesting] = useState(false)
  const [actualServiceId, setActualServiceId] = useState<string | null>(null)
  const [relationships, setRelationships] = useState<SchemaRelationship[]>([])
  const [serviceName, setServiceName] = useState<string>('Service Record')
  const [cardPositions, setCardPositions] = useState<CardPosition[]>([])
  const [isDragging, setIsDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [containerSize, setContainerSize] = useState({ width: 1400, height: 1000 })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1400, height: 1000 })
  
  // Initialize with core services record
  const initializeRelationships = () => {
    const serviceName = serviceData?.name || 'Loading service...'
    console.log('Initializing with service name:', serviceName, 'serviceData:', serviceData)
    
    setRelationships([
      {
        id: 'services',
        table: 'services',
        relationship: 'Core Record',
        description: `${serviceName} - Main service definition`,
        status: 'implemented',
        actionType: 'disabled',
        position: { x: 600, y: 50 } // Center top
      }
    ])
  }

  // Auto-detect relationships from database schema
  const detectRelationships = async () => {
    try {
      const { data: foreignKeys, error } = await supabase.rpc('get_foreign_keys_to_services')
      
      if (error) {
        console.log('RPC not available, using fallback detection')
        // Fallback: try to detect by querying known tables
        await detectRelationshipsFallback()
        return
      }

      const detectedRelationships = foreignKeys.map((fk: any) => ({
        table: fk.table_name,
        relationship: `services.id → ${fk.column_name}`,
        description: `Related ${fk.table_name.replace(/_/g, ' ')} records`,
        status: 'not-implemented' as const,
        actionType: 'page' as const,
        route: fk.table_name.replace(/^service_/, '').replace(/_/g, '-')
      }))

      setRelationships(prev => [
        prev[0], // Keep services table
        ...detectedRelationships
      ])
    } catch (error) {
      console.log('Schema detection failed, using fallback')
      await detectRelationshipsFallback()
    }
  }

  const detectRelationshipsFallback = async () => {
    // Test only tables that have direct service_id foreign keys
    const directServiceTables = [
      'service_department_assignments',
      'business_unit_services', 
      'service_skills',
      'service_equipment_requirements',
      'service_pricing',
      'service_forms',
      'service_booking_rules'
    ]

    const detectedRelationships = []

    for (const tableName of directServiceTables) {
      try {
        // Test if table exists and has service_id column by trying to query it
        const { error } = await supabase
          .from(tableName)
          .select('id, service_id')
          .limit(1)

        if (!error) {
          // Get description based on table name
          let description = ''
          let actionType: 'inline' | 'page' = 'page'
          
          switch (tableName) {
            case 'service_department_assignments':
              description = 'Which departments can provide this service'
              actionType = 'inline'
              break
            case 'business_unit_services':
              description = 'Business unit availability, custom pricing & duration'
              break
            case 'service_skills':
              description = 'Required employee skills and proficiency levels'
              actionType = 'inline'
              break
            case 'service_equipment_requirements':
              description = 'Equipment needed to perform the service'
              actionType = 'inline'
              break
            case 'service_pricing':
              description = 'Custom pricing by business unit'
              break
            case 'service_forms':
              description = 'Required forms and documentation'
              break
            case 'service_booking_rules':
              description = 'Booking constraints and rules'
              break
            default:
              description = `${tableName.replace(/service_|_/g, ' ').trim()} management`
          }

          detectedRelationships.push({
            id: tableName,
            table: tableName,
            relationship: 'services.id → service_id',
            description,
            status: 'not-implemented' as const,
            actionType,
            route: tableName.replace(/^service_/, '').replace(/_/g, '-'),
            position: { x: 0, y: 0 } // Will be calculated by auto-layout
          })
        }
      } catch (e) {
        // Table doesn't exist or doesn't have service_id column, skip it
        console.log(`Skipping ${tableName}: not a direct service relationship`)
      }
    }

    setRelationships(prev => {
      const coreTable = prev.find(r => r.table === 'services')
      const newRelationships = [
        ...(coreTable ? [coreTable] : []),
        ...detectedRelationships
      ]
      
      console.log('Updated relationships:', newRelationships)
      return newRelationships
    })
    
    // Auto-layout after detecting relationships
    setTimeout(() => {
      console.log('Running auto-layout...')
      autoLayout()
    }, 200)
  }

  // Initialize on component mount and when serviceData changes
  React.useEffect(() => {
    console.log('ServiceData updated:', serviceData)
    
    // Update service name state
    if (serviceData?.name) {
      setServiceName(serviceData.name)
      console.log('Service name set to:', serviceData.name)
    }
    
    initializeRelationships()
    detectRelationships()
    
    // Auto-run test connections when serviceData is available
    if (serviceData && serviceData.id) {
      console.log('Auto-running test connections for:', serviceData.name)
      setTimeout(() => {
        testConnections().then(() => {
          // Auto-layout after test connections complete
          setTimeout(() => {
            console.log('Auto-running layout after test connections')
            autoLayout()
          }, 300)
        }).catch(error => {
          console.error('Error in auto test connections:', error)
          // Still try to layout with whatever relationships we have
          setTimeout(() => autoLayout(), 300)
        })
      }, 100) // Reduced delay for faster loading
    } else {
      // Even without serviceData, try to detect and layout relationships
      setTimeout(() => {
        detectRelationships()
        setTimeout(() => autoLayout(), 200)
      }, 200)
    }
  }, [serviceData]) // Re-run when serviceData changes

  // Auto-layout on component mount regardless of serviceData
  React.useEffect(() => {
    console.log('Component mounted, triggering initial layout')
    setTimeout(() => {
      autoLayout()
    }, 500)
  }, []) // Run once on mount

  // Simplified and improved auto-layout algorithm
  const autoLayout = () => {
    console.log('Auto-layout starting with relationships:', relationships)
    
    const coreCard = relationships.find(r => r.table === 'services')
    const relatedCards = relationships.filter(r => r.table !== 'services')
    
    if (!coreCard) {
      console.log('No core card found')
      return
    }
    
    const cardWidth = 320
    const cardHeight = 180
    const spacing = 150 // Generous spacing for readability
    
    // Position core card at top center
    const startX = 100
    const startY = 100
    coreCard.position = { x: startX, y: startY }
    
    if (relatedCards.length === 0) {
      console.log('No related cards to layout')
      setRelationships([...relationships])
      return
    }
    
    // Simple grid layout - much more predictable and readable
    const maxCols = Math.min(4, Math.ceil(Math.sqrt(relatedCards.length + 1))) // Max 4 columns
    let currentX = startX
    let currentY = startY + cardHeight + spacing // Start below core card
    let currentCol = 0
    
    relatedCards.forEach((card, index) => {
      card.position = { x: currentX, y: currentY }
      
      currentCol++
      currentX += cardWidth + spacing
      
      // Move to next row if we've filled the current row
      if (currentCol >= maxCols) {
        currentCol = 0
        currentX = startX
        currentY += cardHeight + spacing
      }
    })
    
    console.log('Simple grid layout completed')
    setRelationships([...relationships])
    
    // Update container size and set reasonable zoom
    setTimeout(() => {
      updateContainerSize()
      // Set a more reasonable zoom level instead of auto-fitting to tiny size
      setZoomLevel(0.8) // 80% zoom for good readability
    }, 100)
  }

  // Check if a position overlaps with existing positions
  const isPositionOverlapping = (
    newPos: { x: number; y: number }, 
    existingPositions: { x: number; y: number }[], 
    width: number, 
    height: number, 
    minDistance: number
  ): boolean => {
    return existingPositions.some(pos => {
      const dx = Math.abs(newPos.x - pos.x)
      const dy = Math.abs(newPos.y - pos.y)
      return dx < (width + minDistance) && dy < (height + minDistance)
    })
  }

  // Score a position based on various factors
  const scorePosition = (
    position: { x: number; y: number },
    existingPositions: { x: number; y: number }[],
    centerX: number,
    centerY: number,
    cardWidth: number,
    cardHeight: number,
    minDistance: number
  ): number => {
    let score = 0
    
    // Prefer positions that maintain good spacing from other cards
    const avgDistance = existingPositions.reduce((sum, pos) => {
      const dx = position.x - pos.x
      const dy = position.y - pos.y
      return sum + Math.sqrt(dx * dx + dy * dy)
    }, 0) / existingPositions.length
    
    score += avgDistance * 0.1
    
    // Prefer positions that aren't too far from center
    const distanceFromCenter = Math.sqrt(
      Math.pow(position.x - centerX, 2) + Math.pow(position.y - centerY, 2)
    )
    score += Math.max(0, 1000 - distanceFromCenter * 0.5)
    
    // Prefer positions that are below the core card
    if (position.y > centerY + 150) {
      score += 200
    }
    
    return score
  }

  // Optimize card positions to minimize line crossings
  const optimizeForLineRouting = (cards: SchemaRelationship[], coreCard: SchemaRelationship) => {
    if (!coreCard.position) return
    
    // Sort cards by angle from core to reduce line crossings
    cards.sort((a, b) => {
      if (!a.position || !b.position) return 0
      
      const angleA = Math.atan2(
        a.position.y - coreCard.position!.y,
        a.position.x - coreCard.position!.x
      )
      const angleB = Math.atan2(
        b.position.y - coreCard.position!.y,
        b.position.x - coreCard.position!.x
      )
      
      return angleA - angleB
    })
  }

  // Drag and drop handlers
  const handleMouseDown = (e: React.MouseEvent, cardId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const rect = e.currentTarget.getBoundingClientRect()
    const containerRect = e.currentTarget.closest('.schema-container')?.getBoundingClientRect()
    
    if (containerRect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
      setIsDragging(cardId)
      console.log('Started dragging:', cardId)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    
    e.preventDefault()
    const containerRect = e.currentTarget.getBoundingClientRect()
    const newX = e.clientX - containerRect.left - dragOffset.x
    const newY = e.clientY - containerRect.top - dragOffset.y
    
    // Allow dragging beyond bounds (container will resize)
    const constrainedX = Math.max(0, newX)
    const constrainedY = Math.max(0, newY)
    
    setRelationships(prev => prev.map(rel => 
      rel.id === isDragging 
        ? { ...rel, position: { x: constrainedX, y: constrainedY } }
        : rel
    ))
  }

  const handleMouseUp = () => {
    if (isDragging) {
      // Update container size if needed after dragging
      updateContainerSize()
    }
    setIsDragging(null)
  }

  // Update container size to fit all cards
  const updateContainerSize = () => {
    const cardWidth = 320
    const cardHeight = 180
    const padding = 100

    let maxX = 0
    let maxY = 0
    let minX = Infinity
    let minY = Infinity

    relationships.forEach(rel => {
      if (rel.position) {
        minX = Math.min(minX, rel.position.x)
        minY = Math.min(minY, rel.position.y)
        maxX = Math.max(maxX, rel.position.x + cardWidth)
        maxY = Math.max(maxY, rel.position.y + cardHeight)
      }
    })

    if (minX !== Infinity) {
      const newWidth = Math.max(1400, maxX + padding)
      const newHeight = Math.max(1000, maxY + padding)
      
      setContainerSize({ width: newWidth, height: newHeight })
      setViewBox({ x: 0, y: 0, width: newWidth, height: newHeight })
    }
  }

  // Zoom controls
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 3))
  }

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.3))
  }

  const fitToView = () => {
    autoFitToView()
  }

  const autoFitToView = () => {
    const cardWidth = 320
    const cardHeight = 180
    const padding = 100

    let maxX = 0
    let maxY = 0
    let minX = Infinity
    let minY = Infinity

    relationships.forEach(rel => {
      if (rel.position) {
        minX = Math.min(minX, rel.position.x)
        minY = Math.min(minY, rel.position.y)
        maxX = Math.max(maxX, rel.position.x + cardWidth)
        maxY = Math.max(maxY, rel.position.y + cardHeight)
      }
    })

    if (minX !== Infinity) {
      const contentWidth = maxX - minX + padding * 2
      const contentHeight = maxY - minY + padding * 2
      
      // Get actual viewport dimensions
      const viewportElement = document.querySelector('.schema-viewport')
      const viewportWidth = viewportElement ? viewportElement.clientWidth - 40 : window.innerWidth - 200
      const viewportHeight = viewportElement ? viewportElement.clientHeight - 40 : window.innerHeight - 400
      
      // Calculate zoom to fit content in viewport with generous margin
      const scaleX = viewportWidth / contentWidth
      const scaleY = viewportHeight / contentHeight
      const scale = Math.min(scaleX, scaleY, 1) * 0.85 // 85% to leave margin
      
      // Don't zoom too small - maintain readability
      const finalScale = Math.max(scale, 0.5) // Minimum 50% zoom for readability
      
      console.log('Auto-fitting to view:', { 
        contentWidth, 
        contentHeight, 
        viewportWidth, 
        viewportHeight, 
        scale: finalScale
      })
      
      setZoomLevel(finalScale)
      
      // Update container size to fit content
      setContainerSize({ 
        width: Math.max(contentWidth, 1400), 
        height: Math.max(contentHeight, 1000)
      })
    }
  }

  // Calculate smooth curved connection lines
  const calculateConnectionPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const cardWidth = 320
    const cardHeight = 180
    
    // Calculate connection points (center bottom of from card, center top of to card)
    const fromPoint = { x: from.x + cardWidth / 2, y: from.y + cardHeight }
    const toPoint = { x: to.x + cardWidth / 2, y: to.y }
    
    // Calculate the distance and direction
    const dx = toPoint.x - fromPoint.x
    const dy = toPoint.y - fromPoint.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // Determine curve intensity based on distance and angle
    const curveIntensity = Math.min(distance * 0.4, 150)
    
    // Check if we need to route around other cards
    const needsComplexRouting = checkForCardCollisions(fromPoint, toPoint)
    
    if (needsComplexRouting) {
      // Complex routing with multiple curves to avoid cards
      return createAvoidanceRoute(fromPoint, toPoint)
    } else {
      // Simple smooth curve
      return createSmoothCurve(fromPoint, toPoint, curveIntensity)
    }
  }

  // Create a smooth bezier curve between two points
  const createSmoothCurve = (from: { x: number; y: number }, to: { x: number; y: number }, intensity: number) => {
    // Simpler, more readable curves for grid layout
    const cp1x = from.x
    const cp1y = from.y + Math.min(intensity, 100) // Limit curve intensity
    const cp2x = to.x  
    const cp2y = to.y - Math.min(intensity, 100)
    
    return `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`
  }

  // Check if the direct path would collide with any cards
  const checkForCardCollisions = (from: { x: number; y: number }, to: { x: number; y: number }): boolean => {
    const cardWidth = 320
    const cardHeight = 180
    const buffer = 20
    
    return relationships.some(card => {
      if (!card.position || card.table === 'services') return false
      
      const cardLeft = card.position.x - buffer
      const cardRight = card.position.x + cardWidth + buffer
      const cardTop = card.position.y - buffer
      const cardBottom = card.position.y + cardHeight + buffer
      
      // Simple line intersection check
      const minX = Math.min(from.x, to.x)
      const maxX = Math.max(from.x, to.x)
      const minY = Math.min(from.y, to.y)
      const maxY = Math.max(from.y, to.y)
      
      return (cardLeft < maxX && cardRight > minX && cardTop < maxY && cardBottom > minY)
    })
  }

  // Create a route that avoids cards with multiple curves
  const createAvoidanceRoute = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const midY = (from.y + to.y) / 2
    const offsetX = from.x < to.x ? -100 : 100
    
    // Create an S-curve that goes around obstacles
    const waypoint1 = { x: from.x, y: from.y + 80 }
    const waypoint2 = { x: from.x + offsetX, y: midY }
    const waypoint3 = { x: to.x - offsetX, y: midY }
    const waypoint4 = { x: to.x, y: to.y - 80 }
    
    return `M ${from.x} ${from.y} 
            C ${waypoint1.x} ${waypoint1.y}, ${waypoint2.x} ${waypoint2.y - 40}, ${waypoint2.x} ${waypoint2.y}
            C ${waypoint2.x} ${waypoint2.y + 40}, ${waypoint3.x} ${waypoint3.y - 40}, ${waypoint3.x} ${waypoint3.y}
            C ${waypoint3.x} ${waypoint3.y + 40}, ${waypoint4.x} ${waypoint4.y}, ${to.x} ${to.y}`
  }

  const resolveServiceId = async () => {
    if (!serviceId) return null
    
    // If serviceId looks like a UUID, use it directly
    if (serviceId.includes('-') && serviceId.length > 20) {
      return serviceId
    }
    
    // Otherwise, resolve slug to UUID
    try {
      const slugUpper = serviceId.toUpperCase().replace(/-/g, '_')
      const { data, error } = await supabase
        .from('services')
        .select('id')
        .or(`service_code.eq.${slugUpper},name.ilike.%${serviceId.replace(/-/g, ' ')}%`)
        .single()
      
      return data?.id || null
    } catch (error) {
      console.error('Error resolving service ID:', error)
      return null
    }
  }

  const testConnections = async (): Promise<void> => {
    setIsTesting(true)
    
    try {
      // First refresh the schema to detect any new tables
      console.log('Refreshing schema...')
      await detectRelationships()
      
      // Small delay to let schema update
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Resolve the actual service UUID
      const resolvedServiceId = await resolveServiceId()
      if (!resolvedServiceId) {
        console.error('Could not resolve service ID')
        return
      }
      
      setActualServiceId(resolvedServiceId)
      
      // Set all to testing status
      setRelationships(prev => prev.map(rel => ({ ...rel, status: 'testing' as const })))
      
      // Test each relationship
      setRelationships(prev => {
        const testRelationships = async () => {
          const updatedRelationships = [...prev]
          
          for (let i = 0; i < updatedRelationships.length; i++) {
            const rel = updatedRelationships[i]
            
            try {
              if (rel.table === 'services') {
                // Test core services record - this should always be implemented since we're viewing it
                if (serviceData && serviceData.id) {
                  rel.status = 'implemented'
                  rel.recordCount = 1
                  rel.relatedRecords = [serviceData.name]
                  console.log('Services record:', { name: serviceData.name, id: serviceData.id })
                } else {
                  rel.status = 'partial'
                  rel.recordCount = 0
                  rel.relatedRecords = []
                }
              } else {
                // Test related tables and get actual record names
                let selectFields = 'id'
                let nameField = 'name'
                
                // Determine what field to use for display names
                switch (rel.table) {
                  case 'service_department_assignments':
                    selectFields = 'id, departments(name)'
                    nameField = 'departments.name'
                    break
                  case 'business_unit_services':
                    selectFields = 'id, business_units(name)'
                    nameField = 'business_units.name'
                    break
                  case 'service_skills':
                    selectFields = 'id, skills(name)'
                    nameField = 'skills.name'
                    break
                  case 'service_equipment_requirements':
                    selectFields = 'id, equipment_type'
                    nameField = 'equipment_type'
                    break
                  case 'service_pricing':
                    selectFields = 'id, business_units(name), base_price'
                    nameField = 'business_units.name'
                    break
                  default:
                    selectFields = 'id'
                }
                
                const { data, error, count } = await supabase
                  .from(rel.table)
                  .select(selectFields, { count: 'exact' })
                  .eq('service_id', resolvedServiceId)
                  .limit(5) // Get up to 5 records for display
                
                console.log(`Testing ${rel.table}:`, { data, error, count })
                
                if (error) {
                  console.error(`Error testing ${rel.table}:`, error)
                  rel.status = 'not-implemented'
                  rel.recordCount = 0
                  rel.relatedRecords = []
                } else {
                  rel.recordCount = count || 0
                  
                  // Extract record names for display
                  const recordNames = []
                  if (data && data.length > 0) {
                    for (const record of data) {
                      let displayName = ''
                      
                      switch (rel.table) {
                        case 'service_department_assignments':
                          displayName = (record as any).departments?.name || 'Unknown Department'
                          break
                        case 'business_unit_services':
                          displayName = (record as any).business_units?.name || 'Unknown Business Unit'
                          break
                        case 'service_skills':
                          displayName = (record as any).skills?.name || 'Unknown Skill'
                          break
                        case 'service_equipment_requirements':
                          displayName = (record as any).equipment_type || 'Unknown Equipment'
                          break
                        case 'service_pricing':
                          const buName = (record as any).business_units?.name || 'Unknown'
                          const price = (record as any).base_price || 0
                          displayName = `${buName} (£${price})`
                          break
                        default:
                          displayName = `Record ${record.id.substring(0, 8)}`
                      }
                      
                      recordNames.push(displayName)
                    }
                  }
                  
                  rel.relatedRecords = recordNames
                  
                  if (count && count > 0) {
                    rel.status = 'implemented' // Has data
                  } else {
                    rel.status = 'partial' // Table exists but no data for this service
                  }
                }
              }
            } catch (error) {
              console.error(`Exception testing ${rel.table}:`, error)
              rel.status = 'not-implemented'
              rel.recordCount = 0
            }
            
            // Update state after each test for visual feedback
            setRelationships([...updatedRelationships])
            
            // Small delay for visual effect
            await new Promise(resolve => setTimeout(resolve, 300))
          }
        }
        
        testRelationships()
        return prev
      })
      
    } finally {
      setIsTesting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'implemented': return '#16a34a'
      case 'partial': return '#ea580c'
      case 'not-implemented': return '#64748b'
      case 'testing': return '#3b82f6'
      default: return '#64748b'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'implemented': return 'HAS DATA'
      case 'partial': return 'NO DATA'
      case 'not-implemented': return 'ERROR'
      case 'testing': return 'TESTING...'
      default: return 'UNKNOWN'
    }
  }

  const handleTableClick = (rel: SchemaRelationship) => {
    if (rel.actionType === 'disabled') return
    
    const companySlug = window.location.pathname.split('/')[1]
    
    if (rel.actionType === 'page' && rel.route) {
      navigate(`/${companySlug}/services/${serviceId}/${rel.route}`)
    } else if (rel.actionType === 'inline') {
      // For inline editing, we could scroll to the relevant section
      const element = document.querySelector(`.${rel.table.replace(/_/g, '-')}-section`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const getActionText = (actionType: string) => {
    switch (actionType) {
      case 'inline': return 'Edit Below'
      case 'page': return 'Manage →'
      case 'disabled': return ''
      default: return ''
    }
  }

  const coreTable = relationships.find(r => r.table === 'services')
  const relatedTables = relationships.filter(r => r.table !== 'services')
  
  console.log('Rendering - Core table:', coreTable)
  console.log('Rendering - Related tables:', relatedTables)

  return (
    <div className="service-schema fluid">
      <div className="schema-header">
        <div className="header-content">
          <h2>Service Database Relationships</h2>
          <p>Drag cards to reposition • Auto-layout optimizes visibility</p>
        </div>
        <div className="header-actions">
          <div className="status-legend">
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#16a34a' }}></div>
              <span>HAS DATA</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#ea580c' }}></div>
              <span>NO DATA</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#3b82f6' }}></div>
              <span>TESTING</span>
            </div>
          </div>
          <div className="zoom-controls">
            <button 
              className="zoom-btn"
              onClick={zoomOut}
              title="Zoom Out"
            >
              🔍-
            </button>
            <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
            <button 
              className="zoom-btn"
              onClick={zoomIn}
              title="Zoom In"
            >
              🔍+
            </button>
            <button 
              className="fit-btn"
              onClick={fitToView}
              title="Fit to View"
            >
              📐 Fit
            </button>
          </div>
          <button 
            className="auto-layout-btn"
            onClick={() => {
              console.log('Manual auto-layout triggered')
              autoLayout()
            }}
            title="Auto-optimize layout"
          >
            🎯 Auto Layout
          </button>
          <button 
            className={`test-btn ${isTesting ? 'testing' : ''}`}
            onClick={async () => {
              await testConnections()
              // Auto-layout after manual test connections
              setTimeout(() => {
                console.log('Auto-running layout after manual test connections')
                autoLayout()
              }, 200)
            }}
            disabled={isTesting}
          >
            {isTesting ? 'Testing...' : 'Test Connections'}
          </button>
        </div>
      </div>

      <div 
        className="schema-viewport"
        style={{ 
          width: '100%',
          height: '70vh',
          minHeight: '600px',
          overflow: 'auto',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          position: 'relative'
        }}
      >
        <div
          className="schema-container"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ 
            width: containerSize.width, 
            height: containerSize.height,
            position: 'relative',
            transform: `scale(${zoomLevel})`,
            transformOrigin: '0 0',
            minWidth: '100%',
            minHeight: '100%'
          }}
        >
        {/* Dynamic Connection Lines */}
        <svg 
          className="connection-overlay" 
          width="100%" 
          height="100%"
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}
        >
          {coreTable && relatedTables.map((rel) => {
            if (!coreTable.position || !rel.position) return null
            
            return (
              <path
                key={rel.id}
                d={calculateConnectionPath(coreTable.position, rel.position)}
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
                opacity="0.6"
              />
            )
          })}
        </svg>

        {/* Draggable Cards */}
        {relationships.map((rel) => {
          if (!rel.position) return null
          
          const isCore = rel.table === 'services'
          
          return (
            <div
              key={rel.id}
              className={`draggable-card ${isCore ? 'core' : ''} ${rel.status} ${isDragging === rel.id ? 'dragging' : ''}`}
              style={{
                position: 'absolute',
                left: rel.position.x,
                top: rel.position.y,
                width: 320,
                minHeight: 180,
                zIndex: isDragging === rel.id ? 1000 : isCore ? 10 : 5,
                cursor: isDragging === rel.id ? 'grabbing' : 'grab'
              }}
              onMouseDown={(e) => handleMouseDown(e, rel.id)}
              onClick={() => !isDragging && handleTableClick(rel)}
            >
              <div className="card-header">
                {isCore ? (
                  <>
                    <h3>{serviceName}</h3>
                    <div className="record-type">services record</div>
                  </>
                ) : (
                  <h4>{rel.table}</h4>
                )}
                <div className="status-info">
                  <div 
                    className="status-dot"
                    style={{ backgroundColor: getStatusColor(rel.status) }}
                  ></div>
                  <span className="status-text">{getStatusText(rel.status)}</span>
                  {rel.recordCount !== undefined && (
                    <span className="record-count">({rel.recordCount})</span>
                  )}
                  {!isCore && rel.actionType !== 'disabled' && (
                    <span className="action-text">{getActionText(rel.actionType)}</span>
                  )}
                </div>
              </div>
              <div className="card-description">{rel.description}</div>
              {!isCore && <div className="relationship-type">{rel.relationship}</div>}
              {rel.relatedRecords && rel.relatedRecords.length > 0 && (
                <div className="related-records">
                  <div className="records-label">Related Records:</div>
                  <div className="records-list">
                    {rel.relatedRecords.map((record, idx) => (
                      <span key={idx} className="record-item">{record}</span>
                    ))}
                    {rel.recordCount && rel.recordCount > rel.relatedRecords.length && (
                      <span className="more-records">+{rel.recordCount - rel.relatedRecords.length} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}

export default ServiceSchema
