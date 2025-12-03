// src/hooks/useNotifications.ts

import { useNotificationContext } from '@/context/NotificationContext';

export function useNotifications() {
  return useNotificationContext();
}