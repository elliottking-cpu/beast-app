-- Enable pgvector extension for AI embeddings and memory
CREATE EXTENSION IF NOT EXISTS vector;

-- Create AI memory tables with vector embeddings for each business unit

-- AI Conversations with embeddings for semantic search
CREATE TABLE IF NOT EXISTS ai_conversations_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  conversation_id UUID NOT NULL, -- Groups related messages
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'ai')),
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI/Claude embedding dimension
  metadata JSONB DEFAULT '{}',
  importance_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0 to 1.0
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Business Insights Memory - what the AI has learned about the business
CREATE TABLE IF NOT EXISTS ai_business_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'customer_pattern', 'seasonal_trend', 'operational_insight', etc.
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  embedding vector(1536),
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  supporting_data JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI User Preferences - how AI should interact with each user
CREATE TABLE IF NOT EXISTS ai_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_type TEXT NOT NULL, -- 'communication_style', 'report_format', 'analysis_depth', etc.
  preference_value JSONB NOT NULL,
  embedding vector(1536),
  learned_from_interactions BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_unit_id, user_id, preference_type)
);

-- AI Knowledge Base - business-specific knowledge that AI can reference
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  knowledge_type TEXT NOT NULL, -- 'procedure', 'policy', 'best_practice', 'customer_info', etc.
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  source_type TEXT, -- 'manual_entry', 'learned_from_data', 'imported', etc.
  source_reference TEXT,
  tags TEXT[] DEFAULT '{}',
  importance_score DECIMAL(3,2) DEFAULT 0.5,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Decision History - track AI decisions for learning and auditing
CREATE TABLE IF NOT EXISTS ai_decision_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_type TEXT NOT NULL, -- 'query_generation', 'recommendation', 'analysis', etc.
  context_summary TEXT NOT NULL,
  decision_made TEXT NOT NULL,
  reasoning TEXT,
  embedding vector(1536),
  outcome_rating DECIMAL(3,2), -- User feedback on decision quality
  was_successful BOOLEAN,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Learning Progress - track what AI has learned over time
