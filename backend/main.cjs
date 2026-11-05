// Headless OPNduck for the Omarchy plugin. Runs the real OPNduck job core (no Electron, no desktop app).
// Protocol: JSON lines. In: {cmd, ...}. Out: {type, ...}. Data lives in the plugin's own folder.
const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')
const readline = require('node:readline')

const DATA = path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'omarchy-opnduck')
const OUT = path.join(os.homedir(), 'Downloads', 'OPNduck')
fs.mkdirSync(OUT, { recursive: true })
process.env.XDG_CONFIG_HOME = DATA // userDataDir() = $XDG_CONFIG_HOME/opnduck-desktop -> separate settings + history

const { createNodePlatform } = require('@opnduck/electron/core/platform.cjs')
const { createCore } = require('@opnduck/electron/core/index.cjs')
const { TOOLS, buildStartRequest } = require('@opnduck/electron/mcp_tools.cjs')

const send = (o) => process.stdout.write(JSON.stringify(o) + '\n')
const platform = createNodePlatform({ version: '0.1.0', scriptsDir: __dirname })
platform.paths.downloads = OUT
platform.notify = () => true // the shell shows its own state
const core = createCore({ platform })
core.engine.loadHistory()
core.engine.applyQueueLimits()

const CORE4 = new Set(['download', 'convert', 'compress', 'trim'])
let paused = false

function snapshot() {
  const tasks = [...core.engine.tasks.values()].map((t) => t.state).slice(-30).reverse().map((s) => ({
    id: String(s.id), kind: String(s.kind ?? ''), status: String(s.status ?? ''),
    progress: Math.max(0, Math.min(1, Number(s.progress) || 0)),
    label: String(s.label ?? '').slice(0, 120), error: String(s.error ?? '').slice(0, 200),
  }))
  send({ type: 'tasks', tasks, paused })
}
platform.on('tasks:update', snapshot)
platform.on('queue:state', (q) => { paused = !!q.paused; snapshot() })

async function handle(msg) {
  try {
    if (msg.cmd === 'start') {
      if (!CORE4.has(msg.tool)) throw new Error('Unknown tool')
      const { channel, req } = buildStartRequest(msg.tool, msg.args)
      if (msg.tool === 'download') { try { if (!/^https?:$/.test(new URL(req.url).protocol)) throw 0 } catch { throw new Error('Needs a full http(s) link') } }
      else if (!path.isAbsolute(req.inputPath) || !fs.statSync(req.inputPath).isFile()) throw new Error('File not found')
      await core.startJob(channel, req)
    } else if (msg.cmd === 'cancel') core.engine.cancelTask(String(msg.id))
    else if (msg.cmd === 'pause') core.engine.setQueuePaused(true)
    else if (msg.cmd === 'resume') core.engine.setQueuePaused(false)
    else if (msg.cmd === 'clear') core.engine.clearFinished()
    else if (msg.cmd === 'reveal') core.engine.revealTask(String(msg.id))
    else if (msg.cmd === 'folder') platform.openPath(OUT)
    snapshot()
  } catch (e) { send({ type: 'error', message: String(e.message || e).slice(0, 200) }) }
}

readline.createInterface({ input: process.stdin }).on('line', (l) => { try { handle(JSON.parse(l)) } catch {} }).on('close', () => { try { core.shutdown() } catch {} process.exit(0) })
send({ type: 'ready', tools: TOOLS.filter((t) => CORE4.has(t.name)).map((t) => t.name), outDir: OUT })
snapshot()
