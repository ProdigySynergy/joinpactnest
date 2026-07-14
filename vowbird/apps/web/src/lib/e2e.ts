/**
 * Client-side E2E crypto (Web Crypto).
 * Private keys stay in localStorage; only public keys + ciphertext hit the API.
 */

const STORAGE_PREFIX = "vowbird_e2e_v1_";

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function importPrivateKey(pkcs8B64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    b64ToBuf(pkcs8B64),
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits", "deriveKey"]
  );
}

async function importPublicKey(spkiB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    b64ToBuf(spkiB64),
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

export async function ensureLocalE2eKeyPair(userId: string): Promise<{ publicKey: string }> {
  const existing = localStorage.getItem(storageKey(userId));
  if (existing) {
    const parsed = JSON.parse(existing) as { publicKey: string; privateKey: string };
    return { publicKey: parsed.publicKey };
  }

  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits", "deriveKey"]
  );

  const publicKey = bufToB64(await crypto.subtle.exportKey("spki", keyPair.publicKey));
  const privateKey = bufToB64(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
  localStorage.setItem(storageKey(userId), JSON.stringify({ publicKey, privateKey }));
  return { publicKey };
}

export function hasLocalE2eKey(userId: string): boolean {
  return !!localStorage.getItem(storageKey(userId));
}

export function exportLocalE2eBackup(userId: string): string | null {
  return localStorage.getItem(storageKey(userId));
}

export function importLocalE2eBackup(userId: string, json: string): void {
  const parsed = JSON.parse(json) as { publicKey: string; privateKey: string };
  if (!parsed.publicKey || !parsed.privateKey) throw new Error("Invalid backup");
  localStorage.setItem(storageKey(userId), JSON.stringify(parsed));
}

async function deriveAesKey(myPrivate: CryptoKey, theirPublic: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: theirPublic },
    myPrivate,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptForRecipient(
  myUserId: string,
  recipientPublicKeyB64: string,
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  const stored = localStorage.getItem(storageKey(myUserId));
  if (!stored) throw new Error("Missing local E2E key — refresh to generate one");

  const { privateKey } = JSON.parse(stored) as { privateKey: string };
  const myPriv = await importPrivateKey(privateKey);
  const theirPub = await importPublicKey(recipientPublicKeyB64);
  const aes = await deriveAesKey(myPriv, theirPub);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, encoded);
  return { ciphertext: bufToB64(cipherBuf), iv: bufToB64(iv.buffer) };
}

export async function decryptFromSender(
  myUserId: string,
  senderPublicKeyB64: string,
  ciphertextB64: string,
  ivB64: string
): Promise<string> {
  const stored = localStorage.getItem(storageKey(myUserId));
  if (!stored) throw new Error("Missing local E2E key");

  const { privateKey } = JSON.parse(stored) as { privateKey: string };
  const myPriv = await importPrivateKey(privateKey);
  const theirPub = await importPublicKey(senderPublicKeyB64);
  const aes = await deriveAesKey(myPriv, theirPub);

  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(b64ToBuf(ivB64)) },
    aes,
    b64ToBuf(ciphertextB64)
  );
  return new TextDecoder().decode(plainBuf);
}
