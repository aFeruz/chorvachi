import { useSettings } from '../../state/settings'
import { Card, Page, Section } from '../../components/ui'

export function AboutPage() {
  const { t } = useSettings()
  const items: [string, string][] = [
    [
      t('Tannarx qanday hisoblanadi?', 'Как считается себестоимость?'),
      t(
        "Har bir xarajat yozilgan sanada mavjud hayvonlarga taqsimlanadi. «Bitta hayvon» xarajati to'liq o'shanga, «Guruh» xarajati guruhdagilarga teng, «Butun ferma» xarajati esa shartli bosh bo'yicha bo'linadi (1 sigir ≈ 7 qo'y ≈ 100 tovuq). Shuning uchun keyin tug'ilgan qo'zi undan oldingi xarajatlarni ko'tarmaydi.",
        'Каждый расход делится между животными, которые были на ферме в дату расхода. «Одно животное» — целиком на него, «Группа» — поровну в группе, «Вся ферма» — по условным головам (1 корова ≈ 7 овец ≈ 100 кур). Поэтому ягнёнок не несёт расходы, сделанные до его рождения.',
      ),
    ],
    [
      t('Zararsiz narx nima?', 'Что такое цена без убытка?'),
      t(
        "Bu sarflangan pulni to'liq qaytaradigan minimal sotish narxi. Undan qimmatga sotsangiz — foyda, arzonga — zarar. Tirik vazn va go'sht (so'yish chiqimi bilan) uchun alohida ko'rsatiladi.",
        'Это минимальная цена, которая полностью возвращает вложения. Дороже — прибыль, дешевле — убыток. Показывается отдельно для живого веса и мяса (с учётом убойного выхода).',
      ),
    ],
    [
      t('«Boqish yoki sotish» tavsiyasi', 'Совет «кормить или продавать»'),
      t(
        "So'nggi 30 kundagi xarajat va o'rtacha kunlik vazn o'sishi solishtiriladi. Agar keyingi oyda qo'shiladigan vazn qiymati xarajatdan kam bo'lsa, sotish tavsiya etiladi. Buning uchun kamida 2 marta vazn yozing va bozor narxini kiriting.",
        'Сравниваются расходы за 30 дней и среднесуточный привес. Если прирост стоимости за месяц меньше расходов — советуем продавать. Нужны минимум 2 взвешивания и рыночная цена.',
      ),
    ],
    [
      t('Prognoz qanday hisoblaydi?', 'Как считается прогноз?'),
      t(
        "Har oy uchun tug'ish, o'lim, o'sish, sotish, yem va boshqa xarajatlar hisoblanadi. Bu 400 marta takrorlanadi: har safar o'lim, kasallik chiqishi, egizaklar soni va narx tasodifiy o'zgaradi. Shundan «kutilgan natija» va «80% holatda» oralig'i chiqariladi. Maqsadga erishilgan oy faqat natija kamida 6 oy saqlansa hisoblanadi. Narxlar fermangiz tarixidan olinadi yoki o'zingiz kiritasiz.",
        'Для каждого месяца считаются роды, падёж, привес, продажи, корм и расходы. Это повторяется 400 раз: каждый раз падёж, болезни, двойни и цены меняются случайно. Отсюда «ожидаемый итог» и диапазон «в 80% случаев». Цель считается достигнутой, только если результат держится не менее 6 месяцев. Цены берутся из истории фермы или вводятся вручную.',
      ),
    ],
    [
      t("Ma'lumotlar qayerda?", 'Где хранятся данные?'),
      t(
        "Faqat sizning qurilmangizda. Internet kerak emas. Telefon almashtirishdan oldin «Zaxira» bo'limidan nusxa oling.",
        'Только на вашем устройстве. Интернет не нужен. Перед сменой телефона сделайте копию в разделе «Резервная копия».',
      ),
    ],
  ]
  return (
    <Page back title={t('Ilova haqida', 'О приложении')}>
      <Card className="mb-4 flex items-center gap-4">
        <img src="./favicon.svg" className="size-16" alt="" />
        <div>
          <div className="text-xl font-bold">Chorva Hisob</div>
          <div className="text-sm text-stone-500">v1.3 · {t('offline chorvachilik hisobi', 'офлайн учёт животноводства')}</div>
        </div>
      </Card>
      {items.map(([q, a]) => (
        <Section key={q} title={q}>
          <Card className="text-sm leading-relaxed">{a}</Card>
        </Section>
      ))}
    </Page>
  )
}
