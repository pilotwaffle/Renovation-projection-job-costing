-- Complete Email Notifications System Migration
-- This migration sets up the complete notification system with all tables, functions, and policies

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Email notification settings
  variance_alerts_enabled BOOLEAN DEFAULT true,
  variance_threshold_percentage NUMERIC(5,2) DEFAULT 10.00 CHECK (variance_threshold_percentage >= 0 AND variance_threshold_percentage <= 100),

  change_order_notifications_enabled BOOLEAN DEFAULT true,
  daily_summary_enabled BOOLEAN DEFAULT false,
  weekly_summary_enabled BOOLEAN DEFAULT true,

  -- Budget milestone settings
  milestone_alerts_enabled BOOLEAN DEFAULT true,
  milestone_thresholds NUMERIC[] DEFAULT ARRAY[50, 75, 90], -- Percentage thresholds

  -- Email delivery settings
  email_address TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Notification Logs Table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,

  -- Notification details
  notification_type TEXT NOT NULL CHECK (
    notification_type IN (
      'variance_alert',
      'change_order_created',
      'change_order_updated',
      'daily_summary',
      'weekly_summary',
      'milestone_alert',
      'budget_exceeded'
    )
  ),

  -- Email delivery details
  email_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_name TEXT NOT NULL,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
  delivery_attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,
  error_code TEXT,

  -- Data context (JSON for flexible notification data)
  context_data JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Queue Table (for background processing)
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,

  -- Queue details
  notification_type TEXT NOT NULL,
  priority INT DEFAULT 1 CHECK (priority >= 1 AND priority <= 5), -- 1 = highest, 5 = lowest
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  max_attempts INT DEFAULT 3,

  -- Processing details
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,

  -- Data context
  context_data JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_job ON notification_logs(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_at, status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user ON notification_queue(user_id, status);

-- Row-Level Security (RLS) policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users manage own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users see own notification logs" ON notification_logs;
DROP POLICY IF EXISTS "Users see own notification queue" ON notification_queue;

-- Users can only access their own notification preferences
CREATE POLICY "Users manage own notification preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Users can only access their own notification logs
CREATE POLICY "Users see own notification logs" ON notification_logs
  FOR ALL USING (user_id = auth.uid());

-- Users can only access their own notification queue
CREATE POLICY "Users see own notification queue" ON notification_queue
  FOR ALL USING (user_id = auth.uid());

-- Enhanced Functions for notification management

-- Function to get or create notification preferences
CREATE OR REPLACE FUNCTION get_or_create_notification_preferences(
  p_user_id UUID,
  p_email_address TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  pref_id UUID;
BEGIN
  -- Try to get existing preferences
  SELECT id INTO pref_id
  FROM notification_preferences
  WHERE user_id = p_user_id;

  -- If not found, create new preferences
  IF pref_id IS NULL THEN
    INSERT INTO notification_preferences (user_id, email_address)
    VALUES (p_user_id, COALESCE(p_email_address, auth.email()))
    RETURNING id INTO pref_id;
  END IF;

  RETURN pref_id;
END;
$$ LANGUAGE plpgsql;

-- Function to queue a notification
CREATE OR REPLACE FUNCTION queue_notification(
  p_user_id UUID,
  p_job_id UUID DEFAULT NULL,
  -- DEFAULT NULL on the two params below is required by PostgreSQL (42P13:
  -- params after a defaulted param must also have defaults). Order is
  -- preserved deliberately - internal callers pass arguments positionally.
  -- context_data remains NOT NULL at the table level.
  p_notification_type TEXT DEFAULT NULL,
  p_context_data JSONB DEFAULT NULL,
  p_priority INT DEFAULT 3,
  p_scheduled_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
  queue_id UUID;
BEGIN
  INSERT INTO notification_queue (
    user_id, job_id, notification_type, context_data, priority, scheduled_at
  ) VALUES (
    p_user_id, p_job_id, p_notification_type, p_context_data, p_priority, p_scheduled_at
  ) RETURNING id INTO queue_id;

  RETURN queue_id;
END;
$$ LANGUAGE plpgsql;

-- Enhanced function to check variance thresholds and create alerts
CREATE OR REPLACE FUNCTION check_variance_alerts(
  p_job_id UUID,
  p_budget_version_id UUID
)
RETURNS TABLE(notification_queue_id UUID) AS $$
DECLARE
  job_user_id UUID;
  job_totals RECORD;
  pref RECORD;
  variance_threshold NUMERIC;
BEGIN
  -- Get job user_id
  SELECT user_id INTO job_user_id FROM jobs WHERE id = p_job_id;

  -- Get budget totals
  SELECT * INTO job_totals FROM calculate_budget_totals(p_budget_version_id);

  -- Get notification preferences
  SELECT * INTO pref FROM notification_preferences WHERE user_id = job_user_id;

  -- Check if variance alerts are enabled and threshold is exceeded
  IF pref.variance_alerts_enabled AND
     ABS(job_totals.variance_percentage) >= pref.variance_threshold_percentage THEN

    -- Get job details for context
    DECLARE
      job_details RECORD;
    BEGIN
      SELECT name, client_name INTO job_details
      FROM jobs WHERE id = p_job_id;
    END;

    -- Queue variance alert
    RETURN QUERY
    SELECT queue_notification(
      job_user_id,
      p_job_id,
      'variance_alert',
      jsonb_build_object(
        'variance_percentage', job_totals.variance_percentage,
        'total_estimated', job_totals.total_estimated,
        'total_actual', job_totals.total_actual,
        'total_variance', job_totals.total_variance,
        'threshold', pref.variance_threshold_percentage,
        'job_name', job_details.name,
        'client_name', job_details.client_name
      ),
      2 -- High priority
    ) AS notification_queue_id;
  END IF;

  -- Check milestone alerts
  IF pref.milestone_alerts_enabled THEN
    -- Sort thresholds to ensure proper order
    FOR variance_threshold IN SELECT unnest(pref.milestone_thresholds) ORDER BY unnest
    LOOP
      IF ABS(job_totals.variance_percentage) >= variance_threshold THEN
        -- Get job details for context
        DECLARE
          job_details RECORD;
        BEGIN
          SELECT name, client_name INTO job_details
          FROM jobs WHERE id = p_job_id;
        END;

        RETURN QUERY
        SELECT queue_notification(
          job_user_id,
          p_job_id,
          'milestone_alert',
          jsonb_build_object(
            'milestone_percentage', variance_threshold,
            'variance_percentage', job_totals.variance_percentage,
            'total_estimated', job_totals.total_estimated,
            'total_actual', job_totals.total_actual,
            'job_name', job_details.name,
            'client_name', job_details.client_name
          ),
          2 -- High priority
        ) AS notification_queue_id;
        EXIT; -- Only alert once per milestone check
      END IF;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to queue daily summary for all users who have it enabled
CREATE OR REPLACE FUNCTION queue_daily_summaries()
RETURNS TABLE(job_id UUID, notification_queue_id UUID) AS $$
DECLARE
  user_record RECORD;
  job_record RECORD;
BEGIN
  -- Process all users with daily summaries enabled
  FOR user_record IN
    SELECT DISTINCT user_id
    FROM notification_preferences
    WHERE daily_summary_enabled = true
  LOOP
    -- Get all active jobs for this user
    FOR job_record IN
      SELECT id, name, client_name
      FROM jobs
      WHERE user_id = user_record.user_id AND status = 'active'
    LOOP
      -- Calculate summary data
      DECLARE
        summary_data JSONB;
        budget_totals RECORD;
      BEGIN
        -- Get latest budget version
        SELECT bv.id INTO budget_totals
        FROM budget_versions bv
        WHERE bv.job_id = job_record.id
        ORDER BY bv.version DESC
        LIMIT 1;

        IF budget_totals.id IS NOT NULL THEN
          -- Calculate totals for summary
          SELECT * INTO budget_totals FROM calculate_budget_totals(budget_totals.id);

          summary_data := jsonb_build_object(
            'total_budget', budget_totals.total_estimated,
            'total_spent', budget_totals.total_actual,
            'variance_percentage', budget_totals.variance_percentage,
            'items_updated', 0, -- Would need to track this separately
            'activities', ARRAY[]::jsonb[] -- Would need to track activities
          );
        ELSE
          summary_data := jsonb_build_object(
            'total_budget', 0,
            'total_spent', 0,
            'variance_percentage', 0,
            'items_updated', 0,
            'activities', ARRAY[]::jsonb[]
          );
        END IF;
      END;

      -- Queue daily summary
      RETURN QUERY
      SELECT job_record.id, queue_notification(
        user_record.user_id,
        job_record.id,
        'daily_summary',
        jsonb_build_object(
          'summary_data', summary_data,
          'job_name', job_record.name,
          'client_name', job_record.client_name
        ),
        3 -- Normal priority
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to queue weekly summary for all users who have it enabled
CREATE OR REPLACE FUNCTION queue_weekly_summaries()
RETURNS TABLE(job_id UUID, notification_queue_id UUID) AS $$
DECLARE
  user_record RECORD;
  job_record RECORD;
BEGIN
  -- Process all users with weekly summaries enabled
  FOR user_record IN
    SELECT DISTINCT user_id
    FROM notification_preferences
    WHERE weekly_summary_enabled = true
  LOOP
    -- Get all active jobs for this user
    FOR job_record IN
      SELECT id, name, client_name
      FROM jobs
      WHERE user_id = user_record.user_id AND status = 'active'
    LOOP
      -- Calculate weekly summary data
      DECLARE
        summary_data JSONB;
        budget_totals RECORD;
      BEGIN
        -- Get latest budget version
        SELECT bv.id INTO budget_totals
        FROM budget_versions bv
        WHERE bv.job_id = job_record.id
        ORDER BY bv.version DESC
        LIMIT 1;

        IF budget_totals.id IS NOT NULL THEN
          -- Calculate totals for summary
          SELECT * INTO budget_totals FROM calculate_budget_totals(budget_totals.id);

          -- Get category breakdown (would need more complex query)
          summary_data := jsonb_build_object(
            'week_spent', budget_totals.total_actual * 0.1, -- Estimate
            'total_spent', budget_totals.total_actual,
            'completion_percentage', GREATEST(0, LEAST(100, 100 + budget_totals.variance_percentage)),
            'items_completed', 0, -- Would need to count completed items
            'categories', ARRAY[]::jsonb[] -- Would need category breakdown
          );
        ELSE
          summary_data := jsonb_build_object(
            'week_spent', 0,
            'total_spent', 0,
            'completion_percentage', 0,
            'items_completed', 0,
            'categories', ARRAY[]::jsonb[]
          );
        END IF;
      END;

      -- Queue weekly summary
      RETURN QUERY
      SELECT job_record.id, queue_notification(
        user_record.user_id,
        job_record.id,
        'weekly_summary',
        jsonb_build_object(
          'summary_data', summary_data,
          'job_name', job_record.name,
          'client_name', job_record.client_name
        ),
        3 -- Normal priority
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic notifications
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enhanced trigger function for variance checking
CREATE OR REPLACE FUNCTION trigger_variance_check()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if actual costs changed
  IF TG_OP = 'UPDATE' AND (
    NEW.actual_material_cost IS DISTINCT FROM OLD.actual_material_cost OR
    NEW.actual_labor_hours IS DISTINCT FROM OLD.actual_labor_hours
  ) THEN
    -- Get budget version and job
    PERFORM check_variance_alerts(
      (SELECT j.id FROM jobs j
       JOIN budget_versions bv ON bv.job_id = j.id
       WHERE bv.id = NEW.budget_version_id),
      NEW.budget_version_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists on scope_items
DROP TRIGGER IF EXISTS check_variance_on_scope_update ON scope_items;
CREATE TRIGGER check_variance_on_scope_update
  AFTER UPDATE ON scope_items
  FOR EACH ROW EXECUTE FUNCTION trigger_variance_check();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;
GRANT SELECT, INSERT ON notification_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_queue TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION queue_notification TO authenticated;
GRANT EXECUTE ON FUNCTION check_variance_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION queue_daily_summaries TO authenticated;
GRANT EXECUTE ON FUNCTION queue_weekly_summaries TO authenticated;

-- Set up function for service role (for Edge Functions)
GRANT ALL ON notification_preferences TO service_role;
GRANT ALL ON notification_logs TO service_role;
GRANT ALL ON notification_queue TO service_role;

COMMIT;