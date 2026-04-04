'use client';

import React, { useState } from 'react';
import { Download, FileJson, FileText, FileBarChart, ShieldCheck, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const ExportPage = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 5000);
    }, 2000);
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Export Data</h1>
          <p className="text-muted-foreground">
            Download your data for backup, analysis, or portability.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <GlassCard className="p-6 space-y-4 md:col-span-2">
           <div className="flex items-center justify-between">
             <h3 className="font-semibold text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Select Data to Export
             </h3>
             <Button variant="link" size="sm" className="h-auto p-0">Select All</Button>
           </div>
           
           <div className="grid gap-4 pt-4">
              {[
                { id: 'goals', label: 'All Goals & Milestones', description: 'Includes titles, status, and deadlines.' },
                { id: 'progress', label: 'Progress History', description: 'Detailed log of your activity and updates.' },
                { id: 'platforms', label: 'Connected Platform Data', description: 'Cached data from GitHub, LeetCode, etc.' },
                { id: 'achievements', label: 'Achievements & Badges', description: 'Metadata for all earned rewards.' },
                { id: 'settings', label: 'User Preferences', description: 'Profile and notification settings.' }
              ].map((item) => (
                <div key={item.id} className="flex items-start space-x-3 space-y-0 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <Checkbox id={item.id} defaultChecked />
                  <div className="grid gap-1 leading-none">
                    <Label htmlFor={item.id} className="font-medium">{item.label}</Label>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
           </div>
        </GlassCard>

        <div className="space-y-6">
           <GlassCard className="p-6 space-y-4 bg-primary/5 border-primary/20">
              <h3 className="font-semibold">Format & Interval</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select defaultValue="json">
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Choose format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">
                        <div className="flex items-center gap-2">
                          <FileJson className="h-4 w-4" />
                          <span>JSON (Full Data)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="csv">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>CSV (Spreadsheet)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pdf">
                        <div className="flex items-center gap-2">
                          <FileBarChart className="h-4 w-4" />
                          <span>PDF Report</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time Range</Label>
                  <Select defaultValue="all">
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Choose range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="last-month">Last 30 Days</SelectItem>
                      <SelectItem value="last-year">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="pt-4">
                  <Button 
                    className="w-full h-12 text-lg font-semibold gap-2" 
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : exportComplete ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        Exported!
                      </>
                    ) : (
                      <>
                        <Download className="h-5 w-5" />
                        Export Data
                      </>
                    )}
                  </Button>
                </div>
              </div>
           </GlassCard>

           <GlassCard className="p-4 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Recent Exports</span>
              </div>
              <ul className="space-y-2">
                 <li className="flex items-center justify-between text-xs">
                    <span className="truncate max-w-[120px]">export_march_2026.json</span>
                    <Badge variant="outline" className="text-[10px] h-4">March 28</Badge>
                 </li>
                 <li className="flex items-center justify-between text-xs">
                    <span className="truncate max-w-[120px]">annual_report_2025.pdf</span>
                    <Badge variant="outline" className="text-[10px] h-4">Jan 02</Badge>
                 </li>
              </ul>
           </GlassCard>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
         <div className="flex gap-3">
           <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
           <div className="space-y-1">
             <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-400">Privacy Warning</h4>
             <p className="text-sm text-amber-700 dark:text-amber-500/80 leading-relaxed">
               Your export contains sensitive personal information, including connected API keys metadata and contact info. 
               Keep these files secure and do not share them with unauthorized parties.
             </p>
           </div>
         </div>
      </div>
    </div>
  );
};

export default ExportPage;
