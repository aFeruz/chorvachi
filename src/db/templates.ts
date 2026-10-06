import type { HealthType, LText } from './types'

/**
 * Tur bo'yicha tayyor shablonlar: "Avtomatik sozlash" sahifasi foydalanuvchi tanlagan
 * turlar uchun shulardan kategoriya, yem, ratsion va emlash eslatmalarini taklif qiladi.
 * Narxlar va me'yorlar taxminiy — foydalanuvchi keyin o'zgartiradi.
 */

export interface TplCategory {
  key: string
  name: LText
  color: string
}

export interface TplFeed {
  key: string
  name: LText
  unit: string
  price: number // 1 birlik uchun taxminiy narx, so'm
  perHeadDay?: number // 1 bosh uchun kunlik taxminiy me'yor
}

export interface TplHealth {
  key: string
  type: HealthType
  title: LText
  inDays: number // bugundan necha kundan keyin eslatma
}

export interface SpeciesTemplate {
  expense: TplCategory[]
  income: TplCategory[]
  feeds: TplFeed[]
  health: TplHealth[]
}

const L = (uz: string, ru: string): LText => ({ uz, ru })

// Bir nechta turda takrorlanadigan yemlar
const HAY: TplFeed = { key: 'hay', name: L('Beda pichani', 'Сено люцерны'), unit: 'kg', price: 2_000 }
const STRAW: TplFeed = { key: 'straw', name: L('Somon', 'Солома'), unit: 'kg', price: 800 }
const BARLEY: TplFeed = { key: 'barley', name: L('Arpa', 'Ячмень'), unit: 'kg', price: 3_500 }
const CORN: TplFeed = { key: 'corn', name: L("Makkajo'xori doni", 'Кукуруза (зерно)'), unit: 'kg', price: 3_800 }
const BRAN: TplFeed = { key: 'bran', name: L('Kepak', 'Отруби'), unit: 'kg', price: 2_500 }
const SALT: TplFeed = { key: 'salt', name: L("Tuz (yalama)", 'Соль-лизунец'), unit: 'kg', price: 2_000 }
const SILAGE: TplFeed = { key: 'silage', name: L('Silos', 'Силос'), unit: 'kg', price: 600 }
const CATTLE_MIX: TplFeed = { key: 'cattle_mix', name: L('Omuxta yem (qoramol)', 'Комбикорм для КРС'), unit: 'kg', price: 4_500 }
const OILCAKE: TplFeed = { key: 'oilcake', name: L('Kunjara / shrot', 'Жмых / шрот'), unit: 'kg', price: 4_000 }
const POULTRY_MIX: TplFeed = { key: 'poultry_mix', name: L('Parranda omuxta yemi', 'Комбикорм для птицы'), unit: 'kg', price: 6_000 }

const f = (base: TplFeed, perHeadDay?: number): TplFeed => ({ ...base, perHeadDay })

