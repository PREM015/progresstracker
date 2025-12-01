"use client";

import  Button  from "@/components/ui/Button";
import  Input  from "@/components/ui/Input";

export default function ProfileSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Profile Information
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name
            </label>
            <Input type="text" placeholder="Your name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <Input type="email" placeholder="your@email.com" />
          </div>
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}