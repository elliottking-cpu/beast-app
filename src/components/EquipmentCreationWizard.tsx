import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

import './EquipmentCreationWizard.css'

interface EquipmentCategory {
  id: string
  name: string
  table_name: string
  requires_registration: boolean
  is_system_category: boolean
}

interface BusinessUnit {
  id: string
  name: string
}

interface Service {
  id: string
  name: string
  description: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  job_role: { name: string }
}

interface EquipmentFormData {
  // Basic Information
  equipment_name: string
  category_id: string
  business_unit_id: string
  
  // Category-Specific Fields (dynamic)
  registration_number: string
  capacity_litres: number | null
  pressure_psi: number | null
  bucket_capacity_cubic_meters: number | null
  payload_capacity_kg: number | null
  
  // Features (checkboxes)
  has_jetting_capability: boolean
  has_vacuum_capability: boolean
  has_cctv_capability: boolean
  has_recording_capability: boolean
  has_racking_system: boolean
  has_tool_storage: boolean
  has_hydraulic_tipping: boolean
  
  // Compliance
  insurance_company: string
  insurance_expiry_date: string
  mot_expiry_date: string
  service_due_date: string
  required_license_type: string
  
  // Financial
  purchase_cost: number | null
  current_value: number | null
  purchase_date: string
  
  // Assignments
  assigned_services: string[]
  assigned_employees: string[]
  
  // Status
  is_operational: boolean
}

