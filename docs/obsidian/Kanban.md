---

kanban-plugin: board

---

## Next Phase

- [ ] Dashboard sidebar #next-phase — Visual display of error patterns over time
- [ ] Data persistence #next-phase — Errors survive extension restart
- [ ] End-of-session summary #next-phase — Summary shown on session close
- [ ] Exportable progress report #next-phase — One-page report exported as PDF/markdown
- [ ] Auto-clear old error data #data-management — Configurable cutoff date, old data removed automatically
- [ ] Manual reset button for data #data-management — Button in dashboard clears all error history
- [ ] Update dashboard visuals to match VS Code theme #design — Colors and fonts match active theme


## Backlog

- [ ] Group unknown languages into Others category #dashboard — Cleaner graph
- [ ] Improve error type naming and descriptions #dashboard — Clear, student-friendly names
- [ ] Document release and publish process #documentation — README steps for VS Code marketplace
- [ ] Performance monitoring and optimization #performance — No noticeable VS Code slowdown
- [ ] Accessibility features #accessibility — Screen readers, keyboard navigation, high contrast
- [ ] Analytics and usage telemetry #analytics — See where students struggle most
- [ ] Customizable settings and preferences #user-experience — Coaching intensity, notification frequency, display options
- [ ] Community feedback and issue reporting #community — Report bugs / suggest improvements from the extension
- [ ] Improve application logo #design — Professional, works at multiple sizes
- [ ] Multi-language and internationalization support #localization — Multiple languages
- [ ] GitHub Classroom integration #integration — Assignment tracking
- [ ] Offline mode support #connectivity — Core coaching works without internet
- [ ] Dark and light mode themes #design — Respect system theme preference
- [ ] Gamification and achievement badges #motivation — Badges and milestones
- [ ] Code injection protection and security audit #security — Sanitize inputs, security review


## In Progress



## Done

**Complete**
- [x] Scaffold extension and verify it runs #core-coaching
- [x] Log diagnostic changes to console #core-coaching
- [x] Friendly hint text for one error type #core-coaching
- [x] Pick storage location #error-storage
- [x] Log error event when JSON #error-storage
- [x] Add config entry for repeat threshold and time window #error-storage
- [x] Implement repeat counting mute logic for error type #error-display
- [x] Render the hint near the error in the editor #error-display
- [x] Error recovery and quick fix suggestions #error-handling
- [x] Unit and integration tests #testing
- [x] User documentation and quick start guide #documentation




%% kanban:settings
```
{"kanban-plugin":"board","list-collapse":[false,false,false,false]}
```
%%