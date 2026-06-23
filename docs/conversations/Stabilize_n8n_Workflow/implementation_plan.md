# Implementation Plan - Calendar Expansion and Task Sync Fix

The goal is to improve the visual layout of the operations calendar in the Task Manager and resolve the issue where Google Tasks are not visible in the web application's embedded calendar.

## User Review Required

> [!IMPORTANT]
> **Diagnostic Finding**: The n8n workflow is currently creating Google Calendar **Events**, not native Google **Tasks**. 
> - **Visibility Issue**: Standard Google Calendar embeds (like the one in the web app) do **not** support displaying native Google Tasks.
> - **Horizontal Expansion**: Changing the calendar mode to `WEEK` will provide the requested horizontal expansion.

I will:
1.  Change the calendar display mode to `WEEK` for better horizontal expansion.
2.  Explain to the user that native Google Tasks are not supported in embeds, but items created via the web app ARE events and should be visible.
3.  Ensure the `iframe` is configured to correctly show the primary calendar where events are created.

## Proposed Changes

### Dashboard Layout
#### [MODIFY] [style.css](file:///c:/Users/Cristian/.gemini/antigravity/crm%20cannabis/style.css)
- Set `html` and `body` to `height: 100%; overflow: hidden;` to prevent the outer scrollbar.
- Ensure `.app-container` and `.main-content` correctly handle the inner scroll.

#### [MODIFY] [index.html](file:///c:/Users/Cristian/.gemini/antigravity/crm%20cannabis/index.html)
- Remove the redundant `</div>` tag that may be causing layout issues.

### Task Logic (Optional/Verification)
#### [MODIFY] [main.js](file:///c:/Users/Cristian/.gemini/antigravity/crm%20cannabis/main.js) (If needed)
- Ensure the payload sent to n8n is correctly formatted for Google Calendar Events.

## Verification Plan

### Manual Verification
1.  Open the web app and navigate to the "Gestor de Tareas".
2.  Verify the calendar is now in "Week" view, which expands horizontally.
3.  Create a "Tarea" via the UI and check if it appears in the embedded calendar.
4.  (User Step) Check if mobile events are now visible in the web app.

### Automated Verification
1.  Use the `browser_subagent` to view `tareas.html` and confirm the `iframe` URL has changed.
2.  Check the server logs to see if the n8n webhook is receiving the correct payload.
