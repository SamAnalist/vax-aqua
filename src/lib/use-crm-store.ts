"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { crmClient } from "@/lib/crm-client";
import { clearQueueKey, flushQueue, queuedCount, setQueueKey } from "@/lib/offline-queue";
import type { AppSettings, Bootstrap, Call, Customer, Order } from "@/types/crm";

type StoreData = {
  user: Bootstrap["user"];
  customers: Customer[];
  calls: Call[];
  settings: AppSettings;
  callsTruncated: boolean;
  callsCursor: string | null;
};

export function useStore() {
  const [data, setData] = useState<StoreData | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const boot = await crmClient.bootstrap();
    await setQueueKey(boot.queueKey);
    setData({
      user: boot.user,
      customers: boot.customers,
      calls: boot.calls,
      settings: boot.settings,
      callsTruncated: boot.callsTruncated,
      callsCursor: boot.callsTruncated ? boot.calls.at(-1)?.id ?? null : null,
    });
  }, []);

  useEffect(() => {
    let alive = true;
    load()
      .then(() => {
        if (alive) setReady(true);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "load_failed");
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [load]);

  useEffect(() => {
    const sync = () => {
      setOffline(typeof navigator !== "undefined" && !navigator.onLine);
      setPending(queuedCount());
    };
    sync();
    const onOnline = async () => {
      sync();
      const result = await flushQueue();
      sync();
      if (result.unauthorized) {
        clearQueueKey();
        setError("unauthorized");
        return;
      }
      try {
        await load();
      } catch {
        /* keep current */
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", sync);
    };
  }, [load]);

  const replaceCustomer = useCallback((customer: Customer) => {
    setData((prev) => {
      if (!prev) return prev;
      const exists = prev.customers.some((c) => c.id === customer.id);
      return {
        ...prev,
        customers: exists
          ? prev.customers.map((c) => (c.id === customer.id ? { ...c, ...customer, orders: customer.orders ?? c.orders } : c))
          : [...prev.customers, customer],
      };
    });
  }, []);

  const replaceCall = useCallback((call: Call) => {
    setData((prev) => {
      if (!prev) return prev;
      const exists = prev.calls.some((k) => k.id === call.id);
      const calls = exists
        ? prev.calls.map((k) => (k.id === call.id ? call : k))
        : [call, ...prev.calls];
      return { ...prev, calls: calls.sort((a, b) => b.at - a.at) };
    });
  }, []);

  const patchCustomerOrders = useCallback((customerId: string, mutate: (orders: Order[]) => Order[]) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === customerId ? { ...c, orders: mutate(c.orders || []) } : c,
        ),
      };
    });
  }, []);

  const addCall = useCallback(async (draft: Partial<Call> & { customerId: string; summary: string }) => {
    const created = await crmClient.createCall(draft);
    replaceCall(created);
    setPending(queuedCount());
    return created;
  }, [replaceCall]);

  const addNote = useCallback(async (callId: string, text: string, by?: string) => {
    const next = await crmClient.addNote(callId, text, by);
    replaceCall(next);
    return next;
  }, [replaceCall]);

  const toggleDone = useCallback(async (callId: string, nextDone: boolean) => {
    const next = await crmClient.updateCall(callId, { nextDone });
    replaceCall(next);
    return next;
  }, [replaceCall]);

  const removeCall = useCallback(async (callId: string) => {
    await crmClient.deleteCall(callId);
    setData((prev) => (prev ? { ...prev, calls: prev.calls.filter((k) => k.id !== callId) } : prev));
  }, []);

  const addCustomer = useCallback(async (draft: Partial<Customer>) => {
    const created = await crmClient.createCustomer(draft);
    replaceCustomer(created);
    return created;
  }, [replaceCustomer]);

  const updateCustomer = useCallback(async (customer: Customer) => {
    const next = await crmClient.updateCustomer(customer.id, customer);
    replaceCustomer(next);
    return next;
  }, [replaceCustomer]);

  const removeCustomer = useCallback(async (uuid: string) => {
    await crmClient.deleteCustomer(uuid);
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        customers: prev.customers.filter((c) => c.id !== uuid),
        calls: prev.calls.filter((k) => k.customerId !== uuid),
      };
    });
  }, []);

  const saveOrder = useCallback(async (customerId: string, order: Order) => {
    const saved = await crmClient.saveOrder(customerId, order);
    patchCustomerOrders(customerId, (orders) => {
      const exists = orders.some((o) => o.id === saved.id || o.id === order.id);
      const next = exists
        ? orders.map((o) => (o.id === saved.id || o.id === order.id ? saved : o))
        : [saved, ...orders];
      return next.sort((a, b) => b.at - a.at);
    });
    return saved;
  }, [patchCustomerOrders]);

  const removeOrder = useCallback(async (customerId: string, orderId: string) => {
    await crmClient.deleteOrder(orderId);
    patchCustomerOrders(customerId, (orders) => orders.filter((o) => o.id !== orderId));
  }, [patchCustomerOrders]);

  const ensureCustomer = useCallback(async (uuid: string) => {
    const current = data?.customers.find((c) => c.id === uuid);
    if (current && (current.orderCount ?? current.orders.length) <= current.orders.length) {
      return current;
    }
    const full = await crmClient.getCustomer(uuid);
    replaceCustomer(full);
    return full;
  }, [data, replaceCustomer]);

  const loadMoreCalls = useCallback(async () => {
    if (!data?.callsTruncated || !data.callsCursor) return;
    const page = await crmClient.listCalls(data.callsCursor);
    setData((prev) => {
      if (!prev) return prev;
      const seen = new Set(prev.calls.map((k) => k.id));
      const extra = page.calls.filter((k) => !seen.has(k.id));
      return {
        ...prev,
        calls: [...prev.calls, ...extra].sort((a, b) => b.at - a.at),
        callsCursor: page.nextCursor,
        callsTruncated: Boolean(page.nextCursor),
      };
    });
  }, [data]);

  const applyOutreach = useCallback(async (
    uuid: string,
    payload: { action: "send" | "confirmed" | "declined" | "noreply" | "done"; visitAt?: number },
  ) => {
    const result = await crmClient.applyOutreach(uuid, payload);
    setData((prev) => {
      if (!prev) return prev;
      const others = prev.calls.filter((k) => k.customerId !== uuid);
      return {
        ...prev,
        customers: prev.customers.map((c) => (c.id === uuid ? result.customer : c)),
        calls: [...result.calls, ...others].sort((a, b) => b.at - a.at),
      };
    });
    return result.customer;
  }, []);

  const setSettings = useCallback((settings: AppSettings) => {
    setData((prev) => (prev ? { ...prev, settings } : prev));
    if (settingsTimer.current) clearTimeout(settingsTimer.current);
    return new Promise<void>((resolve, reject) => {
      settingsTimer.current = setTimeout(() => {
        crmClient
          .saveSettings(settings)
          .then((saved) => {
            setData((prev) => (prev ? { ...prev, settings: saved } : prev));
            resolve();
          })
          .catch(reject);
      }, 400);
    });
  }, []);

  return {
    data,
    ready,
    error,
    offline,
    pending,
    addCall,
    addNote,
    toggleDone,
    removeCall,
    addCustomer,
    updateCustomer,
    removeCustomer,
    saveOrder,
    removeOrder,
    applyOutreach,
    ensureCustomer,
    loadMoreCalls,
    setSettings,
  };
}
