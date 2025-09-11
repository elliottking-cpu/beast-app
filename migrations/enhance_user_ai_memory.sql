-- Enhanced User AI Memory System - AI remembers everything about each user

-- User Behavior Patterns - track how each user works
CREATE TABLE IF NOT EXISTS ai_user_behavior_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL, -- 'query_frequency', 'work_schedule', 'preferred_analysis', 'communication_style', etc.
  pattern_data JSONB NOT NULL,
  embedding vector(1536),
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  frequency_count INTEGER DEFAULT 1,
  first_observed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_observed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_unit_id, user_id, pattern_type)
);

-- User Expertise Levels - AI learns what each user knows
CREATE TABLE IF NOT EXISTS ai_user_expertise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL, -- 'customer_management', 'financial_analysis', 'job_scheduling', 'database_queries', etc.
  expertise_level DECIMAL(3,2) DEFAULT 0.0, -- 0.0 (beginner) to 1.0 (expert)
  evidence_data JSONB DEFAULT '{}', -- Examples of user's expertise
  embedding vector(1536),
  last_assessment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  improvement_rate DECIMAL(3,2) DEFAULT 0.0, -- How fast user is learning
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_unit_id, user_id, domain)
);

-- User Communication Preferences - how AI should talk to each user
CREATE TABLE IF NOT EXISTS ai_user_communication_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  style_aspect TEXT NOT NULL, -- 'formality_level', 'detail_preference', 'explanation_depth', 'response_length', etc.
  preference_value JSONB NOT NULL,
  embedding vector(1536),
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  learned_from_feedback BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_unit_id, user_id, style_aspect)
);

-- User Work Patterns - when and how users work
CREATE TABLE IF NOT EXISTS ai_user_work_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_category TEXT NOT NULL, -- 'schedule', 'productivity_peaks', 'task_preferences', 'workflow_style', etc.
  pattern_details JSONB NOT NULL,
  embedding vector(1536),
  effectiveness_score DECIMAL(3,2) DEFAULT 0.5, -- How effective this pattern is for the user
  frequency INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Goals and Objectives - what users are trying to achieve
CREATE TABLE IF NOT EXISTS ai_user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL, -- 'short_term', 'long_term', 'learning', 'performance', 'project', etc.
  goal_title TEXT NOT NULL,
  goal_description TEXT NOT NULL,
  embedding vector(1536),
  target_date DATE,
  progress_percentage DECIMAL(5,2) DEFAULT 0.0,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
  success_metrics JSONB DEFAULT '{}',
  ai_assistance_provided JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Interaction History - detailed history of user-AI interactions
CREATE TABLE IF NOT EXISTS ai_user_interaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'query', 'feedback', 'correction', 'praise', 'task_completion', etc.
  interaction_data JSONB NOT NULL,
  embedding vector(1536),
  user_satisfaction_score DECIMAL(3,2), -- 0.0 to 1.0 if user provided feedback
  ai_confidence_score DECIMAL(3,2) DEFAULT 0.5,
  outcome_success BOOLEAN,
  learning_value DECIMAL(3,2) DEFAULT 0.5, -- How much AI learned from this interaction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Shortcuts and Automations - AI learns user's repetitive tasks
CREATE TABLE IF NOT EXISTS ai_user_shortcuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shortcut_name TEXT NOT NULL,
  shortcut_description TEXT NOT NULL,
  trigger_pattern TEXT NOT NULL, -- What user says/does to trigger this
  action_sequence JSONB NOT NULL, -- What AI should do
  embedding vector(1536),
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 1.0,
  time_saved_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Mood and Context - AI adapts to user's current state
