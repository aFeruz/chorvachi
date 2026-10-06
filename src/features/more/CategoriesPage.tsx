import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Badge, Button, Fab, Field, Input, List, ListRow, Page, Segmented, Sheet, Toggle } from '../../components/ui'
import { db, uid } from '../../db/db'
import type { Category } from '../../db/types'

const COLORS = ['#16a34a', '#dc2626', '#2563eb', '#ca8a04', '#9333ea', '#0891b2', '#ea580c', '#db2777', '#4b5563', '#65a30d']

export function CategoriesPage() {
  const f = useFarm()
  const { t, lt } = useSettings()
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [edit, setEdit] = useState<Category | null>(null)
  const used = (id: string) => f.expenses.some((e) => e.categoryId === id) || f.incomes.some((e) => e.categoryId === id)
  return (
    <Page back title={t('Kategoriyalar', 'Категории')}>
      <Segmented className="mb-3" value={kind} onChange={setKind} options={[{ value: 'expense', label: t('Xarajat', 'Расходы') }, { value: 'income', label: t('Daromad', 'Доходы') }]} />
      <List>
        {f.categories.filter((c) => c.kind === kind).map((c) => (
          <ListRow key={c.id} onClick={() => setEdit({ ...c })} left={<span className="block size-5 rounded-full" style={{ background: c.color }} />} title={lt(c.name)} right={c.hidden ? <Badge>{t('yashirin', 'скрыта')}</Badge> : undefined} />
        ))}
      </List>
      <Fab onClick={() => setEdit({ id: '', kind, name: { uz: '', ru: '' }, color: COLORS[0], builtin: false })} icon={<Plus />} label={t('Kategoriya', 'Категория')} />
      {edit && (
        <Sheet open onClose={() => setEdit(null)} title={edit.id ? lt(edit.name) : t('Yangi kategoriya', 'Новая категория')}>
          <Field label={t('Nomi (uz)', 'Название (uz)')}><Input value={edit.name.uz} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, uz: e.target.value } })} /></Field>
          <Field label={t('Nomi (ru)', 'Название (ru)')}><Input value={edit.name.ru} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, ru: e.target.value } })} /></Field>
          <div className="mb-3 flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setEdit({ ...edit, color: c })} className="size-9 rounded-full" style={{ background: c, outline: edit.color === c ? '3px solid currentColor' : undefined, outlineOffset: 2 }} />
            ))}
          </div>
          {edit.id && <Toggle checked={!!edit.hidden} onChange={(v) => setEdit({ ...edit, hidden: v })} label={t("Ro'yxatda yashirish", 'Скрыть из списка')} />}
          <Button
            full
            disabled={!edit.name.uz.trim()}
            onClick={async () => {
              await db.categories.put({ ...edit, id: edit.id || uid(), name: { uz: edit.name.uz.trim(), ru: edit.name.ru.trim() || edit.name.uz.trim() } })
              setEdit(null)
            }}
          >
            {t('Saqlash', 'Сохранить')}
          </Button>
          {edit.id && !edit.builtin && !used(edit.id) && (
            <Button full variant="ghost" className="mt-2 text-red-600" onClick={async () => { await db.categories.delete(edit.id); setEdit(null) }}>{t("O'chirish", 'Удалить')}</Button>
          )}
        </Sheet>
      )}
    </Page>
  )
}
