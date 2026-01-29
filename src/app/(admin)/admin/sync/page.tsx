/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/(admin)/admin/sync/page.tsx
"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Filter,
  Search,
  MoreVertical,
  Eye,
  RotateCcw,
  Trash2,
} from "lucide-react";

const syncJobs = [
  {
    id: 1,
    platform: "LeetCode",
    user: "John Doe",
    status: "completed",
    startedAt: "2024-01-15 10:30:00",
    completedAt: "2024-01-15 10:30:45",
    duration: "45s",
    itemsSynced: 25,
    errors: 0,
  },
  {
    id: 2,
    platform: "GitHub",
    user: "Jane Smith",
    status: "in_progress",
    startedAt: "2024-01-15 10:35:00",
    completedAt: null,
    duration: "Running...",
    itemsSynced: 142,
    errors: 0,
  },
  {
    id: 3,
    platform: "HackerRank",
    user: "Bob Wilson",
    status: "failed",
    startedAt: "2024-01-15 10:20:00",
    completedAt: "2024-01-15 10:20:12",
    duration: "12s",
    itemsSynced: 0,
    errors: 1,
  },
  {
    id: 4,
    platform: "Codeforces",
    user: "Alice Brown",
    status: "completed",
    startedAt: "2024-01-15 10:25:00",
    completedAt: "2024-01-15 10:26:30",
    duration: "1m 30s",
    itemsSynced: 89,
    errors: 0,
  },
  {
    id: 5,
    platform: "CodeChef",
    user: "Charlie Davis",
    status: "pending",
    startedAt: null,
    completedAt: null,
    duration: "-",
    itemsSynced: 0,
    errors: 0,
  },
];

const Sync  = () => { 
  const [jobs, setJobs] = useState(syncJobs);     
  


};

export default Sync;  