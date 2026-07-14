import { useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { ensureLocalE2eKeyPair } from "../lib/e2e";

/** Ensures local ECDH keypair exists and public key is registered with the API. */
export function E2eKeyBootstrap() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { publicKey } = await ensureLocalE2eKeyPair(user.id);
        if (cancelled) return;
        await api("/e2e/keys", {
          method: "PUT",
          body: JSON.stringify({ publicKey }),
        });
      } catch {
        // Messaging surfaces key errors when sending/reading
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return null;
}
