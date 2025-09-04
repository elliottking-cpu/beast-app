import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './EquipmentManagement.css'

interface Property {
  id: string
  address: string
  postcode: string
  city?: string
  county?: string
  property_type: 'DOMESTIC' | 'COMMERCIAL'
  access_notes?: string
  is_active: boolean
  created_at: string
  account?: {
    account_type: string
    account_holder?: {
      first_name: string
      last_name: string
      email?: string
      phone?: string
    }
  }
  tanks?: Tank[]
}

interface Tank {
  id: string
  tank_name?: string
  capacity_litres?: number
  installation_date?: string
  last_service_date?: string
  next_service_date?: string
  tank_type?: {
    name: string
  }
}

interface BusinessUnit {
  id: string
  name: string
  business_unit_type_id: string
}

const PropertyManagement: React.FC = () => {
  const { companyName } = useParams<{ companyName: string }>()
  const [properties, setProperties] = useState<Property[]>([])
  const [businessUnit, setBusinessUnit] = useState<BusinessUnit | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'DOMESTIC' | 'COMMERCIAL'>('ALL')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [companyName])

  const loadData = async () => {
    try {
      setLoading(true)

      // Convert company name from URL format to proper case
      const businessUnitName = companyName
        ?.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')

      // Get business unit
      const { data: businessUnitData, error: businessUnitError } = await supabase
        .from('business_units')
        .select('id, name, business_unit_type_id')
        .eq('name', businessUnitName)
        .single()

      if (businessUnitError) {
        console.error('Error loading business unit:', businessUnitError)
        return
      }

      setBusinessUnit(businessUnitData)

      // Load properties based on business unit type
      await loadProperties(businessUnitData)

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProperties = async (businessUnit: BusinessUnit) => {
    try {
      // Check if this is a group management business unit
      const { data: businessUnitType } = await supabase
        .from('business_unit_types')
        .select('name')
        .eq('id', businessUnit.business_unit_type_id)
        .single()

      let propertiesQuery = supabase
        .from('properties')
        .select(`
          id,
          account_id,
          address,
          postcode,
          city,
          county,
          property_type,
          access_notes,
          is_active,
          created_at
        `)
        .eq('is_active', true)

      // If this is a regional business unit, filter by this business unit
      if (businessUnitType?.name === 'REGIONAL_SERVICE') {
        propertiesQuery = propertiesQuery.eq('business_unit_id', businessUnit.id)
      } else {
        // For group management, get all properties from child business units
        const { data: childUnits } = await supabase
          .from('business_units')
          .select('id')
          .eq('parent_business_unit_id', businessUnit.id)

        const childUnitIds = childUnits?.map(unit => unit.id) || []
        
        if (childUnitIds.length > 0) {
          propertiesQuery = propertiesQuery.in('business_unit_id', childUnitIds)
        } else {
          // No child units yet
          setProperties([])
          return
        }
      }

      const { data: propertiesData, error: propertiesError } = await propertiesQuery

      if (propertiesError) {
        console.error('Error loading properties:', propertiesError)
        return
      }

      if (!propertiesData || propertiesData.length === 0) {
        setProperties([])
        return
      }

      // Get unique account IDs
      const accountIds = [...new Set(propertiesData.map(p => p.account_id).filter(Boolean))]
      
      // Fetch accounts and customer contacts
      let accountsMap: Record<string, any> = {}
      if (accountIds.length > 0) {
        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select('id, account_type, account_holder_id')
          .in('id', accountIds)

        if (accountsError) {
          console.error('Error loading accounts:', accountsError)
        } else if (accountsData) {
          // Get customer contacts
          const contactIds = [...new Set(accountsData.map(a => a.account_holder_id).filter(Boolean))]
          let contactsMap: Record<string, any> = {}
          
          if (contactIds.length > 0) {
            const { data: contactsData, error: contactsError } = await supabase
              .from('customer_contacts')
              .select('id, first_name, last_name, email, phone')
              .in('id', contactIds)

            if (contactsError) {
              console.error('Error loading contacts:', contactsError)
            } else if (contactsData) {
              contactsMap = contactsData.reduce((map, contact) => {
                map[contact.id] = contact
                return map
              }, {} as Record<string, any>)
            }
          }

          // Create accounts map with contact info
          accountsMap = accountsData.reduce((map, account) => {
            map[account.id] = {
              account_type: account.account_type,
              account_holder: account.account_holder_id ? contactsMap[account.account_holder_id] || null : null
            }
            return map
          }, {} as Record<string, any>)
        }
      }

      // Get tanks for these properties
      const propertyIds = propertiesData.map(p => p.id)
      let tanksMap: Record<string, any[]> = {}
      
      if (propertyIds.length > 0) {
        const { data: tanksData, error: tanksError } = await supabase
          .from('tanks')
          .select(`
            id,
            property_id,
            tank_name,
            capacity_litres,
            installation_date,
            last_service_date,
            next_service_date,
            tank_type_id
          `)
          .in('property_id', propertyIds)
          .eq('is_active', true)

        if (tanksError) {
          console.error('Error loading tanks:', tanksError)
        } else if (tanksData) {
          // Get tank types
          const tankTypeIds = [...new Set(tanksData.map(t => t.tank_type_id).filter(Boolean))]
          let tankTypesMap: Record<string, any> = {}
          
          if (tankTypeIds.length > 0) {
            const { data: tankTypesData, error: tankTypesError } = await supabase
              .from('tank_types')
              .select('id, name')
              .in('id', tankTypeIds)

            if (tankTypesError) {
              console.error('Error loading tank types:', tankTypesError)
            } else if (tankTypesData) {
              tankTypesMap = tankTypesData.reduce((map, type) => {
                map[type.id] = type
                return map
              }, {} as Record<string, any>)
            }
          }

          // Group tanks by property
          tanksMap = tanksData.reduce((map, tank) => {
            if (!map[tank.property_id]) {
              map[tank.property_id] = []
            }
            map[tank.property_id].push({
              ...tank,
              tank_type: tank.tank_type_id ? tankTypesMap[tank.tank_type_id] || null : null
            })
            return map
          }, {} as Record<string, any[]>)
        }
      }

      // Transform the data to match our interface
      const transformedProperties = propertiesData.map(property => ({
        ...property,
        account: property.account_id ? accountsMap[property.account_id] || null : null,
        tanks: tanksMap[property.id] || []
      }))

      setProperties(transformedProperties)

    } catch (error) {
      console.error('Error loading properties:', error)
    }
  }

  const filteredProperties = properties.filter(property => {
    const matchesSearch = 
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.postcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.county?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.account?.account_holder?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.account?.account_holder?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterType === 'ALL' || property.property_type === filterType

    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="equipment-management">
        <div className="equipment-header">
          <h1>Property Management</h1>
          <p>Loading properties...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="equipment-management">
      <div className="equipment-header">
        <div className="equipment-header-content">
          <div className="equipment-title-section">
            <h1>Property Management</h1>
            <p>Manage service locations and tank installations</p>
          </div>
          <button 
            className="equipment-add-btn"
            onClick={() => setShowAddModal(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18" />
              <path d="M5 21V7l8-4v18" />
              <path d="M19 21V11l-6-4" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Add Property
          </button>
        </div>
      </div>

      <div className="equipment-controls">
        <div className="equipment-search">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="equipment-filters">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'ALL' | 'DOMESTIC' | 'COMMERCIAL')}
            className="filter-select"
          >
            <option value="ALL">All Types</option>
            <option value="DOMESTIC">Domestic</option>
            <option value="COMMERCIAL">Commercial</option>
          </select>
        </div>
      </div>

      <div className="equipment-stats">
        <div className="stat-card">
          <div className="stat-number">{properties.length}</div>
          <div className="stat-label">Total Properties</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{properties.filter(p => p.property_type === 'DOMESTIC').length}</div>
          <div className="stat-label">Domestic</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{properties.filter(p => p.property_type === 'COMMERCIAL').length}</div>
          <div className="stat-label">Commercial</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{properties.reduce((sum, p) => sum + (p.tanks?.length || 0), 0)}</div>
          <div className="stat-label">Total Tanks</div>
        </div>
      </div>

      <div className="equipment-table-container">
        <table className="equipment-table">
          <thead>
            <tr>
              <th>Address</th>
              <th>Type</th>
              <th>Client</th>
              <th>Tanks</th>
              <th>Next Service</th>
              <th>Access Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProperties.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-data">
                  {searchTerm || filterType !== 'ALL' ? 'No properties match your search criteria' : 'No properties found'}
                </td>
              </tr>
            ) : (
              filteredProperties.map((property) => (
                <tr
                  key={property.id}
                  onClick={() => window.location.href = `/${companyName}/properties/${property.id}`}
                  style={{ cursor: 'pointer' }}
                  className="clickable-row"
                >
                  <td>
                    <div className="equipment-name">
                      <div>{property.address}</div>
                      <div className="equipment-model">{property.postcode} {property.city}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${property.property_type.toLowerCase()}`}>
                      {property.property_type}
                    </span>
                  </td>
                  <td>
                    <div className="contact-info">
                      {property.account?.account_holder ? (
                        <>
                          <div>{property.account.account_holder.first_name} {property.account.account_holder.last_name}</div>
                          {property.account.account_holder.email && (
                            <div className="equipment-model">{property.account.account_holder.email}</div>
                          )}
                        </>
                      ) : (
                        'No Client'
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="tank-info">
                      {property.tanks && property.tanks.length > 0 ? (
                        <>
                          <div>{property.tanks.length} tank{property.tanks.length !== 1 ? 's' : ''}</div>
                          <div className="equipment-model">
                            {property.tanks.map(tank => tank.tank_type?.name).filter(Boolean).join(', ')}
                          </div>
                        </>
                      ) : (
                        'No tanks'
                      )}
                    </div>
                  </td>
                  <td>
                    {property.tanks && property.tanks.length > 0 ? (
                      <div>
                        {property.tanks
                          .filter(tank => tank.next_service_date)
                          .sort((a, b) => new Date(a.next_service_date!).getTime() - new Date(b.next_service_date!).getTime())
                          .slice(0, 1)
                          .map(tank => (
                            <div key={tank.id}>
                              {new Date(tank.next_service_date!).toLocaleDateString()}
                            </div>
                          ))
                        }
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>
                    <div className="access-notes">
                      {property.access_notes || 'None'}
                    </div>
                  </td>
                  <td>
                    <div className="equipment-actions">
                      <span className="view-indicator">Click to manage →</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="equipment-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="equipment-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="equipment-modal-header">
              <h2>Add New Property</h2>
              <button 
                className="equipment-modal-close"
                onClick={() => setShowAddModal(false)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="equipment-modal-body">
              <p>Add Property functionality will be implemented here.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PropertyManagement
