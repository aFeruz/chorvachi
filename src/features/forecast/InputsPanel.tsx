import { useState, type ReactNode } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useSettings, type T } from '../../state/settings'
import { cx, Field, IconButton, NumInput, Segmented, Toggle } from '../../components/ui'
import type { FarmSource } from '../../lib/forecast/fromFarm'
import type { ForecastInput, HerdInput } from '../../lib/forecast/types'
import { MONTHS_SHORT_RU, MONTHS_SHORT_UZ } from './texts'

type Patch = (p: Partial<ForecastInput>) => void

const sourceLabel = (t: T, s: FarmSource) =>
  ({
    herd: t('hozirgi podangizdan', 'из вашего стада'),
    pregnant: t("qochirish yozuvlaridan", 'из записей о случке'),
    young: t('podangizdagi yoshlardan', 'из молодняка в стаде'),
    lastSale: t('oxirgi sotuvingizdan', 'из последней продажи'),
    feedPrice: t('yem xaridlaringizdan', 'из ваших покупок корма'),
    vet: t('oxirgi 12 oylik vet xarajatidan', 'из ветрасходов за 12 мес.'),
    labor: t("oxirgi 6 oy o'rtachasi", 'среднее за 6 мес.'),
    other: t("oxirgi 6 oy o'rtachasi", 'среднее за 6 мес.'),
    purchase: t('oxirgi xaridingizdan', 'из последней покупки'),
    milk: t('oxirgi sut sotuvidan', 'из последней продажи молока'),
    wool: t('oxirgi jun sotuvidan', 'из последней продажи шерсти'),
    eggs: t('oxirgi tuxum sotuvidan', 'из последней продажи яиц'),
    honey: t('oxirgi asal sotuvidan', 'из последней продажи мёда'),
    pnl: t('fermaning hozirgacha foyda/zarari', 'прибыль/убыток фермы на сегодня'),
  })[s]

