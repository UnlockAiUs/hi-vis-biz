-- Migration: 005_seed_agents.sql
-- Description: Seed initial agents and topic_archetypes
-- Created: 2025-11-25

-- ============================================
-- INSERT AGENTS
-- ============================================

INSERT INTO agents (agent_code, name, description) VALUES
  ('pulse', 'Pulse Agent', 'Tracks employee morale, workload, and burnout risk through quick weekly check-ins.'),
  ('role_mapper', 'Role Mapper', 'Understands job roles, primary duties, and responsibilities. Used during onboarding and role changes.'),
  ('workflow_mapper', 'Workflow Mapper', 'Maps recurring tasks, workflows, tools, and data sources used by employees.'),
  ('pain_scanner', 'Pain Scanner', 'Identifies and quantifies friction points in workflows and tools.'),
  ('focus_tracker', 'Focus Tracker', 'Tracks current work focus, priorities, and progress over time.');

-- ============================================
-- INSERT TOPIC ARCHETYPES
-- ============================================

-- Pulse Agent Topics
INSERT INTO topic_archetypes (agent_code, topic_code, display_name, kind, level, frequency_hint, output_schema_json) VALUES
  ('pulse', 'pulse_weekly', 'Weekly Pulse Check', 'morale', 'all', 'core_weekly', 
   '{"rating": "number(1-5)", "reason": "string", "workload_rating": "number(1-5)", "burnout_risk": "low|medium|high"}'::jsonb),
  ('pulse', 'pulse_followup', 'Pulse Follow-up', 'morale', 'all', 'periodic',
   '{"rating": "number(1-5)", "change_reason": "string", "support_needed": "boolean"}'::jsonb);

-- Role Mapper Topics
INSERT INTO topic_archetypes (agent_code, topic_code, display_name, kind, level, frequency_hint, output_schema_json) VALUES
  ('role_mapper', 'role_initial', 'Initial Role Discovery', 'role', 'all', 'onboarding',
   '{"role_summary": "string", "primary_duties": "string[]", "customer_facing": "boolean", "kpis_known": "boolean"}'::jsonb),
  ('role_mapper', 'role_update', 'Role Update Check', 'role', 'all', 'periodic',
   '{"role_changed": "boolean", "new_duties": "string[]", "removed_duties": "string[]", "promotion": "boolean"}'::jsonb),
  ('role_mapper', 'role_change', 'Role Change Discovery', 'role', 'all', 'rare',
   '{"new_role_summary": "string", "new_primary_duties": "string[]", "transition_challenges": "string[]"}'::jsonb);

-- Workflow Mapper Topics
INSERT INTO topic_archetypes (agent_code, topic_code, display_name, kind, level, frequency_hint, output_schema_json) VALUES
  ('workflow_mapper', 'workflow_discovery', 'Workflow Discovery', 'workflow', 'all', 'onboarding',
   '{"workflow_name": "string", "display_label": "string", "steps": "string[]", "tools": "string[]", "data_sources": "string[]"}'::jsonb),
  ('workflow_mapper', 'workflow_deep_dive', 'Workflow Deep Dive', 'workflow', 'all', 'periodic',
   '{"workflow_ref": "string", "detailed_steps": "object[]", "bottlenecks": "string[]", "automation_opportunities": "string[]"}'::jsonb),
  ('workflow_mapper', 'tools_inventory', 'Tools Inventory', 'tools', 'all', 'onboarding',
   '{"primary_tools": "string[]", "tool_frequency": "object", "missing_tools": "string[]"}'::jsonb);

-- Pain Scanner Topics
INSERT INTO topic_archetypes (agent_code, topic_code, display_name, kind, level, frequency_hint, output_schema_json) VALUES
  ('pain_scanner', 'pain_general', 'General Pain Points', 'pain', 'all', 'periodic',
   '{"workflow_ref": "string", "tool_ref": "string", "pain_rating": "number(1-5)", "reason": "string", "frequency": "string", "impact": "string"}'::jsonb),
  ('pain_scanner', 'pain_tool_specific', 'Tool-Specific Pain', 'pain', 'all', 'periodic',
   '{"tool_ref": "string", "pain_rating": "number(1-5)", "specific_issues": "string[]", "workarounds": "string[]"}'::jsonb),
  ('pain_scanner', 'pain_workflow_specific', 'Workflow-Specific Pain', 'pain', 'all', 'periodic',
   '{"workflow_ref": "string", "pain_rating": "number(1-5)", "bottleneck_steps": "string[]", "time_wasted_estimate": "string"}'::jsonb);

-- Focus Tracker Topics
INSERT INTO topic_archetypes (agent_code, topic_code, display_name, kind, level, frequency_hint, output_schema_json) VALUES
  ('focus_tracker', 'focus_current', 'Current Focus', 'focus', 'all', 'core_weekly',
   '{"current_focus_label": "string", "current_focus_tags": "string[]", "still_primary_focus": "boolean", "focus_rating": "number(1-5)", "change_vs_last_time": "string", "reason": "string"}'::jsonb),
  ('focus_tracker', 'focus_priorities', 'Priority Check', 'focus', 'all', 'periodic',
   '{"top_priorities": "string[]", "blocked_items": "string[]", "help_needed": "string[]"}'::jsonb),
  ('focus_tracker', 'focus_goals', 'Goals Progress', 'focus', 'manager', 'periodic',
   '{"current_goals": "object[]", "progress_ratings": "object", "blockers": "string[]"}'::jsonb);
