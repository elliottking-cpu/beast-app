import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

import './EquipmentManagement.css'

interface EquipmentItem {
  id: string
  equipment_name: string
  registration_number?: string
  equipment_type: string
  equipment_type_key?: string
  is_operational: boolean
  created_at: string
}

interface EquipmentStats {
  total: number
  operational: number
  byType: { [key: string]: number }
}

const EquipmentManagement = () => {
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [stats, setStats] = useState<EquipmentStats>({ total: 0, operational: 0, byType: {} })
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterBusinessUnit, setFilterBusinessUnit] = useState<string>('all')
  const [businessUnits, setBusinessUnits] = useState<any[]>([])
  const [showCategoryManagement, setShowCategoryManagement] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showDeleteCategory, setShowDeleteCategory] = useState<string | null>(null)
  const [showQuickView, setShowQuickView] = useState<string | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('⚙️')

  useEffect(() => {
    loadEquipmentData()
    loadCategories()
    loadBusinessUnits()
  }, [])

  useEffect(() => {
    loadEquipmentData()
  }, [filterBusinessUnit])

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
        { table: 'tanker_equipment', type: 'Tanker', typeKey: 'tanker' },
        { table: 'jetvac_equipment', type: 'Jet Vac', typeKey: 'jetvac' },
        { table: 'excavator_equipment', type: 'Excavator', typeKey: 'excavator' },
        { table: 'dumper_truck_equipment', type: 'Dumper Truck', typeKey: 'dumper' },
        { table: 'cctv_camera_equipment', type: 'CCTV Camera', typeKey: 'cctv' },
        { table: 'van_equipment', type: 'Van', typeKey: 'van' },
        { table: 'trailer_equipment', type: 'Trailer', typeKey: 'trailer' },
        { table: 'general_equipment', type: 'General Equipment', typeKey: 'general' }
      ]

      let allEquipment: EquipmentItem[] = []
      let totalCount = 0
      let operationalCount = 0
      const typeCount: { [key: string]: number } = {}

      for (const { table, type, typeKey } of equipmentTables) {
        let query = supabase
          .from(table)
          .select('id, equipment_name, registration_number, is_operational, created_at')

        // Apply business unit filter
        if (filterBusinessUnit === 'all') {
          query = query.eq('business_unit_id', userData.business_unit_id)
        } else {
          query = query.eq('business_unit_id', filterBusinessUnit)
        }

        const { data, error } = await query

        if (error) {
          console.error(`Error loading ${table}:`, error)
          continue
        }

        const equipmentWithType = (data || []).map(item => ({
          ...item,
          equipment_type: type,
          equipment_type_key: typeKey
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

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('major_equipment_types')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadBusinessUnits = async () => {
    try {
      // Load all business units (for filtering)
      const { data, error } = await supabase
        .from('business_units')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setBusinessUnits(data || [])
    } catch (error) {
      console.error('Error loading business units:', error)
    }
  }

  const handleAddCategory = async () => {
    try {
      if (!newCategoryName.trim()) {
        alert('Category name is required')
        return
      }

      const { error } = await supabase
        .from('major_equipment_types')
        .insert({
          name: newCategoryName,
          icon: newCategoryIcon,
          table_name: `${newCategoryName.toLowerCase().replace(/\s+/g, '_')}_equipment`,
          requires_registration: true
        })

      if (error) throw error

      // Reset form and reload
      setNewCategoryName('')
      setNewCategoryDescription('')
      setNewCategoryIcon('⚙️')
      setShowAddCategory(false)
      await loadCategories()

    } catch (error) {
      console.error('Error adding category:', error)
      alert('Error adding category. Please try again.')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      // Check if category is being used (system categories cannot be deleted)
      const category = categories.find(c => c.id === categoryId)
      if (!category) return

      const systemCategories = ['Tanker', 'Jet Vac', 'Excavator', 'Dumper Truck', 'CCTV Drain Camera', 'Van', 'Trailer']
      if (systemCategories.includes(category.name)) {
        alert('System categories cannot be deleted as they are required for functionality.')
        return
      }

      const { error } = await supabase
        .from('major_equipment_types')
        .delete()
        .eq('id', categoryId)

      if (error) throw error

      await loadCategories()
      setShowDeleteCategory(null)

    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Error deleting category. Please try again.')
    }
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

  const filteredEquipment = equipment.filter(item => {
    const typeMatch = filterType === 'all' || item.equipment_type_key === filterType
    // Business unit filter is already applied in loadEquipmentData
    return typeMatch
  })

  if (isLoading) {
    return (
      <div className="equipment-loading">
        <div className="loading-spinner"></div>
        <p>Loading equipment data...</p>
      </div>
    )
  }

  return (
    <>
      <div className="equipment-management">
      <div className="equipment-header">
        <div className="equipment-title-section">
          <h1>Equipment Management</h1>
          <p>Manage your group company's equipment catalog and specifications</p>
        </div>
        
        <div className="equipment-actions">
          <button 
            className="manage-categories-btn"
            onClick={() => {
              const companySlug = window.location.pathname.split('/')[1]
              navigate(`/${companySlug}/equipment/categories`)
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Manage Categories
          </button>
          <button 
            className="add-equipment-btn disabled"
            onClick={() => alert('Equipment creation wizard is temporarily disabled while we complete the backend foundation. This will be re-enabled once all database relationships are fully established.')}
            title="Temporarily disabled - backend foundation in progress"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Add Equipment (Coming Soon)
          </button>
        </div>
      </div>

      {/* Equipment Statistics - Ultra Professional */}
      <div className="equipment-stats-professional">
        <div className="stat-card-professional">
          <div className="stat-content-professional">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Equipment</div>
          </div>
        </div>
        <div className="stat-card-professional">
          <div className="stat-content-professional">
            <div className="stat-value operational">{stats.operational}</div>
            <div className="stat-label">Operational</div>
          </div>
        </div>
        <div className="stat-card-professional">
          <div className="stat-content-professional">
            <div className="stat-value types">8</div>
            <div className="stat-label">Equipment Types</div>
          </div>
        </div>
        <div className="stat-card-professional">
          <div className="stat-content-professional">
            <div className="stat-value maintenance">{stats.total - stats.operational}</div>
            <div className="stat-label">Needs Service</div>
          </div>
        </div>
      </div>

      {/* Equipment Categories - Ultra Professional Business Table */}
      <div className="equipment-categories">
        <div className="categories-header-section">
          <h2>Equipment Categories</h2>
          <div className="categories-summary">
            {equipmentTypes.length} categories • {equipment.length} total equipment
          </div>
        </div>
        
        <div className="categories-business-table">
          <div className="business-table-header">
            <div className="table-column category-col">Category</div>
            <div className="table-column count-col">Equipment Count</div>
            <div className="table-column status-col">Status</div>
            <div className="table-column actions-col">Actions</div>
          </div>
          
          {equipmentTypes.map(type => {
            const count = stats.byType[type.name] || 0
            return (
              <div key={type.key} className="business-table-row">
                <div className="table-column category-col">
                  <h4 className="category-name-clean">{type.name}</h4>
                </div>
                
                <div className="table-column count-col">
                  <div className="equipment-count-display">
                    <span className="count-value">{count}</span>
                    <span className="count-unit">units</span>
                  </div>
                </div>
                
                <div className="table-column status-col">
                  <div className={`operational-status ${count > 0 ? 'active' : 'empty'}`}>
                    <div className="status-indicator"></div>
                    <span className="status-text">
                      {count > 0 ? 'Active' : 'Empty'}
                    </span>
                  </div>
                </div>
                
                <div className="table-column actions-col">
                  <div className="business-actions">
                    <button 
                      className="business-action-btn quick-view"
                      onClick={() => setShowQuickView(type.key)}
                      title="Quick View Equipment"
                    >
                      Quick View
                    </button>
                    
                    <button 
                      className="business-action-btn manage-category"
                      onClick={() => {
                        const companySlug = window.location.pathname.split('/')[1]
                        // Find category ID for this type
                        const category = categories.find(c => c.name === type.name)
                        if (category) {
                          navigate(`/${companySlug}/equipment/categories/${category.id}`)
                        }
                      }}
                      title="Manage Category"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Equipment List */}
      <div className="equipment-list-section">
        <div className="equipment-list-header">
          <h2>Equipment Inventory</h2>
          <div className="equipment-filters">
            <select 
              value={filterBusinessUnit} 
              onChange={(e) => setFilterBusinessUnit(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Business Units</option>
              {businessUnits.map(unit => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
            
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Equipment Types</option>
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
              className="empty-state-btn disabled"
              onClick={() => alert('Equipment creation wizard is temporarily disabled while we complete the backend foundation. This will be re-enabled once all database relationships are fully established.')}
              title="Temporarily disabled - backend foundation in progress"
            >
              Add Your First Equipment (Coming Soon)
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
                  <button 
                    className="edit-btn"
                    onClick={() => {
                      // Navigate to equipment detail page
                      const companySlug = window.location.pathname.split('/')[1]
                      navigate(`/${companySlug}/equipment/${item.equipment_type_key}/${item.id}`)
                    }}
                  >
                    Manage
                  </button>
                  <button className="quick-view-btn">Quick View</button>
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
              <div className="category-management-header-section">
                <h4>Equipment Categories</h4>
                <button 
                  className="add-category-btn"
                  onClick={() => setShowAddCategory(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Category
                </button>
              </div>

              <div className="categories-list">
                {categories.map(category => {
                  const isSystemCategory = ['Tanker', 'Jet Vac', 'Excavator', 'Dumper Truck', 'CCTV Drain Camera', 'Van', 'Trailer'].includes(category.name)
                  return (
                    <div key={category.id} className="category-management-item">
                      <div className="category-info">
                        <div className="category-icon">{category.icon}</div>
                        <div className="category-details">
                          <h5>{category.name}</h5>
                          <p>{isSystemCategory ? 'System Category' : 'Custom Category'}</p>
                        </div>
                      </div>
                      <div className="category-actions">
                        <button className="edit-category-btn">Edit</button>
                        {!isSystemCategory && (
                          <button 
                            className="delete-category-btn"
                            onClick={() => setShowDeleteCategory(category.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {showAddCategory && (
                <div className="add-category-form">
                  <h4>Add New Equipment Category</h4>
                  <div className="form-group">
                    <label>Category Name</label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g., Specialized Equipment"
                    />
                  </div>
                  <div className="form-group">
                    <label>Icon (Emoji)</label>
                    <input
                      type="text"
                      value={newCategoryIcon}
                      onChange={(e) => setNewCategoryIcon(e.target.value)}
                      placeholder="⚙️"
                      maxLength={2}
                    />
                  </div>
                  <div className="form-actions">
                    <button 
                      className="cancel-form-btn"
                      onClick={() => {
                        setShowAddCategory(false)
                        setNewCategoryName('')
                        setNewCategoryDescription('')
                        setNewCategoryIcon('⚙️')
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      className="save-form-btn"
                      onClick={handleAddCategory}
                    >
                      Add Category
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Delete Category Confirmation */}
      {showDeleteCategory && (
        <>
          <div className="modal-overlay" onClick={() => setShowDeleteCategory(null)} />
          <div className="delete-modal">
            <div className="delete-modal-header">
              <h3>Delete Equipment Category</h3>
              <button className="modal-close" onClick={() => setShowDeleteCategory(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            <div className="delete-modal-content">
              <div className="delete-warning">
                <div className="warning-icon">⚠️</div>
                <h4>Delete Equipment Category?</h4>
                <p>
                  This will permanently delete the category. Any equipment using this 
                  category will need to be reassigned to a different category first.
                </p>
              </div>
              
              <div className="delete-actions">
                <button className="cancel-btn" onClick={() => setShowDeleteCategory(null)}>
                  Cancel
                </button>
                <button className="confirm-delete-btn" onClick={() => handleDeleteCategory(showDeleteCategory)}>
                  Delete Category
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quick View Side Panel - Ultra Professional */}
      {showQuickView && (
        <>
          <div className="side-modal-overlay" onClick={() => setShowQuickView(null)} />
          <div className="quick-view-side-panel">
            <div className="quick-view-header">
              <div className="quick-view-title">
                <h3>{equipmentTypes.find(t => t.key === showQuickView)?.name} Equipment</h3>
                <span className="quick-view-subtitle">
                  {equipment.filter(eq => eq.equipment_type === equipmentTypes.find(t => t.key === showQuickView)?.name).length} items
                </span>
              </div>
              <button className="modal-close" onClick={() => setShowQuickView(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            <div className="quick-view-content">
              {equipment.filter(eq => eq.equipment_type === equipmentTypes.find(t => t.key === showQuickView)?.name).length === 0 ? (
                <div className="quick-view-empty">
                  <div className="empty-icon">📋</div>
                  <h4>No Equipment in Category</h4>
                  <p>No equipment has been added to this category yet.</p>
                </div>
              ) : (
                <div className="quick-view-equipment-list">
                  {equipment
                    .filter(eq => eq.equipment_type === equipmentTypes.find(t => t.key === showQuickView)?.name)
                    .map(item => (
                      <div key={item.id} className="quick-view-item">
                        <div className="quick-view-item-info">
                          <h4>{item.equipment_name}</h4>
                          <div className="item-details">
                            {item.registration_number && (
                              <span className="registration">Reg: {item.registration_number}</span>
                            )}
                            <span className="added-date">
                              Added: {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="quick-view-item-status">
                          <span className={`status-indicator ${item.is_operational ? 'operational' : 'maintenance'}`}>
                            {item.is_operational ? 'Operational' : 'Maintenance'}
                          </span>
                          <button 
                            className="quick-manage-btn"
                            onClick={() => {
                              const companySlug = window.location.pathname.split('/')[1]
                              navigate(`/${companySlug}/equipment/${item.equipment_type_key}/${item.id}`)
                            }}
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              
              <div className="quick-view-actions">
                <button 
                  className="view-all-btn"
                  onClick={() => {
                    const companySlug = window.location.pathname.split('/')[1]
                    const category = categories.find(c => c.name === equipmentTypes.find(t => t.key === showQuickView)?.name)
                    if (category) {
                      navigate(`/${companySlug}/equipment/categories/${category.id}`)
                    }
                  }}
                >
                  Manage Category
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </>
  )
}

export default EquipmentManagement
