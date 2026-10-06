
import type { Farmx } from '../../state/farm'
import type { T } from '../../state/settings'
import type { LText, Scope } from '../../db/types'
import { saveFile } from '../../lib/native'
import { pnl } from '../../lib/calc/pnl'
import { statusLabel, sexLabel } from '../../components/labels'

export async function exportExcel(f: Farmx, o: { t: T; lt: (x?: LText) => string; from: string; to: string }) {
  const { t, lt, from, to } = o
  const XLSX = await import('xlsx')
  const inR = (d: string) => d >= from && d <= to
  const scopeName = (s: Scope, id?: string) =>
    s === 'farm' ? t('Butun ferma', 'Вся ферма')
      : s === 'species' ? lt(f.speciesMap.get(id ?? '')?.name)
        : s === 'group' ? f.groupMap.get(id ?? '')?.name ?? ''
          : f.animalMap.get(id ?? '')?.tag ?? ''

  const exp = f.expenses.filter((e) => inR(e.date)).map((e) => ({
    [t('Sana', 'Дата')]: e.date,
    [t('Turi', 'Категория')]: lt(f.catMap.get(e.categoryId)?.name),
    [t('Summa', 'Сумма')]: e.amount,
    [t('Miqdor', 'Кол-во')]: e.qty ?? '',
    [t('Birlik', 'Ед.')]: e.unit ?? '',
    [t('Kimga', 'К кому')]: scopeName(e.scope, e.targetId),
    [t('Izoh', 'Примечание')]: e.note ?? '',
  }))
  const inc = f.incomes.filter((e) => inR(e.date)).map((e) => ({
    [t('Sana', 'Дата')]: e.date,
    [t('Turi', 'Категория')]: lt(f.catMap.get(e.categoryId)?.name),
    [t('Summa', 'Сумма')]: e.amount,
    [t('Miqdor', 'Кол-во')]: e.qty ?? e.weightKg ?? '',
    [t('Qayerdan', 'Источник')]: e.animalIds?.length ? e.animalIds.map((a) => f.animalMap.get(a)?.tag).join(', ') : scopeName(e.scope, e.targetId),
    [t('Izoh', 'Примечание')]: e.note ?? '',
  }))
  const animals = f.animals.map((a) => {
    const c = f.costOf(a.id)
    const sale = a.saleIncomeId ? f.incomes.find((i) => i.id === a.saleIncomeId) : undefined
    const rev = sale ? sale.amount / (sale.animalIds?.length || 1) : undefined
    return {
      [t('Raqam', 'Номер')]: a.tag,
      [t('Laqab', 'Кличка')]: a.name ?? '',
      [t('Tur', 'Вид')]: lt(f.speciesMap.get(a.speciesId)?.name),
      [t('Jinsi', 'Пол')]: sexLabel(t, a.sex),
      [t('Zoti', 'Порода')]: a.breed ?? '',
      [t('Guruh', 'Группа')]: f.groupMap.get(a.groupId ?? '')?.name ?? '',
      [t('Holati', 'Статус')]: statusLabel(t, a.status),
      [t('Olingan/tug\'ilgan', 'Поступило')]: a.acquiredDate,
      [t('Vazn, kg', 'Вес, кг')]: f.weightOf(a.id) ?? '',
      [t('Tannarx', 'Себестоимость')]: Math.round(c.total),
      [t('Sotilgan narx', 'Цена продажи')]: rev != null ? Math.round(rev) : '',
      [t('Foyda', 'Прибыль')]: rev != null ? Math.round(rev - c.total) : '',
    }
  })
  const groups = f.groups.map((g) => ({
    [t('Guruh', 'Группа')]: g.name,
    [t('Tur', 'Вид')]: lt(f.speciesMap.get(g.speciesId)?.name),
    [t('Bosh soni', 'Голов')]: f.headsOf(g),
    [t('Jami xarajat', 'Всего затрат')]: Math.round(f.groupCost(g).total),
  }))
  const p = pnl(f.expenses, f.incomes, from, to)
  const summary = [
    { [t("Ko'rsatkich", 'Показатель')]: t('Davr', 'Период'), [t('Qiymat', 'Значение')]: `${from} — ${to}` },
    { [t("Ko'rsatkich", 'Показатель')]: t('Daromad', 'Доход'), [t('Qiymat', 'Значение')]: p.income },
    { [t("Ko'rsatkich", 'Показатель')]: t('Xarajat', 'Расход'), [t('Qiymat', 'Значение')]: p.expense },
    { [t("Ko'rsatkich", 'Показатель')]: t('Foyda', 'Прибыль'), [t('Qiymat', 'Значение')]: p.profit },
    { [t("Ko'rsatkich", 'Показатель')]: t('Poda qiymati', 'Стоимость стада'), [t('Qiymat', 'Значение')]: Math.round(f.herdValue) },
    ...p.monthly.map((m) => ({ [t("Ko'rsatkich", 'Показатель')]: m.month, [t('Qiymat', 'Значение')]: m.profit })),
  ]

  const wb = XLSX.utils.book_new()
  const add = (rows: object[], name: string) => {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ '': '' }])
    ws['!cols'] = Object.keys(rows[0] ?? { a: 1 }).map(() => ({ wch: 18 }))
    XLSX.utils.book_append_sheet(wb, ws, name)
  }
  add(summary, t('Xulosa', 'Итог'))
  add(exp, t('Xarajatlar', 'Расходы'))
  add(inc, t('Daromadlar', 'Доходы'))
  add(animals, t('Hayvonlar', 'Животные'))
  add(groups, t('Guruhlar', 'Группы'))
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  await saveFile(`chorva-hisobot-${from}_${to}.xlsx`, new Blob([buf], { type: mime }), mime)
}
