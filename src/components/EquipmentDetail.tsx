import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './EquipmentDetail.css'

interface EquipmentDetails {
  id: string
  equipment_name: string
  registration_number?: string
  capacity_litres?: number
  pressure_psi?: number
  is_operational: boolean
  insurance_company?: string
  insurance_expiry_date?: string
  mot_expiry_date?: string
  service_due_date?: string
  purchase_cost?: number
  current_value?: number
  equipment_type: string
  business_unit_name: string
}

interface ServiceCompatibility {
  service_id: string
  service_name: string
  is_compatible: boolean
  compatibility_reason: string
  required_capacity: number
  equipment_capacity: number
}

interface SkillRequirement {
  skill_id: string
  skill_name: string
  certified_employees: number
  total_employees: number
}

const EquipmentDetail = () => {
  const { equipmentType, equipmentId } = useParams<{ equipmentType: string; equipmentId: string }>()
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState<EquipmentDetails | null>(null)
  const [serviceCompatibility, setServiceCompatibility] = useState<ServiceCompatibility[]>([])
  const [skillRequirements, setSkillRequirements] = useState<SkillRequirement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [showSkillModal, setShowSkillModal] = useState(false)

  useEffect(() => {
    if (equipmentType && equipmentId) {
      loadEquipmentDetails()
    }
  }, [equipmentType, equipmentId])

  const loadEquipmentDetails = async () => {
    try {
      setIsLoading(true)

      // Determine which table to query based on equipment type
      const tableMap: { [key: string]: string } = {
        'tanker': 'tanker_equipment',
        'jetvac': 'jetvac_equipment', 
        'excavator': 'excavator_equipment',
        'dumper': 'dumper_truck_equipment',
        'cctv': 'cctv_camera_equipment',
        'van': 'van_equipment',
        'trailer': 'trailer_equipment',
        'general': 'general_equipment'
      }

      const tableName = tableMap[equipmentType || '']
      if (!tableName) {
        throw new Error('Invalid equipment type')
      }

      // Load equipment details with business unit info
      const { data: equipmentData, error: equipmentError } = await supabase
        .from(tableName)
        .select(`
          *,
          business_units!inner(name)
        `)
        .eq('id', equipmentId)
        .single()

      if (equipmentError) throw equipmentError

      const equipmentDetails = {
        ...equipmentData,
        equipment_type: equipmentType,
        business_unit_name: (equipmentData.business_units as any)?.name || 'Unknown'
      }

      setEquipment(equipmentDetails)

      // Load service compatibility
      await loadServiceCompatibility(equipmentData)

      // Load skill requirements for operating this equipment
      await loadSkillRequirements(equipmentType)

    } catch (error) {
      console.error('Error loading equipment details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadServiceCompatibility = async (equipmentData: any) => {
    try {
      // Get all services that use this equipment type
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select(`
          id, name,
          service_equipment_requirements!inner(
            equipment_type, minimum_capacity, maximum_capacity
          )
        `)
        .eq('service_equipment_requirements.equipment_type', equipmentType)

      if (servicesError) throw servicesError

      // Analyze compatibility for each service
      const compatibility = (services || []).map(service => {
        const requirement = (service.service_equipment_requirements as any)[0]
        const equipmentCapacity = equipmentData.capacity_litres || equipmentData.pressure_psi || 0
        
        let isCompatible = true
        let reason = 'Fully compatible'
        
        if (requirement.minimum_capacity && equipmentCapacity < requirement.minimum_capacity) {
          isCompatible = false
          reason = `Capacity too low (needs ${requirement.minimum_capacity}, has ${equipmentCapacity})`
        } else if (requirement.maximum_capacity && equipmentCapacity > requirement.maximum_capacity) {
          isCompatible = false  
          reason = `Capacity too high (max ${requirement.maximum_capacity}, has ${equipmentCapacity})`
        }

        return {
          service_id: service.id,
          service_name: service.name,
          is_compatible: isCompatible,
          compatibility_reason: reason,
          required_capacity: requirement.minimum_capacity || 0,
          equipment_capacity: equipmentCapacity
        }
      })

      setServiceCompatibility(compatibility)

    } catch (error) {
      console.error('Error loading service compatibility:', error)
    }
  }

  const loadSkillRequirements = async (equipmentType: string) => {
    try {
      // Get skills required to operate this equipment type
      // This is a simplified version - would need more complex logic in production
      const skillMap: { [key: string]: string[] } = {
        'tanker': ['HGV Class 2 License', 'Tank Emptying Operations'],
        'jetvac': ['Jetvac Operation', 'Car Driving License'],
        'excavator': ['Excavator Operation', 'HGV Class 2 License'],
        'van': ['Car Driving License'],
        'cctv': ['CCTV Drain Survey']
      }

      const requiredSkillNames = skillMap[equipmentType] || []
      
      if (requiredSkillNames.length === 0) {
        setSkillRequirements([])
        return
      }

      // Get skill details and employee counts
      const { data: skillsData, error: skillsError } = await supabase
        .from('skills')
        .select(`
          id, name,
          employee_skills(count)
        `)
        .in('name', requiredSkillNames)

      if (skillsError) throw skillsError

      const skillRequirements = (skillsData || []).map(skill => ({
        skill_id: skill.id,
        skill_name: skill.name,
        certified_employees: (skill.employee_skills as any)?.length || 0,
        total_employees: 0 // Would need to calculate total employees
      }))

      setSkillRequirements(skillRequirements)

    } catch (error) {
      console.error('Error loading skill requirements:', error)
    }
  }

  const handleDeleteEquipment = async () => {
    try {
      const tableMap: { [key: string]: string } = {
        'tanker': 'tanker_equipment',
        'jetvac': 'jetvac_equipment', 
        'excavator': 'excavator_equipment',
        'dumper': 'dumper_truck_equipment',
        'cctv': 'cctv_camera_equipment',
        'van': 'van_equipment',
        'trailer': 'trailer_equipment',
        'general': 'general_equipment'
      }

      const tableName = tableMap[equipmentType || '']
      if (!tableName) return

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', equipmentId)

      if (error) throw error

      // Navigate back to equipment management
      const companySlug = equipment?.business_unit_name?.toLowerCase().replace(/\s+/g, '-')
      navigate(`/${companySlug}/equipment`)

    } catch (error) {
      console.error('Error deleting equipment:', error)
      alert('Error deleting equipment. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="equipment-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading equipment details...</p>
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className="equipment-detail-error">
        <h2>Equipment Not Found</h2>
        <p>The requested equipment could not be loaded.</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    )
  }

  return (
    <div className="equipment-detail">
        {/* Equipment Header */}
        <div className="equipment-detail-header">
          <div className="equipment-title-section">
            <div className="equipment-breadcrumb">
              <button onClick={() => navigate(-1)} className="breadcrumb-link">
                Equipment Management
              </button>
              <span className="breadcrumb-separator">→</span>
              <span className="breadcrumb-current">{equipment.equipment_name}</span>
            </div>
            <h1>{equipment.equipment_name}</h1>
            <p>
              {equipmentType?.charAt(0).toUpperCase() + equipmentType?.slice(1)} • 
              {equipment.business_unit_name} • 
              {equipment.is_operational ? 'Operational' : 'Maintenance Required'}
            </p>
          </div>
          
          <div className="equipment-actions">
            <button 
              className="edit-equipment-btn"
              onClick={() => setIsEditing(!isEditing)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              {isEditing ? 'Save Changes' : 'Edit Equipment'}
            </button>
            <button 
              className="delete-equipment-btn"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3,6 5,6 21,6" />
                <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2" />
              </svg>
              Delete Equipment
            </button>
          </div>
        </div>

        {/* Equipment Details Grid */}
        <div className="equipment-details-grid">
          {/* Basic Information */}
          <div className="detail-section">
            <div className="section-header">
              <h2>Equipment Information</h2>
              <div className={`status-indicator ${equipment.is_operational ? 'operational' : 'maintenance'}`}>
                {equipment.is_operational ? 'Operational' : 'Maintenance Required'}
              </div>
            </div>
            
            <div className="detail-grid">
              {equipment.registration_number && (
                <div className="detail-item">
                  <label>Registration Number</label>
                  <span>{equipment.registration_number}</span>
                </div>
              )}
              {equipment.capacity_litres && (
                <div className="detail-item">
                  <label>Capacity</label>
                  <span>{equipment.capacity_litres.toLocaleString()} Litres</span>
                </div>
              )}
              {equipment.pressure_psi && (
                <div className="detail-item">
                  <label>Pressure</label>
                  <span>{equipment.pressure_psi} PSI</span>
                </div>
              )}
              <div className="detail-item">
                <label>Business Unit</label>
                <span>{equipment.business_unit_name}</span>
              </div>
              {equipment.purchase_cost && (
                <div className="detail-item">
                  <label>Purchase Cost</label>
                  <span>£{equipment.purchase_cost.toLocaleString()}</span>
                </div>
              )}
              {equipment.current_value && (
                <div className="detail-item">
                  <label>Current Value</label>
                  <span>£{equipment.current_value.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Service Compatibility */}
          <div className="detail-section">
            <div className="section-header">
              <h2>Service Compatibility ({serviceCompatibility.length})</h2>
              <button 
                className="quick-view-btn"
                onClick={() => setShowServiceModal(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Quick View
              </button>
            </div>
            
            <div className="compatibility-list">
              {serviceCompatibility.length === 0 ? (
                <div className="empty-compatibility">
                  <p>No service compatibility data available</p>
                </div>
              ) : (
                serviceCompatibility.slice(0, 3).map(service => (
                  <div key={service.service_id} className="compatibility-item">
                    <div className="compatibility-info">
                      <h4>{service.service_name}</h4>
                      <p>{service.compatibility_reason}</p>
                    </div>
                    <div className={`compatibility-status ${service.is_compatible ? 'compatible' : 'incompatible'}`}>
                      {service.is_compatible ? '✓' : '✗'}
                    </div>
                  </div>
                ))
              )}
              {serviceCompatibility.length > 3 && (
                <button className="view-all-btn" onClick={() => setShowServiceModal(true)}>
                  View All {serviceCompatibility.length} Services
                </button>
              )}
            </div>
          </div>

          {/* Required Skills */}
          <div className="detail-section">
            <div className="section-header">
              <h2>Required Skills ({skillRequirements.length})</h2>
              <button 
                className="quick-view-btn"
                onClick={() => setShowSkillModal(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Quick View
              </button>
            </div>
            
            <div className="skills-list">
              {skillRequirements.length === 0 ? (
                <div className="empty-skills">
                  <p>No specific skills required</p>
                </div>
              ) : (
                skillRequirements.map(skill => (
                  <div key={skill.skill_id} className="skill-item">
                    <div className="skill-info">
                      <h4>{skill.skill_name}</h4>
                      <p>{skill.certified_employees} employees certified</p>
                    </div>
                    <div className="skill-status">
                      {skill.certified_employees > 0 ? (
                        <span className="status-available">Available</span>
                      ) : (
                        <span className="status-unavailable">No Certified Staff</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Compliance Information */}
          <div className="detail-section">
            <div className="section-header">
              <h2>Compliance & Maintenance</h2>
            </div>
            
            <div className="compliance-grid">
              {equipment.insurance_expiry_date && (
                <div className="compliance-item">
                  <div className="compliance-label">Insurance Expiry</div>
                  <div className="compliance-value">
                    {new Date(equipment.insurance_expiry_date).toLocaleDateString()}
                  </div>
                  <div className={`compliance-status ${
                    new Date(equipment.insurance_expiry_date) > new Date() ? 'valid' : 'expired'
                  }`}>
                    {new Date(equipment.insurance_expiry_date) > new Date() ? 'Valid' : 'Expired'}
                  </div>
                </div>
              )}
              
              {equipment.mot_expiry_date && (
                <div className="compliance-item">
                  <div className="compliance-label">MOT Expiry</div>
                  <div className="compliance-value">
                    {new Date(equipment.mot_expiry_date).toLocaleDateString()}
                  </div>
                  <div className={`compliance-status ${
                    new Date(equipment.mot_expiry_date) > new Date() ? 'valid' : 'expired'
                  }`}>
                    {new Date(equipment.mot_expiry_date) > new Date() ? 'Valid' : 'Expired'}
                  </div>
                </div>
              )}
              
              {equipment.service_due_date && (
                <div className="compliance-item">
                  <div className="compliance-label">Next Service</div>
                  <div className="compliance-value">
                    {new Date(equipment.service_due_date).toLocaleDateString()}
                  </div>
                  <div className={`compliance-status ${
                    new Date(equipment.service_due_date) > new Date() ? 'valid' : 'overdue'
                  }`}>
                    {new Date(equipment.service_due_date) > new Date() ? 'Scheduled' : 'Overdue'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick View Modals */}
        {showServiceModal && (
          <>
            <div className="modal-overlay" onClick={() => setShowServiceModal(false)} />
            <div className="quick-view-modal">
              <div className="quick-view-header">
                <h3>Service Compatibility</h3>
                <button className="modal-close" onClick={() => setShowServiceModal(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="quick-view-content">
                {serviceCompatibility.map(service => (
                  <div key={service.service_id} className="quick-view-item">
                    <div className="item-info">
                      <h4>{service.service_name}</h4>
                      <p>{service.compatibility_reason}</p>
                      <small>Required: {service.required_capacity} • Available: {service.equipment_capacity}</small>
                    </div>
                    <div className={`item-status ${service.is_compatible ? 'compatible' : 'incompatible'}`}>
                      {service.is_compatible ? 'Compatible' : 'Incompatible'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {showSkillModal && (
          <>
            <div className="modal-overlay" onClick={() => setShowSkillModal(false)} />
            <div className="quick-view-modal">
              <div className="quick-view-header">
                <h3>Required Skills</h3>
                <button className="modal-close" onClick={() => setShowSkillModal(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="quick-view-content">
                {skillRequirements.map(skill => (
                  <div key={skill.skill_id} className="quick-view-item">
                    <div className="item-info">
                      <h4>{skill.skill_name}</h4>
                      <p>{skill.certified_employees} employees certified</p>
                    </div>
                    <div className={`item-status ${skill.certified_employees > 0 ? 'available' : 'unavailable'}`}>
                      {skill.certified_employees > 0 ? 'Available' : 'No Certified Staff'}
                    </div>
                  </div>
                ))}
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
                <h3>Delete Equipment</h3>
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
                  <h4>Permanently Delete {equipment.equipment_name}?</h4>
                  <p>
                    This action cannot be undone. The equipment will be permanently removed 
                    from your system and any service assignments will be affected.
                  </p>
                </div>
                
                <div className="delete-actions">
                  <button className="cancel-btn" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </button>
                  <button className="confirm-delete-btn" onClick={handleDeleteEquipment}>
                    Delete Equipment
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
  )
}

export default EquipmentDetail
