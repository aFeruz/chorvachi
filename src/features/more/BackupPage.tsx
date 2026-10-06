import { useRef, useState } from 'react'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { useFarm } from '../../state/farm'
import { useSettings, saveSettings } from '../../state/settings'
import { Button, Callout, Card, Page, Section, useUi } from '../../components/ui'
import { exportBackup, importBackup, wipeAll, type Backup } from '../../db/repo'
import { saveFile } from '../../lib/native'
import { exportExcel } from '../reports/exportExcel'
import { today } from '../../lib/dates'

export function BackupPage() {
  const f = useFarm()
  const { t, lt, settings } = useSettings()
  const { confirm, toast } = useUi()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const doExport = async () => {
    setBusy(true)
    try {
      const b = await exportBackup()
      await saveFile(`chorva-zaxira-${today()}.json`, JSON.stringify(b), 'application/json')
      await saveSettings({ lastBackup: Date.now() })
      toast(t('Zaxira tayyor', 'Копия готова'))
    } finally {
      setBusy(false)
    }
  }

  const doImport = async (file: File) => {
    try {
      const b = JSON.parse(await file.text()) as Backup
      if (b.app !== 'chorva-hisob') throw new Error('bad')
      const ok = await confirm({
        title: t('Zaxiradan tiklaysizmi?', 'Восстановить из копии?'),
        text: t(`Hozirgi barcha ma'lumotlar zaxira (${new Date(b.createdAt).toLocaleString()}) bilan almashtiriladi.`, `Все текущие данные будут заменены копией от ${new Date(b.createdAt).toLocaleString()}.`),
        ok: t('Tiklash', 'Восстановить'),
        danger: true,
      })
      if (!ok) return
      await importBackup(b)
      toast(t('Tiklandi', 'Восстановлено'))
      setTimeout(() => window.location.reload(), 600)
    } catch {
      toast(t("Fayl noto'g'ri", 'Неверный файл'))
    }
  }

  return (
    <Page back title={t('Zaxira va eksport', 'Резервная копия')}>
      <Callout tone="warn">
        {t(
          "Ma'lumotlar faqat shu qurilmada saqlanadi. Ilovani o'chirsangiz yoki telefon almashtirsangiz yo'qolmasligi uchun muntazam zaxira oling va faylni Telegram yoki Google Drive'ga saqlang.",
          'Данные хранятся только на этом устройстве. Регулярно делайте копию и сохраняйте файл в Telegram или Google Drive.',
        )}
      </Callout>
      <p className="my-3 px-1 text-sm text-stone-500">
        {t('Oxirgi zaxira', 'Последняя копия')}: {settings.lastBackup ? new Date(settings.lastBackup).toLocaleString() : t('hali olinmagan', 'ещё не было')}
      </p>
      <Section title={t('Zaxira nusxa (JSON)', 'Резервная копия (JSON)')}>
        <Card className="space-y-3">
          <Button full disabled={busy} icon={<Download size={18} />} onClick={doExport}>{t('Zaxira olish', 'Сделать копию')}</Button>
          <Button full variant="secondary" icon={<Upload size={18} />} onClick={() => fileRef.current?.click()}>{t('Zaxiradan tiklash', 'Восстановить из копии')}</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) doImport(file); e.target.value = '' }} />
        </Card>
      </Section>
      <Section title={t('Excel hisobot', 'Отчёт Excel')}>
        <Card>
          <Button full variant="secondary" icon={<FileSpreadsheet size={18} />} onClick={() => exportExcel(f, { t, lt, from: '1900-01-01', to: '9999-12-31' })}>
            {t("Barcha ma'lumotlarni Excel'ga", 'Все данные в Excel')}
          </Button>
        </Card>
      </Section>
      <Section title={t('Xavfli zona', 'Опасная зона')}>
        <Card>
          <Button
            full
            variant="danger"
            onClick={async () => {
              const ok = await confirm({ title: t("Hamma ma'lumotni o'chirasizmi?", 'Удалить все данные?'), text: t("Barcha fermalar, hayvonlar va hisoblar o'chadi. Qaytarib bo'lmaydi!", 'Будут удалены все фермы, животные и записи. Это необратимо!'), ok: t("Hammasini o'chirish", 'Удалить всё'), danger: true })
              if (!ok) return
              await wipeAll()
              window.location.reload()
            }}
          >
            {t("Barcha ma'lumotni o'chirish", 'Удалить все данные')}
          </Button>
        </Card>
      </Section>
    </Page>
  )
}
