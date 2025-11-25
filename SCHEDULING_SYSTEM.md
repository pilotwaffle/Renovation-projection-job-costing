# Automated Scheduling System for Renovation Job Costing

A comprehensive project scheduling system that integrates seamlessly with your renovation job costing application, providing professional project management capabilities with Gantt charts, resource allocation, critical path analysis, and scenario planning.

## 🎯 Key Features

### 📊 **Interactive Gantt Chart**
- Drag-and-drop task scheduling
- Multiple view modes (Day, Week, Month, Quarter)
- Progress tracking with visual indicators
- Dependency visualization with connecting lines
- Real-time zoom and pan capabilities
- Export to JSON, CSV, and iCalendar formats

### 📋 **Comprehensive Task Management**
- Hierarchical task structure (parent-child relationships)
- Task dependencies (Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish)
- Status tracking (Not Started, In Progress, Completed, Delayed, Blocked)
- Priority levels (Low, Normal, High, Critical)
- Progress percentage tracking
- Cost estimation and tracking

### 👥 **Resource Allocation & Management**
- Multiple resource types (People, Equipment, Materials, Space)
- Resource utilization tracking with heatmaps
- Conflict detection and resolution
- Resource leveling algorithms
- Cost tracking per resource
- Availability scheduling

### 🔍 **Critical Path Analysis**
- Automatic critical path calculation
- Float/slack time analysis
- Impact analysis for task delays
- What-if scenario planning
- Resource constraint consideration

### 📈 **Advanced Analytics**
- Project timeline summaries
- Resource utilization reports
- Cost variance analysis
- Progress tracking dashboards
- Overdue task identification

## 🏗️ Architecture Overview

### Database Schema
The scheduling system adds 8 new tables to your existing database:

1. **`schedules`** - Main schedule containers for each job
2. **`tasks`** - Individual tasks within schedules
3. **`task_dependencies`** - Task relationships and constraints
4. **`resources`** - Available resources (people, equipment, materials)
5. **`task_assignments`** - Resource-to-task assignments
6. **`schedule_scenarios`** - What-if analysis scenarios
7. **`scenario_tasks`** - Task variations for scenarios
8. **`task_changes`** - Audit trail for all changes

### Frontend Components
- **`Scheduler.tsx`** - Main orchestration component
- **`GanttChart.tsx`** - Interactive Gantt visualization
- **`TaskList.tsx`** - Comprehensive task management interface
- **`ResourceAllocation.tsx`** - Resource management with heatmaps
- **`Timeline.tsx`** - Timeline view for quick overview

### Scheduling Engine
- **`scheduler.ts`** - Core scheduling algorithm
- **`taskManager.ts`** - Task CRUD and dependency management
- **`resourceManager.ts`** - Resource allocation and optimization
- **`criticalPath.ts`** - Critical path analysis engine
- **`ganttChart.ts`** - Data processing for visualization

## 🚀 Getting Started

### Database Migration
Run the new migration to add scheduling tables:

```sql
-- The migration file is located at:
-- supabase/migrations/20250125030000_scheduling.sql
```

### Component Usage

```tsx
import { Scheduler } from '@/components/scheduling';
import { Schedule, Task, Resource } from '@/types/scheduling';

function ProjectSchedule({ jobId }: { jobId: string }) {
  return (
    <Scheduler
      schedule={schedule}
      tasks={tasks}
      dependencies={dependencies}
      resources={resources}
      assignments={assignments}
      onTaskCreate={handleTaskCreate}
      onTaskUpdate={handleTaskUpdate}
      onResourceCreate={handleResourceCreate}
      className="h-full"
    />
  );
}
```

### API Integration

The system provides RESTful APIs for all scheduling operations:

#### Schedules
```typescript
GET    /api/schedules?jobId={jobId}
POST   /api/schedules
GET    /api/schedules/{id}
PUT    /api/schedules/{id}
DELETE /api/schedules/{id}
```

#### Tasks
```typescript
GET    /api/schedules/{scheduleId}/tasks
POST   /api/schedules/{scheduleId}/tasks
GET    /api/tasks/{id}
PUT    /api/tasks/{id}
DELETE /api/tasks/{id}
```

#### Resources
```typescript
GET    /api/resources?jobId={jobId}
POST   /api/resources
```

#### Dependencies
```typescript
GET    /api/dependencies?taskId={taskId}
POST   /api/dependencies
DELETE /api/dependencies?predecessorId={id}&successorId={id}
```

## 📱 User Interface

### Main Views

1. **Gantt Chart View**
   - Interactive timeline with drag-and-drop
   - Multi-level zoom (Day, Week, Month, Quarter)
   - Task dependency visualization
   - Progress tracking overlays
   - Resource assignment indicators

2. **Task List View**
   - Hierarchical task structure
   - Quick status updates
   - Inline editing capabilities
   - Bulk operations support
   - Advanced filtering and search

3. **Resource Allocation View**
   - Three visualization modes (List, Heatmap, Timeline)
   - Utilization percentage tracking
   - Conflict detection alerts
   - Cost analysis per resource
   - Availability management

