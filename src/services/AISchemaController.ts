import { supabase } from '../lib/supabase'

export interface SchemaControlAction {
  type: 'highlight_tables' | 'show_data_window' | 'add_annotation' | 'zoom_to_area' | 'show_workflow'
  payload: any
  timestamp: string
  context: string
}

export interface DataWindow {
  id: string
  title: string
  type: 'query_results' | 'form' | 'chart' | 'map' | 'workflow'
  position: { x: number; y: number }
  size: { width: number; height: number }
  content: any
  isVisible: boolean
  isMinimized: boolean
}

export interface SchemaAnnotation {
  id: string
  tableId: string
  type: 'info' | 'warning' | 'success' | 'process_step'
  title: string
  description: string
  position: { x: number; y: number }
  isVisible: boolean
  timestamp: string
}

export interface AISchemaState {
  highlightedTables: string[]
  activeDataWindows: DataWindow[]
  annotations: SchemaAnnotation[]
  currentTask: string | null
  focusArea: { tables: string[]; zoom: number } | null
  workflowSteps: WorkflowStep[]
}

export interface WorkflowStep {
  id: string
  title: string
  description: string
  tables: string[]
  status: 'pending' | 'active' | 'completed'
  data?: any
}

class AISchemaController {
  private listeners: ((state: AISchemaState) => void)[] = []
  private currentState: AISchemaState = {
    highlightedTables: [],
    activeDataWindows: [],
    annotations: [],
    currentTask: null,
    focusArea: null,
    workflowSteps: []
  }

