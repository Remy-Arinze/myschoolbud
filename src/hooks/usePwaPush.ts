'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  useGetVapidPublicKeyQuery,
  useSubscribePushMutation,
} from '@/lib/store/api/notificationsApi';
import { unlockNotificationSound } from '@/lib/notifications/playNotificationSound';

export type EnablePushResult =
  | { ok: true }
  | { ok: false; reason: 'ssr' | 'unsupported' | 'no-vapid' | 'denied' | 'invalid-subscription' | 'push-service' | 'subscribe-failed' };

function urlBase64ToUint8Array(base64String: string) {
  const trimmed = base64String.trim();
  const padding = '='.repeat((4 - (trimmed.length % 4)) % 4);
  const base64 = (trimmed + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isAbortPushError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = 'name' in err ? String(err.name) : '';
  const message = 'message' in err ? String(err.message) : '';
  return name === 'AbortError' || /push service/i.test(message);
}

async function subscribeWithVapid(reg: ServiceWorkerRegistration, publicKey: string) {
  const applicationServerKey = urlBase64ToUint8Array(publicKey);
  if (applicationServerKey.byteLength !== 65 || applicationServerKey[0] !== 0x04) {
    throw new Error('invalid-vapid-key');
  }

  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
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

  const enablePush = useCallback(async (): Promise<EnablePushResult> => {
    if (typeof window === 'undefined') return { ok: false, reason: 'ssr' };
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { ok: false, reason: 'unsupported' };
    }

    const publicKey = vapidRes?.data?.publicKey?.trim();
    if (!publicKey) return { ok: false, reason: 'no-vapid' };

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return { ok: false, reason: 'denied' };
      unlockNotificationSound();

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        try {
          sub = await subscribeWithVapid(reg, publicKey);
        } catch (firstErr) {
          const stale = await reg.pushManager.getSubscription();
          if (stale) await stale.unsubscribe();
          try {
            sub = await subscribeWithVapid(reg, publicKey);
          } catch (retryErr) {
            if (isAbortPushError(firstErr) || isAbortPushError(retryErr)) {
              return { ok: false, reason: 'push-service' };
            }
            return { ok: false, reason: 'subscribe-failed' };
          }
        }
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

      return { ok: true };
    } catch (err) {
      if (isAbortPushError(err)) return { ok: false, reason: 'push-service' };
      return { ok: false, reason: 'subscribe-failed' };
    }
  }, [vapidRes?.data?.publicKey, subscribePush]);

  return {
    permission,
    ready,
    vapidConfigured: !!vapidRes?.data?.publicKey,
    enablePush,
  };
}
