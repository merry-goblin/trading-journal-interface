<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getObservations } from '@/services/observationService'
import { useScreenshotUrl } from '@/composables/useScreenshotUrl'
import api from '@/services/api'

const router = useRouter()
const { blobUrls, loadings, getUrl } = useScreenshotUrl()

const observations = ref([])
const assets       = ref([])
const loading      = ref(false)
const page         = ref(1)
const limit        = 20
const hasMore      = ref(false)
const fullscreen   = ref(null)

const filters = ref({
    assetId:  '',
    dateFrom: '',
    dateTo:   '',
    trend:    '',
    type:     '',
})

onMounted(async () => {
    const res = await api.get('/assets')
    assets.value = res.data
    await load()
})

watch(filters, () => { page.value = 1; load() }, { deep: true })

async function load() {
    loading.value = true
    const f = {}
    if (filters.value.assetId)  f.assetId  = filters.value.assetId
    if (filters.value.dateFrom) f.dateFrom = filters.value.dateFrom
    if (filters.value.dateTo)   f.dateTo   = filters.value.dateTo
    if (filters.value.trend)    f.trend    = filters.value.trend
    if (filters.value.type)     f.type     = filters.value.type
    try {
        const res = await getObservations(f, page.value, limit)
        observations.value = res.data
        hasMore.value = res.data.length === limit
        for (const obs of res.data)
            for (const sc of obs.screenshots ?? []) getUrl(sc.id)
    } finally {
        loading.value = false
    }
}

function prevPage() { if (page.value > 1) { page.value--; load() } }
function nextPage() { page.value++; load() }

function contextLabel(ctx) {
    if (ctx === 'position') return { text: 'Position', cls: 'badge-long' }
    if (ctx === 'order')    return { text: 'Ordre',    cls: 'badge-neutral' }
    return { text: 'Libre', cls: 'badge-tag' }
}

function trendLabel(t) {
    if (t === 'bull')    return { text: '▲ BULL', cls: 'badge-bull' }
    if (t === 'bear')    return { text: '▼ BEAR', cls: 'badge-bear' }
    if (t === 'neutral') return { text: '◆ NEU',  cls: 'badge-neutral' }
    return { text: 'AUTO', cls: 'badge-unknown' }
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">Observations</div>
      <div class="page-subtitle">Toutes les analyses de marché — trades pris ou non</div>
    </div>

    <!-- Filtres -->
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">

        <div class="form-group">
          <label class="form-label">Instrument</label>
          <select v-model="filters.assetId" class="form-control">
            <option value="">Tous</option>
            <option v-for="a in assets" :key="a.id" :value="a.id">{{ a.symbol }}</option>
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

        <div class="form-group">
          <label class="form-label">Sentiment</label>
          <select v-model="filters.trend" class="form-control">
            <option value="">Tous</option>
            <option value="bull">▲ Bull</option>
            <option value="neutral">◆ Neutre</option>
            <option value="bear">▼ Bear</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Contexte</label>
          <select v-model="filters.type" class="form-control">
            <option value="">Tous</option>
            <option value="free">Libres (pas de trade)</option>
            <option value="order">Liées à un ordre</option>
            <option value="position">Liées à une position</option>
          </select>
        </div>

      </div>
    </div>

    <!-- Contenu -->
    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <div v-else-if="observations.length === 0" class="empty-state" style="padding:48px">
      <div class="icon">🔭</div>
      <p>Aucune observation pour ces filtres.</p>
      <p style="margin-top:8px;font-size:12px">
        Utilisez les boutons BULL / NEU / BEAR du Trade Panel pour enregistrer des observations.
      </p>
    </div>

    <div v-else>
      <div class="timeline" style="padding:4px 0">
        <div v-for="obs in observations" :key="obs.id" class="card" style="margin-bottom:12px">

          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
            <span style="color:var(--text-2);font-size:12px;min-width:140px">{{ obs.observedAt }}</span>
            <span class="badge" :class="trendLabel(obs.trend).cls">{{ trendLabel(obs.trend).text }}</span>
            <span class="badge" :class="contextLabel(obs.context).cls">{{ contextLabel(obs.context).text }}</span>
            <span v-if="obs.assetSymbol" style="color:var(--text-2);font-size:12px">
              {{ obs.assetSymbol }}
              <span style="color:var(--text-muted)">{{ obs.timeframeLabel }}</span>
            </span>
            <button
              v-if="obs.positionId"
              class="btn btn-ghost btn-sm"
              style="margin-left:auto"
              @click="router.push('/journal/' + obs.positionId)"
            >Voir position →</button>
          </div>

          <div v-if="obs.comment" style="color:var(--text-2);font-size:13px;margin-bottom:10px">
            {{ obs.comment }}
          </div>

          <div v-if="obs.screenshots?.length" style="display:flex;flex-wrap:wrap;gap:8px">
            <div
              v-for="sc in obs.screenshots" :key="sc.id"
              style="position:relative;width:200px;height:112px;
                     background:var(--border);border-radius:6px;overflow:hidden;cursor:zoom-in"
              @click="blobUrls[sc.id] && (fullscreen = blobUrls[sc.id])"
            >
              <img v-if="blobUrls[sc.id]" :src="blobUrls[sc.id]"
                   style="width:100%;height:100%;object-fit:cover" />
              <div v-else style="display:flex;align-items:center;justify-content:center;
                                 height:100%;font-size:11px;color:var(--text-muted)">
                {{ loadings[sc.id] ? 'Chargement…' : '📷' }}
              </div>
            </div>
          </div>
          <div v-else style="font-size:11px;color:var(--text-muted)">Aucun screenshot</div>

        </div>
      </div>

      <div class="pagination">
        <button @click="prevPage" :disabled="page === 1">‹ Préc.</button>
        <button class="active">{{ page }}</button>
        <button @click="nextPage" :disabled="!hasMore">Suiv. ›</button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="fullscreen"
           style="position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;
                  display:flex;align-items:center;justify-content:center;cursor:zoom-out"
           @click="fullscreen = null">
        <img :src="fullscreen"
             style="max-width:95vw;max-height:95vh;border-radius:8px;box-shadow:0 0 40px rgba(0,0,0,.8)" />
      </div>
    </Teleport>
  </div>
</template>
