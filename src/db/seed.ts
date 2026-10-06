import type { Category, Species } from './types'

type SpeciesSeed = Omit<Species, 'id' | 'builtin' | 'enabled'> & { key: string }

/** Standart turlar. Qiymatlar o'rtacha, foydalanuvchi sozlamalarda o'zgartira oladi. */
export const SPECIES_SEED: SpeciesSeed[] = [
  { key: 'sheep', name: { uz: "Qo'y", ru: 'Овца' }, mode: 'individual', gestationDays: 150, avgLitter: 1.3, maturityMonths: 8, dressingPct: 48, lu: 0.15 },
  { key: 'goat', name: { uz: 'Echki', ru: 'Коза' }, mode: 'individual', gestationDays: 150, avgLitter: 1.6, maturityMonths: 8, dressingPct: 45, lu: 0.15 },
  { key: 'cattle', name: { uz: 'Qoramol', ru: 'КРС' }, mode: 'individual', gestationDays: 283, avgLitter: 1, maturityMonths: 15, dressingPct: 55, lu: 1 },
  { key: 'horse', name: { uz: 'Ot', ru: 'Лошадь' }, mode: 'individual', gestationDays: 340, avgLitter: 1, maturityMonths: 24, dressingPct: 55, lu: 0.8 },
  { key: 'camel', name: { uz: 'Tuya', ru: 'Верблюд' }, mode: 'individual', gestationDays: 390, avgLitter: 1, maturityMonths: 36, dressingPct: 55, lu: 1.1 },
  { key: 'rabbit', name: { uz: 'Quyon', ru: 'Кролик' }, mode: 'group', gestationDays: 31, avgLitter: 7, maturityMonths: 5, dressingPct: 55, lu: 0.02 },
  { key: 'broiler', name: { uz: 'Broyler tovuq', ru: 'Бройлер' }, mode: 'group', gestationDays: 0, avgLitter: 0, maturityMonths: 2, dressingPct: 72, lu: 0.01 },
  { key: 'layer', name: { uz: 'Tuxum tovuq', ru: 'Несушка' }, mode: 'group', gestationDays: 0, avgLitter: 0, maturityMonths: 5, dressingPct: 65, lu: 0.01 },
  { key: 'turkey', name: { uz: 'Kurka', ru: 'Индейка' }, mode: 'group', gestationDays: 0, avgLitter: 0, maturityMonths: 5, dressingPct: 75, lu: 0.03 },
  { key: 'duck', name: { uz: "O'rdak / g'oz", ru: 'Утка / гусь' }, mode: 'group', gestationDays: 0, avgLitter: 0, maturityMonths: 3, dressingPct: 70, lu: 0.02 },
  { key: 'fish', name: { uz: 'Baliq', ru: 'Рыба' }, mode: 'group', gestationDays: 0, avgLitter: 0, maturityMonths: 12, dressingPct: 80, lu: 0.001 },
  { key: 'bee', name: { uz: 'Asalari (oila)', ru: 'Пчёлы (семья)' }, mode: 'group', gestationDays: 0, avgLitter: 0, maturityMonths: 0, dressingPct: 0, lu: 0.02 },
]

type CatSeed = Omit<Category, 'id' | 'builtin'> & { key: string }

