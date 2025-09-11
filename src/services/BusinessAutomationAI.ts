// Business Automation AI - Comprehensive AI system for complete business automation
// This service handles job prioritization, scheduling, customer management, and all business operations

import { supabase } from '../lib/supabase'

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

export interface CompanyPolicy {
  id: string
  businessUnitId: string
  policyCategory: 'customer_service' | 'scheduling' | 'pricing' | 'safety' | 'quality' | 'hr' | 'financial'
  policyName: string
  policyDescription: string
  policyRules: Record<string, any>
  priorityLevel: number
  isActive: boolean
  appliesTo: string[]
  exceptions: any[]
  effectiveDate: string
  expiryDate?: string
  createdAt: string
  updatedAt: string
}

export interface BusinessProcess {
  id: string
  businessUnitId: string
  processName: string
  processCategory: 'customer_onboarding' | 'job_scheduling' | 'invoicing' | 'maintenance'
  processDescription?: string
  processSteps: ProcessStep[]
  triggerConditions: Record<string, any>
  automationLevel: 'manual' | 'semi_automated' | 'fully_automated'
  requiresApproval: boolean
  approvalRoles: string[]
  successCriteria: Record<string, any>
  failureHandling: Record<string, any>
  estimatedDuration?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProcessStep {
  stepId: string
  stepName: string
  stepType: 'condition' | 'action' | 'approval' | 'notification' | 'data_entry'
  stepOrder: number
  conditions?: Record<string, any>
  actions: Record<string, any>
  requiredData?: string[]
  timeout?: number
  retryPolicy?: Record<string, any>
}

export interface AIDecision {
  id: string
  businessUnitId: string
  decisionType: 'scheduling' | 'pricing' | 'customer_service' | 'resource_allocation'
  decisionContext: Record<string, any>
  decisionMade: Record<string, any>
  confidenceScore: number
  reasoning: string
  policiesApplied: string[]
  processesTriggered: string[]
  outcome?: 'successful' | 'failed' | 'pending' | 'cancelled'
  humanOverride: boolean
  overrideReason?: string
  feedbackScore?: number
  feedbackNotes?: string
  createdAt: string
  resolvedAt?: string
}

export interface CustomerInteraction {
  id: string
  businessUnitId: string
  customerContactId: string
  interactionType: 'email' | 'phone' | 'chat' | 'service_call' | 'complaint' | 'inquiry'
  interactionChannel: 'email' | 'phone' | 'website' | 'mobile_app' | 'in_person'
  interactionSummary: string
  interactionDetails: Record<string, any>
  sentimentScore?: number
  priorityLevel: 'low' | 'normal' | 'high' | 'urgent' | 'emergency'
  status: 'open' | 'in_progress' | 'resolved' | 'escalated' | 'closed'
  assignedTo?: string
  aiHandled: boolean
  aiConfidence?: number
  resolutionTime?: string
  customerSatisfaction?: number
  followUpRequired: boolean
  followUpDate?: string
  createdAt: string
  resolvedAt?: string
}

export interface JobPrioritizationRule {
  id: string
  businessUnitId: string
  ruleName: string
  ruleDescription?: string
  priorityFactors: Record<string, any>
  scoringAlgorithm: Record<string, any>
  conditions: Record<string, any>
  weight: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PredictiveMaintenanceRule {
  id: string
  businessUnitId: string
  equipmentType: string
  ruleName: string
  predictionModel: Record<string, any>
  warningIndicators: Record<string, any>
  maintenanceActions: Record<string, any>
  leadTime: string
  costThreshold?: number
  safetyCritical: boolean
  isActive: boolean
  accuracyRate: number
  createdAt: string
  updatedAt: string
}

export interface EmailProcessingItem {
  id: string
  businessUnitId: string
  emailId: string
  senderEmail: string
  senderName?: string
  subject: string
  bodyText: string
  bodyHtml?: string
  attachments: any[]
  receivedAt: string
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'manual_review'
  aiClassification: Record<string, any>
  confidenceScore?: number
  actionsTaken: any[]
  customerContactId?: string
  leadId?: string
  bookingCreated?: string
  requiresHumanReview: boolean
  humanReviewedBy?: string
  humanReviewedAt?: string
  processedAt?: string
  createdAt: string
}

// ============================================================================
// BUSINESS AUTOMATION AI CLASS
// ============================================================================

export class BusinessAutomationAI {
  private businessUnitId: string
  private policies: CompanyPolicy[] = []
  private processes: BusinessProcess[] = []
  private prioritizationRules: JobPrioritizationRule[] = []
  private maintenanceRules: PredictiveMaintenanceRule[] = []

