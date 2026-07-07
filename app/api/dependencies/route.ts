import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TaskManager } from '@/lib/scheduling/taskManager';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const scheduleId = searchParams.get('scheduleId');

    let query = supabase.from('task_dependencies').select('*');

    if (taskId) {
      query = query.or(`predecessor_id.eq.${taskId},successor_id.eq.${taskId}`);
    } else if (scheduleId) {
      // Get all tasks for the schedule first, then their dependencies
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('schedule_id', scheduleId);

      const taskIds = tasks?.map(t => t.id) || [];
      if (taskIds.length > 0) {
        query = query.or(`predecessor_id.in.(${taskIds.join(',')}),successor_id.in.(${taskIds.join(',')})`);
      }
    }

    const { data: dependencies, error } = await query;

    if (error) {
      console.error('Error fetching dependencies:', error);
      return NextResponse.json({ error: 'Failed to fetch dependencies' }, { status: 500 });
    }

    return NextResponse.json({ dependencies: dependencies || [] });
  } catch (error) {
    console.error('Dependencies API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { predecessor_id, successor_id, dependency_type = 'finish_to_start', lag_days = 0 } = body;

    if (!predecessor_id || !successor_id) {
      return NextResponse.json({ error: 'Predecessor and successor IDs are required' }, { status: 400 });
    }

    // Validate that both tasks exist and are accessible
    const { data: predecessor, error: predError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', predecessor_id)
      .single();

    const { data: successor, error: succError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', successor_id)
      .single();

    if (predError || !predecessor || succError || !successor) {
      return NextResponse.json({ error: 'One or both tasks not found' }, { status: 404 });
    }

    // Check for existing dependencies
    const { data: existingDep } = await supabase
      .from('task_dependencies')
      .select('*')
      .eq('predecessor_id', predecessor_id)
      .eq('successor_id', successor_id)
      .single();

    if (existingDep) {
      return NextResponse.json({ error: 'Dependency already exists' }, { status: 409 });
    }

    // Create dependency
    const { data: dependency, error } = await supabase
      .from('task_dependencies')
      .insert({
        predecessor_id,
        successor_id,
        dependency_type,
        lag_days,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating dependency:', error);
      return NextResponse.json({ error: 'Failed to create dependency' }, { status: 500 });
    }

    // Log the change
    await supabase
      .from('task_changes')
      .insert({
        task_id: successor_id,
        changed_by: user.id,
        change_type: 'dependency_added',
        new_values: dependency,
        notes: `Added ${dependency_type} dependency from task ${predecessor_id}`,
      });

    return NextResponse.json({ dependency }, { status: 201 });
  } catch (error) {
    console.error('Dependencies API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const predecessorId = searchParams.get('predecessorId');
    const successorId = searchParams.get('successorId');

    if (!predecessorId || !successorId) {
      return NextResponse.json({ error: 'Predecessor and successor IDs are required' }, { status: 400 });
    }

    // Get dependency before deletion for logging
    const { data: existingDep } = await supabase
      .from('task_dependencies')
      .select('*')
      .eq('predecessor_id', predecessorId)
      .eq('successor_id', successorId)
      .single();

    if (!existingDep) {
      return NextResponse.json({ error: 'Dependency not found' }, { status: 404 });
    }

    // Delete dependency
    const { error } = await supabase
      .from('task_dependencies')
      .delete()
      .eq('predecessor_id', predecessorId)
      .eq('successor_id', successorId);

    if (error) {
      console.error('Error deleting dependency:', error);
      return NextResponse.json({ error: 'Failed to delete dependency' }, { status: 500 });
    }

    // Log the change
    await supabase
      .from('task_changes')
      .insert({
        task_id: successorId,
        changed_by: user.id,
        change_type: 'dependency_removed',
        old_values: existingDep,
        notes: `Removed ${existingDep.dependency_type} dependency from task ${predecessorId}`,
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Dependencies API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}