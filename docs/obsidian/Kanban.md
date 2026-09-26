---

kanban-plugin: board

---

## Next Phase

- [ ] **Dashboard sidebar** #next-phase · [[Visual]]
  **Done when:** Visual display of error patterns over time is shown in the sidebar
  - [ ] Design sidebar layout
  - [ ] Build mistakes-per-week chart
  - [ ] Add "by kind" error table
  - [ ] Wire chart to stored error data

- [ ] **Data persistence** #next-phase · [[Control]]
  **Done when:** Errors survive extension restart
  - [ ] Choose persistence format
  - [ ] Save errors on each event
  - [ ] Load saved errors on activation
  - [ ] Test restart scenario

- [ ] **End-of-session summary** #next-phase · [[Learning]]
  **Done when:** Summary is shown when the session closes
  - [ ] Define summary contents
  - [ ] Compute session stats (errors, minutes, fixed solo)
  - [ ] Show summary on session end

- [ ] **Exportable progress report** #next-phase · [[Learning]]
  **Done when:** One-page report can be exported as PDF or markdown
  - [ ] Design one-page report layout
  - [ ] Implement markdown export
  - [ ] Implement PDF export
  - [ ] Add export button to dashboard

- [ ] **Auto-clear old error data** #data-management · [[Control]]
  **Done when:** Configurable cutoff date; old data is removed automatically
  - [ ] Add cutoff date setting
  - [ ] Implement cleanup job on activation
  - [ ] Test that recent data is kept

- [ ] **Manual reset button for data** #data-management · [[Control]]
  **Done when:** Button in dashboard clears all error history
  - [ ] Add reset button to dashboard
  - [ ] Add confirmation dialog
  - [ ] Clear stored error history

- [ ] **Update dashboard visuals to match VS Code theme** #design · [[Visual]]
  **Done when:** Dashboard colors and fonts match the active VS Code theme
  - [ ] Replace hard-coded colors with theme variables
  - [ ] Match VS Code fonts
  - [ ] Check light and dark themes


## Backlog

- [ ] **Group unknown languages into Others category** #dashboard · [[Error Display|Behavior]]
  **Done when:** Unknown-language errors are grouped under "Others" on the graph
  - [ ] Detect unknown languages
  - [ ] Merge into "Others" series
  - [ ] Update graph legend

- [ ] **Improve error type naming and descriptions** #dashboard · [[Error Display|Behavior]]
  **Done when:** Error names are clear and student-friendly; descriptions explain each category
  - [ ] List all current error types
  - [ ] Rewrite names in plain language
  - [ ] Write short descriptions

- [ ] **Document release and publish process** #documentation · [[Release]]
  **Done when:** README has step-by-step instructions for publishing to the VS Code marketplace
  - [ ] Document build and package steps
  - [ ] Document marketplace publish steps
  - [ ] Add versioning checklist

- [ ] **Performance monitoring and optimization** #performance · [[Infrastructure]]
  **Done when:** Response time tracked; no noticeable slowdown to VS Code
  - [ ] Add timing measurements
  - [ ] Set a response-time budget
  - [ ] Profile and fix slow paths

- [ ] **Accessibility features** #accessibility · [[Visual]]
  **Done when:** Screen reader, keyboard navigation and high contrast modes are supported
  - [ ] Add ARIA labels
  - [ ] Make all controls keyboard reachable
  - [ ] Test high contrast themes

- [ ] **Analytics and usage telemetry** #analytics · [[Feedback]]
  **Done when:** Shows how students use features and where they struggle most
  - [ ] Decide what to track
  - [ ] Add opt-in consent
  - [ ] Collect anonymous usage events
  - [ ] Build struggle-areas report

- [ ] **Customizable settings and preferences** #user-experience · [[Visual]]
  **Done when:** Students can adjust coaching intensity, notification frequency and display options
  - [ ] Add coaching intensity setting
  - [ ] Add notification frequency setting
  - [ ] Add display options
  - [ ] Build settings UI

- [ ] **Community feedback and issue reporting** #community · [[Feedback]]
  **Done when:** Students can report bugs or suggest improvements from the extension
  - [ ] Add "Report a bug" command
  - [ ] Add "Request a feature" command
  - [ ] Route submissions to issue tracker

