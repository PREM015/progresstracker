"use client"

import Button from "@/components/ui/Button"
import { PlatformCategory } from "@/types/platform"

const categories: { label: string; value: PlatformCategory | null }[] = [
  { label: "All", value: null },
  { label: "DSA", value: "dsa" },
  { label: "Jobs", value: "job" },
  { label: "Hackathons", value: "hackathon" },
  { label: "Git", value: "git" },
  { label: "Learning", value: "learning" },
  { label: "Open Source", value: "opensource" },
  { label: "Companies", value: "company" },
]

type Props = {
  selected: PlatformCategory | null
  onSelect: (category: PlatformCategory | null) => void
}

export default function CategoryFilter({ selected, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => {
        const active = selected === c.value

        return (
          <Button
            key={c.label}
            size="sm"
            variant={active ? "primary" : "outline"}
            onClick={() => onSelect(c.value)}
          >
            {c.label}
          </Button>
        )
      })}
    </div>
  )
}