  // Subscribe to schema state changes
  subscribe(callback: (state: AISchemaState) => void) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback)
    }
  }

  // Notify all listeners of state changes
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentState))
  }

  // AI highlights relevant tables based on conversation context
  highlightTables(tables: string[], context: string) {
    console.log(`AI highlighting tables for context: ${context}`, tables)
    this.currentState.highlightedTables = tables
    this.logAction({
      type: 'highlight_tables',
      payload: { tables, context },
      timestamp: new Date().toISOString(),
      context
    })
    this.notifyListeners()
  }

  // AI opens a data window to show query results or forms
  showDataWindow(window: Omit<DataWindow, 'id'>) {
    const dataWindow: DataWindow = {
      ...window,
      id: `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    console.log('AI opening data window:', dataWindow)
    this.currentState.activeDataWindows.push(dataWindow)
    this.logAction({
      type: 'show_data_window',
      payload: dataWindow,
      timestamp: new Date().toISOString(),
      context: window.title
    })
    this.notifyListeners()
    return dataWindow.id
  }

  // AI adds annotations to explain current operations
  addAnnotation(annotation: Omit<SchemaAnnotation, 'id' | 'timestamp'>) {
    const schemaAnnotation: SchemaAnnotation = {
      ...annotation,
      id: `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    }
    
    console.log('AI adding annotation:', schemaAnnotation)
    this.currentState.annotations.push(schemaAnnotation)
    this.logAction({
      type: 'add_annotation',
      payload: schemaAnnotation,
      timestamp: new Date().toISOString(),
      context: annotation.title
    })
    this.notifyListeners()
    return schemaAnnotation.id
  }

  // AI focuses on specific schema area
  focusOnArea(tables: string[], zoom: number = 1.2) {
    console.log('AI focusing on schema area:', tables)
    this.currentState.focusArea = { tables, zoom }
    this.logAction({
      type: 'zoom_to_area',
      payload: { tables, zoom },
      timestamp: new Date().toISOString(),
      context: `Focus on ${tables.join(', ')}`
    })
    this.notifyListeners()
  }

  // AI shows step-by-step workflow
  showWorkflow(steps: Omit<WorkflowStep, 'id'>[]) {
    const workflowSteps: WorkflowStep[] = steps.map((step, index) => ({
      ...step,
      id: `step_${Date.now()}_${index}`
    }))
    
    console.log('AI showing workflow:', workflowSteps)
    this.currentState.workflowSteps = workflowSteps
    this.logAction({
      type: 'show_workflow',
      payload: workflowSteps,
      timestamp: new Date().toISOString(),
      context: 'Workflow visualization'
    })
    this.notifyListeners()
  }

  // Update workflow step status
  updateWorkflowStep(stepId: string, status: WorkflowStep['status'], data?: any) {
    const step = this.currentState.workflowSteps.find(s => s.id === stepId)
    if (step) {
      step.status = status
      if (data) step.data = data
      console.log(`AI updating workflow step ${stepId} to ${status}`)
      this.notifyListeners()
    }
  }

  // Close data window
  closeDataWindow(windowId: string) {
    this.currentState.activeDataWindows = this.currentState.activeDataWindows.filter(w => w.id !== windowId)
    console.log('AI closing data window:', windowId)
    this.notifyListeners()
  }

  // Remove annotation
  removeAnnotation(annotationId: string) {
    this.currentState.annotations = this.currentState.annotations.filter(a => a.id !== annotationId)
    console.log('AI removing annotation:', annotationId)
    this.notifyListeners()
  }

  // Clear all highlights and overlays
  clearAll() {
    console.log('AI clearing all schema controls')
    this.currentState = {
      highlightedTables: [],
      activeDataWindows: [],
      annotations: [],
      currentTask: null,
      focusArea: null,
      workflowSteps: []
    }
    this.notifyListeners()
  }

  // Set current task context
  setCurrentTask(task: string | null) {
    console.log('AI setting current task:', task)
    this.currentState.currentTask = task
    this.notifyListeners()
  }

  // Get current state
  getCurrentState(): AISchemaState {
    return { ...this.currentState }
  }

  // Log AI actions for audit trail
  private async logAction(action: SchemaControlAction) {
    try {
      await supabase.from('ai_schema_actions').insert({
        action_type: action.type,
        payload: action.payload,
        context: action.context,
        timestamp: action.timestamp
      })
    } catch (error) {
      console.warn('Failed to log AI schema action:', error)
    }
  }

  // AI analyzes query and determines relevant tables
  async analyzeQueryContext(query: string): Promise<string[]> {
    const lowerQuery = query.toLowerCase()
    const relevantTables: string[] = []

    // Customer-related queries
    if (lowerQuery.includes('customer') || lowerQuery.includes('client')) {
      relevantTables.push('customer_contacts', 'customer_addresses', 'business_units')
    }

    // Job-related queries
    if (lowerQuery.includes('job') || lowerQuery.includes('service') || lowerQuery.includes('booking')) {
      relevantTables.push('jobs', 'job_types', 'staff', 'schedules')
    }

    // Financial queries
    if (lowerQuery.includes('revenue') || lowerQuery.includes('payment') || lowerQuery.includes('invoice')) {
      relevantTables.push('invoices', 'payments', 'jobs', 'customer_contacts')
    }

    // Geographic queries
    if (lowerQuery.includes('postcode') || lowerQuery.includes('area') || lowerQuery.includes('region')) {
      relevantTables.push('customer_addresses', 'jobs', 'business_units')
    }

    // Staff/HR queries
    if (lowerQuery.includes('staff') || lowerQuery.includes('employee') || lowerQuery.includes('team')) {
      relevantTables.push('staff', 'schedules', 'jobs', 'business_units')
    }

    return [...new Set(relevantTables)] // Remove duplicates
  }

  // AI processes natural language and updates schema accordingly
  async processNaturalLanguageQuery(query: string, context?: string) {
    console.log('AI processing natural language query:', query)
    
    const relevantTables = await this.analyzeQueryContext(query)
    
    if (relevantTables.length > 0) {
      this.highlightTables(relevantTables, context || 'Natural language query')
      
      // Add contextual annotation
      if (relevantTables.length > 0) {
        this.addAnnotation({
          tableId: relevantTables[0],
          type: 'info',
          title: 'AI Analysis',
          description: `Analyzing: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`,
          position: { x: 10, y: 10 },
          isVisible: true
        })
      }
    }

    return relevantTables
  }
}

// Create singleton instance
export const aiSchemaController = new AISchemaController()
