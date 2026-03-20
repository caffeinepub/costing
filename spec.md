# Costing

## Current State
- Sidebar has two separate modules: "Costing Calculator" (/calculator) and "Cost Records" (/records)
- CostingCalculatorPage.tsx: form to create new estimates with RM rows
- CostRecordsPage.tsx: table listing all saved cost records with view/edit/delete dialogs

## Requested Changes (Diff)

### Add
- Tabs inside a single "Costing Calculator" page: "New Estimate" tab (calculator form) and "Cost Records" tab (records list + view/edit/delete dialogs)

### Modify
- CostingCalculatorPage.tsx: merge all functionality from CostRecordsPage into it using two tabs
- Layout.tsx: remove "Cost Records" nav item
- App.tsx: remove /records route; redirect /records to /calculator

### Remove
- CostRecordsPage.tsx (functionality merged into CostingCalculatorPage)
- Separate "Cost Records" sidebar entry

## Implementation Plan
1. Rewrite CostingCalculatorPage.tsx with two tabs: "New Estimate" and "Cost Records"
2. Move RecordDetailDialog and EditRecordDialog into CostingCalculatorPage.tsx
3. Update Layout.tsx to remove the Cost Records nav item
4. Update App.tsx to remove the recordsRoute and add a redirect from /records to /calculator
