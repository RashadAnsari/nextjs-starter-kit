"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { XCircleIcon } from "@heroicons/react/20/solid";

interface ErrorBannerProps {
  message: string | null;
  onHide: () => void;
  duration?: number;
}

/** Form-level error, placed just above the <form>. Auto-dismisses. */
export function ErrorBanner({ message, onHide, duration = 6000 }: ErrorBannerProps) {
  const onHideRef = useRef(onHide);
  useLayoutEffect(() => {
    onHideRef.current = onHide;
  });

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = setTimeout(() => onHideRef.current(), duration);
    return () => clearTimeout(timer);
  }, [message, duration]);

  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-6 bg-[var(--red-light)] text-[var(--red)] border border-[var(--red)]"
    >
      <XCircleIcon className="w-4 h-4 flex-shrink-0" />
      {message}
    </div>
  );
}
