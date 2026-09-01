import { createRoot } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";

import { Index } from "./routes/index";
import "./styles.css";

const queryClient = new QueryClient();

const rootEl = document.getElementById("root");

if (!rootEl) {
  throw new Error("Élément racine introuvable");
}

// The Android build mounts the application directly. It deliberately avoids
// the SSR shell and router lifecycle, which are unnecessary in an offline APK
// and can block touch events in older Android WebViews.
createRoot(rootEl).render(
  <QueryClientProvider client={queryClient}>
    <Index />
  </QueryClientProvider>,
);

