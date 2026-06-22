<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getStats } from '@/services/statsService'
import { getPositions } from '@/services/positionService'

const router  = useRouter()
const stats   = ref(null)
const recent  = ref([])
const loading = ref(true)

onMounted(async () => {
    try {
        const [statsRes, posRes] = await Promise.all([
            getStats(null, false),                          // toujours live
            getPositions({ isBacktest: false }, 1, 5)      // toujours live
        ])
        stats.value  = statsRes.data
        recent.value = posRes.data
    } finally { loading.value = false }
})

function pnlClass(pnl) {
    if (!pnl) return 'pnl-zero'
    return parseFloat(pnl) >= 0 ? 'pnl-pos' : 'pnl-neg'
}

function formatPnl(pnl) {
    if (!pnl) return '—'
    const v = parseFloat(pnl)
    return (v >= 0 ? '+' : '') + v.toFixed(2) + ' €'
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">Dashboard</div>
      <div class="page-subtitle">Vue d'ensemble — trades live</div>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <template v-else>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="label">Trades live</div>
          <div class="value">{{ stats?.totalTrades ?? 0 }}</div>
          <div class="sub">{{ stats?.winCount ?? 0 }} gagnants · {{ stats?.lossCount ?? 0 }} perdants</div>
        </div>
        <div class="stat-card" :class="(stats?.winrate ?? 0) >= 50 ? 'success' : 'danger'">
          <div class="label">Winrate</div>
          <div class="value">{{ stats?.winrate ?? 0 }}%</div>
          <div class="winrate-bar"><div class="winrate-bar-fill" :style="{ width: (stats?.winrate ?? 0) + '%' }"></div></div>
        </div>
        <div class="stat-card" :class="(stats?.totalPnl ?? 0) >= 0 ? 'success' : 'danger'">
          <div class="label">P&L Total</div>
          <div class="value">{{ formatPnl(stats?.totalPnl) }}</div>
          <div class="sub">Moy. {{ formatPnl(stats?.avgPnl) }} / trade</div>
        </div>
        <div class="stat-card accent">
          <div class="label">R:R Moyen</div>
          <div class="value">{{ stats?.avgRr ? '1:' + stats.avgRr : '—' }}</div>
          <div class="sub" v-if="stats?.disciplineScore !== null">Discipline : {{ stats?.disciplineScore }}%</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Trades live récents</div>
        <div v-if="recent.length === 0" class="empty-state"><div class="icon">📭</div><p>Aucun trade live</p></div>
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Instrument</th><th>Direction</th><th>Entrée → Sortie</th><th>P&L</th><th>R:R</th><th></th></tr></thead>
            <tbody>
              <tr v-for="pos in recent" :key="pos.id">
                <td style="color:var(--text-2);font-size:12px">{{ pos.openedAt?.slice(0,10) }}</td>
                <td>{{ pos.assetSymbol }} <span style="color:var(--text-muted);font-size:11px">{{ pos.timeframeLabel }}</span></td>
                <td><span class="badge" :class="pos.direction === 'long' ? 'badge-long' : 'badge-short'">{{ pos.direction?.toUpperCase() }}</span></td>
                <td style="font-size:12px;color:var(--text-2)">{{ pos.entryPrice }} → {{ pos.exitPrice ?? '—' }}</td>
                <td :class="pnlClass(pos.pnl)">{{ formatPnl(pos.pnl) }}</td>
                <td>{{ pos.rr ? '1:' + parseFloat(pos.rr).toFixed(2) : '—' }}</td>
                <td><button class="btn btn-ghost btn-sm" @click="router.push('/journal/' + pos.id)">Voir →</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
