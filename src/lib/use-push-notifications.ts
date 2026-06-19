"use client";

import { useState, useEffect, useCallback } from "react";

type PushStatus = "unsupported" | "default" | "granted" | "denied" | "subscribed";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Manages the full push notification lifecycle: service worker registration,
 * permission requests, and subscribing/unsubscribing with the backend.
 *
 * Deliberately does NOT request permission automatically on mount — that's
 * a well-documented bad practice that gets notifications auto-denied by
 * browsers and annoys people. The component using this hook should call
 * `subscribe()` from a real button click, after explaining the value.
 */
export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        setStatus("subscribed");
      } else {
        setStatus(Notification.permission as PushStatus);
      }
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (status === "unsupported") return false;
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission as PushStatus);
        setLoading(false);
        return false;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set — push notifications can't work without it.");
        setLoading(false);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const res = await fetch("/api/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!res.ok) {
        // Subscription succeeded in the browser but we couldn't save it
        // server-side (e.g. not signed in) — undo the browser subscription
        // so we don't leave an orphaned one the user can't manage.
        await subscription.unsubscribe();
        setStatus("granted");
        setLoading(false);
        return false;
      }

      setStatus("subscribed");
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Push subscription failed:", err);
      setLoading(false);
      return false;
    }
  }, [status]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch(`/api/push-subscription?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: "DELETE",
        }).catch(() => {});
        await subscription.unsubscribe();
      }
      setStatus(Notification.permission as PushStatus);
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
    }
    setLoading(false);
  }, []);

  return { status, loading, subscribe, unsubscribe };
}
