# Email Notification System

A comprehensive email notification system for the renovation job costing application that provides real-time alerts, summaries, and project updates.

## Features

### 🚨 Real-Time Alerts
- **Variance Alerts**: Get notified when budget variance exceeds configurable thresholds
- **Milestone Alerts**: Receive alerts at specific variance milestones (50%, 75%, 90%)
- **Change Order Notifications**: Instant alerts when change orders are created or updated
- **Budget Exceeded**: Immediate notification when project goes over budget

### 📊 Automated Summaries
- **Daily Summaries**: End-of-day project progress and spending overview
- **Weekly Summaries**: Comprehensive weekly reports with category breakdowns
- **Customizable Scheduling**: Choose which summaries you want to receive

### ⚙️ Flexible Settings
- **Configurable Thresholds**: Set custom variance percentages
- **Email Preferences**: Choose which notifications you receive
- **Timezone Support**: All timestamps respect your local timezone
- **Multiple Milestones**: Configure custom variance milestone alerts

## Architecture

### Database Schema
- `notification_preferences`: User notification settings and preferences
- `notification_logs`: Complete history of all sent notifications
- `notification_queue`: Background processing queue for reliable delivery

### Email Service
- **Provider**: Resend for reliable email delivery
- **Templates**: Beautiful HTML and text email templates
- **Personalization**: Dynamic content based on project data

### Background Processing
- **Queue System**: Reliable background processing with retry logic
- **Scheduled Jobs**: Automated daily and weekly summaries
- **Error Handling**: Comprehensive error tracking and retry mechanisms

## Setup

### 1. Environment Configuration

Add these variables to your `.env.local`:

```bash
# Email Service Configuration
RESEND_API_KEY=your_resend_api_key_here
FROM_EMAIL=notifications@yourdomain.com

# Cron Job Secrets
CRON_SECRET=your_cron_secret_key_here
```

### 2. Database Migration

Run the notification system migration:

```sql
-- Apply the migration from:
-- supabase/migrations/002_notification_system.sql
```

### 3. Deploy Edge Functions

Deploy the required Supabase Edge Functions:

```bash
# Deploy notification functions
supabase functions deploy send-notification
supabase functions deploy process-queue
supabase functions deploy schedule-summary
supabase functions deploy scheduled-daily-summary
supabase functions deploy scheduled-weekly-summary
```

### 4. Set Up Cron Jobs

Configure scheduled summaries using your preferred cron service:

```bash
# Daily summary at 6 PM user time
0 18 * * * https://your-project.supabase.co/functions/v1/scheduled-daily-summary

# Weekly summary on Sundays at 6 PM user time
0 18 * * 0 https://your-project.supabase.co/functions/v1/scheduled-weekly-summary
```

## Usage

### React Components

#### Notification Settings
```tsx
import { NotificationSettings } from '@/components/notifications/NotificationSettings'

function SettingsPage() {
  return (
    <NotificationSettings
      userId={user.id}
      onSave={(preferences) => console.log('Updated:', preferences)}
    />
  )
}
```

#### Notification History
```tsx
import { NotificationHistory } from '@/components/notifications/NotificationHistory'

function HistoryPage() {
  return (
    <NotificationHistory
      userId={user.id}
      jobId="optional-job-id"
    />
  )
}
```

#### Notification Dashboard
```tsx
import { NotificationDashboard } from '@/components/notifications/NotificationDashboard'

function DashboardPage() {
  return <NotificationDashboard userId={user.id} />
}
```

### Hooks

#### useNotifications
```tsx
import { useNotifications } from '@/hooks/useNotifications'

function MyComponent() {
  const { preferences, updatePreferences, loading } = useNotifications(user.id)

  const handleUpdate = async (settings) => {
    await updatePreferences(settings)
  }

  return <div>{/* Component content */}</div>
}
```

#### useBudgetNotifications
```tsx
import { useBudgetNotifications } from '@/hooks/useNotifications'

function BudgetComponent() {
  const { triggerVarianceCheck, triggerChangeOrderNotification } = useBudgetNotifications()

  const handleBudgetUpdate = async () => {
    await triggerVarianceCheck(jobId, budgetVersionId)
  }

  return <div>{/* Component content */}</div>
}
```

### Service Layer

