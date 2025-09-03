import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './EmployeeManagement.css'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  user_type: string
  job_role: string
  business_unit: string
  department_id: string | null
  department_name: string
  is_active: boolean
  last_login: string | null
  created_at: string
}

interface BusinessUnit {
  id: string
  name: string
}

interface JobRole {
  id: string
  name: string
  user_type_id: string
}

interface Department {
  id: string
  name: string
}

const EmployeeManagement = () => {
  const { companyName } = useParams<{ companyName: string }>()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([])
  const [jobRoles, setJobRoles] = useState<JobRole[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBusinessUnit, setFilterBusinessUnit] = useState('all')
  const [filterJobRole, setFilterJobRole] = useState('all')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [filterSkill, setFilterSkill] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  
  // Skills data for filtering
  const [availableSkills, setAvailableSkills] = useState<{id: string, name: string}[]>([])
  const [employeeSkillsMap, setEmployeeSkillsMap] = useState<{[employeeId: string]: {skill_name: string, proficiency_level: string}[]}>({})

  useEffect(() => {
    loadEmployeeData()
  }, [])

  useEffect(() => {
    if (employees.length > 0) {
      fetchEmployeeSkills()
      fetchAvailableSkills()
    }
  }, [employees])

  const loadEmployeeData = async () => {
    try {
      setIsLoading(true)

      // Load employees with basic data and foreign key IDs
      const { data: employeeData, error: employeeError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          department_id,
          business_unit_id,
          job_role_id,
          user_type_id,
          is_active,
          last_login,
          created_at
        `)
        .not('first_name', 'is', null)
        .not('last_name', 'is', null)
        .order('last_name')

      if (employeeError) throw employeeError

      // Get all unique IDs for batch fetching
      const userTypeIds = [...new Set(employeeData?.map(emp => emp.user_type_id).filter(Boolean) || [])]
      const jobRoleIds = [...new Set(employeeData?.map(emp => emp.job_role_id).filter(Boolean) || [])]
      const businessUnitIds = [...new Set(employeeData?.map(emp => emp.business_unit_id).filter(Boolean) || [])]
      const departmentIds = [...new Set(employeeData?.map(emp => emp.department_id).filter(Boolean) || [])]

      // Fetch all related data in parallel
      const [userTypesResult, jobRolesResult, businessUnitsResult, departmentsResult] = await Promise.all([
        userTypeIds.length > 0 ? supabase.from('user_types').select('id, name').in('id', userTypeIds) : { data: [], error: null },
        jobRoleIds.length > 0 ? supabase.from('job_roles').select('id, name').in('id', jobRoleIds) : { data: [], error: null },
        businessUnitIds.length > 0 ? supabase.from('business_units').select('id, name').in('id', businessUnitIds) : { data: [], error: null },
        departmentIds.length > 0 ? supabase.from('departments').select('id, name').in('id', departmentIds) : { data: [], error: null }
      ])

      // Create lookup maps
      const userTypeMap = (userTypesResult.data || []).reduce((acc, item) => { acc[item.id] = item.name; return acc }, {} as Record<string, string>)
      const jobRoleMap = (jobRolesResult.data || []).reduce((acc, item) => { acc[item.id] = item.name; return acc }, {} as Record<string, string>)
      const businessUnitMap = (businessUnitsResult.data || []).reduce((acc, item) => { acc[item.id] = item.name; return acc }, {} as Record<string, string>)
      const departmentMap = (departmentsResult.data || []).reduce((acc, item) => { acc[item.id] = item.name; return acc }, {} as Record<string, string>)

      // Filter for employees only and format the data
      const employeeOnlyData = employeeData?.filter(emp => 
        userTypeMap[emp.user_type_id] === 'EMPLOYEE'
      ) || []

      const formattedEmployees = employeeOnlyData.map(emp => ({
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        email: emp.email,
        user_type: userTypeMap[emp.user_type_id] || 'Unknown',
        job_role: jobRoleMap[emp.job_role_id] || 'Unknown',
        business_unit: businessUnitMap[emp.business_unit_id] || 'Unassigned',
        department_id: emp.department_id,
        department_name: emp.department_id ? (departmentMap[emp.department_id] || 'Unknown Department') : 'Unassigned',
        is_active: emp.is_active,
        last_login: emp.last_login,
        created_at: emp.created_at
      }))

      setEmployees(formattedEmployees)

      // Use the data we already fetched for dropdowns
      setBusinessUnits(businessUnitsResult.data || [])
      setDepartments(departmentsResult.data || [])

      // Load job roles for employees (avoiding relationship issues)
      const { data: jobRoleData, error: jobRoleError } = await supabase
        .from('job_roles')
        .select('id, name, user_type_id')
        .eq('is_active', true)
        .order('name')

      if (jobRoleError) throw jobRoleError
      
      // Filter job roles for employees only
      const employeeUserTypeId = Object.keys(userTypeMap).find(id => userTypeMap[id] === 'EMPLOYEE')
      const employeeJobRoles = employeeUserTypeId 
        ? jobRoleData?.filter(role => role.user_type_id === employeeUserTypeId) || []
        : []

      setJobRoles(employeeJobRoles)

    } catch (error) {
      console.error('Error loading employee data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEmployeeSkills = async () => {
    try {
      if (employees.length === 0) return

      const employeeIds = employees.map(emp => emp.id)

      const { data, error } = await supabase
        .from('employee_skills')
        .select(`
          user_id,
          proficiency_level,
          skills (
            name
          )
        `)
        .in('user_id', employeeIds)
        .eq('is_active', true)

      if (error) throw error

      // Create a map of employee ID to their skills
      const skillsMap: {[employeeId: string]: {skill_name: string, proficiency_level: string}[]} = {}
      
      (data || []).forEach(skillRecord => {
        const employeeId = skillRecord.user_id
        const skillName = (skillRecord.skills as any)?.name || 'Unknown Skill'
        
        if (!skillsMap[employeeId]) {
          skillsMap[employeeId] = []
        }
        
        skillsMap[employeeId].push({
          skill_name: skillName,
          proficiency_level: skillRecord.proficiency_level
        })
      })

      setEmployeeSkillsMap(skillsMap)

    } catch (error) {
      console.error('Error fetching employee skills:', error)
    }
  }

  const fetchAvailableSkills = async () => {
    try {
      const { data, error } = await supabase
        .from('skills')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      setAvailableSkills(data || [])

    } catch (error) {
      console.error('Error fetching available skills:', error)
    }
  }

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = !searchQuery || 
      employee.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.job_role.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesBusinessUnit = filterBusinessUnit === 'all' || employee.business_unit === filterBusinessUnit
    const matchesJobRole = filterJobRole === 'all' || employee.job_role === filterJobRole
    const matchesDepartment = filterDepartment === 'all' || employee.department_name === filterDepartment
    const matchesSkill = filterSkill === 'all' || 
      employeeSkillsMap[employee.id]?.some(skill => skill.skill_name === filterSkill)
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && employee.is_active) ||
      (filterStatus === 'inactive' && !employee.is_active)

    return matchesSearch && matchesBusinessUnit && matchesJobRole && matchesDepartment && matchesSkill && matchesStatus
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusBadge = (isActive: boolean, lastLogin: string | null) => {
    if (!isActive) {
      return <span className="status-badge inactive">Inactive</span>
    }
    
    if (!lastLogin) {
      return <span className="status-badge pending">Never Logged In</span>
    }

    const daysSinceLogin = Math.floor((Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceLogin <= 7) {
      return <span className="status-badge active">Active</span>
    } else if (daysSinceLogin <= 30) {
      return <span className="status-badge warning">Inactive ({daysSinceLogin}d)</span>
    } else {
      return <span className="status-badge inactive">Long Inactive ({daysSinceLogin}d)</span>
    }
  }

  if (isLoading) {
    return (
      <div className="employee-loading">
        <div className="loading-spinner"></div>
        <p>Loading employee data...</p>
      </div>
    )
  }

  return (
    <>
      <div className="equipment-management">
        <div className="equipment-header">
          <div className="equipment-title-section">
            <h1>Employee Management</h1>
            <p>Manage employees across all business units from group level</p>
          </div>
          <div className="equipment-actions">
            <button 
              className="add-equipment-btn"
              onClick={() => setShowAddEmployee(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
              Add Employee
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="employee-filters">
          <div className="search-section">
            <div className="search-container">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search employees by name, email, or job role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="filter-section">
            <select 
              value={filterBusinessUnit} 
              onChange={(e) => setFilterBusinessUnit(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Business Units</option>
              {businessUnits.map(unit => (
                <option key={unit.id} value={unit.name}>{unit.name}</option>
              ))}
            </select>

            <select 
              value={filterJobRole} 
              onChange={(e) => setFilterJobRole(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Job Roles</option>
              {jobRoles.map(role => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </select>

            <select 
              value={filterDepartment} 
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>

            <select 
              value={filterSkill} 
              onChange={(e) => setFilterSkill(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Skills</option>
              {availableSkills.map(skill => (
                <option key={skill.id} value={skill.name}>{skill.name}</option>
              ))}
            </select>

            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Employee Stats */}
        <div className="employee-stats">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number">{employees.length}</div>
              <div className="stat-label">Total Employees</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-number">{employees.filter(e => e.is_active).length}</div>
              <div className="stat-label">Active Employees</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏢</div>
            <div className="stat-content">
              <div className="stat-number">{businessUnits.length}</div>
              <div className="stat-label">Business Units</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-number">{jobRoles.length}</div>
              <div className="stat-label">Job Roles</div>
            </div>
          </div>
        </div>

        {/* Employee Table */}
        <div className="employee-table-container">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Job Role</th>
                <th>Business Unit</th>
                <th>Department</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-data">
                    {searchQuery || filterBusinessUnit !== 'all' || filterJobRole !== 'all' || filterStatus !== 'all' 
                      ? 'No employees match your search criteria' 
                      : 'No employees found'}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(employee => (
                  <tr key={employee.id}>
                    <td>
                      <div className="employee-info">
                        <div className="employee-avatar">
                          {employee.first_name[0]}{employee.last_name[0]}
                        </div>
                        <div className="employee-details">
                          <div className="employee-name">
                            <Link 
                              to={`business-management/employees/${employee.id}`}
                              className="employee-name-link"
                            >
                              {employee.first_name} {employee.last_name}
                            </Link>
                          </div>
                          <div className="employee-email">{employee.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="job-role-badge">{employee.job_role}</span>
                    </td>
                    <td>{employee.business_unit}</td>
                    <td>{employee.department_name}</td>
                    <td>{getStatusBadge(employee.is_active, employee.last_login)}</td>
                    <td>{formatDate(employee.last_login)}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" title="View Details">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        <button className="btn-icon" title="Edit Employee">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="btn-icon danger" title="Deactivate Employee">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18" />
                            <path d="M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Results Summary */}
        <div className="results-summary">
          Showing {filteredEmployees.length} of {employees.length} employees
        </div>
      </div>

      {/* Add Employee Modal - Placeholder */}
      {showAddEmployee && (
        <div className="modal-overlay" onClick={() => setShowAddEmployee(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Employee</h3>
              <button className="modal-close" onClick={() => setShowAddEmployee(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Employee creation form will be implemented here...</p>
              <p>This will include:</p>
              <ul>
                <li>Personal details (name, email, phone)</li>
                <li>Job role assignment</li>
                <li>Business unit assignment</li>
                <li>Department assignment</li>
                <li>Skills and certifications</li>
                <li>License information</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddEmployee(false)}>
                Cancel
              </button>
              <button className="btn btn-primary">
                Create Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default EmployeeManagement
