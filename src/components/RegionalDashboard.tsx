import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Dashboard from './Dashboard'
import './EquipmentManagement.css'

interface BusinessUnit {
  id: string
  name: string
  business_unit_type_id: string
}

interface DashboardMetrics {
  requests: {
    new: number
    assessments_complete: number
    overdue: number
  }
  quotes: {
    approved: number
    draft: number
    changes_requested: number
  }
  jobs: {
    requires_invoicing: number
    active: number
    action_required: number
  }
  invoices: {
    awaiting_payment: number
    draft: number
    past_due: number
  }
  appointments: {
    total: number
    active: number
    completed: number
    overdue: number
    remaining: number
  }
  receivables: {
    total_amount: number
    client_count: number
    top_clients: Array<{
      name: string
      balance: number
      late_amount: number
    }>
  }
  upcoming_jobs: {
    week_total: number
    percentage_change: number
  }
  revenue: {
    month_total: number
  }
  payouts: {
    processing: number
  }
}

const RegionalDashboard: React.FC = () => {
  const { companyName } = useParams<{ companyName: string }>()
  const [businessUnit, setBusinessUnit] = useState<BusinessUnit | null>(null)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showPlaceholder, setShowPlaceholder] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [companyName])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load user details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('first_name, last_name, business_unit_id')
        .eq('id', user.id)
        .single()

      if (userError) {
        console.error('Error loading user:', userError)
        return
      }

      setCurrentUser(userData)

      // Convert company name from URL format to proper case
      const businessUnitName = companyName
        ?.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')

      // Load business unit
      const { data: buData, error: buError } = await supabase
        .from('business_units')
        .select('id, name, business_unit_type_id')
        .eq('name', businessUnitName)
        .single()

      if (buError) {
        console.error('Error loading business unit:', buError)
        return
      }

      setBusinessUnit(buData)

      // If this is a GROUP_MANAGEMENT business unit, show the old dashboard
      if (buData.business_unit_type_id === '716008fd-932c-447f-abc2-3b1e9305bb59') {
        // This will be handled in the render method
        setLoading(false)
        return
      }

      // Load dashboard metrics (using sample data for now)
      const dashboardMetrics: DashboardMetrics = {
        requests: {
          new: 1,
          assessments_complete: 8,
          overdue: 0
        },
        quotes: {
          approved: 0,
          draft: 1,
          changes_requested: 1
        },
        jobs: {
          requires_invoicing: 11,
          active: 485,
          action_required: 18
        },
        invoices: {
          awaiting_payment: 181,
          draft: 0,
          past_due: 135
        },
        appointments: {
          total: 3065,
          active: 0,
          completed: 3065,
          overdue: 0,
          remaining: 0
        },
        receivables: {
          total_amount: 130401,
          client_count: 151,
          top_clients: [
            { name: 'Stephen Ball', balance: 19.7, late_amount: 19.7 },
            { name: 'Kevan Lari', balance: 12.3, late_amount: 15.4 },
            { name: 'Catalyst Services UK', balance: 3600, late_amount: 3600 }
          ]
        },
        upcoming_jobs: {
          week_total: 3245,
          percentage_change: 75
        },
        revenue: {
          month_total: 20200
        },
        payouts: {
          processing: 5488
        }
      }

      setMetrics(dashboardMetrics)

    } catch (error) {
      console.error('Error loading dashboard data:', error)
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
        <div className="loading-state">Loading dashboard...</div>
      </div>
    )
  }

  if (!businessUnit) {
    return (
      <div className="equipment-management">
        <div className="error-state">Unable to load dashboard data</div>
      </div>
    )
  }

  // If this is a GROUP_MANAGEMENT business unit, show the old dashboard
  if (businessUnit.business_unit_type_id === '716008fd-932c-447f-abc2-3b1e9305bb59') {
    return <Dashboard />
  }

  if (!metrics) {
    return (
      <div className="equipment-management">
        <div className="error-state">Unable to load dashboard metrics</div>
      </div>
    )
  }

  const getCurrentDate = () => {
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }
    return now.toLocaleDateString('en-GB', options)
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
          {getCurrentDate()}
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
          {getGreeting()}, {currentUser?.first_name || 'User'}
        </h1>
      </div>

      {/* Workflow Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>Workflow</h2>
          <div style={{ height: '3px', backgroundColor: '#f97316', width: '60px', marginLeft: '1rem', borderRadius: '2px' }}></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
          {/* Requests */}
          <div 
            onClick={() => showPlaceholderModal('Request Management System')}
            style={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              padding: '1.5rem', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ width: '24px', height: '24px', backgroundColor: '#fed7aa', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                </svg>
              </div>
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Requests</span>
            </div>
            
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
              {metrics.requests.new}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937', marginBottom: '0.5rem' }}>New</div>
            
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
              Assessments complete ({metrics.requests.assessments_complete})
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
              Overdue ({metrics.requests.overdue})
            </div>
            <div style={{ fontSize: '0.75rem', color: '#ea580c', fontWeight: '500', fontStyle: 'italic' }}>
              Click to set up request management →
            </div>
          </div>

          {/* Quotes */}
          <div 
            onClick={() => showPlaceholderModal('Quote Management System')}
            style={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              padding: '1.5rem', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ width: '24px', height: '24px', backgroundColor: '#fecaca', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <path d="M9 11H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h4l3 3V8l-3 3z" />
                  <path d="M22 4H12l-3 3h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2" />
                </svg>
              </div>
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Quotes</span>
            </div>
            
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
              {metrics.quotes.approved}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937', marginBottom: '0.5rem' }}>Approved</div>
            
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
              Draft ({metrics.quotes.draft}) <span style={{ color: '#1f2937' }}>£245</span>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
              Changes requested ({metrics.quotes.changes_requested}) <span style={{ color: '#1f2937' }}>£2,100</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '500', fontStyle: 'italic' }}>
              Click to set up quote management →
            </div>
          </div>

          {/* Jobs */}
          <div 
            onClick={() => showPlaceholderModal('Job Management System')}
            style={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              padding: '1.5rem', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ width: '24px', height: '24px', backgroundColor: '#bbf7d0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Jobs</span>
            </div>
            
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
              {metrics.jobs.requires_invoicing}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937', marginBottom: '0.5rem' }}>
              Requires invoicing <span style={{ color: '#64748b' }}>£2,910</span>
            </div>
            
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
              Active ({metrics.jobs.active}) <span style={{ color: '#1f2937' }}>£185k</span>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
              Action required ({metrics.jobs.action_required}) <span style={{ color: '#1f2937' }}>£9,795</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '500', fontStyle: 'italic' }}>
              Click to set up job management →
            </div>
          </div>

          {/* Invoices */}
          <div 
            onClick={() => showPlaceholderModal('Invoice Management System')}
            style={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              padding: '1.5rem', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ width: '24px', height: '24px', backgroundColor: '#dbeafe', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10,9 9,9 8,9" />
                </svg>
              </div>
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Invoices</span>
            </div>
            
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
              {metrics.invoices.awaiting_payment}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937', marginBottom: '0.5rem' }}>
              Awaiting payment <span style={{ color: '#64748b' }}>£119.3k</span>
            </div>
            
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
              Draft ({metrics.invoices.draft})
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
              Past due ({metrics.invoices.past_due}) <span style={{ color: '#1f2937' }}>£89.3k</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '500', fontStyle: 'italic' }}>
              Click to set up invoice management →
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Today's Appointments */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: '0 0 1rem 0' }}>Today's appointments</h3>
          
          {/* Appointment Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Total</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>£{metrics.appointments.total.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Active</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>£{metrics.appointments.active}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Completed</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>£{metrics.appointments.completed.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Overdue</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>£{metrics.appointments.overdue}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Remaining</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>£{metrics.appointments.remaining}</div>
            </div>
          </div>

          {/* View Toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button style={{ 
              backgroundColor: '#f3f4f6', 
              border: 'none', 
              borderRadius: '6px', 
              padding: '0.5rem 1rem', 
              fontSize: '0.875rem', 
              cursor: 'pointer' 
            }}>
              Visit
            </button>
            <button style={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '6px', 
              padding: '0.5rem 1rem', 
              fontSize: '0.875rem', 
              cursor: 'pointer' 
            }}>
              Employee
            </button>
          </div>

          {/* Appointment Status */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>0 OVERDUE</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>0 ACTIVE</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>0 REMAINING</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>12 COMPLETED</div>
          </div>

          {/* Sample Appointment */}
          <div style={{ 
            padding: '1rem', 
            border: '1px solid #e5e7eb', 
            borderRadius: '6px', 
            borderLeft: '4px solid #10b981',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: '500', color: '#1f2937' }}>Yorkshire Septics Ltd - Drivers Daily Checks</div>
              <div style={{ 
                backgroundColor: '#f3f4f6', 
                borderRadius: '50%', 
                width: '24px', 
                height: '24px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '500'
              }}>
                PH
              </div>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>7:45 AM - 8:00 AM</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button 
              onClick={() => showPlaceholderModal('Appointment Management')}
              style={{ 
                color: '#3b82f6', 
                backgroundColor: 'transparent', 
                border: 'none', 
                fontSize: '0.875rem', 
                cursor: 'pointer' 
              }}
            >
              See 10 more visits
            </button>
          </div>

          <div style={{ marginTop: '1rem', textAlign: 'right' }}>
            <button 
              onClick={() => showPlaceholderModal('Schedule Management')}
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
              View Schedule
            </button>
          </div>
        </div>

        {/* Business Performance */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: '0 0 1rem 0' }}>Business Performance</h3>
          
          {/* Receivables */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937', margin: 0 }}>Receivables</h4>
              <button 
                onClick={() => showPlaceholderModal('Receivables Management')}
                style={{ 
                  color: '#3b82f6', 
                  backgroundColor: 'transparent', 
                  border: 'none', 
                  fontSize: '0.875rem', 
                  cursor: 'pointer' 
                }}
              >
                →
              </button>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
              {metrics.receivables.client_count} clients owe you
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
              £{metrics.receivables.total_amount.toLocaleString()}
            </div>
            
            <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Client</span>
                <span style={{ color: '#64748b' }}>Balance</span>
                <span style={{ color: '#64748b' }}>Late</span>
              </div>
            </div>
            
            {metrics.receivables.top_clients.map((client, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                <span style={{ color: '#1f2937' }}>{client.name}</span>
                <span style={{ color: '#1f2937' }}>£{client.balance}k</span>
                <span style={{ color: '#ef4444' }}>£{client.late_amount}k</span>
              </div>
            ))}
          </div>

          {/* Upcoming Jobs */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937', margin: 0 }}>Upcoming jobs</h4>
              <button 
                onClick={() => showPlaceholderModal('Jobs Management')}
                style={{ 
                  color: '#3b82f6', 
                  backgroundColor: 'transparent', 
                  border: 'none', 
                  fontSize: '0.875rem', 
                  cursor: 'pointer' 
                }}
              >
                →
              </button>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
              This week (Tomorrow - 07 Sept) ℹ️
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                £{metrics.upcoming_jobs.week_total.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#10b981' }}>
                ↗ {metrics.upcoming_jobs.percentage_change}%
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937', margin: 0 }}>Revenue</h4>
              <button 
                onClick={() => showPlaceholderModal('Revenue Analytics')}
                style={{ 
                  color: '#3b82f6', 
                  backgroundColor: 'transparent', 
                  border: 'none', 
                  fontSize: '0.875rem', 
                  cursor: 'pointer' 
                }}
              >
                →
              </button>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
              This month so far (1 Sept - now) ℹ️
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
              £{(metrics.revenue.month_total / 1000).toFixed(1)}k
            </div>
          </div>

          {/* Upcoming Payouts */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937', margin: 0 }}>Upcoming payouts</h4>
              <button 
                onClick={() => showPlaceholderModal('Payouts Management')}
                style={{ 
                  color: '#3b82f6', 
                  backgroundColor: 'transparent', 
                  border: 'none', 
                  fontSize: '0.875rem', 
                  cursor: 'pointer' 
                }}
              >
                →
              </button>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
              On its way to your bank ℹ️
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937', marginBottom: '0.5rem' }}>—</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
              Processing payout ℹ️
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
              £{metrics.payouts.processing.toLocaleString()}
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

export default RegionalDashboard
