import { useState } from 'react'
import { Check, House, Plus } from 'lucide-react'
import { IconTile } from '../../components/icons'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, Fab, Field, Input, List, ListRow, Page, Sheet, useUi } from '../../components/ui'
import { createFarm, deleteFarm } from '../../db/repo'
import { db } from '../../db/db'
import type { Farm } from '../../db/types'

export function FarmsPage() {
  const f = useFarm()
  const { t, farmId, update } = useSettings()
  const { confirm, toast } = useUi()
  const [edit, setEdit] = useState<Farm | 'new' | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const open = (x: Farm | 'new') => {
    setName(x === 'new' ? '' : x.name)
    setAddress(x === 'new' ? '' : x.address ?? '')
    setEdit(x)
  }
  return (
    <Page back title={t('Fermalar', 'Фермы')}>
      <p className="mb-3 px-1 text-sm text-stone-500">{t("Bir nechta xo'jaligingiz bo'lsa, har birini alohida yuriting. Faol fermani tanlash uchun bosing.", 'Если хозяйств несколько, ведите их отдельно. Нажмите, чтобы выбрать активную.')}</p>
      <List>
        {f.farms.map((x) => (
          <ListRow
            key={x.id}
            left={<IconTile icon={House} color="#027a48" />}
            title={x.name}
            sub={x.address}
            onClick={() => (x.id === farmId ? open(x) : update({ activeFarmId: x.id }).then(() => toast(x.name)))}
            right={x.id === farmId ? <Check className="text-brand-600" /> : undefined}
          />
        ))}
      </List>
      <Fab onClick={() => open('new')} icon={<Plus />} label={t('Ferma', 'Ферма')} />
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? t('Yangi ferma', 'Новая ферма') : t('Fermani tahrirlash', 'Изменить ферму')}>
        <Field label={t('Nomi', 'Название')}><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={t('Manzil', 'Адрес')}><Input value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <Button
          full
          disabled={!name.trim()}
          onClick={async () => {
            if (edit === 'new') await createFarm(name.trim(), address.trim() || undefined)
            else if (edit) await db.farms.update(edit.id, { name: name.trim(), address: address.trim() || undefined })
            setEdit(null)
          }}
        >
          {t('Saqlash', 'Сохранить')}
        </Button>
        {edit && edit !== 'new' && f.farms.length > 1 && (
          <Button
            full
            variant="ghost"
            className="mt-2 text-red-600"
            onClick={async () => {
              const ok = await confirm({ title: t(`«${edit.name}» o'chirilsinmi?`, `Удалить «${edit.name}»?`), text: t("Fermadagi barcha hayvon va yozuvlar o'chadi.", 'Будут удалены все животные и записи фермы.'), ok: t("O'chirish", 'Удалить'), danger: true })
              if (ok) {
                await deleteFarm(edit.id)
                setEdit(null)
              }
            }}
          >
            {t("Fermani o'chirish", 'Удалить ферму')}
          </Button>
        )}
      </Sheet>
    </Page>
  )
}
