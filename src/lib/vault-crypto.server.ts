// PBKDF2 password hashing. Stored format is cross-compatible with the previous
// implementation:
//   "pbkdf2$<iterations>$<saltB64>$<hashB64>"
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

// The deployed runtime supports node:crypto PBKDF2 only up to 100k iterations.
// Keep new hashes within that limit, while still verifying older 120k hashes
// through a small PBKDF2-SHA256 fallback below.
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

    return deriveSha256Fallback(password, salt, iterations);
  }
}

function deriveSha256Fallback(password: string, salt: Buffer, iterations: number): Buffer {
  const passwordBytes = Buffer.from(password, "utf8");
  const blockIndex = Buffer.alloc(4);
  blockIndex.writeUInt32BE(1, 0);

  let previous = createHmac("sha256", passwordBytes)
    .update(Buffer.concat([salt, blockIndex]))
    .digest();
  const output = Buffer.from(previous);

  for (let i = 1; i < iterations; i += 1) {
    previous = createHmac("sha256", passwordBytes).update(previous).digest();
    for (let j = 0; j < KEY_LEN; j += 1) {
      output[j] ^= previous[j];
    }
  }

  return output;
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
