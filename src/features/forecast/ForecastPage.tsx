import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Download, Loader2, Printer, Save, Trash2 } from 'lucide-react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, Callout, Card, cx, Field, IconButton, Input, NumInput, Page, Segmented, Sheet, Toggle, useUi } from '../../components/ui'
import { SpeciesIcon } from '../../components/icons'
import { db, uid } from '../../db/db'
import type { ID, Species } from '../../db/types'
import { DEFAULT_GOAL, type Goal, type GoalType } from '../../lib/forecast/analyze'
import { importFromFarm, type FarmSource } from '../../lib/forecast/fromFarm'
import { defaultInput, modelsFor } from '../../lib/forecast/presets'
import type { ForecastInput, ModelKind } from '../../lib/forecast/types'
import { useForecast } from '../../lib/forecast/useForecast'
import { isGoalType, sanitizeGoal, sanitizeInput } from '../../lib/forecast/sanitize'
import { monthKey, today } from '../../lib/dates'
import { InputsPanel, missingFields } from './InputsPanel'
import { ResultsPanel } from './ResultsPanel'
import { GOALS, goalHint, goalLabel, modelHint, modelLabel } from './texts'

/** Faqat narx va doimiy xarajatlar — fermadan avtomatik olinadi (podaning o'zi tugma bilan) */
const PRICE_KEYS = [
  'salePricePerKg', 'cullPricePerKg', 'feedPricePerKg', 'purchasePrice', 'unitPrice', 'milkPricePerL', 'woolPricePerKg',
  'eggPrice', 'honeyPricePerKg', 'laborMonth', 'otherMonth', 'vetPerHeadYear',
]

/** Havola (tur, savol) o'zgarsa sahifa qaytadan boshlanadi */
export default function ForecastRoute() {
  const loc = useLocation()
  return <ForecastPage key={loc.pathname + loc.search} />
}

