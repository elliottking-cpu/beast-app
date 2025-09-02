import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import DashboardLayout from './DashboardLayout'
import './EquipmentManagement.css'

interface EquipmentItem {
  id: string
  equipment_name: string
  registration_number?: string
  equipment_type: string
  is_operational: boolean
  created_at: string
}

interface EquipmentStats {
  total: number
  operational: number
  byType: { [key: string]: number }
}

const EquipmentManagement = () => {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [stats, setStats] = useState<EquipmentStats>({ total: 0, operational: 0, byType: {} })
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('all')
  const [showCategoryManagement, setShowCategoryManagement] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showDeleteCategory, setShowDeleteCategory] = useState<string | null>(null)

  useEffect(() => {
    loadEquipmentData()
  }, [])

  const loadEquipmentData = async () => {
    try {
      setIsLoading(true)

      // Get current user's business unit
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('business_unit_id')
        .eq('id', user.id)
        .single()

      if (!userData) return

      // Load equipment from all tables
      const equipmentTables = [
        { table: 'tanker_equipment', type: 'Tanker' },
        { table: 'jetvac_equipment', type: 'Jet Vac' },
        { table: 'excavator_equipment', type: 'Excavator' },
        { table: 'dumper_truck_equipment', type: 'Dumper Truck' },
        { table: 'cctv_camera_equipment', type: 'CCTV Camera' },
        { table: 'van_equipment', type: 'Van' },
        { table: 'trailer_equipment', type: 'Trailer' },
        { table: 'general_equipment', type: 'General Equipment' }
      ]

      let allEquipment: EquipmentItem[] = []
      let totalCount = 0
      let operationalCount = 0
      const typeCount: { [key: string]: number } = {}

      for (const { table, type } of equipmentTables) {
        const { data, error } = await supabase
          .from(table)
          .select('id, equipment_name, registration_number, is_operational, created_at')
          .eq('business_unit_id', userData.business_unit_id)

        if (error) {
          console.error(`Error loading ${table}:`, error)
          continue
        }

        const equipmentWithType = (data || []).map(item => ({
          ...item,
          equipment_type: type
        }))

        allEquipment = [...allEquipment, ...equipmentWithType]
        totalCount += data?.length || 0
        operationalCount += data?.filter(item => item.is_operational).length || 0
        typeCount[type] = data?.length || 0
      }

      setEquipment(allEquipment)
      setStats({
        total: totalCount,
        operational: operationalCount,
        byType: typeCount
      })

    } catch (error) {
      console.error('Error loading equipment data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddEquipment = (equipmentType: string) => {
    setSelectedType(equipmentType)
    setShowAddModal(true)
  }

  const equipmentTypes = [
    { key: 'tanker', name: 'Tanker', icon: '🚛' },
    { key: 'jetvac', name: 'Jet Vac', icon: '💨' },
    { key: 'excavator', name: 'Excavator', icon: '🚜' },
    { key: 'dumper', name: 'Dumper Truck', icon: '🚚' },
    { key: 'cctv', name: 'CCTV Camera', icon: '📹' },
    { key: 'van', name: 'Van', icon: '🚐' },
    { key: 'trailer', name: 'Trailer', icon: '🚚' },
    { key: 'general', name: 'General Equipment', icon: '⚙️' }
  ]

  const filteredEquipment = filterType === 'all' 
    ? equipment 
    : equipment.filter(item => item.equipment_type.toLowerCase().replace(' ', '') === filterType)

  if (isLoading) {
    return (
      <div className="equipment-loading">
        <div className="loading-spinner"></div>
        <p>Loading equipment data...</p>
      </div>
    )
  }

  return (
    <DashboardLayout currentPage="Equipment">
      <div className="equipment-management">
      <div className="equipment-header">
        <div className="equipment-title-section">
          <h1>Equipment Management</h1>
          <p>Manage your group company's equipment catalog and specifications</p>
        </div>
        
        <div className="equipment-actions">
          <button 
            className="manage-categories-btn"
            onClick={() => setShowCategoryManagement(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Manage Categories
          </button>
          <button 
            className="add-equipment-btn"
            onClick={() => setShowAddModal(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Add Equipment
          </button>
        </div>
      </div>

      {/* Equipment Statistics */}
      <div className="equipment-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Total Equipment</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats.operational}</h3>
            <p>Operational</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏷️</div>
          <div className="stat-content">
            <h3>8</h3>
            <p>Equipment Types</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔧</div>
          <div className="stat-content">
            <h3>{stats.total - stats.operational}</h3>
            <p>Needs Service</p>
          </div>
        </div>
      </div>

      {/* Equipment Categories Overview */}
      <div className="equipment-categories">
        <h2>Equipment by Category</h2>
        <div className="category-grid">
          {equipmentTypes.map(type => (
            <div key={type.key} className="category-card">
              <div className="category-icon">{type.icon}</div>
              <div className="category-content">
                <h3>{type.name}</h3>
                <p>{stats.byType[type.name] || 0} items</p>
              </div>
              <button 
                className="category-add-btn"
                onClick={() => handleAddEquipment(type.key)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Equipment List */}
      <div className="equipment-list-section">
        <div className="equipment-list-header">
          <h2>Equipment Inventory</h2>
          <div className="equipment-filters">
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Equipment</option>
              {equipmentTypes.map(type => (
                <option key={type.key} value={type.key}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredEquipment.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⚙️</div>
            <h3>No Equipment Added Yet</h3>
            <p>Start by adding your first piece of equipment to build your catalog.</p>
            <button 
              className="empty-state-btn"
              onClick={() => setShowAddModal(true)}
            >
              Add Your First Equipment
            </button>
          </div>
        ) : (
          <div className="equipment-grid">
            {filteredEquipment.map(item => (
              <div key={item.id} className="equipment-card">
                <div className="equipment-card-header">
                  <div className="equipment-type-badge">
                    {equipmentTypes.find(t => t.name === item.equipment_type)?.icon} {item.equipment_type}
                  </div>
                  <div className={`status-badge ${item.is_operational ? 'operational' : 'maintenance'}`}>
                    {item.is_operational ? 'Operational' : 'Maintenance'}
                  </div>
                </div>
                <div className="equipment-card-content">
                  <h3>{item.equipment_name}</h3>
                  {item.registration_number && (
                    <p className="registration">Reg: {item.registration_number}</p>
                  )}
                  <p className="created-date">
                    Added: {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="equipment-card-actions">
                  <button className="edit-btn">Edit</button>
                  <button className="view-btn">View Details</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Equipment Modal */}
      {showAddModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowAddModal(false)} />
          <div className="equipment-modal">
            <div className="equipment-modal-header">
              <h3>Add Equipment</h3>
              <button 
                className="modal-close"
                onClick={() => setShowAddModal(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            <div className="equipment-modal-content">
              <div className="equipment-type-selector">
                <h4>Choose Equipment Type</h4>
                <p>Select the type of equipment you want to add:</p>
                
                <div className="equipment-type-grid">
                  {equipmentTypes.map(type => (
                    <div 
                      key={type.key}
                      className="equipment-type-card" 
                      onClick={() => {
                        alert(`${type.name} form will be implemented in next phase`)
                        setShowAddModal(false)
                      }}
                    >
                      <div className="equipment-type-icon">{type.icon}</div>
                      <h5>{type.name}</h5>
                      <p>Add {type.name.toLowerCase()} to your fleet</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Category Management Modal */}
      {showCategoryManagement && (
        <>
          <div className="modal-overlay" onClick={() => setShowCategoryManagement(false)} />
          <div className="category-management-modal">
            <div className="category-management-header">
              <h3>Manage Equipment Categories</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCategoryManagement(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            <div className="category-management-content">
              <div className="category-management-placeholder">
                <div className="placeholder-icon">🏷️</div>
                <h4>Equipment Category Management</h4>
                <p>
                  Category management interface will allow you to:
                </p>
                <ul>
                  <li>Create custom equipment categories for your business</li>
                  <li>Edit existing category names, descriptions, and icons</li>
                  <li>Delete unused categories (with safety checks)</li>
                  <li>Reorganize category display order</li>
                  <li>Set category-specific validation rules</li>
                </ul>
                <p>
                  <strong>Note:</strong> The 7 major equipment types (Tanker, Jetvac, etc.) are 
                  system-managed for functionality but you can add additional custom categories.
                </p>
                <button 
                  className="placeholder-btn"
                  onClick={() => setShowCategoryManagement(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </DashboardLayout>
  )
}

export default EquipmentManagement
