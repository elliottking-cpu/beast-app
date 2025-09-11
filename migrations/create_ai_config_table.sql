-- Create AI configuration table for storing API keys and settings
CREATE TABLE IF NOT EXISTS ai_configuration (
  id INTEGER PRIMARY KEY DEFAULT 1,
  claude_api_key TEXT,
  openai_api_key TEXT,
  google_api_key TEXT,
  preferred_provider TEXT DEFAULT 'claude',
  status TEXT DEFAULT 'inactive',
  max_tokens INTEGER DEFAULT 4000,
  temperature DECIMAL(3,2) DEFAULT 0.1,
  cost_limit_daily DECIMAL(10,2) DEFAULT 50.00,
  usage_count_today INTEGER DEFAULT 0,
  cost_today DECIMAL(10,2) DEFAULT 0.00,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_config CHECK (id = 1)
);

-- Create RPC function to create the table if it doesn't exist
CREATE OR REPLACE FUNCTION create_ai_config_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function ensures the table exists
  -- The table creation is handled by the migration above
  -- This function is just a placeholder for the setup process
  
  -- Reset daily counters if it's a new day
  UPDATE ai_configuration 
  SET 
    usage_count_today = 0,
    cost_today = 0.00,
    last_reset_date = CURRENT_DATE
  WHERE id = 1 AND last_reset_date < CURRENT_DATE;
  
  -- Insert default record if none exists
  INSERT INTO ai_configuration (id) 
  VALUES (1) 
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Create function to get AI configuration
CREATE OR REPLACE FUNCTION get_ai_configuration()
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
  WHERE ac.id = 1;
END;
$$;

-- Create function to update AI usage statistics
CREATE OR REPLACE FUNCTION update_ai_usage(
  tokens_used INTEGER,
  cost_incurred DECIMAL(10,2)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ai_configuration 
  SET 
    usage_count_today = usage_count_today + tokens_used,
    cost_today = cost_today + cost_incurred,
    updated_at = NOW()
  WHERE id = 1;
END;
$$;

-- Create function to check if AI is configured
CREATE OR REPLACE FUNCTION is_ai_configured()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_exists BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM ai_configuration 
    WHERE id = 1 
    AND claude_api_key IS NOT NULL 
    AND claude_api_key != ''
    AND status = 'active'
  ) INTO config_exists;
  
  RETURN config_exists;
END;
$$;
