# UAW - Unified Application Workspace

<p align="center">
  <img src="./frontend/src/img/logo.png" width="680" alt="UAW Logo">
</p>

<p align="center">
  <strong>A unified workspace for testing, documenting, mocking and automating applications.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blueviolet">
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
- Documentation
- Mock servers
- Workflow orchestration
- Assertions
- Dynamic variables
- Reports

allowing teams to build, validate and document their systems from a single place.

---

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

## 🚀 Load Testing

Built-in load testing support.

Configuration:

- Requests per second
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

# Project Structure

```text
Collection
│
├── Actions
│   └── HTTP Requests
│
├── Workflows
│
└── Mock Servers
```

---

# UI

UAW provides a multi-column workspace:

```text
┌─────────────┬─────────────────────────┬─────────────────────┐
│ Explorer    │ Editor                  │ Execution           │
│             │                         │ Documentation       │
│ Actions     │ HTTP Request            │ Reports             │
│ Workflows   │ Workflow                │                     │
│ Mock Servers│ Mock Server             │                     │
└─────────────┴─────────────────────────┴─────────────────────┘
```

The execution panel can be expanded or collapsed for a better editing experience.

---

# Technology Stack

### Frontend

- React
- TypeScript
- Material UI

### Backend

- Go

### Containerization

- Docker

---

# Vision

UAW aims to become a unified platform for application automation and validation.

Future Actions:

- HTTP

---

> **To see all resources with more details on UAW resources visit: [Documentaion](https://github.com/erandirjunior/unified-application-workspace/blob/master/docs/handbook.md) or [Documentação](https://github.com/erandirjunior/unified-application-workspace/blob/master/docs/manual.md).**

---

# Why UAW?

UAW brings together capabilities usually spread across multiple tools:

| Feature | UAW |
|-----------|-----|
| HTTP Client | ✅ |
| Load Testing | ✅ |
| Documentation | ✅ |
| Mock Servers | ✅ |
| Workflows | ✅ |
| Assertions | ✅ |
| Dynamic Variables | ✅ |
| Reports | ✅ |

---

# License

This project is licensed under the **AGPL-3.0** license.

---

<p align="center">
Unified Application Workspace

Build. Test. Mock. Automate.
</p>