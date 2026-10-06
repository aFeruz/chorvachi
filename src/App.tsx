import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { SettingsProvider, useSettings } from './state/settings'
import { FarmProvider } from './state/farm'
import { UiProvider } from './components/ui'
import { Shell } from './components/Shell'
import { Onboarding } from './features/Onboarding'
import { Dashboard } from './features/Dashboard'
import { HerdPage } from './features/herd/HerdPage'
import { AnimalPage } from './features/herd/AnimalPage'
import { AnimalForm } from './features/herd/AnimalForm'
import { GroupForm } from './features/herd/GroupForm'
import { GroupPage } from './features/herd/GroupPage'
import { BreedingPage } from './features/breeding/BreedingPage'
import { BirthForm } from './features/breeding/BirthForm'
import { FinancePage } from './features/finance/FinancePage'
import { ExpenseForm } from './features/finance/ExpenseForm'
import { IncomeForm } from './features/finance/IncomeForm'
import { CalcHub } from './features/calc/CalcHub'
import { SaleCalc } from './features/calc/SaleCalc'
import { FeedCalc } from './features/calc/FeedCalc'
import { GestationCalc } from './features/calc/GestationCalc'
import { FeedPage } from './features/feed/FeedPage'
import { HealthPage } from './features/health/HealthPage'
import { ProductionPage } from './features/production/ProductionPage'
import { RemindersPage } from './features/reminders/RemindersPage'
import { MorePage } from './features/more/MorePage'
import { SettingsPage } from './features/more/SettingsPage'
import { BackupPage } from './features/more/BackupPage'
import { SpeciesPage } from './features/more/SpeciesPage'
import { CategoriesPage } from './features/more/CategoriesPage'
import { FarmsPage } from './features/more/FarmsPage'
import { AboutPage } from './features/more/AboutPage'
import { SetupPage } from './features/more/SetupPage'
import { useNativeIntegration } from './lib/native'

// Diagrammali og'ir sahifalar alohida yuklanadi
const ReportsPage = lazy(() => import('./features/reports/ReportsPage'))
const ForecastHub = lazy(() => import('./features/forecast/ForecastHub'))
const ForecastPage = lazy(() => import('./features/forecast/ForecastPage'))

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="size-10 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
    </div>
  )
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Native() {
  const nav = useNavigate()
  useNativeIntegration(nav)
  return null
}

function Gate() {
  const { settings } = useSettings()
  if (!settings.onboarded || !settings.activeFarmId) return <Onboarding />
  return (
    <FarmProvider fallback={<Splash />}>
      <ScrollTop />
      <Native />
      <Shell>
        <Suspense fallback={<Splash />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/herd" element={<HerdPage />} />
            <Route path="/animal/new" element={<AnimalForm />} />
            <Route path="/animal/:id" element={<AnimalPage />} />
            <Route path="/animal/:id/edit" element={<AnimalForm />} />
            <Route path="/group/new" element={<GroupForm />} />
            <Route path="/group/:id" element={<GroupPage />} />
            <Route path="/group/:id/edit" element={<GroupForm />} />
            <Route path="/breeding" element={<BreedingPage />} />
            <Route path="/birth/new" element={<BirthForm />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/expense/new" element={<ExpenseForm />} />
            <Route path="/expense/:id" element={<ExpenseForm />} />
            <Route path="/income/new" element={<IncomeForm />} />
            <Route path="/income/:id" element={<IncomeForm />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/calc" element={<CalcHub />} />
            <Route path="/calc/sale" element={<SaleCalc />} />
            <Route path="/calc/plan" element={<Navigate to="/forecast" replace />} />
            <Route path="/forecast" element={<ForecastHub />} />
            <Route path="/forecast/new" element={<ForecastPage />} />
            <Route path="/forecast/:id" element={<ForecastPage />} />
            <Route path="/calc/feed" element={<FeedCalc />} />
            <Route path="/calc/gestation" element={<GestationCalc />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="/production" element={<ProductionPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="/more" element={<MorePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="/species" element={<SpeciesPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/farms" element={<FarmsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Shell>
    </FarmProvider>
  )
}

export default function App() {
  return (
    <SettingsProvider fallback={<Splash />}>
      <UiProvider>
        <HashRouter>
          <Gate />
        </HashRouter>
      </UiProvider>
    </SettingsProvider>
  )
}
