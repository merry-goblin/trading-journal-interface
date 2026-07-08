<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { getStats, getStatsByTag, getEquity, getRRDist, getTemporal } from '@/services/statsService'
import { getTags } from '@/services/tagService'

const stats    = ref(null)
const byTag    = ref([])
const equity   = ref([])
const rrDist   = ref([])
const temporal = ref(null)
const tags     = ref([])
const loading  = ref(true)

// Memes filtres que /journal
// isBacktest : false = live, true = backtest, null = tous
const filters = ref({
    isBacktest:    false,
    direction:     '',
    planRespected: '',
    tagId:         '',
    dateFrom:      '',
    dateTo:        '',
})

const modeLabel = { false: 'Live', true: 'Backtest', null: 'Tous' }

onMounted(async () => {
    tags.value = (await getTags()).data
    await loadAll()
    loading.value = false
})

watch(filters, () => loadAll(), { deep: true })

async function loadAll() {
    const f = {
        isBacktest:    filters.value.isBacktest,
        direction:     filters.value.direction     || undefined,
        tagId:         filters.value.tagId         || undefined,
        dateFrom:      filters.value.dateFrom      || undefined,
        dateTo:        filters.value.dateTo        || undefined,
        planRespected: filters.value.planRespected !== '' ? filters.value.planRespected : undefined,
    }

    const [sRes, eRes, rrRes, tRes] = await Promise.all([
        getStats(f), getEquity(f), getRRDist(f), getTemporal(f)
    ])
    stats.value    = sRes.data
    equity.value   = eRes.data
    rrDist.value   = rrRes.data
    temporal.value = tRes.data

    // by-tag : uniquement si pas de filtre par tag specifique
    if (!filters.value.tagId) {
        byTag.value = (await getStatsByTag(f)).data.sort((a, b) => b.count - a.count)
    } else {
        byTag.value = []
    }
}

// ── Courbe d'equity + drawdown ────────────────────────────────────
const SVG_W = 800, SVG_H = 220
const PAD = { top: 20, right: 20, bottom: 30, left: 65 }

const equityPath = computed(() => {
    const data = equity.value
    if (data.length < 2) return { line: '', area: '', ddArea: '', zero: SVG_H/2, points: [], labels: [], minV: 0, maxV: 0, maxDD: 0 }
    const vals = data.map(d => d.cumulative)
    const minV = Math.min(0, ...vals), maxV = Math.max(0, ...vals)
    const range = maxV - minV || 1
    const innerW = SVG_W - PAD.left - PAD.right
    const innerH = SVG_H - PAD.top  - PAD.bottom
    const xAt = i   => PAD.left + (i / (data.length - 1)) * innerW
    const yAt = val => PAD.top  + innerH - ((val - minV) / range) * innerH
    const zeroY = yAt(0)

    let runMax = data[0].cumulative, maxDD = 0
    const pts = data.map((d, i) => {
        runMax = Math.max(runMax, d.cumulative)
        const dd = d.cumulative - runMax
        maxDD = Math.min(maxDD, dd)
        return { x: xAt(i), y: yAt(d.cumulative), yMax: yAt(runMax), dd, ...d }
    })

    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const last = pts[pts.length - 1]
    const area = `${line} L${last.x.toFixed(1)},${zeroY.toFixed(1)} L${pts[0].x.toFixed(1)},${zeroY.toFixed(1)} Z`

    let ddArea = '', inDD = false, ddPath = ''
    pts.forEach((p, i) => {
        if (p.dd < 0) {
            if (!inDD) { ddPath = `M${p.x.toFixed(1)},${p.yMax.toFixed(1)}`; inDD = true }
            else ddPath += ` L${p.x.toFixed(1)},${p.yMax.toFixed(1)}`
        } else {
            if (inDD) { ddPath += ` L${pts[i-1]?.x.toFixed(1)},${pts[i-1]?.y.toFixed(1)}`; inDD = false; ddArea += ddPath + ' Z ' }
        }
    })
    if (inDD) ddArea += ddPath + ` L${last.x.toFixed(1)},${last.y.toFixed(1)} Z`

    const step = Math.ceil(data.length / 8)
    const labels = pts.filter((_, i) => i === 0 || i === data.length-1 || i % step === 0)
    return { line, area, ddArea, zero: zeroY, points: pts, labels, minV, maxV, maxDD }
})

