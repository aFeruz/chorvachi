import { useEffect } from 'react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Card, Field, List, NumInput, Page, Section, Segmented, Toggle } from '../../components/ui'
import type { Lang, Settings } from '../../db/types'
import { SpeciesAvatar } from '../../components/icons'

export function SettingsPage() {
  const { t, lt, settings, update } = useSettings()
  const f = useFarm()
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
      <Section title={t('Bildirishnomalar', 'Уведомления')}>
        <Card>
          <Toggle checked={settings.notifications} onChange={(v) => update({ notifications: v })} label={t("Tug'ish, emlash va boshqa eslatmalarni telefonga yuborish (Android)", 'Присылать напоминания на телефон (Android)')} />
        </Card>
      </Section>
      <section id="prices" className="mb-5 scroll-mt-20">
        <h2 className="mb-1 px-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">{t('Joriy bozor narxlari', 'Текущие рыночные цены')}</h2>
        <p className="mb-2 px-1 text-xs text-stone-500">{t("Poda qiymatini va «hozir sotsam» foydasini hisoblash uchun. Vazni bor hayvonlarga 1 kg narxi, qolganlarga 1 bosh narxi ishlatiladi.", 'Для оценки стада и прибыли «если продать сейчас». Для животных с весом берётся цена за кг, иначе — за голову.')}</p>
        <List>
          {used.map((s) => (
            <div key={s.id} className="p-3">
              <div className="mb-2 flex items-center gap-2 font-medium"><SpeciesAvatar s={s} size="sm" />{lt(s.name)}</div>
              <div className="grid grid-cols-2 gap-2">
                <NumInput value={settings.marketPrices[s.id]?.perKg} onChange={(v) => setPrice(s.id, 'perKg', v)} suffix={t("/kg tirik", '/кг жив.')} placeholder="—" />
                <NumInput value={settings.marketPrices[s.id]?.perHead} onChange={(v) => setPrice(s.id, 'perHead', v)} suffix={t('/bosh', '/гол.')} placeholder="—" />
              </div>
            </div>
          ))}
        </List>
      </section>
    </Page>
  )
}
