# Unified Application Workspace — User Manual

## Overview

Unified Application Workspace is a comprehensive tool for API development, testing, and documentation. It combines load testing, automation workflows, a mock server, and documentation generation into a single interface.

---

## 1. Collections

### What are Collections?

Collections are containers that group your requests (actions), workflows, and mocks. Each collection has its own set of environment variables.

### Managing Collections

- **Create**: Click "New Collection" on the main dashboard and provide a name.
- **Import**: Import an existing collection via JSON file.
- **Export**: Export the entire collection (or selected items) to JSON.
- **Rename**: Click the collection name on the dashboard to edit it.
- **Reorder**: Use the ↑ ↓ arrows to rearrange the collection order.
- **Delete**: The delete button removes the collection and all its contents.

### Navigation

Click "Manage Collection →" to enter the collection workspace, where you can access the Actions, Workflow, and Mocks tabs.

---

## 2. Actions (HTTP Requests)

### Creating an Action

1. Inside a collection, click the **"+ Action"** button in the sidebar.
2. Fill in: Method (GET, POST, PUT, DELETE, PATCH), URL, and name.
3. The action appears in the left sidebar.

### Organization

- **Folders**: Create folders to group actions. Drag actions between folders via drag-and-drop.
- **Reorder**: Use ↑ ↓ arrows or drag-and-drop in the sidebar.
- **Search**: Use the search field to filter actions by name or URL.

### Import via cURL

Click **"cURL"** in the sidebar and paste a full cURL command. The system automatically extracts the method, URL, headers, body, and authentication.

---

## 3. Request Configuration

### URL and Method

Select the HTTP method and enter the URL. Supports environment variables with the `{{variable}}` syntax.

### Headers

Add headers in key-value format. Authentication headers are automatically injected based on the configured auth type.

### Authentication

Supported types:
- **Bearer Token**: Automatically inserts `Authorization: Bearer <token>`.
- **Basic Auth**: Encodes username:password in Base64.
- **API Key**: Adds a custom header with the key/value.

### Body (Request Body)

Supported body types:
- **JSON**: Editor with auto-formatting and field synchronization.
- **Form Data**: Key-value fields with file upload support.
- **XML**: Free text editor.
- **Form URL Encoded**: Key=value pairs.
- **Plain Text**: Free text.
- **Binary File**: File upload.

### Assertions (Validations)

Add validations that are automatically checked after each execution:
- **Source**: Status, Body, or Header.
- **Operators**: ==, !=, contains, exists, not_exists, >, >=, <, <=.
- **Property**: JSON path (e.g., `user.id`), header name, etc.

### Extractions (Variables)

Extract values from the response and save them as variables for use in subsequent requests:
- **Source**: Body or Header.
- **Property**: JSON path or header name.
- **Variable Name**: The name used to reference it with `{{varName}}`.

---

## 4. Load Testing

### Configuration

- **Requests Per Second (RPS)**: How many requests per second will be fired.
- **Duration**: Total test time in seconds.
- **Ramp-up**: Gradual warm-up time (starts slow and increases to target RPS).

### Execution

Click **"RUN TEST"** to start. The execution panel (on the right) shows in real time:
- Log of each request with status, response time, and body.
- Active threads chart.
- Success/error counters.

### Stop Test

Click **"Stop Test"** to abort immediately. A partial report is generated.

### Single Run

Execute a request once for quick validation without load.

---

## 5. Workflows

### What are Workflows?

Workflows allow you to chain multiple requests in sequence, with support for:
- **Sequential Execution**: Steps executed one after another.
- **Parallel Execution**: A group of requests fired simultaneously.
- **Loops**: Repeats steps while a condition is true.
- **Conditions (If/Else)**: Executes different branches based on conditions.
- **Wait (Pause)**: Waits N seconds between steps.

### Creating a Workflow

1. In the **Workflow** tab, click **"+ New Workflow"**.
2. Use the toolbox panel on the left to add steps.
3. Configure each step by clicking **"Edit →"**.

### Step Types

| Type | Description |
|------|-------------|
| Action | Individual HTTP request with load configuration |
| Parallel | Group of requests executed at the same time |
| Loop | Repeats inner steps while condition is true |
| If/Else | Conditional branching based on previous response |
| Wait | Pauses for N seconds |
| Copy | Copies an existing action from the collection |

### Conditions (Loop and If/Else)

Configure conditions based on:
- **Status**: HTTP status code of the last response.
- **Body**: Value of a JSON field from the response.
- **Header**: Value of a response header.
- **Variable**: Value of an extracted variable.

Operators: ==, !=, contains, exists, not_exists, >, >=, <, <=.

Combine multiple conditions with **AND** or **OR** logic.

### Drill-Down Navigation

Click **"Edit →"** on a group (Parallel, Loop) to navigate inside and manage its sub-steps. Use the breadcrumb to go back.

### Views

- **List**: Sequential view of steps with reorder/edit/delete actions.
- **Flowchart**: Visual SVG representation with draggable nodes.

### Running a Workflow

Click the workflow's run button. All steps are sent to the backend, which orchestrates the full execution and returns results via streaming.

