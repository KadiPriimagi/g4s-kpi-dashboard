import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in · G4S Marketing KPI Dashboard" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">G4S Eesti</h1>
              <p className="text-sm text-muted-foreground">Marketing KPI Dashboard</p>
            </div>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
          <p className="mt-6 text-center text-xs text-muted-foreground">Demo data only — no real company data.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