const EquipmentCreationWizard = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [categories, setCategories] = useState<EquipmentCategory[]>([])
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [operatorsLicenses, setOperatorsLicenses] = useState<{id: string, name: string, transport_manager: string}[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  
  const [formData, setFormData] = useState<EquipmentFormData>({
    equipment_name: '',
    category_id: '',
    business_unit_id: '',
    registration_number: '',
    capacity_litres: null,
    pressure_psi: null,
    bucket_capacity_cubic_meters: null,
    payload_capacity_kg: null,
    has_jetting_capability: false,
    has_vacuum_capability: false,
    has_cctv_capability: false,
    has_recording_capability: false,
    has_racking_system: false,
    has_tool_storage: false,
    has_hydraulic_tipping: false,
    insurance_company: '',
    insurance_expiry_date: '',
    mot_expiry_date: '',
    service_due_date: '',
    required_license_type: '',
    purchase_cost: null,
    current_value: null,
    purchase_date: '',
    assigned_services: [],
    assigned_employees: [],
    is_operational: true
  })

  const systemCategories = ['Tanker', 'Jet Vac', 'Excavator', 'Dumper Truck', 'CCTV Drain Camera', 'Van', 'Trailer']

  useEffect(() => {
    loadWizardData()
  }, [])

  const loadWizardData = async () => {
    try {
      setIsLoading(true)

      // Get current user's business unit
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('business_unit_id')
        .eq('id', user.id)
        .single()

      if (userError) {
        console.error('Error loading user data:', userError)
        return
      }

      console.log('User data loaded:', userData)

      // Load categories first
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('major_equipment_types')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (categoriesError) throw categoriesError

      const categoriesWithFlags = (categoriesData || []).map(cat => ({
        ...cat,
        is_system_category: systemCategories.includes(cat.name)
      }))

      setCategories(categoriesWithFlags)

      // Load business units (current user's group + any child units)
      const { data: businessUnitsData, error: businessUnitsError } = await supabase
        .from('business_units')
        .select('id, name, business_unit_type_id, parent_business_unit_id')
        .eq('is_active', true)
        .order('name')

      if (businessUnitsError) throw businessUnitsError

      // Filter to show current user's business unit + any child units
      let availableUnits = businessUnitsData || []
      console.log('All business units:', availableUnits)
      
      if (userData) {
        const userBusinessUnit = availableUnits.find(unit => unit.id === userData.business_unit_id)
        console.log('User business unit:', userBusinessUnit)
        
        if (userBusinessUnit) {
          // If user is in GROUP_MANAGEMENT, show all units
          // If user is in REGIONAL_SERVICE, show only their unit
          if (userBusinessUnit.business_unit_type_id === '716008fd-932c-447f-abc2-3b1e9305bb59') {
            // GROUP_MANAGEMENT - show all units
            console.log('GROUP_MANAGEMENT user - showing all units')
            availableUnits = availableUnits
          } else {
            // REGIONAL_SERVICE - show only their unit
            console.log('REGIONAL_SERVICE user - filtering units')
            availableUnits = availableUnits.filter(unit => 
              unit.id === userData.business_unit_id || 
              unit.parent_business_unit_id === userBusinessUnit.parent_business_unit_id
            )
          }
        }
      }

      console.log('Available units for dropdown:', availableUnits)
      setBusinessUnits(availableUnits)

      // Set default business unit AFTER loading business units
      if (userData) {
        console.log('Setting default business unit after loading:', userData.business_unit_id)
        setFormData(prev => ({ ...prev, business_unit_id: userData.business_unit_id }))
      }

      // Load available services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name')

      if (servicesError) throw servicesError
      setServices(servicesData || [])

      // Load employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('users')
        .select(`
          id, first_name, last_name,
          job_roles!inner(name)
        `)
        .eq('is_active', true)
        .order('first_name')

      if (employeesError) throw employeesError
      setEmployees(employeesData || [])

      // Load operators licenses (for now, create mock data - will be replaced with real table later)
      const mockOperatorsLicenses = [
        { id: 'none', name: 'Not Currently Assigned', transport_manager: '' },
        { id: 'tsg-ol-001', name: 'The Septics Group - Operators License', transport_manager: 'John Smith Transport Manager' },
        { id: 'ys-ol-001', name: 'Yorkshire Septics - Operators License', transport_manager: 'Sarah Johnson Transport Manager' }
      ]
      setOperatorsLicenses(mockOperatorsLicenses)

    } catch (error) {
      console.error('Error loading wizard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getSelectedCategory = () => {
    return categories.find(cat => cat.id === formData.category_id)
  }

  const getCategorySpecificFields = () => {
    const category = getSelectedCategory()
    if (!category) return []

    const fieldMap: { [key: string]: any[] } = {
      'Tanker': [
        // Tank-Specific Specifications
        { name: 'capacity_litres', label: 'Waste Tank Capacity (Litres)', type: 'number', required: true, help: 'Total waste holding capacity' },
        { name: 'has_washdown_facility', label: 'Washdown Facility', type: 'checkbox', help: 'Light jetting capability for cleaning' },
        { name: 'clean_water_capacity_litres', label: 'Clean Water Capacity (Litres)', type: 'number', required: false, help: 'For washdown facility (if equipped)' },
        { name: 'washdown_pressure_psi', label: 'Washdown Pressure (PSI)', type: 'number', required: false, help: 'Light jetting pressure (not high-pressure)' },
        { name: 'max_hose_capacity_meters', label: 'Maximum Hose Capacity (Meters)', type: 'number', required: true, help: 'Total hose storage capacity' },
        
        // HGV Vehicle Specifications
        { name: 'vehicle_tare_weight_kg', label: 'Vehicle Tare Weight (Kg)', type: 'number', required: true, help: 'Empty vehicle weight (legal requirement)' },
        { name: 'max_gross_weight_kg', label: 'Maximum Gross Weight (Kg)', type: 'number', required: true, help: 'Fully loaded legal weight limit' },
        { name: 'number_of_axles', label: 'Number of Axles', type: 'select', required: true, options: ['2', '3', '4', '5'], help: 'Affects weight distribution and licensing' },
        { name: 'number_of_seats', label: 'Number of Seats', type: 'select', required: true, options: ['2', '3', '4', '5'], help: 'Driver + passenger capacity' },
        { name: 'vehicle_width_meters', label: 'Vehicle Width (Meters)', type: 'number', required: true, help: 'For route planning and bridge clearances' },
        { name: 'vehicle_height_meters', label: 'Vehicle Height (Meters)', type: 'number', required: true, help: 'For bridge clearance restrictions' },
        
        // Licensing & Skills
        { name: 'required_license_type', label: 'Required HGV License', type: 'select', required: true, 
          options: ['HGV Class 2', 'HGV Class 1'], help: 'Minimum license required to operate' },
        { name: 'operators_license_id', label: 'Operator\'s License', type: 'select', required: false, help: 'Select operators license or leave unassigned' },

        
        // Compliance Tracking
        { name: 'last_8_weekly_inspection', label: 'Last 8-Weekly Inspection', type: 'date', required: false, help: 'Legal HGV inspection requirement' },
        { name: 'next_8_weekly_inspection', label: 'Next 8-Weekly Inspection', type: 'date', required: false, help: 'Due date for next inspection' },

      ],
      'Jet Vac': [
        { name: 'pressure_psi', label: 'Operating Pressure (PSI)', type: 'number', required: true, help: 'Maximum jetting pressure' },
        { name: 'hose_length_meters', label: 'Jetting Hose Length (Meters)', type: 'number', required: true, help: 'Maximum reach for jetting' },
        { name: 'has_cctv_capability', label: 'CCTV Survey Equipment', type: 'checkbox', help: 'Integrated drain camera' },
        { name: 'has_recording_capability', label: 'Video Recording', type: 'checkbox', help: 'Can record drain surveys' },
        { name: 'camera_resolution', label: 'Camera Resolution', type: 'select', required: false,
          options: ['720p HD', '1080p Full HD', '4K Ultra HD'], help: 'CCTV camera quality' },
        { name: 'required_certification', label: 'Required Certification', type: 'select', required: true,
          options: ['Jetvac Operation Certificate', 'High Pressure Certificate'], help: 'Operator certification needed' }
      ],
      'Excavator': [
        { name: 'bucket_capacity_cubic_meters', label: 'Bucket Capacity (m³)', type: 'number', required: true, help: 'Standard bucket volume' },
        { name: 'reach_meters', label: 'Maximum Reach (Meters)', type: 'number', required: true, help: 'Maximum digging reach' },
        { name: 'weight_tonnes', label: 'Operating Weight (Tonnes)', type: 'number', required: true, help: 'Total machine weight' },
        { name: 'attachment_types', label: 'Available Attachments', type: 'text', required: false, help: 'Buckets, breakers, augers' },
        { name: 'cpcs_certification_expiry', label: 'CPCS Certification Expiry', type: 'date', required: false, help: 'Construction Plant Competence Scheme' },
        { name: 'required_license_type', label: 'Required License', type: 'select', required: true,
          options: ['Car License', 'HGV Class 2'], help: 'License needed to transport' }
      ],
      'Van': [
        { name: 'payload_capacity_kg', label: 'Payload Capacity (Kg)', type: 'number', required: true, help: 'Maximum load weight' },
        { name: 'fuel_type', label: 'Fuel Type', type: 'select', required: true,
          options: ['Petrol', 'Diesel', 'Electric', 'Hybrid'], help: 'Engine fuel type' },
        { name: 'has_racking_system', label: 'Professional Racking System', type: 'checkbox', help: 'Tool and equipment storage' },
        { name: 'has_tool_storage', label: 'Secure Tool Storage', type: 'checkbox', help: 'Lockable tool compartments' },
        { name: 'required_license_type', label: 'Required License', type: 'select', required: true,
          options: ['Car License', 'HGV Class 2'], help: 'License needed to operate' }
      ],
      'Dumper Truck': [
        { name: 'payload_capacity_tonnes', label: 'Payload Capacity (Tonnes)', type: 'number', required: true, help: 'Maximum load capacity' },
        { name: 'skip_capacity_cubic_meters', label: 'Skip Capacity (m³)', type: 'number', required: false, help: 'Volume of skip/tipper' },
        { name: 'has_hydraulic_tipping', label: 'Hydraulic Tipping', type: 'checkbox', help: 'Powered tipping mechanism' },
        { name: 'required_license_type', label: 'Required License', type: 'select', required: true,
          options: ['HGV Class 2', 'HGV Class 1'], help: 'License needed to operate' }
      ],
      'CCTV Drain Camera': [
        { name: 'camera_resolution', label: 'Camera Resolution', type: 'select', required: true,
          options: ['720p HD', '1080p Full HD', '4K Ultra HD'], help: 'Video quality' },
        { name: 'cable_length_meters', label: 'Cable Length (Meters)', type: 'number', required: true, help: 'Maximum inspection distance' },
        { name: 'has_recording_capability', label: 'Video Recording', type: 'checkbox', help: 'Can record drain surveys' },
        { name: 'has_locating_capability', label: 'Pipe Locating', type: 'checkbox', help: 'Can locate pipes underground' },
        { name: 'storage_capacity_gb', label: 'Storage Capacity (GB)', type: 'number', required: false, help: 'Video storage space' },
        { name: 'battery_life_hours', label: 'Battery Life (Hours)', type: 'number', required: false, help: 'Operating time per charge' }
      ],
      'Trailer': [
        { name: 'payload_capacity_tonnes', label: 'Payload Capacity (Tonnes)', type: 'number', required: true, help: 'Maximum load weight' },
        { name: 'trailer_type', label: 'Trailer Type', type: 'select', required: true,
          options: ['Flatbed', 'Enclosed', 'Tipper', 'Plant Trailer'], help: 'Type of trailer' },
        { name: 'length_meters', label: 'Length (Meters)', type: 'number', required: true, help: 'Overall trailer length' },
        { name: 'width_meters', label: 'Width (Meters)', type: 'number', required: true, help: 'Overall trailer width' },
        { name: 'has_hydraulic_tipping', label: 'Hydraulic Tipping', type: 'checkbox', help: 'Powered tipping mechanism' }
      ]
    }

    return fieldMap[category.name] || []
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors.length > 0) setErrors([])
  }

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      assigned_services: prev.assigned_services.includes(serviceId)
        ? prev.assigned_services.filter(id => id !== serviceId)
        : [...prev.assigned_services, serviceId]
    }))
  }

  const handleEmployeeToggle = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      assigned_employees: prev.assigned_employees.includes(employeeId)
        ? prev.assigned_employees.filter(id => id !== employeeId)
        : [...prev.assigned_employees, employeeId]
    }))
  }

  const validateStep = (step: number) => {
    const newErrors: string[] = []

    if (step === 1) {
      if (!formData.category_id) newErrors.push('Equipment category is required')
      if (!formData.business_unit_id) newErrors.push('Business unit assignment is required')
    }

    if (step === 2) {
      const category = getSelectedCategory()
      
      // Registration number is now the primary identifier
      if (category?.requires_registration && !formData.registration_number.trim()) {
        newErrors.push('Registration number is required and will be used as equipment identifier')
      }
      
      // Validate required category-specific fields
      const fields = getCategorySpecificFields()
      fields.forEach(field => {
        if (field.required) {
          if (field.type === 'number' && !formData[field.name as keyof EquipmentFormData]) {
            newErrors.push(`${field.label} is required`)
          }
          if (field.type === 'select' && !formData[field.name as keyof EquipmentFormData]) {
            newErrors.push(`${field.label} is required`)
          }
        }
      })
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSave = async () => {
    try {
      if (!validateStep(currentStep)) return

      setIsSaving(true)

      const category = getSelectedCategory()
      if (!category) throw new Error('Category not selected')

      // Create equipment in appropriate table
      const equipmentData = {
        business_unit_id: formData.business_unit_id,
        equipment_name: formData.equipment_name,
        registration_number: formData.registration_number || null,
        insurance_company: formData.insurance_company || null,
        insurance_expiry_date: formData.insurance_expiry_date || null,
        mot_expiry_date: formData.mot_expiry_date || null,
        service_due_date: formData.service_due_date || null,
        required_license_type: formData.required_license_type || null,
        purchase_cost: formData.purchase_cost,
        current_value: formData.current_value,
        is_operational: formData.is_operational
      }

      // Add category-specific fields
      const categoryFields = getCategorySpecificFields()
      categoryFields.forEach(field => {
        if (formData[field.name as keyof EquipmentFormData] !== null) {
          (equipmentData as any)[field.name] = formData[field.name as keyof EquipmentFormData]
        }
      })

      // Insert into appropriate table
      const { data: equipmentResult, error: equipmentError } = await supabase
        .from(category.table_name)
        .insert(equipmentData)
        .select()
        .single()

      if (equipmentError) throw equipmentError

      // Create service assignments
      if (formData.assigned_services.length > 0) {
        const serviceAssignments = formData.assigned_services.map(serviceId => ({
          equipment_id: equipmentResult.id,
          equipment_type: category.table_name.replace('_equipment', ''),
          service_id: serviceId,
          is_primary_equipment: true
        }))

        const { error: serviceAssignError } = await supabase
          .from('equipment_service_assignments')
          .insert(serviceAssignments)

        if (serviceAssignError) throw serviceAssignError
      }

      // Create employee assignments
      if (formData.assigned_employees.length > 0) {
        const employeeAssignments = formData.assigned_employees.map(employeeId => ({
          equipment_id: equipmentResult.id,
          equipment_type: category.table_name.replace('_equipment', ''),
          user_id: employeeId,
          assignment_type: 'PRIMARY_OPERATOR'
        }))

        const { error: employeeAssignError } = await supabase
          .from('equipment_employee_assignments')
          .insert(employeeAssignments)

        if (employeeAssignError) throw employeeAssignError
      }

      // Navigate back to equipment management
      const companySlug = window.location.pathname.split('/')[1]
      navigate(`/${companySlug}/equipment`)

    } catch (error) {
      console.error('Error creating equipment:', error)
      setErrors(['Error creating equipment. Please try again.'])
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout currentPage="Add Equipment">
        <div className="wizard-loading">
          <div className="loading-spinner"></div>
          <p>Loading equipment creation wizard...</p>
        </div>
      </DashboardLayout>
    )
  }

  const selectedCategory = getSelectedCategory()
  const categoryFields = getCategorySpecificFields()

  return (
    <DashboardLayout currentPage="Add Equipment">
      <div className="equipment-creation-wizard">
        {/* Wizard Header */}
        <div className="wizard-header">
          <div className="wizard-title-section">
            <div className="wizard-breadcrumb">
              <button onClick={() => navigate(-1)} className="breadcrumb-link">
                Equipment Management
              </button>
              <span className="breadcrumb-separator">→</span>
              <span className="breadcrumb-current">Add Equipment</span>
            </div>
            <h1>Add New Equipment</h1>
            <p>Create comprehensive equipment record with business relationships</p>
          </div>
          
          <div className="wizard-progress">
            <div className="progress-steps">
              {[1, 2, 3, 4, 5].map(step => (
                <div key={step} className={`progress-step ${currentStep >= step ? 'completed' : 'pending'} ${currentStep === step ? 'current' : ''}`}>
                  <div className="step-number">{step}</div>
                  <div className="step-label">
                    {step === 1 && 'Basic Info'}
                    {step === 2 && 'Specifications'}
                    {step === 3 && 'Compliance'}
                    {step === 4 && 'Assignments'}
                    {step === 5 && 'Review'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wizard Content */}
        <div className="wizard-content">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="wizard-step">
              <div className="step-header">
                <h2>Basic Equipment Information</h2>
                <p>Enter the fundamental details for this equipment</p>
              </div>
              
              <div className="step-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Equipment Category *</label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => handleInputChange('category_id', e.target.value)}
                    >
                      <option value="">Select Equipment Category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name} {category.is_system_category ? '(System)' : '(Custom)'}
                        </option>
                      ))}
                    </select>
                    <small>System categories have predefined specifications and fields</small>
                  </div>
                  
                  <div className="form-group">
                    <label>Business Unit Assignment *</label>
                    <select
                      value={formData.business_unit_id}
                      onChange={(e) => handleInputChange('business_unit_id', e.target.value)}
                    >
                      <option value="">Select Business Unit</option>
                      {businessUnits.map(unit => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                    <small>Equipment will be owned and operated by this business unit</small>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Category-Specific Specifications */}
          {currentStep === 2 && (
            <div className="wizard-step">
              <div className="step-header">
                <h2>{selectedCategory?.name} Identification & Specifications</h2>
                <p>Enter registration details and technical specifications for this {selectedCategory?.name}</p>
              </div>
              
              <div className="step-form">
                {selectedCategory?.requires_registration && (
                  <div className="primary-identifier-section">
                    <h3>Primary Identification</h3>
                    <div className="form-row">
                      <div className="form-group primary-field">
                        <label>Registration Number (Equipment Identifier) *</label>
                        <input
                          type="text"
                          value={formData.registration_number}
                          onChange={(e) => {
                            handleInputChange('registration_number', e.target.value)
                            // Auto-set equipment name to registration number
                            handleInputChange('equipment_name', e.target.value)
                          }}
                          placeholder="e.g., AB12 XYZ"
                          className="primary-input"
                        />
                        <small>This will be used as the equipment identifier throughout the system</small>
                      </div>
                    </div>
                  </div>
                )}

                <div className="specifications-section">
                  <h3>Technical Specifications</h3>
                  
                  {/* Tank-Specific Specifications */}
                  <div className="spec-subsection">
                    <h4>Tank Specifications</h4>
                    <div className="spec-grid">
                      {categoryFields.filter(f => f.name.includes('waste_tank_capacity') || f.name.includes('has_washdown')).map(field => (
                        <div key={field.name} className="form-group">
                          <label>{field.label} {field.required && '*'}</label>
                          {field.type === 'number' ? (
                            <input
                              type="number"
                              value={formData[field.name as keyof EquipmentFormData] || ''}
                              onChange={(e) => handleInputChange(field.name, e.target.value ? Number(e.target.value) : null)}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                            />
                          ) : field.type === 'checkbox' ? (
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={formData[field.name as keyof EquipmentFormData] as boolean}
                                onChange={(e) => handleInputChange(field.name, e.target.checked)}
                              />
                              <span>{field.label}</span>
                            </label>
                          ) : null}
                          {field.help && <small className="field-help">{field.help}</small>}
                        </div>
                      ))}
                      
                      {/* Conditional Clean Water Capacity - only show if washdown facility is selected */}
                      {formData.has_washdown_facility && (
                        <>
                          <div className="form-group">
                            <label>Clean Water Capacity (Litres)</label>
                            <input
                              type="number"
                              value={formData.clean_water_capacity_litres || ''}
                              onChange={(e) => handleInputChange('clean_water_capacity_litres', e.target.value ? Number(e.target.value) : null)}
                              placeholder="Enter clean water capacity (litres)"
                            />
                            <small className="field-help">For washdown facility (if equipped)</small>
                          </div>
                          <div className="form-group">
                            <label>Washdown Pressure (PSI)</label>
                            <input
                              type="number"
                              value={formData.washdown_pressure_psi || ''}
                              onChange={(e) => handleInputChange('washdown_pressure_psi', e.target.value ? Number(e.target.value) : null)}
                              placeholder="Enter washdown pressure (psi)"
                            />
                            <small className="field-help">Light jetting pressure (not high-pressure)</small>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* HGV Vehicle Specifications */}
                  <div className="spec-subsection">
                    <h4>HGV Vehicle Specifications</h4>
                    <div className="spec-grid">
                      {categoryFields.filter(f => f.name.includes('vehicle') || f.name.includes('weight') || f.name.includes('axles') || f.name.includes('seats') || f.name.includes('max_hose_capacity')).map(field => (
                        <div key={field.name} className="form-group">
                          <label>{field.label} {field.required && '*'}</label>
                          {field.type === 'number' ? (
                            <input
                              type="number"
                              value={formData[field.name as keyof EquipmentFormData] || ''}
                              onChange={(e) => handleInputChange(field.name, e.target.value ? Number(e.target.value) : null)}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                            />
                          ) : field.type === 'select' ? (
                            <select
                              value={formData[field.name as keyof EquipmentFormData] || ''}
                              onChange={(e) => handleInputChange(field.name, e.target.value)}
                            >
                              <option value="">Select {field.label}</option>
                              {field.options?.map((option: string) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : null}
                          {field.help && <small className="field-help">{field.help}</small>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Licensing & Compliance */}
                  <div className="spec-subsection">
                    <h4>Licensing & Compliance</h4>
                    <div className="spec-grid">
                      {categoryFields.filter(f => f.name.includes('license') || f.name.includes('operator') || f.name.includes('inspection')).map(field => (
                        <div key={field.name} className="form-group">
                          <label>{field.label} {field.required && '*'}</label>
                          {field.type === 'text' ? (
                            <input
                              type="text"
                              value={formData[field.name as keyof EquipmentFormData] || ''}
                              onChange={(e) => handleInputChange(field.name, e.target.value)}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                            />
                          ) : field.type === 'select' ? (
                            <select
                              value={formData[field.name as keyof EquipmentFormData] || ''}
                              onChange={(e) => handleInputChange(field.name, e.target.value)}
                            >
                              <option value="">Select {field.label}</option>
                              {field.options?.map((option: string) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : field.type === 'date' ? (
                            <input
                              type="date"
                              value={formData[field.name as keyof EquipmentFormData] || ''}
                              onChange={(e) => handleInputChange(field.name, e.target.value)}
                            />
                          ) : null}
                          {field.help && <small className="field-help">{field.help}</small>}
                        </div>
                      ))}
                      
                      {/* Special Operators License Dropdown */}
                      <div className="form-group">
                        <label>Operator's License</label>
                        <select
                          value={formData.operators_license_id || ''}
                          onChange={(e) => handleInputChange('operators_license_id', e.target.value)}
                        >
                          <option value="">Select Operator's License</option>
                          {operatorsLicenses.map(license => (
                            <option key={license.id} value={license.id}>
                              {license.name}
                            </option>
                          ))}
                        </select>
                        <small className="field-help">Select operators license or leave unassigned</small>
                      </div>

                      {/* Auto-populated Transport Manager (read-only) */}
                      {formData.operators_license_id && formData.operators_license_id !== 'none' && (
                        <div className="form-group">
                          <label>Transport Manager</label>
                          <input
                            type="text"
                            value={operatorsLicenses.find(ol => ol.id === formData.operators_license_id)?.transport_manager || ''}
                            readOnly
                            className="readonly-field"
                          />
                          <small className="field-help">Auto-populated from selected operators license</small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fallback for other categories */}
                {selectedCategory && selectedCategory.name !== 'Tanker' && (
                  <div className="specifications-grid">
                  {categoryFields.map(field => (
                    <div key={field.name} className="form-group">
                      <label>
                        {field.label} {field.required && '*'}
                      </label>
                      
                      {field.type === 'number' ? (
                        <input
                          type="number"
                          value={formData[field.name as keyof EquipmentFormData] || ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value ? Number(e.target.value) : null)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          value={formData[field.name as keyof EquipmentFormData] || ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                        >
                          <option value="">Select {field.label}</option>
                          {field.options?.map((option: string) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : field.type === 'date' ? (
                        <input
                          type="date"
                          value={formData[field.name as keyof EquipmentFormData] || ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                        />
                      ) : field.type === 'checkbox' ? (
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData[field.name as keyof EquipmentFormData] as boolean}
                            onChange={(e) => handleInputChange(field.name, e.target.checked)}
                          />
                          <span>{field.label}</span>
                        </label>
                      ) : (
                        <input
                          type="text"
                          value={formData[field.name as keyof EquipmentFormData] || ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      )}
                      
                      {field.help && (
                        <small className="field-help">{field.help}</small>
                      )}
                    </div>
                  ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Compliance Information */}
          {currentStep === 3 && (
            <div className="wizard-step">
              <div className="step-header">
                <h2>Compliance & Maintenance</h2>
                <p>Enter insurance, MOT, and maintenance information</p>
              </div>
              
              <div className="step-form">
                <div className="compliance-grid">
                  <div className="form-group">
                    <label>Insurance Company</label>
                    <input
                      type="text"
                      value={formData.insurance_company}
                      onChange={(e) => handleInputChange('insurance_company', e.target.value)}
                      placeholder="e.g., Fleet Insurance Co"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Insurance Expiry Date</label>
                    <input
                      type="date"
                      value={formData.insurance_expiry_date}
                      onChange={(e) => handleInputChange('insurance_expiry_date', e.target.value)}
                    />
                  </div>
                  
                  {selectedCategory?.requires_registration && (
                    <>
                      <div className="form-group">
                        <label>MOT Expiry Date</label>
                        <input
                          type="date"
                          value={formData.mot_expiry_date}
                          onChange={(e) => handleInputChange('mot_expiry_date', e.target.value)}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Required License Type</label>
                        <select
                          value={formData.required_license_type}
                          onChange={(e) => handleInputChange('required_license_type', e.target.value)}
                        >
                          <option value="">Select License Type</option>
                          <option value="Car License">Car License</option>
                          <option value="HGV Class 2">HGV Class 2</option>
                          <option value="HGV Class 1">HGV Class 1</option>
                          <option value="Forklift License">Forklift License</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  <div className="form-group">
                    <label>Next Service Due</label>
                    <input
                      type="date"
                      value={formData.service_due_date}
                      onChange={(e) => handleInputChange('service_due_date', e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Purchase Cost (£)</label>
                    <input
                      type="number"
                      value={formData.purchase_cost || ''}
                      onChange={(e) => handleInputChange('purchase_cost', e.target.value ? Number(e.target.value) : null)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Service & Employee Assignments */}
          {currentStep === 4 && (
            <div className="wizard-step">
              <div className="step-header">
                <h2>Service & Employee Assignments</h2>
                <p>Assign services and employees to this equipment</p>
              </div>
              
              <div className="step-form">
                <div className="assignments-grid">
                  <div className="assignment-section">
                    <h3>Services ({formData.assigned_services.length} selected)</h3>
                    <p>Select which services can use this equipment</p>
                    
                    <div className="assignment-list">
                      {services.map(service => (
                        <div key={service.id} className="assignment-item">
                          <label className="assignment-checkbox">
                            <input
                              type="checkbox"
                              checked={formData.assigned_services.includes(service.id)}
                              onChange={() => handleServiceToggle(service.id)}
                            />
                            <div className="assignment-info">
                              <h4>{service.name}</h4>
                              <p>{service.description}</p>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="assignment-section">
                    <h3>Employees ({formData.assigned_employees.length} selected)</h3>
                    <p>Assign employees responsible for this equipment</p>
                    
                    <div className="assignment-list">
                      {employees.map(employee => (
                        <div key={employee.id} className="assignment-item">
                          <label className="assignment-checkbox">
                            <input
                              type="checkbox"
                              checked={formData.assigned_employees.includes(employee.id)}
                              onChange={() => handleEmployeeToggle(employee.id)}
                            />
                            <div className="assignment-info">
                              <h4>{employee.first_name} {employee.last_name}</h4>
                              <p>{(employee.job_role as any)?.name || 'No Role'}</p>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Save */}
          {currentStep === 5 && (
            <div className="wizard-step">
              <div className="step-header">
                <h2>Review Equipment Details</h2>
                <p>Confirm all information before creating the equipment record</p>
              </div>
              
              <div className="step-form">
                <div className="review-sections">
                  <div className="review-section">
                    <h3>Basic Information</h3>
                    <div className="review-grid">
                      <div className="review-item">
                        <label>Equipment Name</label>
                        <span>{formData.equipment_name}</span>
                      </div>
                      <div className="review-item">
                        <label>Category</label>
                        <span>{selectedCategory?.name}</span>
                      </div>
                      <div className="review-item">
                        <label>Business Unit</label>
                        <span>{businessUnits.find(bu => bu.id === formData.business_unit_id)?.name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="review-section">
                    <h3>Specifications</h3>
                    <div className="review-grid">
                      {categoryFields.map(field => {
                        const value = formData[field.name as keyof EquipmentFormData]
                        if (value === null || value === undefined || value === '') return null
                        
                        return (
                          <div key={field.name} className="review-item">
                            <label>{field.label}</label>
                            <span>
                              {field.type === 'checkbox' 
                                ? (value ? 'Yes' : 'No')
                                : value.toString()
                              }
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  <div className="review-section">
                    <h3>Assignments</h3>
                    <div className="review-grid">
                      <div className="review-item">
                        <label>Assigned Services</label>
                        <span>{formData.assigned_services.length} services</span>
                      </div>
                      <div className="review-item">
                        <label>Assigned Employees</label>
                        <span>{formData.assigned_employees.length} employees</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="wizard-errors">
            {errors.map((error, index) => (
              <div key={index} className="error-message">
                {error}
              </div>
            ))}
          </div>
        )}

        {/* Wizard Navigation */}
        <div className="wizard-navigation">
          <div className="nav-left">
            {currentStep > 1 && (
              <button className="nav-btn secondary" onClick={prevStep}>
                ← Previous
              </button>
            )}
          </div>
          
          <div className="nav-right">
            {currentStep < 5 ? (
              <button className="nav-btn primary" onClick={nextStep}>
                Next →
              </button>
            ) : (
              <button 
                className="nav-btn save" 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Creating Equipment...' : 'Create Equipment'}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default EquipmentCreationWizard
