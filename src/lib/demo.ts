import { db, uid } from '../db/db'
import {
  addBreeding, addMovement, createFarm, recordBirth, recordSale, saveAnimal, saveExpense, saveHealth,
} from '../db/repo'
import type { ID } from '../db/types'
import { addDays, addMonths, today } from './dates'

/** Namuna ma'lumotlar: ilovani sinab ko'rish uchun */
export async function createDemoFarm(name: string): Promise<ID> {
  const farmId = await createFarm(name, 'Demo')
  const start = addMonths(today(), -8)
  const now = Date.now()

  // Guruhlar
  const ewesG = uid()
  const fatG = uid()
  const broG = uid()
  await db.groups.bulkAdd([
    { id: ewesG, farmId, name: "Sovliq qo'ylar", speciesId: 'sp_sheep', purpose: 'breeding', startDate: start, status: 'active', createdAt: now },
    { id: fatG, farmId, name: "Bo'rdoqi qo'chqorlar", speciesId: 'sp_sheep', purpose: 'fattening', startDate: start, status: 'active', createdAt: now },
    { id: broG, farmId, name: 'Broyler #1', speciesId: 'sp_broiler', purpose: 'fattening', startDate: addMonths(today(), -2), status: 'active', createdAt: now },
  ])

  // Qo'ylar
  const ewes: ID[] = []
  for (let i = 1; i <= 12; i++) {
    ewes.push(
      await saveAnimal(farmId, {
        tag: 'S-' + i, speciesId: 'sp_sheep', sex: 'f', breed: 'Hisori', origin: 'bought', acquiredDate: start,
        purchaseWeight: 55 + (i % 5) * 3, groupId: ewesG, birthDate: addMonths(start, -24 - i),
      }, 3_200_000),
    )
  }
  const ram = await saveAnimal(farmId, {
    tag: 'Q-1', name: 'Bahodir', speciesId: 'sp_sheep', sex: 'm', breed: 'Hisori', origin: 'bought', acquiredDate: start,
    purchaseWeight: 85, groupId: ewesG,
  }, 6_500_000)

  const fat: ID[] = []
  for (let i = 1; i <= 8; i++) {
    const id = await saveAnimal(farmId, {
      tag: 'B-' + i, speciesId: 'sp_sheep', sex: 'm', breed: 'Edilboy', origin: 'bought', acquiredDate: addMonths(start, 1),
      purchaseWeight: 32 + i, groupId: fatG,
    }, 2_100_000)
    fat.push(id)
    await db.weights.add({ id: uid(), farmId, animalId: id, date: addMonths(start, 3), kg: 32 + i + 16, createdAt: now })
    await db.weights.add({ id: uid(), farmId, animalId: id, date: addMonths(start, 5), kg: 32 + i + 27, createdAt: now })
  }

  // Oylik xarajatlar
  for (let m = 0; m < 8; m++) {
    const d = addDays(addMonths(start, m), 3)
    await saveExpense({ farmId, date: d, categoryId: 'ex_hay', amount: 2_400_000, qty: 1200, unit: 'kg', scope: 'farm' })
    await saveExpense({ farmId, date: d, categoryId: 'ex_grain', amount: 1_300_000, qty: 400, unit: 'kg', scope: 'group', targetId: fatG })
    await saveExpense({ farmId, date: addDays(d, 20), categoryId: 'ex_labor', amount: 1_800_000, scope: 'farm', note: "Cho'pon" })
    if (m % 2 === 0) await saveExpense({ farmId, date: addDays(d, 10), categoryId: 'ex_electricity', amount: 180_000, scope: 'farm' })
  }
  await saveExpense({ farmId, date: start, categoryId: 'ex_construction', amount: 6_000_000, scope: 'farm', note: "Qo'tonni ta'mirlash" })

  await saveHealth({
    farmId, date: addDays(start, 7), type: 'vaccine', title: 'Oqsil (yashur)', scope: 'species', targetId: 'sp_sheep',
    cost: 420_000, nextDate: addDays(today(), 12),
  })
  await saveHealth({
    farmId, date: addDays(start, 14), type: 'deworm', title: 'Albendazol', scope: 'group', targetId: ewesG,
    cost: 150_000, nextDate: addDays(today(), 4),
  })

  // Qochirish va tug'ish
  for (let i = 0; i < ewes.length; i++) {
    // birinchi 7 tasi allaqachon tug'gan, qolganlari hozir bo'g'oz
    const date = i < 7 ? addDays(start, 10 + i * 3) : addDays(today(), -120 + i * 4)
    const bid = await addBreeding({ farmId, femaleId: ewes[i], maleId: ram, date, method: 'natural', gestationDays: 150 })
    if (i < 7) {
      const twins = i % 3 === 0
      await recordBirth({
        farmId, motherId: ewes[i], breedingId: bid, date: addDays(date, 150), dead: i === 4 ? 1 : 0,
        kids: twins
          ? [{ tag: `S-${i + 1}/1`, sex: 'f', weight: 4 }, { tag: `S-${i + 1}/2`, sex: 'm', weight: 4.3 }]
          : [{ tag: `S-${i + 1}/1`, sex: i % 2 ? 'm' : 'f', weight: 4.8 }],
      })
    } else if (i === 8) {
      await db.breedings.update(bid, { status: 'failed' })
    }
  }

  // Sotuvlar
  await recordSale({
    farmId, date: addDays(today(), -20), amount: 9_600_000, categoryId: 'in_animal_sale', animalIds: fat.slice(0, 2),
    weightKg: 128, extraCost: 100_000, note: "Mol bozori",
  })
  await saveExpense({ farmId, date: addDays(today(), -40), categoryId: 'ex_transport', amount: 250_000, scope: 'group', targetId: fatG })

  // Broyler
  const bstart = addMonths(today(), -2)
  await addMovement({ farmId, groupId: broG, date: bstart, type: 'in', count: 300, amount: 2_700_000, note: 'Jo\'jalar' })
  await saveExpense({ farmId, date: addDays(bstart, 1), categoryId: 'ex_concentrate', amount: 4_500_000, qty: 900, unit: 'kg', scope: 'group', targetId: broG })
  await saveExpense({ farmId, date: addDays(bstart, 21), categoryId: 'ex_concentrate', amount: 6_000_000, qty: 1200, unit: 'kg', scope: 'group', targetId: broG })
  await saveExpense({ farmId, date: addDays(bstart, 2), categoryId: 'ex_vaccine', amount: 300_000, scope: 'group', targetId: broG })
  await addMovement({ farmId, groupId: broG, date: addDays(bstart, 15), type: 'death', count: 9 })
  await db.weights.add({ id: uid(), farmId, groupId: broG, date: addDays(bstart, 42), kg: 2.6, createdAt: now })
  await recordSale({
    farmId, date: addDays(bstart, 45), amount: 9_100_000, categoryId: 'in_meat_sale', groupId: broG, headCount: 150,
    weightKg: 380, extraCost: 200_000, slaughter: true,
  })

  // Sut va jun
  await db.production.bulkAdd([
    { id: uid(), farmId, date: addDays(today(), -60), type: 'wool', qty: 36, unit: 'kg', scope: 'group', targetId: ewesG, createdAt: now },
  ])
  await db.incomes.add({ id: uid(), farmId, date: addDays(today(), -58), categoryId: 'in_wool', amount: 540_000, qty: 36, unit: 'kg', scope: 'group', targetId: ewesG, createdAt: now })
  await db.incomes.add({ id: uid(), farmId, date: addDays(today(), -10), categoryId: 'in_manure', amount: 800_000, scope: 'farm', createdAt: now })

  // Yem ombori
  const hay = uid()
  await db.feedItems.add({ id: hay, farmId, name: 'Beda (pichan)', unit: 'kg', stock: 0, avgPrice: 0, createdAt: now })
  await db.feedMoves.bulkAdd([
    { id: uid(), farmId, feedItemId: hay, date: addDays(today(), -15), qty: 1500, price: 2000, createdAt: now },
    { id: uid(), farmId, feedItemId: hay, date: addDays(today(), -1), qty: -700, createdAt: now },
  ])
  await db.feedItems.update(hay, { stock: 800, avgPrice: 2000 })
  await db.rations.add({ id: uid(), farmId, feedItemId: hay, scope: 'species', targetId: 'sp_sheep', perHeadDay: 2 })

  // Joriy oy yozuvlari
  await saveExpense({ farmId, date: today(), categoryId: 'ex_bran', amount: 650_000, qty: 250, unit: 'kg', scope: 'farm' })
  await recordSale({
    farmId, date: today(), amount: 10_400_000, categoryId: 'in_animal_sale', animalIds: fat.slice(2, 4), weightKg: 130, note: 'Qassobga',
  })

  await db.reminders.add({ id: uid(), farmId, date: addDays(today(), 3), title: "Qo'zilarni tarozida tortish", done: false, createdAt: now })

  return farmId
}
