import { EmailTemplate, NotificationContextData } from './types'

export class EmailTemplates {
  static varianceAlert(data: NotificationContextData): EmailTemplate {
    const {
      variance_percentage,
      total_estimated,
      total_actual,
      total_variance,
      threshold,
      job_name,
      client_name
    } = data

    const isOverBudget = variance_percentage > 0
    const varianceAmount = Math.abs(variance_percentage)
    const varianceType = isOverBudget ? 'over' : 'under'

    return {
      name: 'variance-alert',
      subject: `Budget Alert: ${job_name} is ${varianceAmount.toFixed(1)}% ${varianceType} budget`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Budget Variance Alert</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0; margin-bottom: 20px; }
            .alert { padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .alert.warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
            .alert.danger { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
            .alert.success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
            .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .metric:last-child { border-bottom: none; }
            .metric-label { font-weight: 600; color: #666; }
            .metric-value { font-weight: 700; }
            .positive { color: #dc3545; }
            .negative { color: #28a745; }
            .cta { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>🚨 Budget Variance Alert</h2>
            <p><strong>${job_name}</strong>${client_name ? ` for ${client_name}` : ''} has exceeded your variance threshold</p>
          </div>

          <div class="alert ${isOverBudget ? 'danger' : 'warning'}">
            <strong>Alert:</strong> Your project is ${varianceAmount.toFixed(1)}% ${varianceType} budget (threshold: ${threshold}%)
          </div>

          <div class="metrics">
            <div class="metric">
              <span class="metric-label">Estimated Budget:</span>
              <span class="metric-value">$${total_estimated?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Actual Costs:</span>
              <span class="metric-value">$${total_actual?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Variance:</span>
              <span class="metric-value ${isOverBudget ? 'positive' : 'negative'}">
                ${isOverBudget ? '+' : ''}$${total_variance?.toFixed(2) || '0.00'} (${varianceAmount.toFixed(1)}%)
              </span>
            </div>
          </div>

          <p>This variance requires your attention. Consider reviewing recent cost entries and adjusting the budget if necessary.</p>

          <a href="#" class="cta">View Job Details</a>

          <div class="footer">
            <p>You're receiving this alert because you've enabled variance notifications.
               <a href="#">Manage notification preferences</a>.</p>
          </div>
        </body>
        </html>
      `,
      textContent: `
Budget Variance Alert

Job: ${job_name}${client_name ? ` for ${client_name}` : ''}

ALERT: Your project is ${varianceAmount.toFixed(1)}% ${varianceType} budget (threshold: ${threshold}%)

Estimated Budget: $${total_estimated?.toFixed(2) || '0.00'}
Actual Costs: $${total_actual?.toFixed(2) || '0.00'}
Variance: ${isOverBudget ? '+' : ''}$${total_variance?.toFixed(2) || '0.00'} (${varianceAmount.toFixed(1)}%)

This variance requires your attention. Consider reviewing recent cost entries and adjusting the budget if necessary.
      `
    }
  }

  static milestoneAlert(data: NotificationContextData): EmailTemplate {
    const {
      milestone_percentage,
      variance_percentage,
      total_estimated,
      total_actual,
      job_name,
      client_name
    } = data

    const isOverBudget = variance_percentage > 0

    return {
      name: 'milestone-alert',
      subject: `Budget Milestone: ${job_name} has reached ${milestone_percentage}% variance`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Budget Milestone Alert</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; margin-bottom: 20px; }
            .milestone { background: #e3f2fd; border: 1px solid #bbdefb; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
            .milestone-number { font-size: 2.5em; font-weight: bold; color: #1976d2; margin: 10px 0; }
            .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .metric:last-child { border-bottom: none; }
            .metric-label { font-weight: 600; color: #666; }
            .metric-value { font-weight: 700; }
            .cta { background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>📊 Budget Milestone Reached</h2>
            <p><strong>${job_name}</strong>${client_name ? ` for ${client_name}` : ''} has hit an important variance threshold</p>
          </div>

          <div class="milestone">
            <div class="milestone-number">${milestone_percentage}%</div>
            <p>Budget Variance Milestone</p>
          </div>

          <div class="metrics">
            <div class="metric">
              <span class="metric-label">Current Variance:</span>
              <span class="metric-value">${Math.abs(variance_percentage).toFixed(1)}% ${isOverBudget ? 'over' : 'under'}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Estimated Budget:</span>
              <span class="metric-value">$${total_estimated?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Actual Costs:</span>
              <span class="metric-value">$${total_actual?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          <p>This milestone indicates significant budget movement. It's a good time to assess project progress and make any necessary adjustments.</p>

          <a href="#" class="cta">Review Budget Details</a>

          <div class="footer">
            <p>You're receiving this alert because you've enabled milestone notifications.
               <a href="#">Manage notification preferences</a>.</p>
          </div>
        </body>
        </html>
      `,
      textContent: `
Budget Milestone Alert

Job: ${job_name}${client_name ? ` for ${client_name}` : ''}

MILESTONE: ${milestone_percentage}% Budget Variance Reached

Current Variance: ${Math.abs(variance_percentage).toFixed(1)}% ${isOverBudget ? 'over' : 'under'}
Estimated Budget: $${total_estimated?.toFixed(2) || '0.00'}
Actual Costs: $${total_actual?.toFixed(2) || '0.00'}

This milestone indicates significant budget movement. It's a good time to assess project progress and make any necessary adjustments.
      `
    }
  }

  static dailySummary(data: NotificationContextData): EmailTemplate {
    const { summary_data, job_name } = data
    const date = new Date().toLocaleDateString()

    return {
      name: 'daily-summary',
      subject: `Daily Summary: ${job_name} - ${date}`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Daily Budget Summary</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0; margin-bottom: 20px; }
            .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .summary-card { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; }
            .summary-title { font-size: 14px; color: #666; margin-bottom: 5px; }
            .summary-value { font-size: 24px; font-weight: bold; color: #333; }
            .activity-list { margin-top: 20px; }
            .activity-item { padding: 10px 0; border-bottom: 1px solid #eee; }
            .activity-item:last-child { border-bottom: none; }
            .activity-type { font-weight: 600; color: #666; }
            .cta { background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>📅 Daily Budget Summary</h2>
            <p><strong>${job_name}</strong> - ${date}</p>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-title">Total Budget</div>
              <div class="summary-value">$${summary_data?.total_budget?.toFixed(2) || '0.00'}</div>
            </div>
            <div class="summary-card">
              <div class="summary-title">Spent</div>
              <div class="summary-value">$${summary_data?.total_spent?.toFixed(2) || '0.00'}</div>
            </div>
            <div class="summary-card">
              <div class="summary-title">Variance</div>
              <div class="summary-value">${summary_data?.variance_percentage?.toFixed(1) || '0.0'}%</div>
            </div>
            <div class="summary-card">
              <div class="summary-title">Items Updated</div>
              <div class="summary-value">${summary_data?.items_updated || 0}</div>
            </div>
          </div>

          <div class="activity-list">
            <h3>Today's Activity</h3>
            ${summary_data?.activities?.map((activity: any) => `
              <div class="activity-item">
                <span class="activity-type">${activity.type}:</span> ${activity.description}
                <div style="font-size: 12px; color: #666; margin-top: 2px;">${activity.time}</div>
              </div>
            `).join('') || '<p>No activity today</p>'}
          </div>

          <a href="#" class="cta">View Full Dashboard</a>

          <div class="footer">
            <p>You're receiving this daily summary because you've enabled daily notifications.
               <a href="#">Manage notification preferences</a>.</p>
          </div>
        </body>
        </html>
      `,
      textContent: `
Daily Budget Summary

Job: ${job_name}
Date: ${date}

Total Budget: $${summary_data?.total_budget?.toFixed(2) || '0.00'}
Spent: $${summary_data?.total_spent?.toFixed(2) || '0.00'}
Variance: ${summary_data?.variance_percentage?.toFixed(1) || '0.0'}%
Items Updated: ${summary_data?.items_updated || 0}

Today's Activity:
${summary_data?.activities?.map((activity: any) => `- ${activity.type}: ${activity.description} (${activity.time})`).join('\n') || 'No activity today'}
      `
    }
  }

  static weeklySummary(data: NotificationContextData): EmailTemplate {
    const { summary_data, job_name } = data
    const weekEnd = new Date().toLocaleDateString()
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()

    return {
      name: 'weekly-summary',
      subject: `Weekly Summary: ${job_name} - ${weekStart} to ${weekEnd}`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Weekly Budget Summary</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; margin-bottom: 20px; }
            .week-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
            .stat-card { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; text-align: center; }
            .stat-value { font-size: 20px; font-weight: bold; color: #333; }
            .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
            .progress-section { margin: 20px 0; }
            .progress-bar { background: #f0f0f0; height: 20px; border-radius: 10px; overflow: hidden; margin-bottom: 10px; }
            .progress-fill { background: #4CAF50; height: 100%; transition: width 0.3s ease; }
            .category-breakdown { margin: 20px 0; }
            .category-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee; }
            .category-item:last-child { border-bottom: none; }
            .category-color { width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; display: inline-block; }
            .cta { background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>📊 Weekly Budget Summary</h2>
            <p><strong>${job_name}</strong> - ${weekStart} to ${weekEnd}</p>
          </div>

          <div class="week-stats">
            <div class="stat-card">
              <div class="stat-value">$${summary_data?.week_spent?.toFixed(2) || '0.00'}</div>
              <div class="stat-label">This Week</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">$${summary_data?.total_spent?.toFixed(2) || '0.00'}</div>
              <div class="stat-label">Total Spent</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${summary_data?.completion_percentage?.toFixed(1) || '0.0'}%</div>
              <div class="stat-label">Completed</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${summary_data?.items_completed || 0}</div>
              <div class="stat-label">Items Done</div>
            </div>
          </div>

          <div class="progress-section">
            <h3>Project Progress</h3>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${summary_data?.completion_percentage || 0}%"></div>
            </div>
            <p style="font-size: 14px; color: #666;">
              ${summary_data?.completion_percentage?.toFixed(1) || '0.0'}% complete •
              ${summary_data?.remaining_items || 0} items remaining
            </p>
          </div>

          <div class="category-breakdown">
            <h3>Spending by Category</h3>
            ${summary_data?.categories?.map((cat: any) => `
              <div class="category-item">
                <div>
                  <span class="category-color" style="background: ${cat.color}"></span>
                  <span>${cat.name}</span>
                </div>
                <div>
                  <strong>$${cat.spent.toFixed(2)}</strong>
                  <span style="color: #666; font-size: 14px;"> / $${cat.budget.toFixed(2)}</span>
                </div>
              </div>
            `).join('') || '<p>No category data available</p>'}
          </div>

          <a href="#" class="cta">View Detailed Report</a>

          <div class="footer">
            <p>You're receiving this weekly summary because you've enabled weekly notifications.
               <a href="#">Manage notification preferences</a>.</p>
          </div>
        </body>
        </html>
      `,
      textContent: `
Weekly Budget Summary

Job: ${job_name}
Period: ${weekStart} to ${weekEnd}

This Week's Spending: $${summary_data?.week_spent?.toFixed(2) || '0.00'}
Total Spent: $${summary_data?.total_spent?.toFixed(2) || '0.00'}
Completion: ${summary_data?.completion_percentage?.toFixed(1) || '0.0'}%
Items Completed: ${summary_data?.items_completed || 0}

Spending by Category:
${summary_data?.categories?.map((cat: any) => `${cat.name}: $${cat.spent.toFixed(2)} / $${cat.budget.toFixed(2)}`).join('\n') || 'No category data available'}

Project Progress: ${summary_data?.completion_percentage?.toFixed(1) || '0.0'}% complete with ${summary_data?.remaining_items || 0} items remaining.
      `
    }
  }

  static changeOrderCreated(data: NotificationContextData): EmailTemplate {
    const { job_name, client_name, change_order_details } = data

    return {
      name: 'change-order-created',
      subject: `Change Order Created: ${job_name}`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Change Order Created</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px 8px 0 0; margin-bottom: 20px; }
            .change-order { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: 600; color: #666; }
            .impact { margin: 20px 0; }
            .impact-positive { color: #28a745; }
            .impact-negative { color: #dc3545; }
            .impact-neutral { color: #6c757d; }
            .cta { background: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>📝 Change Order Created</h2>
            <p><strong>${job_name}</strong>${client_name ? ` for ${client_name}` : ''}</p>
          </div>

          <div class="change-order">
            <h3>Change Order Details</h3>
            <div class="detail-row">
              <span class="detail-label">Order ID:</span>
              <span>${change_order_details?.id || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Description:</span>
              <span>${change_order_details?.description || 'No description provided'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Created By:</span>
              <span>${change_order_details?.created_by || 'Unknown'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span>${change_order_details?.created_date || new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div class="impact">
            <h3>Budget Impact</h3>
            <p class="impact-${change_order_details?.impact_type || 'neutral'}">
              ${change_order_details?.impact_description || 'No impact details provided'}
            </p>
            ${change_order_details?.cost_impact ? `
              <p><strong>Cost Impact:</strong> $${change_order_details.cost_impact.toFixed(2)}</p>
            ` : ''}
          </div>

          <a href="#" class="cta">Review Change Order</a>

          <div class="footer">
            <p>You're receiving this notification because you've enabled change order alerts.
               <a href="#">Manage notification preferences</a>.</p>
          </div>
        </body>
        </html>
      `,
      textContent: `
Change Order Created

Job: ${job_name}${client_name ? ` for ${client_name}` : ''}

Change Order Details:
- ID: ${change_order_details?.id || 'N/A'}
- Description: ${change_order_details?.description || 'No description provided'}
- Created By: ${change_order_details?.created_by || 'Unknown'}
- Date: ${change_order_details?.created_date || new Date().toLocaleDateString()}

Budget Impact:
${change_order_details?.impact_description || 'No impact details provided'}
${change_order_details?.cost_impact ? `Cost Impact: $${change_order_details.cost_impact.toFixed(2)}` : ''}
      `
    }
  }
}