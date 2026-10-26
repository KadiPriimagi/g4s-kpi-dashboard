"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/dashboard/error-state";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-4">
      <ErrorState title="Something went wrong" message="This page could not be loaded. Please try again in a moment." />
      <div className="flex justify-center">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