export function Fold({ title, sub, icon, children, defaultOpen = false, badge }: { title: string; sub?: string; icon?: ReactNode; children: ReactNode; defaultOpen?: boolean; badge?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        {icon}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-semibold">{title}{badge}</span>
          {sub && <span className="block truncate text-xs text-stone-500">{sub}</span>}
        </span>
        <ChevronDown size={20} className={cx('shrink-0 text-stone-400 transition', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-stone-100 px-4 pt-3 pb-1 dark:border-stone-800">{children}</div>}
    </div>
  )
}

export function InputsPanel({ input, set, sources, missing }: { input: ForecastInput; set: Patch; sources: Partial<Record<string, FarmSource>>; missing: string[] }) {
  const { t, lang } = useSettings()
  const som = t("so'm", 'сум')
  const v = input as unknown as Record<string, number>

  const num = (key: string, label: string, opts: { suffix?: string; hint?: string; decimals?: boolean; required?: boolean } = {}) => {
    const src = sources[key]
    const miss = opts.required && missing.includes(key)
    return (
      <Field
        key={key}
        label={
          <span className="flex items-center gap-1">
            {label}
            {opts.required && <span className="text-red-600">*</span>}
          </span>
        }
        hint={
          miss ? <span className="text-red-600">{t('Kiritilishi kerak', 'Нужно заполнить')}</span>
            : src ? <span className="text-brand-700 dark:text-brand-400">{t('Olingan', 'Взято')}: {sourceLabel(t, src)}</span>
              : opts.hint
        }
        className={cx(miss && '[&_input]:border-red-400')}
      >
        <NumInput value={v[key] || (v[key] === 0 && !opts.required ? 0 : undefined)} onChange={(x) => set({ [key]: x ?? 0 } as Partial<ForecastInput>)} suffix={opts.suffix} decimals={opts.decimals} placeholder={opts.required ? t('kiriting', 'введите') : '0'} />
      </Field>
    )
  }
  const grid = (...children: ReactNode[]) => <div className="grid grid-cols-2 gap-x-3">{children}</div>
  const months = (key: 'pastureMonths' | 'harvestMonths', label: string) => {
    const sel = ((input as unknown as Record<string, number[]>)[key] ?? []) as number[]
    const names = lang === 'ru' ? MONTHS_SHORT_RU : MONTHS_SHORT_UZ
    return (
      <div className="mb-3">
        <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-300">{label}</span>
        <div className="grid grid-cols-6 gap-1">
          {names.map((n, idx) => {
            const m = idx + 1
            const on = sel.includes(m)
            return (
              <button
                key={m}
                type="button"
                onClick={() => set({ [key]: on ? sel.filter((x) => x !== m) : [...sel, m].sort((a, b) => a - b) } as Partial<ForecastInput>)}
                className={cx('h-8 rounded-lg text-xs font-medium', on ? 'bg-brand-600 text-white' : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300')}
              >
                {n}
              </button>
            )
          })}
        </div>
      </div>
    )
  }
  const monthSelect = (key: string, label: string) => {
    const names = lang === 'ru' ? MONTHS_SHORT_RU : MONTHS_SHORT_UZ
    return (
      <Field label={label} key={key}>
        <select
          value={v[key]}
          onChange={(e) => set({ [key]: Number(e.target.value) } as Partial<ForecastInput>)}
          className="h-12 w-full rounded-xl border border-stone-300 bg-white px-3 dark:border-stone-700 dark:bg-stone-900"
        >
          {names.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
        </select>
      </Field>
    )
  }

  const common = (
    <>
      <Fold title={t('Doimiy xarajatlar', 'Постоянные расходы')} sub={t('Ish haqi, elektr, veterinariya', 'Зарплата, электричество, ветеринария')} defaultOpen>
        {grid(
          num('laborMonth', t('Ish haqi / oy', 'Зарплата / мес.'), { suffix: som, hint: t("cho'pon, ishchi", 'пастух, рабочий') }),
          num('otherMonth', t('Boshqa / oy', 'Прочее / мес.'), { suffix: som, hint: t('elektr, suv, ijara, transport', 'свет, вода, аренда, транспорт') }),
          num('vetPerHeadYear', t('Vet: 1 bosh / yil', 'Вет: 1 гол./год'), { suffix: som, hint: t('emlash, dori', 'вакцины, лекарства') }),
          num('setupCost', t('Bino, jihoz (bir marta)', 'Постройки (разово)'), { suffix: som }),
        )}
      </Fold>
      <Fold title={t('Xatarlar va inflyatsiya', 'Риски и инфляция')} sub={t("Kasallik, narx tebranishi, narxlar o'sishi", 'Болезни, колебания и рост цен')}>
        {grid(
          num('diseaseRiskPct', t('Kasallik chiqish ehtimoli', 'Вероятность болезни'), { suffix: t('%/yil', '%/год'), decimals: true }),
          num('diseaseLossPct', t('Kasallikda nobud bo\'ladi', 'Гибель при болезни'), { suffix: '%', decimals: true }),
          num('diseaseCostPerHead', t('Davolash: 1 bosh', 'Лечение: 1 гол.'), { suffix: som }),
          num('priceVolatilityPct', t('Narx tebranishi', 'Колебание цен'), { suffix: '%', decimals: true, hint: t('yildan yilga', 'от года к году') }),
          num('priceGrowthPct', t("Sotish narxi o'sishi", 'Рост цен продажи'), { suffix: t('%/yil', '%/год'), decimals: true }),
          num('costGrowthPct', t("Xarajatlar o'sishi", 'Рост расходов'), { suffix: t('%/yil', '%/год'), decimals: true }),
        )}
      </Fold>
    </>
  )

  const startCash = (
    <Field
      label={t('Hozirgi naqd holat', 'Текущий денежный итог')}
      hint={sources.startCash ? <span className="text-brand-700 dark:text-brand-400">{sourceLabel(t, sources.startCash)}</span> : t("Hozirgacha qilingan foyda (+) yoki sarflangan pul (−). Yangi boshlasangiz — 0", 'Прибыль (+) или вложения (−) на сегодня. Для нового дела — 0')}
    >
      <NumInput value={input.startCash} onChange={(x) => set({ startCash: x ?? 0 })} suffix={som} />
    </Field>
  )

  if (input.model === 'herd') {
    const h = input as HerdInput
    return (
      <>
        <Fold title={t("Boshlang'ich poda", 'Стартовое стадо')} sub={t(`${h.females} ona, ${h.pregnant} bo'g'oz, ${h.males} naslchi`, `${h.females} маток, ${h.pregnant} стельных, ${h.males} произв.`)} defaultOpen>
          {grid(
            num('females', t('Ona hayvonlar', 'Матки'), { suffix: t('bosh', 'гол.') }),
            num('pregnant', t("Ulardan bo'g'oz", 'Из них стельных'), { suffix: t('bosh', 'гол.') }),
            num('dueInMonths', t("Tug'ishiga qolgan", 'До родов'), { suffix: t('oy', 'мес.'), hint: t("o'rtacha", 'в среднем') }),
            num('males', t('Naslchi (erkak)', 'Производители'), { suffix: t('bosh', 'гол.') }),
            num('femaleAgeMonths', t("Onalar o'rtacha yoshi", 'Средний возраст маток'), { suffix: t('oy', 'мес.') }),
          )}
          <YoungEditor input={h} set={set} />
          <Toggle checked={h.buyStart} onChange={(x) => set({ buyStart: x })} label={t('Bu hayvonlar endi sotib olinadi', 'Эти животные покупаются сейчас')} />
          {h.buyStart && grid(
            num('purchasePrice', t('1 ona narxi', 'Цена 1 матки'), { suffix: som, required: true }),
            num('malePrice', t('1 naslchi narxi', 'Цена производителя'), { suffix: som }),
          )}
          {startCash}
        </Fold>
        <Fold title={t('Narxlar', 'Цены')} sub={t('Sotish va yem narxi', 'Цена продажи и корма')} defaultOpen badge={missing.length ? <span className="size-2 rounded-full bg-red-500" /> : undefined}>
          {grid(
            num('salePricePerKg', t('Sotish: 1 kg tirik vazn', 'Продажа: 1 кг живого веса'), { suffix: som, required: true }),
            num('cullPricePerKg', t('Qari ona: 1 kg', 'Выбраковка: 1 кг'), { suffix: som, hint: t('kiritilmasa — sotish narxi', 'если пусто — цена продажи') }),
            num('feedPricePerKg', t('Yem: 1 kg', 'Корм: 1 кг'), { suffix: som, required: true }),
            h.milkLPerDay > 0 && num('milkPricePerL', t('Sut: 1 litr', 'Молоко: 1 л'), { suffix: som, required: true }),
            h.woolKgPerYear > 0 && num('woolPricePerKg', t('Jun: 1 kg', 'Шерсть: 1 кг'), { suffix: som }),
          )}
        </Fold>
        <Fold title={t("Ko'payish va o'sish", 'Воспроизводство и рост')} sub={t(`bo'g'ozlik ${h.gestationMonths} oy, ${h.litterSize} bola, ${h.youngMortalityPct}% o'lim`, `стельность ${h.gestationMonths} мес., ${h.litterSize} приплод, падёж ${h.youngMortalityPct}%`)}>
          {grid(
            num('gestationMonths', t("Bo'g'ozlik", 'Беременность'), { suffix: t('oy', 'мес.'), decimals: true }),
            num('birthIntervalMonths', t("Tug'ishlar orasi", 'Межотельный период'), { suffix: t('oy', 'мес.'), decimals: true }),
            num('litterSize', t("1 tug'ishda bola", 'Приплод за роды'), { decimals: true, hint: t('1,3 = 30% egizak', '1,3 = 30% двоен') }),
            num('conceptionPct', t("Bo'g'oz bo'lish (oyiga)", 'Оплодотворяемость (за цикл)'), { suffix: '%', decimals: true }),
            num('maturityMonths', t('Qochirish yoshi', 'Возраст случки'), { suffix: t('oy', 'мес.') }),
            num('productiveYears', t('Ona necha yil tug\'adi', 'Продуктивных лет'), { suffix: t('yil', 'лет'), decimals: true }),
            num('youngMortalityPct', t("Bolalar o'limi", 'Падёж молодняка'), { suffix: '%', decimals: true }),
            num('adultMortalityPct', t("Kattalar o'limi", 'Падёж взрослых'), { suffix: t('%/yil', '%/год'), decimals: true }),
            num('birthWeightKg', t("Tug'ilgandagi vazn", 'Вес при рождении'), { suffix: 'kg', decimals: true }),
            num('adgKg', t("Kunlik o'sish", 'Суточный привес'), { suffix: 'kg', decimals: true }),
            num('adultWeightKg', t('Katta hayvon vazni', 'Вес взрослого'), { suffix: 'kg', decimals: true }),
          )}
          <Toggle checked={h.useAI} onChange={(x) => set({ useAI: x })} label={t("Sun'iy urug'lantirish (naslchisiz)", 'Искусственное осеменение')} />
          {h.useAI && num('aiCostPerFemale', t('1 urinish narxi', 'Цена 1 осеменения'), { suffix: som })}
          {grid(
            num('milkLPerDay', t('Sut: 1 ona / kun', 'Молоко: 1 матка / день'), { suffix: 'l', decimals: true, hint: t("sog'iladigan bo'lsa", 'если доят') }),
            num('lactationMonths', t("Sog'ish davri", 'Лактация'), { suffix: t('oy', 'мес.') }),
            num('woolKgPerYear', t('Jun: 1 bosh / yil', 'Шерсть: 1 гол./год'), { suffix: 'kg', decimals: true }),
          )}
          {h.woolKgPerYear > 0 && monthSelect('shearMonth', t('Qirqim oyi', 'Месяц стрижки'))}
        </Fold>
        <Fold title={t('Yem', 'Корм')} sub={t(`${h.feedKgPerDay} kg / bosh / kun`, `${h.feedKgPerDay} кг / гол. / день`)}>
          {grid(
            num('feedKgPerDay', t('Katta bosh / kun', 'Взрослый / день'), { suffix: 'kg', decimals: true, hint: t('pichan hisobida', 'в пересчёте на сено') }),
            num('youngFeedFactor', t('Yoshlar koeffitsienti', 'Коэф. молодняка'), { decimals: true, hint: t('0,4 = 40%', '0,4 = 40%') }),
            num('pastureSavingPct', t('Yaylovda tejash', 'Экономия на пастбище'), { suffix: '%', decimals: true }),
          )}
          {months('pastureMonths', t('Yaylov oylari', 'Месяцы пастбища'))}
        </Fold>
        <Fold title={t('Sotish va poda siyosati', 'Политика продаж')} sub={t(`${h.sellAgeMonths} oyligida sotish, ${h.keepFemales ? `${h.maxBreedingFemales} onagacha ko'paytirish` : "urg'ochilar ham sotiladi"}`, `продажа в ${h.sellAgeMonths} мес.`)}>
          {grid(num('sellAgeMonths', t('Bolalarni sotish yoshi', 'Возраст продажи молодняка'), { suffix: t('oy', 'мес.') }))}
          <Toggle checked={h.keepFemales} onChange={(x) => set({ keepFemales: x })} label={t("Urg'ochi bolalarni podada qoldirish", 'Оставлять самок в стаде')} />
          {grid(
            h.keepFemales && num('maxBreedingFemales', t('Onalar soni chegarasi', 'Предел маток'), { suffix: t('bosh', 'гол.') }),
            num('maxHeads', t("Joy sig'imi (jami)", 'Вместимость (всего)'), { suffix: t('bosh', 'гол.'), hint: t('0 = cheklanmagan', '0 = без ограничений') }),
          )}
        </Fold>
        {common}
      </>
    )
  }

  if (input.model === 'batch') {
    const b = input
    return (
      <>
        <Fold title={t('Partiya', 'Партия')} sub={t(`${b.batchSize} bosh, ${b.cycleDays} kun`, `${b.batchSize} гол., ${b.cycleDays} дн.`)} defaultOpen>
          {grid(
            num('batchSize', t('1 partiyada', 'В партии'), { suffix: t('bosh', 'гол.') }),
            num('unitPrice', t('1 bosh narxi', 'Цена 1 гол.'), { suffix: som, required: true, hint: t("jo'ja / chavaq / yosh hayvon", 'цыплёнок / малёк / молодняк') }),
            num('cycleDays', t('Boqish muddati', 'Срок выращивания'), { suffix: t('kun', 'дн.') }),
            num('downtimeDays', t('Partiyalar orasi', 'Перерыв'), { suffix: t('kun', 'дн.'), hint: t('tozalash, dezinfeksiya', 'чистка, дезинфекция') }),
            num('batchCount', t('Partiyalar soni', 'Кол-во партий'), { hint: t('0 = muddat oxirigacha', '0 = до конца срока') }),
            num('otherCostPerBatch', t('Partiya xarajati', 'Расходы на партию'), { suffix: som, hint: t("vaksina, to'shama, isitish", 'вакцины, подстилка, обогрев') }),
          )}
          {startCash}
        </Fold>
        <Fold title={t('Narxlar', 'Цены')} defaultOpen badge={missing.length ? <span className="size-2 rounded-full bg-red-500" /> : undefined}>
          {grid(
            num('salePricePerKg', t('Sotish: 1 kg', 'Продажа: 1 кг'), { suffix: som, required: true }),
            num('feedPricePerKg', t('Yem: 1 kg', 'Корм: 1 кг'), { suffix: som, required: true }),
          )}
        </Fold>
        <Fold title={t("O'sish va yem", 'Рост и корм')} sub={t(`${b.startWeightKg} → ${b.finalWeightKg} kg, o'lim ${b.mortalityPct}%`, `${b.startWeightKg} → ${b.finalWeightKg} кг, падёж ${b.mortalityPct}%`)}>
          {grid(
            num('startWeightKg', t('Boshlang\'ich vazn', 'Начальный вес'), { suffix: 'kg', decimals: true }),
            num('finalWeightKg', t('Sotish vazni', 'Вес при продаже'), { suffix: 'kg', decimals: true }),
            num('mortalityPct', t("O'lim (partiyada)", 'Падёж (за партию)'), { suffix: '%', decimals: true }),
          )}
          <Field label={t('Yem hisobi', 'Расчёт корма')}>
            <Segmented value={b.feedMode} onChange={(x) => set({ feedMode: x })} options={[{ value: 'fcr', label: t('Konversiya (FCR)', 'Конверсия (FCR)') }, { value: 'perDay', label: t('Kunlik me\'yor', 'Суточная норма') }]} />
          </Field>
          {b.feedMode === 'fcr'
            ? num('fcr', t('1 kg vazn uchun yem', 'Корма на 1 кг привеса'), { suffix: 'kg', decimals: true })
            : num('feedKgPerDay', t('1 bosh / kun', '1 гол. / день'), { suffix: 'kg', decimals: true })}
        </Fold>
        <Fold title={t('Kengayish', 'Расширение')} sub={t("Har partiyada ko'paytirish", 'Рост каждой партии')}>
          {grid(
            num('growthPct', t("Har partiyada o'sish", 'Рост партии'), { suffix: '%', decimals: true }),
            num('maxBatchSize', t('Eng katta partiya', 'Макс. партия'), { suffix: t('bosh', 'гол.'), hint: t('0 = cheklanmagan', '0 = без ограничений') }),
          )}
        </Fold>
        {common}
      </>
    )
  }

  if (input.model === 'layer') {
    const l = input
    return (
      <>
        <Fold title={t('Tovuqlar', 'Куры')} sub={t(`${l.flockSize} bosh, ${l.layMonths} oy`, `${l.flockSize} гол., ${l.layMonths} мес.`)} defaultOpen>
          {grid(
            num('flockSize', t('Tovuqlar soni', 'Кол-во кур'), { suffix: t('bosh', 'гол.') }),
            num('pulletPrice', t('1 mola narxi', 'Цена 1 молодки'), { suffix: som, required: l.restock || l.buyStart }),
          )}
          <Toggle checked={l.buyStart} onChange={(x) => set({ buyStart: x, purchasePrice: l.pulletPrice })} label={t('Tovuqlar endi sotib olinadi', 'Куры покупаются сейчас')} />
          {startCash}
        </Fold>
        <Fold title={t('Narxlar', 'Цены')} defaultOpen badge={missing.length ? <span className="size-2 rounded-full bg-red-500" /> : undefined}>
          {grid(
            num('eggPrice', t('1 dona tuxum', '1 яйцо'), { suffix: som, required: true }),
            num('feedPricePerKg', t('Yem: 1 kg', 'Корм: 1 кг'), { suffix: som, required: true }),
            num('spentHenPrice', t('Eski tovuq narxi', 'Цена выбракованной'), { suffix: som }),
          )}
        </Fold>
        <Fold title={t('Tuxum qilish', 'Яйценоскость')} sub={t(`cho'qqi ${l.peakLayPct}%`, `пик ${l.peakLayPct}%`)}>
          {grid(
            num('layMonths', t('Tuxum qilish muddati', 'Продуктивный период'), { suffix: t('oy', 'мес.') }),
            num('peakLayPct', t("Eng yuqori daraja", 'Пик яйценоскости'), { suffix: '%', decimals: true }),
            num('layDeclinePct', t('Oylik pasayish', 'Спад в месяц'), { suffix: '%', decimals: true }),
            num('feedKgPerDay', t('Yem: 1 tovuq / kun', 'Корм: 1 курица / день'), { suffix: 'kg', decimals: true }),
            num('monthlyMortalityPct', t("O'lim / oy", 'Падёж / мес.'), { suffix: '%', decimals: true }),
          )}
          <Toggle checked={l.restock} onChange={(x) => set({ restock: x })} label={t('Muddat tugagach yangi tovuqlar olinadi', 'После периода закупаются новые куры')} />
          {l.restock && num('restockGapMonths', t('Almashtirish tanaffusi', 'Перерыв на обновление'), { suffix: t('oy', 'мес.') })}
        </Fold>
        {common}
      </>
    )
  }

  const a = input
  return (
    <>
      <Fold title={t('Asalari oilalari', 'Пчелосемьи')} sub={t(`${a.colonies} oila`, `${a.colonies} семей`)} defaultOpen>
        {grid(
          num('colonies', t('Oilalar soni', 'Кол-во семей'), { suffix: t('ta', 'шт') }),
          num('maxColonies', t('Eng ko\'p oila', 'Макс. семей'), { suffix: t('ta', 'шт') }),
        )}
        <Toggle checked={a.buyStart} onChange={(x) => set({ buyStart: x })} label={t('Oilalar endi sotib olinadi', 'Семьи покупаются сейчас')} />
        {a.buyStart && num('purchasePrice', t('1 oila narxi', 'Цена 1 семьи'), { suffix: som, required: true })}
        {startCash}
      </Fold>
      <Fold title={t('Narxlar', 'Цены')} defaultOpen badge={missing.length ? <span className="size-2 rounded-full bg-red-500" /> : undefined}>
        {grid(
          num('honeyPricePerKg', t('Asal: 1 kg', 'Мёд: 1 кг'), { suffix: som, required: true }),
          num('waxPricePerKg', t('Mum: 1 kg', 'Воск: 1 кг'), { suffix: som }),
          num('sugarPricePerKg', t('Shakar: 1 kg', 'Сахар: 1 кг'), { suffix: som }),
          num('colonySalePrice', t('1 oila sotish', 'Продажа 1 семьи'), { suffix: som }),
          num('newHiveCost', t('Yangi uya narxi', 'Новый улей'), { suffix: som }),
          num('varroaCostPerColony', t('Davolash: 1 oila / yil', 'Обработка: 1 семья / год'), { suffix: som }),
        )}
      </Fold>
      <Fold title={t('Hosil va oilalar', 'Сбор и семьи')}>
        {grid(
          num('honeyKgPerColony', t('Asal: 1 oila / yil', 'Мёд: 1 семья / год'), { suffix: 'kg', decimals: true }),
          num('waxKgPerColony', t('Mum: 1 oila / yil', 'Воск: 1 семья / год'), { suffix: 'kg', decimals: true }),
          num('splitPct', t("Bahorgi bo'linish", 'Весеннее деление'), { suffix: '%', decimals: true }),
          num('winterLossPct', t('Qishki nobudgarchilik', 'Зимние потери'), { suffix: '%', decimals: true }),
          num('sugarKgPerColony', t('Shakar: 1 oila / yil', 'Сахар: 1 семья / год'), { suffix: 'kg', decimals: true }),
        )}
        {grid(monthSelect('splitMonth', t("Bo'linish oyi", 'Месяц деления')), monthSelect('winterMonth', t('Qishki tekshiruv oyi', 'Месяц зимних потерь')))}
        {months('harvestMonths', t("Asal yig'ish oylari", 'Месяцы медосбора'))}
      </Fold>
      {common}
    </>
  )
}

function YoungEditor({ input, set }: { input: HerdInput; set: Patch }) {
  const { t } = useSettings()
  const list = input.young
  const upd = (idx: number, p: Partial<HerdInput['young'][number]>) => set({ young: list.map((y, k) => (k === idx ? { ...y, ...p } : y)) })
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-stone-600 dark:text-stone-300">{t('Hozirgi bolalar (yoshlar)', 'Текущий молодняк')}</span>
        <button type="button" className="flex items-center gap-1 text-sm font-medium text-brand-700 dark:text-brand-400" onClick={() => set({ young: [...list, { ageMonths: 1, females: 1, males: 1 }] })}>
          <Plus size={16} />
          {t("Qo'shish", 'Добавить')}
        </button>
      </div>
      {list.length === 0 ? (
        <p className="text-xs text-stone-500">{t("Yo'q. Masalan: 1 oylik 2 ta qo'zi bo'lsa, qo'shing.", 'Нет. Например, добавьте 2 ягнят в возрасте 1 мес.')}</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_1fr_2.5rem] gap-2 text-xs text-stone-500">
            <span>{t('Yoshi, oy', 'Возраст, мес.')}</span>
            <span>{t("Urg'ochi", 'Самки')}</span>
            <span>{t('Erkak', 'Самцы')}</span>
            <span />
          </div>
          {list.map((y, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_2.5rem] items-center gap-2">
              <NumInput value={y.ageMonths} onChange={(x) => upd(idx, { ageMonths: x ?? 0 })} />
              <NumInput value={y.females} onChange={(x) => upd(idx, { females: x ?? 0 })} />
              <NumInput value={y.males} onChange={(x) => upd(idx, { males: x ?? 0 })} />
              <IconButton type="button" onClick={() => set({ young: list.filter((_, k) => k !== idx) })} aria-label="remove">
                <Trash2 size={16} className="text-stone-400" />
              </IconButton>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Hisoblash uchun majburiy narx maydonlari */
export function missingFields(i: ForecastInput): string[] {
  const m: string[] = []
  const need = (k: string, cond = true) => {
    if (cond && !((i as unknown as Record<string, number>)[k] > 0)) m.push(k)
  }
  switch (i.model) {
    case 'herd':
      need('salePricePerKg')
      need('feedPricePerKg', i.feedKgPerDay > 0)
      need('milkPricePerL', i.milkLPerDay > 0)
      need('purchasePrice', i.buyStart && i.females > 0)
      break
    case 'batch':
      need('salePricePerKg')
      need('feedPricePerKg')
      need('unitPrice')
      break
    case 'layer':
      need('eggPrice')
      need('feedPricePerKg')
      need('pulletPrice', i.restock || i.buyStart)
      break
    case 'apiary':
      need('honeyPricePerKg')
      need('purchasePrice', i.buyStart)
      break
  }
  return m
}
