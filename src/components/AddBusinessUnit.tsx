import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './EquipmentManagement.css'

interface BusinessUnitType {
  id: string
  name: string
  description: string
}

interface Department {
  id: string
  name: string
  description: string
  department_code: string
}

const AddBusinessUnit: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    business_unit_type_id: '',
    location: '',
    contact_email: '',
    contact_phone: ''
  })
  
  const [businessUnitTypes, setBusinessUnitTypes] = useState<BusinessUnitType[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBusinessUnitTypes()
    fetchDepartments()
  }, [])

  const fetchBusinessUnitTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('business_unit_types')
        .select('*')
        .order('name')

      if (error) throw error
      setBusinessUnitTypes(data || [])
    } catch (err) {
      console.error('Error fetching business unit types:', err)
    }
  }

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      setDepartments(data || [])
    } catch (err) {
      console.error('Error fetching departments:', err)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Auto-select mandatory departments for REGIONAL_SERVICE
    if (name === 'business_unit_type_id') {
      const selectedType = businessUnitTypes.find(type => type.id === value)
      if (selectedType?.name === 'REGIONAL_SERVICE') {
        const mandatoryDepts = departments.filter(dept => 
          ['Sales', 'Transport', 'Surveying', 'Construction', 'HR', 'Accounts'].includes(dept.name)
        ).map(dept => dept.id)
        setSelectedDepartments(mandatoryDepts)
      } else {
        setSelectedDepartments([])
      }
    }
  }

  const handleDepartmentToggle = (departmentId: string) => {
    setSelectedDepartments(prev => 
      prev.includes(departmentId)
        ? prev.filter(id => id !== departmentId)
        : [...prev, departmentId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Create the business unit
      const { data: businessUnit, error: businessUnitError } = await supabase
        .from('business_units')
        .insert([{
          name: formData.name,
          description: formData.description,
          business_unit_type_id: formData.business_unit_type_id,
          location: formData.location,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          is_active: true
        }])
        .select()
        .single()

      if (businessUnitError) throw businessUnitError

      // Add selected departments to the business unit
      if (selectedDepartments.length > 0) {
        const departmentRelations = selectedDepartments.map(departmentId => ({
          business_unit_id: businessUnit.id,
          department_id: departmentId,
          is_active: true
        }))

        const { error: deptError } = await supabase
          .from('business_unit_departments')
          .insert(departmentRelations)

        if (deptError) throw deptError
      }

      setSuccess(true)
      setFormData({
        name: '',
        description: '',
        business_unit_type_id: '',
        location: '',
        contact_email: '',
        contact_phone: ''
      })
      setSelectedDepartments([])

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)

    } catch (err: any) {
      setError(err.message || 'Failed to create business unit')
    } finally {
      setLoading(false)
    }
  }

  const selectedType = businessUnitTypes.find(type => type.id === formData.business_unit_type_id)
  const isRegionalService = selectedType?.name === 'REGIONAL_SERVICE'

  return (
    <div className="equipment-management">
      <div className="equipment-header">
        <div className="equipment-title-section">
          <h1>Add Business Unit</h1>
          <p>Create a new business unit and assign departments</p>
        </div>
      </div>

      <div className="equipment-content">
        {success && (
          <div className="success-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            Business unit created successfully!
          </div>
        )}

        {error && (
          <div className="error-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="add-business-unit-form">
          <div className="form-section">
            <h2>Basic Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Business Unit Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter business unit name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="business_unit_type_id">Business Unit Type *</label>
                <select
                  id="business_unit_type_id"
                  name="business_unit_type_id"
                  value={formData.business_unit_type_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select business unit type</option>
                  {businessUnitTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name.replace('_', ' ')} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter business unit description"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Contact Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="location">Location</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Enter location"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact_email">Contact Email</label>
                <input
                  type="email"
                  id="contact_email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleInputChange}
                  placeholder="Enter contact email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact_phone">Contact Phone</label>
                <input
                  type="tel"
                  id="contact_phone"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleInputChange}
                  placeholder="Enter contact phone"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Department Assignment</h2>
            {isRegionalService && (
              <div className="info-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
                Regional Service units automatically include mandatory departments: Sales, Transport, Surveying, Construction, HR, and Accounts.
              </div>
            )}
            
            <div className="departments-grid">
              {departments.map(dept => {
                const isSelected = selectedDepartments.includes(dept.id)
                const isMandatory = isRegionalService && ['Sales', 'Transport', 'Surveying', 'Construction', 'HR', 'Accounts'].includes(dept.name)
                
                return (
                  <div 
                    key={dept.id} 
                    className={`department-card ${isSelected ? 'selected' : ''} ${isMandatory ? 'mandatory' : ''}`}
                    onClick={() => !isMandatory && handleDepartmentToggle(dept.id)}
                  >
                    <div className="department-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => !isMandatory && handleDepartmentToggle(dept.id)}
                        disabled={isMandatory}
                      />
                    </div>
                    <div className="department-info">
                      <h3>{dept.name}</h3>
                      <p>{dept.description}</p>
                      {isMandatory && <span className="mandatory-badge">Mandatory</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="add-equipment-btn">
              {loading ? 'Creating...' : 'Create Business Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddBusinessUnit
