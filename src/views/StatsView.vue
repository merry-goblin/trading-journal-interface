<script setup>
import { ref, onMounted } from 'vue'
import { getStats, getStatsByTag } from '@/services/statsService'

const stats    = ref(null)
const byTag    = ref([])
const loading  = ref(true)

onMounted(async () => {
    const [s, t] = await Promise.all([getStats(), getStatsByTag()])
    stats.value = s.data
    byTag.value = t.data.sort((a, b) => b.count - a.count)
    loading.value = false
})

function winrateColor(wr) {
    if (wr >= 60) return 'var(--success)'
    if (wr >= 45) return 'var(--warning)'
    return 'var(--danger)'
}

function formatPnl(pnl) {
    if (pnl === null || pnl === undefined) return '—'
    const v = parseFloat(pnl)
    return (v >= 0 ? '+' : '') + v.toFixed(2) + ' €'
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">Statistiques</div>
      <div class="page-subtitle">Performance globale et par setup</div>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <template v-else>
      <!-- Résumé global -->
      <div class="stat-grid">
        <div class="stat-card"><div class="label">Trades fermés</div><div class="value">{{ stats.totalTrades }}</div></div>
        <div class="stat-card" :class="stats.winrate >= 50 ? 'success' : 'danger'">
          <div class="label">Winrate</div>
          <div class="value">{{ stats.winrate }}%</div>
          <div class="winrate-bar"><div class="winrate-bar-fill" :style="{ width: stats.winrate + '%' }"></div></div>
        </div>
        <div class="stat-card" :class="stats.totalPnl >= 0 ? 'success' : 'danger'">
          <div class="label">P&L Total</div>
          <div class="value">{{ formatPnl(stats.totalPnl) }}</div>
        </div>
        <div class="stat-card accent">
          <div class="label">R:R Moyen</div>
          <div class="value">{{ stats.avgRr ? '1:' + stats.avgRr : '—' }}</div>
        </div>
        <div class="stat-card">
          <div class="label">Série gagnante max</div>
          <div class="value" style="color:var(--success)">{{ stats.maxWinStreak }}</div>
        </div>
        <div class="stat-card">
          <div class="label">Série perdante max</div>
          <div class="value" style="color:var(--danger)">{{ stats.maxLossStreak }}</div>
        </div>
        <div class="stat-card" v-if="stats.disciplineScore !== null">
          <div class="label">Discipline</div>
          <div class="value">{{ stats.disciplineScore }}%</div>
          <div class="sub">Plan respecté</div>
        </div>
      </div>

      <!-- Par tag -->
      <div class="card" v-if="byTag.length">
        <div class="card-title" style="margin-bottom:16px">Performance par setup</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Setup</th>
                <th>Type</th>
                <th>Trades</th>
                <th>Winrate</th>
                <th>P&L Total</th>
                <th>R:R Moy.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in byTag" :key="row.tagId">
                <td><span class="badge badge-tag">{{ row.tagLabel }}</span></td>
                <td style="color:var(--text-muted);font-size:12px">{{ row.tagType }}</td>
                <td>{{ row.count }} <span style="color:var(--text-muted);font-size:11px">({{ row.winCount }}W / {{ row.count - row.winCount }}L)</span></td>
                <td>
                  <span :style="{ color: winrateColor(row.winrate), fontWeight: 700 }">{{ row.winrate }}%</span>
                  <div class="winrate-bar" style="width:80px">
                    <div class="winrate-bar-fill" :style="{ width: row.winrate + '%', background: winrateColor(row.winrate) }"></div>
                  </div>
                </td>
                <td :class="parseFloat(row.totalPnl) >= 0 ? 'pnl-pos' : 'pnl-neg'">{{ formatPnl(row.totalPnl) }}</td>
                <td>{{ row.avgRr ? '1:' + row.avgRr : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="card">
        <div class="empty-state">
          <div class="icon">🏷️</div>
          <p>Ajoutez des tags à vos trades pour voir les stats par setup.</p>
        </div>
      </div>
    </template>
  </div>
</template>