  constructor(businessUnitId: string) {
    this.businessUnitId = businessUnitId
  }

  // ============================================================================
  // INITIALIZATION AND CONTEXT LOADING
  // ============================================================================

  async initialize(): Promise<void> {
    try {
      console.log('🤖 Initializing Business Automation AI...')
      
      // Load all business rules and policies
      await Promise.all([
        this.loadCompanyPolicies(),
        this.loadBusinessProcesses(),
        this.loadJobPrioritizationRules(),
        this.loadPredictiveMaintenanceRules()
      ])

      console.log('✅ Business Automation AI initialized successfully')
    } catch (error) {
      console.error('❌ Error initializing Business Automation AI:', error)
      throw error
    }
  }

  private async loadCompanyPolicies(): Promise<void> {
    const { data, error } = await supabase
      .from('company_policies')
      .select('*')
      .eq('business_unit_id', this.businessUnitId)
      .eq('is_active', true)
      .order('priority_level', { ascending: false })

    if (error) throw error
    this.policies = data?.map(this.mapPolicyFromDB) || []
    console.log(`📋 Loaded ${this.policies.length} company policies`)
  }

  private async loadBusinessProcesses(): Promise<void> {
    const { data, error } = await supabase
      .from('business_processes')
      .select('*')
      .eq('business_unit_id', this.businessUnitId)
      .eq('is_active', true)
      .order('process_name')

    if (error) throw error
    this.processes = data?.map(this.mapProcessFromDB) || []
    console.log(`⚙️ Loaded ${this.processes.length} business processes`)
  }

  private async loadJobPrioritizationRules(): Promise<void> {
    const { data, error } = await supabase
      .from('job_prioritization_rules')
      .select('*')
      .eq('business_unit_id', this.businessUnitId)
      .eq('is_active', true)
      .order('weight', { ascending: false })

    if (error) throw error
    this.prioritizationRules = data?.map(this.mapPrioritizationRuleFromDB) || []
    console.log(`📊 Loaded ${this.prioritizationRules.length} job prioritization rules`)
  }

  private async loadPredictiveMaintenanceRules(): Promise<void> {
    const { data, error } = await supabase
      .from('predictive_maintenance_rules')
      .select('*')
      .eq('business_unit_id', this.businessUnitId)
      .eq('is_active', true)
      .order('accuracy_rate', { ascending: false })

    if (error) throw error
    this.maintenanceRules = data?.map(this.mapMaintenanceRuleFromDB) || []
    console.log(`🔧 Loaded ${this.maintenanceRules.length} predictive maintenance rules`)
  }

  // ============================================================================
  // JOB PRIORITIZATION AND SCHEDULING
  // ============================================================================

  async prioritizeJobs(jobs: any[]): Promise<any[]> {
    console.log(`🎯 Prioritizing ${jobs.length} jobs using AI algorithms...`)

    const prioritizedJobs = await Promise.all(
      jobs.map(async (job) => {
        const priorityScore = await this.calculateJobPriority(job)
        const schedulingSuggestions = await this.generateSchedulingSuggestions(job)
        
        return {
          ...job,
          aiPriorityScore: priorityScore.score,
          aiPriorityReasoning: priorityScore.reasoning,
          aiSchedulingSuggestions: schedulingSuggestions,
          aiProcessedAt: new Date().toISOString()
        }
      })
    )

    // Sort by priority score (highest first)
    const sortedJobs = prioritizedJobs.sort((a, b) => b.aiPriorityScore - a.aiPriorityScore)

    // Log the decision
    await this.logAIDecision({
      decisionType: 'scheduling',
      decisionContext: { jobCount: jobs.length, averagePriority: this.calculateAveragePriority(sortedJobs) },
      decisionMade: { prioritizedJobIds: sortedJobs.map(j => j.id) },
      confidenceScore: 0.85,
      reasoning: `Prioritized ${jobs.length} jobs using ${this.prioritizationRules.length} active rules`
    })

    console.log('✅ Job prioritization completed')
    return sortedJobs
  }

