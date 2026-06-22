<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { getStats, getStatsByTag, getEquity } from '@/services/statsService'
import { getTags } from '@/services/tagService'

const stats      = ref(null)
const byTag      = ref([])
const equity     = ref([])
const tags       = ref([])
const tagId      = ref(null)
const isBacktest = ref(false)  // defaut : live
const loading    = ref(true)

onMounted(async () => {
    tags.value = (await getTags()).data
    await loadAll()
    loading.value = false
})

watch([tagId, isBacktest], () => loadAll())

async function loadAll() {
    const id = tagId.value || null
    const bt = isBacktest.value
    const [sRes, eRes] = await Promise.all([getStats(id, bt), getEquity(id, bt)])
    stats.value  = sRes.data
    equity.value = eRes.data
    if (!id) byTag.value = (await getStatsByTag()).data.sort((a, b) => b.count - a.count)
}

// SVG equity curve
const SVG_W = 800, SVG_H = 200
const PAD = { top: 20, right: 20, bottom: 30, left: 60 }

const equityPath = computed(() => {
    const data = equity.value
    if (data.length < 2) return { line: '', area: '', zero: SVG_H / 2, points: [], labels: [], minV: 0, maxV: 0 }
    const vals = data.map(d => d.cumulative)
    const minV = Math.min(0, ...vals), maxV = Math.max(0, ...vals)
    const range = maxV - minV || 1
    const innerW = SVG_W - PAD.left - PAD.right, innerH = SVG_H - PAD.top - PAD.bottom
    const xAt = i   => PAD.left + (i / (data.length - 1)) * innerW
    const yAt = val => PAD.top  + innerH - ((val - minV) / range) * innerH
    const pts = data.map((d, i) => ({ x: xAt(i), y: yAt(d.cumulative), ...d }))
    const zeroY = yAt(0)
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const last = pts[pts.length - 1]
    const area = `${line} L${last.x.toFixed(1)},${zeroY.toFixed(1)} L${pts[0].x.toFixed(1)},${zeroY.toFixed(1)} Z`
    const step = Math.ceil(data.length / 8)
    const labels = pts.filter((_, i) => i === 0 || i === data.length - 1 || i % step === 0)
    return { line, area, zero: zeroY, points: pts, labels, minV, maxV }
})

const finalPnl = computed(() =>
    equity.value.length ? equity.value[equity.value.length - 1].cumulative : 0
)

function winrateColor(wr) {
    return wr >= 60 ? 'var(--success)' : wr >= 45 ? 'var(--warning)' : 'var(--danger)'
}

function formatPnl(pnl) {
    if (!pnl) return '—'
    const v = parseFloat(pnl)
    return (v >= 0 ? '+' : '') + v.toFixed(2) + ' €'
}
</script>

