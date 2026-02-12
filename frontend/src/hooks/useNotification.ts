import { useState, useCallback, useRef } from 'react'
import type { Notification, NotificationType } from '@/types'

let nextId = 0

export function useNotification() {
  const [notification, setNotification] = useState<Notification | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((message: string, type: NotificationType = 'info') => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const id = String(++nextId)
    setNotification({ id, message, type })

    timerRef.current = setTimeout(() => {
      setNotification(null)
    }, 6000)
  }, [])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setNotification(null)
  }, [])

  return { notification, show, hide }
}