const finalPnl = computed(() =>
    equity.value.length ? equity.value[equity.value.length - 1].cumulative : 0
)

// ── Histogramme R:R ───────────────────────────────────────────────
const RR_W = 600, RR_H = 180, RR_PAD = { top: 20, right: 20, bottom: 40, left: 50 }

const rrChart = computed(() => {
    const data = rrDist.value
    if (!data.length) return null
    const maxCount = Math.max(...data.map(d => d.count))
    const innerW = RR_W - RR_PAD.left - RR_PAD.right
    const innerH = RR_H - RR_PAD.top  - RR_PAD.bottom
    const bw = innerW / data.length
    return data.map((d, i) => {
        const h = (d.count / maxCount) * innerH
        const x = RR_PAD.left + i * bw + bw * 0.1
        const y = RR_PAD.top + innerH - h
        return { ...d, x, y, w: bw * 0.8, h,
                 fill: d.min >= 0 ? 'rgba(34,197,94,.7)' : 'rgba(239,68,68,.7)',
                 labelX: x + bw * 0.4 }
    })
})

// ── Analyse temporelle ────────────────────────────────────────────
const TEMP_H = 140, TEMP_PAD = { top: 16, right: 12, bottom: 32, left: 50 }

function buildBars(data) {
    if (!data?.length) return []
    const maxAbs = Math.max(...data.map(d => Math.abs(d.pnl))) || 1
    const innerH = TEMP_H - TEMP_PAD.top - TEMP_PAD.bottom
    const innerW = 560 - TEMP_PAD.left - TEMP_PAD.right
    const bw = innerW / data.length
    const zeroY = TEMP_PAD.top + innerH / 2
    return data.map((d, i) => {
        const ratio = Math.abs(d.pnl) / maxAbs
        const h = ratio * (innerH / 2)
        const positive = parseFloat(d.pnl) >= 0
        const x = TEMP_PAD.left + i * bw + bw * 0.1
        const y = positive ? zeroY - h : zeroY
        return { ...d, x, y, w: bw * 0.8, h,
                 fill: positive ? 'rgba(34,197,94,.7)' : 'rgba(239,68,68,.7)',
                 zeroY, labelX: x + bw * 0.4 }
    })
}

// Helpers
function formatPnl(pnl) {
    if (!pnl) return '—'; const v = parseFloat(pnl)
    return (v >= 0 ? '+' : '') + v.toFixed(2) + ' €'
}
function winrateColor(wr) {
    return wr >= 60 ? 'var(--success)' : wr >= 45 ? 'var(--warning)' : 'var(--danger)'
}
function expColor(e)  { if (e === null) return 'var(--text-2)'; return parseFloat(e) > 0 ? 'var(--success)' : 'var(--danger)' }
function pfColor(pf)  { if (pf === null) return 'var(--text-2)'; return parseFloat(pf) >= 1.5 ? 'var(--success)' : parseFloat(pf) >= 1.0 ? 'var(--warning)' : 'var(--danger)' }
</script>

