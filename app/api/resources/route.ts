import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ResourceManager } from '@/lib/scheduling/resourceManager';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Get resources for the job
    const { data: resources, error } = await supabase
      .from('resources')
      .select('*')
      .eq('job_id', jobId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching resources:', error);
      return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
    }

    // Get assignments for utilization calculation
    const { data: assignments } = await supabase
      .from('task_assignments')
      .select('*, tasks(*)')
      .in('resource_id', resources?.map(r => r.id) || []);

    // Calculate utilization for each resource
    const resourcesWithUtilization = (resources || []).map(resource => {
      const resourceAssignments = assignments?.filter(a => a.resource_id === resource.id) || [];
      const utilization = ResourceManager.calculateResourceUtilization(
        resource,
        resourceAssignments,
        resourceAssignments.map(a => a.tasks).filter(Boolean) as any[],
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
      );

      return {
        ...resource,
        utilization,
        assignments: resourceAssignments,
      };
    });

    return NextResponse.json({ resources: resourcesWithUtilization });
  } catch (error) {
    console.error('Resources API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { job_id, name, type, description, capacity_per_day, cost_per_unit, available_from, available_to } = body;

    if (!job_id || !name || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create resource using ResourceManager
    const resource = ResourceManager.createResource({
      job_id,
      name,
      type,
      description,
      capacity_per_day,
      cost_per_unit,
      available_from,
      available_to,
    });

    // Insert into database
    const { data: createdResource, error } = await supabase
      .from('resources')
      .insert(resource)
      .select()
      .single();

    if (error) {
      console.error('Error creating resource:', error);
      return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
    }

    return NextResponse.json({ resource: createdResource }, { status: 201 });
  } catch (error) {
    console.error('Resources API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}