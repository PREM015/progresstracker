"use client"

import { useState } from "react"
import Modal from "@/components/ui/Modal"
import Input from "@/components/ui/Input"
import Button from "@/components/ui/Button"
import Select from "@/components/ui/Select"

interface AddCustomPlatformProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (platform: any) => Promise<void>
}

export default function AddCustomPlatform({ isOpen, onClose, onAdd }: AddCustomPlatformProps) {
  const [name, setName] = useState("")
  const [category, setCategory] = useState("dsa")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await onAdd({ name, category })
      setName("")
      setCategory("dsa")
      onClose()
    } catch (error) {
      alert("Failed to add custom platform")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Custom Platform">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Platform Name</label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., My Custom Platform"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="dsa">DSA</option>
            <option value="job">Jobs</option>
            <option value="hackathon">Hackathons</option>
            <option value="git">Git</option>
            <option value="learning">Learning</option>
            <option value="opensource">Open Source</option>
            <option value="company">Company</option>
          </Select>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Adding..." : "Add Platform"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}