  private async calculateJobPriority(job: any): Promise<{ score: number; reasoning: string }> {
    let totalScore = 0
    let totalWeight = 0
    const reasoningParts: string[] = []

    for (const rule of this.prioritizationRules) {
      if (this.evaluateRuleConditions(rule.conditions, job)) {
        const ruleScore = this.calculateRuleScore(rule, job)
        totalScore += ruleScore * rule.weight
        totalWeight += rule.weight
        
        reasoningParts.push(`${rule.ruleName}: ${ruleScore.toFixed(2)} (weight: ${rule.weight})`)
      }
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 50 // Default score
    const reasoning = reasoningParts.length > 0 
      ? `Priority calculated using: ${reasoningParts.join(', ')}`
      : 'Default priority applied (no matching rules)'

    return { score: Math.min(100, Math.max(0, finalScore)), reasoning }
  }

  private calculateRuleScore(rule: JobPrioritizationRule, job: any): number {
    const factors = rule.priorityFactors
    let score = 0

    // Customer tier factor
    if (factors.customerTier && job.customerTier) {
      const tierScores = { 'premium': 90, 'standard': 60, 'basic': 30 }
      score += tierScores[job.customerTier] || 50
    }

    // Urgency factor
    if (factors.urgency && job.priority) {
      const urgencyScores = { 'emergency': 100, 'urgent': 80, 'high': 60, 'medium': 40, 'low': 20 }
      score += urgencyScores[job.priority.toLowerCase()] || 40
    }

    // Revenue factor
    if (factors.revenue && job.estimatedRevenue) {
      const revenueScore = Math.min(100, (job.estimatedRevenue / 1000) * 10) // £1000 = 10 points
      score += revenueScore
    }

    // Age factor (older jobs get higher priority)
    if (factors.age && job.createdAt) {
      const ageInDays = (Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      const ageScore = Math.min(50, ageInDays * 2) // 2 points per day, max 50
      score += ageScore
    }

    // Equipment availability factor
    if (factors.equipmentAvailability && job.requiredEquipment) {
      // This would check actual equipment availability
      score += 30 // Placeholder
    }

    return score / Object.keys(factors).length // Average the factors
  }

  private async generateSchedulingSuggestions(job: any): Promise<any[]> {
    const suggestions = []

    // Time slot suggestions based on job type and duration
    const optimalTimeSlots = await this.findOptimalTimeSlots(job)
    suggestions.push(...optimalTimeSlots)

    // Equipment assignment suggestions
    const equipmentSuggestions = await this.suggestOptimalEquipment(job)
    suggestions.push(...equipmentSuggestions)

    // Staff assignment suggestions
    const staffSuggestions = await this.suggestOptimalStaff(job)
    suggestions.push(...staffSuggestions)

    return suggestions
  }

  private async findOptimalTimeSlots(job: any): Promise<any[]> {
    // This would analyze historical data, weather, traffic, etc.
    return [
      {
        type: 'time_slot',
        suggestion: 'Morning slot (8:00-12:00)',
        reasoning: 'Optimal for this job type based on historical performance',
        confidence: 0.8
      }
    ]
  }

  private async suggestOptimalEquipment(job: any): Promise<any[]> {
    // This would check equipment availability, maintenance schedules, location, etc.
    return [
      {
        type: 'equipment',
        suggestion: 'Tanker Unit TK-001',
        reasoning: 'Available, recently serviced, optimal capacity for job',
        confidence: 0.9
      }
    ]
  }

  private async suggestOptimalStaff(job: any): Promise<any[]> {
    // This would check staff availability, skills, certifications, location, etc.
    return [
      {
        type: 'staff',
        suggestion: 'John Smith (Lead Technician)',
        reasoning: 'Available, has required certifications, familiar with customer',
        confidence: 0.85
      }
    ]
  }

  // ============================================================================
  // CUSTOMER SERVICE AUTOMATION
  // ============================================================================

  async processCustomerInteraction(interaction: Partial<CustomerInteraction>): Promise<CustomerInteraction> {
    console.log(`📞 Processing customer interaction: ${interaction.interactionType}`)

    try {
      // Analyze sentiment
      const sentimentScore = await this.analyzeSentiment(interaction.interactionSummary || '')
      
      // Determine priority level
      const priorityLevel = this.determinePriorityLevel(interaction, sentimentScore)
      
      // Check if AI can handle this automatically
      const aiCanHandle = await this.canAIHandleInteraction(interaction)
      
      // Generate response or escalation
      const aiResponse = aiCanHandle 
        ? await this.generateAIResponse(interaction)
        : await this.escalateToHuman(interaction)

      // Create the interaction record
      const { data, error } = await supabase
        .from('customer_interaction_history')
        .insert({
          business_unit_id: this.businessUnitId,
          customer_contact_id: interaction.customerContactId,
          interaction_type: interaction.interactionType,
          interaction_channel: interaction.interactionChannel,
          interaction_summary: interaction.interactionSummary,
          interaction_details: interaction.interactionDetails || {},
          sentiment_score: sentimentScore,
          priority_level: priorityLevel,
          status: aiCanHandle ? 'in_progress' : 'open',
          ai_handled: aiCanHandle,
          ai_confidence: aiResponse.confidence,
          follow_up_required: aiResponse.followUpRequired,
          follow_up_date: aiResponse.followUpDate,
          metadata: {
            aiResponse: aiResponse.response,
            processingTime: aiResponse.processingTime,
            policiesApplied: aiResponse.policiesApplied
          }
        })
        .select()
        .single()

      if (error) throw error

      console.log(`✅ Customer interaction processed (AI handled: ${aiCanHandle})`)
      return this.mapInteractionFromDB(data)

    } catch (error) {
      console.error('❌ Error processing customer interaction:', error)
      throw error
    }
  }

  private async analyzeSentiment(text: string): Promise<number> {
    // This would use a sentiment analysis service or model
    // For now, simple keyword-based analysis
    const positiveWords = ['happy', 'satisfied', 'great', 'excellent', 'good', 'pleased', 'thank']
    const negativeWords = ['angry', 'frustrated', 'terrible', 'awful', 'bad', 'disappointed', 'complaint']
    
    const lowerText = text.toLowerCase()
    let score = 0
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score += 0.1
    })
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score -= 0.1
    })
    