function ForecastPage() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const f = useFarm()
  const { t, lt, farmId } = useSettings()
  const { toast, confirm } = useUi()
  const nav = useNavigate()

  const speciesList = useMemo(
    () => f.species.filter((s) => s.enabled || f.headsBySpecies.has(s.id)).filter((s) => s.key),
    [f.species, f.headsBySpecies],
  )
  const [speciesId, setSpeciesId] = useState<ID>()
  const [input, setInput] = useState<ForecastInput>()
  const [goal, setGoal] = useState<Goal>(() => {
    const g = sp.get('goal')
    return { ...DEFAULT_GOAL, type: isGoalType(g) ? (g as GoalType) : 'profit' }
  })
  const [sources, setSources] = useState<Partial<Record<string, FarmSource>>>({})
  const [name, setName] = useState('')
  const [tab, setTab] = useState<'inputs' | 'results'>('inputs')
  const [importOpen, setImportOpen] = useState(false)
  const [includePast, setIncludePast] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const loaded = useRef(false)

  const species = speciesId ? f.speciesMap.get(speciesId) : undefined
  const startMonth = monthKey(today())

  const fresh = (s: Species | undefined, model?: ModelKind): { input: ForecastInput; sources: Partial<Record<string, FarmSource>> } => {
    const m = model ?? modelsFor(s?.key)[0]
    const base = defaultInput(m, s?.key, startMonth)
    if (!s) return { input: base, sources: {} }
    const imp = importFromFarm(f, s.id, base, false)
    const patch: Record<string, unknown> = {}
    const src: Record<string, FarmSource> = {}
    for (const k of PRICE_KEYS)
      if (k in imp.patch) {
        patch[k] = (imp.patch as Record<string, unknown>)[k]
        if (imp.sources[k]) src[k] = imp.sources[k]!
      }
    return { input: { ...base, ...patch } as ForecastInput, sources: src }
  }

  // Boshlang'ich holat: saqlangan reja yoki yangi
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    if (id) {
      db.plans.get(id).then((p) => {
        if (!p) return nav('/forecast', { replace: true })
        setSpeciesId(p.speciesId)
        // eski rejalarda keyin qo'shilgan maydonlar bo'lmasligi mumkin — standart qiymatlar bilan to'ldiramiz
        const saved = p.input as ForecastInput
        const key = f.speciesMap.get(p.speciesId)?.key
        setInput(sanitizeInput(saved, defaultInput(saved.model ?? modelsFor(key)[0], key, startMonth)))
        setGoal(sanitizeGoal(p.goal as Goal))
        setName(p.name)
        setTab('results')
      })
      return
    }
    const want = sp.get('species')
    const s =
      speciesList.find((x) => x.id === want) ??
      speciesList.find((x) => f.headsBySpecies.has(x.id) && x.mode === 'individual') ??
      speciesList.find((x) => x.key === 'sheep') ??
      speciesList[0]
    setSpeciesId(s?.id)
    const fr = fresh(s)
    setInput(fr.input)
    setSources(fr.sources)
    setGoal((g) => ({ ...g, heads: suggestHeads(fr.input) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const set = (p: Partial<ForecastInput>) =>
    setInput((cur) => {
      if (!cur) return cur
      const next = { ...cur, ...p } as ForecastInput
      // tuxum tovuq: mola narxi ham boshlang'ich xarid narxi
      if (next.model === 'layer' && 'pulletPrice' in p) next.purchasePrice = next.pulletPrice
      // herd: onalar soni qo'lda o'zgartirilsa, fermadan olingan yosh guruhlari bekor qilinadi
      if (next.model === 'herd' && 'females' in p) next.femaleGroups = undefined
      return next
    })

  // hisob-kitob doim tozalangan nusxa bilan (yozish paytida maydonlar o'zgarib ketmaydi)
  const defaults = useMemo(() => (input ? defaultInput(input.model, species?.key, startMonth) : undefined), [input?.model, species?.key, startMonth])
  const clean = useMemo(() => (input && defaults ? sanitizeInput(input, defaults) : undefined), [input, defaults])
  const cleanGoal = useMemo(() => sanitizeGoal(goal), [goal])
  const missing = clean ? missingFields(clean) : []
  const { result, needs, busy, error } = useForecast(clean, cleanGoal)

  const chooseSpecies = (s: Species) => {
    setSpeciesId(s.id)
    const fr = fresh(s)
    setInput({ ...fr.input, months: input?.months ?? fr.input.months })
    setSources(fr.sources)
    setGoal((g) => ({ ...g, heads: suggestHeads(fr.input) }))
  }
  const chooseModel = (m: ModelKind) => {
    const fr = fresh(species, m)
    setInput({ ...fr.input, months: input?.months ?? fr.input.months })
    setSources(fr.sources)
    setGoal((g) => ({ ...g, heads: suggestHeads(fr.input) }))
  }

  const applyFarm = () => {
    if (!input || !speciesId) return
    const imp = importFromFarm(f, speciesId, input, includePast)
    const next = { ...input, ...imp.patch } as ForecastInput
    setInput(next)
    setSources({ ...sources, ...imp.sources })
    setGoal((g) => ({ ...g, heads: suggestHeads(next) }))
    setImportOpen(false)
    toast(t("Fermangiz ma'lumotlari olindi", 'Данные фермы загружены'))
  }

  const save = async () => {
    if (!input || !speciesId) return
    const now = Date.now()
    const pid = id ?? uid()
    const existing = id ? await db.plans.get(id) : undefined
    await db.plans.put({
      id: pid, farmId, name: name.trim() || defaultName(), speciesId, input, goal, createdAt: existing?.createdAt ?? now, updatedAt: now,
    })
    setSaveOpen(false)
    toast(t('Reja saqlandi', 'План сохранён'))
    if (!id) nav('/forecast/' + pid, { replace: true })
  }
  const defaultName = () => `${lt(species?.name)} — ${goalLabel(t, goal.type).replace('?', '')}`

  const remove = async () => {
    if (!id) return
    const ok = await confirm({ title: t("Rejani o'chirasizmi?", 'Удалить план?'), ok: t("O'chirish", 'Удалить'), danger: true })
    if (!ok) return
    await db.plans.delete(id)
    nav('/forecast', { replace: true })
  }

  const exportCsv = async () => {
    if (!result) return
    const head = ['oy', 'sana', 'bosh', 'onalar', "tug'ildi", 'sotildi', "o'ldi", 'tushum', 'xarajat', 'sof', 'naqd', 'poda_qiymati']
    const lines = result.expected.rows.map((r) =>
      [r.m, r.month, r.heads.toFixed(1), r.core.toFixed(1), r.born.toFixed(1), r.sold.toFixed(1), r.died.toFixed(1), Math.round(r.revenue), Math.round(r.cost), Math.round(r.net), Math.round(r.cash), Math.round(r.herdValue)].join(','),
    )
    const { saveFile } = await import('../../lib/native')
    await saveFile(`prognoz-${today()}.csv`, [head.join(','), ...lines].join('\n'), 'text/csv')
  }

  if (!input) return <Page back title={t('Prognoz', 'Прогноз')}><div className="py-20 text-center text-stone-500">…</div></Page>

  const models = modelsFor(species?.key)
  const goalParams = (
    <>
      {goal.type === 'heads' && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label={t('Nechta boshga?', 'Сколько голов?')} className="mb-0">
            <NumInput value={goal.heads} onChange={(v) => setGoal({ ...goal, heads: v ?? 0 })} suffix={input.model === 'apiary' ? t('oila', 'сем.') : t('bosh', 'гол.')} />
          </Field>
          {input.model === 'herd' && (
            <Field label={t('Nimani sanaymiz', 'Что считаем')} className="mb-0">
              <Segmented value={goal.headsMetric} onChange={(v) => setGoal({ ...goal, headsMetric: v })} options={[{ value: 'total', label: t('Jami', 'Всего') }, { value: 'core', label: t('Onalar', 'Матки') }]} />
            </Field>
          )}
        </div>
      )}
      {(goal.type === 'cash' || goal.type === 'monthly') && (
        <Field label={goal.type === 'cash' ? t("Qancha sof foyda?", 'Сколько чистой прибыли?') : t('Oyiga qancha?', 'Сколько в месяц?')} className="mt-3 mb-0">
          <NumInput value={goal.amount} onChange={(v) => setGoal({ ...goal, amount: v ?? 0 })} suffix={t("so'm", 'сум')} />
        </Field>
      )}
      {goal.type === 'need' && (
        <div className="mt-3">
          <Segmented className="mb-3" value={goal.needKind} onChange={(v) => setGoal({ ...goal, needKind: v })} options={[{ value: 'heads', label: t('Bosh soni', 'Поголовье') }, { value: 'cash', label: t('Pul', 'Деньги') }]} />
          <div className="grid grid-cols-2 gap-3">
            {goal.needKind === 'heads' ? (
              <Field label={t('Nechta boshga', 'Сколько голов')} className="mb-0">
                <NumInput value={goal.heads} onChange={(v) => setGoal({ ...goal, heads: v ?? 0 })} />
              </Field>
            ) : (
              <Field label={t("Qancha so'm", 'Сколько сум')} className="mb-0">
                <NumInput value={goal.amount} onChange={(v) => setGoal({ ...goal, amount: v ?? 0 })} />
              </Field>
            )}
            <Field label={t('Necha oyda', 'За сколько месяцев')} className="mb-0">
              <NumInput
                value={goal.byMonth}
                onChange={(v) => {
                  setGoal({ ...goal, byMonth: v ?? 0 })
                  if ((v ?? 0) > input.months && (v ?? 0) <= 120) set({ months: v })
                }}
                suffix={t('oy', 'мес.')}
              />
            </Field>
          </div>
        </div>
      )}
    </>
  )

  const top = (
    <>
      {/* Tur va model */}
      <div className="no-scrollbar -mx-3 mb-3 flex gap-2 overflow-x-auto px-3">
        {speciesList.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => chooseSpecies(s)}
            className={cx(
              'flex h-10 shrink-0 items-center gap-2 rounded-xl border-2 px-3 text-sm font-medium transition',
              s.id === speciesId ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200' : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900',
            )}
          >
            <SpeciesIcon s={s} size={18} />
            {lt(s.name)}
          </button>
        ))}
      </div>
      {models.length > 1 && (
        <div className="mb-3">
          <Segmented value={input.model} onChange={chooseModel} options={models.map((m) => ({ value: m, label: modelLabel(t, m) }))} />
          <p className="mt-1 px-1 text-xs text-stone-500">{modelHint(t, input.model)}</p>
        </div>
      )}

      {/* Savol */}
      <Card className="mb-3">
        <div className="mb-2 text-sm font-semibold">{t('Nimani bilmoqchisiz?', 'Что хотите узнать?')}</div>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGoal({ ...goal, type: g })}
              className={cx(
                'rounded-xl border px-3 py-2 text-left text-sm transition',
                goal.type === g ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800',
              )}
            >
              {goalLabel(t, g)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-500">{goalHint(t, goal.type)}</p>
        {goalParams}
        <Field label={t('Hisob muddati', 'Срок расчёта')} className="mt-3 mb-0">
          <div className="flex gap-2">
            <NumInput className="w-28" value={input.months} onChange={(v) => set({ months: v ?? 0 })} suffix={t('oy', 'мес.')} />
            <div className="no-scrollbar flex flex-1 gap-1 overflow-x-auto">
              {[12, 24, 36, 60, 120].map((m) => (
                <button key={m} type="button" onClick={() => set({ months: m })} className={cx('h-12 shrink-0 rounded-xl px-3 text-sm', input.months === m ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900' : 'bg-stone-100 dark:bg-stone-800')}>
                  {m >= 12 ? t(`${m / 12} yil`, `${m / 12} г.`) : m}
                </button>
              ))}
            </div>
          </div>
        </Field>
        {(input.months < 6 || input.months > 120) && (
          <p className="mt-1 px-1 text-xs text-amber-600">{t(`Muddat 6–120 oy bo'lishi kerak; hisob ${clean?.months} oy bilan qilinmoqda`, `Срок 6–120 мес.; расчёт идёт на ${clean?.months} мес.`)}</p>
        )}
      </Card>
    </>
  )

  const inputsPane = (
    <div>
      {species && (f.headsBySpecies.get(species.id) ?? 0) > 0 && (
        <Button variant="soft" full className="mb-3" icon={<Download size={18} />} onClick={() => setImportOpen(true)}>
          {t(`Hozirgi podam bilan hisoblash (${f.headsBySpecies.get(species.id)} bosh)`, `Считать с моим стадом (${f.headsBySpecies.get(species.id)} гол.)`)}
        </Button>
      )}
      <InputsPanel input={input} set={set} sources={sources} missing={missing} />
    </div>
  )

  const resultsPane = (
    <div className="relative">
      {busy && (
        <div className="no-print sticky top-16 z-10 mb-2 flex justify-center">
          <span className="flex items-center gap-2 rounded-full bg-stone-900 px-3 py-1.5 text-xs text-white shadow dark:bg-stone-100 dark:text-stone-900">
            <Loader2 size={14} className="animate-spin" />
            {t('Hisoblanmoqda…', 'Считаем…')}
          </span>
        </div>
      )}
      {error && <Callout tone="bad">{error}</Callout>}
      {result ? (
        <div className={cx('transition-opacity', busy && 'opacity-60')}>
          <ResultsPanel input={clean ?? input} goal={cleanGoal} result={result} needs={needs} missing={missing} speciesKey={species?.key} />
        </div>
      ) : (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-600" /></div>
      )}
    </div>
  )

  return (
    <Page
      back="/forecast"
      wide
      title={name || t('Yangi prognoz', 'Новый прогноз')}
      actions={
        <>
          <IconButton onClick={exportCsv} aria-label="csv" disabled={!result}><Download size={20} /></IconButton>
          <IconButton onClick={() => window.print()} aria-label="print"><Printer size={20} /></IconButton>
          {id && <IconButton onClick={remove} aria-label="delete"><Trash2 size={20} className="text-red-600" /></IconButton>}
          <Button size="sm" onClick={() => setSaveOpen(true)} icon={<Save size={16} />}>{t('Saqlash', 'Сохранить')}</Button>
        </>
      }
    >
      {top}
      <Segmented
        className="no-print sticky top-[calc(env(safe-area-inset-top)+3.6rem)] z-10 mb-3 shadow-sm lg:hidden"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'inputs', label: <span className="flex items-center justify-center gap-1.5">{t("Ma'lumotlar", 'Данные')}{missing.length > 0 && <span className="size-2 rounded-full bg-red-500" />}</span> },
          { value: 'results', label: <span className="flex items-center justify-center gap-1.5">{t('Natija', 'Результат')}{busy && <Loader2 size={14} className="animate-spin" />}</span> },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,400px)_1fr]">
        <div className={cx(tab !== 'inputs' && 'hidden lg:block', 'no-print min-w-0')}>
          {inputsPane}
          <Button full className="mt-1 mb-6 lg:hidden" size="lg" onClick={() => { setTab('results'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
            {t("Natijani ko'rish", 'Показать результат')}
          </Button>
        </div>
        <div className={cx(tab !== 'results' && 'hidden lg:block', 'min-w-0')}>{resultsPane}</div>
      </div>

      <Sheet open={importOpen} onClose={() => setImportOpen(false)} title={t("Fermadan ma'lumot olish", 'Данные из фермы')}>
        <p className="mb-3 text-sm text-stone-600 dark:text-stone-300">
          {t(
            "Hozirgi podangiz (onalar, naslchilar, bolalar yoshi bilan, bo'g'ozlar), narxlar va oylik xarajatlaringiz olinadi.",
            'Будут взяты текущее стадо (матки, производители, молодняк по возрасту, стельные), цены и месячные расходы.',
          )}
        </p>
        <Toggle checked={includePast} onChange={setIncludePast} label={t("Hozirgacha sarflangan pul va daromadni ham hisobga olish («qachon qoplayman» savoli uchun)", 'Учитывать уже вложенные деньги и доходы (для вопроса «когда окуплюсь»)')} />
        <Button full onClick={applyFarm}>{t('Olish', 'Загрузить')}</Button>
      </Sheet>

      <Sheet open={saveOpen} onClose={() => setSaveOpen(false)} title={t('Rejani saqlash', 'Сохранить план')}>
        <Field label={t('Nomi', 'Название')}>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={defaultName()} />
        </Field>
        <Button full onClick={save}>{t('Saqlash', 'Сохранить')}</Button>
      </Sheet>
    </Page>
  )
}

/** Standart maqsad: hozirgi bosh sonining taxminan 2 barobari (yaxlit son) */
function suggestHeads(i: ForecastInput): number {
  const now =
    i.model === 'herd' ? i.females + i.males + i.young.reduce((a, y) => a + y.females + y.males, 0)
      : i.model === 'batch' ? i.batchSize
        : i.model === 'layer' ? i.flockSize
          : i.colonies
  const target = Math.max(10, now * 2)
  const step = target > 1000 ? 500 : target > 100 ? 50 : target > 20 ? 10 : 5
  return Math.ceil(target / step) * step
}