CREATE TABLE IF NOT EXISTS ai_user_context_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL, -- 'mood', 'stress_level', 'workload', 'urgency', 'focus_area', etc.
  context_value JSONB NOT NULL,
  embedding vector(1536),
  inferred_from TEXT, -- 'message_tone', 'query_urgency', 'time_of_day', 'explicit_feedback', etc.
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  expires_at TIMESTAMP WITH TIME ZONE, -- Some context is temporary
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_user_behavior_patterns_user ON ai_user_behavior_patterns(business_unit_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ai_user_behavior_patterns_embedding ON ai_user_behavior_patterns USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_ai_user_expertise_user ON ai_user_expertise(business_unit_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ai_user_expertise_domain ON ai_user_expertise(domain);
CREATE INDEX IF NOT EXISTS idx_ai_user_expertise_embedding ON ai_user_expertise USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_ai_user_communication_styles_user ON ai_user_communication_styles(business_unit_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ai_user_communication_styles_embedding ON ai_user_communication_styles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_ai_user_work_patterns_user ON ai_user_work_patterns(business_unit_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ai_user_work_patterns_embedding ON ai_user_work_patterns USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_ai_user_goals_user ON ai_user_goals(business_unit_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ai_user_goals_status ON ai_user_goals(status);
CREATE INDEX IF NOT EXISTS idx_ai_user_goals_embedding ON ai_user_goals USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_ai_user_interaction_history_user ON ai_user_interaction_history(business_unit_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ai_user_interaction_history_type ON ai_user_interaction_history(interaction_type);
CREATE INDEX IF NOT EXISTS idx_ai_user_interaction_history_embedding ON ai_user_interaction_history USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_ai_user_shortcuts_user ON ai_user_shortcuts(business_unit_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ai_user_shortcuts_active ON ai_user_shortcuts(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_user_shortcuts_embedding ON ai_user_shortcuts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_ai_user_context_state_user ON ai_user_context_state(business_unit_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ai_user_context_state_expires ON ai_user_context_state(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_user_context_state_embedding ON ai_user_context_state USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable Row Level Security for all user memory tables
ALTER TABLE ai_user_behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_expertise ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_communication_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_work_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_interaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_context_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data within their business unit
CREATE POLICY "Users can access their behavior patterns" ON ai_user_behavior_patterns
  FOR ALL USING (
    user_id = auth.uid() AND
    business_unit_id IN (
      SELECT bu.id FROM business_units bu 
      JOIN user_profiles up ON up.business_unit_id = bu.id 
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their expertise data" ON ai_user_expertise
  FOR ALL USING (
    user_id = auth.uid() AND
    business_unit_id IN (
      SELECT bu.id FROM business_units bu 
      JOIN user_profiles up ON up.business_unit_id = bu.id 
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their communication styles" ON ai_user_communication_styles
  FOR ALL USING (
    user_id = auth.uid() AND
    business_unit_id IN (
      SELECT bu.id FROM business_units bu 
      JOIN user_profiles up ON up.business_unit_id = bu.id 
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their work patterns" ON ai_user_work_patterns
  FOR ALL USING (
    user_id = auth.uid() AND
    business_unit_id IN (
      SELECT bu.id FROM business_units bu 
      JOIN user_profiles up ON up.business_unit_id = bu.id 
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their goals" ON ai_user_goals
  FOR ALL USING (
    user_id = auth.uid() AND
    business_unit_id IN (
      SELECT bu.id FROM business_units bu 
      JOIN user_profiles up ON up.business_unit_id = bu.id 
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their interaction history" ON ai_user_interaction_history
  FOR ALL USING (
    user_id = auth.uid() AND
    business_unit_id IN (
      SELECT bu.id FROM business_units bu 
      JOIN user_profiles up ON up.business_unit_id = bu.id 
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their shortcuts" ON ai_user_shortcuts
  FOR ALL USING (
    user_id = auth.uid() AND
    business_unit_id IN (
      SELECT bu.id FROM business_units bu 
      JOIN user_profiles up ON up.business_unit_id = bu.id 
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their context state" ON ai_user_context_state
  FOR ALL USING (
    user_id = auth.uid() AND
    business_unit_id IN (
      SELECT bu.id FROM business_units bu 
      JOIN user_profiles up ON up.business_unit_id = bu.id 
      WHERE up.user_id = auth.uid()
    )
  );

-- RPC Functions for User AI Memory Operations

-- Function to get comprehensive user profile for AI
CREATE OR REPLACE FUNCTION get_ai_user_profile(
  p_business_unit_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  user_expertise JSONB,
  communication_preferences JSONB,
  behavior_patterns JSONB,
  work_patterns JSONB,
  active_goals JSONB,
  recent_shortcuts JSONB,
  current_context JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- User expertise across different domains
    (SELECT jsonb_agg(
      jsonb_build_object(
        'domain', ue.domain,
        'level', ue.expertise_level,
        'improvement_rate', ue.improvement_rate,
        'last_assessment', ue.last_assessment_date
      )
    ) FROM ai_user_expertise ue 
     WHERE ue.business_unit_id = p_business_unit_id AND ue.user_id = p_user_id) as user_expertise,
    
    -- Communication style preferences
    (SELECT jsonb_agg(
      jsonb_build_object(
        'aspect', ucs.style_aspect,
        'preference', ucs.preference_value,
        'confidence', ucs.confidence_score
      )
    ) FROM ai_user_communication_styles ucs 
     WHERE ucs.business_unit_id = p_business_unit_id AND ucs.user_id = p_user_id) as communication_preferences,
    
    -- Behavior patterns
    (SELECT jsonb_agg(
      jsonb_build_object(
        'type', ubp.pattern_type,
        'data', ubp.pattern_data,
        'confidence', ubp.confidence_score,
        'frequency', ubp.frequency_count
      )
    ) FROM ai_user_behavior_patterns ubp 
     WHERE ubp.business_unit_id = p_business_unit_id AND ubp.user_id = p_user_id) as behavior_patterns,
    
    -- Work patterns
    (SELECT jsonb_agg(
      jsonb_build_object(
        'category', uwp.pattern_category,
        'details', uwp.pattern_details,
        'effectiveness', uwp.effectiveness_score
      )
    ) FROM ai_user_work_patterns uwp 
     WHERE uwp.business_unit_id = p_business_unit_id AND uwp.user_id = p_user_id) as work_patterns,
    
    -- Active goals
    (SELECT jsonb_agg(
      jsonb_build_object(
        'title', ug.goal_title,
        'description', ug.goal_description,
        'type', ug.goal_type,
        'progress', ug.progress_percentage,
        'target_date', ug.target_date
      )
    ) FROM ai_user_goals ug 
     WHERE ug.business_unit_id = p_business_unit_id AND ug.user_id = p_user_id AND ug.status = 'active') as active_goals,
    
    -- Recent shortcuts
    (SELECT jsonb_agg(
      jsonb_build_object(
        'name', us.shortcut_name,
        'description', us.shortcut_description,
        'trigger', us.trigger_pattern,
        'usage_count', us.usage_count,
        'success_rate', us.success_rate
      )
    ) FROM ai_user_shortcuts us 
     WHERE us.business_unit_id = p_business_unit_id AND us.user_id = p_user_id AND us.is_active = TRUE
     ORDER BY us.usage_count DESC LIMIT 10) as recent_shortcuts,
    
    -- Current context (non-expired)
    (SELECT jsonb_agg(
      jsonb_build_object(
        'type', ucs.context_type,
        'value', ucs.context_value,
        'confidence', ucs.confidence_score,
        'inferred_from', ucs.inferred_from
      )
    ) FROM ai_user_context_state ucs 
     WHERE ucs.business_unit_id = p_business_unit_id AND ucs.user_id = p_user_id 
     AND (ucs.expires_at IS NULL OR ucs.expires_at > NOW())) as current_context;
END;
$$;

-- Function to record user interaction and learn from it
CREATE OR REPLACE FUNCTION record_user_ai_interaction(
  p_business_unit_id UUID,
  p_user_id UUID,
  p_interaction_type TEXT,
  p_interaction_data JSONB,
  p_embedding vector(1536),
  p_user_satisfaction DECIMAL DEFAULT NULL,
  p_outcome_success BOOLEAN DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  interaction_id UUID;
  learning_value DECIMAL(3,2) := 0.5;
BEGIN
  -- Calculate learning value based on interaction type and outcome
  IF p_interaction_type = 'feedback' AND p_user_satisfaction IS NOT NULL THEN
    learning_value := GREATEST(0.0, LEAST(1.0, p_user_satisfaction));
  ELSIF p_interaction_type = 'correction' THEN
    learning_value := 0.8; -- High learning value from corrections
  ELSIF p_interaction_type = 'praise' THEN
    learning_value := 0.6; -- Moderate learning value from praise
  END IF;

  -- Insert interaction record
  INSERT INTO ai_user_interaction_history (
    business_unit_id,
    user_id,
    interaction_type,
    interaction_data,
    embedding,
    user_satisfaction_score,
    outcome_success,
    learning_value
  ) VALUES (
    p_business_unit_id,
    p_user_id,
    p_interaction_type,
    p_interaction_data,
    p_embedding,
    p_user_satisfaction,
    p_outcome_success,
    learning_value
  ) RETURNING id INTO interaction_id;
  
  RETURN interaction_id;
END;
$$;

-- Function to update user expertise based on interactions
CREATE OR REPLACE FUNCTION update_user_expertise(
  p_business_unit_id UUID,
  p_user_id UUID,
  p_domain TEXT,
  p_evidence_data JSONB,
  p_embedding vector(1536),
  p_performance_indicator DECIMAL DEFAULT 0.5
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_level DECIMAL(3,2);
  new_level DECIMAL(3,2);
  improvement DECIMAL(3,2);
BEGIN
  -- Get current expertise level
  SELECT expertise_level INTO current_level
  FROM ai_user_expertise
  WHERE business_unit_id = p_business_unit_id 
    AND user_id = p_user_id 
    AND domain = p_domain;
  
  -- If no record exists, create one
  IF current_level IS NULL THEN
    current_level := 0.0;
    INSERT INTO ai_user_expertise (
      business_unit_id, user_id, domain, expertise_level, evidence_data, embedding
    ) VALUES (
      p_business_unit_id, p_user_id, p_domain, p_performance_indicator, p_evidence_data, p_embedding
    );
    RETURN;
  END IF;
  
  -- Calculate new expertise level (weighted average with slight bias toward improvement)
  improvement := (p_performance_indicator - current_level) * 0.1; -- 10% adjustment rate
  new_level := GREATEST(0.0, LEAST(1.0, current_level + improvement));
  
  -- Update expertise record
  UPDATE ai_user_expertise SET
    expertise_level = new_level,
    evidence_data = evidence_data || p_evidence_data,
    embedding = p_embedding,
    improvement_rate = improvement,
    last_assessment_date = NOW(),
    updated_at = NOW()
  WHERE business_unit_id = p_business_unit_id 
    AND user_id = p_user_id 
    AND domain = p_domain;
END;
$$;

-- Function to suggest personalized shortcuts for user
CREATE OR REPLACE FUNCTION suggest_user_shortcuts(
  p_business_unit_id UUID,
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  shortcut_name TEXT,
  shortcut_description TEXT,
  trigger_pattern TEXT,
  usage_count INTEGER,
  success_rate DECIMAL(3,2),
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.shortcut_name,
    us.shortcut_description,
    us.trigger_pattern,
    us.usage_count,
    us.success_rate,
    1 - (us.embedding <=> p_query_embedding) as similarity
  FROM ai_user_shortcuts us
  WHERE us.business_unit_id = p_business_unit_id
    AND us.user_id = p_user_id
    AND us.is_active = TRUE
    AND us.embedding IS NOT NULL
  ORDER BY us.embedding <=> p_query_embedding, us.usage_count DESC
  LIMIT p_limit;
END;
$$;

-- Function to clean up expired context data
CREATE OR REPLACE FUNCTION cleanup_expired_user_context()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_user_context_state 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to get user learning analytics
CREATE OR REPLACE FUNCTION get_user_learning_analytics(
  p_business_unit_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  total_interactions INTEGER,
  avg_satisfaction DECIMAL(3,2),
  expertise_domains INTEGER,
  avg_expertise_level DECIMAL(3,2),
  active_shortcuts INTEGER,
  total_time_saved_minutes INTEGER,
  learning_trend TEXT,
  top_expertise_domain TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM ai_user_interaction_history 
     WHERE business_unit_id = p_business_unit_id AND user_id = p_user_id),
    (SELECT COALESCE(AVG(user_satisfaction_score), 0.0)::DECIMAL(3,2) 
     FROM ai_user_interaction_history 
     WHERE business_unit_id = p_business_unit_id AND user_id = p_user_id 
     AND user_satisfaction_score IS NOT NULL),
    (SELECT COUNT(*)::INTEGER FROM ai_user_expertise 
     WHERE business_unit_id = p_business_unit_id AND user_id = p_user_id),
    (SELECT COALESCE(AVG(expertise_level), 0.0)::DECIMAL(3,2) FROM ai_user_expertise 
     WHERE business_unit_id = p_business_unit_id AND user_id = p_user_id),
    (SELECT COUNT(*)::INTEGER FROM ai_user_shortcuts 
     WHERE business_unit_id = p_business_unit_id AND user_id = p_user_id AND is_active = TRUE),
    (SELECT COALESCE(SUM(time_saved_minutes), 0)::INTEGER FROM ai_user_shortcuts 
     WHERE business_unit_id = p_business_unit_id AND user_id = p_user_id),
    (SELECT CASE 
       WHEN AVG(improvement_rate) > 0.1 THEN 'improving'
       WHEN AVG(improvement_rate) < -0.1 THEN 'declining'
       ELSE 'stable'
     END FROM ai_user_expertise 
     WHERE business_unit_id = p_business_unit_id AND user_id = p_user_id),
    (SELECT domain FROM ai_user_expertise 
     WHERE business_unit_id = p_business_unit_id AND user_id = p_user_id 
     ORDER BY expertise_level DESC LIMIT 1);
END;
$$;