    return Math.max(-1, Math.min(1, score))
  }

  private determinePriorityLevel(interaction: any, sentimentScore: number): string {
    // Emergency keywords
    if (interaction.interactionSummary?.toLowerCase().includes('emergency') ||
        interaction.interactionSummary?.toLowerCase().includes('urgent') ||
        interaction.interactionSummary?.toLowerCase().includes('overflow')) {
      return 'emergency'
    }

    // High priority for very negative sentiment
    if (sentimentScore < -0.5) {
      return 'high'
    }

    // High priority for complaints
    if (interaction.interactionType === 'complaint') {
      return 'high'
    }

    // Urgent for service calls
    if (interaction.interactionType === 'service_call') {
      return 'urgent'
    }

    return 'normal'
  }

  private async canAIHandleInteraction(interaction: any): Promise<boolean> {
    // Check company policies for AI automation rules
    const relevantPolicies = this.policies.filter(p => 
      p.policyCategory === 'customer_service' && 
      p.policyRules.aiAutomation
    )

    for (const policy of relevantPolicies) {
      const rules = policy.policyRules.aiAutomation
      
      // Check if interaction type is allowed for AI
      if (rules.allowedInteractionTypes && 
          !rules.allowedInteractionTypes.includes(interaction.interactionType)) {
        return false
      }

      // Check if priority level requires human intervention
      if (rules.humanRequiredForPriority && 
          rules.humanRequiredForPriority.includes(interaction.priorityLevel)) {
        return false
      }
    }

    // Simple rules for now
    const aiHandleableTypes = ['inquiry', 'booking_request', 'status_update']
    return aiHandleableTypes.includes(interaction.interactionType)
  }

  private async generateAIResponse(interaction: any): Promise<any> {
    // This would integrate with an LLM to generate appropriate responses
    return {
      response: 'Thank you for contacting us. We have received your inquiry and will process it shortly.',
      confidence: 0.8,
      followUpRequired: true,
      followUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      processingTime: 150, // ms
      policiesApplied: ['customer_service_response_time', 'professional_communication']
    }
  }

  private async escalateToHuman(interaction: any): Promise<any> {
    return {
      response: 'This interaction requires human attention and has been escalated.',
      confidence: 1.0,
      followUpRequired: true,
      followUpDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
      processingTime: 50, // ms
      policiesApplied: ['human_escalation_required']
    }
  }

  // ============================================================================
  // EMAIL PROCESSING AUTOMATION
  // ============================================================================

  async processEmailQueue(): Promise<void> {
    console.log('📧 Processing email queue...')

    const { data: pendingEmails, error } = await supabase
      .from('email_processing_queue')
      .select('*')
      .eq('business_unit_id', this.businessUnitId)
      .eq('processing_status', 'pending')
      .order('received_at', { ascending: true })
      .limit(10) // Process 10 emails at a time

    if (error) {
      console.error('❌ Error fetching pending emails:', error)
      return
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      console.log('📧 No pending emails to process')
      return
    }

    console.log(`📧 Processing ${pendingEmails.length} pending emails`)

    for (const email of pendingEmails) {
      try {
        await this.processIndividualEmail(email)
      } catch (error) {
        console.error(`❌ Error processing email ${email.id}:`, error)
        
        // Mark email as failed
        await supabase
          .from('email_processing_queue')
          .update({
            processing_status: 'failed',
            processed_at: new Date().toISOString(),
            metadata: { error: error.message }
          })
          .eq('id', email.id)
      }
    }

    console.log('✅ Email queue processing completed')
  }

