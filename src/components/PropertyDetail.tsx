import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './EquipmentManagement.css'

interface Property {
  id: string
  address: string
  postcode: string
  city?: string
  county?: string
  property_type: string
  access_notes?: string
  account_id?: string
  account?: {
    account_type: string
    account_holder?: {
      first_name: string
      last_name: string
      email?: string
      phone?: string
    }
  }
  tanks: Tank[]
}

interface Tank {
  id: string
  tank_name: string
  capacity_litres: number
  installation_date: string
  last_service_date?: string
  next_service_date?: string
  tank_type?: {
    name: string
  }
}

const PropertyDetail: React.FC = () => {
  const { companyName, propertyId } = useParams<{ companyName: string; propertyId: string }>()
  const navigate = useNavigate()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active-work' | 'requests' | 'quotes' | 'jobs'>('active-work')
  const [showPlaceholder, setShowPlaceholder] = useState<string | null>(null)

  useEffect(() => {
    if (propertyId) {
      loadPropertyData()
    }
  }, [propertyId])

  const loadPropertyData = async () => {
    try {
      setLoading(true)

      // Load property details
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select(`
          id,
          address,
          postcode,
          city,
          county,
          property_type,
          access_notes,
          account_id
        `)
        .eq('id', propertyId)
        .single()

      if (propertyError) {
        console.error('Error loading property:', propertyError)
        return
      }

      // Load account and customer contact if available
      let accountData = null
      if (propertyData.account_id) {
        const { data: account, error: accountError } = await supabase
          .from('accounts')
          .select(`
            account_type,
            account_holder_id
          `)
          .eq('id', propertyData.account_id)
          .single()

        if (accountError) {
          console.error('Error loading account:', accountError)
        } else if (account) {
          // Load customer contact
          let accountHolder = null
          if (account.account_holder_id) {
            const { data: contact, error: contactError } = await supabase
              .from('customer_contacts')
              .select('first_name, last_name, email, phone')
              .eq('id', account.account_holder_id)
              .single()

            if (contactError) {
              console.error('Error loading contact:', contactError)
            } else {
              accountHolder = contact
            }
          }

          accountData = {
            account_type: account.account_type,
            account_holder: accountHolder
          }
        }
      }

      // Load tanks for this property
      const { data: tanksData, error: tanksError } = await supabase
        .from('tanks')
        .select(`
          id,
          tank_name,
          capacity_litres,
          installation_date,
          last_service_date,
          next_service_date,
          tank_type_id
        `)
        .eq('property_id', propertyId)
        .eq('is_active', true)

      if (tanksError) {
        console.error('Error loading tanks:', tanksError)
      }

      // Load tank types
      let tankTypesMap: Record<string, any> = {}
      if (tanksData && tanksData.length > 0) {
        const tankTypeIds = [...new Set(tanksData.map(t => t.tank_type_id).filter(Boolean))]
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
      }

      // Combine tanks with their types
      const tanksWithTypes = (tanksData || []).map(tank => ({
        ...tank,
        tank_type: tank.tank_type_id ? tankTypesMap[tank.tank_type_id] || null : null
      }))

      setProperty({
        ...propertyData,
        account: accountData,
        tanks: tanksWithTypes
      })

    } catch (error) {
      console.error('Error loading property data:', error)
    } finally {
      setLoading(false)
    }
  }

  const showPlaceholderModal = (feature: string) => {
    setShowPlaceholder(feature)
  }

  const closePlaceholderModal = () => {
    setShowPlaceholder(null)
  }

  if (loading) {
    return (
      <div className="equipment-management">
        <div className="loading-state">Loading property details...</div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="equipment-management">
        <div className="error-state">Property not found</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header with breadcrumb */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
          <span 
            onClick={() => navigate(`/${companyName}/properties`)}
            style={{ cursor: 'pointer', color: '#3b82f6' }}
          >
            {companyName?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </span>
          <span>›</span>
          <span>Property Details</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
            Property Details
          </h1>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={() => {
                const searchQuery = encodeURIComponent(`${property.address}, ${property.postcode}`)
                window.open(`https://www.google.com/maps/search/${searchQuery}`, '_blank')
              }}
              style={{ 
                backgroundColor: '#10b981', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                padding: '0.75rem 1rem', 
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Show on Map
            </button>
            <button 
              onClick={() => showPlaceholderModal('Property Editing')}
              style={{ 
                backgroundColor: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                padding: '0.75rem 1rem', 
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button 
              onClick={() => showPlaceholderModal('More Actions Menu')}
              style={{ 
                backgroundColor: 'white', 
                color: '#64748b', 
                border: '1px solid #e2e8f0', 
                borderRadius: '6px', 
                padding: '0.75rem 1rem', 
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
              More Actions
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Left Sidebar */}
        <div>
          {/* Location Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: '0 0 1rem 0' }}>Location</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Client</div>
              <div style={{ color: '#1f2937' }}>
                {property.account?.account_holder ? 
                  `${property.account.account_holder.first_name} ${property.account.account_holder.last_name}` : 
                  'No client assigned'
                }
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button
                onClick={() => {
                  const searchQuery = encodeURIComponent(`${property.address}, ${property.postcode}`)
                  window.open(`https://www.google.com/maps/search/${searchQuery}`, '_blank')
                }}
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  backgroundColor: '#f3f4f6', 
                  borderRadius: '4px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '0.25rem'
                }}
                title="Open in Google Maps"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </button>
              <div>
                <div style={{ fontWeight: '500', color: '#1f2937' }}>{property.address}</div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  {property.city}, {property.county} {property.postcode}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Restricted Access?</span>
                <span style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                  {property.access_notes ? 'Yes' : 'No'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Blacklisted</span>
                <span style={{ fontSize: '0.875rem', color: '#1f2937' }}>No</span>
              </div>
              <div 
                onClick={() => showPlaceholderModal('QuickBooks Integration')}
                style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>QuickBooks</span>
                <span style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  In sync 
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          {/* Recent Pricing Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: '0 0 1rem 0' }}>Recent pricing for this property</h3>
            
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>
                <div>Line Item</div>
                <div>Quoted</div>
                <div>Job</div>
              </div>
              <div 
                onClick={() => showPlaceholderModal('Pricing Management')}
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr auto auto', 
                  gap: '1rem', 
                  padding: '1rem', 
                  cursor: 'pointer',
                  backgroundColor: '#f8fafc'
                }}
              >
                <div style={{ color: '#1f2937' }}>
                  Septic Tank Emptying {property.tanks.length > 0 ? `${property.tanks[0].capacity_litres}L` : '5000L'} ({property.property_type})
                </div>
                <div style={{ color: '#64748b' }}>£245.00*</div>
                <div style={{ color: '#64748b' }}>-</div>
              </div>
            </div>
            
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
              * Click to set up pricing management system
            </div>
          </div>

          {/* Tax Rate Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: '0 0 1rem 0' }}>Tax rate</h3>
            <div 
              onClick={() => showPlaceholderModal('Tax Rate Management')}
              style={{ fontSize: '0.875rem', color: '#64748b', cursor: 'pointer' }}
            >
              VAT (20.0%) (Default)
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div>
          {/* Overview Section with Tabs */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>Overview</h2>
              <button 
                onClick={() => showPlaceholderModal('New Job/Quote')}
                style={{ 
                  backgroundColor: '#10b981', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                New
              </button>
            </div>

            {/* Tab Navigation */}
            <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '2rem' }}>
                {(['active-work', 'requests', 'quotes', 'jobs'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0.75rem 0',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: activeTab === tab ? '#10b981' : '#64748b',
                      borderBottom: activeTab === tab ? '2px solid #10b981' : '2px solid transparent',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {tab.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'active-work' && (
              <div>
                <div 
                  onClick={() => showPlaceholderModal('Job Management System')}
                  style={{ 
                    padding: '1rem', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    backgroundColor: '#f8fafc',
                    marginBottom: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: '500', color: '#1f2937' }}>Job #17145</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>£245.00</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%' }}></div>
                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Upcoming</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    SCHEDULED FOR<br />
                    05/09/2025
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
                    Click to set up job management system
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <div onClick={() => showPlaceholderModal('Request Management System')}>
                  No requests found. Click to set up request management system.
                </div>
              </div>
            )}

            {activeTab === 'quotes' && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <div onClick={() => showPlaceholderModal('Quote Management System')}>
                  No quotes found. Click to set up quote management system.
                </div>
              </div>
            )}

            {activeTab === 'jobs' && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <div onClick={() => showPlaceholderModal('Job History System')}>
                  No jobs found. Click to set up job history system.
                </div>
              </div>
            )}
          </div>

          {/* Schedule Section */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>Schedule</h2>
              <button 
                onClick={() => showPlaceholderModal('Scheduling System')}
                style={{ 
                  backgroundColor: '#10b981', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                New
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937', margin: '0 0 0.5rem 0' }}>Tomorrow</h3>
              <div 
                onClick={() => showPlaceholderModal('Visit Scheduling')}
                style={{ 
                  padding: '1rem', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  backgroundColor: '#f8fafc'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ fontSize: '0.875rem', color: '#10b981' }}>confirmed by client From 2024</span>
                </div>
                <div style={{ fontWeight: '500', color: '#1f2937', marginBottom: '0.25rem' }}>
                  Visit for job #17145
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
                  re: {property.account?.account_holder ? 
                    `${property.account.account_holder.first_name} ${property.account.account_holder.last_name}` : 
                    'Property Owner'
                  }
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  05/09/2025 14:30<br />
                  Assigned to Jet Vac 16,000L
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937', margin: '0 0 0.5rem 0' }}>Completed September</h3>
              
              <div 
                onClick={() => showPlaceholderModal('Job History')}
                style={{ 
                  padding: '1rem', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  backgroundColor: '#f8fafc',
                  marginBottom: '1rem'
                }}
              >
                <div style={{ fontWeight: '500', color: '#64748b', marginBottom: '0.25rem' }}>
                  Invoice reminder for job #17082
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
                  re: {property.account?.account_holder ? 
                    `${property.account.account_holder.first_name} ${property.account.account_holder.last_name}` : 
                    'Property Owner'
                  }
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  Job was completed on 09/09/2024, but no invoice has been created yet.
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Completed on: 09/09/2024 10:43<br />
                  Completed by Olivia King
                </div>
              </div>

              <div 
                onClick={() => showPlaceholderModal('Job History')}
                style={{ 
                  padding: '1rem', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  backgroundColor: '#f8fafc'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ fontSize: '0.875rem', color: '#10b981' }}>confirmed by client Call 10 mins before arrival</span>
                </div>
                <div style={{ fontWeight: '500', color: '#1f2937', marginBottom: '0.25rem' }}>
                  Visit for job #17082
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
                  re: {property.account?.account_holder ? 
                    `${property.account.account_holder.first_name} ${property.account.account_holder.last_name}` : 
                    'Property Owner'
                  }
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  Completed on: 06/09/2024 12:45<br />
                  Completed by Jet Vac 16,000L
                </div>
              </div>
            </div>
          </div>

          {/* Contacts Section */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: '0 0 1rem 0' }}>Contacts</h2>
            
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>
                <div>Name</div>
                <div>Role</div>
                <div>Phone</div>
                <div>Email</div>
              </div>
              
              {property.account?.account_holder ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '1rem', padding: '1rem' }}>
                  <div style={{ color: '#1f2937' }}>
                    {property.account.account_holder.first_name} {property.account.account_holder.last_name}
                  </div>
                  <div style={{ color: '#64748b' }}>Primary Contact</div>
                  <div style={{ color: '#64748b' }}>
                    {property.account.account_holder.phone || '-'}
                  </div>
                  <div style={{ color: '#64748b' }}>
                    {property.account.account_holder.email || '-'}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  No contacts found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder Modal */}
      {showPlaceholder && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            padding: '2rem', 
            maxWidth: '500px', 
            width: '90%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>Feature Coming Soon</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>{showPlaceholder}</p>
              </div>
            </div>
            
            <p style={{ color: '#64748b', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              This feature is not yet implemented. It will be available in a future update and will integrate with your existing backend data and business workflows.
            </p>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={closePlaceholderModal}
                style={{ 
                  backgroundColor: '#3b82f6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  padding: '0.75rem 1.5rem', 
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PropertyDetail
