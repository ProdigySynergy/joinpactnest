import { webcrypto } from "crypto";
import { describe, expect, it } from "vitest";
import { p256 } from "@noble/curves/nist.js";
import { gcm } from "@noble/ciphers/aes.js";
import {
  ecdhAesKey,
  privateRawToPkcs8,
  publicRawToSpki,
  spkiToPublicRaw,
} from "./e2e-crypto";

describe("e2e crypto wire format", () => {
  it("exports PKCS8/SPKI that Web Crypto can import", async () => {
    const { secretKey, publicKey } = p256.keygen();
    const pubU = p256.Point.fromBytes(publicKey).toBytes(false);
    const pkcs8 = privateRawToPkcs8(secretKey, pubU);
    const spki = publicRawToSpki(pubU);

    const priv = await webcrypto.subtle.importKey(
      "pkcs8",
      pkcs8,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey"]
    );
    const pub = await webcrypto.subtle.importKey(
      "spki",
      spki,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      []
    );
    expect(priv.type).toBe("private");
    expect(pub.type).toBe("public");
  });

  it("decrypts ciphertext produced with Web Crypto ECDH+AES-GCM", async () => {
    const noble = p256.keygen();
    const pubU = p256.Point.fromBytes(noble.publicKey).toBytes(false);
    const spki = publicRawToSpki(pubU);

    const webPair = await webcrypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey"]
    );
    const theirSpki = new Uint8Array(await webcrypto.subtle.exportKey("spki", webPair.publicKey));
    const theirPubRaw = spkiToPublicRaw(theirSpki);

    const aesWeb = await webcrypto.subtle.deriveKey(
      {
        name: "ECDH",
        public: await webcrypto.subtle.importKey(
          "spki",
          spki,
          { name: "ECDH", namedCurve: "P-256" },
          true,
          []
        ),
      },
      webPair.privateKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(
      await webcrypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        aesWeb,
        new TextEncoder().encode("hello from web")
      )
    );

    const key = ecdhAesKey(noble.secretKey, theirPubRaw);
    const pt = new TextDecoder().decode(gcm(key, iv).decrypt(ct));
    expect(pt).toBe("hello from web");
  });
});
