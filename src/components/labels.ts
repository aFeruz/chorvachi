import type { AnimalStatus, GroupPurpose, HealthType, MovementType, ProductType, Scope } from '../db/types'
import type { T } from '../state/settings'

export const statusLabel = (t: T, s: AnimalStatus) =>
  ({
    active: t('Faol', 'Активно'),
    sold: t('Sotilgan', 'Продано'),
    slaughtered: t("So'yilgan", 'Забито'),
    dead: t("O'lgan", 'Пало'),
    lost: t("Yo'qolgan", 'Потеряно'),
  })[s]

export const statusTone = (s: AnimalStatus) =>
  (({ active: 'green', sold: 'blue', slaughtered: 'violet', dead: 'red', lost: 'amber' }) as const)[s]

export const purposeLabel = (t: T, p: GroupPurpose) =>
  ({
    fattening: t("Bo'rdoqi (go'sht)", 'Откорм'),
    breeding: t('Nasl / ko\'paytirish', 'Племенное'),
    dairy: t('Sut', 'Молочное'),
    eggs: t('Tuxum', 'Яйца'),
    wool: t('Jun', 'Шерсть'),
    mixed: t('Aralash', 'Смешанное'),
  })[p]

export const PURPOSES: GroupPurpose[] = ['fattening', 'breeding', 'dairy', 'eggs', 'wool', 'mixed']

export const movementLabel = (t: T, m: MovementType) =>
  ({
    in: t('Kirim (sotib olindi)', 'Поступление'),
    birth: t("Tug'ildi / ochirildi", 'Приплод / вывод'),
    death: t("O'ldi", 'Падёж'),
    sold: t('Sotildi', 'Продано'),
    slaughter: t("So'yildi", 'Забито'),
  })[m]

export const scopeLabel = (t: T, s: Scope) =>
  ({
    farm: t('Butun ferma', 'Вся ферма'),
    species: t("Tur bo'yicha", 'По виду'),
    group: t('Guruh / poda', 'Группа / стадо'),
    animal: t('Bitta hayvon', 'Одно животное'),
  })[s]

export const healthLabel = (t: T, h: HealthType) =>
  ({
    vaccine: t('Emlash', 'Вакцинация'),
    treatment: t('Davolash', 'Лечение'),
    deworm: t('Gijjaga qarshi', 'Дегельминтизация'),
    checkup: t("Ko'rik", 'Осмотр'),
    other: t('Boshqa', 'Другое'),
  })[h]

export const productLabel = (t: T, p: ProductType) =>
  ({
    milk: t('Sut', 'Молоко'),
    eggs: t('Tuxum', 'Яйца'),
    wool: t('Jun', 'Шерсть'),
    honey: t('Asal', 'Мёд'),
    manure: t("Go'ng", 'Навоз'),
    other: t('Boshqa', 'Другое'),
  })[p]

export const PRODUCT_UNIT: Record<ProductType, string> = {
  milk: 'l', eggs: 'dona', wool: 'kg', honey: 'kg', manure: 'kg', other: 'kg',
}

export const PRODUCT_INCOME_CAT: Record<ProductType, string> = {
  milk: 'in_milk', eggs: 'in_eggs', wool: 'in_wool', honey: 'in_honey', manure: 'in_manure', other: 'in_other',
}

export const sexLabel = (t: T, s: 'f' | 'm') => (s === 'f' ? t("Urg'ochi", 'Самка') : t('Erkak', 'Самец'))

export function ageText(t: T, months: number): string {
  const y = Math.floor(months / 12)
  const m = months % 12
  const parts: string[] = []
  if (y) parts.push(`${y} ${t('yil', 'г.')}`)
  if (m || !y) parts.push(`${m} ${t('oy', 'мес.')}`)
  return parts.join(' ')
}
