/**
 * ECDH P-256 + AES-GCM primitives matching web Web Crypto wire format.
 */

import { p256 } from "@noble/curves/nist.js";
import { gcm } from "@noble/ciphers/aes.js";

/** SPKI header for uncompressed P-256 public key (RFC 5480). */
const SPKI_PREFIX = Uint8Array.from([
  0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86,
  0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00,
]);

export function bufToB64(buf: Uint8Array): string {
  let binary = "";
  buf.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

export function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
}

export function publicRawToSpki(uncompressed65: Uint8Array): Uint8Array {
  const out = new Uint8Array(SPKI_PREFIX.length + uncompressed65.length);
  out.set(SPKI_PREFIX);
  out.set(uncompressed65, SPKI_PREFIX.length);
  return out;
}

export function spkiToPublicRaw(spki: Uint8Array): Uint8Array {
  const raw = spki.slice(spki.length - 65);
  if (raw[0] !== 0x04) throw new Error("Unsupported public key format");
  return raw;
}

export function pkcs8ToPrivateRaw(pkcs8: Uint8Array): Uint8Array {
  for (let i = 0; i < pkcs8.length - 34; i++) {
    if (pkcs8[i] === 0x04 && pkcs8[i + 1] === 0x20) {
      return pkcs8.slice(i + 2, i + 34);
    }
  }
  throw new Error("Invalid PKCS8 private key");
}

function derLength(n: number): number[] {
  if (n < 0x80) return [n];
  if (n < 0x100) return [0x81, n];
  return [0x82, (n >> 8) & 0xff, n & 0xff];
}

function derSeq(contents: number[]): number[] {
  return [0x30, ...derLength(contents.length), ...contents];
}

export function privateRawToPkcs8(priv: Uint8Array, pubUncompressed65: Uint8Array): Uint8Array {
  const inner = [
    0x02,
    0x01,
    0x01,
    0x04,
    0x20,
    ...priv,
    0xa1,
    0x44,
    0x03,
    0x42,
    0x00,
    ...pubUncompressed65,
  ];
  const algorithm = [
    0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x03, 0x01, 0x07,
  ];
  const octetInner = derSeq(inner);
  const body = [0x02, 0x01, 0x00, ...algorithm, 0x04, ...derLength(octetInner.length), ...octetInner];
  return Uint8Array.from(derSeq(body));
}

export function ecdhAesKey(myPrivRaw: Uint8Array, theirPubRaw: Uint8Array): Uint8Array {
  const shared = p256.getSharedSecret(myPrivRaw, theirPubRaw, false);
  return shared.slice(1, 33);
}

export function generateKeyPairEncoded(): { publicKey: string; privateKey: string } {
  const { secretKey, publicKey: pubCompressed } = p256.keygen();
  const pubUncompressed = p256.Point.fromBytes(pubCompressed).toBytes(false);
  return {
    publicKey: bufToB64(publicRawToSpki(pubUncompressed)),
    privateKey: bufToB64(privateRawToPkcs8(secretKey, pubUncompressed)),
  };
}

export function encryptPlaintext(
  myPrivateKeyB64: string,
  recipientPublicKeyB64: string,
  plaintext: string
): { ciphertext: string; iv: string } {
  const myPriv = pkcs8ToPrivateRaw(b64ToBytes(myPrivateKeyB64));
  const theirPub = spkiToPublicRaw(b64ToBytes(recipientPublicKeyB64));
  const key = ecdhAesKey(myPriv, theirPub);
  const iv = randomBytes(12);
  const cipher = gcm(key, iv).encrypt(new TextEncoder().encode(plaintext));
  return { ciphertext: bufToB64(cipher), iv: bufToB64(iv) };
}

export function decryptCiphertext(
  myPrivateKeyB64: string,
  senderPublicKeyB64: string,
  ciphertextB64: string,
  ivB64: string
): string {
  const myPriv = pkcs8ToPrivateRaw(b64ToBytes(myPrivateKeyB64));
  const theirPub = spkiToPublicRaw(b64ToBytes(senderPublicKeyB64));
  const key = ecdhAesKey(myPriv, theirPub);
  const plain = gcm(key, b64ToBytes(ivB64)).decrypt(b64ToBytes(ciphertextB64));
  return new TextDecoder().decode(plain);
}
