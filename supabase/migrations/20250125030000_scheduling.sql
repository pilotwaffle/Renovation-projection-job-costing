-- Automated Scheduling System Schema
-- Handles project scheduling, task management, dependencies, and resource allocation

-- Schedules table - main schedule container for each job
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Project Schedule',
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, name)
);

-- Tasks table - individual tasks within a schedule
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE NOT NULL,
  scope_item_id UUID REFERENCES scope_items(id) ON DELETE SET NULL, -- Link to budget items
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'task' CHECK (type IN ('task', 'milestone', 'summary')),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'delayed', 'blocked')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),

  -- Scheduling data
  planned_start_date TIMESTAMPTZ,
  planned_end_date TIMESTAMPTZ,
  actual_start_date TIMESTAMPTZ,
  actual_end_date TIMESTAMPTZ,
  duration_days INTEGER DEFAULT 1,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

  -- Task hierarchy
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  is_critical_path BOOLEAN DEFAULT FALSE,

  -- Cost tracking
  estimated_cost NUMERIC(10,2) DEFAULT 0,
  actual_cost NUMERIC(10,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dependencies table - task dependencies (FS, SS, FF, SF)
CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  predecessor_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  successor_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  dependency_type TEXT DEFAULT 'finish_to_start' CHECK (dependency_type IN (
    'finish_to_start',  -- FS: Task B can't start until Task A finishes
    'start_to_start',    -- SS: Task B can't start until Task A starts
    'finish_to_finish',  -- FF: Task B can't finish until Task A finishes
    'start_to_finish'    -- SF: Task B can't finish until Task A starts
  )),
  lag_days INTEGER DEFAULT 0, -- Positive = delay, Negative = overlap

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(predecessor_id, successor_id)
);

-- Resources table - available resources (people, equipment, materials)
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('person', 'equipment', 'material', 'space')),
  description TEXT,
  capacity_per_day INTEGER DEFAULT 8, -- For people: hours, For equipment: units, For materials: quantity
  cost_per_unit NUMERIC(8,2) DEFAULT 0,
  available_from DATE,
  available_to DATE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resource assignments - linking tasks to resources
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE NOT NULL,
  allocation_percentage INTEGER DEFAULT 100 CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
  assigned_quantity INTEGER DEFAULT 1,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, resource_id)
);

-- Schedule scenarios - what-if analysis
CREATE TABLE schedule_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task assignments to scenarios
CREATE TABLE scenario_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES schedule_scenarios(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  planned_start_date TIMESTAMPTZ,
  planned_end_date TIMESTAMPTZ,
  duration_days INTEGER,
  assigned_resources JSONB, -- Store resource assignments for this scenario

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scenario_id, task_id)
);

-- Task change log - track all changes for notifications
CREATE TABLE task_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_type TEXT NOT NULL CHECK (change_type IN (
    'created', 'updated', 'deleted', 'status_changed',
    'dates_changed', 'dependency_added', 'dependency_removed',
    'resource_assigned', 'resource_unassigned'
  )),
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_schedules_job ON schedules(job_id);
CREATE INDEX idx_tasks_schedule ON tasks(schedule_id, sort_order);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id, sort_order);
CREATE INDEX idx_tasks_scope_item ON tasks(scope_item_id);
CREATE INDEX idx_tasks_dates ON tasks(planned_start_date, planned_end_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_dependencies_predecessor ON task_dependencies(predecessor_id);
CREATE INDEX idx_dependencies_successor ON task_dependencies(successor_id);
CREATE INDEX idx_resources_job ON resources(job_id, type);
CREATE INDEX idx_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_assignments_resource ON task_assignments(resource_id);
CREATE INDEX idx_changes_task ON task_changes(task_id, created_at DESC);

-- Row-Level Security (RLS) policies
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_changes ENABLE ROW LEVEL SECURITY;

-- Users can only access schedules for their jobs
CREATE POLICY "Users access own job schedules" ON schedules
  FOR ALL USING (
    job_id IN (SELECT id FROM jobs WHERE user_id = auth.uid())
  );

-- Users can access tasks for their schedules
CREATE POLICY "Users access own schedule tasks" ON tasks
  FOR ALL USING (
    schedule_id IN (
      SELECT s.id FROM schedules s
      JOIN jobs j ON j.id = s.job_id
      WHERE j.user_id = auth.uid()
    )
  );

-- Users can access dependencies for their tasks
CREATE POLICY "Users access task dependencies" ON task_dependencies
  FOR ALL USING (
    predecessor_id IN (
      SELECT t.id FROM tasks t
      JOIN schedules s ON s.id = t.schedule_id
      JOIN jobs j ON j.id = s.job_id
      WHERE j.user_id = auth.uid()
    ) AND
    successor_id IN (
      SELECT t.id FROM tasks t
      JOIN schedules s ON s.id = t.schedule_id
      JOIN jobs j ON j.id = s.job_id
      WHERE j.user_id = auth.uid()
    )
  );

-- Users can access resources for their jobs
CREATE POLICY "Users access own job resources" ON resources
  FOR ALL USING (job_id IN (SELECT id FROM jobs WHERE user_id = auth.uid()));

-- Users can access assignments for their tasks
CREATE POLICY "Users access task assignments" ON task_assignments
  FOR ALL USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN schedules s ON s.id = t.schedule_id
      JOIN jobs j ON j.id = s.job_id
      WHERE j.user_id = auth.uid()
    )
  );

-- Users can access scenarios for their schedules
CREATE POLICY "Users access schedule scenarios" ON schedule_scenarios
  FOR ALL USING (
    schedule_id IN (
      SELECT s.id FROM schedules s
      JOIN jobs j ON j.id = s.job_id
      WHERE j.user_id = auth.uid()
    )
  );

-- Users can access scenario tasks for their scenarios
CREATE POLICY "Users access scenario tasks" ON scenario_tasks
  FOR ALL USING (
    scenario_id IN (
      SELECT sc.id FROM schedule_scenarios sc
      JOIN schedules s ON s.id = sc.schedule_id
      JOIN jobs j ON j.id = s.job_id
      WHERE j.user_id = auth.uid()
    )
  );

-- Users can access task changes for their tasks
CREATE POLICY "Users access task changes" ON task_changes
  FOR ALL USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN schedules s ON s.id = t.schedule_id
      JOIN jobs j ON j.id = s.job_id
      WHERE j.user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON task_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update task progress based on subtasks
CREATE OR REPLACE FUNCTION update_parent_task_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Cycle guard: the parent UPDATE below re-fires this trigger, walking up
  -- the hierarchy. A circular/self parent_task_id would otherwise recurse
  -- until the stack blows; cap at a depth no legitimate hierarchy reaches.
  IF pg_trigger_depth() > 50 THEN
    RETURN NEW;
  END IF;

  -- Update parent task progress when child task changes
  IF NEW.parent_task_id IS NOT NULL THEN
    UPDATE tasks SET
      progress_percentage = (
        SELECT CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(AVG(progress_percentage))
        END
        FROM tasks
        WHERE parent_task_id = NEW.parent_task_id
      ),
      updated_at = NOW()
    WHERE id = NEW.parent_task_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for progress updates
CREATE TRIGGER task_progress_update AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_parent_task_progress();

