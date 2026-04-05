/**
 * Edge-compatible PIN hashing using Web Crypto API (PBKDF2)
 * Replaces bcryptjs which requires Node.js runtime.
 */

const ITERATIONS = 100_000
const HASH_ALG   = 'SHA-256'
const KEY_LEN    = 32

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuf(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return arr
}

export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder()
  const saltBuf = new ArrayBuffer(16)
  crypto.getRandomValues(new Uint8Array(saltBuf))

  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']
  )
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBuf, iterations: ITERATIONS, hash: HASH_ALG },
    keyMaterial, KEY_LEN * 8
  )

  return `${bufToHex(saltBuf)}:${bufToHex(derived)}`
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = stored.split(':')
    const salt = hexToBuf(saltHex).buffer as ArrayBuffer
    const enc  = new TextEncoder()

    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']
    )
    const derived = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH_ALG },
      keyMaterial, KEY_LEN * 8
    )

    const storedBytes = hexToBuf(hashHex)
    const derivedBytes = new Uint8Array(derived)
    return timingSafeEqual(storedBytes, derivedBytes)
  } catch {
    return false
  }
}

// constant-time compare two Uint8Arrays
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}
