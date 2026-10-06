import { useNavigate } from 'react-router-dom'
import { Bell, Calculator, ChevronRight, DatabaseBackup, Heart, House, Info, Milk, PawPrint, Settings, Syringe, Tags, Wand2, Wheat, type LucideIcon } from 'lucide-react'
import { IconTile } from '../../components/icons'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { List, ListRow, Page, Section } from '../../components/ui'

export function MorePage() {
  const { t } = useSettings()
  const f = useFarm()
  const nav = useNavigate()
  const row = (icon: LucideIcon, color: string, title: string, sub: string, to: string) => (
    <ListRow key={to} left={<IconTile icon={icon} color={color} />} title={title} sub={sub} onClick={() => nav(to)} right={<ChevronRight size={18} className="text-stone-400" />} />
  )
  return (
    <Page title={t("Ko'proq", 'Ещё')}>
      <Section title={t('Xo\'jalik', 'Хозяйство')}>
        <List>
          {row(Wand2, '#027a48', t('Avtomatik sozlash', 'Автонастройка'), t("Kategoriya, yem, ratsion va emlashni taxminiy to'ldirish", 'Заполнить категории, корма, рацион и вакцинацию'), '/setup')}
          {row(Calculator, '#7c3aed', t('Kalkulyatorlar', 'Калькуляторы'), t("Sotish narxi, biznes-reja, yem, tug'ish", 'Цена продажи, бизнес-план, корм, роды'), '/calc')}
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
    </Page>
  )
}