<template>
  <div>
    <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div>
        <div class="page-title">Statistiques</div>
        <div class="page-subtitle">Performance globale et par setup</div>
      </div>

      <!-- Filtres -->
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
        <!-- Toggle Live / Backtest -->
        <div class="form-group">
          <label class="form-label">Mode</label>
          <div style="display:flex;gap:4px">
            <button v-for="(bt, label) in { Live: false, Backtest: true }" :key="label"
                    class="btn btn-sm"
                    :style="{ background: isBacktest === bt ? 'rgba(59,111,255,.25)' : 'var(--card)', color: isBacktest === bt ? 'var(--accent)' : 'var(--text-2)', border: '1px solid var(--border)' }"
                    @click="isBacktest = bt">
              {{ label }}
            </button>
          </div>
        </div>

        <!-- Filtre tag -->
        <div class="form-group">
          <label class="form-label">Tag</label>
          <select v-model="tagId" class="form-control">
            <option :value="null">Tous</option>
            <option v-for="t in tags" :key="t.id" :value="t.id">{{ t.label }}</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <template v-else>
      <!-- Stats globales -->
      <div class="stat-grid">
        <div class="stat-card"><div class="label">Trades</div><div class="value">{{ stats.totalTrades }}</div></div>
        <div class="stat-card" :class="stats.winrate >= 50 ? 'success' : 'danger'">
          <div class="label">Winrate</div><div class="value">{{ stats.winrate }}%</div>
          <div class="winrate-bar"><div class="winrate-bar-fill" :style="{ width: stats.winrate + '%' }"></div></div>
        </div>
        <div class="stat-card" :class="stats.totalPnl >= 0 ? 'success' : 'danger'">
          <div class="label">P&L Total</div><div class="value">{{ formatPnl(stats.totalPnl) }}</div>
        </div>
        <div class="stat-card accent"><div class="label">R:R Moyen</div><div class="value">{{ stats.avgRr ? '1:' + stats.avgRr : '—' }}</div></div>
        <div class="stat-card"><div class="label">Série gain max</div><div class="value" style="color:var(--success)">{{ stats.maxWinStreak }}</div></div>
        <div class="stat-card"><div class="label">Série perte max</div><div class="value" style="color:var(--danger)">{{ stats.maxLossStreak }}</div></div>
        <div class="stat-card" v-if="stats.disciplineScore !== null"><div class="label">Discipline</div><div class="value">{{ stats.disciplineScore }}%</div></div>
      </div>

      <!-- Equity curve -->
      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
          <div class="card-title" style="margin-bottom:0">Courbe d'equity</div>
          <span v-if="equity.length" :style="{ color: finalPnl >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700, fontSize: '18px' }">
            {{ formatPnl(finalPnl) }}
          </span>
        </div>
        <div v-if="equity.length < 2" class="empty-state" style="padding:32px"><p>Au moins 2 trades fermés requis.</p></div>
        <div v-else style="overflow-x:auto">
          <svg :viewBox="`0 0 ${SVG_W} ${SVG_H}`" width="100%" :height="SVG_H" style="display:block">
            <line :x1="PAD.left" :x2="SVG_W - PAD.right" :y1="equityPath.zero" :y2="equityPath.zero" stroke="rgba(100,116,139,.6)" stroke-width="1" stroke-dasharray="4,4" />
            <defs>
              <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" :stop-color="finalPnl >= 0 ? '#22c55e' : '#ef4444'" stop-opacity="0.25" />
                <stop offset="100%" :stop-color="finalPnl >= 0 ? '#22c55e' : '#ef4444'" stop-opacity="0.02" />
              </linearGradient>
            </defs>
            <path :d="equityPath.area" fill="url(#eq-grad)" />
            <path :d="equityPath.line" :stroke="finalPnl >= 0 ? '#22c55e' : '#ef4444'" stroke-width="2" fill="none" stroke-linejoin="round" />
            <circle v-if="equityPath.points.length" :cx="equityPath.points[equityPath.points.length-1].x" :cy="equityPath.points[equityPath.points.length-1].y" r="4" :fill="finalPnl >= 0 ? '#22c55e' : '#ef4444'" />
            <text v-for="p in equityPath.labels" :key="p.closedAt" :x="p.x" :y="SVG_H - 8" text-anchor="middle" fill="#475569" font-size="10" font-family="Arial">{{ p.date }}</text>
            <text :x="PAD.left - 4" :y="PAD.top + 4" text-anchor="end" fill="#475569" font-size="10" font-family="Arial">{{ equityPath.maxV.toFixed(0) }}</text>
            <text :x="PAD.left - 4" :y="equityPath.zero + 4" text-anchor="end" fill="#64748b" font-size="10" font-family="Arial">0</text>
            <text v-if="equityPath.minV < 0" :x="PAD.left - 4" :y="SVG_H - PAD.bottom + 4" text-anchor="end" fill="#475569" font-size="10" font-family="Arial">{{ equityPath.minV.toFixed(0) }}</text>
          </svg>
        </div>
      </div>

      <!-- Par tag -->
      <div class="card" v-if="!tagId && byTag.length">
        <div class="card-title" style="margin-bottom:16px">Performance par setup</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Setup</th><th>Type</th><th>Trades</th><th>Winrate</th><th>P&L</th><th>R:R</th></tr></thead>
            <tbody>
              <tr v-for="row in byTag" :key="row.tagId">
                <td><span class="badge badge-tag">{{ row.tagLabel }}</span></td>
                <td style="color:var(--text-muted);font-size:12px">{{ row.tagType }}</td>
                <td>{{ row.count }} <span style="color:var(--text-muted);font-size:11px">({{ row.winCount }}W / {{ row.count - row.winCount }}L)</span></td>
                <td>
                  <span :style="{ color: winrateColor(row.winrate), fontWeight: 700 }">{{ row.winrate }}%</span>
                  <div class="winrate-bar" style="width:80px"><div class="winrate-bar-fill" :style="{ width: row.winrate + '%', background: winrateColor(row.winrate) }"></div></div>
                </td>
                <td :class="parseFloat(row.totalPnl) >= 0 ? 'pnl-pos' : 'pnl-neg'">{{ formatPnl(row.totalPnl) }}</td>
                <td>{{ row.avgRr ? '1:' + row.avgRr : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
