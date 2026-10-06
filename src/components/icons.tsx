import { createLucideIcon, Bird, Cat, Dog, Drumstick, Egg, Feather, Fish, PawPrint, Rabbit, Rat, Snail, Squirrel, Turtle, Worm, type LucideIcon } from 'lucide-react'
import { bee, bullHead, cowHead, horseHead, pig } from '@lucide/lab'
import type { Species } from '../db/types'
import { cx } from './ui'

type Node = [string, Record<string, string>][]
const node = (paths: string[]): Node => paths.map((d, i) => ['path', { d, key: String(i) }])

/** Lucide uslubida chizilgan qo'shimcha ikonkalar (24×24, chiziq 2) */
const Sheep = createLucideIcon('sheep', node([
  'M7 8.5a2.5 2.5 0 0 1 1.8-3.6 2.6 2.6 0 0 1 3.2-1.9 2.6 2.6 0 0 1 3.2 1.9A2.5 2.5 0 0 1 17 8.5',
  'M7.2 9 3 10.2c.5 1.4 1.9 2.1 3.4 1.7',
  'M16.8 9 21 10.2c-.5 1.4-1.9 2.1-3.4 1.7',
  'M7 8.5c0 5.5 2.2 12.5 5 12.5s5-7 5-12.5',
  'M10 12h.01',
  'M14 12h.01',
  'M11 18.5h2',
]))

const Goat = createLucideIcon('goat', node([
  'M9.5 6.5C9 4 7 2.5 4.5 2.8',
  'M14.5 6.5c.5-2.5 2.5-4 5-3.7',
  'M8.2 9 3.5 10.8c.6 1.2 2 1.7 3.3 1.2',
  'M15.8 9l4.7 1.8c-.6 1.2-2 1.7-3.3 1.2',
  'M8 7h8l-1.2 8.8c-.3 1.9-1.4 3.2-2.8 3.2s-2.5-1.3-2.8-3.2Z',
  'M11 19.2 12 22l1-2.8',
  'M10.5 11h.01',
  'M13.5 11h.01',
]))

const Camel = createLucideIcon('camel', node([
  'M3.5 13c.4-4.2 2.6-7 5.2-7 2.4 0 3 3 5.3 3H16',
  'M16 9V5.5A1.5 1.5 0 0 1 17.5 4H20l1 2h-3v5.5a2.5 2.5 0 0 1-2.5 2.5H5a1.5 1.5 0 0 1-1.5-1.5',
  'M5.5 14v7',
  'M8.5 14v7',
  'M12.5 14v7',
  'M15.5 14v7',
]))

const Cow = createLucideIcon('cow-head', cowHead as Node)
const Bull = createLucideIcon('bull-head', bullHead as Node)
const Horse = createLucideIcon('horse-head', horseHead as Node)
const Bee = createLucideIcon('bee', bee as Node)
const Pig = createLucideIcon('pig', pig as Node)

/** Tur ikonkalari to'plami (foydalanuvchi o'z turiga shulardan tanlaydi) */
export const ANIMAL_ICONS: Record<string, LucideIcon> = {
  sheep: Sheep,
  goat: Goat,
  cow: Cow,
  bull: Bull,
  horse: Horse,
  camel: Camel,
  rabbit: Rabbit,
  chicken: Drumstick,
  egg: Egg,
  bird: Bird,
  feather: Feather,
  fish: Fish,
  bee: Bee,
  pig: Pig,
  squirrel: Squirrel,
  rat: Rat,
  turtle: Turtle,
  snail: Snail,
  worm: Worm,
  cat: Cat,
  dog: Dog,
  paw: PawPrint,
}

const BY_KEY: Record<string, { icon: string; color: string }> = {
  sheep: { icon: 'sheep', color: '#a16207' },
  goat: { icon: 'goat', color: '#4d7c0f' },
  cattle: { icon: 'cow', color: '#9a3412' },
  horse: { icon: 'horse', color: '#7c2d12' },
  camel: { icon: 'camel', color: '#b45309' },
  rabbit: { icon: 'rabbit', color: '#6d28d9' },
  broiler: { icon: 'chicken', color: '#c2410c' },
  layer: { icon: 'egg', color: '#ca8a04' },
  turkey: { icon: 'feather', color: '#be123c' },
  duck: { icon: 'bird', color: '#0369a1' },
  fish: { icon: 'fish', color: '#0e7490' },
  bee: { icon: 'bee', color: '#a16207' },
}

export function speciesIconKey(s?: Pick<Species, 'icon' | 'key'>): string {
  return s?.icon || BY_KEY[s?.key ?? '']?.icon || 'paw'
}

export function speciesColor(s?: Pick<Species, 'key' | 'color'>): string {
  return s?.color || BY_KEY[s?.key ?? '']?.color || '#57534e'
}

export function SpeciesIcon({ s, size = 20, className }: { s?: Pick<Species, 'icon' | 'key'>; size?: number; className?: string }) {
  const I = ANIMAL_ICONS[speciesIconKey(s)] ?? PawPrint
  return <I size={size} className={className} />
}

/** Rangli kvadrat ichida tur ikonkasi */
export function SpeciesAvatar({ s, size = 'md' }: { s?: Pick<Species, 'icon' | 'key' | 'color'>; size?: 'sm' | 'md' | 'lg' }) {
  const color = speciesColor(s)
  return (
    <span
      className={cx(
        'grid shrink-0 place-items-center',
        size === 'sm' && 'size-8 rounded-lg',
        size === 'md' && 'size-11 rounded-xl',
        size === 'lg' && 'size-20 rounded-2xl',
      )}
      style={{ background: color + '1f', color }}
    >
      <SpeciesIcon s={s} size={size === 'lg' ? 40 : size === 'sm' ? 18 : 22} />
    </span>
  )
}

/** Oddiy ikonka uchun rangli kvadrat (menyu, bo'sh holatlar) */
export function IconTile({ icon: I, color = '#57534e', size = 'md' }: { icon: LucideIcon; color?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      className={cx(
        'grid shrink-0 place-items-center',
        size === 'sm' && 'size-8 rounded-lg',
        size === 'md' && 'size-10 rounded-xl',
        size === 'lg' && 'size-16 rounded-2xl',
      )}
      style={{ background: color + '1f', color }}
    >
      <I size={size === 'lg' ? 30 : size === 'sm' ? 16 : 20} />
    </span>
  )
}