  private async processIndividualEmail(email: any): Promise<void> {
    console.log(`📧 Processing email from ${email.sender_email}: ${email.subject}`)

    // Update status to processing
    await supabase
      .from('email_processing_queue')
      .update({ processing_status: 'processing' })
      .eq('id', email.id)

    // Classify email content
    const classification = await this.classifyEmail(email)
    
    // Determine actions based on classification
    const actions = await this.determineEmailActions(email, classification)
    
    // Execute actions
    const executionResults = await this.executeEmailActions(email, actions)
    
    // Update email record with results
    await supabase
      .from('email_processing_queue')
      .update({
        processing_status: executionResults.requiresHumanReview ? 'manual_review' : 'completed',
        ai_classification: classification,
        confidence_score: classification.confidence,
        actions_taken: executionResults.actions,
        customer_contact_id: executionResults.customerContactId,
        lead_id: executionResults.leadId,
        booking_created: executionResults.bookingCreated,
        requires_human_review: executionResults.requiresHumanReview,
        processed_at: new Date().toISOString(),
        metadata: {
          processingTime: executionResults.processingTime,
          classification: classification
        }
      })
      .eq('id', email.id)

    console.log(`✅ Email processed: ${executionResults.actions.length} actions taken`)
  }

  private async classifyEmail(email: any): Promise<any> {
    // This would use NLP/ML to classify email content
    // For now, simple keyword-based classification
    
    const subject = email.subject.toLowerCase()
    const body = email.body_text.toLowerCase()
    const content = `${subject} ${body}`

    let classification = {
      type: 'general_inquiry',
      intent: 'information_request',
      urgency: 'normal',
      confidence: 0.6,
      keywords: [],
      entities: {}
    }

    // Booking/Service requests
    if (content.includes('book') || content.includes('schedule') || content.includes('appointment')) {
      classification.type = 'booking_request'
      classification.intent = 'schedule_service'
      classification.confidence = 0.8
    }

    // Complaints
    if (content.includes('complaint') || content.includes('problem') || content.includes('issue')) {
      classification.type = 'complaint'
      classification.intent = 'resolve_issue'
      classification.urgency = 'high'
      classification.confidence = 0.9
    }

    // Emergency
    if (content.includes('emergency') || content.includes('urgent') || content.includes('overflow')) {
      classification.type = 'emergency'
      classification.intent = 'immediate_service'
      classification.urgency = 'emergency'
      classification.confidence = 0.95
    }

    // Quote requests
    if (content.includes('quote') || content.includes('price') || content.includes('cost')) {
      classification.type = 'quote_request'
      classification.intent = 'pricing_information'
      classification.confidence = 0.85
    }

    return classification
  }

  private async determineEmailActions(email: any, classification: any): Promise<any[]> {
    const actions = []

    switch (classification.type) {
      case 'booking_request':
        actions.push({
          type: 'create_lead',
          priority: 'high',
          data: {
            source: 'email',
            customerEmail: email.sender_email,
            customerName: email.sender_name,
            serviceType: 'general', // Would be extracted from content
            notes: `Email booking request: ${email.subject}`
          }
        })
        
        actions.push({
          type: 'send_acknowledgment',
          template: 'booking_request_received',
          data: {
            customerEmail: email.sender_email,
            estimatedResponseTime: '24 hours'
          }
        })
        break

      case 'emergency':
        actions.push({
          type: 'create_urgent_lead',
          priority: 'emergency',
          data: {
            source: 'email',
            customerEmail: email.sender_email,
            customerName: email.sender_name,
            serviceType: 'emergency',
            notes: `EMERGENCY: ${email.subject}`
          }
        })
        
        actions.push({
          type: 'notify_on_call_team',
          data: {
            customerEmail: email.sender_email,
            urgency: 'emergency',
            details: email.body_text
          }
        })
        break

      case 'complaint':
        actions.push({
          type: 'create_customer_interaction',
          data: {
            interactionType: 'complaint',
            priority: 'high',
            customerEmail: email.sender_email,
            summary: email.subject,
            details: email.body_text
          }
        })
        
        actions.push({
          type: 'escalate_to_manager',
          data: {
            reason: 'customer_complaint',
            customerEmail: email.sender_email
          }
        })
        break

      case 'quote_request':
        actions.push({
          type: 'create_lead',
          priority: 'medium',
          data: {
            source: 'email',
            customerEmail: email.sender_email,
            customerName: email.sender_name,
            serviceType: 'quote_request',
            notes: `Quote request: ${email.subject}`
          }
        })
        break

      default:
        actions.push({
          type: 'create_general_inquiry',
          data: {
            customerEmail: email.sender_email,
            subject: email.subject,
            content: email.body_text
          }
        })
    }

    return actions
  }

