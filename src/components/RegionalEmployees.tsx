import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './EquipmentManagement.css'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  job_title: string
  department: string
  hire_date: string
  status: string
  business_unit_name: string
}

interface JobRole {
  id: string
  name: string
  description: string
  user_type_id: string
}

interface UserType {
  id: string
  name: string
  description: string
}

interface Department {
  id: string
  name: string
  description: string
}

interface BusinessUnit {
  id: string
  name: string
}

const RegionalEmployees: React.FC = () => {
  const { companyName } = useParams()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [jobRoleFilter, setJobRoleFilter] = useState('all')
  const [skillFilter, setSkillFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  
  // Filter data
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([])
  const [availableJobRoles, setAvailableJobRoles] = useState<JobRole[]>([])
  const [availableSkills, setAvailableSkills] = useState<{id: string, name: string}[]>([])
  const [employeeSkillsMap, setEmployeeSkillsMap] = useState<{[employeeId: string]: {skill_name: string, proficiency_level: string}[]}>({})
  
  // Modal data
  const [jobRoles, setJobRoles] = useState<JobRole[]>([])
  const [userTypes, setUserTypes] = useState<UserType[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [currentBusinessUnit, setCurrentBusinessUnit] = useState<BusinessUnit | null>(null)
  
  // Form data
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_role_id: '',
    user_type_id: '',
    department_id: '',
    hire_date: new Date().toISOString().split('T')[0], // Today's date
    send_welcome_email: true,
    generate_temp_password: true
  })
  
  // Form state
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [emailExists, setEmailExists] = useState(false)

  const businessUnitName = companyName?.replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  const fetchEmployeeSkills = async () => {
    try {
      if (employees.length === 0) return

      const employeeIds = employees.map(emp => emp.id)
      console.log('Fetching skills for employee IDs:', employeeIds)

      // Fetch employee skills with skill IDs
      const { data: employeeSkillsData, error: skillsError } = await supabase
        .from('employee_skills')
        .select('user_id, skill_id, proficiency_level')
        .in('user_id', employeeIds)
        .eq('is_active', true)

      if (skillsError) {
        console.error('Error fetching employee skills:', skillsError)
        throw skillsError
      }

      console.log('Employee skills data:', employeeSkillsData)

      if (!employeeSkillsData || employeeSkillsData.length === 0) {
        console.log('No skills found for employees')
        setEmployeeSkillsMap({})
        return
      }

      // Get unique skill IDs
      const skillIds = [...new Set(employeeSkillsData.map(es => es.skill_id))]
      console.log('Fetching skill names for IDs:', skillIds)

      // Fetch skill names
      const { data: skillsData, error: skillNamesError } = await supabase
        .from('skills')
        .select('id, name')
        .in('id', skillIds)

      if (skillNamesError) {
        console.error('Error fetching skill names:', skillNamesError)
        throw skillNamesError
      }

      console.log('Skills data:', skillsData)

      // Create skill ID to name map
      const skillIdToNameMap = (skillsData || []).reduce((acc, skill) => {
        acc[skill.id] = skill.name
        return acc
      }, {} as Record<string, string>)

      // Create employee skills map
      const skillsMap: {[employeeId: string]: {skill_name: string, proficiency_level: string}[]} = {}
      
      employeeSkillsData.forEach(skillRecord => {
        const employeeId = skillRecord.user_id
        const skillName = skillIdToNameMap[skillRecord.skill_id] || 'Unknown Skill'
        
        if (!skillsMap[employeeId]) {
          skillsMap[employeeId] = []
        }
        
        skillsMap[employeeId].push({
          skill_name: skillName,
          proficiency_level: skillRecord.proficiency_level
        })
      })

      console.log('Final skills map:', skillsMap)
      setEmployeeSkillsMap(skillsMap)

    } catch (error) {
      console.error('Error fetching employee skills:', error)
      setEmployeeSkillsMap({})
    }
  }

  // Filtered employees based on search and filters
  const filteredEmployees = employees.filter(employee => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.job_title.toLowerCase().includes(searchTerm.toLowerCase())

    // Status filter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && employee.status === 'Active') ||
      (statusFilter === 'inactive' && employee.status === 'Inactive')

    // Department filter
    const matchesDepartment = departmentFilter === 'all' || 
      employee.department === departmentFilter

    // Job role filter
    const matchesJobRole = jobRoleFilter === 'all' || 
      employee.job_title === jobRoleFilter

    // Skills filter - check if employee has the selected skill
    const matchesSkill = skillFilter === 'all' || 
      (employeeSkillsMap[employee.id] && employeeSkillsMap[employee.id].length > 0 && 
       employeeSkillsMap[employee.id].some(skill => skill.skill_name === skillFilter))

    return matchesSearch && matchesStatus && matchesDepartment && matchesJobRole && matchesSkill
  })

  // Stats based on filtered results
  const stats = {
    totalEmployees: filteredEmployees.length,
    activeEmployees: filteredEmployees.filter(emp => emp.status === 'Active').length,
    departments: [...new Set(filteredEmployees.map(emp => emp.department))].length,
    newHires: filteredEmployees.filter(emp => {
      const hireDate = new Date(emp.hire_date)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return hireDate > thirtyDaysAgo
    }).length
  }

  useEffect(() => {
    if (businessUnitName) {
      fetchEmployees()
      fetchCurrentBusinessUnit()
      fetchJobRoles()
      fetchUserTypes()
      fetchFilterData()
    }
  }, [businessUnitName])

  useEffect(() => {
    if (employees.length > 0) {
      fetchEmployeeSkills()
    }
  }, [employees])

  // Fetch departments after business unit is loaded
  useEffect(() => {
    if (currentBusinessUnit) {
      fetchDepartments()
    }
  }, [currentBusinessUnit])

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showAddModal) {
        handleCloseModal()
      }
    }

    if (showAddModal) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showAddModal])

  const fetchEmployees = async () => {
    if (!businessUnitName) return

    try {
      setLoading(true)
      
      console.log('Fetching employees for business unit:', businessUnitName)
      console.log('Original companyName:', companyName)
      
      // First get the business unit ID
      const { data: businessUnitData, error: businessUnitError } = await supabase
        .from('business_units')
        .select('id')
        .eq('name', businessUnitName)
        .single()

      if (businessUnitError) {
        console.error('Error fetching business unit:', businessUnitError)
        throw businessUnitError
      }

      if (!businessUnitData) {
        console.log('No business unit found with name:', businessUnitName)
        setEmployees([])
        return
      }

      console.log('Found business unit ID:', businessUnitData.id)

      // Now fetch employees for this business unit
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          created_at,
          is_active,
          department_id,
          job_role_id,
          user_type_id
        `)
        .eq('business_unit_id', businessUnitData.id)
        .eq('is_active', true)
        .not('first_name', 'is', null)
        .not('last_name', 'is', null)

      if (error) {
        console.error('Supabase query error:', error)
        throw error
      }
      
      console.log('Raw employee data:', data)

      // Get unique IDs for batch fetching
      const userTypeIds = [...new Set((data || []).map(emp => emp.user_type_id).filter(Boolean))]
      const jobRoleIds = [...new Set((data || []).map(emp => emp.job_role_id).filter(Boolean))]

      // Fetch related data in parallel
      console.log('Fetching user types for IDs:', userTypeIds)
      console.log('Fetching job roles for IDs:', jobRoleIds)
      
      const [userTypesData, jobRolesData] = await Promise.all([
        supabase.from('user_types').select('id, name').in('id', userTypeIds),
        supabase.from('job_roles').select('id, name').in('id', jobRoleIds)
      ])

      console.log('User types data:', userTypesData)
      console.log('Job roles data:', jobRolesData)

      if (userTypesData.error) {
        console.error('Error fetching user types:', userTypesData.error)
        throw userTypesData.error
      }

      if (jobRolesData.error) {
        console.error('Error fetching job roles:', jobRolesData.error)
        throw jobRolesData.error
      }

      // Create lookup maps
      const userTypeMap = (userTypesData.data || []).reduce((acc, ut) => {
        acc[ut.id] = ut.name
        return acc
      }, {} as Record<string, string>)

      const jobRoleMap = (jobRolesData.data || []).reduce((acc, jr) => {
        acc[jr.id] = jr.name
        return acc
      }, {} as Record<string, string>)

      // Filter for employees only
      console.log('Filtering employees. User type map:', userTypeMap)
      console.log('Sample employee user_type_id:', (data || [])[0]?.user_type_id)
      console.log('Does user type map contain this ID?', userTypeMap[(data || [])[0]?.user_type_id])
      
      const employeeData = (data || []).filter(emp => {
        const userType = userTypeMap[emp.user_type_id]
        console.log(`Employee ${emp.first_name} ${emp.last_name} has user_type_id ${emp.user_type_id} -> ${userType}`)
        return userType === 'EMPLOYEE'
      })
      
      console.log('Filtered employee data length:', employeeData.length)

      // Fetch department information for all employees
      const departmentIds = [...new Set(employeeData.map(emp => emp.department_id).filter(Boolean))]
      let departmentMap: Record<string, string> = {}

      if (departmentIds.length > 0) {
        const { data: departmentData, error: deptError } = await supabase
          .from('departments')
          .select('id, name')
          .in('id', departmentIds)

        if (!deptError && departmentData) {
          departmentMap = departmentData.reduce((acc, dept) => {
            acc[dept.id] = dept.name
            return acc
          }, {} as Record<string, string>)
        }
      }

      const transformedEmployees = employeeData.map(emp => ({
        id: emp.id,
        first_name: emp.first_name || '',
        last_name: emp.last_name || '',
        email: emp.email || '',
        phone: '', // Phone field doesn't exist in users table
        job_title: jobRoleMap[emp.job_role_id] || 'Not Set',
        department: emp.department_id ? (departmentMap[emp.department_id] || 'Unknown Department') : 'Unassigned',
        hire_date: emp.created_at ? new Date(emp.created_at).toLocaleDateString() : '',
        status: emp.is_active ? 'Active' : 'Inactive',
        business_unit_name: businessUnitName
      }))

      console.log('Transformed employees:', transformedEmployees)
      console.log('Sample transformed employee:', transformedEmployees[0])
      console.log('Employee data before filtering:', employeeData)
      console.log('Sample employee data:', employeeData[0])
      console.log('User type map:', userTypeMap)
      console.log('Job role map:', jobRoleMap)
      console.log('Department map:', departmentMap)
      setEmployees(transformedEmployees)
    } catch (error) {
      console.error('Error fetching employees:', error)
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  const fetchFilterData = async () => {
    if (!businessUnitName) return

    try {
      // Get business unit ID first
      const { data: businessUnitData, error: businessUnitError } = await supabase
        .from('business_units')
        .select('id')
        .eq('name', businessUnitName)
        .single()

      if (businessUnitError || !businessUnitData) return

      // Fetch departments for this business unit
      const { data: deptData, error: deptError } = await supabase
        .from('business_unit_departments')
        .select(`
          departments (
            id,
            name
          )
        `)
        .eq('business_unit_id', businessUnitData.id)

      if (!deptError && deptData) {
        const departments = deptData.map(item => (item.departments as any)).filter(Boolean)
        setAvailableDepartments(departments)
      }

      // Fetch job roles for employees
      const { data: userTypeData, error: userTypeError } = await supabase
        .from('user_types')
        .select('id')
        .eq('name', 'EMPLOYEE')
        .single()

      if (!userTypeError && userTypeData) {
        const { data: jobRoleData, error: jobRoleError } = await supabase
          .from('job_roles')
          .select('id, name, description')
          .eq('user_type_id', userTypeData.id)

        if (!jobRoleError && jobRoleData) {
          setAvailableJobRoles(jobRoleData)
        }
      }

      // Fetch skills
      const { data: skillData, error: skillError } = await supabase
        .from('skills')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (!skillError && skillData) {
        setAvailableSkills(skillData)
      }

    } catch (error) {
      console.error('Error fetching filter data:', error)
    }
  }



  const fetchCurrentBusinessUnit = async () => {
    if (!businessUnitName) return

    try {
      const { data, error } = await supabase
        .from('business_units')
        .select('id, name')
        .eq('name', businessUnitName)
        .single()

      if (error) throw error
      setCurrentBusinessUnit(data)
    } catch (error) {
      console.error('Error fetching business unit:', error)
    }
  }

  const fetchJobRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('job_roles')
        .select(`
          id,
          name,
          description,
          user_type_id,
          user_types!inner(name)
        `)
        .eq('is_active', true)
        .eq('user_types.name', 'EMPLOYEE')
        .order('name')

      if (error) throw error
      setJobRoles(data || [])
    } catch (error) {
      console.error('Error fetching job roles:', error)
    }
  }

  const fetchUserTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('user_types')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setUserTypes(data || [])
      
      // Auto-select EMPLOYEE user type
      const employeeType = data?.find(type => type.name === 'EMPLOYEE')
      if (employeeType) {
        setFormData(prev => ({ ...prev, user_type_id: employeeType.id }))
      }
    } catch (error) {
      console.error('Error fetching user types:', error)
    }
  }

  const fetchDepartments = async () => {
    if (!currentBusinessUnit) return

    try {
      const { data, error } = await supabase
        .from('business_unit_departments')
        .select(`
          departments!inner(
            id,
            name,
            description
          )
        `)
        .eq('business_unit_id', currentBusinessUnit.id)
        .eq('is_active', true)

      if (error) throw error
      
      const depts = data?.map(item => item.departments) || []
      setDepartments(depts)
      
      // Auto-select HR department
      const hrDept = depts.find(dept => dept.name === 'HR')
      if (hrDept) {
        setFormData(prev => ({ ...prev, department_id: hrDept.id }))
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Clear email exists error when user changes email
    if (name === 'email') {
      setEmailExists(false)
      setFormError(null)
    }
  }

  const checkEmailExists = async (email: string) => {
    if (!email) return false

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .limit(1)

      if (error) throw error
      return data && data.length > 0
    } catch (error) {
      console.error('Error checking email:', error)
      return false
    }
  }

  const validateForm = () => {
    if (!formData.first_name.trim()) {
      setFormError('First name is required')
      return false
    }
    if (!formData.last_name.trim()) {
      setFormError('Last name is required')
      return false
    }
    if (!formData.email.trim()) {
      setFormError('Email is required')
      return false
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setFormError('Please enter a valid email address')
      return false
    }
    if (!formData.job_role_id) {
      setFormError('Job role is required')
      return false
    }
    if (!formData.user_type_id) {
      setFormError('User type is required')
      return false
    }
    if (!formData.department_id) {
      setFormError('Department is required')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    if (!currentBusinessUnit) {
      setFormError('Business unit not found')
      return
    }

    setFormLoading(true)
    setFormError(null)

    try {
      // Check if email already exists
      const emailExistsResult = await checkEmailExists(formData.email)
      if (emailExistsResult) {
        setEmailExists(true)
        setFormError('An employee with this email address already exists')
        return
      }

      // Create the employee
      const { data: newEmployee, error: employeeError } = await supabase
        .from('users')
        .insert([{
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone.trim() || null,
          job_role_id: formData.job_role_id,
          user_type_id: formData.user_type_id,
          department_id: formData.department_id,
          business_unit_id: currentBusinessUnit.id,
          is_active: true,
          // Note: hire_date would need to be added to users table or handled separately
        }])
        .select()
        .single()

      if (employeeError) throw employeeError

      // TODO: Handle welcome email and temporary password generation
      // This would typically involve calling an edge function or API endpoint
      if (formData.send_welcome_email) {
        console.log('Would send welcome email to:', formData.email)
      }
      if (formData.generate_temp_password) {
        console.log('Would generate temporary password for:', formData.email)
      }

      // Reset form and close modal
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        job_role_id: '',
        user_type_id: userTypes.find(type => type.name === 'EMPLOYEE')?.id || '',
        department_id: departments.find(dept => dept.name === 'HR')?.id || '',
        hire_date: new Date().toISOString().split('T')[0],
        send_welcome_email: true,
        generate_temp_password: true
      })
      
      setShowAddModal(false)
      
      // Refresh employees list
      fetchEmployees()

    } catch (error: any) {
      console.error('Error creating employee:', error)
      setFormError(error.message || 'Failed to create employee. Please try again.')
    } finally {
      setFormLoading(false)
    }
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
    setFormError(null)
    setEmailExists(false)
    // Reset form data
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      job_role_id: '',
      user_type_id: userTypes.find(type => type.name === 'EMPLOYEE')?.id || '',
      department_id: departments.find(dept => dept.name === 'HR')?.id || '',
      hire_date: new Date().toISOString().split('T')[0],
      send_welcome_email: true,
      generate_temp_password: true
    })
  }



  if (loading) {
    return (
      <div className="equipment-management">
        <div className="equipment-header">
          <div className="equipment-title-section">
            <h1>Employees - {businessUnitName}</h1>
            <p>Loading employees...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="equipment-management">
      <div className="equipment-header">
        <div className="equipment-title-section">
          <h1>Employees - {businessUnitName}</h1>
          <p>Manage employees for this regional business unit</p>
        </div>
        <div className="equipment-actions">
          <button 
            className="add-equipment-btn"
            onClick={() => setShowAddModal(true)}
          >
            Add Employee
          </button>
        </div>
      </div>

      {/* Add Employee Form */}
      {showAddModal && (
        <div className="add-employee-form-container">
          <div className="add-employee-form-header">
            <div className="form-header-content">
              <h2>Add New Employee</h2>
              <p>Add a new employee to {businessUnitName}</p>
            </div>
            <button 
              className="form-close-btn"
              onClick={handleCloseModal}
              disabled={formLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {formError && (
            <div className="error-message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="add-employee-form">
            <div className="form-sections">
              {/* Basic Information */}
              <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="first_name">First Name *</label>
                    <input
                      type="text"
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter first name"
                      disabled={formLoading}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="last_name">Last Name *</label>
                    <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter last name"
                      disabled={formLoading}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter email address"
                      disabled={formLoading}
                      className={emailExists ? 'error' : ''}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      disabled={formLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Employment Details */}
              <div className="form-section">
                <h3>Employment Details</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="job_role_id">Job Role *</label>
                    <select
                      id="job_role_id"
                      name="job_role_id"
                      value={formData.job_role_id}
                      onChange={handleInputChange}
                      required
                      disabled={formLoading}
                    >
                      <option value="">Select job role</option>
                      {jobRoles.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.name.replace(/_/g, ' ')} - {role.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="department_id">Department *</label>
                    <select
                      id="department_id"
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleInputChange}
                      required
                      disabled={formLoading}
                    >
                      <option value="">Select department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} - {dept.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="user_type_id">User Type *</label>
                    <select
                      id="user_type_id"
                      name="user_type_id"
                      value={formData.user_type_id}
                      onChange={handleInputChange}
                      required
                      disabled={formLoading}
                    >
                      <option value="">Select user type</option>
                      {userTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name} - {type.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="hire_date">Start Date</label>
                    <input
                      type="date"
                      id="hire_date"
                      name="hire_date"
                      value={formData.hire_date}
                      onChange={handleInputChange}
                      disabled={formLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Access & Permissions */}
              <div className="form-section">
                <h3>Access & Permissions</h3>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="send_welcome_email"
                      checked={formData.send_welcome_email}
                      onChange={handleInputChange}
                      disabled={formLoading}
                    />
                    <span className="checkbox-text">Send welcome email to employee</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="generate_temp_password"
                      checked={formData.generate_temp_password}
                      onChange={handleInputChange}
                      disabled={formLoading}
                    />
                    <span className="checkbox-text">Generate temporary password</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button 
                type="button" 
                onClick={handleCloseModal}
                disabled={formLoading}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={formLoading}
                className="add-equipment-btn"
              >
                {formLoading ? 'Creating Employee...' : 'Create Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Cards */}
      <div className="equipment-stats">
        <div className="stat-card">
          <div className="stat-number">{stats.totalEmployees}</div>
          <div className="stat-label">TOTAL EMPLOYEES</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.activeEmployees}</div>
          <div className="stat-label">ACTIVE EMPLOYEES</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.departments}</div>
          <div className="stat-label">DEPARTMENTS</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.newHires}</div>
          <div className="stat-label">NEW HIRES (30 DAYS)</div>
        </div>
      </div>

      {/* Filters */}
      <div className="inventory-filters">
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="status-filter">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="department-filter">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Departments</option>
            {availableDepartments.map(dept => (
              <option key={dept.id} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        <div className="job-role-filter">
          <select
            value={jobRoleFilter}
            onChange={(e) => setJobRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Job Roles</option>
            {availableJobRoles.map(role => (
              <option key={role.id} value={role.name}>
                {role.name.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="skill-filter">
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Skills</option>
            {availableSkills.map(skill => (
              <option key={skill.id} value={skill.name}>
                {skill.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employee List */}
      <div className="equipment-inventory">
        <div className="inventory-header">
          <h2>Employee Directory</h2>
          <span className="inventory-count">
            {filteredEmployees.length} employees
          </span>
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="empty-inventory">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <h3>No employees found</h3>
            <p>No employees match your current search criteria.</p>
          </div>
        ) : (
          <div className="inventory-grid">
            {filteredEmployees.map(employee => (
              <Link 
                key={employee.id} 
                to={`${employee.id}`}
                className="equipment-card employee-card-link"
              >
                <div className="equipment-card-header">
                  <div className="equipment-type">
                    <span className="type-badge">{employee.department.toUpperCase()}</span>
                  </div>
                  <div className="equipment-status">
                    <span className={`status-badge ${employee.status === 'Active' ? 'operational' : 'maintenance'}`}>
                      {employee.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="equipment-info">
                  <h3>{employee.first_name} {employee.last_name}</h3>
                  <div className="equipment-details">
                    <div className="detail-item">
                      <span className="detail-label">Position:</span>
                      <span className="detail-value">{employee.job_title}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{employee.email}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{employee.phone || 'Not provided'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Hire Date:</span>
                      <span className="detail-value">
                        {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : 'Not set'}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default RegionalEmployees
