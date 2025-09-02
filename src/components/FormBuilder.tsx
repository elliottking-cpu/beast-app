import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './FormBuilder.css'

interface Form {
  id: string
  name: string
  description: string
  form_type: string
  is_template: boolean
  template_category: string
  created_by: string
  business_unit_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  field_count?: number
  submission_count?: number
}

interface FormField {
  id: string
  form_id: string
  field_type: string
  field_name: string
  field_label: string
  field_description: string
  is_required: boolean
  is_mandatory_for_automation: boolean
  field_order: number
  field_config: any
  validation_rules: any
  default_value: string
  placeholder_text: string
}

interface FormStats {
  totalForms: number
  activeForms: number
  templates: number
  totalSubmissions: number
}

const FormBuilder = () => {
  const [forms, setForms] = useState<Form[]>([])
  const [templates, setTemplates] = useState<Form[]>([])
  const [stats, setStats] = useState<FormStats>({ totalForms: 0, activeForms: 0, templates: 0, totalSubmissions: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Form | null>(null)
  const [activeTab, setActiveTab] = useState<'forms' | 'templates'>('forms')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    loadFormsData()
  }, [])

  const loadFormsData = async () => {
    try {
      setIsLoading(true)

      // Load forms with field counts
      const { data: formsData, error: formsError } = await supabase
        .from('forms')
        .select(`
          *,
          form_fields(count),
          form_submissions(count)
        `)
        .order('created_at', { ascending: false })

      if (formsError) throw formsError

      const formsWithCounts = (formsData || []).map(form => ({
        ...form,
        field_count: form.form_fields?.length || 0,
        submission_count: form.form_submissions?.length || 0
      }))

      const regularForms = formsWithCounts.filter(f => !f.is_template)
      const templateForms = formsWithCounts.filter(f => f.is_template)

      setForms(regularForms as Form[])
      setTemplates(templateForms as Form[])

      // Calculate stats
      const totalSubmissions = formsWithCounts.reduce((sum, form) => sum + (form.submission_count || 0), 0)
      
      setStats({
        totalForms: regularForms.length,
        activeForms: regularForms.filter(f => f.is_active).length,
        templates: templateForms.length,
        totalSubmissions
      })

    } catch (error) {
      console.error('Error loading forms data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateFromTemplate = async (template: Form) => {
    try {
      // Create new form from template
      const { data: newForm, error: formError } = await supabase
        .from('forms')
        .insert({
          name: `${template.name} (Copy)`,
          description: template.description,
          form_type: template.form_type,
          is_template: false,
          template_category: template.template_category
        })
        .select()
        .single()

      if (formError) throw formError

      // Copy form fields from template
      const { data: templateFields, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', template.id)
        .order('field_order')

      if (fieldsError) throw fieldsError

      if (templateFields && templateFields.length > 0) {
        const newFields = templateFields.map(field => ({
          form_id: newForm.id,
          field_type: field.field_type,
          field_name: field.field_name,
          field_label: field.field_label,
          field_description: field.field_description,
          is_required: field.is_required,
          is_mandatory_for_automation: field.is_mandatory_for_automation,
          field_order: field.field_order,
          field_config: field.field_config,
          validation_rules: field.validation_rules,
          default_value: field.default_value,
          placeholder_text: field.placeholder_text
        }))

        const { error: insertError } = await supabase
          .from('form_fields')
          .insert(newFields)

        if (insertError) throw insertError
      }

      // Reload data
      await loadFormsData()
      setShowTemplateModal(false)
      alert(`Form "${newForm.name}" created successfully from template!`)

    } catch (error) {
      console.error('Error creating form from template:', error)
      alert('Error creating form from template. Please try again.')
    }
  }

  const handleDeleteForm = async (formId: string, formName: string) => {
    if (!confirm(`Are you sure you want to delete "${formName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId)

      if (error) throw error

      await loadFormsData()
      alert('Form deleted successfully!')

    } catch (error) {
      console.error('Error deleting form:', error)
      alert('Error deleting form. Please try again.')
    }
  }

  const filteredForms = forms.filter(form => {
    if (filterType === 'all') return true
    return form.form_type === filterType
  })

  const filteredTemplates = templates.filter(template => {
    if (filterType === 'all') return true
    return template.form_type === filterType
  })

  const getFormTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'SERVICE_FORM': 'Service Form',
      'DUTY_OF_CARE': 'Duty of Care',
      'DRIVER_JOB': 'Driver Job Form',
      'CUSTOMER_NOTIFICATION': 'Customer Notification',
      'COMPLIANCE_REPORT': 'Compliance Report',
      'CUSTOM': 'Custom Form'
    }
    return labels[type] || type
  }

  const getFormTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'SERVICE_FORM': 'blue',
      'DUTY_OF_CARE': 'red',
      'DRIVER_JOB': 'green',
      'CUSTOMER_NOTIFICATION': 'purple',
      'COMPLIANCE_REPORT': 'orange',
      'CUSTOM': 'gray'
    }
    return colors[type] || 'gray'
  }

  if (isLoading) {
    return (
      <div className="form-builder-loading">
        <div className="loading-spinner"></div>
        <p>Loading form builder...</p>
      </div>
    )
  }

  return (
    <div className="equipment-management">
      <div className="equipment-header">
        <div className="equipment-title-section">
          <h1>Form Builder</h1>
          <p>Create and manage dynamic forms for services, compliance, and customer communications</p>
        </div>
        
        <div className="equipment-actions">
          <button 
            className="manage-categories-btn"
            onClick={() => setShowTemplateModal(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10,9 9,9 8,9" />
            </svg>
            Use Template
          </button>
          <button 
            className="add-equipment-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Create Form
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="equipment-stats">
        <div className="stat-card">
          <div className="stat-number">{stats.totalForms}</div>
          <div className="stat-label">TOTAL FORMS</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.activeForms}</div>
          <div className="stat-label">ACTIVE FORMS</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.templates}</div>
          <div className="stat-label">TEMPLATES</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalSubmissions}</div>
          <div className="stat-label">TOTAL SUBMISSIONS</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="form-tabs">
        <button 
          className={`tab-button ${activeTab === 'forms' ? 'active' : ''}`}
          onClick={() => setActiveTab('forms')}
        >
          My Forms ({stats.totalForms})
        </button>
        <button 
          className={`tab-button ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Templates ({stats.templates})
        </button>
      </div>

      {/* Filters */}
      <div className="form-filters">
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Form Types</option>
          <option value="SERVICE_FORM">Service Forms</option>
          <option value="DUTY_OF_CARE">Duty of Care</option>
          <option value="DRIVER_JOB">Driver Job Forms</option>
          <option value="CUSTOMER_NOTIFICATION">Customer Notifications</option>
          <option value="COMPLIANCE_REPORT">Compliance Reports</option>
          <option value="CUSTOM">Custom Forms</option>
        </select>
      </div>

      {/* Forms/Templates List */}
      {activeTab === 'forms' ? (
        <div className="forms-section">
          <div className="forms-header">
            <h2>My Forms</h2>
            <span className="forms-count">{filteredForms.length} forms</span>
          </div>
          
          {filteredForms.length === 0 ? (
            <div className="empty-inventory">
              <h3>No Forms Found</h3>
              <p>Create your first form or use a template to get started.</p>
              <button 
                className="add-equipment-btn"
                onClick={() => setShowTemplateModal(true)}
              >
                Browse Templates
              </button>
            </div>
          ) : (
            <div className="inventory-grid">
              {filteredForms.map(form => (
                <div key={form.id} className="equipment-card">
                  <div className="equipment-card-header">
                    <div className="equipment-type">
                      <span className={`type-badge ${getFormTypeColor(form.form_type)}`}>
                        {getFormTypeLabel(form.form_type)}
                      </span>
                    </div>
                    <div className="equipment-status">
                      <span className={`status-badge ${form.is_active ? 'operational' : 'inactive'}`}>
                        {form.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="equipment-info">
                    <h3>{form.name}</h3>
                    <p>{form.description}</p>
                    <div className="equipment-details">
                      <span className="detail-item">{form.field_count} fields</span>
                      <span className="detail-item">{form.submission_count} submissions</span>
                      <span className="detail-item">Created {new Date(form.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="equipment-actions">
                    <button className="manage-btn">Edit Form</button>
                    <button className="quick-view-btn">View Submissions</button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteForm(form.id, form.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="templates-section">
          <div className="templates-header">
            <h2>Form Templates</h2>
            <span className="templates-count">{filteredTemplates.length} templates</span>
          </div>
          
          <div className="inventory-grid">
            {filteredTemplates.map(template => (
              <div key={template.id} className="equipment-card template-card">
                <div className="equipment-card-header">
                  <div className="equipment-type">
                    <span className={`type-badge ${getFormTypeColor(template.form_type)}`}>
                      {getFormTypeLabel(template.form_type)}
                    </span>
                  </div>
                  <div className="template-category">
                    <span className="category-badge">{template.template_category}</span>
                  </div>
                </div>
                
                <div className="equipment-info">
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                  <div className="equipment-details">
                    <span className="detail-item">{template.field_count} fields</span>
                    <span className="detail-item">Ready to use</span>
                  </div>
                </div>
                
                <div className="equipment-actions">
                  <button 
                    className="manage-btn"
                    onClick={() => handleCreateFromTemplate(template)}
                  >
                    Use Template
                  </button>
                  <button className="quick-view-btn">Preview</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowTemplateModal(false)} />
          <div className="template-modal">
            <div className="template-modal-header">
              <h3>Choose a Template</h3>
              <button 
                className="modal-close"
                onClick={() => setShowTemplateModal(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            <div className="template-modal-content">
              <div className="template-categories">
                {['SEPTIC_SERVICES', 'COMPLIANCE', 'OPERATIONS', 'NOTIFICATIONS'].map(category => {
                  const categoryTemplates = templates.filter(t => t.template_category === category)
                  if (categoryTemplates.length === 0) return null
                  
                  return (
                    <div key={category} className="template-category-section">
                      <h4>{category.replace('_', ' ')}</h4>
                      <div className="template-grid">
                        {categoryTemplates.map(template => (
                          <div 
                            key={template.id}
                            className="template-card-small"
                            onClick={() => handleCreateFromTemplate(template)}
                          >
                            <div className="template-icon">
                              <span className={`type-badge ${getFormTypeColor(template.form_type)}`}>
                                {getFormTypeLabel(template.form_type)}
                              </span>
                            </div>
                            <h5>{template.name}</h5>
                            <p>{template.description}</p>
                            <div className="template-meta">
                              <span>{template.field_count} fields</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create Form Modal */}
      {showCreateModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)} />
          <div className="create-form-modal">
            <div className="create-form-header">
              <h3>Create New Form</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            <div className="create-form-content">
              <p>Form creation interface will be implemented in the next phase.</p>
              <p>For now, you can use the predefined templates to create forms quickly.</p>
              <div className="create-form-actions">
                <button 
                  className="template-btn"
                  onClick={() => {
                    setShowCreateModal(false)
                    setShowTemplateModal(true)
                  }}
                >
                  Browse Templates
                </button>
                <button 
                  className="cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default FormBuilder
