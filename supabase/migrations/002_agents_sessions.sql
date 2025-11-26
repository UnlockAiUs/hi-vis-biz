-- Migration: 002_agents_sessions.sql
-- Description: Create agents, topic_archetypes, sessions, session_topics, answers, user_topic_history tables
-- Created: 2025-11-25

-- Agents table (stores the 5 AI agents)
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_code VARCHAR(50) UNIQUE NOT NULL, -- pulse, role_mapper, workflow_mapper, pain_scanner, focus_tracker
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Topic archetypes table (templates for conversation topics)
CREATE TABLE topic_archetypes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_code VARCHAR(50) NOT NULL REFERENCES agents(agent_code) ON DELETE CASCADE,
  topic_code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  kind VARCHAR(30) NOT NULL CHECK (kind IN ('morale', 'role', 'workflow', 'tools', 'pain', 'focus')),
  level VARCHAR(20) DEFAULT 'all' CHECK (level IN ('exec', 'manager', 'ic', 'all')),
  dept_tags_json JSONB DEFAULT '["all"]'::jsonb, -- e.g. ["sales"], ["engineering"], ["all"]
  frequency_hint VARCHAR(30) DEFAULT 'periodic' CHECK (frequency_hint IN ('core_weekly', 'onboarding', 'periodic', 'rare')),
  output_schema_json JSONB, -- Expected answer structure
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for topic lookups
CREATE INDEX idx_topic_archetypes_agent_code ON topic_archetypes(agent_code);
CREATE INDEX idx_topic_archetypes_kind ON topic_archetypes(kind);

-- Sessions table (individual check-in sessions)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_code VARCHAR(50) NOT NULL REFERENCES agents(agent_code),
  scheduled_for TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  source VARCHAR(20) DEFAULT 'autopilot' CHECK (source IN ('autopilot', 'manual', 'triggered')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for session lookups
CREATE INDEX idx_sessions_org_id ON sessions(org_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_scheduled_for ON sessions(scheduled_for);
CREATE INDEX idx_sessions_completed_at ON sessions(completed_at);

-- Session topics table (links sessions to topics)
CREATE TABLE session_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  topic_code VARCHAR(50) NOT NULL REFERENCES topic_archetypes(topic_code),
  sequence INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for session topic lookups
CREATE INDEX idx_session_topics_session_id ON session_topics(session_id);

-- Answers table (stores responses from sessions)
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  topic_code VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_code VARCHAR(50) NOT NULL REFERENCES agents(agent_code),
  answer_text TEXT, -- Summary or main reason
  answer_number DECIMAL, -- Primary numeric measure (e.g., rating 1-5)
  answer_json JSONB, -- Full structured payload matching agent output schema
  transcript_json JSONB, -- Full chat transcript
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for answer lookups
CREATE INDEX idx_answers_org_id ON answers(org_id);
CREATE INDEX idx_answers_session_id ON answers(session_id);
CREATE INDEX idx_answers_user_id ON answers(user_id);
CREATE INDEX idx_answers_agent_code ON answers(agent_code);
CREATE INDEX idx_answers_created_at ON answers(created_at);

-- User topic history table (tracks when topics were last asked)
CREATE TABLE user_topic_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_code VARCHAR(50) NOT NULL,
  last_asked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  times_answered INT DEFAULT 0,
  
  -- Ensure one record per user per topic
  UNIQUE(user_id, topic_code)
);

-- Create indexes for history lookups
CREATE INDEX idx_user_topic_history_user_id ON user_topic_history(user_id);
CREATE INDEX idx_user_topic_history_topic_code ON user_topic_history(topic_code);

-- Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_archetypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_topic_history ENABLE ROW LEVEL SECURITY;
