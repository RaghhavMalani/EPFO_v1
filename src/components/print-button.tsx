"use client";

import { PrinterIcon } from "@phosphor-icons/react";
import { buttonClassName } from "@/components/ui";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClassName("secondary")}>
      <PrinterIcon size={16} aria-hidden="true" />
      {label}
    </button>
  );
}
