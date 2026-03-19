# Costing

## Current State
Backend uses `Map.empty<Nat, ...>()` (non-stable in-memory maps) for all data stores: gsmRanges, grades, layers, rms, costingRecords, productionEntries. Data is wiped on every canister upgrade/deployment.

## Requested Changes (Diff)

### Add
- Stable backup arrays for all data collections and nextId counter
- preupgrade/postupgrade hooks to serialize/deserialize data to/from stable arrays

### Modify
- All state variables converted to use stable-backed storage pattern

### Remove
- Nothing removed functionally

## Implementation Plan
1. Add stable var arrays for each entity type
2. Add system preupgrade to copy Map data → stable arrays
3. Add system postupgrade to restore stable arrays → Maps (and seed if empty)
4. All existing CRUD APIs remain unchanged
