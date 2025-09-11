import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ServiceSchema from './ServiceSchema'
import './ServiceDetail.css'

interface Service {
  id: string
  name: string
  service_code: string | null
  description: string | null
  estimated_duration_hours: number | null
  base_price: number | null
  currency: string
  service_complexity: string | null
  emergency_service: boolean
  seasonal_service: boolean
  advance_booking_required_days: number
  cancellation_notice_hours: number
  min_employees_required: number
  max_employees_allowed: number
  requires_manager_approval: boolean
  requires_site_survey: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Department {
  id: string
  name: string
}

interface ServiceDepartmentAssignment {
  id: string
  department_id: string
  department_name: string
  is_capable: boolean
  capability_notes: string | null
}

interface BusinessUnit {
  id: string
  name: string
}

interface ServiceBusinessUnitAssignment {
  id: string
  business_unit_id: string
  business_unit_name: string
  department_id: string
  department_name: string
  is_available: boolean
  custom_duration_minutes: number | null
  custom_price: number | null
}

interface ServiceSkill {
  id: string
  skill_id: string
  skill_name: string
  minimum_proficiency_level: number
  is_required: boolean
}

interface ServiceEquipment {
  id: string
  equipment_type: string
  minimum_quantity: number | null
  maximum_quantity: number | null
  is_required: boolean
}

const ServiceDetail = () => {
  const { serviceId } = useParams<{ serviceId: string }>()
  const navigate = useNavigate()
  const [service, setService] = useState<Service | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([])
  const [assignments, setAssignments] = useState<ServiceDepartmentAssignment[]>([])
  const [businessUnitAssignments, setBusinessUnitAssignments] = useState<ServiceBusinessUnitAssignment[]>([])
  const [serviceSkills, setServiceSkills] = useState<ServiceSkill[]>([])
  const [serviceEquipment, setServiceEquipment] = useState<ServiceEquipment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)

  useEffect(() => {
    if (serviceId) {
      loadServiceData()
    }
  }, [serviceId])

  useEffect(() => {
    if (service?.name) {
      document.title = service.name
    }
  }, [service])

  const loadServiceData = async () => {
    try {
      setIsLoading(true)

      // Load service details - handle both ID and slug
      let serviceQuery = supabase.from('services').select('*')
      
      // Check if serviceId looks like a UUID (has dashes) or a slug
      if (serviceId?.includes('-') && serviceId.length > 20) {
        // Looks like a UUID
        serviceQuery = serviceQuery.eq('id', serviceId)
      } else {
        // Looks like a slug, try to match against service_code or name
        const slugUpper = serviceId?.toUpperCase().replace(/-/g, '_')
        serviceQuery = serviceQuery.or(`service_code.eq.${slugUpper},name.ilike.%${serviceId?.replace(/-/g, ' ')}%`)
      }

      const { data: serviceData, error: serviceError } = await serviceQuery.single()

      if (serviceError) throw serviceError
      setService(serviceData)

      // Load departments
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('id, name')
        .eq('is_active', true)

      if (departmentsError) throw departmentsError
      setDepartments(departmentsData || [])

      // Load business units (regional only)
      const { data: businessUnitsData, error: businessUnitsError } = await supabase
        .from('business_units')
        .select(`
          id,
          name,
          business_unit_types!inner(name)
        `)
        .eq('business_unit_types.name', 'REGIONAL_SERVICE')

      if (businessUnitsError) throw businessUnitsError
      setBusinessUnits(businessUnitsData || [])

      // Load department assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('service_department_assignments')
        .select(`
          id,
          department_id,
          is_capable,
          capability_notes,
          departments(name)
        `)
        .eq('service_id', serviceData.id)
        .eq('is_active', true)

      if (assignmentsError) throw assignmentsError

      const formattedAssignments = (assignmentsData || []).map(assignment => ({
        id: assignment.id,
        department_id: assignment.department_id,
        department_name: (assignment.departments as any)?.name || 'Unknown',
        is_capable: assignment.is_capable,
        capability_notes: assignment.capability_notes
      }))

      setAssignments(formattedAssignments)

      // Load business unit assignments
      const { data: buAssignmentsData, error: buAssignmentsError } = await supabase
        .from('business_unit_services')
        .select(`
          id,
          business_unit_id,
          department_id,
          is_available,
          custom_duration_minutes,
          custom_price,
          business_units(name),
          departments(name)
        `)
        .eq('service_id', serviceData.id)

      if (buAssignmentsError) throw buAssignmentsError

      const formattedBuAssignments = (buAssignmentsData || []).map(assignment => ({
        id: assignment.id,
        business_unit_id: assignment.business_unit_id,
        business_unit_name: (assignment.business_units as any)?.name || 'Unknown',
        department_id: assignment.department_id,
        department_name: (assignment.departments as any)?.name || 'Unknown',
        is_available: assignment.is_available,
        custom_duration_minutes: assignment.custom_duration_minutes,
        custom_price: assignment.custom_price
      }))

      setBusinessUnitAssignments(formattedBuAssignments)

      // Load service skills
      const { data: skillsData, error: skillsError } = await supabase
        .from('service_skills')
        .select(`
          id,
          skill_id,
          minimum_proficiency_level,
          is_required,
          skills(name)
        `)
        .eq('service_id', serviceData.id)

      if (skillsError) throw skillsError

      const formattedSkills = (skillsData || []).map(skill => ({
        id: skill.id,
        skill_id: skill.skill_id,
        skill_name: (skill.skills as any)?.name || 'Unknown',
        minimum_proficiency_level: skill.minimum_proficiency_level,
        is_required: skill.is_required
      }))
      setServiceSkills(formattedSkills)

      // Load service equipment requirements
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('service_equipment_requirements')
        .select(`
          id,
          equipment_type,
          minimum_quantity,
          maximum_quantity,
          is_required
        `)
        .eq('service_id', serviceData.id)

      if (equipmentError) throw equipmentError
      setServiceEquipment(equipmentData || [])

    } catch (error) {
      console.error('Error loading service data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    navigate(-1)
  }

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode)
  }