  private async executeEmailActions(email: any, actions: any[]): Promise<any> {
    const executionResults = {
      actions: [],
      customerContactId: null,
      leadId: null,
      bookingCreated: null,
      requiresHumanReview: false,
      processingTime: Date.now()
    }

    for (const action of actions) {
      try {
        const result = await this.executeAction(action, email)
        executionResults.actions.push({
          ...action,
          result: result.success ? 'completed' : 'failed',
          details: result.details,
          executedAt: new Date().toISOString()
        })

        // Store relevant IDs
        if (result.customerContactId) executionResults.customerContactId = result.customerContactId
        if (result.leadId) executionResults.leadId = result.leadId
        if (result.bookingId) executionResults.bookingCreated = result.bookingId
        if (result.requiresHumanReview) executionResults.requiresHumanReview = true

      } catch (error) {
        console.error(`❌ Error executing action ${action.type}:`, error)
        executionResults.actions.push({
          ...action,
          result: 'failed',
          error: error.message,
          executedAt: new Date().toISOString()
        })
        executionResults.requiresHumanReview = true
      }
    }

    executionResults.processingTime = Date.now() - executionResults.processingTime
    return executionResults
  }

  private async executeAction(action: any, email: any): Promise<any> {
    switch (action.type) {
      case 'create_lead':
      case 'create_urgent_lead':
        return await this.createLeadFromEmail(action.data, email)
      
      case 'create_customer_interaction':
        return await this.createCustomerInteractionFromEmail(action.data, email)
      
      case 'send_acknowledgment':
        return await this.sendAcknowledgmentEmail(action.data, email)
      
      case 'notify_on_call_team':
        return await this.notifyOnCallTeam(action.data, email)
      
      case 'escalate_to_manager':
        return await this.escalateToManager(action.data, email)
      
      default:
        return { success: false, details: `Unknown action type: ${action.type}` }
    }
  }

  private async createLeadFromEmail(actionData: any, email: any): Promise<any> {
    // This would create a lead in the leads table
    console.log(`📝 Creating lead from email: ${email.sender_email}`)
    
    // For now, return a mock result
    return {
      success: true,
      leadId: 'lead_' + Date.now(),
      details: 'Lead created successfully',
      requiresHumanReview: actionData.priority === 'emergency'
    }
  }

  private async createCustomerInteractionFromEmail(actionData: any, email: any): Promise<any> {
    console.log(`📞 Creating customer interaction from email: ${email.sender_email}`)
    
    return {
      success: true,
      interactionId: 'interaction_' + Date.now(),
      details: 'Customer interaction created',
      requiresHumanReview: true
    }
  }

  private async sendAcknowledgmentEmail(actionData: any, email: any): Promise<any> {
    console.log(`📧 Sending acknowledgment email to: ${actionData.customerEmail}`)
    
    // This would integrate with email service
    return {
      success: true,
      details: 'Acknowledgment email sent',
      emailSent: true
    }
  }

  private async notifyOnCallTeam(actionData: any, email: any): Promise<any> {
    console.log(`🚨 Notifying on-call team for emergency: ${email.sender_email}`)
    
    // This would send notifications to on-call staff
    return {
      success: true,
      details: 'On-call team notified',
      notificationsSent: 3
    }
  }

  private async escalateToManager(actionData: any, email: any): Promise<any> {
    console.log(`⬆️ Escalating to manager: ${actionData.reason}`)
    
    return {
      success: true,
      details: 'Escalated to manager',
      requiresHumanReview: true
    }
  }

  // ============================================================================
  // PREDICTIVE MAINTENANCE
  // ============================================================================

