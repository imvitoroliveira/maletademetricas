// PBKDF2 password hashing. Uses Node's crypto (available in workerd with
// nodejs_compat) for maximum consistency between local Node tests and the
// deployed Worker runtime. Stored format is cross-compatible with the previous
// Web Crypto implementation:
//   "pbkdf2$<iterations>$<saltB64>$<hashB64>"
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const ITERATIONS = 120000;
const KEY_LEN = 32; // bytes -> 256 bits

function derive(password: string, salt: Buffer, iterations: number): Buffer {
  return pbkdf2Sync(password, salt, iterations, KEY_LEN, "sha256");
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
    const computed = derive(password, salt, iterations);
    if (computed.length !== expected.length) return false;
    return timingSafeEqual(computed, expected);
  } catch (err) {
    console.error("[vault-crypto] verify error", err);
    return false;
  }
}
