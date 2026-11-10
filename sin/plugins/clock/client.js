// Sin clock — a live clock in the composer dock.
// Registered through the dynamic Client module loader; the id must equal the
// package name so the bundle row and this factory resolve to each other.

window.__ModuleLoader__.load({
  id: '@sin/clock',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useState, useSyncExternalStore } = React

    const NS = 'sin-clock'

    // Runtime copy. Kept beside the exported locale JSON, which serves the
    // plugin-inventory display metadata rather than the live component.
    const DICTS = {
      en: { title: "Sin's clock", to24: 'Show 24-hour time', to12: 'Show 12-hour time' },
      de: { title: 'Sins Uhr', to24: '24-Stunden-Zeit anzeigen', to12: '12-Stunden-Zeit anzeigen' },
      es: { title: 'El reloj de Sin', to24: 'Mostrar hora de 24 horas', to12: 'Mostrar hora de 12 horas' },
      fr: { title: "L'horloge de Sin", to24: "Afficher l'heure sur 24 heures", to12: "Afficher l'heure sur 12 heures" },
      ja: { title: 'シンの時計', to24: '24時間表示にする', to12: '12時間表示にする' },
      pt: { title: 'O relógio do Sin', to24: 'Mostrar hora de 24 horas', to12: 'Mostrar hora de 12 horas' },
      ru: { title: 'Часы Сина', to24: 'Показать 24-часовой формат', to12: 'Показать 12-часовой формат' },
    }

    const CSS = `
.sin-clock {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  max-width: 100%;
  padding: 1px 8px;
  border: 0;
  border-radius: var(--dsw-radius-sm, 6px);
  background: transparent;
  color: var(--dsw-alias-label-secondary, #6b7280);
  font: inherit;
  font-size: calc(var(--dsh-content-font-size-secondary, 13px) - 1px);
  line-height: 20px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}
.sin-clock:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, 0.12));
  color: var(--dsw-alias-label-primary, #111827);
}
.sin-clock:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #247bbf);
  outline-offset: 2px;
}
.sin-clock svg { display: block; flex: none; }
.sin-clock-time {
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--dsw-alias-label-primary, #111827);
}
.sin-clock-meta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary, #6b7280);
  opacity: 0.85;
}
.sin-clock-dot { opacity: 0.45; }
@media (max-width: 720px) {
  .sin-clock-meta { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .sin-clock { transition: none; }
}
`

    const pad = (n) => String(n).padStart(2, '0')

    // Align the first tick to a whole second, then tick once per second.
    function useNow() {
      const [now, setNow] = useState(() => new Date())
      useEffect(() => {
        let interval = 0
        const tick = () => setNow(new Date())
        const align = window.setTimeout(() => {
          tick()
          interval = window.setInterval(tick, 1000)
        }, 1000 - (Date.now() % 1000))
        return () => {
          window.clearTimeout(align)
          window.clearInterval(interval)
        }
      }, [])
      return now
    }

    function Dial({ now }) {
      const seconds = now.getSeconds()
      const minutes = now.getMinutes() + seconds / 60
      const hours = (now.getHours() % 12) + minutes / 60
      const turn = (value, per) => `rotate(${(value * per).toFixed(2)} 12 12)`
      return h(
        'svg',
        { viewBox: '0 0 24 24', width: 14, height: 14, 'aria-hidden': 'true' },
        h('circle', {
          cx: 12, cy: 12, r: 10.1, fill: 'none',
          stroke: 'var(--dsw-alias-border-l2, rgba(127,127,127,0.45))', strokeWidth: 1.3,
        }),
        h('line', {
          x1: 12, y1: 12, x2: 12, y2: 7.7, stroke: 'var(--dsw-alias-label-primary, #111827)',
          strokeWidth: 1.7, strokeLinecap: 'round', transform: turn(hours, 30),
        }),
        h('line', {
          x1: 12, y1: 12, x2: 12, y2: 5.6, stroke: 'var(--dsw-alias-label-primary, #111827)',
          strokeWidth: 1.3, strokeLinecap: 'round', transform: turn(minutes, 6),
        }),
        h('line', {
          x1: 12, y1: 12, x2: 12, y2: 3.6, stroke: 'var(--dsw-alias-brand-primary, #247bbf)',
          strokeWidth: 1, strokeLinecap: 'round', transform: turn(seconds, 6),
        }),
        h('circle', { cx: 12, cy: 12, r: 1.2, fill: 'var(--dsw-alias-brand-primary, #247bbf)' }),
      )
    }

    function Clock({ now, hour12, onToggle, t, activeLocale }) {
      const local = now.getHours()
      const clockTime = hour12
        ? `${(local % 12) || 12}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${local < 12 ? 'AM' : 'PM'}`
        : `${pad(local)}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

      let dateText = ''
      let zoneText = ''
      try {
        dateText = new Intl.DateTimeFormat(activeLocale, {
          weekday: 'short', day: 'numeric', month: 'short',
        }).format(now)
        zoneText = new Intl.DateTimeFormat(activeLocale, { timeZoneName: 'short' })
          .formatToParts(now)
          .find((part) => part.type === 'timeZoneName')?.value ?? ''
      } catch {
        dateText = now.toDateString()
      }

      return h(
        'button',
        {
          type: 'button',
          className: 'sin-clock',
          title: t('title'),
          'aria-label': `${clockTime} ${dateText}`.trim(),
          onClick: onToggle,
        },
        h(Dial, { now }),
        h('span', { className: 'sin-clock-time' }, clockTime),
        h('span', { className: 'sin-clock-meta', 'aria-hidden': 'true' },
          dateText && h('span', null, dateText),
          zoneText && h('span', { className: 'sin-clock-dot' }, '·'),
          zoneText && h('span', null, zoneText),
        ),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const locale = ctx.get('locale')

        // Styles live with the plugin so unmounting restores the page.
        ctx.effect(() => {
          const style = document.createElement('style')
          style.setAttribute('data-sin-clock', '')
          style.textContent = CSS
          document.head.appendChild(style)
          return () => style.remove()
        })

        if (locale) {
          for (const [id, dict] of Object.entries(DICTS)) {
            ctx.effect(() => locale.register(NS, id, dict))
          }
        }

        const fallback = (key) => DICTS.en[key] ?? key

        // Stable identities: the snapshot reference is stable between locale
        // changes, and the subscribe thunk must not change per render.
        const NO_LOCALE = Object.freeze({ active: 'en' })
        const subscribe = locale ? (notify) => locale.subscribe(notify) : () => () => {}
        const getSnapshot = locale ? () => locale.getLocale() : () => NO_LOCALE

        function ClockView(props) {
          const now = useNow()
          const [hour12, setHour12] = useState(true)
          const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => NO_LOCALE)
          const t = props.t ?? fallback
          return h(Clock, {
            now,
            hour12,
            onToggle: () => setHour12((value) => !value),
            t,
            activeLocale: snapshot.active ?? 'en',
          })
        }

        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register({
            name: 'conversation.composer.dock',
            id: 'sin-clock',
            order: 2,
            locale: NS,
          }, ClockView))
      },
    }
  },
})
