import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

import './EquipmentCategoriesManagement.css'

interface EquipmentCategory {
  id: string
  name: string
  icon: string
  table_name: string
  requires_registration: boolean
  is_active: boolean
  equipment_count: number
  is_system_category: boolean
  created_at: string
}

const EquipmentCategoriesManagement = () => {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<EquipmentCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<EquipmentCategory | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    icon: '⚙️',
    description: ''
  })

  const systemCategories = ['Tanker', 'Jet Vac', 'Excavator', 'Dumper Truck', 'CCTV Drain Camera', 'Van', 'Trailer', 'General Equipment']

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setIsLoading(true)

      // Load categories with equipment counts
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('major_equipment_types')
        .select('*')
        .order('name')

      if (categoriesError) throw categoriesError

      // For each category, count equipment (this is simplified - would need to query each equipment table)
      const categoriesWithCounts = (categoriesData || []).map(category => ({
        ...category,
        equipment_count: 0, // Placeholder - would calculate from equipment tables
        is_system_category: systemCategories.includes(category.name)
      }))

      setCategories(categoriesWithCounts)

    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCategory = async () => {
    try {
      if (!formData.name.trim()) {
        alert('Category name is required')
        return
      }

      const { error } = await supabase
        .from('major_equipment_types')
        .insert({
          name: formData.name,
          icon: formData.icon,
          table_name: `${formData.name.toLowerCase().replace(/\s+/g, '_')}_equipment`,
          requires_registration: true
        })

      if (error) throw error

      // Reset form and reload
      setFormData({ name: '', icon: '⚙️', description: '' })
      setShowAddForm(false)
      await loadCategories()

    } catch (error) {
      console.error('Error adding category:', error)
      alert('Error adding category. Please try again.')
    }
  }

  const handleEditCategory = async () => {
    try {
      if (!editingCategory || !formData.name.trim()) return

      const { error } = await supabase
        .from('major_equipment_types')
        .update({
          name: formData.name,
          icon: formData.icon
        })
        .eq('id', editingCategory.id)

      if (error) throw error

      // Reset form and reload
      setFormData({ name: '', icon: '⚙️', description: '' })
      setEditingCategory(null)
      await loadCategories()

    } catch (error) {
      console.error('Error updating category:', error)
      alert('Error updating category. Please try again.')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const category = categories.find(c => c.id === categoryId)
      if (!category) return

      if (category.is_system_category) {
        alert('System categories cannot be deleted as they are required for functionality.')
        return
      }

      // TODO: Check if category has equipment assigned
      if (category.equipment_count > 0) {
        alert('Cannot delete category with equipment assigned. Please reassign equipment first.')
        return
      }

      const { error } = await supabase
        .from('major_equipment_types')
        .delete()
        .eq('id', categoryId)

      if (error) throw error

      await loadCategories()
      setShowDeleteConfirm(null)

    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Error deleting category. Please try again.')
    }
  }

  const startEdit = (category: EquipmentCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      icon: category.icon,
      description: ''
    })
  }

  const cancelEdit = () => {
    setEditingCategory(null)
    setFormData({ name: '', icon: '⚙️', description: '' })
    setShowAddForm(false)
  }

  if (isLoading) {
    return (
      <div className="categories-loading">
        <div className="loading-spinner"></div>
        <p>Loading equipment categories...</p>
      </div>
    )
  }

  return (
    <div className="equipment-management">
        {/* Page Header */}
        <div className="equipment-header">
          <div className="equipment-title-section">
            <div className="categories-breadcrumb">
              <button onClick={() => navigate(-1)} className="breadcrumb-link">
                Equipment Management
              </button>
              <span className="breadcrumb-separator">→</span>
              <span className="breadcrumb-current">Equipment Categories</span>
            </div>
            <h1>Equipment Categories Management</h1>
            <p>Organize and manage equipment categories for your business operations</p>
          </div>
          
          <div className="equipment-actions">
            <button 
              className="add-category-btn"
              onClick={() => setShowAddForm(true)}
              disabled={showAddForm || editingCategory}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Add Category
            </button>
          </div>
        </div>

        {/* Categories Statistics - Ultra Sharp */}
        <div className="categories-stats-sharp">
          <div className="stat-item-sharp">
            <div className="stat-value-sharp">{categories.length}</div>
            <div className="stat-label-sharp">Total Categories</div>
          </div>
          <div className="stat-item-sharp">
            <div className="stat-value-sharp system">{categories.filter(c => c.is_system_category).length}</div>
            <div className="stat-label-sharp">System Categories</div>
          </div>
          <div className="stat-item-sharp">
            <div className="stat-value-sharp custom">{categories.filter(c => !c.is_system_category).length}</div>
            <div className="stat-label-sharp">Custom Categories</div>
          </div>
          <div className="stat-item-sharp">
            <div className="stat-value-sharp total">{categories.reduce((sum, c) => sum + c.equipment_count, 0)}</div>
            <div className="stat-label-sharp">Total Equipment</div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingCategory) && (
          <div className="category-form-section">
            <div className="form-header">
              <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
              <button className="form-close-btn" onClick={cancelEdit}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            <div className="category-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Category Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Specialized Equipment"
                    disabled={editingCategory?.is_system_category}
                  />
                  {editingCategory?.is_system_category && (
                    <small>System category names cannot be changed</small>
                  )}
                </div>
                <div className="form-group">
                  <label>Icon</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder="⚙️"
                    maxLength={2}
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button className="cancel-btn" onClick={cancelEdit}>
                  Cancel
                </button>
                <button 
                  className="save-btn"
                  onClick={editingCategory ? handleEditCategory : handleAddCategory}
                >
                  {editingCategory ? 'Save Changes' : 'Add Category'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Categories List - Professional Table Layout */}
        <div className="categories-table-section">
          <div className="table-header">
            <h2>Equipment Categories</h2>
            <div className="table-info">
              <span>{categories.length} categories</span>
            </div>
          </div>
          
          <div className="categories-table">
            <div className="table-header-row">
              <div className="table-cell header">Category</div>
              <div className="table-cell header">Type</div>
              <div className="table-cell header">Equipment Count</div>
              <div className="table-cell header">Status</div>
              <div className="table-cell header">Actions</div>
            </div>
            
            {categories.map(category => (
              <div key={category.id} className="table-row">
                <div className="table-cell category-info">
                  <div className="category-details-sharp">
                    <h4 className="category-name-sharp">{category.name}</h4>
                    <span className="category-id-sharp">ID: {category.id.slice(0, 8)}...</span>
                  </div>
                </div>
                
                <div className="table-cell">
                  <span className={`category-type-badge ${category.is_system_category ? 'system' : 'custom'}`}>
                    {category.is_system_category ? 'System' : 'Custom'}
                  </span>
                </div>
                
                <div className="table-cell">
                  <div className="equipment-count">
                    <span className="count-number">{category.equipment_count}</span>
                    <span className="count-label">items</span>
                  </div>
                </div>
                
                <div className="table-cell">
                  <span className={`status-badge ${category.is_active ? 'active' : 'inactive'}`}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="table-cell actions">
                  <div className="action-buttons">
                    <button 
                      className="action-btn view-btn"
                      onClick={() => alert(`Quick view for ${category.name} equipment will be implemented`)}
                      title="Quick View Equipment"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                    
                    <button 
                      className="action-btn edit-btn"
                      onClick={() => startEdit(category)}
                      title="Edit Category"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    
                    <button 
                      className="action-btn manage-btn"
                      onClick={() => {
                        const companySlug = window.location.pathname.split('/')[1]
                        navigate(`/${companySlug}/equipment/categories/${category.id}`)
                      }}
                      title="Manage Category"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 1v6m0 6v6" />
                        <path d="M21 12h-6m-6 0H3" />
                      </svg>
                    </button>
                    
                    {!category.is_system_category && (
                      <button 
                        className="action-btn delete-btn"
                        onClick={() => setShowDeleteConfirm(category.id)}
                        title="Delete Category"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3,6 5,6 21,6" />
                          <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <>
            <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)} />
            <div className="delete-confirmation-modal">
              <div className="delete-modal-header">
                <h3>Delete Equipment Category</h3>
                <button className="modal-close" onClick={() => setShowDeleteConfirm(null)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              
              <div className="delete-modal-content">
                <div className="delete-warning">
                  <div className="warning-icon">⚠️</div>
                  <h4>Permanently Delete Category?</h4>
                  <p>
                    This action cannot be undone. The category will be permanently removed 
                    and any equipment assignments will need to be updated.
                  </p>
                </div>
                
                <div className="delete-actions">
                  <button className="cancel-btn" onClick={() => setShowDeleteConfirm(null)}>
                    Cancel
                  </button>
                  <button className="confirm-delete-btn" onClick={() => handleDeleteCategory(showDeleteConfirm)}>
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

export default EquipmentCategoriesManagement