<template>
  <div>
    <!-- En-tête -->
    <div class="page-header">
      <div class="page-title">Statistiques</div>
      <div class="page-subtitle">Performance globale et par setup</div>
    </div>

    <!-- ── Filtres (identiques au Journal) ───────────────────────── -->
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">

        <!-- Mode Live / Backtest / Tous -->
        <div class="form-group">
          <label class="form-label">Mode</label>
          <div style="display:flex;gap:4px">
            <button v-for="val in [false, true, null]" :key="String(val)"
                    class="btn btn-sm"
                    :style="{
                      background: filters.isBacktest === val ? 'rgba(59,111,255,.25)' : 'var(--card)',
                      color: filters.isBacktest === val ? 'var(--accent)' : 'var(--text-2)',
                      border: '1px solid var(--border)'
                    }"
                    @click="filters.isBacktest = val">
              {{ modeLabel[String(val)] }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Direction</label>
          <select v-model="filters.direction" class="form-control">
            <option value="">Toutes</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Plan respecté</label>
          <select v-model="filters.planRespected" class="form-control">
            <option value="">Tous</option>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        </div>

        <div class="form-group" v-if="tags.length">
          <label class="form-label">Tag</label>
          <select v-model="filters.tagId" class="form-control">
            <option value="">Tous</option>
            <option v-for="t in tags" :key="t.id" :value="t.id">{{ t.label }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Du</label>
          <input v-model="filters.dateFrom" type="date" class="form-control" />
        </div>

        <div class="form-group">
          <label class="form-label">Au</label>
          <input v-model="filters.dateTo" type="date" class="form-control" />
        </div>

      </div>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <template v-else>
      <!-- ── Stats globales ─────────────────────────────────────── -->
      <div class="stat-grid" style="margin-bottom:20px">
        <div class="stat-card"><div class="label">Trades</div><div class="value">{{ stats.totalTrades }}</div></div>
        <div class="stat-card" :class="stats.winrate >= 50 ? 'success' : 'danger'">
          <div class="label">Winrate</div><div class="value">{{ stats.winrate }}%</div>
          <div class="winrate-bar"><div class="winrate-bar-fill" :style="{ width: stats.winrate + '%' }"></div></div>
        </div>
        <div class="stat-card" :class="stats.totalPnl >= 0 ? 'success' : 'danger'">
          <div class="label">P&L Total</div><div class="value">{{ formatPnl(stats.totalPnl) }}</div>
        </div>
        <div class="stat-card accent">
          <div class="label">R:R Moyen</div>
          <div class="value">{{ stats.avgRr ? '1:' + stats.avgRr : '—' }}</div>
        </div>
        <div class="stat-card">
          <div class="label">Espérance / trade</div>
          <div class="value" :style="{ color: expColor(stats.expectancy) }">
            {{ stats.expectancy !== null ? formatPnl(stats.expectancy) : '—' }}
          </div>
          <div v-if="stats.avgWin !== null" style="font-size:11px;color:var(--text-muted);margin-top:4px">
            Gain moy. {{ formatPnl(stats.avgWin) }} · Perte moy. {{ formatPnl(stats.avgLoss) }}
          </div>
        </div>
        <div class="stat-card">
          <div class="label">Profit Factor</div>
          <div class="value" :style="{ color: pfColor(stats.profitFactor) }">
            {{ stats.profitFactor ?? '—' }}
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">
            ≥ 1.5 = solide · ≥ 1.0 = rentable
          </div>
        </div>
        <div class="stat-card"><div class="label">Série gain max</div><div class="value" style="color:var(--success)">{{ stats.maxWinStreak }}</div></div>
        <div class="stat-card"><div class="label">Série perte max</div><div class="value" style="color:var(--danger)">{{ stats.maxLossStreak }}</div></div>
        <div class="stat-card" v-if="stats.disciplineScore !== null"><div class="label">Discipline</div><div class="value">{{ stats.disciplineScore }}%</div></div>
      </div>

      <!-- ── Courbe d'equity + Drawdown ─────────────────────────── -->
      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
          <div class="card-title" style="margin-bottom:0">Courbe d'equity</div>
          <div style="display:flex;gap:16px;align-items:center">
            <span v-if="equityPath.maxDD < 0" :style="{ color: 'var(--danger)', fontSize: '13px' }">
              Drawdown max : {{ equityPath.maxDD.toFixed(2) }} €
            </span>
            <span v-if="equity.length" :style="{ color: finalPnl >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700, fontSize: '18px' }">
              {{ formatPnl(finalPnl) }}
            </span>
          </div>
        </div>
        <div v-if="equity.length < 2" class="empty-state" style="padding:32px"><p>Au moins 2 trades requis.</p></div>
        <div v-else style="overflow-x:auto">
          <svg :viewBox="`0 0 ${SVG_W} ${SVG_H}`" width="100%" :height="SVG_H" style="display:block">
            <line :x1="PAD.left" :x2="SVG_W-PAD.right" :y1="equityPath.zero" :y2="equityPath.zero"
                  stroke="rgba(100,116,139,.6)" stroke-width="1" stroke-dasharray="4,4"/>
            <path v-if="equityPath.ddArea" :d="equityPath.ddArea" fill="rgba(239,68,68,.15)"/>
            <defs>
              <linearGradient id="eq-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   :stop-color="finalPnl>=0?'#22c55e':'#ef4444'" stop-opacity="0.2"/>
                <stop offset="100%" :stop-color="finalPnl>=0?'#22c55e':'#ef4444'" stop-opacity="0.02"/>
              </linearGradient>
            </defs>
            <path :d="equityPath.area" fill="url(#eq-g)"/>
            <path :d="equityPath.line" :stroke="finalPnl>=0?'#22c55e':'#ef4444'" stroke-width="2" fill="none" stroke-linejoin="round"/>
            <circle v-if="equityPath.points.length"
                    :cx="equityPath.points[equityPath.points.length-1].x"
                    :cy="equityPath.points[equityPath.points.length-1].y"
                    r="4" :fill="finalPnl>=0?'#22c55e':'#ef4444'"/>
            <text v-for="p in equityPath.labels" :key="p.closedAt" :x="p.x" :y="SVG_H-8"
                  text-anchor="middle" fill="#475569" font-size="10" font-family="Arial">{{ p.date }}</text>
            <text :x="PAD.left-4" :y="PAD.top+4" text-anchor="end" fill="#475569" font-size="10" font-family="Arial">{{ equityPath.maxV.toFixed(0) }}</text>
            <text :x="PAD.left-4" :y="equityPath.zero+4" text-anchor="end" fill="#64748b" font-size="10" font-family="Arial">0</text>
            <text v-if="equityPath.minV<0" :x="PAD.left-4" :y="SVG_H-PAD.bottom+4" text-anchor="end" fill="#475569" font-size="10" font-family="Arial">{{ equityPath.minV.toFixed(0) }}</text>
          </svg>
        </div>
      </div>

      <!-- ── Distribution R:R ────────────────────────────────────── -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-title" style="margin-bottom:16px">Distribution des R:R réalisés</div>
        <div v-if="!rrDist.length" class="empty-state" style="padding:24px"><p>Pas assez de trades avec R:R calculé.</p></div>
        <div v-else style="overflow-x:auto">
          <svg :viewBox="`0 0 ${RR_W} ${RR_H}`" width="100%" :height="RR_H" style="display:block">
            <line :x1="RR_PAD.left" :x2="RR_W-RR_PAD.right"
                  :y1="RR_PAD.top + RR_H - RR_PAD.top - RR_PAD.bottom"
                  :y2="RR_PAD.top + RR_H - RR_PAD.top - RR_PAD.bottom"
                  stroke="rgba(100,116,139,.4)" stroke-width="1"/>
            <g v-for="b in rrChart" :key="b.label">
              <rect :x="b.x" :y="b.y" :width="b.w" :height="b.h" :fill="b.fill" rx="2"/>
              <text :x="b.labelX" :y="b.y - 4" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="Arial">{{ b.count }}</text>
              <text :x="b.labelX" :y="RR_H - 6" text-anchor="middle" fill="#64748b" font-size="9" font-family="Arial">{{ b.label }}</text>
            </g>
          </svg>
        </div>
      </div>

      <!-- ── Analyse temporelle ──────────────────────────────────── -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-title" style="margin-bottom:16px">Analyse temporelle</div>
        <div v-if="!temporal?.byHour?.length" class="empty-state" style="padding:24px"><p>Pas assez de données.</p></div>
        <template v-else>
          <div style="margin-bottom:20px">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;font-weight:600">P&L par heure d'entrée</div>
            <div style="overflow-x:auto">
              <svg viewBox="0 0 560 140" width="100%" height="140" style="display:block">
                <line x1="50" x2="540" :y1="TEMP_PAD.top + (TEMP_H - TEMP_PAD.top - TEMP_PAD.bottom)/2"
                      :y2="TEMP_PAD.top + (TEMP_H - TEMP_PAD.top - TEMP_PAD.bottom)/2"
                      stroke="rgba(100,116,139,.4)" stroke-width="1" stroke-dasharray="3,3"/>
                <g v-for="b in buildBars(temporal.byHour)" :key="b.hour">
                  <rect :x="b.x" :y="b.y" :width="b.w" :height="b.h" :fill="b.fill" rx="2"/>
                  <text :x="b.labelX" :y="TEMP_H - 4" text-anchor="middle" fill="#64748b" font-size="9" font-family="Arial">{{ b.label }}</text>
                  <title>{{ b.label }} | {{ b.count }} trades | {{ b.winrate }}% WR | {{ formatPnl(b.pnl) }}</title>
                </g>
              </svg>
            </div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;font-weight:600">P&L par jour de la semaine</div>
            <div style="overflow-x:auto">
              <svg viewBox="0 0 560 140" width="100%" height="140" style="display:block">
                <line x1="50" x2="540" :y1="TEMP_PAD.top + (TEMP_H - TEMP_PAD.top - TEMP_PAD.bottom)/2"
                      :y2="TEMP_PAD.top + (TEMP_H - TEMP_PAD.top - TEMP_PAD.bottom)/2"
                      stroke="rgba(100,116,139,.4)" stroke-width="1" stroke-dasharray="3,3"/>
                <g v-for="b in buildBars(temporal.byWeekday)" :key="b.weekday">
                  <rect :x="b.x" :y="b.y" :width="b.w" :height="b.h" :fill="b.fill" rx="2"/>
                  <text :x="b.labelX" :y="TEMP_H - 4" text-anchor="middle" fill="#64748b" font-size="10" font-family="Arial">{{ b.label }}</text>
                  <title>{{ b.label }} | {{ b.count }} trades | {{ b.winrate }}% WR | {{ formatPnl(b.pnl) }}</title>
                </g>
              </svg>
            </div>
          </div>
        </template>
      </div>

      <!-- ── Par tag ─────────────────────────────────────────────── -->
      <div class="card" v-if="!filters.tagId && byTag.length">
        <div class="card-title" style="margin-bottom:16px">Performance par setup</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Setup</th><th>Type</th><th>Trades</th><th>Winrate</th><th>P&L</th><th>R:R</th></tr></thead>
            <tbody>
              <tr v-for="row in byTag" :key="row.tagId">
                <td><span class="badge badge-tag">{{ row.tagLabel }}</span></td>
                <td style="color:var(--text-muted);font-size:12px">{{ row.tagType }}</td>
                <td>{{ row.count }} <span style="color:var(--text-muted);font-size:11px">({{ row.winCount }}W/{{ row.count-row.winCount }}L)</span></td>
                <td>
                  <span :style="{ color: winrateColor(row.winrate), fontWeight: 700 }">{{ row.winrate }}%</span>
                  <div class="winrate-bar" style="width:80px"><div class="winrate-bar-fill" :style="{ width: row.winrate+'%', background: winrateColor(row.winrate) }"></div></div>
                </td>
                <td :class="parseFloat(row.totalPnl)>=0?'pnl-pos':'pnl-neg'">{{ formatPnl(row.totalPnl) }}</td>
                <td>{{ row.avgRr ? '1:'+row.avgRr : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
