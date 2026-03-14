"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Download, FileJson, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

const FORMATS = [
  { value: "json", label: "JSON", icon: <FileJson className="w-5 h-5 text-indigo-500" />, desc: "Machine-readable format, good for developers" },
  { value: "csv", label: "CSV", icon: <FileText className="w-5 h-5 text-emerald-500" />, desc: "Spreadsheet compatible format" },
];

const INCLUDES = [
  "Profile information",
  "All goals and progress",
  "Achievement history",
  "Platform connections and stats",
  "Activity timeline",
  "Settings and preferences",
];

export default function ExportDataPage() {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("json");

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/user/export-data", {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Export failed");
      }

      const data = await res.json();

      // Download as JSON/CSV file
      let content: string;
      let mimeType: string;
      let extension: string;

      if (exportFormat === "csv") {
        // Convert flat user data to CSV
        const rows = Object.entries(data?.data || {}).map(([k, v]) => [k, JSON.stringify(v)]);
        content = ["Key,Value", ...rows.map((r) => r.join(","))].join("\n");
        mimeType = "text/csv";
        extension = "csv";
      } else {
        content = JSON.stringify(data?.data || data, null, 2);
        mimeType = "application/json";
        extension = "json";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `progresstracker-data.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Your data export is ready and downloading.");
    } catch (err: any) {
      toast.error(err?.message || "Export failed. Please try again.");
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <GlassCard className="p-8 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Download className="w-5 h-5 text-indigo-500" />
          <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter">
            Export Your Data
          </h3>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">GDPR</p>
      </div>

      <p className="text-sm text-zinc-500 font-medium -mt-4">
        Download a complete copy of all your data. You have the right to your data.
      </p>

      {/* Format Selection */}
      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
          Export Format
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FORMATS.map((fmt) => (
            <button
              key={fmt.value}
              onClick={() => setExportFormat(fmt.value)}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                exportFormat === fmt.value
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/5"
                  : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
              }`}
            >
              {fmt.icon}
              <div>
                <div className="font-bold text-sm text-zinc-900 dark:text-zinc-50">{fmt.label}</div>
                <div className="text-xs text-zinc-500 font-medium mt-0.5">{fmt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* What's included */}
      <div className="p-4 bg-zinc-50/60 dark:bg-zinc-800/30 rounded-xl border border-zinc-100 dark:border-zinc-800">
        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-3">
          What's Included
        </h4>
        <ul className="space-y-1.5">
          {INCLUDES.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
              <span className="text-emerald-500 text-xs">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {exporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparing Export...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Download My Data ({exportFormat.toUpperCase()})
          </>
        )}
      </button>
    </GlassCard>
  );
}
