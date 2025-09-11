import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './ServiceManagement.css'

interface Service {
  id: string
  name: string
  service_code: string | null
}

const ServiceManagement = () => {
  const navigate = useNavigate()
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [departments, setDepartments] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')

  useEffect(() => {
    loadServices()
    loadDepartments()
  }, [])

  const loadServices = async () => {
    try {
      setIsLoading(true)

      // Load services - id, name, and service_code
      const { data: servicesData, error } = await supabase
        .from('services')
        .select('id, name, service_code')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setServices(servicesData || [])

    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      const { data: departmentsData, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('is_active', true)
        .in('name', ['Transport', 'Surveying', 'Construction'])
        .order('name')

      if (error) throw error
      setDepartments(departmentsData || [])
    } catch (error) {
      console.error('Error loading departments:', error)
    }
  }

  const handleCreateService = async () => {
    try {
      if (!newServiceName.trim()) {
        alert('Please enter a service name')
        return
      }

      const { error } = await supabase
        .from('services')
        .insert([{
          name: newServiceName,
          is_active: true
        }])

      if (error) throw error

      // Reset form and reload
      setNewServiceName('')
      setShowAddModal(false)
      await loadServices()

    } catch (error) {
      console.error('Error creating service:', error)
      alert('Error creating service. Please try again.')
    }
  }

  const createServiceSlug = (service: Service) => {
    // Use service_code if available, otherwise create slug from name
    if (service.service_code) {
      return service.service_code.toLowerCase().replace(/_/g, '-')
    }
    return service.name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
  }

  const handleServiceClick = (service: Service) => {
    // Get current company slug from URL
    const companySlug = window.location.pathname.split('/')[1]
    const serviceSlug = createServiceSlug(service)
    navigate(`/${companySlug}/services/${serviceSlug}`)
  }

  const filteredServices = services.filter(service => {
    if (departmentFilter === 'all') return true
    // For now, show all services for any department filter
    // This can be enhanced later when we have department-service relationships
    return true
  })

  if (isLoading) {
    return (
      <div className="service-loading">
        <div className="loading-spinner"></div>
        <p>Loading services...</p>
      </div>
    )
  }

  return (
    <div className="service-management">
      {/* Header */}
      <div className="service-header">
        <div className="service-title-section">
          <h1>Service Catalog</h1>
          <p>Manage services, requirements, and pricing across all business units</p>
        </div>
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

      {/* Filters */}
      <div className="service-filters">
        <div className="filter-group">
          <label>Department:</label>
          <select 
            value={departmentFilter} 
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Services List */}
      <div className="services-list">
        <div className="list-header">
          <div className="header-cell">Service Name</div>
        </div>

        {filteredServices.length === 0 ? (
          <div className="empty-state">
            <p>No services found.</p>
            <button onClick={() => setShowAddModal(true)}>Add First Service</button>
          </div>
        ) : (
          filteredServices.map(service => (
            <div 
              key={service.id} 
              className="list-row clickable-row"
              onClick={() => handleServiceClick(service)}
            >
              <div className="cell service-name-cell">
                {service.name}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Service Modal */}
      {showAddModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowAddModal(false)} />
          <div className="add-service-modal">
            <div className="modal-header">
              <h3>Add New Service</h3>
              <button onClick={() => setShowAddModal(false)}>×</button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleCreateService(); }}>
              <div className="simple-form">
                <div className="form-group">
                  <label>Service Name</label>
                  <input
                    type="text"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="e.g., Tank Emptying"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit">Add Service</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

export default ServiceManagement