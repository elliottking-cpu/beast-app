import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './EquipmentManagement.css'

interface BusinessUnit {
  id: string
  name: string
  business_unit_type_id: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  department_name: string
  job_role_name: string
  skills: string[]
}

interface Equipment {
  id: string
  name: string
  model: string
  type: 'TANKER' | 'JETVAC'
  capacity?: number
  assigned_driver?: Employee
}

interface ScheduleEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  employee_id?: string
  equipment_id?: string
  job_code: string
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  department: string
}

const ScheduleManagement: React.FC = () => {
  const { companyName } = useParams<{ companyName: string }>()
  const [businessUnit, setBusinessUnit] = useState<BusinessUnit | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [showPlaceholder, setShowPlaceholder] = useState<string | null>(null)
  
  // Department-specific filters
  const [transportFilter, setTransportFilter] = useState<string>('All Vehicles')
  const [surveyingFilter, setSurveyingFilter] = useState<string>('All Surveyors')
  const [constructionFilter, setConstructionFilter] = useState<string>('All Job Types')

  const transportFilterOptions = ['All Vehicles', 'All Jetvacs', 'Small Jetvacs', 'All Tankers', 'Small Tankers']
  const surveyingFilterOptions = ['All Surveyors', 'Theo Waddington', 'William Ruddock']
  const constructionFilterOptions = ['All Job Types', 'Excavation', 'Pipe Installation', 'Maintenance', 'Emergency Repairs']

  useEffect(() => {
    loadScheduleData()
  }, [companyName])

  const loadScheduleData = async () => {
    try {
      setLoading(true)

      // Convert company name from URL format to proper case
      const businessUnitName = companyName
        ?.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')

      // Load business unit
      const { data: buData, error: buError } = await supabase
        .from('business_units')
        .select('id, name, business_unit_type_id')
        .eq('name', businessUnitName)
        .single()

      if (buError) {
        console.error('Error loading business unit:', buError)
        return
      }

      setBusinessUnit(buData)

      // Load sample data for demonstration
      const sampleEmployees: Employee[] = [
        { id: '1', first_name: 'Elliott', last_name: 'King', department_name: 'Transport', job_role_name: 'Driver', skills: ['HGV License', 'Tanker Operation'] },
        { id: '2', first_name: 'Calem', last_name: 'Devlin', department_name: 'Transport', job_role_name: 'Driver', skills: ['HGV License', 'Jetvac Operation'] },
        { id: '3', first_name: 'Theo', last_name: 'Waddington', department_name: 'Surveying', job_role_name: 'Surveyor', skills: ['CCTV Survey', 'Drain Inspection'] },
        { id: '4', first_name: 'Micah', last_name: 'Klos', department_name: 'Construction', job_role_name: 'Technician', skills: ['Excavation', 'Pipe Installation'] },
        { id: '5', first_name: 'Olivia', last_name: 'King', department_name: 'Construction', job_role_name: 'Supervisor', skills: ['Project Management', 'Health & Safety'] },
        { id: '6', first_name: 'Wayne', last_name: 'Laird', department_name: 'Transport', job_role_name: 'Driver', skills: ['HGV License', 'Tanker Operation'] },
        { id: '7', first_name: 'William', last_name: 'Ruddock', department_name: 'Surveying', job_role_name: 'Senior Surveyor', skills: ['CCTV Survey', 'Report Writing'] }
      ]

      const sampleEquipment: Equipment[] = [
        { id: '1', name: 'Jet Vac 16,000L', model: 'JV16000', type: 'JETVAC', capacity: 16000 },
        { id: '2', name: 'Jet Vac 9000L', model: 'JV9000', type: 'JETVAC', capacity: 9000 },
        { id: '3', name: 'Tanker 2 - 21,500L', model: 'T21500', type: 'TANKER', capacity: 21500 },
        { id: '4', name: 'Tanker 21,500L Blue', model: 'T21500B', type: 'TANKER', capacity: 21500 }
      ]

      const sampleEvents: ScheduleEvent[] = [
        {
          id: '1',
          title: 'S43 3BY',
          start_time: '09:00',
          end_time: '11:00',
          employee_id: '1',
          job_code: 'S43 3BY',
          status: 'SCHEDULED',
          department: 'Transport'
        },
        {
          id: '2',
          title: 'S75 3EF',
          start_time: '12:00',
          end_time: '14:00',
          employee_id: '1',
          job_code: 'S75 3EF',
          status: 'SCHEDULED',
          department: 'Transport'
        },
        {
          id: '3',
          title: 'Pump Station to Foul Drain Connection - YO61 1TP',
          start_time: '08:00',
          end_time: '17:00',
          employee_id: '3',
          job_code: 'YO61 1TP',
          status: 'IN_PROGRESS',
          department: 'Surveying'
        },
        {
          id: '4',
          title: 'Main Village Tank - Next to Railway - YO7',
          start_time: '14:00',
          end_time: '16:00',
          employee_id: '4',
          job_code: 'YO7',
          status: 'SCHEDULED',
          department: 'Construction'
        }
      ]

      setEmployees(sampleEmployees)
      setEquipment(sampleEquipment)
      setScheduleEvents(sampleEvents)

    } catch (error) {
      console.error('Error loading schedule data:', error)
    } finally {
      setLoading(false)
    }
  }

  const showPlaceholderModal = (feature: string) => {
    setShowPlaceholder(feature)
  }

  const closePlaceholderModal = () => {
    setShowPlaceholder(null)
  }

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    }
    return date.toLocaleDateString('en-GB', options)
  }

  const getTimeSlots = () => {
    const slots = []
    for (let hour = 7; hour <= 17; hour++) {
      slots.push(`${hour}:00`)
    }
    return slots
  }

  const getDepartmentEmployees = (department: string) => {
    return employees.filter(emp => emp.department_name === department)
  }

  const getFilteredTransportResources = () => {
    const transportEmployees = getDepartmentEmployees('Transport')
    let filteredEquipment = equipment

    if (transportFilter === 'All Jetvacs') {
      filteredEquipment = equipment.filter(eq => eq.type === 'JETVAC')
    } else if (transportFilter === 'Small Jetvacs') {
      filteredEquipment = equipment.filter(eq => eq.type === 'JETVAC' && (eq.capacity || 0) < 12000)
    } else if (transportFilter === 'All Tankers') {
      filteredEquipment = equipment.filter(eq => eq.type === 'TANKER')
    } else if (transportFilter === 'Small Tankers') {
      filteredEquipment = equipment.filter(eq => eq.type === 'TANKER' && (eq.capacity || 0) < 15000)
    }

    return { employees: transportEmployees, equipment: filteredEquipment }
  }

  const getFilteredSurveyingEmployees = () => {
    const surveyingEmployees = getDepartmentEmployees('Surveying')
    if (surveyingFilter === 'All Surveyors') return surveyingEmployees
    return surveyingEmployees.filter(emp => `${emp.first_name} ${emp.last_name}` === surveyingFilter)
  }

  const getFilteredConstructionEmployees = () => {
    const constructionEmployees = getDepartmentEmployees('Construction')
    if (constructionFilter === 'All Job Types') return constructionEmployees
    return constructionEmployees.filter(emp => emp.skills.some(skill => skill.toLowerCase().includes(constructionFilter.toLowerCase())))
  }

  const getEventsForResource = (resourceId: string, resourceType: 'employee' | 'equipment') => {
    return scheduleEvents.filter(event => {
      if (resourceType === 'employee') {
        return event.employee_id === resourceId
      } else {
        return event.equipment_id === resourceId
      }
    })
  }

  const getUnscheduledForDepartment = (department: string) => {
    // Sample unscheduled items by department
    const unscheduledItems = {
      'Transport': [
        { id: 'u1', code: 'HD8 0UF', time: 'anytime', type: 'Tank Emptying' },
        { id: 'u2', code: 'YO42 4TB', time: 'anytime', type: 'Jetvac Service' }
      ],
      'Surveying': [
        { id: 'u3', code: 'YO42 4TD', time: 'anytime', type: 'CCTV Survey' }
      ],
      'Construction': [
        { id: 'u4', code: 'S43 7GH', time: 'anytime', type: 'Pipe Repair' },
        { id: 'u5', code: 'YO61 2XP', time: 'anytime', type: 'Tank Installation' }
      ]
    }
    return unscheduledItems[department] || []
  }

  const renderDepartmentSchedule = (
    department: string, 
    filter: string, 
    setFilter: (value: string) => void, 
    filterOptions: string[]
  ) => {
    let resources: any[] = []
    
    if (department === 'Transport') {
      const { employees, equipment } = getFilteredTransportResources()
      resources = [...employees, ...equipment]
    } else if (department === 'Surveying') {
      resources = getFilteredSurveyingEmployees()
    } else if (department === 'Construction') {
      resources = getFilteredConstructionEmployees()
    }

    const unscheduledItems = getUnscheduledForDepartment(department)

    return (
      <div key={department} style={{ marginBottom: '2rem' }}>
        {/* Department Header */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px 8px 0 0', 
          padding: '1rem 1.5rem', 
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
            {department} Department
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: '#64748b' }}>Filter:</label>
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{ 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '6px', 
                  padding: '0.25rem 0.5rem', 
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                {filterOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 200px', backgroundColor: 'white', borderRadius: '0 0 8px 8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {/* Left Resources */}
          <div style={{ padding: '1rem', borderRight: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '500' }}>
              ANY TIME
            </div>
            
            {department === 'Transport' && (
              <>
                <div style={{ fontSize: '0.75rem', color: '#1f2937', fontWeight: '500', marginBottom: '0.5rem', marginTop: '1rem' }}>
                  DRIVERS
                </div>
                {getFilteredTransportResources().employees.map(employee => (
                  <div key={employee.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.25rem 0',
                    fontSize: '0.75rem'
                  }}>
                    <div>
                      <div style={{ color: '#1f2937' }}>
                        {employee.first_name} {employee.last_name}
                      </div>
                    </div>
                    <div style={{ fontWeight: '500', color: '#64748b' }}>
                      {getEventsForResource(employee.id, 'employee').length}
                    </div>
                  </div>
                ))}

                <div style={{ fontSize: '0.75rem', color: '#1f2937', fontWeight: '500', marginBottom: '0.5rem', marginTop: '1rem' }}>
                  VEHICLES
                </div>
                {getFilteredTransportResources().equipment.map(item => (
                  <div key={item.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.25rem 0',
                    fontSize: '0.75rem'
                  }}>
                    <div>
                      <div style={{ color: '#1f2937' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.625rem', color: '#64748b' }}>
                        {item.capacity?.toLocaleString()}L
                      </div>
                    </div>
                    <div style={{ fontWeight: '500', color: '#64748b' }}>
                      0
                    </div>
                  </div>
                ))}
              </>
            )}

            {department !== 'Transport' && (
              <>
                <div style={{ fontSize: '0.75rem', color: '#1f2937', fontWeight: '500', marginBottom: '0.5rem', marginTop: '1rem' }}>
                  TEAM
                </div>
                {resources.map((employee: any) => (
                  <div key={employee.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.25rem 0',
                    fontSize: '0.75rem'
                  }}>
                    <div>
                      <div style={{ color: '#1f2937' }}>
                        {employee.first_name} {employee.last_name}
                      </div>
                      <div style={{ fontSize: '0.625rem', color: '#64748b' }}>
                        {employee.job_role_name}
                      </div>
                    </div>
                    <div style={{ fontWeight: '500', color: '#64748b' }}>
                      {getEventsForResource(employee.id, 'employee').length}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Schedule Grid */}
          <div style={{ minHeight: '200px' }}>
            {/* Time Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', borderBottom: '1px solid #e5e7eb' }}>
              {getTimeSlots().map(time => (
                <div key={time} style={{ 
                  padding: '0.5rem 0.25rem', 
                  textAlign: 'center', 
                  fontSize: '0.625rem', 
                  color: '#64748b',
                  borderRight: '1px solid #f1f5f9'
                }}>
                  {time}
                </div>
              ))}
            </div>

            {/* Schedule Content */}
            <div 
              onClick={() => showPlaceholderModal(`${department} Schedule Grid`)}
              style={{ 
                padding: '1.5rem', 
                textAlign: 'center', 
                cursor: 'pointer',
                minHeight: '150px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc'
              }}
            >
              <div style={{ marginBottom: '0.5rem' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937', marginBottom: '0.25rem' }}>
                {department} Schedule
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: '1.4' }}>
                Click to set up {department.toLowerCase()} scheduling
              </p>
            </div>
          </div>

          {/* Right Unscheduled */}
          <div style={{ padding: '1rem', borderLeft: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '500' }}>
                UNSCHEDULED
              </div>
              <div style={{ 
                backgroundColor: '#ef4444', 
                color: 'white', 
                borderRadius: '50%', 
                width: '16px', 
                height: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '0.625rem',
                fontWeight: '600'
              }}>
                {unscheduledItems.length}
              </div>
            </div>
            
            {unscheduledItems.map(item => (
              <div 
                key={item.id}
                onClick={() => showPlaceholderModal(`${department} Unscheduled Jobs`)}
                style={{ 
                  padding: '0.5rem', 
                  backgroundColor: '#fef2f2', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  border: '1px dashed #ef4444',
                  marginBottom: '0.5rem'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '500' }}>
                  {item.code}
                </div>
                <div style={{ fontSize: '0.625rem', color: '#991b1b' }}>
                  {item.time}
                </div>
                <div style={{ fontSize: '0.625rem', color: '#991b1b' }}>
                  {item.type}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="equipment-management">
        <div className="loading-state">Loading schedule...</div>
      </div>
    )
  }

  if (!businessUnit) {
    return (
      <div className="equipment-management">
        <div className="error-state">Unable to load schedule data</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
            {businessUnit.name}
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
            Schedule
          </h1>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button 
              onClick={() => setViewMode('day')}
              style={{ 
                backgroundColor: viewMode === 'day' ? '#3b82f6' : 'white', 
                color: viewMode === 'day' ? 'white' : '#64748b',
                border: '1px solid #e5e7eb', 
                borderRadius: '6px 0 0 6px', 
                padding: '0.5rem 1rem', 
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Day
            </button>
            <button 
              onClick={() => setViewMode('week')}
              style={{ 
                backgroundColor: viewMode === 'week' ? '#3b82f6' : 'white', 
                color: viewMode === 'week' ? 'white' : '#64748b',
                border: '1px solid #e5e7eb', 
                borderRadius: '0 6px 6px 0', 
                padding: '0.5rem 1rem', 
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Week
            </button>
          </div>


          <button 
            onClick={() => showPlaceholderModal('More Actions Menu')}
            style={{ 
              backgroundColor: 'white', 
              color: '#64748b', 
              border: '1px solid #e5e7eb', 
              borderRadius: '6px', 
              padding: '0.5rem 1rem', 
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
            More Actions
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => showPlaceholderModal('Date Navigation')}
          style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '6px', 
            padding: '0.5rem', 
            cursor: 'pointer' 
          }}
        >
          Today
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            onClick={() => showPlaceholderModal('Date Navigation')}
            style={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '6px', 
              padding: '0.5rem', 
              cursor: 'pointer' 
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          
          <button 
            onClick={() => showPlaceholderModal('Date Navigation')}
            style={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '6px', 
              padding: '0.5rem', 
              cursor: 'pointer' 
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
          {formatDate(selectedDate)}
        </div>
      </div>


      {/* Transport Department Schedule */}
      {renderDepartmentSchedule('Transport', transportFilter, setTransportFilter, transportFilterOptions)}
      
      {/* Surveying Department Schedule */}
      {renderDepartmentSchedule('Surveying', surveyingFilter, setSurveyingFilter, surveyingFilterOptions)}
      
      {/* Construction Department Schedule */}
      {renderDepartmentSchedule('Construction', constructionFilter, setConstructionFilter, constructionFilterOptions)}

      {/* Placeholder Modal */}
      {showPlaceholder && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            padding: '2rem', 
            maxWidth: '500px', 
            width: '90%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>Feature Coming Soon</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>{showPlaceholder}</p>
              </div>
            </div>
            
            <p style={{ color: '#64748b', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              This scheduling feature is not yet implemented. It will include department-based filtering, 
              drag-and-drop scheduling, driver-to-vehicle assignment, and real-time updates integrated 
              with your existing backend data.
            </p>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={closePlaceholderModal}
                style={{ 
                  backgroundColor: '#3b82f6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  padding: '0.75rem 1.5rem', 
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduleManagement
