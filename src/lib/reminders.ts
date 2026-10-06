import type { Farmx } from '../state/farm'
import type { T } from '../state/settings'
import { addDays, diffDays, today } from './dates'
import { feedDaysLeft } from './feed'
import { healthLabel } from '../components/labels'

export interface ReminderItem {
  id: string
  date: string
  title: string
  sub?: string
  kind: 'birth' | 'health' | 'custom' | 'feed' | 'backup'
  link?: string
  customId?: string
}

export function computeReminders(f: Farmx, t: T, lastBackup?: number): ReminderItem[] {
  const out: ReminderItem[] = []
  const tag = (id?: string) => {
    const a = id ? f.animalMap.get(id) : undefined
    return a ? `${a.tag}${a.name ? ' · ' + a.name : ''}` : ''
  }
  for (const b of f.breedings) {
    if (b.status !== 'pending') continue
    const a = f.animalMap.get(b.femaleId)
    if (!a || a.status !== 'active') continue
    out.push({
      id: 'b_' + b.id, date: b.expectedDate, kind: 'birth', link: '/breeding',
      title: t("Tug'ish kutilmoqda", 'Ожидается окот/отёл'), sub: tag(b.femaleId),
    })
  }
  for (const h of f.health) {
    if (!h.nextDate || h.nextDone) continue
    const target =
      h.scope === 'animal' ? tag(h.targetId)
        : h.scope === 'group' ? f.groupMap.get(h.targetId ?? '')?.name
          : h.scope === 'species' ? f.speciesMap.get(h.targetId ?? '')?.name[t('uz', 'ru') as 'uz' | 'ru']
            : t('Butun ferma', 'Вся ферма')
    out.push({
      id: 'h_' + h.id, date: h.nextDate, kind: 'health', link: '/health',
      title: `${healthLabel(t, h.type)}: ${h.title}`, sub: target,
    })
  }
  for (const r of f.reminders) {
    if (r.done) continue
    out.push({ id: 'r_' + r.id, date: r.date, kind: 'custom', title: r.title, sub: r.note, link: '/reminders', customId: r.id })
  }
  for (const it of f.feedItems) {
    const d = feedDaysLeft(f, it.id)
    if (d !== undefined && d < 10)
      out.push({
        id: 'f_' + it.id, date: addDays(today(), Math.floor(d)), kind: 'feed', link: '/feed',
        title: t(`${it.name} tugayapti`, `${it.name} заканчивается`),
        sub: t(`Taxminan ${Math.floor(d)} kunga yetadi`, `Хватит примерно на ${Math.floor(d)} дн.`),
      })
  }
  if (f.animals.length + f.expenses.length > 5) {
    const days = lastBackup ? Math.floor((Date.now() - lastBackup) / 86400000) : 999
    if (days >= 14)
      out.push({
        id: 'backup', date: today(), kind: 'backup', link: '/backup',
        title: t('Zaxira nusxa oling', 'Сделайте резервную копию'),
        sub: lastBackup ? t(`${days} kundan beri zaxira olinmagan`, `${days} дн. без резервной копии`) : t('Hali zaxira olinmagan', 'Копия ещё не делалась'),
      })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

export function dueLabel(t: T, date: string): { text: string; tone: 'red' | 'amber' | 'neutral' } {
  const d = diffDays(today(), date)
  if (d < 0) return { text: t(`${-d} kun o'tdi`, `просрочено ${-d} дн.`), tone: 'red' }
  if (d === 0) return { text: t('Bugun', 'Сегодня'), tone: 'amber' }
  if (d === 1) return { text: t('Ertaga', 'Завтра'), tone: 'amber' }
  return { text: t(`${d} kundan keyin`, `через ${d} дн.`), tone: d <= 7 ? 'amber' : 'neutral' }
}
