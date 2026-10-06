import { describe, expect, it } from 'vitest'
import { checkPin, hashPin, newSalt } from './pin'

describe('PIN', () => {
  it("xesh ochiq PINni o'z ichiga olmaydi va tekshiruv ishlaydi", async () => {
    const salt = newSalt()
    const h = await hashPin('2580', salt)
    expect(h).not.toContain('2580')
    expect(await checkPin('2580', salt, h)).toBe(true)
    expect(await checkPin('2581', salt, h)).toBe(false)
    expect(await checkPin('2580', undefined, h)).toBe(false)
  })
  it('har xil tuz — har xil xesh', async () => {
    expect(await hashPin('1234', newSalt())).not.toBe(await hashPin('1234', newSalt()))
  })
})
