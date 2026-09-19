// src/lib/orpc.ts  — no more dynamic import, no more import.meta.env.SSR
import { router } from "@/server/root";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";

declare global {
  var $client: RouterClient<typeof router> | undefined;
}

const link = new RPCLink({
  url: "/api/rpc",
  origin: () => {
    if (typeof window === "undefined") {
      throw new Error("This link is not allowed on the server side.");
    }
    return window.location.origin;
  },
});

export const client: RouterClient<typeof router> =
  globalThis.$client ?? createORPCClient(link);
