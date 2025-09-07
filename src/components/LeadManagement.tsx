import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './LeadManagement.css'

interface Lead {
  id: string
  company_name: string
  contact_name: string
  contact_email: string
  contact_phone: string
  lead_source: string
  lead_status: string
  priority: string
  estimated_value: number
  service_type: string
  address: string
  postcode: string
  notes: string
  assigned_to: string
  created_at: string
  follow_up_date: string
  last_contact_date: string
  status_color?: string
  priority_color?: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
}

interface LeadMetrics {
  newLeads: number
  conversionRate: number
  totalLeads: number
}

const LeadManagement: React.FC = () => {
  const { companyName } = useParams<{ companyName: string }>()
  const navigate = useNavigate()
  const [leads, setLeads] = useState<Lead[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [metrics, setMetrics] = useState<LeadMetrics>({
    newLeads: 0,
    conversionRate: 0,
    totalLeads: 0
  })

  // Form state
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    lead_source: 'Website',
    lead_status: 'New',
    priority: 'Medium',
    estimated_value: '',
    service_type: 'Septic Tank Installation',
    address: '',
    postcode: '',
    notes: '',
    assigned_to: '',
    follow_up_date: ''
  })

  useEffect(() => {
    loadLeads()
    loadEmployees()
  }, [])

  const loadLeads = async () => {
    try {
      // Get current user's business unit
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('business_unit_id')
        .eq('email', user.email)
        .single()

      if (!userData?.business_unit_id) return

      // Determine which business unit to query based on URL
      let targetBusinessUnitId = userData.business_unit_id
      
      // If URL contains a specific company name, try to find that business unit
      if (companyName) {
        const companySlug = companyName.toLowerCase().replace(/-/g, ' ')
        const { data: targetBU } = await supabase
          .from('business_units')
          .select('id, name')
          .ilike('name', `%${companySlug}%`)
          .single()
        
        if (targetBU) {
          targetBusinessUnitId = targetBU.id
          console.log('Found target business unit:', targetBU.name, targetBU.id)
        } else {
          console.log('No business unit found for company name:', companyName)
        }
      }
      
      console.log('Loading leads for business unit ID:', targetBusinessUnitId)

      // Fetch leads with related data using separate queries to avoid Supabase join issues
      const { data: leadsData, error } = await supabase
        .from('leads')
        .select(`
          id,
          company_name,
          contact_name,
          contact_email,
          contact_phone,
          estimated_value,
          address,
          postcode,
          notes,
          created_at,
          follow_up_date,
          last_contact_date,
          lead_source_id,
          lead_status_id,
          priority_id,
          service_type_id,
          assigned_to
        `)
        .eq('business_unit_id', targetBusinessUnitId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading leads:', error)
        return
      }

      if (!leadsData || leadsData.length === 0) {
        setLeads([])
        setLoading(false)
        return
      }

      // Fetch lookup data separately
      const [sourcesData, statusesData, prioritiesData, serviceTypesData, usersData] = await Promise.all([
        supabase.from('lead_sources').select('id, name'),
        supabase.from('lead_statuses').select('id, name, color_code'),
        supabase.from('lead_priorities').select('id, name, color_code'),
        supabase.from('service_types').select('id, name'),
        supabase.from('users').select('id, first_name, last_name')
      ])

      // Create lookup maps
      const sourcesMap = new Map(sourcesData.data?.map(s => [s.id, s.name]) || [])
      const statusesMap = new Map(statusesData.data?.map(s => [s.id, { name: s.name, color: s.color_code }]) || [])
      const prioritiesMap = new Map(prioritiesData.data?.map(p => [p.id, { name: p.name, color: p.color_code }]) || [])
      const serviceTypesMap = new Map(serviceTypesData.data?.map(st => [st.id, st.name]) || [])
      const usersMap = new Map(usersData.data?.map(u => [u.id, `${u.first_name} ${u.last_name}`]) || [])

      // Transform the data
      const transformedLeads: Lead[] = leadsData.map(lead => ({
        id: lead.id,
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        contact_email: lead.contact_email,
        contact_phone: lead.contact_phone,
        lead_source: sourcesMap.get(lead.lead_source_id) || 'Unknown',
        lead_status: statusesMap.get(lead.lead_status_id)?.name || 'Unknown',
        status_color: statusesMap.get(lead.lead_status_id)?.color,
        priority: prioritiesMap.get(lead.priority_id)?.name || 'Unknown',
        priority_color: prioritiesMap.get(lead.priority_id)?.color,
        estimated_value: lead.estimated_value || 0,
        service_type: serviceTypesMap.get(lead.service_type_id) || 'Unknown',
        address: lead.address || '',
        postcode: lead.postcode || '',
        notes: lead.notes || '',
        assigned_to: usersMap.get(lead.assigned_to) || 'Unassigned',
        created_at: lead.created_at,
        follow_up_date: lead.follow_up_date,
        last_contact_date: lead.last_contact_date
      }))

      setLeads(transformedLeads)
      
      // Calculate metrics
      const newLeads = transformedLeads.filter(l => l.lead_status === 'New').length
      const wonLeads = transformedLeads.filter(l => l.lead_status === 'Won').length
      const conversionRate = transformedLeads.length > 0 ? Math.round((wonLeads / transformedLeads.length) * 100) : 0
      
      setMetrics({
        newLeads,
        conversionRate,
        totalLeads: transformedLeads.length
      })

    } catch (error) {
      console.error('Error loading leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadEmployees = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('business_unit_id')
        .eq('email', user.email)
        .single()

      if (!userData?.business_unit_id) return

      // Determine which business unit to query based on URL
      let targetBusinessUnitId = userData.business_unit_id
      
      // If URL contains a specific company name, try to find that business unit
      if (companyName) {
        const companySlug = companyName.toLowerCase().replace(/-/g, ' ')
        const { data: targetBU } = await supabase
          .from('business_units')
          .select('id, name')
          .ilike('name', `%${companySlug}%`)
          .single()
        
        if (targetBU) {
          targetBusinessUnitId = targetBU.id
        }
      }

      const { data: employeesData, error } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('business_unit_id', targetBusinessUnitId)
        .eq('is_active', true)

      if (error) {
        console.error('Error loading employees:', error)
        return
      }

      setEmployees(employeesData || [])
    } catch (error) {
      console.error('Error loading employees:', error)
    }
  }

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('business_unit_id')
        .eq('email', user.email)
        .single()

      if (!userData?.business_unit_id) return

      // Determine which business unit to use based on URL
      let targetBusinessUnitId = userData.business_unit_id
      
      // If URL contains a specific company name, try to find that business unit
      if (companyName) {
        const companySlug = companyName.toLowerCase().replace(/-/g, ' ')
        const { data: targetBU } = await supabase
          .from('business_units')
          .select('id, name')
          .ilike('name', `%${companySlug}%`)
          .single()
        
        if (targetBU) {
          targetBusinessUnitId = targetBU.id
        }
      }

      // Get lookup IDs
      const [sourceResult, statusResult, priorityResult, serviceResult] = await Promise.all([
        supabase.from('lead_sources').select('id').eq('name', formData.lead_source).single(),
        supabase.from('lead_statuses').select('id').eq('name', formData.lead_status).single(),
        supabase.from('lead_priorities').select('id').eq('name', formData.priority).single(),
        supabase.from('service_types').select('id').eq('name', formData.service_type).single()
      ])

      const { error } = await supabase
        .from('leads')
        .insert({
          business_unit_id: targetBusinessUnitId,
          company_name: formData.company_name,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          lead_source_id: sourceResult.data?.id,
          lead_status_id: statusResult.data?.id,
          priority_id: priorityResult.data?.id,
          estimated_value: parseFloat(formData.estimated_value) || 0,
          service_type_id: serviceResult.data?.id,
          address: formData.address,
          postcode: formData.postcode,
          notes: formData.notes,
          assigned_to: formData.assigned_to || null,
          follow_up_date: formData.follow_up_date || null,
          last_contact_date: new Date().toISOString()
        })

      if (error) {
        console.error('Error adding lead:', error)
        return
      }

      loadLeads()
      setShowAddModal(false)
      resetForm()
    } catch (error) {
      console.error('Error adding lead:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      company_name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      lead_source: 'Website',
      lead_status: 'New',
      priority: 'Medium',
      estimated_value: '',
      service_type: 'Septic Tank Installation',
      address: '',
      postcode: '',
      notes: '',
      assigned_to: '',
      follow_up_date: ''
    })
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.contact_email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || lead.lead_status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="lead-management">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading leads...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="lead-management">
      {/* Header */}
      <div className="lead-header">
        <h1>Leads</h1>
        <div className="header-actions">
          <button 
            className="btn-new-lead"
            onClick={() => setShowAddModal(true)}
          >
            New Lead
          </button>
          <button className="btn-more-actions">
            ⋯ More Actions
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="overview-section">
        <div className="overview-card">
          <div className="overview-header">
            <h3>New leads</h3>
            <span className="time-period">Past 30 days</span>
          </div>
          <div className="overview-content">
            <div className="metric-number">{metrics.newLeads}</div>
            <div className="metric-change positive">↑ 283%</div>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-header">
            <h3>Conversion rate</h3>
            <span className="time-period">Past 30 days</span>
          </div>
          <div className="overview-content">
            <div className="metric-number">{metrics.conversionRate}%</div>
            <div className="metric-change negative">↓ 66%</div>
          </div>
        </div>

        <div className="overview-card copilot-card">
          <div className="copilot-content">
            <h3>You've come a long way!</h3>
            <p>Want to dig into your business growth and changes over the last year?</p>
            <button className="learn-more-btn">Learn more with ⚡ Copilot</button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="All">All</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Proposal">Proposal</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
          </select>
        </div>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Leads Table */}
      <div className="leads-table-section">
        <div className="table-header">
          <h2>All leads ({filteredLeads.length} results)</h2>
        </div>

        <div className="table-container">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Title</th>
                <th>Property</th>
                <th>Contact</th>
                <th>Requested</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="lead-row">
                  <td className="client-cell">
                    <div className="client-info">
                      <div className="client-name">{lead.company_name}</div>
                    </div>
                  </td>
                  <td className="title-cell">
                    <div className="lead-title">{lead.service_type}</div>
                  </td>
                  <td className="property-cell">
                    <div className="property-info">
                      <div className="property-address">{lead.address || 'No address provided'}</div>
                      <div className="property-postcode">{lead.postcode}</div>
                    </div>
                  </td>
                  <td className="contact-cell">
                    <div className="contact-info">
                      <div className="contact-name">{lead.contact_name}</div>
                      <div className="contact-email">{lead.contact_email}</div>
                    </div>
                  </td>
                  <td className="requested-cell">
                    <div className="requested-date">
                      {new Date(lead.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </div>
                  </td>
                  <td className="status-cell">
                    <span 
                      className={`status-badge status-${lead.lead_status.toLowerCase()}`}
                      style={{ backgroundColor: lead.status_color }}
                    >
                      {lead.lead_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLeads.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No leads found</h3>
              <p>No leads match your current filters. Try adjusting your search criteria or add a new lead.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Lead</h2>
              <button 
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddLead} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Name *</label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Email *</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Service Type</label>
                  <select
                    value={formData.service_type}
                    onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                  >
                    <option value="Septic Tank Installation">Septic Tank Installation</option>
                    <option value="Septic Tank Maintenance">Septic Tank Maintenance</option>
                    <option value="Septic Tank Repair">Septic Tank Repair</option>
                    <option value="Multiple Septic Systems">Multiple Septic Systems</option>
                    <option value="Consultation">Consultation</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Postcode</label>
                  <input
                    type="text"
                    value={formData.postcode}
                    onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Estimated Value (£)</label>
                  <input
                    type="number"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData({...formData, estimated_value: e.target.value})}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeadManagement