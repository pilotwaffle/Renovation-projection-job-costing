import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TaskManager } from '@/lib/scheduling/taskManager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: scheduleId } = await params;

    // Get tasks for the schedule
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json({ tasks: tasks || [] });
  } catch (error) {
    console.error('Tasks API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: scheduleId } = await params;
    const body = await request.json();

    // Create task using TaskManager
    const task = TaskManager.createTask({
      ...body,
      schedule_id: scheduleId,
    });

    // Insert into database
    const { data: createdTask, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    // Create task change log entry
    await supabase
      .from('task_changes')
      .insert({
        task_id: createdTask.id,
        changed_by: user.id,
        change_type: 'created',
        new_values: createdTask,
        notes: 'Task created via API',
      });

    return NextResponse.json({ task: createdTask }, { status: 201 });
  } catch (error) {
    console.error('Tasks API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}