// Sin eyes — a measurement channel from the open page back to the workspace.
// The agent writes a request to /workspace/sin/eyes/request.json; this module
// polls the Host route, measures the requested selectors, and posts the report.
// It renders nothing and modifies no other plugin's state.

window.__ModuleLoader__.load({
  id: '@sin/eyes',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect } = React

    const POLL_MS = 2000
    const MAX_MATCHES = 3
    const MAX_TEXT = 200
    const STYLE_KEYS = [
      'display', 'position', 'visibility', 'opacity', 'zIndex',
      'fontSize', 'fontWeight', 'lineHeight', 'fontFamily', 'color',
      'backgroundColor', 'borderRadius', 'padding', 'margin', 'gap',
      'width', 'height', 'overflow', 'transform',
    ]

    function roundRect(rect) {
      return {
        x: Math.round(rect.x * 100) / 100,
        y: Math.round(rect.y * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
      }
    }

    function readStyles(element) {
      const computed = window.getComputedStyle(element)
      const styles = {}
      for (const key of STYLE_KEYS) styles[key] = computed[key]
      return styles
    }

    function describe(element) {
      const rect = element.getBoundingClientRect()
      const styles = readStyles(element)
      const inViewport = rect.bottom > 0 && rect.right > 0
        && rect.top < window.innerHeight && rect.left < window.innerWidth
      return {
        tag: element.tagName.toLowerCase(),
        classes: typeof element.className === 'string' ? element.className : '',
        rect: roundRect(rect),
        inViewport,
        visible: rect.width > 0 && rect.height > 0
          && styles.display !== 'none' && styles.visibility !== 'hidden'
          && Number(styles.opacity) > 0.01,
        text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT),
        styles,
      }
    }

    function measure(request) {
      const selectors = Array.isArray(request.selectors) ? request.selectors.slice(0, 12) : []
      const matches = []
      for (const selector of selectors) {
        let elements = []
        try {
          elements = Array.from(document.querySelectorAll(selector)).slice(0, MAX_MATCHES)
        } catch (error) {
          matches.push({ selector, error: String(error?.message ?? error) })
          continue
        }
        matches.push({
          selector,
          count: document.querySelectorAll(selector).length,
          samples: elements.map(describe),
        })
      }
      const root = document.documentElement
      return {
        requestId: request.id ?? null,
        label: request.label ?? null,
        at: new Date().toISOString(),
        page: {
          url: location.href,
          title: document.title,
          lang: root.lang || null,
          theme: root.dataset?.theme ?? document.body?.dataset?.theme ?? null,
          colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
          bodyBackground: window.getComputedStyle(document.body).backgroundColor,
          bodyColor: window.getComputedStyle(document.body).color,
        },
        matches,
      }
    }

    async function poll(lastId) {
      if (document.hidden) return lastId
      let request
      try {
        const response = await fetch('/sin/eyes/request', { cache: 'no-store' })
        if (response.status !== 200) return lastId
        request = await response.json()
      } catch {
        return lastId
      }
      if (!request || typeof request.id !== 'number' || request.id <= lastId) return lastId
      try {
        await fetch('/sin/eyes/report', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(measure(request)),
        })
      } catch {
        // A failed report leaves the request pending for the next poll.
        return lastId
      }
      return request.id
    }

    function Eyes() {
      useEffect(() => {
        let lastId = 0
        let stopped = false
        const tick = async () => {
          lastId = await poll(lastId)
          if (stopped) return
          window.setTimeout(tick, POLL_MS)
        }
        window.setTimeout(tick, 500)
        return () => { stopped = true }
      }, [])
      return null
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register({
            name: 'conversation.composer.dock',
            id: 'sin-eyes',
            order: 98,
          }, Eyes))
      },
    }
  },
})
