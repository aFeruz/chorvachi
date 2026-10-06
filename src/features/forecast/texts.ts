import type { T } from '../../state/settings'
import type { FactorKey, GoalType, MilestoneKey } from '../../lib/forecast/analyze'
import type { CostKey, ModelKind, RevKey } from '../../lib/forecast/types'

export const goalLabel = (t: T, g: GoalType) =>
  ({
    profit: t('Qachon foydaga chiqaman?', 'Когда выйду в прибыль?'),
    heads: t('Qachon N boshga yetaman?', 'Когда будет N голов?'),
    cash: t("Qachon X so'm topaman?", 'Когда заработаю X сум?'),
    monthly: t("Qachon oyiga X so'm keladi?", 'Когда будет X сум в месяц?'),
    horizon: t('Falon muddatda nima bo\'ladi?', 'Что будет через N месяцев?'),
    need: t('Maqsad uchun nima kerak?', 'Что нужно для цели?'),
    risk: t("Xatarlar: eng yomon holat", 'Риски: худший случай'),
  })[g]

export const goalHint = (t: T, g: GoalType) =>
  ({
    profit: t("Sarmoya qachon qaytadi va qachondan oylik foyda boshlanadi", 'Когда вернутся вложения и начнётся прибыль'),
    heads: t('Podangiz qachon kerakli songa yetadi', 'Когда стадо достигнет нужного размера'),
    cash: t("Sof foyda (sarmoya qaytgandan keyin) qachon shu summaga yetadi", 'Когда чистая прибыль (после возврата вложений) достигнет суммы'),
    monthly: t("O'rtacha oylik sof daromad qachon shu darajaga chiqadi", 'Когда средний месячный доход достигнет уровня'),
    horizon: t("Tanlangan muddat oxirida bosh soni, pul va poda qiymati", 'Поголовье, деньги и стоимость стада на конец срока'),
    need: t("Belgilangan vaqtda maqsadga yetish uchun nechta bosh yoki qanday narx kerak", 'Сколько голов или какая цена нужны, чтобы успеть к сроку'),
    risk: t("O'lim, kasallik va narx tushishi hisobga olingan ehtimollar", 'Вероятности с учётом падежа, болезней и падения цен'),
  })[g]

export const GOALS: GoalType[] = ['profit', 'heads', 'cash', 'monthly', 'horizon', 'need', 'risk']

export const modelLabel = (t: T, m: ModelKind) =>
  ({
    herd: t("Ko'paytirish (nasl)", 'Разведение'),
    batch: t('Partiya / bo\'rdoqi', 'Партии / откорм'),
    layer: t('Tuxum', 'Яйцо'),
    apiary: t('Asalarichilik', 'Пасека'),
  })[m]

export const modelHint = (t: T, m: ModelKind) =>
  ({
    herd: t("Ona hayvonlar tug'adi, bolalar o'sadi, sotiladi yoki podada qoladi", 'Матки приносят приплод, молодняк растёт, продаётся или остаётся'),
    batch: t("Sotib olinadi, boqiladi, sotiladi — keyin yangi partiya", 'Купить, откормить, продать — затем новая партия'),
    layer: t("Tovuqlar tuxum qiladi, muddat tugagach almashtiriladi", 'Куры несутся, затем стадо обновляется'),
    apiary: t("Oilalar bo'linadi, qishda nobud bo'ladi, asal yig'iladi", 'Семьи делятся, часть гибнет зимой, сбор мёда'),
  })[m]

export const milestoneLabel = (t: T, k: MilestoneKey) =>
  ({
    firstBirth: t("Birinchi tug'ish", 'Первый приплод'),
    firstSale: t('Birinchi daromad', 'Первый доход'),
    profitable: t('Barqaror foydaga chiqish', 'Устойчивая прибыль'),
    payback: t('Sarmoya to\'liq qaytadi (naqd)', 'Окупаемость (деньгами)'),
    wealthPositive: t("Hammasini sotsa ham zarar yo'q (barqaror)", 'Без убытка, если продать всё'),
    heads: t('Maqsad: bosh soni (barqaror)', 'Цель: поголовье (устойчиво)'),
    cash: t("Maqsad: sof foyda", 'Цель: чистая прибыль'),
    monthly: t('Maqsad: oylik daromad', 'Цель: доход в месяц'),
  })[k]