-- Function to calculate critical path
CREATE OR REPLACE FUNCTION calculate_critical_path(schedule_uuid UUID)
RETURNS TABLE(
  task_id UUID,
  task_name TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  duration INTEGER,
  is_critical BOOLEAN,
  slack_days INTEGER
) AS $$
BEGIN
  -- This is a simplified critical path calculation
  -- In a production environment, you'd want a more sophisticated algorithm

  -- Reset all critical path flags
  UPDATE tasks SET is_critical_path = FALSE WHERE schedule_id = schedule_uuid;

  -- Mark tasks with zero slack as critical
  -- (This is a simplified approach - real critical path analysis is more complex)
  RETURN QUERY
  WITH task_durations AS (
    SELECT
      t.id,
      t.name,
      t.planned_start_date,
      t.planned_end_date,
      t.duration_days,
      -- Calculate earliest start/finish considering dependencies
      COALESCE(
        MAX(
          CASE
            WHEN td.dependency_type = 'finish_to_start' THEN
              predecessor.planned_end_date + (td.lag_days || ' days')::INTERVAL
            WHEN td.dependency_type = 'start_to_start' THEN
              predecessor.planned_start_date + (td.lag_days || ' days')::INTERVAL
            ELSE predecessor.planned_end_date
          END
        ), t.planned_start_date
      ) as earliest_start
    FROM tasks t
    LEFT JOIN task_dependencies td ON t.id = td.successor_id
    LEFT JOIN tasks predecessor ON td.predecessor_id = predecessor.id
    WHERE t.schedule_id = schedule_uuid
    GROUP BY t.id, t.name, t.planned_start_date, t.planned_end_date, t.duration_days
  )
  SELECT
    td.id,
    td.name,
    td.earliest_start,
    td.earliest_start + (td.duration_days || ' days')::INTERVAL,
    td.duration_days,
    (td.earliest_start <= td.planned_start_date) as is_critical,
    EXTRACT(DAYS FROM (td.planned_start_date - td.earliest_start))::INTEGER as slack_days
  FROM task_durations td;
END;
$$ LANGUAGE plpgsql;

-- Function to check resource conflicts
CREATE OR REPLACE FUNCTION check_resource_conflicts(
  p_resource_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_exclude_task_id UUID DEFAULT NULL
)
RETURNS TABLE(
  task_id UUID,
  task_name TEXT,
  conflict_start TIMESTAMPTZ,
  conflict_end TIMESTAMPTZ,
  conflict_percentage INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.planned_start_date,
    t.planned_end_date,
    ta.allocation_percentage
  FROM task_assignments ta
  JOIN tasks t ON ta.task_id = t.id
  WHERE
    ta.resource_id = p_resource_id
    AND (p_exclude_task_id IS NULL OR t.id != p_exclude_task_id)
    AND t.planned_start_date < p_end_date
    AND t.planned_end_date > p_start_date
    AND t.status NOT IN ('completed', 'archived');
END;
$$ LANGUAGE plpgsql;

-- Function to get project timeline summary
CREATE OR REPLACE FUNCTION get_project_timeline_summary(job_uuid UUID)
RETURNS TABLE(
  total_tasks INTEGER,
  completed_tasks INTEGER,
  in_progress_tasks INTEGER,
  not_started_tasks INTEGER,
  delayed_tasks INTEGER,
  progress_percentage INTEGER,
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE
) AS $$
BEGIN
  -- All task columns are table-qualified: unqualified `status` is ambiguous
  -- across the tasks/schedules join (both tables have it) and unqualified
  -- `progress_percentage` collides with this function's own RETURNS TABLE
  -- output column - either resolves to 42702 at first execution (plpgsql
  -- compiles bodies lazily, so CREATE succeeds and the failure hides until
  -- the first call).
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_tasks,
    COUNT(*) FILTER (WHERE t.status = 'completed')::INTEGER as completed_tasks,
    COUNT(*) FILTER (WHERE t.status = 'in_progress')::INTEGER as in_progress_tasks,
    COUNT(*) FILTER (WHERE t.status = 'not_started')::INTEGER as not_started_tasks,
    COUNT(*) FILTER (WHERE t.status = 'delayed')::INTEGER as delayed_tasks,
    ROUND(AVG(t.progress_percentage))::INTEGER as progress_percentage,
    MIN(t.planned_start_date)::DATE as planned_start,
    MAX(t.planned_end_date)::DATE as planned_end,
    MIN(t.actual_start_date)::DATE as actual_start,
    MAX(t.actual_end_date)::DATE as actual_end
  FROM tasks t
  JOIN schedules s ON s.id = t.schedule_id
  WHERE s.job_id = job_uuid;
END;
$$ LANGUAGE plpgsql;