export const EXPENSE_CATEGORIES: CatSeed[] = [
  { kind: 'expense', key: 'purchase', name: { uz: 'Hayvon sotib olish', ru: 'Покупка животных' }, color: '#7c3aed' },
  { kind: 'expense', key: 'hay', name: { uz: 'Pichan / beda', ru: 'Сено / люцерна' }, color: '#65a30d' },
  { kind: 'expense', key: 'concentrate', name: { uz: 'Omuxta yem', ru: 'Комбикорм' }, color: '#ca8a04' },
  { kind: 'expense', key: 'grain', name: { uz: "Don (arpa, makkajo'xori)", ru: 'Зерно (ячмень, кукуруза)' }, color: '#d97706' },
  { kind: 'expense', key: 'bran', name: { uz: 'Kepak / shrot / jmix', ru: 'Отруби / шрот / жмых' }, color: '#a16207' },
  { kind: 'expense', key: 'silage', name: { uz: 'Silos / somon', ru: 'Силос / солома' }, color: '#84cc16' },
  { kind: 'expense', key: 'minerals', name: { uz: "Tuz, mineral, vitamin", ru: 'Соль, минералы, витамины' }, color: '#0891b2' },
  { kind: 'expense', key: 'vet', name: { uz: 'Veterinar xizmati', ru: 'Ветеринар' }, color: '#dc2626' },
  { kind: 'expense', key: 'medicine', name: { uz: 'Dori-darmon', ru: 'Лекарства' }, color: '#e11d48' },
  { kind: 'expense', key: 'vaccine', name: { uz: 'Emlash / vaksina', ru: 'Вакцинация' }, color: '#f43f5e' },
  { kind: 'expense', key: 'ai', name: { uz: "Sun'iy urug'lantirish / qochirish", ru: 'Осеменение / случка' }, color: '#db2777' },
  { kind: 'expense', key: 'labor', name: { uz: "Ish haqi (cho'pon, ishchi)", ru: 'Зарплата (пастух, рабочие)' }, color: '#2563eb' },
  { kind: 'expense', key: 'rent', name: { uz: 'Ijara (yer, yaylov, bino)', ru: 'Аренда (земля, пастбище)' }, color: '#4f46e5' },
  { kind: 'expense', key: 'electricity', name: { uz: 'Elektr', ru: 'Электричество' }, color: '#eab308' },
  { kind: 'expense', key: 'water', name: { uz: 'Suv', ru: 'Вода' }, color: '#0ea5e9' },
  { kind: 'expense', key: 'fuel', name: { uz: "Gaz / yoqilg'i", ru: 'Газ / топливо' }, color: '#f97316' },
  { kind: 'expense', key: 'transport', name: { uz: 'Transport / tashish', ru: 'Транспорт' }, color: '#64748b' },
  { kind: 'expense', key: 'equipment', name: { uz: "Jihoz / ta'mir", ru: 'Оборудование / ремонт' }, color: '#475569' },
  { kind: 'expense', key: 'construction', name: { uz: "Qurilish (ogʻil, katak)", ru: 'Строительство' }, color: '#78716c' },
  { kind: 'expense', key: 'bedding', name: { uz: "To'shama / dezinfeksiya", ru: 'Подстилка / дезинфекция' }, color: '#a8a29e' },
  { kind: 'expense', key: 'slaughter', name: { uz: "So'yish / qassob", ru: 'Убой / мясник' }, color: '#991b1b' },
  { kind: 'expense', key: 'market', name: { uz: "Bozor yig'imi / dallol", ru: 'Рыночный сбор / посредник' }, color: '#9333ea' },
  { kind: 'expense', key: 'tax', name: { uz: 'Soliq / hujjatlar', ru: 'Налоги / документы' }, color: '#334155' },
  { kind: 'expense', key: 'loan', name: { uz: 'Kredit foizi', ru: 'Проценты по кредиту' }, color: '#be123c' },
  { kind: 'expense', key: 'insurance', name: { uz: "Sug'urta", ru: 'Страхование' }, color: '#0f766e' },
  { kind: 'expense', key: 'other', name: { uz: 'Boshqa xarajat', ru: 'Прочие расходы' }, color: '#94a3b8' },
]

export const INCOME_CATEGORIES: CatSeed[] = [
  { kind: 'income', key: 'animal_sale', name: { uz: 'Tirik hayvon sotish', ru: 'Продажа живых животных' }, color: '#16a34a' },
  { kind: 'income', key: 'meat_sale', name: { uz: "Go'sht sotish", ru: 'Продажа мяса' }, color: '#b91c1c' },
  { kind: 'income', key: 'milk', name: { uz: 'Sut / qatiq', ru: 'Молоко' }, color: '#0284c7' },
  { kind: 'income', key: 'eggs', name: { uz: 'Tuxum', ru: 'Яйца' }, color: '#f59e0b' },
  { kind: 'income', key: 'wool', name: { uz: 'Jun / tivit', ru: 'Шерсть' }, color: '#a3a3a3' },
  { kind: 'income', key: 'hide', name: { uz: 'Teri', ru: 'Шкуры' }, color: '#92400e' },
  { kind: 'income', key: 'manure', name: { uz: "Go'ng", ru: 'Навоз' }, color: '#57534e' },
  { kind: 'income', key: 'honey', name: { uz: 'Asal', ru: 'Мёд' }, color: '#eab308' },
  { kind: 'income', key: 'breeding_service', name: { uz: 'Nasl / qochirish xizmati', ru: 'Племенные услуги' }, color: '#c026d3' },
  { kind: 'income', key: 'subsidy', name: { uz: 'Subsidiya / grant', ru: 'Субсидия / грант' }, color: '#0d9488' },
  { kind: 'income', key: 'other', name: { uz: 'Boshqa daromad', ru: 'Прочие доходы' }, color: '#94a3b8' },
]

export const FEED_CATEGORY_KEYS = ['hay', 'concentrate', 'grain', 'bran', 'silage', 'minerals']