  if (isLoading) {
    return (
      <div className="service-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading service details...</p>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="service-detail-error">
        <h2>Service Not Found</h2>
        <p>The requested service could not be found.</p>
        <button onClick={handleBack}>Back to Services</button>
      </div>
    )
  }

  return (
    <div className="service-detail">
      <div className="service-header">
        <button className="back-btn" onClick={handleBack}>
          ← Back to Services
        </button>
        <div className="header-content">
          <h1>{service.name}</h1>
          <div className="service-code">{service.service_code || 'No Code'}</div>
        </div>
        <button 
          className={`edit-btn ${isEditMode ? 'editing' : ''}`}
          onClick={handleEditToggle}
        >
          {isEditMode ? 'Save Changes' : 'Edit Service'}
        </button>
      </div>

      {/* Database Schema Navigation */}
      <ServiceSchema serviceData={service} />

      <div className="service-content">
        {/* Basic Service Information */}
        <div className="info-section">
          <h2>Service Information</h2>
          <table className="info-table">
            <tbody>
              <tr>
                <td>Description</td>
                <td>{service.description || 'No description'}</td>
              </tr>
              <tr>
                <td>Duration</td>
                <td>{service.estimated_duration_hours ? `${service.estimated_duration_hours} hours` : 'Not specified'}</td>
              </tr>
              <tr>
                <td>Base Price</td>
                <td>{service.base_price ? `£${service.base_price}` : 'Not set'}</td>
              </tr>
              <tr>
                <td>Complexity</td>
                <td>{service.service_complexity || 'Not specified'}</td>
              </tr>
              <tr>
                <td>Team Size</td>
                <td>{service.min_employees_required || 1} - {service.max_employees_allowed || 1} employees</td>
              </tr>
              <tr>
                <td>Emergency Service</td>
                <td>{service.emergency_service ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td>Seasonal Service</td>
                <td>{service.seasonal_service ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td>Advance Booking Required</td>
                <td>{service.advance_booking_required_days || 0} days</td>
              </tr>
              <tr>
                <td>Cancellation Notice</td>
                <td>{service.cancellation_notice_hours || 24} hours</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Department Assignments */}
        <div className="assignments-section service-department-assignments-section">
          <h2>Department Assignments</h2>
          {assignments.length === 0 ? (
            <p className="empty-state">No departments assigned to this service</p>
          ) : (
            <table className="assignments-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(assignment => (
                  <tr key={assignment.id}>
                    <td>{assignment.department_name}</td>
                    <td>
                      <span className={`status ${assignment.is_capable ? 'active' : 'inactive'}`}>
                        {assignment.is_capable ? 'Capable' : 'Not Capable'}
                      </span>
                    </td>
                    <td>{assignment.capability_notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Business Unit Services */}
        <div className="business-units-section business-unit-services-section">
          <h2>Business Unit Services</h2>
          {businessUnitAssignments.length === 0 ? (
            <p className="empty-state">No business units assigned to this service</p>
          ) : (
            <table className="business-units-table">
              <thead>
                <tr>
                  <th>Business Unit</th>
                  <th>Department</th>
                  <th>Available</th>
                  <th>Custom Duration</th>
                  <th>Custom Price</th>
                </tr>
              </thead>
              <tbody>
                {businessUnitAssignments.map(assignment => (
                  <tr key={assignment.id}>
                    <td>{assignment.business_unit_name}</td>
                    <td>{assignment.department_name}</td>
                    <td>
                      <span className={`status ${assignment.is_available ? 'active' : 'inactive'}`}>
                        {assignment.is_available ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{assignment.custom_duration_minutes ? `${assignment.custom_duration_minutes} min` : '-'}</td>
                    <td>{assignment.custom_price ? `£${assignment.custom_price}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Required Skills */}
        <div className="skills-section service-skills-section">
          <h2>Required Skills</h2>
          {serviceSkills.length === 0 ? (
            <p className="empty-state">No specific skills required for this service</p>
          ) : (
            <table className="skills-table">
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Minimum Level</th>
                  <th>Required</th>
                </tr>
              </thead>
              <tbody>
                {serviceSkills.map(skill => (
                  <tr key={skill.id}>
                    <td>{skill.skill_name}</td>
                    <td>Level {skill.minimum_proficiency_level}</td>
                    <td>
                      <span className={`status ${skill.is_required ? 'required' : 'optional'}`}>
                        {skill.is_required ? 'Required' : 'Optional'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Equipment Requirements */}
        <div className="equipment-section service-equipment-requirements-section">
          <h2>Equipment Requirements</h2>
          {serviceEquipment.length === 0 ? (
            <p className="empty-state">No specific equipment requirements for this service</p>
          ) : (
            <table className="equipment-table">
              <thead>
                <tr>
                  <th>Equipment Type</th>
                  <th>Min Quantity</th>
                  <th>Max Quantity</th>
                  <th>Required</th>
                </tr>
              </thead>
              <tbody>
                {serviceEquipment.map(equipment => (
                  <tr key={equipment.id}>
                    <td>{equipment.equipment_type}</td>
                    <td>{equipment.minimum_quantity || '-'}</td>
                    <td>{equipment.maximum_quantity || '-'}</td>
                    <td>
                      <span className={`status ${equipment.is_required ? 'required' : 'optional'}`}>
                        {equipment.is_required ? 'Required' : 'Optional'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}

export default ServiceDetail