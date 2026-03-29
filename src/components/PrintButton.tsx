"use client";

import Button from "@/components/ui/Button";

export default function PrintButton() {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => window.print()}
      className="print:hidden"
    >
      Print
    </Button>
  );
}
