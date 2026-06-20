'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Shared building blocks for the Fiscus settings screens. On-brand with the
// gold-on-dark design tokens in globals.css.
// ─────────────────────────────────────────────────────────────────────────────

// ── Page scaffold: sticky back header + scroll container ──────────────────────

export function SettingsScaffold({
  title,
  eyebrow,
  children,
  backTo = '/profile',
}: {
  title: string
  eyebrow?: string
  children: React.ReactNode
  backTo?: string
}) {
  const router = useRouter()
  return (
    <div className="h-full overflow-y-auto scroll-y" style={{ background: 'var(--bg)' }}>
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
        style={{
          background: 'rgba(8,12,24,0.92)',
          backdropFilter: 'blur(12px) saturate(160%)',
          WebkitBackdropFilter: 'blur(12px) saturate(160%)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <button
          onClick={() => router.push(backTo)}
          aria-label="Back"
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'var(--bg-3)', border: '1px solid var(--line-2)',
            color: 'var(--text-secondary)',
          }}
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <div className="min-w-0">
          {eyebrow && (
            <p
              className="text-[9px] font-mono uppercase tracking-[0.18em] mb-0.5"
              style={{ color: 'var(--text-muted)' }}
            >
              {eyebrow}
            </p>
          )}
          <h1
            className="font-serif font-semibold text-[18px] leading-none truncate"
            style={{ letterSpacing: '-0.01em' }}
          >
            {title}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-12">{children}</div>
    </div>
  )
}

// ── Grouped card with optional section label + footnote ───────────────────────

export function Group({
  label,
  footer,
  children,
}: {
  label?: string
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  const items = React.Children.toArray(children).filter(Boolean)
  return (
    <div className="mb-6">
      {label && (
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className="text-[9px] font-bold uppercase tracking-[0.18em] font-mono"
            style={{ color: 'var(--text-muted)' }}
          >
            {label}
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
        </div>
      )}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--line)', background: 'var(--bg-2)' }}
      >
        {items.map((child, i) =>
          React.isValidElement(child) && (child.type === Row || child.type === ToggleRow)
            ? React.cloneElement(child as React.ReactElement<RowProps>, { _last: i === items.length - 1 })
            : child,
        )}
      </div>
      {footer && (
        <p className="text-[10.5px] mt-2 px-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {footer}
        </p>
      )}
    </div>
  )
}

// ── Setting row ───────────────────────────────────────────────────────────────

export interface RowProps {
  icon?: React.ElementType
  iconColor?: string
  label: string
  sub?: string
  right?: React.ReactNode
  value?: string
  chevron?: boolean
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
  _last?: boolean
}

