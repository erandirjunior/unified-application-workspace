<p align="center">
  <img src="./frontend/src/img/logo.png" width="680" alt="UAW Logo">
</p>

<p align="center">
  <strong>A unified workspace for testing, documenting, mocking and validate workflow applications.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.4-blueviolet">
  <img src="https://img.shields.io/badge/license-AGPL--3.0-green">
  <img src="https://img.shields.io/badge/frontend-React-61DAFB">
  <img src="https://img.shields.io/badge/backend-Go-00ADD8">
</p>

---

## Overview

UAW (**Unified Application Workspace**) is a platform designed to centralize application validation and automation in a single workspace.

Unlike traditional API clients, UAW combines:

- HTTP testing
- Load testing
- Stress testing
- Documentation
- Mock servers
- Workflow orchestration
- Assertions
- Dynamic variables
- Reports

allowing teams to build, validate and document their systems from a single place.

---

### If this project helped you, [please consider supporting its development](https://github.com/sponsors/erandirjunior?frequency=one-time&sponsor=erandirjunior).

--- 

# Run

Clone this repository or download the latest version. Then navigate to the project directory and run the following command:
```bash
# Linux
cp .env.example .env

# Cmd
copy .env.example .env

# PowerShell
Copy-Item .env.example .env
```

Next, run the following command if you have Docker installed:
```bash
docker compose up --build
```

Then, visit http://localhost:YOUR_PORT/ in your browser.

___

# Features

## ⚡ Actions

HTTP Actions are reusable units that can be executed individually or composed into workflows.

### Supported Methods

- GET
- POST
- PUT
- PATCH
- DELETE
- OPTIONS
- HEAD

### Authentication

- None
- Basic
- Bearer Token
- API Key

### Request Configuration

- Headers
- Body
  - JSON
  - XML
  - Form Data
  - URL Encoded
  - Raw Text
  - File Upload

### Assertions

Validate:

- HTTP status
- Headers
- Response body
- Values
- Expressions

Example:

```text
✓ Status == 200
✓ body.token exists
```

---

## 🚀 Load/Stress Testing

Built-in load/stress testing support.

Configuration:

- Requests per second mode
- Threads mode
- Duration
- Ramp-up

Metrics:

- Total requests
- Success
- Failures
- p50
- p90
- p99

---

## 📖 Documentation

Automatically generate API documentation.

Features:

- Request examples
- Response examples
- Multiple endpoints export
- HTML export
- PDF export

---

## 🔀 Workflows

Build complex execution flows.

### Features

- Sequential execution
- Variable sharing
- Delays
- Loops
- If / Else
- Multiple conditions
- Nested structures
- Flowchart visualization

Example:

```text
Authenticate
      ↓
User Active?
  ├── Yes
  │     ↓
  │  Create Order
  │     ↓
  │  Publish Event
  │
  └── No
        ↓
     Finish
```

---

## 🖥 Mock Servers

Create mock APIs for development and testing.

### Features

- Multiple mock servers
- Response validation
- File responses
- Logs
- Folder organization

---

## 🌎 Environments

Manage variables across environments.

Examples:

- Local
- Development
- Homolog
- Production

Example:

```text
base_url
token
username
password
```

---

## 🔄 Dynamic Variables

Examples:

```text
{{uuid}}
{{timestamp}}
{{random.email}}
{{random.number}}
{{today}}
```

---

## 📊 Reports

Execution reports include:

- Duration
- Success rate
- Errors
- Throughput
- p50
- p90
- p99

Detailed execution history:

- Request
- Response
- Headers
- Body

---

> **For more details about UAW resources, see the [Documentation](https://github.com/erandirjunior/unified-application-workspace/blob/master/docs/handbook.md) (English) or the [Documentação](https://github.com/erandirjunior/unified-application-workspace/blob/master/docs/manual.md) (Português).**

---

This project is licensed under the **AGPL-3.0** license.