- [ ] **Improve application logo** #design · [[Visual]]
  **Done when:** Logo is professional, recognizable and works at multiple sizes
  - [ ] Sketch concepts
  - [ ] Pick final logo
  - [ ] Export icon sizes
  - [ ] Update extension manifest

- [ ] **Multi-language and internationalization support** #localization · [[Visual]]
  **Done when:** Extension is available in multiple languages
  - [ ] Extract UI strings
  - [ ] Set up translation files
  - [ ] Translate first extra language

- [ ] **GitHub Classroom integration** #integration · [[Infrastructure]]
  **Done when:** Assignment tracking connects with GitHub Classroom
  - [ ] Research the GitHub Classroom API
  - [ ] Authenticate with GitHub
  - [ ] Show assignment progress

- [ ] **Offline mode support** #connectivity · [[Infrastructure]]
  **Done when:** Core coaching features work without internet
  - [ ] List features needing network
  - [ ] Add local fallbacks
  - [ ] Test with network disabled

- [ ] **Dark and light mode themes** #design · [[Visual]]
  **Done when:** Extension respects the system theme preference and offers both themes
  - [ ] Define light palette
  - [ ] Define dark palette
  - [ ] Follow system theme automatically

- [ ] **Gamification and achievement badges** #motivation · [[Learning]]
  **Done when:** Students earn badges and milestones
  - [ ] Define badge list and rules
  - [ ] Track milestones
  - [ ] Show badges in dashboard

- [ ] **Code injection protection and security audit** #security · [[Infrastructure]]
  **Done when:** Inputs are sanitized, malicious code cannot run, and a security review is completed
  - [ ] Sanitize all user and file inputs
  - [ ] Review dependencies
  - [ ] Complete security review
  - [ ] Document findings


## In Progress



## Done

**Complete**
- [x] **Scaffold extension and verify it runs** #core-coaching · [[Coaching Engine]]
  ✅ Met: Extension loads in VS Code without crashes
  - [x] Initialize extension structure
  - [x] Launch in Extension Host

- [x] **Log diagnostic changes to console** #core-coaching · [[Coaching Engine]]
  ✅ Met: Errors are captured and logged to console output
  - [x] Subscribe to diagnostics events
  - [x] Log changes to console

- [x] **Friendly hint text for one error type** #core-coaching · [[Coaching Engine]]
  ✅ Met: At least one error type shows a user-friendly hint
  - [x] Pick an error type
  - [x] Write friendly hint text

- [x] **Pick storage location** #error-storage · [[Error]]
  ✅ Met: Storage method chosen and documented
  - [x] Compare storage options
  - [x] Document the decision

- [x] **Log error event when JSON** #error-storage · [[Error]]
  ✅ Met: Error events are serialized to JSON
  - [x] Define JSON schema
  - [x] Write events to storage

- [x] **Add config entry for repeat threshold and time window** #error-storage · [[Error]]
  ✅ Met: Settings are adjustable by the user
  - [x] Add threshold setting
  - [x] Add time window setting

- [x] **Implement repeat counting mute logic for error type** #error-display · [[Error Display|Behavior]]
  ✅ Met: Same error is muted after X repeats in Y time
  - [x] Count repeats per error type
  - [x] Mute after threshold in time window

- [x] **Render the hint near the error in the editor** #error-display · [[Error Display|Behavior]]
  ✅ Met: Hint appears inline near the error location
  - [x] Locate error position
  - [x] Render inline hint

- [x] **Error recovery and quick fix suggestions** #error-handling · [[Error]]
  ✅ Met: Students get actionable fix suggestions for common errors
  - [x] Identify common errors
  - [x] Add quick fix actions

- [x] **Unit and integration tests** #testing · [[Coaching Engine]]
  ✅ Met: Test coverage for core extension functionality
  - [x] Write unit tests
  - [x] Write integration tests

- [x] **User documentation and quick start guide** #documentation · [[Growth]]
  ✅ Met: Students understand how to use Code Coach on first launch
  - [x] Write quick start guide
  - [x] Document features




%% kanban:settings
```
{"kanban-plugin":"board","list-collapse":[false,false,false,false]}
```
%%
