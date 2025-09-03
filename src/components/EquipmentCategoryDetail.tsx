import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

import './EquipmentCategoryDetail.css'

interface CategoryDetails {
  id: string
  name: string
  icon: string
  table_name: string
  requires_registration: boolean
  is_system_category: boolean
  equipment_count: number
  operational_equipment: number
}

interface CategoryEquipment {
  id: string
  equipment_name: string
  registration_number?: string
  is_operational: boolean
  capacity?: number
  created_at: string
}

const EquipmentCategoryDetail = () => {
  const { categoryId } = useParams<{ categoryId: string }>()
  const navigate = useNavigate()
  const [category, setCategory] = useState<CategoryDetails | null>(null)
  const [equipment, setEquipment] = useState<CategoryEquipment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [showReassignModal, setShowReassignModal] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    description: ''
  })

  const systemCategories = ['Tanker', 'Jet Vac', 'Excavator', 'Dumper Truck', 'CCTV Drain Camera', 'Van', 'Trailer', 'General Equipment']

  useEffect(() => {
    if (categoryId) {
      loadCategoryDetails()
    }
  }, [categoryId])

  const loadCategoryDetails = async () => {
    try {
      setIsLoading(true)

      // Load category details
      const { data: categoryData, error: categoryError } = await supabase
        .from('major_equipment_types')
        .select('*')
        .eq('id', categoryId)
        .single()

      if (categoryError) throw categoryError

      const categoryDetails = {
        ...categoryData,
        is_system_category: systemCategories.includes(categoryData.name),
        equipment_count: 0,
        operational_equipment: 0
      }

      setCategory(categoryDetails)
      setFormData({
        name: categoryData.name,
        icon: categoryData.icon,
        description: ''
      })

      // Load equipment in this category (simplified - would need to query specific table)
      await loadCategoryEquipment(categoryData.table_name)

    } catch (error) {
      console.error('Error loading category details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCategoryEquipment = async (tableName: string) => {
    try {
      // Get current user's business unit
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('business_unit_id')
        .eq('id', user.id)
        .single()

      if (!userData) return

      // Load equipment from the specific table
      const { data: equipmentData, error: equipmentError } = await supabase
        .from(tableName)
        .select('id, equipment_name, registration_number, is_operational, created_at')
        .eq('business_unit_id', userData.business_unit_id)

      if (equipmentError) {
        console.error(`Error loading equipment from ${tableName}:`, equipmentError)
        return
      }

      setEquipment(equipmentData || [])

      // Update category with equipment counts
      if (category) {
        setCategory(prev => prev ? {
          ...prev,
          equipment_count: equipmentData?.length || 0,
          operational_equipment: equipmentData?.filter(eq => eq.is_operational).length || 0
        } : null)
      }

    } catch (error) {
      console.error('Error loading category equipment:', error)
    }
  }

  const handleSaveCategory = async () => {
    try {
      if (!category || !formData.name.trim()) return

      const { error } = await supabase
        .from('major_equipment_types')
        .update({
          name: formData.name,
          icon: formData.icon
        })
        .eq('id', category.id)

      if (error) throw error

      await loadCategoryDetails()
      setIsEditing(false)

    } catch (error) {
      console.error('Error updating category:', error)
      alert('Error updating category. Please try again.')
    }
  }

  const handleDeleteCategory = async () => {
    try {
      if (!category) return

      if (category.is_system_category) {
        alert('System categories cannot be deleted as they are required for functionality.')
        return
      }

      if (category.equipment_count > 0) {
        alert('Cannot delete category with equipment assigned. Please reassign equipment first.')
        return
      }

      const { error } = await supabase
        .from('major_equipment_types')
        .delete()
        .eq('id', category.id)

      if (error) throw error

      // Navigate back to categories management
      const companySlug = window.location.pathname.split('/')[1]
      navigate(`/${companySlug}/equipment/categories`)

    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Error deleting category. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="category-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading category details...</p>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="category-detail-error">
        <h2>Category Not Found</h2>
        <p>The requested category could not be loaded.</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    )
  }

  return (
    <div className="equipment-management">
        {/* Category Header */}
        <div className="equipment-header">
          <div className="equipment-title-section">
            <div className="category-breadcrumb">
              <button onClick={() => navigate(-1)} className="breadcrumb-link">
                Equipment Categories
              </button>
              <span className="breadcrumb-separator">→</span>
              <span className="breadcrumb-current">{category.name}</span>
            </div>
            <div className="category-title-row-sharp">
              <div className="category-title-info-sharp">
                <h1>{category.name}</h1>
                <div className="category-meta-info">
                  <span className={`category-type-indicator ${category.is_system_category ? 'system' : 'custom'}`}>
                    {category.is_system_category ? 'System Category' : 'Custom Category'}
                  </span>
                  <span className="equipment-count-meta">{category.equipment_count} equipment items</span>
                  <span className="operational-count-meta">{category.operational_equipment} operational</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="equipment-actions">
            <button 
              className="edit-category-btn"
              onClick={() => setIsEditing(!isEditing)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              {isEditing ? 'Save Changes' : 'Edit Category'}
            </button>
            
            {!category.is_system_category && (
              <button 
                className="delete-category-btn"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6" />
                  <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2" />
                </svg>
                Delete Category
              </button>
            )}
          </div>
        </div>

        {/* Category Statistics - Ultra Sharp */}
        <div className="category-stats-sharp">
          <div className="stat-card-sharp">
            <div className="stat-content-sharp">
              <div className="stat-value-sharp">{category.equipment_count}</div>
              <div className="stat-label-sharp">Total Equipment</div>
            </div>
          </div>
          <div className="stat-card-sharp">
            <div className="stat-content-sharp">
              <div className="stat-value-sharp operational">{category.operational_equipment}</div>
              <div className="stat-label-sharp">Operational</div>
            </div>
          </div>
          <div className="stat-card-sharp">
            <div className="stat-content-sharp">
              <div className="stat-value-sharp maintenance">{category.equipment_count - category.operational_equipment}</div>
              <div className="stat-label-sharp">Needs Service</div>
            </div>
          </div>
          <div className="stat-card-sharp">
            <div className="stat-content-sharp">
              <div className="stat-value-sharp value">£{(category.equipment_count * 25000).toLocaleString()}</div>
              <div className="stat-label-sharp">Estimated Value</div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="category-edit-form">
            <div className="form-header">
              <h2>Edit Category Details</h2>
            </div>
            
            <div className="form-content">
              <div className="form-row">
                <div className="form-group">
                  <label>Category Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={category.is_system_category}
                  />
                  {category.is_system_category && (
                    <small>System category names cannot be changed</small>
                  )}
                </div>
                <div className="form-group">
                  <label>Icon</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    maxLength={2}
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button className="cancel-btn" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button className="save-btn" onClick={handleSaveCategory}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Equipment in Category */}
        <div className="category-equipment">
          <div className="equipment-header">
            <h2>Equipment in {category.name} Category</h2>
            <div className="equipment-actions">
              <button className="add-equipment-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Equipment to Category
              </button>
            </div>
          </div>

          {equipment.length === 0 ? (
            <div className="empty-equipment">
              <div className="empty-icon">⚙️</div>
              <h3>No Equipment in Category</h3>
              <p>Add equipment to this category to start organizing your fleet.</p>
              <button className="empty-add-btn">
                Add First Equipment
              </button>
            </div>
          ) : (
            <div className="equipment-table">
              <div className="equipment-table-header">
                <div className="table-cell header">Equipment</div>
                <div className="table-cell header">Registration</div>
                <div className="table-cell header">Status</div>
                <div className="table-cell header">Added</div>
                <div className="table-cell header">Actions</div>
              </div>
              
              {equipment.map(item => (
                <div key={item.id} className="equipment-row">
                  <div className="table-cell equipment-info">
                    <div className="equipment-details">
                      <h4>{item.equipment_name}</h4>
                      <span className="equipment-id">ID: {item.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                  
                  <div className="table-cell">
                    <span className="registration">
                      {item.registration_number || 'Not Registered'}
                    </span>
                  </div>
                  
                  <div className="table-cell">
                    <span className={`status-badge ${item.is_operational ? 'operational' : 'maintenance'}`}>
                      {item.is_operational ? 'Operational' : 'Maintenance'}
                    </span>
                  </div>
                  
                  <div className="table-cell">
                    <span className="date">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="table-cell actions">
                    <div className="action-buttons">
                      <button className="action-btn view-btn" title="View Equipment">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      
                      <button className="action-btn edit-btn" title="Edit Equipment">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      
                      <button 
                        className="action-btn reassign-btn" 
                        onClick={() => setShowReassignModal(item.id)}
                        title="Reassign Category"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="16,18 22,12 16,6" />
                          <polyline points="8,6 2,12 8,18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reassign Equipment Modal */}
        {showReassignModal && (
          <>
            <div className="modal-overlay" onClick={() => setShowReassignModal(null)} />
            <div className="reassign-modal">
              <div className="reassign-modal-header">
                <h3>Reassign Equipment Category</h3>
                <button className="modal-close" onClick={() => setShowReassignModal(null)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              
              <div className="reassign-modal-content">
                <div className="reassign-placeholder">
                  <div className="placeholder-icon">🔄</div>
                  <h4>Equipment Reassignment System</h4>
                  <p>
                    Equipment reassignment interface will allow you to:
                  </p>
                  <ul>
                    <li>Move equipment between categories</li>
                    <li>Bulk reassignment operations</li>
                    <li>Category transfer validation</li>
                    <li>Equipment compatibility checking</li>
                  </ul>
                  <button className="placeholder-btn" onClick={() => setShowReassignModal(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <>
            <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)} />
            <div className="delete-modal">
              <div className="delete-modal-header">
                <h3>Delete Equipment Category</h3>
                <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              
              <div className="delete-modal-content">
                <div className="delete-warning">
                  <div className="warning-icon">⚠️</div>
                  <h4>Permanently Delete {category.name} Category?</h4>
                  <p>
                    This action cannot be undone. The category will be permanently removed 
                    and any equipment assignments will need to be updated.
                  </p>
                </div>
                
                <div className="delete-actions">
                  <button className="cancel-btn" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </button>
                  <button className="confirm-delete-btn" onClick={handleDeleteCategory}>
                    Delete Category
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
  )
}

export default EquipmentCategoryDetail
