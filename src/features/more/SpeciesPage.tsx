import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Badge, Button, Callout, cx, Fab, Field, Input, List, ListRow, NumInput, Page, Segmented, Sheet, Toggle, useUi } from '../../components/ui'
import { db, uid } from '../../db/db'
import type { Species } from '../../db/types'
import { ANIMAL_ICONS, SpeciesAvatar, speciesIconKey } from '../../components/icons'

export function SpeciesPage() {
  const f = useFarm()
  const { t, lt } = useSettings()
  const { toast } = useUi()
  const [edit, setEdit] = useState<Species | null>(null)

  const blank = (): Species => ({ id: '', name: { uz: '', ru: '' }, icon: 'paw', mode: 'individual', gestationDays: 0, avgLitter: 1, maturityMonths: 12, dressingPct: 50, lu: 0.1, enabled: true, builtin: false })
  const used = (id: string) => f.animals.some((a) => a.speciesId === id) || f.groups.some((g) => g.speciesId === id)

  return (
    <Page back title={t('Hayvon turlari', 'Виды животных')}>
      <Callout tone="info">{t("O'chirilgan turlar formalarda ko'rinmaydi. Raqamlarni o'z tajribangizga moslang.", 'Выключенные виды не показываются в формах. Подстройте цифры под свой опыт.')}</Callout>
      <List className="mt-3">
        {f.species.map((s) => (
          <ListRow
            key={s.id}
            onClick={() => setEdit({ ...s })}
            left={<SpeciesAvatar s={s} />}
            title={<span className="flex items-center gap-2">{lt(s.name)} {!s.enabled && <Badge>{t("o'chiq", 'выкл.')}</Badge>}</span>}
            sub={[
              s.mode === 'group' ? t('guruh bilan', 'группой') : t('har biri alohida', 'поштучно'),
              s.gestationDays ? t(`bo'g'ozlik ${s.gestationDays} kun`, `беременность ${s.gestationDays} дн.`) : '',
              s.dressingPct ? t(`go'sht ${s.dressingPct}%`, `выход ${s.dressingPct}%`) : '',
            ].filter(Boolean).join(' · ')}
          />
        ))}
      </List>
      <Fab onClick={() => setEdit(blank())} icon={<Plus />} label={t('Tur', 'Вид')} />
      {edit && (
        <Sheet open onClose={() => setEdit(null)} title={edit.id ? lt(edit.name) : t('Yangi tur', 'Новый вид')}>
          <Toggle checked={edit.enabled} onChange={(v) => setEdit({ ...edit, enabled: v })} label={t('Yoqilgan', 'Включён')} />
          <Field label={t('Nomi (uz)', 'Название (uz)')}><Input value={edit.name.uz} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, uz: e.target.value } })} /></Field>
          <Field label={t('Nomi (ru)', 'Название (ru)')}><Input value={edit.name.ru} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, ru: e.target.value } })} /></Field>
          <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-300">{t('Ikonka', 'Иконка')}</span>
          <div className="mb-3 grid grid-cols-6 gap-2 sm:grid-cols-8">
            {Object.entries(ANIMAL_ICONS).map(([k, I]) => {
              const on = speciesIconKey(edit) === k
              return (
                <button
                  key={k}
                  type="button"
                  aria-label={k}
                  onClick={() => setEdit({ ...edit, icon: k })}
                  className={cx('grid aspect-square place-items-center rounded-xl border-2 transition', on ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30' : 'border-transparent bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300')}
                >
                  <I size={22} />
                </button>
              )
            })}
          </div>
          <Field label={t('Hisob usuli', 'Способ учёта')}>
            <Segmented
              value={edit.mode}
              onChange={(m) => !used(edit.id) && setEdit({ ...edit, mode: m })}
              options={[{ value: 'individual', label: t('Har biri alohida', 'Поштучно') }, { value: 'group', label: t('Guruh (bosh soni)', 'Группой') }]}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("Bo'g'ozlik", 'Беременность')}><NumInput value={edit.gestationDays} onChange={(v) => setEdit({ ...edit, gestationDays: v ?? 0 })} suffix={t('kun', 'дн.')} /></Field>
            <Field label={t("O'rtacha bola soni", 'Приплод в среднем')}><NumInput value={edit.avgLitter} onChange={(v) => setEdit({ ...edit, avgLitter: v ?? 0 })} decimals /></Field>
            <Field label={t("Go'sht chiqimi", 'Убойный выход')}><NumInput value={edit.dressingPct} onChange={(v) => setEdit({ ...edit, dressingPct: v ?? 0 })} decimals suffix="%" /></Field>
            <Field label={t('Shartli bosh', 'Усл. голова')} hint={t('qoramol = 1', 'КРС = 1')}><NumInput value={edit.lu} onChange={(v) => setEdit({ ...edit, lu: v ?? 0 })} decimals /></Field>
          </div>
          <p className="mb-3 text-xs text-stone-500">{t("«Shartli bosh» umumiy ferma xarajatini turlar o'rtasida adolatli bo'lish uchun: 1 sigir ≈ 7 qo'y ≈ 100 tovuq.", '«Условная голова» нужна для честного деления общих расходов: 1 корова ≈ 7 овец ≈ 100 кур.')}</p>
          <Button
            full
            disabled={!edit.name.uz.trim()}
            onClick={async () => {
              const s = { ...edit, name: { uz: edit.name.uz.trim(), ru: edit.name.ru.trim() || edit.name.uz.trim() } }
              if (!s.id) s.id = uid()
              await db.species.put(s)
              setEdit(null)
              toast(t('Saqlandi', 'Сохранено'))
            }}
          >
            {t('Saqlash', 'Сохранить')}
          </Button>
          {edit.id && !edit.builtin && !used(edit.id) && (
            <Button full variant="ghost" className="mt-2 text-red-600" onClick={async () => { await db.species.delete(edit.id); setEdit(null) }}>{t("O'chirish", 'Удалить')}</Button>
          )}
        </Sheet>
      )}
    </Page>
  )
}
