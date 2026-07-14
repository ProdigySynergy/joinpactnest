/**
 * Client-side E2E crypto with SecureStore key persistence.
 * Private keys stay on-device; only public keys + ciphertext hit the API.
 */

import * as SecureStore from "expo-secure-store";
import {
  b64ToBytes,
  decryptCiphertext,
  encryptPlaintext,
  generateKeyPairEncoded,
  pkcs8ToPrivateRaw,
  spkiToPublicRaw,
} from "./e2e-crypto";

const STORAGE_PREFIX = "vowbird_e2e_v1_";

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

async function readStored(userId: string): Promise<{ publicKey: string; privateKey: string } | null> {
  const raw = await SecureStore.getItemAsync(storageKey(userId));
  if (!raw) return null;
  return JSON.parse(raw) as { publicKey: string; privateKey: string };
}

async function writeStored(userId: string, value: { publicKey: string; privateKey: string }) {
  await SecureStore.setItemAsync(storageKey(userId), JSON.stringify(value));
}

export async function ensureLocalE2eKeyPair(userId: string): Promise<{ publicKey: string }> {
  const existing = await readStored(userId);
  if (existing) return { publicKey: existing.publicKey };

  const pair = generateKeyPairEncoded();
  await writeStored(userId, pair);
  return { publicKey: pair.publicKey };
}

export async function hasLocalE2eKey(userId: string): Promise<boolean> {
  return !!(await SecureStore.getItemAsync(storageKey(userId)));
}

export async function exportLocalE2eBackup(userId: string): Promise<string | null> {
  return SecureStore.getItemAsync(storageKey(userId));
}

export async function importLocalE2eBackup(userId: string, json: string): Promise<void> {
  const parsed = JSON.parse(json) as { publicKey: string; privateKey: string };
  if (!parsed.publicKey || !parsed.privateKey) throw new Error("Invalid backup");
  pkcs8ToPrivateRaw(b64ToBytes(parsed.privateKey));
  spkiToPublicRaw(b64ToBytes(parsed.publicKey));
  await writeStored(userId, parsed);
}

export async function encryptForRecipient(
  myUserId: string,
  recipientPublicKeyB64: string,
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  const stored = await readStored(myUserId);
  if (!stored) throw new Error("Missing local E2E key — restart the app to generate one");
  return encryptPlaintext(stored.privateKey, recipientPublicKeyB64, plaintext);
}

export async function decryptFromSender(
  myUserId: string,
  senderPublicKeyB64: string,
  ciphertextB64: string,
  ivB64: string
): Promise<string> {
  const stored = await readStored(myUserId);
  if (!stored) throw new Error("Missing local E2E key");
  return decryptCiphertext(stored.privateKey, senderPublicKeyB64, ciphertextB64, ivB64);
}
