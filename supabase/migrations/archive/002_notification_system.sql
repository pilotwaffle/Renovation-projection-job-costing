-- Notification Preferences Table
CREATE TABLE notification_preferences (
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
CREATE TABLE notification_logs (
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
CREATE TABLE notification_queue (
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
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX idx_notification_logs_user ON notification_logs(user_id, created_at DESC);
CREATE INDEX idx_notification_logs_job ON notification_logs(job_id, created_at DESC);
CREATE INDEX idx_notification_logs_status ON notification_logs(status, created_at DESC);
CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_at, status);
CREATE INDEX idx_notification_queue_user ON notification_queue(user_id, status);

-- Row-Level Security (RLS) policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Users can only access their own notification preferences
CREATE POLICY "Users manage own notification preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Users can only access their own notification logs
CREATE POLICY "Users see own notification logs" ON notification_logs
  FOR ALL USING (user_id = auth.uid());

-- Users can only access their own notification queue
CREATE POLICY "Users see own notification queue" ON notification_queue
  FOR ALL USING (user_id = auth.uid());

-- Functions for notification management

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
  p_notification_type TEXT,
  p_context_data JSONB,
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

-- Function to check variance thresholds and create alerts
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
        'threshold', pref.variance_threshold_percentage
      ),
      2 -- High priority
    ) AS notification_queue_id;
  END IF;

  -- Check milestone alerts
  IF pref.milestone_alerts_enabled THEN
    FOREACH variance_threshold IN ARRAY pref.milestone_thresholds
    LOOP
      IF ABS(job_totals.variance_percentage) >= variance_threshold THEN
        RETURN QUERY
        SELECT queue_notification(
          job_user_id,
          p_job_id,
          'milestone_alert',
          jsonb_build_object(
            'milestone_percentage', variance_threshold,
            'variance_percentage', job_totals.variance_percentage,
            'total_estimated', job_totals.total_estimated,
            'total_actual', job_totals.total_actual
          ),
          2 -- High priority
        ) AS notification_queue_id;
        EXIT; -- Only alert once per milestone
      END IF;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic notifications

-- Trigger for updated_at on notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to trigger variance checks on scope item updates
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

-- Add trigger to scope_items for variance checking
CREATE TRIGGER check_variance_on_scope_update
  AFTER UPDATE ON scope_items
  FOR EACH ROW EXECUTE FUNCTION trigger_variance_check();