4. **Timeline View**
   - Compact time-based visualization
   - Current time indicator
   - Working hours support
   - Weekend/non-working day highlighting

### Key Interactions

#### Drag-and-Drop Operations
- **Move Tasks**: Drag task bars to reschedule
- **Resize Tasks**: Drag edges to adjust duration
- **Create Dependencies**: Drag between tasks to link them
- **Assign Resources**: Drag resources onto tasks

#### Real-time Updates
- Auto-scheduling with resource optimization
- Conflict detection and resolution
- Critical path recalculation
- Progress tracking updates

## 🎛️ Configuration

### Scheduling Options

```typescript
const schedulingOptions = {
  workingDays: [1, 2, 3, 4, 5], // Monday-Friday
  workingHours: { start: 8, end: 17 }, // 8 AM - 5 PM
  holidays: ['2024-12-25', '2024-01-01'], // Holiday dates
  weekendsExcluded: true,
  autoLevelResources: true,
  considerDependencies: true,
};
```

### Customization Options

- **Working Hours**: Define custom work schedules
- **Holidays**: Configure non-working days
- **Resource Types**: Add custom resource categories
- **Task Types**: Define specialized task types
- **Color Schemes**: Customize status and priority colors

## 🔄 Integration with Existing Features

### Budget Integration
- Link tasks to budget items for cost tracking
- Automatic cost calculations based on resources
- Milestone-based budget tracking
- Variance analysis between scheduled and actual costs

### Photo Management
- Task-specific photo attachments
- Progress verification through photos
- Before/after documentation
- Photo-based status updates

### User Permissions
- Role-based access control for scheduling
- View-only vs. edit permissions
- Job-level access restrictions
- Audit trail for all changes

## 📊 Advanced Features

### What-If Scenarios
- Create alternative schedules
- Compare different resource allocations
- Analyze impact of delays
- Risk assessment and mitigation

### Resource Optimization
- Automatic resource leveling
- Conflict detection and resolution
- Utilization balancing
- Cost optimization algorithms

### Critical Path Management
- Automatic critical path calculation
- Slack time analysis
- Impact assessment for changes
- Milestone tracking

### Export and Reporting
- Multiple export formats (JSON, CSV, iCalendar)
- Printable Gantt charts
- Resource utilization reports
- Progress tracking dashboards

## 🎨 Design Considerations

### Mobile Responsiveness
- Touch-friendly interactions
- Responsive layouts for all screen sizes
- Swipe gestures for navigation
- Mobile-optimized task management

### Performance Optimization
- Efficient data loading with pagination
- Optimistic UI updates
- Caching strategies
- Minimal re-renders

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support

## 🛠️ Development Guidelines

### Adding New Features
1. Update TypeScript types in `/types/scheduling.ts`
2. Add database migrations if needed
3. Implement backend APIs in `/api/`
4. Create UI components in `/components/scheduling/`
5. Update business logic in `/lib/scheduling/`

### Testing
- Unit tests for scheduling algorithms
- Integration tests for API endpoints
- Component tests for UI interactions
- End-to-end tests for user workflows

### Best Practices
- Use the scheduling engine for all date calculations
- Implement proper error handling and validation
- Maintain audit trails for all changes
- Use optimistic updates for better UX
- Implement proper loading states and error boundaries

## 🐛 Troubleshooting

### Common Issues

#### Circular Dependencies
The system automatically detects and prevents circular dependencies in task relationships.

#### Resource Conflicts
Resource conflicts are highlighted and can be resolved through automatic leveling or manual adjustments.

#### Performance Issues
For large projects, consider implementing pagination and virtualization for better performance.

#### Data Synchronization
All changes are tracked in the task_changes table for audit purposes and conflict resolution.

## 📚 API Reference

### Scheduling Engine

```typescript
// Auto-schedule tasks
const result = schedulingEngine.scheduleTasks(tasks, dependencies, resources, assignments);

// Calculate critical path
const criticalPath = CriticalPathAnalyzer.calculateCriticalPath(tasks, dependencies);

// Analyze delay impact
const impact = CriticalPathAnalyzer.analyzeDelayImpact(taskId, delayDays, tasks, dependencies);

// Check resource conflicts
const conflicts = ResourceManager.checkResourceConflicts(resource, assignments, tasks);
```

### Data Models

Refer to `/types/scheduling.ts` for complete TypeScript type definitions and interfaces.

## 🚀 Future Enhancements

### Planned Features
- Calendar integrations (Google, Outlook, Apple)
- Team collaboration features
- Advanced reporting and analytics
- Mobile app integration
- AI-powered scheduling suggestions
- Multi-currency support
- Template-based scheduling
- Integration with project management tools

### Scalability Improvements
- Real-time collaboration with WebSocket support
- Advanced caching strategies
- Database optimization for large datasets
- Distributed architecture support

## 📞 Support

For issues, questions, or contributions, please refer to the project documentation or create an issue in the repository.

---

**Built with modern web technologies and designed for professional project management in renovation projects.**