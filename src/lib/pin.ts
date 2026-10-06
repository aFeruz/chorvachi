/** PIN-kodni xeshlash: ochiq holda saqlanmaydi */

export function newSalt(): string {
  const a = new Uint8Array(16)
  crypto.getRandomValues(a)
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`chorva-hisob:${salt}:${pin}`)
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data)
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  // zaxira (xavfsiz kontekst bo'lmasa): FNV-1a, bir necha marta
  let h = 0x811c9dc5
  for (let r = 0; r < 1000; r++) for (const b of data) h = Math.imul(h ^ b, 0x01000193) >>> 0
  return 'fnv:' + h.toString(16)
}

export async function checkPin(pin: string, salt?: string, hash?: string): Promise<boolean> {
  if (!salt || !hash) return false
  return (await hashPin(pin, salt)) === hash
}
