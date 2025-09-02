import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import DashboardLayout from './DashboardLayout'
import './ServiceManagement.css'

interface ServiceCategory {
  id: string
  name: string
  description: string
  icon: string
  serviceCount: number
}

interface Service {
  id: string
  name: string
  description: string
  estimated_duration_hours: number
  base_price: number
  min_tank_capacity_litres: number
  max_tank_capacity_litres: number
  service_complexity: string
  category_name: string
  category_icon: string
  equipment_requirements: any[]
  skill_requirements: any[]
}

interface ServiceStats {
  totalServices: number
  totalCategories: number
  emergencyServices: number
  averagePrice: number
}

const ServiceManagement = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [stats, setStats] = useState<ServiceStats>({ totalServices: 0, totalCategories: 0, emergencyServices: 0, averagePrice: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showServiceDetails, setShowServiceDetails] = useState<string | null>(null)

  useEffect(() => {
    loadServicesData()
  }, [])

  const loadServicesData = async () => {
    try {
      setIsLoading(true)

      // Load service categories with service counts
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('service_categories')
        .select(`
          id, name, description, icon,
          services(count)
        `)
        .order('sort_order')

      if (categoriesError) throw categoriesError

      const categoriesWithCounts = (categoriesData || []).map(cat => ({
        ...cat,
        serviceCount: cat.services?.length || 0
      }))

      setCategories(categoriesWithCounts as ServiceCategory[])

      // Load all services with category and requirements information
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          id, name, description, estimated_duration_hours, base_price,
          min_tank_capacity_litres, max_tank_capacity_litres, service_complexity,
          emergency_service,
          service_categories(name, icon),
          service_equipment_requirements(*),
          service_skill_requirements(*)
        `)
        .eq('is_active', true)
        .order('name')

      if (servicesError) throw servicesError

      const servicesWithDetails = (servicesData || []).map(service => ({
        ...service,
        category_name: (service.service_categories as any)?.name || 'Uncategorized',
        category_icon: (service.service_categories as any)?.icon || '📋',
        equipment_requirements: service.service_equipment_requirements || [],
        skill_requirements: service.service_skill_requirements || []
      }))

      setServices(servicesWithDetails as Service[])

      // Calculate stats
      const totalServices = servicesData?.length || 0
      const emergencyServices = servicesData?.filter(s => s.emergency_service).length || 0
      const averagePrice = servicesData?.length > 0 
        ? servicesData.reduce((sum, s) => sum + (s.base_price || 0), 0) / servicesData.length 
        : 0

      setStats({
        totalServices,
        totalCategories: categoriesData?.length || 0,
        emergencyServices,
        averagePrice: Math.round(averagePrice)
      })

    } catch (error) {
      console.error('Error loading services data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddService = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setShowAddModal(true)
  }

  const handleDeleteService = async (serviceId: string) => {
    try {
      // TODO: Check if service is used in any bookings/jobs
      
      // Delete the service (cascade will handle requirements)
      const { error: deleteError } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)

      if (deleteError) throw deleteError

      // Reload data
      await loadServicesData()
      setShowDeleteConfirm(null)

    } catch (error) {
      console.error('Error deleting service:', error)
      alert('Error deleting service. Please try again.')
    }
  }

  const filteredServices = services.filter(service => {
    return filterCategory === 'all' || service.category_name === filterCategory
  })

  if (isLoading) {
    return (
      <DashboardLayout currentPage="Services">
        <div className="services-loading">
          <div className="loading-spinner"></div>
          <p>Loading services data...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout currentPage="Services">
      <div className="service-management">
        <div className="service-header">
          <div className="service-title-section">
            <h1>Service Catalog Management</h1>
            <p>Define your service offerings, requirements, and pricing structure</p>
          </div>
          
          <div className="service-actions">
            <button 
              className="manage-categories-btn"
              onClick={() => alert('Service category management will be implemented next')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Manage Categories
            </button>
            <button 
              className="add-service-btn"
              onClick={() => setShowAddModal(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Add Service
            </button>
          </div>
        </div>

        {/* Service Statistics */}
        <div className="service-stats">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <h3>{stats.totalServices}</h3>
              <p>Total Services</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🚨</div>
            <div className="stat-content">
              <h3>{stats.emergencyServices}</h3>
              <p>Emergency Services</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>£{stats.averagePrice}</h3>
              <p>Average Price</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏷️</div>
            <div className="stat-content">
              <h3>{stats.totalCategories}</h3>
              <p>Service Categories</p>
            </div>
          </div>
        </div>

        {/* Service Categories Overview */}
        <div className="service-categories">
          <h2>Services by Category</h2>
          <div className="category-grid">
            {categories.map(category => (
              <div key={category.id} className="category-card">
                <div className="category-header">
                  <div className="category-icon">{category.icon}</div>
                  <div className="category-content">
                    <h3>{category.name}</h3>
                    <p>{category.serviceCount} services</p>
                  </div>
                  <button 
                    className="category-add-btn"
                    onClick={() => handleAddService(category.id)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
                <div className="category-description">
                  <p>{category.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Services List */}
        <div className="services-list-section">
          <div className="services-list-header">
            <h2>Service Catalog</h2>
            <div className="services-filters">
              <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredServices.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No Services Found</h3>
              <p>Adjust your filters or add new services to build your catalog.</p>
              <button 
                className="empty-state-btn"
                onClick={() => setShowAddModal(true)}
              >
                Add Your First Service
              </button>
            </div>
          ) : (
            <div className="services-grid">
              {filteredServices.map(service => (
                <div key={service.id} className="service-card">
                  <div className="service-card-header">
                    <div className="service-category-badge">
                      {service.category_icon} {service.category_name}
                    </div>
                    <div className="service-badges">
                      <span className={`complexity-badge ${service.service_complexity.toLowerCase()}`}>
                        {service.service_complexity}
                      </span>
                      {service.min_tank_capacity_litres && (
                        <span className="capacity-badge">
                          {service.min_tank_capacity_litres}L - {service.max_tank_capacity_litres || '∞'}L
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="service-card-content">
                    <h3>{service.name}</h3>
                    <p>{service.description}</p>
                    
                    <div className="service-details">
                      <div className="service-detail">
                        <strong>Duration:</strong> {service.estimated_duration_hours}h
                      </div>
                      <div className="service-detail">
                        <strong>Price:</strong> £{service.base_price}
                      </div>
                      <div className="service-detail">
                        <strong>Equipment:</strong> {service.equipment_requirements.length} types required
                      </div>
                      <div className="service-detail">
                        <strong>Skills:</strong> {service.skill_requirements.length} skills required
                      </div>
                    </div>
                  </div>
                  
                  <div className="service-card-actions">
                    <button className="edit-btn">Edit</button>
                    <button className="view-btn" onClick={() => setShowServiceDetails(service.id)}>
                      View Details
                    </button>
                    <button className="requirements-btn">
                      Requirements
                    </button>
                    <button className="pricing-btn">
                      Pricing
                    </button>
                    <button className="delete-btn" onClick={() => setShowDeleteConfirm(service.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Service Modal */}
        {showAddModal && (
          <>
            <div className="modal-overlay" onClick={() => setShowAddModal(false)} />
            <div className="service-modal">
              <div className="service-modal-header">
                <h3>Add New Service</h3>
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
              
              <div className="service-modal-content">
                <div className="service-category-selector">
                  <h4>Choose Service Category</h4>
                  <p>Select the category for the new service:</p>
                  
                  <div className="service-category-grid">
                    {categories.map(category => (
                      <div 
                        key={category.id}
                        className="service-category-card" 
                        onClick={() => {
                          alert(`${category.name} service form will be implemented in next phase`)
                          setShowAddModal(false)
                        }}
                      >
                        <div className="service-category-icon">{category.icon}</div>
                        <h5>{category.name}</h5>
                        <p>{category.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <>
            <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)} />
            <div className="delete-modal">
              <div className="delete-modal-header">
                <h3>Delete Service</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              
              <div className="delete-modal-content">
                <div className="delete-warning">
                  <div className="warning-icon">⚠️</div>
                  <h4>Are you sure you want to delete this service?</h4>
                  <p>
                    This action cannot be undone. The service and all its requirements 
                    will be permanently removed. Any bookings using this service may be affected.
                  </p>
                </div>
                
                <div className="delete-actions">
                  <button 
                    className="cancel-btn"
                    onClick={() => setShowDeleteConfirm(null)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="confirm-delete-btn"
                    onClick={() => handleDeleteService(showDeleteConfirm)}
                  >
                    Delete Service
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Service Details Modal */}
        {showServiceDetails && (
          <>
            <div className="modal-overlay" onClick={() => setShowServiceDetails(null)} />
            <div className="service-details-modal">
              <div className="service-details-header">
                <h3>Service Requirements & Details</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowServiceDetails(null)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              
              <div className="service-details-content">
                <div className="details-placeholder">
                  <div className="placeholder-icon">📋</div>
                  <h4>Service Requirements System</h4>
                  <p>
                    Service requirements interface will show detailed information about:
                  </p>
                  <ul>
                    <li>Equipment requirements and specifications</li>
                    <li>Skill requirements and proficiency levels</li>
                    <li>License validation requirements</li>
                    <li>Cost breakdown and margin analysis</li>
                    <li>Pricing variations by region and customer type</li>
                  </ul>
                  <button 
                    className="placeholder-btn"
                    onClick={() => setShowServiceDetails(null)}
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

export default ServiceManagement