export function Row({
  icon: Icon, iconColor, label, sub, right, value, chevron, onClick, danger, disabled, _last,
}: RowProps) {
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3.5 w-full text-left">
      {Icon && (
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'var(--bg-3)', border: '1px solid var(--line)',
          }}
        >
          <Icon size={15} strokeWidth={1.9} style={{ color: danger ? 'var(--red)' : iconColor ?? 'var(--text-secondary)' }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium" style={{ color: danger ? 'var(--red)' : 'var(--text-primary)' }}>
          {label}
        </div>
        {sub && (
          <div className="text-[10.5px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
            {sub}
          </div>
        )}
      </div>
      {value && (
        <span className="text-[12px] font-medium flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          {value}
        </span>
      )}
      {right}
      {chevron && <ChevronRight size={15} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
    </div>
  )

  const style: React.CSSProperties = {
    background: 'var(--bg-2)',
    borderBottom: _last ? 'none' : '1px solid var(--line)',
    opacity: disabled ? 0.5 : 1,
  }

  if (onClick) {
    return (
      <button onClick={onClick} disabled={disabled} className="w-full" style={style}>
        {inner}
      </button>
    )
  }
  return <div className="w-full" style={style}>{inner}</div>
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

export function Toggle({
  checked, onChange, disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className="relative flex-shrink-0"
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: checked ? 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 100%)' : 'var(--bg-4)',
        border: checked ? '1px solid transparent' : '1px solid var(--line-2)',
        opacity: disabled ? 0.4 : 1,
        boxShadow: checked ? '0 0 12px rgba(232,184,75,0.30)' : 'none',
        transition: 'background 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <span
        style={{
          position: 'absolute', top: 2, left: checked ? 20 : 2,
          width: 20, height: 20, borderRadius: '50%',
          background: checked ? '#05081a' : '#8da0c0',
          transition: 'left 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </button>
  )
}

// ── Convenience: a row whose right slot is a toggle ───────────────────────────

export function ToggleRow(props: Omit<RowProps, 'right' | 'onClick'> & {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const { checked, onChange, disabled, ...rest } = props
  return <Row {...rest} disabled={disabled} right={<Toggle checked={checked} onChange={onChange} disabled={disabled} />} />
}

// ── Segmented control ─────────────────────────────────────────────────────────

export function Segmented<T extends string>({
  value, onChange, options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              background: active ? 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 100%)' : 'transparent',
              color: active ? '#05081a' : 'var(--text-muted)',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Info / warning banner ─────────────────────────────────────────────────────

const TONES = {
  gold:  { bg: 'rgba(232,184,75,0.08)', border: 'rgba(232,184,75,0.22)', color: 'var(--gold)' },
  blue:  { bg: 'rgba(91,138,245,0.08)', border: 'rgba(91,138,245,0.22)', color: 'var(--blue)' },
  green: { bg: 'rgba(34,212,138,0.08)', border: 'rgba(34,212,138,0.22)', color: 'var(--green)' },
  red:   { bg: 'rgba(255,79,79,0.08)',  border: 'rgba(255,79,79,0.22)',  color: 'var(--red)' },
} as const

export function Banner({
  icon: Icon, tone = 'gold', children,
}: {
  icon?: React.ElementType
  tone?: keyof typeof TONES
  children: React.ReactNode
}) {
  const c = TONES[tone]
  return (
    <div
      className="flex gap-2.5 rounded-2xl px-3.5 py-3 mb-5"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      {Icon && <Icon size={15} strokeWidth={2} style={{ color: c.color, flexShrink: 0, marginTop: 1 }} />}
      <div className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </div>
  )
}

// ── Bottom-sheet modal ────────────────────────────────────────────────────────

export function Modal({
  open, onClose, title, children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(5,8,26,0.62)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl slide-up"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', maxHeight: '88vh', overflowY: 'auto' }}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
          style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}
        >
          <span className="font-serif font-semibold text-[16px]">{title}</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center"
            style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--line)', color: 'var(--text-muted)' }}
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

// ── Buttons ───────────────────────────────────────────────────────────────────

export function GoldButton({
  children, onClick, disabled, type = 'button', danger,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  danger?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-xl text-[13px] font-bold transition-opacity"
      style={{
        background: danger ? 'var(--red)' : 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 100%)',
        color: danger ? '#fff' : '#05081a',
        opacity: disabled ? 0.55 : 1,
        boxShadow: danger ? 'none' : '0 4px 18px rgba(232,184,75,0.22)',
      }}
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children, onClick, disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-xl text-[13px] font-semibold"
      style={{ background: 'var(--bg-3)', border: '1px solid var(--line-2)', color: 'var(--text-secondary)', opacity: disabled ? 0.55 : 1 }}
    >
      {children}
    </button>
  )
}

// ── Labelled text field ───────────────────────────────────────────────────────

export function TextField({
  label, value, onChange, type = 'text', placeholder, autoFocus, inputMode, maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  autoFocus?: boolean
  inputMode?: 'text' | 'numeric'
  maxLength?: number
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputMode={inputMode}
        maxLength={maxLength}
        className="w-full px-3.5 py-3 rounded-xl text-[13px] outline-none"
        style={{ background: 'var(--bg-3)', border: '1px solid var(--line-2)', color: 'var(--text-primary)' }}
      />
    </label>
  )
}

