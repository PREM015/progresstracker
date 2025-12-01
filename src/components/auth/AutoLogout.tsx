"use client"

import { useEffect } from "react"
import { signOut, useSession } from "next-auth/react"

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes in milliseconds

export default function AutoLogout() {
  const { data: session } = useSession()

  useEffect(() => {
    if (!session) return

    let timeout: NodeJS.Timeout

    const resetTimer = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        signOut({ callbackUrl: "/login" })
      }, INACTIVITY_TIMEOUT)
    }

    // Events that reset the timer
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"]

    events.forEach((event) => {
      globalThis.addEventListener(event, resetTimer)
    })

    resetTimer() // Start timer

    return () => {
      clearTimeout(timeout)
      events.forEach((event) => {
        globalThis.removeEventListener(event, resetTimer)
      })
    }
  }, [session])

  return null
}