"use client";

import { useCallback, useState } from "react";
import { OfflineQueuedError } from "@/lib/offline-queue";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  const show = useCallback((text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 4200);
  }, []);

  const fromError = useCallback((error: unknown, fallback = "השמירה נכשלה") => {
    if (error instanceof OfflineQueuedError) {
      show("אין רשת — הפעולה תישמר כשהחיבור יחזור");
      return;
    }
    const code = error instanceof Error ? error.message : "";
    const map: Record<string, string> = {
      invalid_password: "הסיסמה הנוכחית שגויה",
      email_taken: "האימייל כבר קיים במערכת",
      password_too_short: "הסיסמה חייבת 12 תווים לפחות",
      password_needs_letter: "הסיסמה חייבת לכלול אות",
      password_needs_number: "הסיסמה חייבת לכלול ספרה",
      too_many_requests: "יותר מדי ניסיונות. נסה שוב בעוד כמה דקות",
      unauthorized: "הסשן פג. היכנס שוב",
      forbidden: "אין הרשאה לפעולה הזו",
      order_conflict: "ההזמנה עודכנה במקום אחר. רענן ונסה שוב",
    };
    show(map[code] || fallback);
  }, [show]);

  const node = message ? (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        bottom: 22,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 80,
        background: "#1E2E2B",
        color: "#EDF3F1",
        padding: "11px 16px",
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 600,
        maxWidth: 420,
        textAlign: "center",
      }}
    >
      {message}
    </div>
  ) : null;

  return { show, fromError, node };
}
