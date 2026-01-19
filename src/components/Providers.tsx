"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";

type ProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function Provider({ children, ...props }: ProviderProps) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider refetchOnWindowFocus={false}>
        <NextThemesProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          {...props}
        >
          {children}
        </NextThemesProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
