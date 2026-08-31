'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  useGetVapidPublicKeyQuery,
  useSubscribePushMutation,
} from '@/lib/store/api/notificationsApi';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers the Agora service worker and Web Push subscription.
 */
export function usePwaPush(enabled: boolean) {
  const { data: vapidRes } = useGetVapidPublicKeyQuery(undefined, { skip: !enabled });
  const [subscribePush] = useSubscribePushMutation();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        if (!cancelled) setReady(!!reg);
      } catch {
        // SW registration failed (e.g. insecure origin)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const enablePush = useCallback(async () => {
    if (typeof window === 'undefined') return { ok: false, reason: 'ssr' };
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { ok: false, reason: 'unsupported' };
    }

    const publicKey = vapidRes?.data?.publicKey;
    if (!publicKey) return { ok: false, reason: 'no-vapid' };

    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== 'granted') return { ok: false, reason: 'denied' };

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, reason: 'invalid-subscription' };
    }

    await subscribePush({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      userAgent: navigator.userAgent,
    }).unwrap();

    return { ok: true as const };
  }, [vapidRes?.data?.publicKey, subscribePush]);

  return {
    permission,
    ready,
    vapidConfigured: !!vapidRes?.data?.publicKey,
    enablePush,
  };
}
