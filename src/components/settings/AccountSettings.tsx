"use client";

import  Button  from "@/components/ui/Button";

export default function AccountSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Account Management
        </h3>
        <div className="space-y-4">
          <Button variant="outline">Change Password</Button>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <Button variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}