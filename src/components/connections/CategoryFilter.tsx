"use client";

import Button  from "@/components/ui/Button";

const categories = [
  { name: "All", value: "ALL" },
  { name: "DSA", value: "DSA" },
  { name: "Development", value: "DEVELOPMENT" },
  { name: "Jobs", value: "JOBS" },
  { name: "Learning", value: "LEARNING" },
  { name: "Hackathons", value: "HACKATHONS" },
  { name: "Design", value: "DESIGN" },
];

export default function CategoryFilter() {
  const handleCategoryChange = (category: string) => {
    // This will be implemented with context or state management
    console.log("Selected category:", category);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <Button
          key={category.value}
          variant="outline"
          size="sm"
          onClick={() => handleCategoryChange(category.value)}
        >
          {category.name}
        </Button>
      ))}
    </div>
  );
}