```tsx
import { notificationService } from '@/lib/notifications'

// Queue a custom notification
await notificationService.queueNotification({
  user_id: userId,
  job_id: jobId,
  notification_type: 'variance_alert',
  context_data: { variance_percentage: 15.5 },
  priority: 2
})

// Get notification history
const { logs, total } = await notificationService.getNotificationHistory(userId, 20, 0)

// Send test notification
await notificationService.sendTestNotification(userId, 'variance_alert')
```

## Email Templates

### Variance Alert Template
- Shows current variance percentage
- Displays estimated vs actual costs
- Color-coded for over/under budget
- Includes direct link to job details

### Milestone Alert Template
- Celebrates reaching variance milestones
- Progress visualization
- Contextual project information

### Daily/Weekly Summary Templates
- Budget overview and progress
- Category-wise spending breakdown
- Recent activity timeline
- Completion metrics

### Change Order Templates
- Change order details and impact
- Cost and timeline implications
- Approval status tracking

## API Reference

### Database Functions

#### `queue_notification`
Queues a notification for background processing.

```sql
SELECT queue_notification(
  p_user_id => 'user-uuid',
  p_job_id => 'job-uuid',
  p_notification_type => 'variance_alert',
  p_context_data => '{"variance_percentage": 15.5}',
  p_priority => 2
);
```

#### `check_variance_alerts`
Automatically checks variance thresholds and creates alerts.

```sql
SELECT check_variance_alerts(
  p_job_id => 'job-uuid',
  p_budget_version_id => 'budget-version-uuid'
);
```

#### `get_or_create_notification_preferences`
Gets existing preferences or creates default ones.

```sql
SELECT get_or_create_notification_preferences(
  p_user_id => 'user-uuid',
  p_email_address => 'user@example.com'
);
```

### Edge Functions

#### `send-notification`
Processes individual notifications from the queue.

**Endpoint**: `/functions/v1/send-notification`
**Method**: POST

```json
{
  "notification_queue_id": "queue-item-uuid"
}
```

#### `process-queue`
Processes multiple pending notifications.

**Endpoint**: `/functions/v1/process-queue`
**Method**: POST

#### `schedule-summary`
Schedules daily or weekly summary notifications.

**Endpoint**: `/functions/v1/schedule-summary`
**Method**: POST

```json
{
  "summary_type": "daily" | "weekly"
}
```

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Coverage
- ✅ Notification preferences management
- ✅ Email template generation
- ✅ Queue operations
- ✅ Background processing
- ✅ Error handling and retry logic
- ✅ Statistics and reporting

## Monitoring

### Notification Delivery
- Track sent, failed, and pending notifications
- Monitor delivery success rates
- View error logs and retry attempts

### Performance Metrics
- Queue processing times
- Email delivery latency
- Function execution metrics

### Error Tracking
- Detailed error logging
- Retry attempt tracking
- Failure rate monitoring

## Security

### Row-Level Security (RLS)
- All notification tables use RLS policies
- Users can only access their own notifications
- Service role access for system operations

### Input Validation
- All user inputs validated using Zod schemas
- SQL injection prevention with parameterized queries
- Email template sanitization

### Rate Limiting
- Email sending rate limits
- API request throttling
- Queue processing limits

## Troubleshooting

### Common Issues

#### Emails Not Sending
1. Check Resend API key configuration
2. Verify FROM_EMAIL domain is verified
3. Check notification preferences are enabled
4. Review notification queue for errors

#### Cron Jobs Not Running
1. Verify CRON_SECRET is configured
2. Check cron service authentication
3. Review function logs for errors

#### High Error Rates
1. Monitor notification queue for failed items
2. Check email template validity
3. Verify Supabase function deployment

### Debug Mode
Enable debug logging by setting environment variable:

```bash
DEBUG_NOTIFICATIONS=true
```

## Contributing

### Adding New Notification Types
1. Add type to `NotificationType` in `lib/types.ts`
2. Create email template in `lib/email-templates.ts`
3. Add template handling in edge functions
4. Update database constraints if needed
5. Add comprehensive tests

### Custom Email Templates
1. Extend `EmailTemplates` class
2. Follow existing template patterns
3. Include both HTML and text versions
4. Test email rendering across clients

### Performance Optimization
- Monitor queue processing times
- Optimize database queries
- Implement caching where appropriate
- Review edge function cold starts

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review test cases for usage examples
3. Monitor function logs in Supabase dashboard
4. Check email delivery status in Resend dashboard