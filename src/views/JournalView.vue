<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getPositions } from '@/services/positionService'
import { getTags }      from '@/services/tagService'

const router = useRouter()

const positions = ref([])
const tags      = ref([])
const loading   = ref(false)
const page      = ref(1)
const limit     = 20
const hasMore   = ref(false)

const filters = ref({
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
    if (filters.value.direction)     f.direction     = filters.value.direction
    if (filters.value.tagId)         f.tagId         = filters.value.tagId
    if (filters.value.dateFrom)      f.dateFrom      = filters.value.dateFrom
    if (filters.value.dateTo)        f.dateTo        = filters.value.dateTo
    if (filters.value.planRespected !== '') f.planRespected = filters.value.planRespected
    try {
        const res   = await getPositions(f, page.value, limit)
        positions.value = res.data
        hasMore.value   = res.data.length === limit
    } finally {
        loading.value = false
    }
}

function prevPage() { if (page.value > 1) { page.value--; load() } }
function nextPage() { page.value++; load() }

function pnlClass(pnl) {
    if (pnl === null || pnl === undefined) return 'pnl-zero'
    return parseFloat(pnl) >= 0 ? 'pnl-pos' : 'pnl-neg'
}

function formatPnl(pnl) {
    if (pnl === null || pnl === undefined) return '—'
    const v = parseFloat(pnl)
    return (v >= 0 ? '+' : '') + v.toFixed(2) + ' €'
}

function planLabel(v) {
    if (v === true)  return { text: '✓', cls: 'badge-yes' }
    if (v === false) return { text: '✗', cls: 'badge-no' }
    return { text: '?', cls: 'badge-unknown' }
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">Journal</div>
      <div class="page-subtitle">Toutes vos positions</div>
    </div>

    <!-- Filtres -->
    <div class="filters card" style="margin-bottom:20px">
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
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
              <th>Date</th>
              <th>Instrument</th>
              <th>Dir.</th>
              <th>Entrée</th>
              <th>Sortie</th>
              <th>P&L</th>
              <th>R:R</th>
              <th>Plan</th>
              <th>Qualité</th>
              <th>Tags</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pos in positions" :key="pos.id">
              <td style="font-size:12px;color:var(--text-2)">{{ pos.openedAt?.slice(0,10) }}</td>
              <td>{{ pos.assetSymbol }} <span style="font-size:11px;color:var(--text-muted)">{{ pos.timeframeLabel }}</span></td>
              <td><span class="badge" :class="pos.direction === 'long' ? 'badge-long' : 'badge-short'">{{ pos.direction?.toUpperCase() }}</span></td>
              <td style="font-size:13px">{{ pos.entryPrice }}</td>
              <td style="font-size:13px">{{ pos.exitPrice ?? '—' }}</td>
              <td :class="pnlClass(pos.pnl)">{{ formatPnl(pos.pnl) }}</td>
              <td>{{ pos.rr ? '1:' + parseFloat(pos.rr).toFixed(2) : '—' }}</td>
              <td>
                <span class="badge" :class="planLabel(pos.planRespected).cls">
                  {{ planLabel(pos.planRespected).text }}
                </span>
              </td>
              <td>{{ pos.setupQuality ? '★'.repeat(pos.setupQuality) : '—' }}</td>
              <td>
                <span v-for="t in (pos.tagLabels || [])" :key="t" class="badge badge-tag">{{ t }}</span>
              </td>
              <td><button class="btn btn-ghost btn-sm" @click="router.push('/journal/' + pos.id)">→</button></td>
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
