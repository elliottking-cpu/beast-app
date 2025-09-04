import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './EquipmentManagement.css'

interface Account {
  id: string
  account_type: 'DOMESTIC' | 'COMMERCIAL'
  billing_address: string
  billing_postcode: string
  billing_city?: string
  billing_county?: string
  payment_terms_days: number
  credit_limit?: number
  is_active: boolean
  created_at: string
  account_holder?: {
    id: string
    first_name: string
    last_name: string
    email?: string
    phone?: string
    mobile?: string
  }
}

interface Property {
  id: string
  address: string
  postcode: string
  city?: string
  county?: string
  property_type: string
  access_notes?: string
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

const ClientDetail: React.FC = () => {
  const { companyName, clientId } = useParams<{ companyName: string; clientId: string }>()
  const navigate = useNavigate()
  const [account, setAccount] = useState<Account | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active-work' | 'requests' | 'quotes' | 'jobs' | 'invoices'>('active-work')
  const [showPlaceholder, setShowPlaceholder] = useState<string | null>(null)

  useEffect(() => {
    if (clientId) {
      loadClientData()
    }
  }, [clientId])

  const loadClientData = async () => {
    try {
      setLoading(true)

      // Load account details
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select(`
          id,
          account_holder_id,
          account_type,
          billing_address,
          billing_postcode,
          billing_city,
          billing_county,
          payment_terms_days,
          credit_limit,
          is_active,
          created_at
        `)
        .eq('id', clientId)
        .single()

      if (accountError) {
        console.error('Error loading account:', accountError)
        return
      }

      // Load customer contact
      let accountHolder = null
      if (accountData.account_holder_id) {
        const { data: contactData, error: contactError } = await supabase
          .from('customer_contacts')
          .select('id, first_name, last_name, email, phone, mobile')
          .eq('id', accountData.account_holder_id)
          .single()

        if (contactError) {
          console.error('Error loading contact:', contactError)
        } else {
          accountHolder = contactData
        }
      }

      setAccount({
        ...accountData,
        account_holder: accountHolder
      })

      // Load properties for this account
      await loadProperties(clientId!)

    } catch (error) {
      console.error('Error loading client data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProperties = async (accountId: string) => {
    try {
      // Get properties for this account
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id,
          address,
          postcode,
          city,
          county,
          property_type,
          access_notes
        `)
        .eq('account_id', accountId)
        .eq('is_active', true)

      if (propertiesError) {
        console.error('Error loading properties:', propertiesError)
        return
      }

      if (!propertiesData || propertiesData.length === 0) {
        setProperties([])
        return
      }

      // Get tanks for these properties
      const propertyIds = propertiesData.map(p => p.id)
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
      }

      // Get tank types
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

      // Group tanks by property
      const tanksMap = (tanksData || []).reduce((map, tank) => {
        if (!map[tank.property_id]) {
          map[tank.property_id] = []
        }
        map[tank.property_id].push({
          ...tank,
          tank_type: tank.tank_type_id ? tankTypesMap[tank.tank_type_id] || null : null
        })
        return map
      }, {} as Record<string, Tank[]>)

      // Combine properties with their tanks
      const propertiesWithTanks = propertiesData.map(property => ({
        ...property,
        tanks: tanksMap[property.id] || []
      }))

      setProperties(propertiesWithTanks)

    } catch (error) {
      console.error('Error loading properties:', error)
    }
  }

  if (loading) {
    return (
      <div className="equipment-management">
        <div className="loading-state">Loading client details...</div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="equipment-management">
        <div className="error-state">Client not found</div>
      </div>
    )
  }

  const showPlaceholderModal = (feature: string) => {
    setShowPlaceholder(feature)
  }

  const closePlaceholderModal = () => {
    setShowPlaceholder(null)
  }

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header with breadcrumb */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
          <span 
            onClick={() => navigate(`/${companyName}/clients`)}
            style={{ cursor: 'pointer', color: '#3b82f6' }}
          >
            {companyName?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </span>
          <span>›</span>
          <span>{account?.account_holder ? `${account.account_holder.first_name} ${account.account_holder.last_name}` : 'Client'}</span>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
          {account?.account_holder ? `${account.account_holder.first_name} ${account.account_holder.last_name}` : 'Client Details'}
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Main Content */}
        <div>
          {/* Properties Section */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>Properties</h2>
              <button 
                onClick={() => showPlaceholderModal('Add Property')}
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
                + New Property
              </button>
            </div>
            
            {properties.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                No properties found
              </div>
            ) : (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                {properties.map((property, index) => (
                  <div 
                    key={property.id} 
                    onClick={() => navigate(`/${companyName}/properties/${property.id}`)}
                    style={{ 
                      padding: '1rem', 
                      borderBottom: index < properties.length - 1 ? '1px solid #e2e8f0' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation() // Prevent triggering the property navigation
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
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e5e7eb'
                        e.currentTarget.style.transform = 'scale(1.05)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                      title={`Open ${property.address} in Google Maps`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: '#1f2937' }}>{property.address}</div>
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        {property.city}, {property.county} {property.postcode}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        {property.tanks.length} tank{property.tanks.length !== 1 ? 's' : ''}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '500' }}>
                        Click to view details →
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contacts Section */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: '0 0 1rem 0' }}>Contacts</h2>
            
            {account?.account_holder ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div style={{ width: '40px', height: '40px', backgroundColor: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600' }}>
                  {account.account_holder.first_name.charAt(0)}{account.account_holder.last_name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', color: '#1f2937' }}>
                    {account.account_holder.first_name} {account.account_holder.last_name}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Primary Contact</div>
                  {account.account_holder.email && (
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{account.account_holder.email}</div>
                  )}
                  {account.account_holder.phone && (
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{account.account_holder.phone}</div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                No contacts found
              </div>
            )}
          </div>

          {/* Overview Section with Tabs */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>Overview</h2>
              <button 
                onClick={() => showPlaceholderModal('New Job/Quote')}
                style={{ 
                  backgroundColor: '#3b82f6', 
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
                {(['active-work', 'requests', 'quotes', 'jobs', 'invoices'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0.75rem 0',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: activeTab === tab ? '#3b82f6' : '#64748b',
                      borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
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
                  onClick={() => showPlaceholderModal('Job Scheduling System')}
                  style={{ 
                    padding: '1rem', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    backgroundColor: '#f8fafc'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%' }}></div>
                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>SCHEDULED FOR</span>
                  </div>
                  <div style={{ fontWeight: '500', color: '#1f2937' }}>Upcoming Service</div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {properties.length > 0 ? properties[0].address : 'No properties available'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
                    Click to set up job scheduling system
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <div onClick={() => showPlaceholderModal('Customer Request System')}>
                  No requests found. Click to set up customer request system.
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
                <div onClick={() => showPlaceholderModal('Job Management System')}>
                  No jobs found. Click to set up job management system.
                </div>
              </div>
            )}

            {activeTab === 'invoices' && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <div onClick={() => showPlaceholderModal('Invoice Management System')}>
                  No invoices found. Click to set up invoice management system.
                </div>
              </div>
            )}
          </div>

          {/* Schedule Section */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', marginTop: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>Schedule</h2>
              <button 
                onClick={() => showPlaceholderModal('Scheduling System')}
                style={{ 
                  backgroundColor: '#3b82f6', 
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ fontSize: '0.875rem', color: '#10b981' }}>confirmed by client</span>
                </div>
                <div style={{ fontWeight: '500', color: '#1f2937', margin: '0.5rem 0' }}>
                  Visit for sample job
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  {properties.length > 0 ? properties[0].address : 'Sample Address'}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Click to set up visit scheduling system
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937', margin: '0 0 0.5rem 0' }}>Recent Activity</h3>
              <div 
                onClick={() => showPlaceholderModal('Activity Tracking')}
                style={{ 
                  padding: '1rem', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  backgroundColor: '#f8fafc'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%' }}></div>
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Completed on: Sample Date</span>
                </div>
                <div style={{ fontWeight: '500', color: '#1f2937' }}>Sample completed service</div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  Click to set up activity tracking system
                </div>
              </div>
            </div>
          </div>

          {/* Recent Pricing Section */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', marginTop: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: '0 0 1rem 0' }}>Recent pricing for this property</h2>
            
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
                <div style={{ color: '#1f2937' }}>Septic Tank Emptying 5000L (Domestic)</div>
                <div style={{ color: '#64748b' }}>£245.00*</div>
                <div style={{ color: '#64748b' }}>-</div>
              </div>
            </div>
            
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
              * Click to set up pricing management system
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Contact Info Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', margin: '0 0 1rem 0' }}>Contact info</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Billing address</div>
              <div style={{ color: '#1f2937', lineHeight: '1.4' }}>
                {account?.billing_address}<br />
                {account?.billing_city}, {account?.billing_county}<br />
                {account?.billing_postcode}, United Kingdom
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Main</div>
              <div style={{ color: '#3b82f6' }}>{account?.account_holder?.phone || 'No phone'}</div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Main</div>
              <div style={{ color: '#3b82f6' }}>{account?.account_holder?.email || 'No email'}</div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Lead Source</div>
              <div 
                onClick={() => showPlaceholderModal('Lead Source Tracking')}
                style={{ color: '#10b981', cursor: 'pointer' }}
              >
                Add (Click to set up lead tracking)
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Ask for a review</div>
              <div 
                onClick={() => showPlaceholderModal('Review Request System')}
                style={{ cursor: 'pointer' }}
              >
                Yes (Click to set up review system)
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>QuickBooks online</div>
              <div 
                onClick={() => showPlaceholderModal('QuickBooks Integration')}
                style={{ color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                In sync 
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" />
                </svg>
              </div>
            </div>
          </div>

          {/* Tags Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>Tags</h3>
              <button 
                onClick={() => showPlaceholderModal('Tag Management')}
                style={{ 
                  backgroundColor: 'transparent', 
                  color: '#10b981', 
                  border: 'none', 
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                + New Tag
              </button>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>
              This client has no tags
            </div>
          </div>

          {/* Last Communication Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', margin: '0 0 1rem 0' }}>Last client communication</h3>
            
            <div 
              onClick={() => showPlaceholderModal('Communication Tracking')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                marginBottom: '1rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '4px',
                backgroundColor: '#f8fafc'
              }}
            >
              <div style={{ width: '24px', height: '24px', backgroundColor: '#e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Sent 04/09/2025</div>
                <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                  Scheduled visit reminder by {companyName?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => showPlaceholderModal('Communication System')}
                style={{ 
                  backgroundColor: 'transparent', 
                  color: '#10b981', 
                  border: 'none', 
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                View Communication
              </button>
              <button 
                onClick={() => showPlaceholderModal('Communication System')}
                style={{ 
                  backgroundColor: 'transparent', 
                  color: '#10b981', 
                  border: 'none', 
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                View All
              </button>
            </div>
          </div>

          {/* Billing History Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>Billing history</h3>
              <button 
                onClick={() => showPlaceholderModal('Billing System')}
                style={{ 
                  backgroundColor: 'transparent', 
                  color: '#10b981', 
                  border: 'none', 
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                New
              </button>
            </div>

            <div 
              onClick={() => showPlaceholderModal('Invoice Management')}
              style={{ 
                marginBottom: '1rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '4px',
                backgroundColor: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#f59e0b', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>09/09/2024</div>
                  <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>Payment for invoice #1505070</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '0.875rem', color: '#1f2937' }}>£245.00</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>Current balance</div>
              <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>£0.00</div>
            </div>
          </div>

          {/* Payment Methods Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', margin: '0 0 1rem 0' }}>Payment Methods</h3>
            
            <div 
              onClick={() => showPlaceholderModal('Payment Method Management')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '4px',
                backgroundColor: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#dc2626">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>•••• 3139</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Expiry 9/2025</div>
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '0.875rem', color: '#64748b' }}>Default</div>
            </div>
          </div>

          {/* Internal Notes Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', margin: '0 0 0.5rem 0' }}>Internal notes</h3>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
              Internal notes will only be seen by your team
            </div>
            
            <textarea 
              onClick={() => showPlaceholderModal('Internal Notes System')}
              placeholder="Note details"
              style={{ 
                width: '100%', 
                minHeight: '100px', 
                border: '1px solid #e2e8f0', 
                borderRadius: '6px', 
                padding: '0.75rem',
                fontSize: '0.875rem',
                resize: 'vertical',
                cursor: 'pointer',
                backgroundColor: '#f8fafc'
              }}
              readOnly
            />
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

export default ClientDetail
