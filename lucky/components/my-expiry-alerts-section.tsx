'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '@/components/auth-context'
import { useOpenLogin } from '@/components/login-dialog-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { fetchInventory, type InventoryItem } from '@/lib/inventory-api'
import { cn } from '@/lib/utils'

type State =
  | { kind: 'loading' }
  | { kind: 'success'; items: InventoryItem[] }
  | { kind: 'error'; message: string }

/** expiry_date(YYYY-MM-DD)까지 남은 날. 오늘 = 0, 지났으면 음수. */
function daysLeft(expiryDate: string): number {
  const [y, m, d] = expiryDate.split('-').map(Number)
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round(
    (new Date(y, m - 1, d).getTime() - start.getTime()) / 86400000
  )
}

function dDayLabel(days: number): string {
  if (days === 0) return 'D-day'
  if (days > 0) return `D-${days}`
  return `${-days}일 지남`
}

function byExpiry(a: InventoryItem, b: InventoryItem): number {
  return (a.expiry_date ?? '').localeCompare(b.expiry_date ?? '')
}

function AlertGroup({
  title,
  items,
  badgeClass,
  label,
}: {
  title: string
  items: InventoryItem[]
  badgeClass: string
  label: (item: InventoryItem) => string
}) {
  if (items.length === 0) return null
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {item.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.storage} ·{' '}
                {item.quantity_label || `${item.quantity}${item.unit}`}
              </p>
            </div>
            <Badge variant="outline" className={cn('shrink-0', badgeClass)}>
              {label(item)}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 스마트 알림 화면에서 내 냉장고의 만료·임박·부족 재료를 모아 본다. */
export function MyExpiryAlertsSection() {
  const { user, isReady } = useAuth()
  const openLogin = useOpenLogin()
  const [state, setState] = useState<State>({ kind: 'loading' })

  const load = useCallback(async () => {
    if (!user?.email) return
    setState({ kind: 'loading' })
    try {
      const data = await fetchInventory(user.email)
      setState({ kind: 'success', items: data.items })
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : '재고를 불러오지 못했습니다.',
      })
    }
  }, [user])

  useEffect(() => {
    if (!user?.email) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [user, load])

  // 상태(만료/임박/부족)는 재고 API가 계산해 준 값을 그대로 쓴다.
  const expired =
    state.kind === 'success'
      ? state.items.filter((i) => i.status === '만료').sort(byExpiry)
      : []
  const expiring =
    state.kind === 'success'
      ? state.items.filter((i) => i.status === '임박').sort(byExpiry)
      : []
  const lowStock =
    state.kind === 'success'
      ? state.items.filter((i) => i.status === '부족')
      : []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5 text-accent" />내 냉장고 알림
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          유통기한이 3일 이내이거나 지난 재료, 최소 수량 아래로 내려간
          재료입니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isReady ? null : !user?.email ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              로그인하면 내 냉장고 기준으로 알려 드립니다.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openLogin}
            >
              로그인
            </Button>
          </div>
        ) : state.kind === 'loading' ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : state.kind === 'error' ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{state.message}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              다시 시도
            </Button>
          </div>
        ) : expired.length + expiring.length + lowStock.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            지금 알릴 재료가 없습니다.{' '}
            <Link
              href="/features/inventory"
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              재고 관리
            </Link>
            에서 재료를 추가해 보세요.
          </p>
        ) : (
          <div className="space-y-6">
            <AlertGroup
              title="유통기한 지남"
              items={expired}
              badgeClass="border-destructive/40 bg-destructive/10 text-destructive"
              label={(i) =>
                i.expiry_date ? dDayLabel(daysLeft(i.expiry_date)) : '만료'
              }
            />
            <AlertGroup
              title="곧 만료 (3일 이내)"
              items={expiring}
              badgeClass="border-destructive/40 bg-destructive/10 text-destructive"
              label={(i) =>
                i.expiry_date ? dDayLabel(daysLeft(i.expiry_date)) : '임박'
              }
            />
            <AlertGroup
              title="재고 부족"
              items={lowStock}
              badgeClass="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              label={(i) => `최소 ${i.min_quantity}${i.unit}`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
