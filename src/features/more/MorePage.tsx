import { useNavigate } from 'react-router-dom'
import { Bell, Calculator, ChevronRight, DatabaseBackup, Heart, House, Info, LogOut, Milk, PawPrint, Settings, Syringe, Tags, TrendingUp, Wand2, Wheat, type LucideIcon } from 'lucide-react'
import { IconTile } from '../../components/icons'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, List, ListRow, Page, Section } from '../../components/ui'
import { useLock } from '../../state/lock'

export function MorePage() {
  const { t } = useSettings()
  const f = useFarm()
  const nav = useNavigate()
  const { hasPin, lock } = useLock()
  const row = (icon: LucideIcon, color: string, title: string, sub: string, to: string) => (
    <ListRow key={to} left={<IconTile icon={icon} color={color} />} title={title} sub={sub} onClick={() => nav(to)} right={<ChevronRight size={18} className="text-stone-400" />} />
  )
  return (
    <Page title={t("Ko'proq", 'Ещё')}>
      <Section title={t('Xo\'jalik', 'Хозяйство')}>
        <List>
          {row(Wand2, '#027a48', t('Avtomatik sozlash', 'Автонастройка'), t("Kategoriya, yem, ratsion va emlashni taxminiy to'ldirish", 'Заполнить категории, корма, рацион и вакцинацию'), '/setup')}
          {row(TrendingUp, '#027a48', t('Prognoz', 'Прогноз'), t("Qachon ko'payadi, qachon foydaga chiqadi", 'Рост стада и окупаемость'), '/forecast')}
          {row(Calculator, '#7c3aed', t('Kalkulyatorlar', 'Калькуляторы'), t("Sotish narxi, bo'rdoqi, yem, tug'ish sanasi", 'Цена продажи, откорм, корм, дата родов'), '/calc')}
          {row(Heart, '#db2777', t("Ko'payish", 'Воспроизводство'), t("Qochirish, bo'g'ozlik, tug'ish", 'Случки, стельность, роды'), '/breeding')}
          {row(Syringe, '#dc2626', t("Sog'liq va emlash", 'Здоровье и вакцинация'), t('Vaksina, davolash, keyingi sana', 'Вакцины, лечение, график'), '/health')}
          {row(Wheat, '#a16207', t('Yem ombori', 'Склад кормов'), t('Qoldiq, ratsion, necha kunga yetadi', 'Остатки, рацион, запас в днях'), '/feed')}
          {row(Milk, '#0284c7', t('Mahsulot jurnali', 'Журнал продукции'), t('Sut, tuxum, jun, asal', 'Молоко, яйца, шерсть, мёд'), '/production')}
          {row(Bell, '#ea580c', t('Eslatmalar', 'Напоминания'), t('Yaqinlashayotgan ishlar', 'Ближайшие дела'), '/reminders')}
        </List>
      </Section>
      <Section title={t('Sozlamalar', 'Настройки')}>
        <List>
          {row(Settings, '#475569', t('Sozlamalar', 'Настройки'), t('Til, valyuta, bozor narxlari, tema', 'Язык, валюта, цены, тема'), '/settings')}
          {row(House, '#027a48', t('Fermalar', 'Фермы'), f.farm?.name ?? '', '/farms')}
          {row(PawPrint, '#9a3412', t('Hayvon turlari', 'Виды животных'), t("Bo'g'ozlik muddati, go'sht chiqimi", 'Срок беременности, убойный выход'), '/species')}
          {row(Tags, '#0d9488', t('Kategoriyalar', 'Категории'), t('Xarajat va daromad turlari', 'Статьи расходов и доходов'), '/categories')}
          {row(DatabaseBackup, '#334155', t('Zaxira va eksport', 'Резервная копия и экспорт'), t('Telefon almashtirsangiz ham yo\'qolmasin', 'Чтобы не потерять данные'), '/backup')}
          {row(Info, '#2563eb', t('Ilova haqida', 'О приложении'), t('Qanday hisoblanadi', 'Как считается'), '/about')}
        </List>
      </Section>
      <Button variant="secondary" full size="lg" className="mb-2 text-red-600" icon={<LogOut size={20} />} onClick={lock}>
        {t('Chiqish', 'Выйти')}
      </Button>
      <p className="mb-6 px-1 text-center text-xs text-stone-500">
        {hasPin
          ? t("Ilova qulflanadi — qayta kirish uchun PIN-kod so'raladi.", 'Приложение заблокируется — для входа нужен PIN-код.')
          : t("Chiqish uchun avval PIN-kod o'rnatiladi.", 'Для выхода сначала установите PIN-код.')}
      </p>
    </Page>
  )
}
