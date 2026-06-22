<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getPositions, deletePosition } from '@/services/positionService'
import { getTags }                      from '@/services/tagService'

const router = useRouter()
const positions       = ref([])
const tags            = ref([])
const loading         = ref(false)
const page            = ref(1)
const limit           = 20
const hasMore         = ref(false)
const confirmDeleteId = ref(null)

// isBacktest : false = live, true = backtest, null = tous
const filters = ref({
    isBacktest:   false,  // defaut : live
    direction:    '',
    planRespected:'',
    tagId:        '',
    dateFrom:     '',
    dateTo:       '',
})

onMounted(async () => {
    const tagRes = await getTags()
    tags.value   = tagRes.data
    await load()
})

watch(filters, () => { page.value = 1; load() }, { deep: true })

async function load() {
    loading.value = true
    const f = {}
    // isBacktest : on envoie toujours la valeur (null = tous)
    if (filters.value.isBacktest !== null) f.isBacktest = filters.value.isBacktest
    if (filters.value.direction)           f.direction     = filters.value.direction
    if (filters.value.tagId)               f.tagId         = filters.value.tagId
    if (filters.value.dateFrom)            f.dateFrom      = filters.value.dateFrom
    if (filters.value.dateTo)              f.dateTo        = filters.value.dateTo
    if (filters.value.planRespected !== '') f.planRespected = filters.value.planRespected
    try {
        const res = await getPositions(f, page.value, limit)
        positions.value = res.data
        hasMore.value   = res.data.length === limit
    } finally { loading.value = false }
}

function prevPage() { if (page.value > 1) { page.value--; load() } }
function nextPage() { page.value++; load() }

async function handleDelete(id) {
    if (confirmDeleteId.value !== id) { confirmDeleteId.value = id; return }
    try { await deletePosition(id); confirmDeleteId.value = null; await load() }
    catch { confirmDeleteId.value = null }
}

function pnlClass(pnl) {
    if (!pnl) return 'pnl-zero'
    return parseFloat(pnl) >= 0 ? 'pnl-pos' : 'pnl-neg'
}

function formatPnl(pnl) {
    if (!pnl) return '—'
    const v = parseFloat(pnl)
    return (v >= 0 ? '+' : '') + v.toFixed(2) + ' €'
}

function planLabel(v) {
    if (v === true)  return { text: '✓', cls: 'badge-yes' }
    if (v === false) return { text: '✗', cls: 'badge-no' }
    return { text: '?', cls: 'badge-unknown' }
}

// Libellé du mode courant
const modeLabel = { false: 'Live', true: 'Backtest', null: 'Tous' }
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">Journal</div>
      <div class="page-subtitle">Toutes vos positions</div>
    </div>

    <!-- Filtres -->
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">

        <!-- Toggle Live / Backtest / Tous -->
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

    <!-- Table -->
    <div class="card">
      <div v-if="loading" class="loading"><div class="spinner"></div></div>
      <div v-else-if="positions.length === 0" class="empty-state">
        <div class="icon">📭</div>
        <p>Aucun trade pour ces filtres</p>
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Instrument</th><th>Dir.</th>
              <th>Entrée</th><th>Sortie</th><th>P&L</th><th>R:R</th>
              <th>Plan</th><th>Qualité</th><th>Tags</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pos in positions" :key="pos.id">
              <td style="font-size:12px;color:var(--text-2)">
                {{ pos.openedAt?.slice(0,10) }}
                <span v-if="pos.isBacktest" class="badge" style="background:rgba(245,158,11,.15);color:var(--warning);margin-left:4px;font-size:9px">BT</span>
              </td>
              <td>{{ pos.assetSymbol }} <span style="font-size:11px;color:var(--text-muted)">{{ pos.timeframeLabel }}</span></td>
              <td><span class="badge" :class="pos.direction === 'long' ? 'badge-long' : 'badge-short'">{{ pos.direction?.toUpperCase() }}</span></td>
              <td style="font-size:13px">{{ pos.entryPrice }}</td>
              <td style="font-size:13px">{{ pos.exitPrice ?? '—' }}</td>
              <td :class="pnlClass(pos.pnl)">{{ formatPnl(pos.pnl) }}</td>
              <td>{{ pos.rr ? '1:' + parseFloat(pos.rr).toFixed(2) : '—' }}</td>
              <td><span class="badge" :class="planLabel(pos.planRespected).cls">{{ planLabel(pos.planRespected).text }}</span></td>
              <td>{{ pos.setupQuality ? '★'.repeat(pos.setupQuality) : '—' }}</td>
              <td><span v-for="t in (pos.tagLabels || [])" :key="t" class="badge badge-tag">{{ t }}</span></td>
              <td>
                <div style="display:flex;gap:6px;align-items:center">
                  <button class="btn btn-ghost btn-sm" @click="router.push('/journal/' + pos.id)">→</button>
                  <template v-if="confirmDeleteId === pos.id">
                    <span style="font-size:11px;color:var(--danger)">Supprimer ?</span>
                    <button class="btn btn-danger btn-sm" @click="handleDelete(pos.id)">Oui</button>
                    <button class="btn btn-ghost btn-sm"  @click="confirmDeleteId = null">Non</button>
                  </template>
                  <button v-else class="btn btn-ghost btn-sm" style="color:var(--danger)" @click="handleDelete(pos.id)">✕</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="pagination">
          <button @click="prevPage" :disabled="page === 1">‹ Préc.</button>
          <button class="active">{{ page }}</button>
          <button @click="nextPage" :disabled="!hasMore">Suiv. ›</button>
        </div>
      </div>
    </div>
  </div>
</template>
