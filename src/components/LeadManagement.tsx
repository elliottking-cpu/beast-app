import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './EquipmentManagement.css'

interface Lead {
  id: string
  client_name: string
  contact_name: string
  email?: string
  phone?: string
  property_address: string
  service_type: string
  lead_stage: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST'
  lead_source: string
  estimated_value?: number
  created_at: string
  last_activity: string
  assigned_to?: string
  notes?: string
}

interface BusinessUnit {
  id: string
  name: string
  business_unit_type_id: string
}

interface LeadMetrics {
  newLeads: number
  newLeadsChange: number
  conversionRate: number
  conversionRateChange: number
  totalLeads: number
}

const LeadManagement: React.FC = () => {
  const { companyName } = useParams<{ companyName: string }>()
  const [leads, setLeads] = useState<Lead[]>([])
  const [businessUnit, setBusinessUnit] = useState<BusinessUnit | null>(null)
  const [metrics, setMetrics] = useState<LeadMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStage, setFilterStage] = useState<string>('All')
  const [selectedStages, setSelectedStages] = useState<string[]>([])
  const [showPlaceholder, setShowPlaceholder] = useState<string | null>(null)

  // Lead stage counts for overview
  const [stageCounts, setStageCounts] = useState({
    new: 0,
    contacted: 0,
    qualified: 0,
    proposal: 0,
    won: 0,
    lost: 0
  })

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

      // For now, show sample data since lead management backend isn't implemented
      await loadSampleLeads()

      // Calculate sample metrics
      const leadMetrics: LeadMetrics = {
        newLeads: 23,
        newLeadsChange: 283,
        conversionRate: 28,
        conversionRateChange: -66,
        totalLeads: 1755
      }
      setMetrics(leadMetrics)

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSampleLeads = async () => {
    // Sample lead data to demonstrate the interface
    // This will be replaced with real backend integration
    const sampleLeads: Lead[] = [
      {
        id: '1',
        client_name: 'Andrew Gardiner',
        contact_name: 'Andrew Gardiner',
        email: 'aw.gardiner@hotmail.com',
        phone: '07932374868',
        property_address: '1a Love Lane, York, England YO24 1FE',
        service_type: 'Septic Tank Emptying',
        lead_stage: 'NEW',
        lead_source: 'Website Inquiry',
        estimated_value: 150,
        created_at: '2024-08-04T10:00:00Z',
        last_activity: '2024-08-04T10:00:00Z',
        assigned_to: 'Sales Team',
        notes: 'Quote for pump station maintenance or jetvac?'
      },
      {
        id: '2',
        client_name: 'Moira Wilkinson-Mudd',
        contact_name: 'Moira Wilkinson-Mudd',
        email: 'holbornfarm@hotmail.com',
        phone: '07725003350',
        property_address: 'Holborn Farm, York, YO42 4EF',
        service_type: 'Site Visit',
        lead_stage: 'CONTACTED',
        lead_source: 'Phone Inquiry',
        estimated_value: 75,
        created_at: '2024-08-06T14:30:00Z',
        last_activity: '2024-08-06T15:45:00Z',
        assigned_to: 'John Smith'
      },
      {
        id: '3',
        client_name: 'Isobel Burley',
        contact_name: 'Isobel Burley',
        email: 'isobel.burley@icloud.com',
        phone: '07776946185',
        property_address: 'Apple House 7 Middlewood Hall, Doncaster Road, Barnsley, England',
        service_type: 'New Tank Installation',
        lead_stage: 'QUALIFIED',
        lead_source: 'Referral',
        estimated_value: 2500,
        created_at: '2024-04-04T09:15:00Z',
        last_activity: '2024-04-05T11:20:00Z',
        assigned_to: 'Sarah Johnson'
      },
      {
        id: '4',
        client_name: 'William Strike Ltd',
        contact_name: 'Hunter',
        email: 'expenses@klondyke.co.uk',
        phone: '',
        property_address: 'Strikes Garden Centre, Leeds, England LS25 2AQ',
        service_type: 'Commercial Maintenance',
        lead_stage: 'PROPOSAL',
        lead_source: 'Cold Call',
        estimated_value: 1200,
        created_at: '2024-08-04T16:00:00Z',
        last_activity: '2024-08-05T10:30:00Z',
        assigned_to: 'Mike Wilson'
      },
      {
        id: '5',
        client_name: 'Suvannah Montpellier',
        contact_name: 'Suvannah Montpellier',
        email: 's.montpellier@gmail.com',
        phone: '07777746365',
        property_address: '2 Stockhill Cottages, York, England YO23 3PF',
        service_type: 'Emergency Service',
        lead_stage: 'WON',
        lead_source: 'Google Ads',
        estimated_value: 200,
        created_at: '2024-08-12T08:00:00Z',
        last_activity: '2024-08-12T14:00:00Z',
        assigned_to: 'Tom Brown'
      }
    ]

    setLeads(sampleLeads)

    // Calculate stage counts
    const counts = {
      new: sampleLeads.filter(l => l.lead_stage === 'NEW').length,
      contacted: sampleLeads.filter(l => l.lead_stage === 'CONTACTED').length,
      qualified: sampleLeads.filter(l => l.lead_stage === 'QUALIFIED').length,
      proposal: sampleLeads.filter(l => l.lead_stage === 'PROPOSAL').length,
      won: sampleLeads.filter(l => l.lead_stage === 'WON').length,
      lost: sampleLeads.filter(l => l.lead_stage === 'LOST').length
    }
    setStageCounts(counts)
  }

  const showPlaceholderModal = (feature: string) => {
    setShowPlaceholder(feature)
  }

  const closePlaceholderModal = () => {
    setShowPlaceholder(null)
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'NEW': return '#3b82f6'
      case 'CONTACTED': return '#8b5cf6'
      case 'QUALIFIED': return '#f59e0b'
      case 'PROPOSAL': return '#10b981'
      case 'WON': return '#059669'
      case 'LOST': return '#dc2626'
      default: return '#64748b'
    }
  }

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'NEW': return 'New'
      case 'CONTACTED': return 'Contacted'
      case 'QUALIFIED': return 'Qualified'
      case 'PROPOSAL': return 'Proposal Sent'
      case 'WON': return 'Won'
      case 'LOST': return 'Lost'
      default: return stage
    }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.property_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.service_type?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStage = filterStage === 'All' || lead.lead_stage === filterStage

    return matchesSearch && matchesStage
  })

  if (loading) {
    return (
      <div className="equipment-management">
        <div className="loading-state">Loading leads...</div>
      </div>
    )
  }

  if (!businessUnit) {
    return (
      <div className="equipment-management">
        <div className="error-state">Unable to load lead data</div>
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
            Leads
          </h1>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => showPlaceholderModal('New Lead Creation')}
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
            New Lead
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

      {/* Lead Stage Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {/* Overview Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>Overview</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></div>
              <span style={{ color: '#64748b' }}>New ({stageCounts.new})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8b5cf6' }}></div>
              <span style={{ color: '#64748b' }}>Contacted ({stageCounts.contacted})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div>
              <span style={{ color: '#64748b' }}>Qualified ({stageCounts.qualified})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
              <span style={{ color: '#64748b' }}>Proposal ({stageCounts.proposal})</span>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        {metrics && (
          <>
            {/* New leads */}
            <div 
              onClick={() => showPlaceholderModal('Lead Analytics Dashboard')}
              style={{ 
                backgroundColor: 'white', 
                borderRadius: '8px', 
                padding: '1.5rem', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}
            >
              <div style={{ flex: 1 }}>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>

            {/* Conversion rate */}
            <div 
              onClick={() => showPlaceholderModal('Conversion Rate Analytics')}
              style={{ 
                backgroundColor: 'white', 
                borderRadius: '8px', 
                padding: '1.5rem', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Conversion rate</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>Past 30 days</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>{metrics.conversionRate}%</div>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: '#dc2626', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.25rem' 
                  }}>
                    ↓ {metrics.conversionRateChange}%
                  </div>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>

            {/* Promotional Card */}
            <div 
              onClick={() => showPlaceholderModal('Lead Management Analytics')}
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
          </>
        )}
      </div>

      {/* Filters Section */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              All leads ({filteredLeads.length.toLocaleString()} results)
            </h3>
          </div>
          
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search leads..."
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Stage</span>
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.875rem',
                backgroundColor: 'white'
              }}
            >
              <option value="All">All</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="PROPOSAL">Proposal</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </select>
          </div>

          <div style={{ 
            backgroundColor: '#e2e8f0', 
            borderRadius: '20px', 
            padding: '0.25rem 0.75rem', 
            fontSize: '0.875rem',
            color: '#64748b'
          }}>
            All
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>
                <input type="checkbox" style={{ marginRight: '0.5rem' }} />
                Client
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>
                Service Type
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>
                Property
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>
                Contact
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>
                Created
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>
                Stage
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  {searchTerm ? 'No leads match your search criteria' : 'No leads found - Lead management system needs to be implemented'}
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead, index) => (
                <tr 
                  key={lead.id}
                  onClick={() => showPlaceholderModal('Lead Detail Management')}
                  style={{ 
                    cursor: 'pointer',
                    borderBottom: index < filteredLeads.length - 1 ? '1px solid #f1f5f9' : 'none'
                  }}
                  className="clickable-row"
                >
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input type="checkbox" onClick={(e) => e.stopPropagation()} />
                      <div>
                        <div style={{ fontWeight: '500', color: '#1f2937' }}>
                          {lead.client_name}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {lead.contact_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                      {lead.service_type}
                    </div>
                    {lead.estimated_value && (
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        Est. £{lead.estimated_value}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#1f2937', maxWidth: '200px' }}>
                      {lead.property_address}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                      {lead.phone}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      {lead.email}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      {new Date(lead.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: getStageColor(lead.lead_stage)
                      }}></div>
                      <span style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                        {getStageLabel(lead.lead_stage)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Backend Implementation Notice */}
      <div style={{ 
        backgroundColor: '#fef3c7', 
        border: '1px solid #f59e0b', 
        borderRadius: '8px', 
        padding: '1rem', 
        marginTop: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
          <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '0.25rem' }}>
            Backend Implementation Required
          </div>
          <div style={{ fontSize: '0.875rem', color: '#92400e', lineHeight: '1.4' }}>
            Lead management system requires backend implementation including: leads table, lead stages, lead sources, 
            lead assignments, lead activities, conversion tracking, and integration with customer/property data.
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
              This feature requires backend implementation for lead management system including lead tracking, 
              stage management, conversion analytics, and integration with your existing customer and property data.
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

export default LeadManagement
