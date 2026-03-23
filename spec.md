# Costing

## Current State
- Masters page (RM section) has Unit field editable via row-edit mode, but `r.unit` can be undefined for older records
- Production Records History shows entries per RM row without Actual Production comparison
- Actual Production module stores entries in localStorage (`actualProductionEntries`) with planned vs actual data

## Requested Changes (Diff)

### Add
- Date-wise Actual Production summary section in Production Records History page
  - Groups actual production entries by date
  - Shows: Date, Costing Record, RM Name, Unit, Planned Consumption (kg), Actual Consumption (kg), Variance (kg), Variance (%)
  - Color-coded variance (green = under, red = over)

### Modify
- MastersPage RM section: guard `r.unit ?? ""` so Unit always has a default value when editing old records
- Production Records History: add new section below history table titled "Actual Production Summary (Date-wise)"

### Remove
- Nothing removed

## Implementation Plan
1. Fix `startEdit` in RMSection to use `r.unit ?? ""`
2. Add `loadActualEntries()` helper to ProductionRecordsPage reading from `actualProductionEntries` LS key
3. Group actual entries by date string
4. Add new section in ProductionRecordsPage JSX rendering a date-grouped comparison table
