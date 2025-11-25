# Feature 1: Budget Templates - Testing Guide

## Overview
Budget Templates allow users to save existing budgets as reusable templates and create new jobs from those templates. This saves time when creating similar projects.

## What Was Implemented

### Database Changes
- **New Tables:**
  - `budget_templates` - Stores template metadata (name, description, use count)
  - `template_items` - Stores scope items for each template

- **Functions:**
  - `calculate_template_total()` - Calculates the estimated total for a template

### Backend (Server Actions)
- `getTemplatesAction()` - Fetch all templates for current user
- `getTemplateByIdAction(templateId)` - Fetch single template with items
- `createTemplateFromBudgetAction(budgetVersionId, name, description)` - Save budget as template
- `createBudgetFromTemplateAction(templateId, jobId)` - Create budget from template
- `deleteTemplateAction(templateId)` - Delete a template
- `updateTemplateAction(templateId, name, description)` - Update template metadata

### Frontend Pages
1. **Templates Library** (`/templates`)
   - Lists all user templates
   - Shows template stats (items, est. total, use count)
   - View details and delete buttons

2. **Template Detail** (`/templates/[id]`)
   - Shows all scope items in the template
   - Summary stats (total items, categories, avg per item)
   - Full table of template items

3. **Save as Template Button** (on job detail page)
   - Modal dialog to save current budget as template
   - Name and description fields
   - Creates template from all scope items

4. **Create from Template** (on new job page)
   - Dropdown selector to choose template
   - Creates job with pre-filled scope items

## Testing Instructions

### Prerequisites
1. **Apply Database Migration:**
   ```sql
   -- Run this in your Supabase SQL Editor
   -- Copy content from: supabase/migrations/002_budget_templates.sql
   ```

2. **Start Development Server:**
   ```bash
   npm run dev
   ```

### Test Scenario 1: Save Budget as Template

1. **Create a Job with Scope Items:**
   - Navigate to `/jobs/new`
   - Create a job: "Test Kitchen Reno"
   - Add 3-5 scope items with different categories

2. **Save as Template:**
   - On the job detail page, click "Save as Template" (green button)
   - Enter template name: "Kitchen Renovation Standard"
   - Enter description: "Standard kitchen remodel with cabinets, countertops, and appliances"
   - Click "Create Template"
   - Should redirect to `/templates`

3. **Verify Template Created:**
   - You should see the new template in the list
   - Check that item count matches the number of scope items
   - Check that estimated total matches the job's estimated total
   - Use count should be 0

### Test Scenario 2: View Template Details

1. **View Template:**
   - Click "View Details" on the template
   - Should see all scope items in a table
   - Summary stats should be accurate:
     - Total Items
     - Estimated Total
     - Average per Item
     - Number of Categories

2. **Verify Data Accuracy:**
   - Check that categories are displayed correctly
   - Check that material costs and labor hours match original
   - Check that notes are preserved

### Test Scenario 3: Create Job from Template

1. **Create New Job:**
   - Navigate to `/jobs/new`
   - Enter job details:
     - Name: "Johnson Kitchen Remodel"
     - Client: "Sarah Johnson"
     - Address: "456 Oak St"

2. **Select Template:**
   - In the "Use Template" dropdown, select "Kitchen Renovation Standard"
   - Should see message: "This will create the job with pre-filled scope items..."
   - Click "Create Job"

3. **Verify Job Created:**
   - Should redirect to the new job detail page
   - All scope items from template should be present
   - Estimated costs should match template
   - Actual costs should be $0.00
   - Template use count should increment to 1

### Test Scenario 4: Delete Template

1. **Delete Template:**
   - Go to `/templates`
   - Click "Delete" on a template
   - Confirm deletion in browser prompt
   - Template should disappear from list

2. **Verify Deletion:**
   - Jobs created from that template should still exist
   - Template should not appear in the dropdown on `/jobs/new`

### Test Scenario 5: Multiple Templates

1. **Create Multiple Templates:**
   - Create 2-3 different jobs with different scope types
   - Save each as a template with descriptive names:
     - "Bathroom Renovation"
     - "Basement Finishing"
     - "Deck Installation"

2. **Verify Template Selection:**
   - Go to `/jobs/new`
   - Dropdown should show all templates with use counts
   - Select different templates and verify they create correct scope items

### Test Scenario 6: Edge Cases

1. **Empty Budget:**
   - Create a job with NO scope items
   - "Save as Template" button should NOT appear (it only shows when there are scope items)

2. **Template with No Items:**
   - Manually create a template, then delete all template_items from database
   - Template detail page should show "This template has no items"

3. **Large Template:**
   - Create a budget with 20+ scope items
   - Save as template
   - Create job from template
   - Verify all items are created successfully

## Expected Behavior

### Success Criteria
✅ Templates are saved with all scope items
✅ Template metadata (name, description) is stored correctly
✅ Template use count increments when used
✅ Jobs created from templates have all scope items pre-filled
✅ Estimated costs are copied, actual costs start at $0
✅ Categories are preserved from original scope items
✅ Notes on scope items are preserved
✅ Deleting template doesn't affect jobs created from it
✅ Templates are user-specific (RLS policies work)

### UI/UX Checks
✅ "Save as Template" button appears only when scope items exist
✅ Template creation modal is user-friendly
✅ Template library shows meaningful stats
✅ Template detail page is readable and organized
✅ Dropdown on job creation shows templates clearly
✅ Confirmation prompt appears before deleting

## Common Issues & Troubleshooting

### Issue: "Save as Template" button doesn't appear
**Solution:** Make sure the job has at least 1 scope item

### Issue: Template creation fails
**Solution:** Check browser console for errors. Verify migration was run in Supabase.

### Issue: Templates don't appear in dropdown
**Solution:** Make sure you're logged in as the user who created the templates (RLS policies)

### Issue: Template items missing categories
**Solution:** Check that category_id exists in the original scope items

### Issue: Use count doesn't increment
**Solution:** Check the server action is updating the use_count field

## Next Steps

After testing is complete and everything works:
1. Run database migration in production Supabase
2. Deploy to Vercel
3. Test in production with real data
4. Move on to **Feature 2: Dashboard with Analytics**

## Files Modified/Created

### Database
- `supabase/migrations/002_budget_templates.sql`

### Types
- `lib/types.ts` (added BudgetTemplate, TemplateItem types)

### Server Actions
- `app/(protected)/templates/actions.ts`
- `app/(protected)/jobs/new/actions.ts`

### Pages
- `app/(protected)/templates/page.tsx`
- `app/(protected)/templates/[id]/page.tsx`
- `app/(protected)/jobs/new/page.tsx`
- `app/(protected)/jobs/[id]/page.tsx`

### Components
- `app/(protected)/jobs/[id]/SaveAsTemplateButton.tsx`
- `app/(protected)/jobs/new/CreateJobForm.tsx`

### Navigation
- `app/(protected)/dashboard/page.tsx` (added Templates link)

---

**Status:** Ready for testing ✅
**Estimated Testing Time:** 15-20 minutes
**Complexity:** Medium
