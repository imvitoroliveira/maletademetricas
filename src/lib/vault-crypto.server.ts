// PBKDF2 password hashing. Stored format is cross-compatible with the previous
// implementation:
//   "pbkdf2$<iterations>$<saltB64>$<hashB64>"
import { pbkdf2Sync, randomBytes, timingSafeEqual, webcrypto } from "node:crypto";

// The deployed runtime supports node:crypto PBKDF2 only up to 100k iterations.
// Keep new hashes within that limit, while still verifying older 120k hashes
// through Web Crypto below.
const ITERATIONS = 100000;
const KEY_LEN = 32; // bytes -> 256 bits

function derive(password: string, salt: Buffer, iterations: number): Buffer {
  return pbkdf2Sync(password, salt, iterations, KEY_LEN, "sha256");
}

async function deriveCompat(password: string, salt: Buffer, iterations: number): Promise<Buffer> {
  try {
    return derive(password, salt, iterations);
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes("iteration counts above 100000")) {
      throw err;
    }

    const keyMaterial = await webcrypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"],
    );
    const bits = await webcrypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      KEY_LEN * 8,
    );
    return Buffer.from(bits);
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  try {
    const [scheme, iterStr, saltB64, hashB64] = stored.split("$");
    if (scheme !== "pbkdf2") return false;
    const iterations = parseInt(iterStr, 10);
    if (!Number.isFinite(iterations) || iterations <= 0) return false;
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const computed = await deriveCompat(password, salt, iterations);
    if (computed.length !== expected.length) return false;
    return timingSafeEqual(computed, expected);
  } catch (err) {
    console.error("[vault-crypto] verify error", err);
    return false;
  }
}