---

## 6. Mock Server

### What is it?

The Mock Server lets you simulate API endpoints locally, useful for:
- Frontend development without a real backend.
- Integration testing with controlled responses.
- Simulating error scenarios.

### Creating a Mock

1. In the **Mocks** tab, click **"+ New Mock"**.
2. Configure: Path (e.g., `/api/v1/users/:id`), Method, Status, Response Body.
3. Activate the mock with the toggle.

### Features

- **Dynamic Path Params**: Use `:param` in the path (e.g., `/users/:id`). The captured value can be used in the body with `{{id}}`.
- **Delay**: Configure a delay in milliseconds before responding.
- **Request Validation**: Add assertions to validate incoming request headers/body.
- **File Response**: Return binary files as a response.
- **Custom Headers**: Configure response headers.

### Accessing Mocks

Mocks are available at `http://localhost:8080/mock/{path}`.

### Live Monitoring

Track incoming requests to the mock in real time with full request/response details.

---

## 7. Environments and Variables

### Managing Environments

1. Click **"Environment"** in the collection header.
2. Create multiple environments (e.g., Local, Staging, Production).
3. Add key-value variables to each environment.

### Using Variables

Use the `{{variable_name}}` syntax in any field:
- URLs: `{{base_url}}/api/users`
- Headers: `Authorization: Bearer {{token}}`
- Body: `{"user": "{{username}}"}`

### Dynamic Variables (Templates)

The backend supports special auto-generated variables:
- `{{uuid}}` — Random UUID v4.
- `{{timestamp}}` — Current Unix timestamp.
- `{{date}}`, `{{time}}`, `{{datetime}}` — Formatted date/time.
- `{{int:min:max}}` — Random integer in range.
- `{{float:min:max}}` — Random float.
- `{{string:length}}` — Random string.
- `{{name}}` — Random name.
- `{{tel:format}}` — Phone number in specified format.

### Extracted Variables

Variables extracted via Extractions are available for subsequent requests within the same workflow.

---

## 8. Documentation

### Per-Action Documentation

Each action has documentation fields:
- **General Documentation**: Free text with Markdown support.
- **Authentication**: Description of how to obtain credentials.
- **Path Parameters**: Table with parameter, description, required flag, and example.
- **Headers**: Table with key, description, required flag, and example.
- **Body**: Schema description + field table with type, description, and example.
- **Responses**: Multiple documented responses with status, body, and data dictionary.

### View Modes

- **Preview**: Formatted documentation view (read-only).
- **Editor**: Full form for editing all fields.

### Auto-Sync

- **Sync from Body**: Click "↓" to automatically extract fields from JSON/XML into the documentation table.
- **Auto Responses**: When executing a request, the response is automatically saved to the documentation.

---

## 9. Unified Documentation Report

### Access

In the Actions tab, with no request open, click **"Generate Documentation Report"** in the center of the screen.

### Features

1. **Selection**: Choose which actions to include in the report via checkboxes. Use "All/None" for quick selection.
2. **Ordering**: Drag items in the "Report Order" section or use ↑ ↓ arrows.
3. **Title**: Edit the report title in the header.
4. **Preview**: The right panel shows the rendered documentation in real time.
5. **Export HTML**: Generates a standalone HTML file with full styling.
6. **Export PDF**: Opens the documentation in a new window with a print dialog (save as PDF).

---

## 10. Interface

### Themes

Toggle between **Light** and **Dark** theme by clicking the 🌙/☀️ icon in the header.

### Languages

Select **BR** (Portuguese) or **EN** (English) in the header dropdown.

### Layout

The collection workspace uses a 3-column layout:
1. **Left sidebar** (320px): Navigation between actions/workflows/mocks.
2. **Center area**: Request editor or empty state.
3. **Right panel**: Documentation or Execution (resizable, minimizable, maximizable).

### Navigation

- Click the **logo** to return to the collections dashboard.
- Use the **breadcrumb** inside workflows to navigate between levels.
- The **search field** in the sidebar filters items at all levels (including inside folders).

---

## 11. Data Persistence

Data is stored locally in the browser via **IndexedDB**, supporting hundreds of MB of data. On first use after an update, existing data in localStorage is automatically migrated.

### Backup

Use the **Export Collection** feature to create JSON backups that can be reimported at any time.

---

## 12. Technical Architecture

### Frontend
- React 18 + Vite
- TailwindCSS
- Backend communication via fetch + NDJSON streaming

### Backend
- Go (Golang)
- Native HTTP server (net/http)
- Concurrent execution with goroutines
- Result streaming via chunked transfer encoding

### Docker
- `docker-compose up` starts frontend (port 3000) and backend (port 8080)
- Mapped volumes for hot-reload in development

---

## 13. Tips and Shortcuts

- **Drag-and-drop**: Drag actions between folders in the sidebar.
- **Double-click** a folder name to rename it.
- **Environment variables** are resolved in real time in the documentation preview.
- **Captured responses** automatically feed the data dictionary.
- **Workflows** support individual load configuration per step.
- The **Mock Server** supports regex in paths via dynamic parameters.