  async runPredictiveMaintenanceAnalysis(): Promise<void> {
    console.log('🔧 Running predictive maintenance analysis...')

    // Get all equipment that needs analysis
    const equipment = await this.getAllEquipmentForMaintenance()
    
    for (const equipmentItem of equipment) {
      const relevantRules = this.maintenanceRules.filter(rule => 
        rule.equipmentType === equipmentItem.type || rule.equipmentType === 'all'
      )

      for (const rule of relevantRules) {
        const analysis = await this.analyzeEquipmentCondition(equipmentItem, rule)
        
        if (analysis.maintenanceRequired) {
          await this.schedulePreventiveMaintenance(equipmentItem, rule, analysis)
        }
      }
    }

    console.log('✅ Predictive maintenance analysis completed')
  }

  private async getAllEquipmentForMaintenance(): Promise<any[]> {
    // This would fetch all equipment from various equipment tables
    const equipmentTypes = ['tanker_equipment', 'jetvac_equipment', 'excavator_equipment', 'van_equipment']
    const allEquipment = []

    for (const type of equipmentTypes) {
      try {
        const { data, error } = await supabase
          .from(type)
          .select('*')
          .eq('business_unit_id', this.businessUnitId)
          .eq('is_active', true)

        if (!error && data) {
          allEquipment.push(...data.map(item => ({ ...item, type })))
        }
      } catch (error) {
        console.error(`Error fetching ${type}:`, error)
      }
    }

    return allEquipment
  }

  private async analyzeEquipmentCondition(equipment: any, rule: PredictiveMaintenanceRule): Promise<any> {
    const analysis = {
      maintenanceRequired: false,
      urgency: 'low',
      confidence: 0.5,
      indicators: [],
      recommendedActions: [],
      estimatedCost: 0
    }

    // Check warning indicators from the rule
    const indicators = rule.warningIndicators

    // Service date analysis
    if (indicators.serviceDue && equipment.next_service_date) {
      const serviceDate = new Date(equipment.next_service_date)
      const now = new Date()
      const daysUntilService = (serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysUntilService <= 7) {
        analysis.maintenanceRequired = true
        analysis.urgency = daysUntilService <= 0 ? 'high' : 'medium'
        analysis.indicators.push(`Service due in ${Math.ceil(daysUntilService)} days`)
        analysis.confidence = 0.9
      }
    }

    // MOT expiry analysis
    if (indicators.motExpiry && equipment.mot_expiry_date) {
      const motDate = new Date(equipment.mot_expiry_date)
      const now = new Date()
      const daysUntilMOT = (motDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysUntilMOT <= 30) {
        analysis.maintenanceRequired = true
        analysis.urgency = daysUntilMOT <= 7 ? 'high' : 'medium'
        analysis.indicators.push(`MOT expires in ${Math.ceil(daysUntilMOT)} days`)
        analysis.confidence = 1.0
      }
    }

    // Insurance expiry analysis
    if (indicators.insuranceExpiry && equipment.insurance_expiry_date) {
      const insuranceDate = new Date(equipment.insurance_expiry_date)
      const now = new Date()
      const daysUntilExpiry = (insuranceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysUntilExpiry <= 30) {
        analysis.maintenanceRequired = true
        analysis.urgency = daysUntilExpiry <= 7 ? 'high' : 'medium'
        analysis.indicators.push(`Insurance expires in ${Math.ceil(daysUntilExpiry)} days`)
        analysis.confidence = 1.0
      }
    }

    // Generate recommended actions
    if (analysis.maintenanceRequired) {
      analysis.recommendedActions = rule.maintenanceActions.actions || [
        'Schedule maintenance inspection',
        'Contact service provider',
        'Update maintenance records'
      ]
      
      analysis.estimatedCost = rule.costThreshold || 500 // Default estimate
    }

    return analysis
  }

