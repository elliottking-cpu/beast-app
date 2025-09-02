import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

import './ServiceEquipmentRequirements.css'

interface Service {
  id: string
  name: string
  description: string
  estimated_duration_hours: number
  base_price: number
  min_tank_capacity_litres: number
  max_tank_capacity_litres: number
  service_complexity: string
}

interface EquipmentRequirement {
  id: string
  equipment_type: string
  minimum_capacity: number
  maximum_capacity: number
  minimum_quantity: number
  maximum_quantity: number
  is_required: boolean
  can_substitute: boolean
  required_features: any[]
}

interface EquipmentType {
  name: string
  icon: string
  description: string
  capacityUnit: string
  availableCount: number
  compatibilityScore: number
}

const ServiceEquipmentRequirements = () => {
  const { serviceId } = useParams<{ serviceId: string }>()
  const navigate = useNavigate()
  const [service, setService] = useState<Service | null>(null)
  const [requirements, setRequirements] = useState<EquipmentRequirement[]>([])
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddRequirement, setShowAddRequirement] = useState(false)
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string>('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const equipmentTypes = [
    { key: 'tanker', name: 'Tanker', icon: '🚛', description: 'Vacuum tankers for waste collection', capacityUnit: 'Litres' },
    { key: 'jetvac', name: 'Jet Vac', icon: '💨', description: 'High-pressure jetting equipment', capacityUnit: 'PSI' },
    { key: 'excavator', name: 'Excavator', icon: '🚜', description: 'Digging and earthmoving equipment', capacityUnit: 'Cubic Meters' },
    { key: 'dumper', name: 'Dumper Truck', icon: '🚚', description: 'Material transport vehicles', capacityUnit: 'Tonnes' },
    { key: 'cctv', name: 'CCTV Camera', icon: '📹', description: 'Drain inspection equipment', capacityUnit: 'Meters' },
    { key: 'van', name: 'Van', icon: '🚐', description: 'Service and transport vehicles', capacityUnit: 'Kg' },
    { key: 'trailer', name: 'Trailer', icon: '🚚', description: 'Towed equipment and materials', capacityUnit: 'Tonnes' }
  ]

  useEffect(() => {
    if (serviceId) {
      loadServiceRequirements()
    }
  }, [serviceId])

  const loadServiceRequirements = async () => {
    try {
      setIsLoading(true)

      // Load service details
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single()

      if (serviceError) throw serviceError
      setService(serviceData)

      // Load existing equipment requirements
      const { data: requirementsData, error: requirementsError } = await supabase
        .from('service_equipment_requirements')
        .select('*')
        .eq('service_id', serviceId)

      if (requirementsError) throw requirementsError
      setRequirements(requirementsData || [])

      // Load available equipment compatibility
      await loadEquipmentCompatibility()

    } catch (error) {
      console.error('Error loading service requirements:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadEquipmentCompatibility = async () => {
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

      // Load equipment counts and compatibility for each type
      const equipmentCompatibility = await Promise.all(
        equipmentTypes.map(async (type) => {
          const { data: compatibility } = await supabase
            .rpc('find_compatible_equipment_for_service', {
              p_service_id: serviceId,
              p_business_unit_id: userData.business_unit_id
            })

          const typeCompatibility = compatibility?.find(c => c.equipment_type === type.key)

          return {
            ...type,
            availableCount: typeCompatibility?.equipment_count || 0,
            compatibilityScore: typeCompatibility?.compatibility_score || 0
          }
        })
      )

      setAvailableEquipment(equipmentCompatibility)

    } catch (error) {
      console.error('Error loading equipment compatibility:', error)
    }
  }

  const handleAddRequirement = (equipmentType: string) => {
    setSelectedEquipmentType(equipmentType)
    setShowAddRequirement(true)
  }

  const handleDeleteRequirement = async (requirementId: string) => {
    try {
      const { error } = await supabase
        .from('service_equipment_requirements')
        .delete()
        .eq('id', requirementId)

      if (error) throw error

      await loadServiceRequirements()
      setShowDeleteConfirm(null)

    } catch (error) {
      console.error('Error deleting requirement:', error)
      alert('Error deleting requirement. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="requirements-loading">
        <div className="loading-spinner"></div>
        <p>Loading service requirements...</p>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="requirements-error">
        <h2>Service Not Found</h2>
        <p>The requested service could not be loaded.</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    )
  }

  return (
    <div className="service-equipment-requirements">
        {/* Service Overview */}
        <div className="service-overview">
          <div className="service-overview-content">
            <div className="service-info">
              <h1>{service.name} - Equipment Requirements</h1>
              <p>{service.description}</p>
              <div className="service-details">
                <span className="detail-item">Duration: {service.estimated_duration_hours}h</span>
                <span className="detail-item">Price: £{service.base_price}</span>
                {service.min_tank_capacity_litres && (
                  <span className="detail-item">
                    Capacity: {service.min_tank_capacity_litres}L - {service.max_tank_capacity_litres || '∞'}L
                  </span>
                )}
                <span className={`complexity-badge ${service.service_complexity.toLowerCase()}`}>
                  {service.service_complexity}
                </span>
              </div>
            </div>
            <div className="service-actions">
              <button className="back-btn" onClick={() => navigate(-1)}>
                ← Back to Services
              </button>
            </div>
          </div>
        </div>

        {/* Requirements Summary */}
        <div className="requirements-summary">
          <div className="summary-header">
            <h2>Equipment Requirements ({requirements.length})</h2>
            <button 
              className="add-requirement-btn"
              onClick={() => setShowAddRequirement(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Add Equipment Requirement
            </button>
          </div>

          {requirements.length === 0 ? (
            <div className="empty-requirements">
              <div className="empty-icon">⚙️</div>
              <h3>No Equipment Requirements Set</h3>
              <p>Define which equipment this service requires to ensure proper job assignment.</p>
              <button 
                className="empty-add-btn"
                onClick={() => setShowAddRequirement(true)}
              >
                Add First Equipment Requirement
              </button>
            </div>
          ) : (
            <div className="requirements-grid">
              {requirements.map(req => {
                const equipType = equipmentTypes.find(t => t.key === req.equipment_type)
                return (
                  <div key={req.id} className="requirement-card">
                    <div className="requirement-header">
                      <div className="requirement-type">
                        <span className="type-icon">{equipType?.icon}</span>
                        <span className="type-name">{equipType?.name || req.equipment_type}</span>
                      </div>
                      <div className="requirement-status">
                        {req.is_required ? (
                          <span className="required-badge">Required</span>
                        ) : (
                          <span className="optional-badge">Optional</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="requirement-details">
                      {req.minimum_capacity && (
                        <div className="requirement-detail">
                          <strong>Min Capacity:</strong> {req.minimum_capacity} {equipType?.capacityUnit}
                        </div>
                      )}
                      {req.maximum_capacity && (
                        <div className="requirement-detail">
                          <strong>Max Capacity:</strong> {req.maximum_capacity} {equipType?.capacityUnit}
                        </div>
                      )}
                      <div className="requirement-detail">
                        <strong>Quantity:</strong> {req.minimum_quantity}
                        {req.maximum_quantity && req.maximum_quantity !== req.minimum_quantity && 
                          ` - ${req.maximum_quantity}`
                        }
                      </div>
                      {req.can_substitute && (
                        <div className="requirement-detail substitution">
                          <strong>Substitution:</strong> Allowed
                        </div>
                      )}
                    </div>
                    
                    <div className="requirement-actions">
                      <button className="edit-req-btn">Edit</button>
                      <button 
                        className="delete-req-btn"
                        onClick={() => setShowDeleteConfirm(req.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Equipment Compatibility Overview */}
        <div className="equipment-compatibility">
          <h2>Equipment Compatibility Analysis</h2>
          <div className="compatibility-grid">
            {availableEquipment.map(equipment => (
              <div key={equipment.key} className="compatibility-card">
                <div className="compatibility-header">
                  <div className="equipment-info">
                    <span className="equipment-icon">{equipment.icon}</span>
                    <div className="equipment-details">
                      <h3>{equipment.name}</h3>
                      <p>{equipment.availableCount} available</p>
                    </div>
                  </div>
                  <div className={`compatibility-score score-${equipment.compatibilityScore}`}>
                    {equipment.compatibilityScore}%
                  </div>
                </div>
                
                <div className="compatibility-status">
                  {equipment.compatibilityScore === 100 && (
                    <span className="status-badge compatible">✓ Fully Compatible</span>
                  )}
                  {equipment.compatibilityScore === 50 && (
                    <span className="status-badge partial">⚠ Partially Compatible</span>
                  )}
                  {equipment.compatibilityScore === 0 && (
                    <span className="status-badge incompatible">✗ Not Compatible</span>
                  )}
                </div>
                
                <button 
                  className="add-equipment-req-btn"
                  onClick={() => handleAddRequirement(equipment.key)}
                  disabled={equipment.availableCount === 0}
                >
                  {requirements.find(r => r.equipment_type === equipment.key) ? 'Edit Requirement' : 'Add Requirement'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add Requirement Modal */}
        {showAddRequirement && (
          <>
            <div className="modal-overlay" onClick={() => setShowAddRequirement(false)} />
            <div className="add-requirement-modal">
              <div className="add-requirement-header">
                <h3>Add Equipment Requirement</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowAddRequirement(false)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              
              <div className="add-requirement-content">
                <div className="requirement-form-placeholder">
                  <div className="placeholder-icon">⚙️</div>
                  <h4>Equipment Requirement Builder</h4>
                  <p>
                    The equipment requirement form will allow you to:
                  </p>
                  <ul>
                    <li>Set minimum and maximum capacity requirements</li>
                    <li>Define required equipment features</li>
                    <li>Set quantity requirements (min/max equipment needed)</li>
                    <li>Configure substitution rules</li>
                    <li>Set validation priority levels</li>
                  </ul>
                  <p>
                    <strong>Selected Equipment Type:</strong> {
                      selectedEquipmentType ? 
                      equipmentTypes.find(t => t.key === selectedEquipmentType)?.name || selectedEquipmentType :
                      'Choose from compatibility grid'
                    }
                  </p>
                  <button 
                    className="placeholder-btn"
                    onClick={() => setShowAddRequirement(false)}
                  >
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
            <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)} />
            <div className="delete-modal">
              <div className="delete-modal-header">
                <h3>Delete Equipment Requirement</h3>
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
                  <h4>Remove Equipment Requirement?</h4>
                  <p>
                    This will remove the equipment requirement from this service. 
                    Jobs using this service will no longer validate for this equipment type.
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
                    onClick={() => handleDeleteRequirement(showDeleteConfirm)}
                  >
                    Remove Requirement
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
  )
}

export default ServiceEquipmentRequirements
