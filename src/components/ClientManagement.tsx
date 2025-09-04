import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
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
    first_name: string
    last_name: string
    email?: string
    phone?: string
    mobile?: string
  }
}

interface BusinessUnit {
  id: string
  name: string
  business_unit_type_id: string
}

interface ClientMetrics {
  newLeads: number
  newLeadsChange: number
  newClients: number
  newClientsChange: number
  totalNewClients: number
}

const ClientManagement: React.FC = () => {
  const { companyName } = useParams<{ companyName: string }>()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [businessUnit, setBusinessUnit] = useState<BusinessUnit | null>(null)
  const [metrics, setMetrics] = useState<ClientMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('Leads and Active')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showPlaceholder, setShowPlaceholder] = useState<string | null>(null)

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

      // Load business unit
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

      // Load accounts based on business unit type
      await loadAccounts(businessUnitData)

      // Calculate metrics (sample data for now)
      const clientMetrics: ClientMetrics = {
        newLeads: 86,
        newLeadsChange: 5,
        newClients: 63,
        newClientsChange: 19,
        totalNewClients: 461
      }
      setMetrics(clientMetrics)

    } catch (error) {
      console.error('Error loading data:', error)
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

  const loadAccounts = async (businessUnit: BusinessUnit) => {
    try {
      // Check if this is a group management business unit
      const { data: businessUnitType } = await supabase
        .from('business_unit_types')
        .select('name')
        .eq('id', businessUnit.business_unit_type_id)
        .single()

      let accountsQuery = supabase
        .from('accounts')
        .select('id, account_type, billing_address, billing_postcode, billing_city, billing_county, payment_terms_days, credit_limit, is_active, created_at, account_holder_id')

      if (businessUnitType?.name === 'GROUP_MANAGEMENT') {
        // For group management, get all accounts from child business units
        const { data: childUnits } = await supabase
          .from('business_units')
          .select('id')
          .eq('parent_business_unit_id', businessUnit.id)

        if (childUnits && childUnits.length > 0) {
          const childUnitIds = childUnits.map(unit => unit.id)
          
          // Get properties from child business units
          const { data: properties } = await supabase
            .from('properties')
            .select('account_id')
            .in('business_unit_id', childUnitIds)

          if (properties && properties.length > 0) {
            const accountIds = [...new Set(properties.map(p => p.account_id).filter(Boolean))]
            accountsQuery = accountsQuery.in('id', accountIds)
          } else {
            setAccounts([])
            return
          }
        } else {
          setAccounts([])
          return
        }
      } else {
        // For regional business units, get accounts through properties
        const { data: properties } = await supabase
          .from('properties')
          .select('account_id')
          .eq('business_unit_id', businessUnit.id)

        if (properties && properties.length > 0) {
          const accountIds = [...new Set(properties.map(p => p.account_id).filter(Boolean))]
          accountsQuery = accountsQuery.in('id', accountIds)
        } else {
          setAccounts([])
          return
        }
      }

      const { data: accountsData, error: accountsError } = await accountsQuery

      if (accountsError) {
        console.error('Error loading accounts:', accountsError)
        return
      }

      if (!accountsData || accountsData.length === 0) {
        setAccounts([])
        return
      }

      // Get customer contacts for these accounts
      const accountHolderIds = accountsData.map(account => account.account_holder_id).filter(Boolean)
      
      let customerContacts: any[] = []
      if (accountHolderIds.length > 0) {
        const { data: contactsData, error: contactsError } = await supabase
          .from('customer_contacts')
          .select('id, first_name, last_name, email, phone, mobile')
          .in('id', accountHolderIds)

        if (contactsError) {
          console.error('Error loading customer contacts:', contactsError)
        } else {
          customerContacts = contactsData || []
        }
      }

      // Create a map of contacts by ID
      const contactsMap = customerContacts.reduce((map, contact) => {
        map[contact.id] = contact
        return map
      }, {} as Record<string, any>)

      // Combine accounts with their contact information
      const transformedAccounts = accountsData.map(account => ({
        ...account,
        account_holder: account.account_holder_id ? contactsMap[account.account_holder_id] || null : null
      }))

      setAccounts(transformedAccounts)

    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = 
      account.account_holder?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_holder?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_holder?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.billing_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.billing_postcode.toLowerCase().includes(searchTerm.toLowerCase())

    // For now, show all accounts regardless of status filter
    // This will be enhanced when we implement proper status tracking
    const matchesStatus = true

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="equipment-management">
        <div className="loading-state">Loading clients...</div>
      </div>
    )
  }

  if (!businessUnit) {
    return (
      <div className="equipment-management">
        <div className="error-state">Unable to load client data</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
            {businessUnit?.name}
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
            Clients
          </h1>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => showPlaceholderModal('New Client Creation')}
            style={{ 
              backgroundColor: '#10b981', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              padding: '0.75rem 1rem', 
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            New Client
          </button>
          <button 
            onClick={() => showPlaceholderModal('More Actions Menu')}
            style={{ 
              backgroundColor: 'white', 
              color: '#64748b', 
              border: '1px solid #e5e7eb', 
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

      {/* Metrics Cards */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* New leads */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>New leads</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>Past 30 days</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>{metrics.newLeads}</div>
              <div style={{ 
                fontSize: '0.875rem', 
                color: '#10b981', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.25rem' 
              }}>
                ↗ {metrics.newLeadsChange}%
              </div>
            </div>
          </div>

          {/* New clients */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>New clients</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>Past 30 days</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>{metrics.newClients}</div>
              <div style={{ 
                fontSize: '0.875rem', 
                color: '#10b981', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.25rem' 
              }}>
                ↗ {metrics.newClientsChange}%
              </div>
            </div>
          </div>

          {/* Total new clients */}
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Total new clients</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>Year to date</div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>{metrics.totalNewClients}</div>
          </div>

          {/* Promotional Card */}
          <div 
            onClick={() => showPlaceholderModal('Business Growth Analytics')}
            style={{ 
              backgroundColor: '#f8fafc', 
              borderRadius: '8px', 
              padding: '1.5rem', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>You've come a long way!</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem', lineHeight: '1.4' }}>
              Want to dig into your business growth and changes over the last year?
            </div>
            <div style={{ fontSize: '0.875rem', color: '#3b82f6', fontWeight: '500' }}>
              Learn more with ⚡ Copilot
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              Filtered clients ({filteredAccounts.length.toLocaleString()} results)
            </h3>
          </div>
          
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '0.5rem 2.5rem 0.5rem 1rem',
                fontSize: '0.875rem',
                width: '300px'
              }}
            />
            <svg 
              style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => showPlaceholderModal('Tag Filtering System')}
            style={{ 
              backgroundColor: '#f3f4f6', 
              border: '1px solid #e5e7eb', 
              borderRadius: '20px', 
              padding: '0.25rem 0.75rem', 
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            Filter by tag
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <div style={{ 
            backgroundColor: '#e2e8f0', 
            borderRadius: '20px', 
            padding: '0.25rem 0.75rem', 
            fontSize: '0.875rem',
            color: '#64748b'
          }}>
            Status | {filterStatus}
          </div>
        </div>
      </div>

      {/* Client Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>
                <input type="checkbox" style={{ marginRight: '0.5rem' }} />
                Name
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>
                Address
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>
                Tags
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>
                Status
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>
                Last Activity
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  {searchTerm ? 'No clients match your search criteria' : 'No clients found'}
                </td>
              </tr>
            ) : (
              filteredAccounts.map((account, index) => (
                <tr 
                  key={account.id}
                  onClick={() => window.location.href = `/${companyName}/clients/${account.id}`}
                  style={{ 
                    cursor: 'pointer',
                    borderBottom: index < filteredAccounts.length - 1 ? '1px solid #f1f5f9' : 'none'
                  }}
                  className="clickable-row"
                >
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input type="checkbox" onClick={(e) => e.stopPropagation()} />
                      <div>
                        <div style={{ fontWeight: '500', color: '#1f2937' }}>
                          {account.account_holder ?
                            `${account.account_holder.first_name} ${account.account_holder.last_name}` :
                            'No Contact'
                          }
                        </div>
                        {account.account_holder?.email && (
                          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                            {account.account_holder.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                      {account.billing_address}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      {account.billing_city}, {account.billing_county} {account.billing_postcode}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      {/* Tags will be implemented later */}
                      -
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: account.is_active ? '#10b981' : '#64748b' 
                      }}></div>
                      <span style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      {new Date(account.created_at).toLocaleTimeString('en-GB', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

export default ClientManagement
