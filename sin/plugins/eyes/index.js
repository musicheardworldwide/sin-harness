/**
 * Host half of the eyes bundle: two loopback routes that let the open page and
 * the agent exchange measurements through the workspace.
 *
 *   GET  /sin/eyes/request  -> the pending measurement request (204 when none)
 *   POST /sin/eyes/report   -> a JSON report written under /workspace/sin/eyes/reports
 *
 * The agent writes requests; the page answers them. No page state is exposed
 * beyond elements matching the requested selectors.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = '/workspace/sin/eyes'
const REPORTS = join(ROOT, 'reports')
const REQUEST = join(ROOT, 'request.json')
const MAX_BODY_BYTES = 64 * 1024

export function apply(ctx) {
  const server = ctx.get('webServer')
  if (!server) {
    ctx.logger?.warn?.('sin-eyes: no webServer in this composition; eyes are inert')
    return
  }

  void mkdir(REPORTS, { recursive: true }).catch(() => {})

  ctx.effect(() => {
    const disposeRequest = server.register({
      kind: 'exact',
      path: '/sin/eyes/request',
      handler: async (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405, { allow: 'GET, HEAD' }).end()
          return
        }
        try {
          const body = await readFile(REQUEST, 'utf8')
          res.writeHead(200, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
          }).end(req.method === 'HEAD' ? undefined : body)
        } catch {
          res.writeHead(204, { 'cache-control': 'no-store' }).end()
        }
      },
    })

    const disposeReport = server.register({
      kind: 'exact',
      path: '/sin/eyes/report',
      handler: (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { allow: 'POST' }).end()
          return
        }
        const chunks = []
        let size = 0
        let aborted = false
        req.on('data', (chunk) => {
          if (aborted) return
          size += chunk.length
          if (size > MAX_BODY_BYTES) {
            aborted = true
            req.destroy()
            return
          }
          chunks.push(chunk)
        })
        req.on('end', () => {
          if (aborted) return
          const body = Buffer.concat(chunks)
          const stamp = new Date().toISOString().replace(/[:.]/g, '-')
          void mkdir(REPORTS, { recursive: true })
            .then(() => writeFile(join(REPORTS, `report-${stamp}.json`), body))
            .then(() => res.writeHead(204, { 'cache-control': 'no-store' }).end())
            .catch((error) => res.writeHead(500).end(String(error?.message ?? error)))
        })
      },
    })

    return () => {
      disposeRequest()
      disposeReport()
    }
  })
}