  private async schedulePreventiveMaintenance(equipment: any, rule: PredictiveMaintenanceRule, analysis: any): Promise<void> {
    console.log(`🔧 Scheduling preventive maintenance for ${equipment.equipment_name}`)

    // Log the AI decision
    await this.logAIDecision({
      decisionType: 'maintenance',
      decisionContext: {
        equipmentId: equipment.id,
        equipmentType: equipment.type,
        indicators: analysis.indicators,
        urgency: analysis.urgency
      },
      decisionMade: {
        maintenanceScheduled: true,
        actions: analysis.recommendedActions,
        estimatedCost: analysis.estimatedCost
      },
      confidenceScore: analysis.confidence,
      reasoning: `Predictive maintenance triggered: ${analysis.indicators.join(', ')}`
    })

    // This would integrate with scheduling system to create maintenance tasks
    console.log(`✅ Maintenance scheduled for ${equipment.equipment_name}`)
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async logAIDecision(decision: Partial<AIDecision>): Promise<void> {
    try {
      await supabase
        .from('ai_decision_log')
        .insert({
          business_unit_id: this.businessUnitId,
          decision_type: decision.decisionType,
          decision_context: decision.decisionContext,
          decision_made: decision.decisionMade,
          confidence_score: decision.confidenceScore,
          reasoning: decision.reasoning,
          policies_applied: decision.policiesApplied || [],
          processes_triggered: decision.processesTriggered || [],
          outcome: 'pending'
        })
    } catch (error) {
      console.error('❌ Error logging AI decision:', error)
    }
  }

  private evaluateRuleConditions(conditions: Record<string, any>, context: any): boolean {
    // Simple condition evaluation - would be more sophisticated in production
    if (!conditions || Object.keys(conditions).length === 0) return true
    
    for (const [key, value] of Object.entries(conditions)) {
      if (context[key] !== value) return false
    }
    
    return true
  }

  private calculateAveragePriority(jobs: any[]): number {
    if (jobs.length === 0) return 0
    return jobs.reduce((sum, job) => sum + job.aiPriorityScore, 0) / jobs.length
  }

  // ============================================================================
  // DATA MAPPING METHODS
  // ============================================================================

  private mapPolicyFromDB(data: any): CompanyPolicy {
    return {
      id: data.id,
      businessUnitId: data.business_unit_id,
      policyCategory: data.policy_category,
      policyName: data.policy_name,
      policyDescription: data.policy_description,
      policyRules: data.policy_rules,
      priorityLevel: data.priority_level,
      isActive: data.is_active,
      appliesTo: data.applies_to,
      exceptions: data.exceptions,
      effectiveDate: data.effective_date,
      expiryDate: data.expiry_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  private mapProcessFromDB(data: any): BusinessProcess {
    return {
      id: data.id,
      businessUnitId: data.business_unit_id,
      processName: data.process_name,
      processCategory: data.process_category,
      processDescription: data.process_description,
      processSteps: data.process_steps,
      triggerConditions: data.trigger_conditions,
      automationLevel: data.automation_level,
      requiresApproval: data.requires_approval,
      approvalRoles: data.approval_roles,
      successCriteria: data.success_criteria,
      failureHandling: data.failure_handling,
      estimatedDuration: data.estimated_duration,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  private mapPrioritizationRuleFromDB(data: any): JobPrioritizationRule {
    return {
      id: data.id,
      businessUnitId: data.business_unit_id,
      ruleName: data.rule_name,
      ruleDescription: data.rule_description,
      priorityFactors: data.priority_factors,
      scoringAlgorithm: data.scoring_algorithm,
      conditions: data.conditions,
      weight: data.weight,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  private mapMaintenanceRuleFromDB(data: any): PredictiveMaintenanceRule {
    return {
      id: data.id,
      businessUnitId: data.business_unit_id,
      equipmentType: data.equipment_type,
      ruleName: data.rule_name,
      predictionModel: data.prediction_model,
      warningIndicators: data.warning_indicators,
      maintenanceActions: data.maintenance_actions,
      leadTime: data.lead_time,
      costThreshold: data.cost_threshold,
      safetyCritical: data.safety_critical,
      isActive: data.is_active,
      accuracyRate: data.accuracy_rate,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  private mapInteractionFromDB(data: any): CustomerInteraction {
    return {
      id: data.id,
      businessUnitId: data.business_unit_id,
      customerContactId: data.customer_contact_id,
      interactionType: data.interaction_type,
      interactionChannel: data.interaction_channel,
      interactionSummary: data.interaction_summary,
      interactionDetails: data.interaction_details,
      sentimentScore: data.sentiment_score,
      priorityLevel: data.priority_level,
      status: data.status,
      assignedTo: data.assigned_to,
      aiHandled: data.ai_handled,
      aiConfidence: data.ai_confidence,
      resolutionTime: data.resolution_time,
      customerSatisfaction: data.customer_satisfaction,
      followUpRequired: data.follow_up_required,
      followUpDate: data.follow_up_date,
      createdAt: data.created_at,
      resolvedAt: data.resolved_at
    }
  }
}

// ============================================================================
// EXPORT DEFAULT INSTANCE FACTORY
// ============================================================================

export const createBusinessAutomationAI = (businessUnitId: string): BusinessAutomationAI => {
  return new BusinessAutomationAI(businessUnitId)
}
