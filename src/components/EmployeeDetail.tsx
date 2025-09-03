import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './EmployeeDetail.css'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  user_type: string
  job_role: string
  business_unit: string
  department_name: string
  is_active: boolean
  last_login: string | null
  created_at: string
}

interface EmployeeSkill {
  id: string
  skill_name: string
  category_name: string
  proficiency_level: string
  acquired_date: string
  last_assessed_date: string | null
  next_assessment_due: string | null
  training_provider: string | null
  training_cost: number | null
  trainer_name: string | null
  is_active: boolean
}

interface EmployeeLicense {
  id: string
  license_number: string
  license_type: string
  issue_date: string
  expiry_date: string
  issuing_authority: string
  current_status: string
  points_on_license: number
  max_points_allowed: number
  last_check_date: string | null
  next_check_due_date: string | null
  medical_expiry_date: string | null
  cpc_expiry_date: string | null
  digi_card_number: string | null
  digi_card_expiry_date: string | null
  is_active: boolean
}

interface EquipmentAssignment {
  id: string
  equipment_name: string
  equipment_type: string
  assignment_type: string
  assignment_start_date: string
  assignment_end_date: string | null
  has_required_license: boolean
  license_expiry_date: string | null
  last_training_date: string | null
  next_training_due: string | null
  assignment_notes: string | null
  is_active: boolean
}

interface JobValidation {
  id: string
  job_id: string | null
  skill_name: string
  validation_status: string
  validation_reason: string
  license_status_at_validation: string | null
  points_at_validation: number | null
  override_reason: string | null
  validated_at: string
}

interface FormSubmission {
  id: string
  form_name: string
  service_name: string | null
  submission_status: string
  submitted_at: string | null
  approved_at: string | null
  rejection_reason: string | null
}