export const costLabel = (t: T, k: CostKey) =>
  ({
    feed: t('Yem', 'Корма'),
    vet: t('Veterinariya', 'Ветеринария'),
    labor: t('Ish haqi', 'Зарплата'),
    other: t('Boshqa xarajatlar', 'Прочие расходы'),
    stock: t("Hayvon / jo'ja sotib olish", 'Покупка животных / молодняка'),
    disease: t('Kasallik', 'Болезни'),
    breeding: t("Sun'iy urug'lantirish", 'Осеменение'),
  })[k]

export const COST_COLORS: Record<CostKey, string> = {
  feed: '#65a30d', vet: '#dc2626', labor: '#2563eb', other: '#64748b', stock: '#7c3aed', disease: '#be123c', breeding: '#db2777',
}

export const revLabel = (t: T, k: RevKey) =>
  ({
    animals: t('Hayvon sotish', 'Продажа животных'),
    culls: t('Qari onalarni sotish', 'Выбраковка'),
    milk: t('Sut', 'Молоко'),
    wool: t('Jun', 'Шерсть'),
    eggs: t('Tuxum', 'Яйца'),
    honey: t('Asal', 'Мёд'),
    other: t('Boshqa (mum va h.k.)', 'Прочее (воск и т.п.)'),
  })[k]

export const factorLabel = (t: T, k: FactorKey) =>
  ({
    salePrice: t('Sotish narxi', 'Цена продажи'),
    feedPrice: t('Yem narxi', 'Цена корма'),
    feedAmount: t('Yem miqdori', 'Расход корма'),
    litter: t("Bola soni (egizaklar)", 'Плодовитость'),
    conception: t("Bo'g'oz bo'lish", 'Оплодотворяемость'),
    youngMortality: t("Bolalar o'limi", 'Падёж молодняка'),
    adultMortality: t("Kattalar o'limi", 'Падёж взрослых'),
    growth: t("Kunlik o'sish", 'Привес'),
    labor: t('Ish haqi', 'Зарплата'),
    purchasePrice: t('Sotib olish narxi', 'Цена покупки'),
    mortality: t("O'lim", 'Падёж'),
    finalWeight: t('Sotish vazni', 'Вес при продаже'),
    fcr: t('Yem sarfi (konversiya)', 'Конверсия корма'),
    eggPrice: t('Tuxum narxi', 'Цена яйца'),
    layRate: t('Tuxum qilish darajasi', 'Яйценоскость'),
    honeyPrice: t('Asal narxi', 'Цена мёда'),
    honeyYield: t('Asal hosili', 'Медосбор'),
    winterLoss: t('Qishki nobudgarchilik', 'Зимние потери'),
    splitRate: t("Oilalar bo'linishi", 'Деление семей'),
    milkPrice: t('Sut narxi', 'Цена молока'),
  })[k]

export const warningLabel = (t: T, w: string) =>
  ({
    noMales: t(
      "Naslchi (erkak) yo'q — qochirish bo'lmaydi. Naslchi qo'shing yoki sun'iy urug'lantirishni yoqing.",
      'Нет производителя — случки не будет. Добавьте самца или включите искусственное осеменение.',
    ),
    noFemales: t("Ona hayvon yo'q — ko'payish bo'lmaydi.", 'Нет маток — приплода не будет.'),
    noPrice: t('Sotish narxi kiritilmagan — pul hisoblari to\'liq emas.', 'Не указана цена продажи — денежный расчёт неполный.'),
    noHarvest: t("Asal yig'ish oylari tanlanmagan — asal daromadi hisoblanmaydi.", 'Не выбраны месяцы медосбора — доход от мёда не учитывается.'),
  })[w] ?? w

export const MONTHS_SHORT_UZ = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek']
export const MONTHS_SHORT_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

/** "2027-03" -> "mar 2027" */
export function monthText(lang: 'uz' | 'ru', key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${(lang === 'ru' ? MONTHS_SHORT_RU : MONTHS_SHORT_UZ)[m - 1]} ${y}`
}

/** 27 oy -> "2 yil 3 oy" */
export function durationText(t: T, months: number): string {
  const y = Math.floor(months / 12)
  const m = months % 12
  const parts: string[] = []
  if (y) parts.push(t(`${y} yil`, `${y} г.`))
  if (m || !y) parts.push(t(`${m} oy`, `${m} мес.`))
  return parts.join(' ')
}
