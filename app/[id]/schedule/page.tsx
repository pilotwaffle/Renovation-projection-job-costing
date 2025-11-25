'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Scheduler } from '@/components/scheduling';
import {
  Schedule,
  Task,
  TaskDependency,
  Resource,
  TaskAssignment,
  CreateTaskRequest,
  CreateResourceRequest,
  CreateAssignmentRequest,
} from '@/types/scheduling';

export default function SchedulePage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);

  const supabase = createClient();

  // Load schedule data
  useEffect(() => {
    loadScheduleData();
  }, [jobId]);

  const loadScheduleData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get existing schedules for the job
      const { data: schedules, error: scheduleError } = await supabase
        .from('schedules')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (scheduleError) {
        throw scheduleError;
      }

      let currentSchedule: Schedule;

      if (!schedules || schedules.length === 0) {
        // Create a default schedule if none exists
        const { data: newSchedule, error: createError } = await supabase
          .from('schedules')
          .insert({
            job_id: jobId,
            name: 'Project Schedule',
            start_date: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        currentSchedule = newSchedule;
      } else {
        currentSchedule = schedules[0];
      }

      setSchedule(currentSchedule);

      // Load related data
      const [
        tasksResult,
        dependenciesResult,
        resourcesResult,
        assignmentsResult,
      ] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('schedule_id', currentSchedule.id)
          .order('sort_order', { ascending: true }),
        supabase
          .from('task_dependencies')
          .select('*')
          .in('predecessor_id', (tasks.data || []).map(t => t.id)),
        supabase
          .from('resources')
          .select('*')
          .eq('job_id', jobId)
          .eq('is_active', true),
        supabase
          .from('task_assignments')
          .select('*')
          .in('task_id', (tasks.data || []).map(t => t.id)),
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (dependenciesResult.error) throw dependenciesResult.error;
      if (resourcesResult.error) throw resourcesResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;

      setTasks(tasksResult.data || []);
      setDependencies(dependenciesResult.data || []);
      setResources(resourcesResult.data || []);
      setAssignments(assignmentsResult.data || []);

    } catch (err) {
      console.error('Error loading schedule data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  // Schedule update handlers
  const handleScheduleUpdate = async (updates: Partial<Schedule>) => {
    if (!schedule) return;

    try {
      const { error } = await supabase
        .from('schedules')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', schedule.id);

      if (error) throw error;

      setSchedule({ ...schedule, ...updates });
    } catch (err) {
      console.error('Error updating schedule:', err);
      setError('Failed to update schedule');
    }
  };

  // Task handlers
  const handleTaskCreate = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) throw error;

      setTasks([...tasks, data]);

      // Log the change
      await supabase
        .from('task_changes')
        .insert({
          task_id: data.id,
          change_type: 'created',
          new_values: data,
          notes: 'Task created from scheduler',
        });

      return data;
    } catch (err) {
      console.error('Error creating task:', err);
      setError('Failed to create task');
      throw err;
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      setTasks(tasks.map(task => task.id === taskId ? data : task));
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task');
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.filter(task => task.id !== taskId));
      setAssignments(assignments.filter(assignment => assignment.task_id !== taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task');
    }
  };

  // Dependency handlers
  const handleDependencyCreate = async (dependency: Omit<TaskDependency, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('task_dependencies')
        .insert(dependency)
        .select()
        .single();

      if (error) throw error;

      setDependencies([...dependencies, data]);
    } catch (err) {
      console.error('Error creating dependency:', err);
      setError('Failed to create dependency');
    }
  };

  const handleDependencyDelete = async (dependencyId: string) => {
    try {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('id', dependencyId);

      if (error) throw error;

      setDependencies(dependencies.filter(dep => dep.id !== dependencyId));
    } catch (err) {
      console.error('Error deleting dependency:', err);
      setError('Failed to delete dependency');
    }
  };

  // Resource handlers
  const handleResourceCreate = async (resourceData: Omit<Resource, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .insert(resourceData)
        .select()
        .single();

      if (error) throw error;

      setResources([...resources, data]);
    } catch (err) {
      console.error('Error creating resource:', err);
      setError('Failed to create resource');
    }
  };

  const handleResourceUpdate = async (resourceId: string, updates: Partial<Resource>) => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', resourceId)
        .select()
        .single();

      if (error) throw error;

      setResources(resources.map(resource => resource.id === resourceId ? data : resource));
    } catch (err) {
      console.error('Error updating resource:', err);
      setError('Failed to update resource');
    }
  };

  const handleResourceDelete = async (resourceId: string) => {
    try {
      const { error } = await supabase
        .from('resources')
        .update({ is_active: false })
        .eq('id', resourceId);

      if (error) throw error;

      setResources(resources.filter(resource => resource.id !== resourceId));
      setAssignments(assignments.filter(assignment => assignment.resource_id !== resourceId));
    } catch (err) {
      console.error('Error deleting resource:', err);
      setError('Failed to delete resource');
    }
  };

  // Assignment handlers
  const handleAssignmentCreate = async (assignment: Omit<TaskAssignment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .insert(assignment)
        .select()
        .single();

      if (error) throw error;

      setAssignments([...assignments, data]);
    } catch (err) {
      console.error('Error creating assignment:', err);
      setError('Failed to create assignment');
    }
  };

  const handleAssignmentUpdate = async (assignmentId: string, updates: Partial<TaskAssignment>) => {
    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignmentId)
        .select()
        .single();

      if (error) throw error;

      setAssignments(assignments.map(assignment => assignment.id === assignmentId ? data : assignment));
    } catch (err) {
      console.error('Error updating assignment:', err);
      setError('Failed to update assignment');
    }
  };

  const handleAssignmentDelete = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('task_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      setAssignments(assignments.filter(assignment => assignment.id !== assignmentId));
    } catch (err) {
      console.error('Error deleting assignment:', err);
      setError('Failed to delete assignment');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading schedule...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={loadScheduleData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No schedule found</p>
          <button
            onClick={loadScheduleData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Schedule
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href={`/${jobId}`}
                className="text-gray-500 hover:text-gray-700 flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Job</span>
              </Link>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-600" />
                <h1 className="text-xl font-semibold text-gray-900">
                  {schedule.name}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduler */}
      <div className="h-[calc(100vh-4rem)]">
        <Scheduler
          schedule={schedule}
          tasks={tasks}
          dependencies={dependencies}
          resources={resources}
          assignments={assignments}
          onScheduleUpdate={handleScheduleUpdate}
          onTaskCreate={handleTaskCreate}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onDependencyCreate={handleDependencyCreate}
          onDependencyDelete={handleDependencyDelete}
          onResourceCreate={handleResourceCreate}
          onResourceUpdate={handleResourceUpdate}
          onResourceDelete={handleResourceDelete}
          onAssignmentCreate={handleAssignmentCreate}
          onAssignmentUpdate={handleAssignmentUpdate}
          onAssignmentDelete={handleAssignmentDelete}
          className="h-full"
        />
      </div>
    </div>
  );
}