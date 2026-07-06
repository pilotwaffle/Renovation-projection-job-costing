import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Get schedule with related data
    const { data: schedule, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Get related tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('schedule_id', id)
      .order('sort_order', { ascending: true });

    // Get dependencies
    const { data: dependencies } = await supabase
      .from('task_dependencies')
      .select('*')
      .in('predecessor_id', tasks?.map(t => t.id) || [])
      .or(`successor_id.in.(${tasks?.map(t => t.id).join(',')})`);

    // Get job resources
    const { data: resources } = await supabase
      .from('resources')
      .select('*')
      .eq('job_id', schedule.job_id);

    // Get assignments
    const { data: assignments } = await supabase
      .from('task_assignments')
      .select('*')
      .in('task_id', tasks?.map(t => t.id) || []);

    return NextResponse.json({
      schedule,
      tasks: tasks || [],
      dependencies: dependencies || [],
      resources: resources || [],
      assignments: assignments || [],
    });
  } catch (error) {
    console.error('Schedule API error:', error);
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

    // Update schedule
    const { data: schedule, error } = await supabase
      .from('schedules')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating schedule:', error);
      return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('Schedule API error:', error);
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

    // Delete schedule (cascade will handle related records)
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting schedule:', error);
      return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Schedule API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}