const EmployeeDetail: React.FC = () => {
  const { companyName, employeeId } = useParams()
  const navigate = useNavigate()
  
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [employeeSkills, setEmployeeSkills] = useState<EmployeeSkill[]>([])
  const [employeeLicenses, setEmployeeLicenses] = useState<EmployeeLicense[]>([])
  const [equipmentAssignments, setEquipmentAssignments] = useState<EquipmentAssignment[]>([])
  const [jobValidations, setJobValidations] = useState<JobValidation[]>([])
  const [formSubmissions, setFormSubmissions] = useState<FormSubmission[]>([])
  
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeData()
    }
  }, [employeeId])

  const fetchEmployeeData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch main employee data
      const { data: employeeData, error: employeeError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          is_active,
          last_login,
          created_at,
          user_type_id,
          job_role_id,
          business_unit_id,
          department_id
        `)
        .eq('id', employeeId)
        .single()

      if (employeeError) throw employeeError
      if (!employeeData) throw new Error('Employee not found')

      // Fetch related data in parallel
      const [userTypesResult, jobRolesResult, businessUnitsResult, departmentsResult] = await Promise.all([
        supabase.from('user_types').select('id, name').eq('id', employeeData.user_type_id).single(),
        supabase.from('job_roles').select('id, name').eq('id', employeeData.job_role_id).single(),
        supabase.from('business_units').select('id, name').eq('id', employeeData.business_unit_id).single(),
        employeeData.department_id 
          ? supabase.from('departments').select('id, name').eq('id', employeeData.department_id).single()
          : { data: null, error: null }
      ])

      // Format employee data
      const formattedEmployee: Employee = {
        id: employeeData.id,
        first_name: employeeData.first_name,
        last_name: employeeData.last_name,
        email: employeeData.email,
        user_type: userTypesResult.data?.name || 'Unknown',
        job_role: jobRolesResult.data?.name || 'Unknown',
        business_unit: businessUnitsResult.data?.name || 'Unknown',
        department_name: departmentsResult.data?.name || 'Unassigned',
        is_active: employeeData.is_active,
        last_login: employeeData.last_login,
        created_at: employeeData.created_at
      }

      setEmployee(formattedEmployee)

      // Fetch additional employee data
      await Promise.all([
        fetchEmployeeSkills(),
        fetchEmployeeLicenses(),
        fetchEquipmentAssignments(),
        fetchJobValidations(),
        fetchFormSubmissions()
      ])

    } catch (error: any) {
      console.error('Error fetching employee data:', error)
      setError(error.message || 'Failed to load employee data')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEmployeeSkills = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_skills')
        .select(`
          id,
          proficiency_level,
          acquired_date,
          last_assessed_date,
          next_assessment_due,
          training_provider,
          training_cost,
          trainer_name,
          is_active,
          skills (
            name,
            skill_categories (
              name
            )
          )
        `)
        .eq('user_id', employeeId)
        .eq('is_active', true)
        .order('acquired_date', { ascending: false })

      if (error) throw error

      const formattedSkills: EmployeeSkill[] = (data || []).map(skill => ({
        id: skill.id,
        skill_name: (skill.skills as any)?.name || 'Unknown Skill',
        category_name: (skill.skills as any)?.skill_categories?.name || 'Uncategorized',
        proficiency_level: skill.proficiency_level,
        acquired_date: skill.acquired_date,
        last_assessed_date: skill.last_assessed_date,
        next_assessment_due: skill.next_assessment_due,
        training_provider: skill.training_provider,
        training_cost: skill.training_cost,
        trainer_name: skill.trainer_name,
        is_active: skill.is_active
      }))

      setEmployeeSkills(formattedSkills)
    } catch (error) {
      console.error('Error fetching employee skills:', error)
    }
  }

  const fetchEmployeeLicenses = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_licenses')
        .select('*')
        .eq('user_id', employeeId)
        .eq('is_active', true)
        .order('expiry_date', { ascending: true })

      if (error) throw error

      setEmployeeLicenses(data || [])
    } catch (error) {
      console.error('Error fetching employee licenses:', error)
    }
  }

  const fetchEquipmentAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_employee_assignments')
        .select('*')
        .eq('user_id', employeeId)
        .eq('is_active', true)
        .order('assignment_start_date', { ascending: false })

      if (error) throw error

      setEquipmentAssignments(data || [])
    } catch (error) {
      console.error('Error fetching equipment assignments:', error)
    }
  }

  const fetchJobValidations = async () => {
    try {
      const { data, error } = await supabase
        .from('job_assignment_validations')
        .select(`
          id,
          job_id,
          validation_status,
          validation_reason,
          license_status_at_validation,
          points_at_validation,
          override_reason,
          validated_at,
          skills (
            name
          )
        `)
        .eq('user_id', employeeId)
        .order('validated_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const formattedValidations: JobValidation[] = (data || []).map(validation => ({
        id: validation.id,
        job_id: validation.job_id,
        skill_name: (validation.skills as any)?.name || 'Unknown Skill',
        validation_status: validation.validation_status,
        validation_reason: validation.validation_reason,
        license_status_at_validation: validation.license_status_at_validation,
        points_at_validation: validation.points_at_validation,
        override_reason: validation.override_reason,
        validated_at: validation.validated_at
      }))

      setJobValidations(formattedValidations)
    } catch (error) {
      console.error('Error fetching job validations:', error)
    }
  }

  const fetchFormSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('form_submissions')
        .select(`
          id,
          submission_status,
          submitted_at,
          approved_at,
          rejection_reason,
          forms (
            name
          ),
          services (
            name
          )
        `)
        .eq('submitted_by', employeeId)
        .order('submitted_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const formattedSubmissions: FormSubmission[] = (data || []).map(submission => ({
        id: submission.id,
        form_name: (submission.forms as any)?.name || 'Unknown Form',
        service_name: (submission.services as any)?.name || null,
        submission_status: submission.submission_status,
        submitted_at: submission.submitted_at,
        approved_at: submission.approved_at,
        rejection_reason: submission.rejection_reason
      }))

      setFormSubmissions(formattedSubmissions)
    } catch (error) {
      console.error('Error fetching form submissions:', error)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'VALID': 'status-badge active',
      'EXPIRED': 'status-badge inactive',
      'SUSPENDED': 'status-badge warning',
      'REVOKED': 'status-badge inactive',
      'PASSED': 'status-badge active',
      'FAILED': 'status-badge inactive',
      'WARNING': 'status-badge warning',
      'SUBMITTED': 'status-badge warning',
      'APPROVED': 'status-badge active',
      'REJECTED': 'status-badge inactive',
      'DRAFT': 'status-badge pending'
    }

    return (
      <span className={statusClasses[status as keyof typeof statusClasses] || 'status-badge pending'}>
        {status.replace(/_/g, ' ')}
      </span>
    )
  }

  const getProficiencyBadge = (level: string) => {
    const levelClasses = {
      'TRAINEE': 'proficiency-badge trainee',
      'COMPETENT': 'proficiency-badge competent',
      'EXPERT': 'proficiency-badge expert'
    }

    return (
      <span className={levelClasses[level as keyof typeof levelClasses] || 'proficiency-badge trainee'}>
        {level}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="equipment-management">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading employee details...</p>
        </div>
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="equipment-management">
        <div className="error-container">
          <h2>Error Loading Employee</h2>
          <p>{error || 'Employee not found'}</p>
          <button 
            onClick={() => navigate(-1)}
            className="btn btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="equipment-management">
      {/* Header */}
      <div className="equipment-header">
        <div className="equipment-title-section">
          <button 
            onClick={() => navigate(-1)}
            className="back-button"
          >
            ← Back
          </button>
          <div>
            <h1>{employee.first_name} {employee.last_name}</h1>
            <p className="employee-subtitle">
              {employee.job_role} • {employee.business_unit} • {employee.department_name}
            </p>
          </div>
        </div>
        <div className="equipment-actions">
          <button className="btn btn-secondary">Edit Employee</button>
          <button className="btn btn-primary">Generate Report</button>
        </div>
      </div>

      {/* Employee Overview Cards */}
      <div className="employee-overview-cards">
        <div className="overview-card">
          <h3>Contact Information</h3>
          <div className="card-content">
            <p><strong>Email:</strong> {employee.email}</p>
            <p><strong>Status:</strong> {employee.is_active ? 'Active' : 'Inactive'}</p>
            <p><strong>Last Login:</strong> {formatDateTime(employee.last_login)}</p>
            <p><strong>Joined:</strong> {formatDate(employee.created_at)}</p>
          </div>
        </div>
        
        <div className="overview-card">
          <h3>Skills Summary</h3>
          <div className="card-content">
            <p><strong>Total Skills:</strong> {employeeSkills.length}</p>
            <p><strong>Expert Level:</strong> {employeeSkills.filter(s => s.proficiency_level === 'EXPERT').length}</p>
            <p><strong>Competent Level:</strong> {employeeSkills.filter(s => s.proficiency_level === 'COMPETENT').length}</p>
            <p><strong>Trainee Level:</strong> {employeeSkills.filter(s => s.proficiency_level === 'TRAINEE').length}</p>
          </div>
        </div>

        <div className="overview-card">
          <h3>Licenses & Certifications</h3>
          <div className="card-content">
            <p><strong>Total Licenses:</strong> {employeeLicenses.length}</p>
            <p><strong>Valid:</strong> {employeeLicenses.filter(l => l.current_status === 'VALID').length}</p>
            <p><strong>Expiring Soon:</strong> {employeeLicenses.filter(l => {
              const expiryDate = new Date(l.expiry_date)
              const thirtyDaysFromNow = new Date()
              thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
              return expiryDate <= thirtyDaysFromNow && l.current_status === 'VALID'
            }).length}</p>
          </div>
        </div>

        <div className="overview-card">
          <h3>Equipment Assignments</h3>
          <div className="card-content">
            <p><strong>Active Assignments:</strong> {equipmentAssignments.filter(e => !e.assignment_end_date).length}</p>
            <p><strong>Primary Operator:</strong> {equipmentAssignments.filter(e => e.assignment_type === 'PRIMARY_OPERATOR' && !e.assignment_end_date).length}</p>
            <p><strong>Training Due:</strong> {equipmentAssignments.filter(e => {
              if (!e.next_training_due) return false
              const trainingDate = new Date(e.next_training_due)
              return trainingDate <= new Date() && !e.assignment_end_date
            }).length}</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="employee-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          Skills & Training
        </button>
        <button 
          className={`tab-button ${activeTab === 'licenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('licenses')}
        >
          Licenses & Certifications
        </button>
        <button 
          className={`tab-button ${activeTab === 'equipment' ? 'active' : ''}`}
          onClick={() => setActiveTab('equipment')}
        >
          Equipment Assignments
        </button>
        <button 
          className={`tab-button ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          Job History
        </button>
        <button 
          className={`tab-button ${activeTab === 'forms' ? 'active' : ''}`}
          onClick={() => setActiveTab('forms')}
        >
          Forms & Documents
        </button>
        <button 
          className={`tab-button ${activeTab === 'holidays' ? 'active' : ''}`}
          onClick={() => setActiveTab('holidays')}
        >
          Holidays & Leave
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="section-grid">
              <div className="section-card">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  {formSubmissions.slice(0, 5).map(submission => (
                    <div key={submission.id} className="activity-item">
                      <div className="activity-info">
                        <p><strong>{submission.form_name}</strong></p>
                        <p className="activity-date">{formatDateTime(submission.submitted_at)}</p>
                      </div>
                      {getStatusBadge(submission.submission_status)}
                    </div>
                  ))}
                  {formSubmissions.length === 0 && (
                    <p className="no-data">No recent activity</p>
                  )}
                </div>
              </div>

              <div className="section-card">
                <h3>Upcoming Renewals</h3>
                <div className="renewals-list">
                  {employeeLicenses
                    .filter(license => {
                      const expiryDate = new Date(license.expiry_date)
                      const sixtyDaysFromNow = new Date()
                      sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60)
                      return expiryDate <= sixtyDaysFromNow && license.current_status === 'VALID'
                    })
                    .slice(0, 5)
                    .map(license => (
                      <div key={license.id} className="renewal-item">
                        <div className="renewal-info">
                          <p><strong>{license.license_type}</strong></p>
                          <p className="renewal-date">Expires: {formatDate(license.expiry_date)}</p>
                        </div>
                        <span className="renewal-urgency">
                          {(() => {
                            const daysUntilExpiry = Math.ceil((new Date(license.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                            if (daysUntilExpiry <= 0) return 'EXPIRED'
                            if (daysUntilExpiry <= 7) return 'URGENT'
                            if (daysUntilExpiry <= 30) return 'SOON'
                            return 'UPCOMING'
                          })()}
                        </span>
                      </div>
                    ))}
                  {employeeLicenses.filter(license => {
                    const expiryDate = new Date(license.expiry_date)
                    const sixtyDaysFromNow = new Date()
                    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60)
                    return expiryDate <= sixtyDaysFromNow && license.current_status === 'VALID'
                  }).length === 0 && (
                    <p className="no-data">No upcoming renewals</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="skills-tab">
            <div className="section-header">
              <h3>Skills & Training ({employeeSkills.length})</h3>
              <button className="btn btn-primary">Add Skill</button>
            </div>
            
            <div className="skills-table-container">
              <table className="skills-table">
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>Category</th>
                    <th>Proficiency</th>
                    <th>Acquired</th>
                    <th>Last Assessment</th>
                    <th>Next Assessment</th>
                    <th>Training Provider</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeSkills.map(skill => (
                    <tr key={skill.id}>
                      <td><strong>{skill.skill_name}</strong></td>
                      <td>{skill.category_name}</td>
                      <td>{getProficiencyBadge(skill.proficiency_level)}</td>
                      <td>{formatDate(skill.acquired_date)}</td>
                      <td>{formatDate(skill.last_assessed_date)}</td>
                      <td>{formatDate(skill.next_assessment_due)}</td>
                      <td>{skill.training_provider || 'Not specified'}</td>
                      <td>{skill.training_cost ? `£${skill.training_cost.toFixed(2)}` : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {employeeSkills.length === 0 && (
                <div className="no-data-message">
                  <p>No skills recorded for this employee</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'licenses' && (
          <div className="licenses-tab">
            <div className="section-header">
              <h3>Licenses & Certifications ({employeeLicenses.length})</h3>
              <button className="btn btn-primary">Add License</button>
            </div>
            
            <div className="licenses-table-container">
              <table className="licenses-table">
                <thead>
                  <tr>
                    <th>License Type</th>
                    <th>License Number</th>
                    <th>Status</th>
                    <th>Issue Date</th>
                    <th>Expiry Date</th>
                    <th>Points</th>
                    <th>Last Check</th>
                    <th>Next Check</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeLicenses.map(license => (
                    <tr key={license.id}>
                      <td><strong>{license.license_type}</strong></td>
                      <td>{license.license_number}</td>
                      <td>{getStatusBadge(license.current_status)}</td>
                      <td>{formatDate(license.issue_date)}</td>
                      <td>{formatDate(license.expiry_date)}</td>
                      <td>
                        <span className={license.points_on_license > 6 ? 'points-warning' : 'points-ok'}>
                          {license.points_on_license}/{license.max_points_allowed}
                        </span>
                      </td>
                      <td>{formatDate(license.last_check_date)}</td>
                      <td>{formatDate(license.next_check_due_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {employeeLicenses.length === 0 && (
                <div className="no-data-message">
                  <p>No licenses recorded for this employee</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'equipment' && (
          <div className="equipment-tab">
            <div className="section-header">
              <h3>Equipment Assignments ({equipmentAssignments.length})</h3>
              <button className="btn btn-primary">Assign Equipment</button>
            </div>
            
            <div className="equipment-table-container">
              <table className="equipment-table">
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th>Type</th>
                    <th>Assignment Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>License Required</th>
                    <th>Training Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentAssignments.map(assignment => (
                    <tr key={assignment.id}>
                      <td><strong>{assignment.equipment_name}</strong></td>
                      <td>{assignment.equipment_type.replace(/_/g, ' ')}</td>
                      <td>{assignment.assignment_type.replace(/_/g, ' ')}</td>
                      <td>{formatDate(assignment.assignment_start_date)}</td>
                      <td>{assignment.assignment_end_date ? formatDate(assignment.assignment_end_date) : 'Active'}</td>
                      <td>
                        <span className={assignment.has_required_license ? 'license-valid' : 'license-missing'}>
                          {assignment.has_required_license ? 'Valid' : 'Missing'}
                        </span>
                      </td>
                      <td>{formatDate(assignment.next_training_due)}</td>
                      <td>
                        <span className={assignment.assignment_end_date ? 'assignment-ended' : 'assignment-active'}>
                          {assignment.assignment_end_date ? 'Ended' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {equipmentAssignments.length === 0 && (
                <div className="no-data-message">
                  <p>No equipment assignments for this employee</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="jobs-tab">
            <div className="section-header">
              <h3>Job Assignment History ({jobValidations.length})</h3>
            </div>
            
            <div className="jobs-table-container">
              <table className="jobs-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Skill Required</th>
                    <th>Validation Status</th>
                    <th>Reason</th>
                    <th>License Status</th>
                    <th>Points at Time</th>
                    <th>Override</th>
                  </tr>
                </thead>
                <tbody>
                  {jobValidations.map(validation => (
                    <tr key={validation.id}>
                      <td>{formatDateTime(validation.validated_at)}</td>
                      <td><strong>{validation.skill_name}</strong></td>
                      <td>{getStatusBadge(validation.validation_status)}</td>
                      <td>{validation.validation_reason}</td>
                      <td>{validation.license_status_at_validation || 'N/A'}</td>
                      <td>{validation.points_at_validation || 'N/A'}</td>
                      <td>{validation.override_reason || 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {jobValidations.length === 0 && (
                <div className="no-data-message">
                  <p>No job validation history for this employee</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'forms' && (
          <div className="forms-tab">
            <div className="section-header">
              <h3>Forms & Documents ({formSubmissions.length})</h3>
            </div>
            
            <div className="forms-table-container">
              <table className="forms-table">
                <thead>
                  <tr>
                    <th>Form Name</th>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Approved</th>
                    <th>Rejection Reason</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {formSubmissions.map(submission => (
                    <tr key={submission.id}>
                      <td><strong>{submission.form_name}</strong></td>
                      <td>{submission.service_name || 'N/A'}</td>
                      <td>{getStatusBadge(submission.submission_status)}</td>
                      <td>{formatDateTime(submission.submitted_at)}</td>
                      <td>{formatDateTime(submission.approved_at)}</td>
                      <td>{submission.rejection_reason || 'N/A'}</td>
                      <td>
                        <button className="btn btn-small">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {formSubmissions.length === 0 && (
                <div className="no-data-message">
                  <p>No form submissions for this employee</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'holidays' && (
          <div className="holidays-tab">
            <div className="section-header">
              <h3>Holidays & Leave</h3>
              <button className="btn btn-primary">Request Leave</button>
            </div>
            
            <div className="holidays-placeholder">
              <div className="placeholder-card">
                <h4>Holiday Management</h4>
                <p>This section will display:</p>
                <ul>
                  <li>Annual leave entitlement and balance</li>
                  <li>Booked holidays and leave requests</li>
                  <li>Sick leave history</li>
                  <li>Overtime and time-off-in-lieu</li>
                  <li>Holiday approval workflow</li>
                </ul>
                <p><em>Holiday management system to be implemented in future update.</em></p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EmployeeDetail
