## Project Overview

**[[Code Coach]]** is a [[VS Code Extension]] designed to help students learn independently through intelligent Error Handling and [[Coaching]].

### Key Components

- **Dashboard** — Visual feedback on error patterns and progress
- **Error Display** — In-editor hints and guidance
- **Data Management** — Storage, cleanup, and reset functionality

### Related Concepts

Error Hints support Student Learning by turning mistakes into lessons. Progress Tracking and Session Summary track that growth over time, powered by ongoing Extension Development on the [[VS Code Extension]].

Completed Tasks

## _Tasks that complete the Core Coaching System, Error Display, and Error Storage subsystems._

### Core Coaching System

- **Log diagnostic changes to console** — Capture error output for analysis
- **Friendly hint text for one error type** — Turn raw errors into learning moments
- **Scaffold extension and verify it runs** — Initialize VS Code extension structure

### Error Storage & Configuration

- **Pick storage location** — Determine where to persist error data
- **Log error event when JSON** — Structure and store error metadata
- **Add config entry for repeat threshold and time window** — Let students adjust sensitivity settings

### Error Display & Muting

- **Implement repeat counting mute logic for error type** — Suppress repetitive errors after threshold
- **Render the hint near the error in the editor** — Display coaching inline near mistakes

## Kanban Board

|   |   |   |   |
|---|---|---|---|
|To Do|In Progress|Done||
|Dashboard sidebar||Log diagnostic changes to console||
|Data persistence||Friendly hint text for one error type||
|End-of-session summary||Scaffold extension and verify it runs||
|Exportable progress report||Pick storage location||
|||Log error event when JSON||
|||Add config entry for repeat threshold and time window||
|||Implement repeat counting mute logic for error type||
|||Render the hint near the error in the editor||

## Task Tracker

| Error recovery and quick fix suggestions | Done | Error Handling | Students get actionable fix suggestions for common errors | | Unit and integration tests | Done | Testing | Test coverage for core extension functionality | | User documentation and quick start guide | Done | Documentation | Students understand how to use Code Coach on first launch |

|   |   |   |   |
|---|---|---|---|
|Task|Status|Category|Acceptance Criteria|
|Log diagnostic changes to console|Done|Core Coaching|Errors captured and logged to console output|
|Friendly hint text for one error type|Done|Core Coaching|At least one error type shows user-friendly hint|
|Scaffold extension and verify it runs|Done|Core Coaching|Extension loads in VS Code without crashes|
|Pick storage location|Done|Error Storage|Storage method chosen and documented|
|Log error event when JSON|Done|Error Storage|Error events serialized to JSON format|
|Add config entry for repeat threshold and time window|Done|Error Storage|Settings adjustable by user|
|Implement repeat counting mute logic for error type|Done|Error Display|Same error muted after X repeats in Y time|
|Render the hint near the error in the editor|Done|Error Display|Hint appears inline near error location|
|Dashboard sidebar|To Do|Next Phase|Visual display of error patterns over time|
|Data persistence|To Do|Next Phase|Errors survive extension restart|
|End-of-session summary|To Do|Next Phase|Summary shown on session close|
|Exportable progress report|To Do|Next Phase|One-page report can be exported as PDF/markdown|
|Auto-clear old error data|To Do|Data Management|Configurable cutoff date, old data automatically removed|
|Manual reset button for data|To Do|Data Management|Button in dashboard clears all error history|
|Update dashboard visuals to match VS Code theme|To Do|Design|Dashboard colors and fonts match active VS Code theme|

| Group unknown languages into Others category | To Do | Dashboard | Unknown language errors grouped under "Others" on graph for cleaner Error Display |

| Improve error type naming and descriptions | To Do | Dashboard | Error names are clear and student-friendly; descriptions help users understand each error category |

| Document release and publish process | To Do | Documentation | README includes step-by-step instructions for publishing new versions to VS Code marketplace, helping the Community contribute |

| Performance monitoring and optimization | To Do | Performance | Extension response time tracked; no noticeable slowdown to VS Code | | Accessibility features | To Do | Accessibility | Support for screen readers, keyboard navigation, high contrast modes, alongside Localization for global reach | | Analytics and usage telemetry | To Do | Analytics | Understand how students use features and where they struggle most, informing Progress Tracking | | Customizable settings and preferences | To Do | User Experience | Students can adjust coaching intensity, notification frequency, display options | | Community feedback and issue reporting | To Do | Community | Students can report bugs or suggest improvements through the extension |

| Improve application logo | To Do | Design | Logo is professional, recognizable, and works at multiple sizes, consistent with the extension's Visual Theming |

| Multi-language and internationalization support | To Do | Localization | Extension available in multiple languages for global student base | | GitHub Classroom integration | To Do | Integration | Seamless connection with GitHub Classroom for assignment tracking, extending the Extension Development roadmap | | Offline mode support | To Do | Connectivity | Core coaching features work without internet connection while maintaining Performance | | Dark and light mode themes | To Do | Design | Extension respects system theme preference and offers both theme options | | Gamification and achievement badges | To Do | Motivation | Students earn badges and milestones to stay motivated and engaged, reinforcing Student Learning |

| Code injection protection and security audit | To Do | Security | Extension sanitizes inputs and prevents malicious code execution; security review completed as part of ongoing Extension Development |

## Updated Tasks

## Next Phase Tasks

_Upcoming work focusing on Data Management, Dashboard enhancement, and visual polish._

- **Auto-clear Data** — Implements automatic cleanup of old Error History
- **Reset Button — Gives students User Control** over their error data
- **Visual Theming — Aligns Dashboard with VS Code Theme aesthetic for seamless User Experience**

|   |   |   |
|---|---|---|
|Task|Status|Category|
|Auto-clear old error data|To Do|Data Management|
|Manual reset button for data|To Do|Data Management|
|Update dashboard visuals to match VS Code theme|To Do|Design|

## Progress Overview

```csv
Week,Completed,Remaining
Week 1,8,4
```

**Current Status:** 8 of 12 core tasks complete (67 percent). Next focus: dashboard and data persistence.

## Related documents

Error · UI & Visual · Coaching & Learning · Platform & Infrastructure · Document · Document