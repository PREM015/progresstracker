'use client';

interface PlatformColumnProps {
  platform?: string;
  isEditing?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

export function PlatformColumn({
  platform,
  isEditing = false,
  value = '',
  onChange,
}: PlatformColumnProps) {
  const getPlatformColor = (platformName?: string) => {
    if (!platformName) return 'bg-gray-100 text-gray-800';

    const colors: Record<string, string> = {
      leetcode: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      codeforces: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      codechef: 'bg-brown-100 text-brown-800 dark:bg-brown-900 dark:text-brown-200',
      hackerrank: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      github: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      linkedin: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    };

    return colors[platformName.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (isEditing) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
        placeholder="Platform name"
      />
    );
  }

  if (!platform) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlatformColor(
        platform
      )}`}
    >
      {platform}
    </span>
  );
}