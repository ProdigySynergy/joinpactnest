"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { E2eKeyBootstrap } from "@/components/E2eKeyBootstrap";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <E2eKeyBootstrap />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
