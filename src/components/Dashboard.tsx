import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

import './Dashboard.css'

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [equipmentStats, setEquipmentStats] = useState({ total: 0, categories: 8, operational: 0 })

  useEffect(() => {
    loadEquipmentStats()
  }, [])

  const loadEquipmentStats = async () => {
    try {
      setIsLoading(true)

      // Get current authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        return
      }

      // Get user's business unit
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('business_unit_id')
        .eq('id', authUser.id)
        .single()

      if (userError) return

      // Load equipment statistics
      const equipmentTables = [
        'tanker_equipment',
        'jetvac_equipment', 
        'excavator_equipment',
        'dumper_truck_equipment',
        'cctv_camera_equipment',
        'van_equipment',
        'trailer_equipment',
        'general_equipment'
      ]

      let totalEquipment = 0
      let operationalEquipment = 0

      for (const table of equipmentTables) {
        const { count: totalCount } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('business_unit_id', userData.business_unit_id)

        const { count: operationalCount } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('business_unit_id', userData.business_unit_id)
          .eq('is_operational', true)

        totalEquipment += totalCount || 0
        operationalEquipment += operationalCount || 0
      }

      setEquipmentStats({
        total: totalEquipment,
        categories: 8, // Fixed number of equipment categories
        operational: operationalEquipment
      })

    } catch (error) {
      console.error('Error loading equipment stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <>
      <div className="dashboard-main-content">
        {/* Header Section */}
        <div className="dashboard-header">
          <div className="dashboard-title-section">
            <h1>Dashboard</h1>
            <p>Overview of your business operations and key metrics</p>
          </div>
          <div className="dashboard-actions">
            <button className="btn btn-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6" />
                <path d="m21 12-6 0m-6 0-6 0" />
              </svg>
              Quick Setup
            </button>
          </div>
        </div>

        {/* Setup Progress Section */}
        <div className="setup-progress-section">
          <div className="setup-header">
            <h2>🚀 Phase 1: Foundation Setup</h2>
            <p>Complete these essential steps to get your business operational</p>
          </div>
          
          <div className="setup-steps">
            <div className="setup-step completed">
              <div className="step-number">✅</div>
              <div className="step-content">
                <h3>Step 1: Equipment Types Management</h3>
                <p>Equipment categories and specifications defined</p>
              </div>
            </div>
            
            <div className="setup-step completed">
              <div className="step-number">✅</div>
              <div className="step-content">
                <h3>Step 2: Skills & Certifications System</h3>
                <p>Skills, certifications, and license management setup</p>
              </div>
            </div>
            
            <div className="setup-step completed">
              <div className="step-number">✅</div>
              <div className="step-content">
                <h3>Step 3: Service Catalog Foundation</h3>
                <p>Services, categories, and pricing structures defined</p>
              </div>
            </div>
            
            <div className="setup-step current">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Step 4: Complete Backend Foundation</h3>
                <p>Finalizing all database relationships and business rules</p>
                <div className="step-status">Currently in Progress</div>
              </div>
            </div>
          </div>
        </div>

        {/* Equipment Statistics */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">⚙️</div>
            <div className="stat-content">
              <h3>{equipmentStats.total}</h3>
              <p>Total Equipment</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>{equipmentStats.categories}</h3>
              <p>Equipment Categories</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{equipmentStats.operational}</h3>
              <p>Operational Equipment</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🔧</div>
            <div className="stat-content">
              <h3>{equipmentStats.total - equipmentStats.operational}</h3>
              <p>Maintenance Required</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-grid">
            <div className="action-card">
              <div className="action-icon">⚙️</div>
              <h4>Equipment Management</h4>
              <p>View and manage your equipment inventory</p>
            </div>
            
            <div className="action-card">
              <div className="action-icon">🎯</div>
              <h4>Skills Management</h4>
              <p>Manage employee skills and certifications</p>
            </div>
            
            <div className="action-card">
              <div className="action-icon">📋</div>
              <h4>Service Management</h4>
              <p>Configure your service catalog</p>
            </div>
            
            <div className="action-card disabled">
              <div className="action-icon">🚀</div>
              <h4>Equipment Wizard</h4>
              <p>Coming soon - after backend completion</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Dashboard