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

    const { id } = await params;

    // Get task with related data
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Get dependencies
    const { data: dependencies } = await supabase
      .from('task_dependencies')
      .select('*')
      .or(`predecessor_id.eq.${id},successor_id.eq.${id}`);

    // Get assignments
    const { data: assignments } = await supabase
      .from('task_assignments')
      .select('*')
      .eq('task_id', id);

    return NextResponse.json({
      task,
      dependencies: dependencies || [],
      assignments: assignments || [],
    });
  } catch (error) {
    console.error('Task API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Get existing task
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update task using TaskManager
    const updatedTask = TaskManager.updateTask(existingTask, body);

    // Update in database
    const { data: task, error } = await supabase
      .from('tasks')
      .update(updatedTask)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    // Create task change log entry
    const changes = Object.keys(body).reduce((acc, key) => {
      if (existingTask[key as keyof typeof existingTask] !== task[key as keyof typeof task]) {
        acc[key] = {
          old: existingTask[key as keyof typeof existingTask],
          new: task[key as keyof typeof task],
        };
      }
      return acc;
    }, {} as Record<string, { old: any; new: any }>);

    if (Object.keys(changes).length > 0) {
      await supabase
        .from('task_changes')
        .insert({
          task_id: id,
          changed_by: user.id,
          change_type: 'updated',
          old_values: changes,
          new_values: task,
          notes: 'Task updated via API',
        });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Task API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get task before deletion for logging
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    // Delete task (cascade will handle related records)
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    // Create task change log entry
    if (existingTask) {
      await supabase
        .from('task_changes')
        .insert({
          task_id: id,
          changed_by: user.id,
          change_type: 'deleted',
          old_values: existingTask,
          notes: 'Task deleted via API',
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Task API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}