# Stage C Progress - Native Feature Extraction

## Completed in this iteration

1. Added first native feature module: Tasks
- Route: `/tasks`
- Typed Zustand store with load/create/toggle/delete
- Filter by area and completed visibility toggle
- JSON copy export and validated import path

2. Preserved existing user data access
- Local adapter now attempts `orma.tasks.v5` first.
- Falls back to legacy keys (`orma.tasks.v4`, `orma.map.tasks.v3`) with normalization.

3. Preserved migration safety
- Legacy runtime still available at `/` and `/legacy`.
- Native module is additive and does not remove existing interactions.

4. Added native Settings module
- Route: `/settings`
- Typed settings store with local persistence
- Controls for completed visibility, pomodoro defaults, automation flags, and audio/water toggles
- Reset to defaults action
- Store and adapter compatibility covered by passing unit tests

5. Added native Focus module
- Route: `/focus`
- Typed focus store with persisted timer runtime (`deadline` + `remaining`) for reload continuity
- Focus/short/long mode transitions with auto-start behaviors from settings
- Task-linked focus start with remaining-time-aware duration
- Unit tests for start/pause and completion transitions

6. Added native Planner and Calendar modules
- Routes: `/planner` and `/calendar`
- Planner supports date navigation, scheduled tasks, quick scheduling of unscheduled tasks, and task-to-focus launch
- Calendar supports month navigation, task counts per day, and agenda with focus handoff
- Task store now supports typed `updateTask` for schedule edits

## Next extraction targets

1. Settings module
- Reuse typed settings model and persistence adapter.

2. Focus module
- Move timer modes and state logic out of legacy file.

3. Planner module
- Extract day timeline and schedule operations with parity checks.
