# Critical Flows (Manual + future E2E)

## Must-pass flows before public beta

1. Legacy app launch
- Open `/` and confirm legacy iframe loads.
- Verify existing task data appears from localStorage.

2. Core lifecycle
- Create task, schedule task, complete task, delete task.
- Confirm map, day planner, and calendar consistency.

3. Pomodoro lifecycle
- Start/pause/reset timer.
- Start task-linked pomodoro from timeline.
- Validate remaining-time behavior and water effect toggles.

4. Settings persistence
- Change durations and toggles.
- Reload and verify persistence.

5. Export/import safety (next stage)
- Export JSON and re-import after validation.
- Confirm malformed payloads are rejected.

## Planned E2E scope

Use Playwright in Stage E for automated regression checks.