CREATE TABLE IF NOT EXISTS ai_learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  learning_category TEXT NOT NULL, -- 'customer_behavior', 'operational_patterns', 'user_preferences', etc.
  skill_level DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0
  learning_data JSONB NOT NULL,
  embedding vector(1536),
  last_improvement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_unit_id, learning_category)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_memory_business_unit ON ai_conversations_memory(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_memory_conversation ON ai_conversations_memory(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_memory_embedding ON ai_conversations_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_ai_business_insights_business_unit ON ai_business_insights(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_ai_business_insights_type ON ai_business_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_business_insights_embedding ON ai_business_insights USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_ai_user_preferences_business_unit ON ai_user_preferences(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_ai_user_preferences_user ON ai_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_user_preferences_embedding ON ai_user_preferences USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_base_business_unit ON ai_knowledge_base(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_base_type ON ai_knowledge_base(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_base_embedding ON ai_knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_ai_decision_history_business_unit ON ai_decision_history(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_ai_decision_history_embedding ON ai_decision_history USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_ai_learning_progress_business_unit ON ai_learning_progress(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_progress_embedding ON ai_learning_progress USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable Row Level Security for all AI memory tables
ALTER TABLE ai_conversations_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_business_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access AI memory for their business unit
CREATE POLICY "Users can access AI conversations for their business unit" ON ai_conversations_memory
  FOR ALL USING (
    business_unit_id IN (
      SELECT bu.id FROM business_units bu 
      JOIN user_profiles up ON up.business_unit_id = bu.id 
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access AI insights for their business unit" ON ai_business_insights
  FOR ALL USING (
    business_unit_id IN (
      SELECT bu.id FROM business_units bu 
      JOIN user_profiles up ON up.business_unit_id = bu.id 
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access AI preferences for their business unit" ON ai_user_preferences
  FOR ALL USING (
    business_unit_id IN (
      SELECT bu.id FROM business_units bu 
      JOIN user_profiles up ON up.business_unit_id = bu.id 
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access AI knowledge for their business unit" ON ai_knowledge_base
  FOR ALL USING (
    business_unit_id IN (
      SELECT bu.id FROM business_units bu 
      JOIN user_profiles up ON up.business_unit_id = bu.id 
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access AI decisions for their business unit" ON ai_decision_history
  FOR ALL USING (
    business_unit_id IN (
      SELECT bu.id FROM business_units bu 
      JOIN user_profiles up ON up.business_unit_id = bu.id 
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access AI learning for their business unit" ON ai_learning_progress
  FOR ALL USING (
    business_unit_id IN (
      SELECT bu.id FROM business_units bu 
      JOIN user_profiles up ON up.business_unit_id = bu.id 
      WHERE up.user_id = auth.uid()
    )
  );

-- Update AI configuration table to be per business unit
ALTER TABLE ai_configuration DROP CONSTRAINT IF EXISTS single_config;
ALTER TABLE ai_configuration DROP COLUMN IF EXISTS id;
ALTER TABLE ai_configuration ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id) ON DELETE CASCADE;
ALTER TABLE ai_configuration ADD CONSTRAINT ai_config_business_unit_unique UNIQUE(business_unit_id);

-- Update AI configuration RLS
ALTER TABLE ai_configuration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage AI config for their business unit" ON ai_configuration
  FOR ALL USING (
    business_unit_id IN (
      SELECT bu.id FROM business_units bu 
      JOIN user_profiles up ON up.business_unit_id = bu.id 
      WHERE up.user_id = auth.uid()
    )
  );

-- Create RPC functions for AI memory operations

-- Function to search AI memory using semantic similarity
CREATE OR REPLACE FUNCTION search_ai_memory(
  p_business_unit_id UUID,
  p_query_embedding vector(1536),
  p_memory_type TEXT DEFAULT 'all',
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  memory_type TEXT,
  similarity FLOAT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_memory_type = 'conversations' OR p_memory_type = 'all' THEN
    RETURN QUERY
    SELECT 
      acm.id,
      acm.content,
      'conversation'::TEXT as memory_type,
      1 - (acm.embedding <=> p_query_embedding) as similarity,
      acm.metadata,
      acm.created_at
    FROM ai_conversations_memory acm
    WHERE acm.business_unit_id = p_business_unit_id
      AND acm.embedding IS NOT NULL
    ORDER BY acm.embedding <=> p_query_embedding
    LIMIT p_limit;
  END IF;

  IF p_memory_type = 'insights' OR p_memory_type = 'all' THEN
    RETURN QUERY
    SELECT 
      abi.id,
      abi.description as content,
      'insight'::TEXT as memory_type,
      1 - (abi.embedding <=> p_query_embedding) as similarity,
      jsonb_build_object('title', abi.title, 'insight_type', abi.insight_type, 'confidence', abi.confidence_score) as metadata,
      abi.created_at
    FROM ai_business_insights abi
    WHERE abi.business_unit_id = p_business_unit_id
      AND abi.is_active = TRUE
      AND abi.embedding IS NOT NULL
    ORDER BY abi.embedding <=> p_query_embedding
    LIMIT p_limit;
  END IF;

  IF p_memory_type = 'knowledge' OR p_memory_type = 'all' THEN
    RETURN QUERY
    SELECT 
      akb.id,
      akb.content,
      'knowledge'::TEXT as memory_type,
      1 - (akb.embedding <=> p_query_embedding) as similarity,
      jsonb_build_object('title', akb.title, 'knowledge_type', akb.knowledge_type, 'tags', akb.tags) as metadata,
      akb.created_at
    FROM ai_knowledge_base akb
    WHERE akb.business_unit_id = p_business_unit_id
      AND akb.is_active = TRUE
      AND akb.embedding IS NOT NULL
    ORDER BY akb.embedding <=> p_query_embedding
    LIMIT p_limit;
  END IF;
END;
$$;

-- Function to store AI conversation with embedding
CREATE OR REPLACE FUNCTION store_ai_conversation(
  p_business_unit_id UUID,
  p_user_id UUID,
  p_conversation_id UUID,
  p_message_type TEXT,
  p_content TEXT,
  p_embedding vector(1536),
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO ai_conversations_memory (
    business_unit_id,
    user_id,
    conversation_id,
    message_type,
    content,
    embedding,
    metadata
  ) VALUES (
    p_business_unit_id,
    p_user_id,
    p_conversation_id,
    p_message_type,
    p_content,
    p_embedding,
    p_metadata
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Function to store AI business insight
CREATE OR REPLACE FUNCTION store_ai_insight(
  p_business_unit_id UUID,
  p_insight_type TEXT,
  p_title TEXT,
  p_description TEXT,
  p_embedding vector(1536),
  p_confidence_score DECIMAL DEFAULT 0.5,
  p_supporting_data JSONB DEFAULT '{}',
  p_tags TEXT[] DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO ai_business_insights (
    business_unit_id,
    insight_type,
    title,
    description,
    embedding,
    confidence_score,
    supporting_data,
    tags
  ) VALUES (
    p_business_unit_id,
    p_insight_type,
    p_title,
    p_description,
    p_embedding,
    p_confidence_score,
    p_supporting_data,
    p_tags
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Function to get AI configuration for a business unit
CREATE OR REPLACE FUNCTION get_ai_configuration_for_business_unit(p_business_unit_id UUID)
RETURNS TABLE (
  claude_api_key TEXT,
  preferred_provider TEXT,
  status TEXT,
  max_tokens INTEGER,
  temperature DECIMAL(3,2),
  usage_count_today INTEGER,
  cost_today DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.claude_api_key,
    ac.preferred_provider,
    ac.status,
    ac.max_tokens,
    ac.temperature,
    ac.usage_count_today,
    ac.cost_today
  FROM ai_configuration ac
  WHERE ac.business_unit_id = p_business_unit_id;
END;
$$;

-- Function to get AI memory statistics for a business unit
CREATE OR REPLACE FUNCTION get_ai_memory_stats(p_business_unit_id UUID)
RETURNS TABLE (
  total_conversations INTEGER,
  total_insights INTEGER,
  total_knowledge_items INTEGER,
  total_decisions INTEGER,
  learning_categories INTEGER,
  memory_created_today INTEGER,
  avg_confidence_score DECIMAL(3,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM ai_conversations_memory WHERE business_unit_id = p_business_unit_id),
    (SELECT COUNT(*)::INTEGER FROM ai_business_insights WHERE business_unit_id = p_business_unit_id AND is_active = TRUE),
    (SELECT COUNT(*)::INTEGER FROM ai_knowledge_base WHERE business_unit_id = p_business_unit_id AND is_active = TRUE),
    (SELECT COUNT(*)::INTEGER FROM ai_decision_history WHERE business_unit_id = p_business_unit_id),
    (SELECT COUNT(DISTINCT learning_category)::INTEGER FROM ai_learning_progress WHERE business_unit_id = p_business_unit_id),
    (SELECT COUNT(*)::INTEGER FROM ai_conversations_memory WHERE business_unit_id = p_business_unit_id AND created_at >= CURRENT_DATE),
    (SELECT COALESCE(AVG(confidence_score), 0.0)::DECIMAL(3,2) FROM ai_business_insights WHERE business_unit_id = p_business_unit_id AND is_active = TRUE);
END;
$$;
