# Stage A Audit - Orma

## Scope inspected

- `index.html` (legacy monolith app)
- Git state and repository structure

## Feature inventory (current behavior)

1. Navigation/views
- Map, List, My day, Pomodoro, Calendar, WhatsApp, Settings

2. Life map
- Four root areas: Career, Money, Health, Family
- Draggable nodes
- Parent-child links
- Root/main/satellite role handling
- Color tagging and menu gestures
- Map zoom/pan and cleanup layout

3. Task management
- Create/edit/delete tasks
- Complete/reopen tasks
- Privacy toggle and private visibility filter
- Duration, schedule date/time, deadline
- Data normalization/sanitization and cycle-safe parent links

4. Planner/timeline/calendar
- 5-minute grid timeline
- Drag to move/resize/copy tasks
- Date navigation and now-line
- Calendar month grid + agenda

5. Focus timer
- Focus/short/long modes
- Tick and completion sounds
- Task-triggered pomodoro
- Cinematic water effect with reduced-motion support
- Timer drag adjustment

6. Settings/profile/data
- Completed visibility
- Water effect toggle
- Focus default durations
- Auto-start options
- Audio toggles
- Profile image upload/clear
- JSON export/copy

7. Integrations placeholder
- WhatsApp link setup placeholder with honest unavailable state

## Storage keys and migration behavior

Observed localStorage usage includes:
- `orma.tasks.v5`
- Legacy fallbacks: `orma.tasks.v4`, `orma.map.tasks.v3`
- `orma.map.layout.v1`
- `orma.profile.image.v2`
- `orma.whatsapp.bot-number.v1`
- `orma.settings.v1`

Task store includes basic legacy migration and normalization.

## Technical debt

- Single-file architecture couples UI, domain logic, storage, and side effects.
- No module boundaries or type-safe domain contracts.
- No backend or access control for multi-user data.
- No formal test suite for regressions.
- No build pipeline/CI before migration.

## Security and privacy risks

- Local-only storage lacks account boundaries.
- No server-side authorization layer yet.
- No RLS-backed database ownership controls yet.
- Future payment/auth integration must avoid exposing secrets in browser.

## Accessibility risks

- Many custom interactions require keyboard parity checks.
- Drag-heavy flows need clearer keyboard alternatives.
- Dynamic UI states need ARIA/state consistency audit after modularization.

## Behavior that must be preserved

- Visual identity: dark premium style, typography, motion language
- Life map semantics and task relationships
- Timeline drag/resize scheduling behavior
- Calendar/planner/task consistency
- Pomodoro modes and water effect behavior
- Existing local user data compatibility

## Migration strategy chosen

- Preserve full legacy runtime untouched under `public/legacy/index.html`.
- Introduce React shell and route structure first.
- Migrate features incrementally by module while running parity checks.
- Keep local-first behavior until explicit cloud migration is implemented.
- Introduce Supabase schema and RLS before enabling cloud writes.