export const TEMPLATES: Record<string, SpeciesTemplate> = {
  sheep: {
    expense: [
      { key: 'shearing', name: L("Qirqim (jun olish)", 'Стрижка'), color: '#a8a29e' },
      { key: 'hoof', name: L('Tuyoq parvarishi', 'Обработка копыт'), color: '#78716c' },
      { key: 'dipping', name: L("Cho'miltirish (qo'tirga qarshi)", 'Купание (от чесотки)'), color: '#0891b2' },
      { key: 'pasture', name: L('Yaylov / cho\'pon xizmati', 'Пастбище / услуги пастуха'), color: '#4d7c0f' },
    ],
    income: [
      { key: 'lamb_sale', name: L("Qo'zi sotish", 'Продажа ягнят'), color: '#16a34a' },
      { key: 'kurban', name: L("Qurbonlik uchun sotish", 'Продажа на Курбан-байрам'), color: '#15803d' },
    ],
    feeds: [f(HAY, 1.5), f(BARLEY, 0.3), f(SALT, 0.01)],
    health: [
      { key: 'fmd', type: 'vaccine', title: L('Oqsil (yashur)ga qarshi emlash', 'Вакцинация от ящура'), inDays: 14 },
      { key: 'entero', type: 'vaccine', title: L('Enterotoksemiyaga qarshi emlash', 'Вакцинация от энтеротоксемии'), inDays: 21 },
      { key: 'deworm', type: 'deworm', title: L('Gijjaga qarshi ishlov', 'Дегельминтизация'), inDays: 7 },
      { key: 'shear', type: 'other', title: L("Qirqim (bahorgi)", 'Весенняя стрижка'), inDays: 60 },
    ],
  },
  goat: {
    expense: [
      { key: 'hoof', name: L('Tuyoq parvarishi', 'Обработка копыт'), color: '#78716c' },
      { key: 'milking', name: L("Sog'ish jihozlari va idishlar", 'Доильное оборудование'), color: '#0284c7' },
    ],
    income: [
      { key: 'kid_sale', name: L('Uloq sotish', 'Продажа козлят'), color: '#16a34a' },
      { key: 'goat_milk', name: L('Echki suti', 'Козье молоко'), color: '#0ea5e9' },
      { key: 'cashmere', name: L('Tivit', 'Пух (кашемир)'), color: '#a3a3a3' },
    ],
    feeds: [f(HAY, 1.2), f(BARLEY, 0.25), f(SALT, 0.01)],
    health: [
      { key: 'fmd', type: 'vaccine', title: L('Oqsil (yashur)ga qarshi emlash', 'Вакцинация от ящура'), inDays: 14 },
      { key: 'deworm', type: 'deworm', title: L('Gijjaga qarshi ishlov', 'Дегельминтизация'), inDays: 7 },
    ],
  },
  cattle: {
    expense: [
      { key: 'milking', name: L("Sog'ish jihozlari va idishlar", 'Доильное оборудование'), color: '#0284c7' },
      { key: 'silage_making', name: L('Silos tayyorlash', 'Заготовка силоса'), color: '#84cc16' },
      { key: 'mastitis', name: L('Mastitga qarshi dorilar', 'Препараты от мастита'), color: '#e11d48' },
      { key: 'hoof', name: L('Tuyoq parvarishi', 'Обработка копыт'), color: '#78716c' },
    ],
    income: [
      { key: 'calf_sale', name: L('Buzoq sotish', 'Продажа телят'), color: '#16a34a' },
      { key: 'dairy', name: L("Qaymoq, sariyog', suzma", 'Сметана, масло, творог'), color: '#facc15' },
    ],
    feeds: [f(HAY, 8), f(SILAGE, 10), f(STRAW, 3), f(CATTLE_MIX, 3), f(OILCAKE, 1), f(SALT, 0.05)],
    health: [
      { key: 'fmd', type: 'vaccine', title: L('Oqsil (yashur)ga qarshi emlash', 'Вакцинация от ящура'), inDays: 14 },
      { key: 'anthrax', type: 'vaccine', title: L('Kuydirgiga qarshi emlash', 'Вакцинация от сибирской язвы'), inDays: 30 },
      { key: 'brucella', type: 'checkup', title: L('Brutsellyoz tekshiruvi', 'Исследование на бруцеллёз'), inDays: 45 },
      { key: 'deworm', type: 'deworm', title: L('Gijjaga qarshi ishlov', 'Дегельминтизация'), inDays: 10 },
    ],
  },
  horse: {
    expense: [
      { key: 'shoeing', name: L('Taqa qoqish', 'Ковка'), color: '#57534e' },
      { key: 'tack', name: L('Egar-jabduq', 'Упряжь, седло'), color: '#92400e' },
    ],
    income: [
      { key: 'foal_sale', name: L('Toy sotish', 'Продажа жеребят'), color: '#16a34a' },
      { key: 'kumis', name: L('Qimiz', 'Кумыс'), color: '#0ea5e9' },
      { key: 'riding', name: L('Ot xizmati (sayr, ish)', 'Услуги лошади'), color: '#c026d3' },
    ],
    feeds: [f(HAY, 7), f(BARLEY, 3), f(SALT, 0.05)],
    health: [
      { key: 'deworm', type: 'deworm', title: L('Gijjaga qarshi ishlov', 'Дегельминтизация'), inDays: 10 },
      { key: 'teeth', type: 'checkup', title: L("Tish ko'rigi", 'Осмотр зубов'), inDays: 60 },
    ],
  },
  camel: {
    expense: [{ key: 'camel_care', name: L('Tuya parvarishi', 'Уход за верблюдами'), color: '#b45309' }],
    income: [
      { key: 'shubat', name: L('Shubat (tuya suti)', 'Шубат (верблюжье молоко)'), color: '#0ea5e9' },
      { key: 'camel_wool', name: L('Tuya juni', 'Верблюжья шерсть'), color: '#a3a3a3' },
    ],
    feeds: [f(HAY, 8), f(STRAW, 4), f(SALT, 0.08)],
    health: [{ key: 'deworm', type: 'deworm', title: L('Gijjaga qarshi ishlov', 'Дегельминтизация'), inDays: 10 }],
  },
  rabbit: {
    expense: [
      { key: 'cages', name: L('Kataklar va oziqlantirgichlar', 'Клетки и кормушки'), color: '#475569' },
      { key: 'young_rabbits', name: L('Yosh quyon (nasl) sotib olish', 'Покупка племенных кроликов'), color: '#7c3aed' },
    ],
    income: [
      { key: 'rabbit_meat', name: L("Quyon go'shti", 'Крольчатина'), color: '#b91c1c' },
      { key: 'rabbit_breed', name: L('Nasl quyon sotish', 'Продажа племенных кроликов'), color: '#16a34a' },
    ],
    feeds: [
      f({ key: 'rabbit_pellet', name: L('Quyon granula yemi', 'Гранулы для кроликов'), unit: 'kg', price: 5_000 }, 0.15),
      f(HAY, 0.1),
    ],
    health: [
      { key: 'myxo', type: 'vaccine', title: L('Miksomatozga qarshi emlash', 'Вакцинация от миксоматоза'), inDays: 14 },
      { key: 'vhd', type: 'vaccine', title: L('VGBKga qarshi emlash', 'Вакцинация от ВГБК'), inDays: 21 },
    ],
  },
  broiler: {
    expense: [
      { key: 'chicks', name: L("Jo'ja sotib olish", 'Покупка цыплят'), color: '#7c3aed' },
      { key: 'heating', name: L('Isitish', 'Обогрев'), color: '#f97316' },
      { key: 'lighting', name: L('Yoritish', 'Освещение'), color: '#eab308' },
      { key: 'litter', name: L("To'shama (qipiq)", 'Подстилка (опилки)'), color: '#a8a29e' },
    ],
    income: [{ key: 'chicken_meat', name: L("Tovuq go'shti", 'Мясо птицы'), color: '#b91c1c' }],
    feeds: [
      f({ key: 'broiler_start', name: L('Broyler start yemi', 'Бройлер старт'), unit: 'kg', price: 7_500 }, 0.05),
      f({ key: 'broiler_grow', name: L("Broyler o'sish yemi", 'Бройлер рост'), unit: 'kg', price: 6_800 }, 0.12),
    ],
    health: [
      { key: 'nd', type: 'vaccine', title: L('Nyukaslga qarshi emlash (7-kun)', 'Вакцинация от Ньюкасла (7 день)'), inDays: 7 },
      { key: 'ibd', type: 'vaccine', title: L('Gumboroga qarshi emlash (14-kun)', 'Вакцинация от Гамборо (14 день)'), inDays: 14 },
      { key: 'nd2', type: 'vaccine', title: L('Nyukasl qayta emlash (21-kun)', 'Ревакцинация Ньюкасл (21 день)'), inDays: 21 },
    ],
  },
  layer: {
    expense: [
      { key: 'pullets', name: L('Yosh tovuq (mola) sotib olish', 'Покупка молодок'), color: '#7c3aed' },
      { key: 'egg_trays', name: L('Tuxum lotoklari, qadoq', 'Лотки и упаковка для яиц'), color: '#ca8a04' },
      { key: 'lighting', name: L('Yoritish', 'Освещение'), color: '#eab308' },
    ],
    income: [{ key: 'spent_hens', name: L('Yaroqsiz tovuqlarni sotish', 'Продажа выбракованных кур'), color: '#b91c1c' }],
    feeds: [f({ key: 'layer_feed', name: L('Tuxum tovuq yemi', 'Корм для несушек'), unit: 'kg', price: 5_500 }, 0.12)],
    health: [
      { key: 'nd', type: 'vaccine', title: L('Nyukaslga qarshi emlash', 'Вакцинация от Ньюкасла'), inDays: 14 },
      { key: 'ib', type: 'vaccine', title: L('Bronxitga qarshi emlash', 'Вакцинация от бронхита'), inDays: 28 },
    ],
  },
  turkey: {
    expense: [
      { key: 'poults', name: L("Kurka jo'jasi sotib olish", 'Покупка индюшат'), color: '#7c3aed' },
      { key: 'heating', name: L('Isitish', 'Обогрев'), color: '#f97316' },
    ],
    income: [{ key: 'turkey_meat', name: L("Kurka go'shti", 'Мясо индейки'), color: '#b91c1c' }],
    feeds: [f(POULTRY_MIX, 0.3), f(CORN, 0.05)],
    health: [{ key: 'nd', type: 'vaccine', title: L('Nyukaslga qarshi emlash', 'Вакцинация от Ньюкасла'), inDays: 14 }],
  },
  duck: {
    expense: [{ key: 'ducklings', name: L("O'rdak/g'oz bolasi sotib olish", 'Покупка утят / гусят'), color: '#7c3aed' }],
    income: [
      { key: 'duck_meat', name: L("O'rdak/g'oz go'shti", 'Мясо утки / гуся'), color: '#b91c1c' },
      { key: 'down', name: L('Par', 'Пух и перо'), color: '#e7e5e4' },
    ],
    feeds: [f(POULTRY_MIX, 0.2), f(BRAN, 0.05)],
    health: [{ key: 'deworm', type: 'deworm', title: L('Gijjaga qarshi ishlov', 'Дегельминтизация'), inDays: 21 }],
  },
  fish: {
    expense: [
      { key: 'fingerlings', name: L('Chavaq (baliq bolasi)', 'Мальки'), color: '#7c3aed' },
      { key: 'pond', name: L('Hovuz ijarasi va tozalash', 'Аренда и чистка пруда'), color: '#0e7490' },
      { key: 'aeration', name: L('Aeratsiya (havo berish)', 'Аэрация'), color: '#0ea5e9' },
    ],
    income: [
      { key: 'fish_sale', name: L('Baliq sotish', 'Продажа рыбы'), color: '#16a34a' },
      { key: 'fingerling_sale', name: L('Chavaq sotish', 'Продажа мальков'), color: '#15803d' },
    ],
    feeds: [f({ key: 'fish_feed', name: L('Baliq yemi', 'Корм для рыбы'), unit: 'kg', price: 9_000 }, 0.02)],
    health: [{ key: 'pond_disinfect', type: 'other', title: L('Hovuzni dezinfeksiya qilish', 'Дезинфекция пруда'), inDays: 30 }],
  },
  bee: {
    expense: [
      { key: 'frames', name: L('Ramka va mum asos', 'Рамки и вощина'), color: '#ca8a04' },
      { key: 'sugar', name: L('Qand sharbati (oziqlantirish)', 'Сахарный сироп (подкормка)'), color: '#f59e0b' },
      { key: 'varroa', name: L('Varroatozga qarshi dori', 'Препараты от варроатоза'), color: '#e11d48' },
      { key: 'migration', name: L("Ko'chirish (ko'chma asalarichilik)", 'Кочёвка пасеки'), color: '#64748b' },
      { key: 'queens', name: L('Ona ari sotib olish', 'Покупка маток'), color: '#7c3aed' },
    ],
    income: [
      { key: 'wax', name: L('Mum', 'Воск'), color: '#eab308' },
      { key: 'propolis', name: L('Propolis', 'Прополис'), color: '#92400e' },
      { key: 'colony_sale', name: L('Asalari oilasi sotish', 'Продажа пчелосемей'), color: '#16a34a' },
    ],
    feeds: [{ key: 'bee_sugar', name: L('Shakar (oziqlantirish uchun)', 'Сахар для подкормки'), unit: 'kg', price: 14_000 }],
    health: [
      { key: 'varroa', type: 'treatment', title: L('Varroatozga qarshi ishlov', 'Обработка от варроатоза'), inDays: 30 },
      { key: 'winter', type: 'checkup', title: L("Qishlashga tayyorlash ko'rigi", 'Осмотр перед зимовкой'), inDays: 60 },
    ],
  },
}

/** Har qanday ferma uchun foydali umumiy kategoriyalar */
export const COMMON_TEMPLATE: Pick<SpeciesTemplate, 'expense' | 'income'> = {
  expense: [
    { key: 'phone', name: L('Aloqa va internet', 'Связь и интернет'), color: '#6366f1' },
    { key: 'repairs', name: L("Qo'ra / ogʻil ta'miri", 'Ремонт загонов'), color: '#78716c' },
    { key: 'security', name: L("Qo'riqlash", 'Охрана'), color: '#334155' },
  ],
  income: [{ key: 'rent_out', name: L('Ijaraga berish (texnika, yaylov)', 'Сдача в аренду'), color: '#0d9488' }],
}

/** Kategoriya id'si: shablon kaliti bo'yicha barqaror, takror qo'shilmaydi */
export const tplCategoryId = (kind: 'expense' | 'income', key: string) => (kind === 'expense' ? 'ex_' : 'in_') + 'tpl_' + key
