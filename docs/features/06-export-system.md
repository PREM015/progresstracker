# 📤 Export System

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

Users can export their ProgressTracker data in multiple formats. Exports are processed as background jobs via Trigger.dev and stored temporarily in Supabase Storage.

---

## 📄 Export Formats

| Format | Description | Plans |
|--------|-------------|-------|
| `CSV` | Spreadsheet data | All |
| `JSON` | Raw structured data | All |
| `PDF` | Formatted progress report | Pro+ |
| `EXCEL` | Excel workbook with sheets | Pro+ |

---

## 🔄 Export Flow

```
1. User clicks "Export Data"
2. POST /api/export {format: "CSV", dateRange: {from, to}}
3. ExportJob created in DB (status: QUEUED)
4. Trigger.dev job enqueued
5. Job processes: fetch data → generate file → upload to Supabase
6. ExportJob status updated to COMPLETED
7. User gets download link (valid 24 hours)
8. User downloads file
```

---

## 📊 What's Included in Export

| Data | CSV | JSON | PDF |
|------|-----|------|-----|
| Tracker entries | ✅ | ✅ | Summary |
| Platform stats | ✅ | ✅ | ✅ |
| Goals | ✅ | ✅ | ✅ |
| Achievements | ✅ | ✅ | ✅ |
| Streak history | ✅ | ✅ | ✅ |
| Daily stats | ✅ | ✅ | Charts |

---

## ⚡ Quick Start

```http
POST /api/export
Authorization: Bearer <token>
Content-Type: application/json

{
  "format": "CSV",
  "dateRange": {
    "from": "2026-01-01",
    "to": "2026-03-15"
  },
  "includeData": ["entries", "goals", "achievements"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "clxyz",
    "status": "QUEUED",
    "estimatedTime": "30 seconds"
  }
}
```

---

## 📎 Related Docs

- [Core Features](01-core-features-overview.md)
- [Deployment](../deployment/05-monitoring-setup.md)
