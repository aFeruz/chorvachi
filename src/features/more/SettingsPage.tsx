import { useEffect } from 'react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, Card, Field, List, NumInput, Page, Section, Segmented, Toggle } from '../../components/ui'
import type { Lang, Settings } from '../../db/types'
import { SpeciesAvatar } from '../../components/icons'
import { formatDate } from '../../lib/dates'
import { useLock } from '../../state/lock'
import { ShieldCheck, ShieldOff } from 'lucide-react'

export function SettingsPage() {
  const { t, lt, settings, update, money } = useSettings()
  const f = useFarm()
  const { hasPin, openPinSetup } = useLock()
  useEffect(() => {
    if (window.location.hash.includes('prices')) setTimeout(() => document.getElementById('prices')?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [])
  const used = f.species.filter((s) => s.enabled || f.headsBySpecies.has(s.id))
  const setPrice = (sid: string, k: 'perKg' | 'perHead', v?: number) =>
    update({ marketPrices: { ...settings.marketPrices, [sid]: { ...settings.marketPrices[sid], [k]: v } } })

  return (
    <Page back title={t('Sozlamalar', 'Настройки')}>
      <Section title={t('Til', 'Язык')}>
        <Segmented value={settings.lang} onChange={(l: Lang) => update({ lang: l })} options={[{ value: 'uz', label: "O'zbekcha" }, { value: 'ru', label: 'Русский' }]} />
      </Section>
      <Section title={t("Ko'rinish", 'Оформление')}>
        <Segmented
          value={settings.theme}
          onChange={(v: Settings['theme']) => update({ theme: v })}
          options={[
            { value: 'system', label: t('Avto', 'Авто') },
            { value: 'light', label: t('Yorug\'', 'Светлая') },
            { value: 'dark', label: t("Qorong'i", 'Тёмная') },
          ]}
        />
      </Section>
      <Section title={t('Valyuta', 'Валюта')}>
        <Card>
          <Toggle checked={settings.showUsd} onChange={(v) => update({ showUsd: v })} label={t("Summalarni dollarda ham ko'rsatish", 'Показывать суммы и в долларах')} />
          <Field label={t('1 USD kursi', 'Курс 1 USD')} className="mb-0">
            <NumInput value={settings.usdRate} onChange={(v) => update({ usdRate: v ?? 0 })} suffix={t("so'm", 'сум')} />
          </Field>
        </Card>
      </Section>
      <Section title={t('Xavfsizlik', 'Безопасность')}>
        <Card>
          <div className="mb-3 flex items-center gap-3">
            <span className={`grid size-10 place-items-center rounded-xl ${hasPin ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300' : 'bg-stone-100 text-stone-500 dark:bg-stone-800'}`}>
              {hasPin ? <ShieldCheck size={20} /> : <ShieldOff size={20} />}
            </span>
            <div className="flex-1">
              <div className="font-medium">{t('PIN-kod', 'PIN-код')}</div>
              <div className="text-sm text-stone-500">{hasPin ? t("O'rnatilgan — ilova PIN bilan qulflanadi", 'Установлен — вход по PIN') : t("O'rnatilmagan — ilova qulfsiz", 'Не установлен')}</div>
            </div>
          </div>
          {hasPin ? (
            <>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => openPinSetup('change')}>{t("O'zgartirish", 'Изменить')}</Button>
                <Button variant="secondary" className="text-red-600" onClick={() => openPinSetup('remove')}>{t("O'chirish", 'Отключить')}</Button>
              </div>
              <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-300">{t('Avtomatik qulflash', 'Автоблокировка')}</span>
              <Segmented
                value={String(settings.autoLockMinutes ?? 0)}
                onChange={(v) => update({ autoLockMinutes: Number(v) })}
                options={[
                  { value: '0', label: t('Darhol', 'Сразу') },
                  { value: '1', label: t('1 daq', '1 мин') },
                  { value: '5', label: t('5 daq', '5 мин') },
                  { value: '15', label: t('15 daq', '15 мин') },
                  { value: '-1', label: t('Ochilganda', 'При запуске') },
                ]}
              />
              <p className="mt-1 text-xs text-stone-500">{t("Boshqa ilovaga o'tib, shuncha vaqtdan keyin qaytsangiz PIN so'raladi. «Ochilganda» — faqat ilova qayta ochilganda.", 'Если вернуться позже этого времени — потребуется PIN. «При запуске» — только при открытии приложения.')}</p>
            </>
          ) : (
            <Button full onClick={() => openPinSetup('set')}>{t("PIN-kod o'rnatish", 'Установить PIN-код')}</Button>
          )}
        </Card>
      </Section>
      <Section title={t('Bildirishnomalar', 'Уведомления')}>
        <Card>
          <Toggle checked={settings.notifications} onChange={(v) => update({ notifications: v })} label={t("Tug'ish, emlash va boshqa eslatmalarni telefonga yuborish (Android)", 'Присылать напоминания на телефон (Android)')} />
        </Card>
      </Section>
      <section id="prices" className="mb-5 scroll-mt-20">
        <h2 className="mb-1 px-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">{t('Joriy bozor narxlari', 'Текущие рыночные цены')}</h2>
        <p className="mb-2 px-1 text-xs text-stone-500">{t("Poda qiymatini va «hozir sotsam» foydasini hisoblash uchun. Ixtiyoriy: kiritilmasa, shu turdagi oxirgi sotuvingiz narxi olinadi.", 'Для оценки стада и прибыли «если продать сейчас». Необязательно: если не указано, берётся цена вашей последней продажи.')}</p>
        <List>
          {used.map((s) => (
            <div key={s.id} className="p-3">
              <div className="mb-2 flex items-center gap-2 font-medium"><SpeciesAvatar s={s} size="sm" />{lt(s.name)}</div>
              <div className="grid grid-cols-2 gap-2">
                <NumInput value={settings.marketPrices[s.id]?.perKg} onChange={(v) => setPrice(s.id, 'perKg', v)} suffix={t("/kg tirik", '/кг жив.')} placeholder="—" />
                <NumInput value={settings.marketPrices[s.id]?.perHead} onChange={(v) => setPrice(s.id, 'perHead', v)} suffix={t('/bosh', '/гол.')} placeholder="—" />
              </div>
              {!settings.marketPrices[s.id]?.perKg && f.lastSaleOf(s.id) && (
                <p className="mt-1 text-xs text-stone-500">
                  {t('Kiritilmasa, oxirgi sotuvingiz narxi olinadi', 'Если не указано, берётся цена вашей последней продажи')}: {money(f.lastSaleOf(s.id)!.perKg)} / kg ({formatDate(f.lastSaleOf(s.id)!.date)})
                </p>
              )}
            </div>
          ))}
        </List>
      </section>
    </Page>
  )
}
