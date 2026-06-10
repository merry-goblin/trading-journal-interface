<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPosition, enrichPosition } from '@/services/positionService'
import { getTags } from '@/services/tagService'
import { useScreenshotUrl } from '@/composables/useScreenshotUrl'
const { blobUrls, loadings, errors, getUrl } = useScreenshotUrl()

const route  = useRoute()
const router = useRouter()

const position = ref(null)
const tags     = ref([])
const loading  = ref(true)
const saving   = ref(false)
const saved    = ref(false)

// Formulaire d'enrichissement
const form = ref({
    planRespected: null,
    higherTfBias:  '',
    entryTfBias:   '',
    setupQuality:  null,
    emotionScore:  null,
    comment:       '',
    tagIds:        [],
})

onMounted(async () => {
    const [posRes, tagRes] = await Promise.all([
        getPosition(route.params.id),
        getTags()
    ])
    // Précharger les screenshots de toutes les observations
    for (const obs of posRes.data.observations ?? []) {
        for (const sc of obs.screenshots ?? []) {
            getUrl(sc.id)
        }
    }
    position.value = posRes.data
    tags.value     = tagRes.data
    // Pré-remplir le formulaire avec les données existantes
    const p = posRes.data
    form.value.planRespected = p.planRespected
    form.value.higherTfBias  = p.higherTfBias  ?? ''
    form.value.entryTfBias   = p.entryTfBias   ?? ''
    form.value.setupQuality  = p.setupQuality
    form.value.emotionScore  = p.emotionScore
    form.value.comment       = p.comment       ?? ''
    form.value.tagIds        = (p.tags || []).map(t => t.id)
    loading.value = false
})

function toggleTag(id) {
    const idx = form.value.tagIds.indexOf(id)
    if (idx === -1) form.value.tagIds.push(id)
    else form.value.tagIds.splice(idx, 1)
}

function setPlan(val) { form.value.planRespected = val }

function setQuality(n) { form.value.setupQuality = form.value.setupQuality === n ? null : n }

async function handleSave() {
    saving.value = true
    saved.value  = false
    try {
        const payload = {}
        if (form.value.planRespected !== undefined) payload.planRespected = form.value.planRespected
        if (form.value.higherTfBias !== '')  payload.higherTfBias  = form.value.higherTfBias  || null
        if (form.value.entryTfBias  !== '')  payload.entryTfBias   = form.value.entryTfBias   || null
        payload.setupQuality = form.value.setupQuality
        payload.emotionScore = form.value.emotionScore
        payload.comment      = form.value.comment || null
        payload.tagIds       = form.value.tagIds
        const res = await enrichPosition(route.params.id, payload)
        position.value = res.data
        saved.value = true
        setTimeout(() => { saved.value = false }, 2500)
    } finally {
        saving.value = false
    }
}

function formatPnl(pnl) {
    if (pnl === null || pnl === undefined) return '—'
    const v = parseFloat(pnl)
    return (v >= 0 ? '+' : '') + v.toFixed(2) + ' €'
}

function pnlClass(pnl) {
    if (!pnl) return 'pnl-zero'
    return parseFloat(pnl) >= 0 ? 'pnl-pos' : 'pnl-neg'
}

function trendDot(t) {
    if (t === 'bull') return 'bull'
    if (t === 'bear') return 'bear'
    if (!t) return 'auto'
    return 'neutral'
}

const fullscreen = ref(null)
</script>

<template>
  <div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <button class="btn btn-ghost btn-sm" @click="router.push('/journal')">← Journal</button>
      <div class="page-title" v-if="position">
        {{ position.assetSymbol }} {{ position.timeframeLabel }}
        <span class="badge" :class="position.direction === 'long' ? 'badge-long' : 'badge-short'">
          {{ position.direction?.toUpperCase() }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <template v-else-if="position">
      <!-- Données du trade -->
      <div class="detail-grid">
        <div class="card">
          <div class="card-title">Exécution</div>
          <div class="detail-row"><span class="detail-key">Ouverture</span><span class="detail-val">{{ position.openedAt }}</span></div>
          <div class="detail-row"><span class="detail-key">Clôture</span><span class="detail-val">{{ position.closedAt ?? 'En cours' }}</span></div>
          <div class="detail-row"><span class="detail-key">Entrée</span><span class="detail-val">{{ position.entryPrice }}</span></div>
          <div class="detail-row"><span class="detail-key">Sortie</span><span class="detail-val">{{ position.exitPrice ?? '—' }}</span></div>
          <div class="detail-row"><span class="detail-key">Stop Loss</span><span class="detail-val" style="color:var(--danger)">{{ position.stopLoss ?? '—' }}</span></div>
          <div class="detail-row"><span class="detail-key">Take Profit</span><span class="detail-val" style="color:var(--success)">{{ position.takeProfit ?? '—' }}</span></div>
          <div class="detail-row"><span class="detail-key">Volume</span><span class="detail-val">{{ position.volume }} lots</span></div>
        </div>
        <div class="card">
          <div class="card-title">Résultat</div>
          <div class="detail-row">
            <span class="detail-key">P&L</span>
            <span class="detail-val" :class="pnlClass(position.pnl)" style="font-size:22px">{{ formatPnl(position.pnl) }}</span>
          </div>
          <div class="detail-row"><span class="detail-key">R:R réalisé</span><span class="detail-val">{{ position.rr ? '1:' + parseFloat(position.rr).toFixed(2) : '—' }}</span></div>
          <div class="detail-row"><span class="detail-key">Risque engagé</span><span class="detail-val">{{ position.riskAmount ? parseFloat(position.riskAmount).toFixed(2) + ' €' : '—' }}</span></div>
        </div>
      </div>

      <!-- Enrichissement -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-title" style="margin-bottom:16px">Analyse post-trade</div>
        <div class="detail-grid">
          <div style="display:flex;flex-direction:column;gap:16px">
            <div class="form-group">
              <label class="form-label">Plan respecté</label>
              <div class="plan-toggle">
                <button class="plan-btn" :class="form.planRespected === true ? 'active-yes' : ''" @click="setPlan(true)">✓ Oui</button>
                <button class="plan-btn" :class="form.planRespected === false ? 'active-no' : ''" @click="setPlan(false)">✗ Non</button>
                <button class="plan-btn" :class="form.planRespected === null ? 'active-null' : ''" @click="setPlan(null)">? N/A</button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Biais TF supérieur</label>
              <select v-model="form.higherTfBias" class="form-control">
                <option value="">—</option>
                <option value="bull">Haussier (bull)</option>
                <option value="bear">Baissier (bear)</option>
                <option value="neutral">Neutre</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Biais TF d'entrée</label>
              <select v-model="form.entryTfBias" class="form-control">
                <option value="">—</option>
                <option value="bull">Haussier (bull)</option>
                <option value="bear">Baissier (bear)</option>
                <option value="neutral">Neutre</option>
              </select>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:16px">
            <div class="form-group">
              <label class="form-label">Qualité du setup (1–5)</label>
              <div class="star-group">
                <span v-for="n in 5" :key="n" class="star" :class="form.setupQuality >= n ? 'active' : ''" @click="setQuality(n)">★</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Score émotionnel ({{ form.emotionScore ?? 0 }} / 5)</label>
              <input type="range" min="0" max="5" v-model.number="form.emotionScore" style="width:100%;accent-color:var(--accent)" />
            </div>
            <div class="form-group">
              <label class="form-label">Tags</label>
              <div class="tag-selector">
                <span v-for="tag in tags" :key="tag.id" class="tag-chip" :class="form.tagIds.includes(tag.id) ? 'selected' : ''" @click="toggleTag(tag.id)">
                  {{ tag.label }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="form-group" style="margin-top:16px">
          <label class="form-label">Notes</label>
          <textarea v-model="form.comment" class="form-control" placeholder="Commentaire libre…"></textarea>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:16px">
          <button class="btn btn-primary" @click="handleSave" :disabled="saving">
            {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
          <span v-if="saved" style="color:var(--success);font-size:13px">✓ Sauvegardé</span>
        </div>
      </div>

      <!-- Observations -->
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">Observations ({{ position.observations?.length ?? 0 }})</div>
        <div v-if="!position.observations?.length" class="empty-state" style="padding:24px">
          <p>Aucune observation enregistrée pour ce trade.</p>
        </div>
        <div v-else class="timeline">
          <div v-for="obs in position.observations" :key="obs.id" class="timeline-item">
            <div class="timeline-dot" :class="trendDot(obs.trend)"></div>
            <div class="timeline-content">
              <div class="timeline-meta">
                {{ obs.observedAt }}
                <span v-if="obs.trend" class="badge" :class="'badge-' + obs.trend" style="margin-left:6px">
                  {{ obs.trend.toUpperCase() }}
                </span>
                <span v-else class="badge badge-neutral" style="margin-left:6px">AUTO</span>
              </div>
              <div v-if="obs.comment" class="timeline-comment">{{ obs.comment }}</div>

              <!-- Screenshots -->
              <div v-if="obs.screenshots?.length" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
                <div v-for="sc in obs.screenshots" :key="sc.id"
                    style="position:relative;width:160px;height:90px;background:var(--border);border-radius:4px;overflow:hidden">
                  <img
                    v-if="blobUrls[sc.id]"
                    :src="blobUrls[sc.id]"
                    :alt="sc.description || 'Screenshot'"
                    style="width:100%;height:100%;object-fit:cover;cursor:zoom-in"
                    @click="fullscreen = blobUrls[sc.id]"
                  />
                  <div v-else-if="loadings[sc.id]"
                      style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:11px">
                    Chargement…
                  </div>
                  <div v-else-if="errors[sc.id]"
                      style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--danger);font-size:11px">
                    Indisponible
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
  <Teleport to="body">
    <div v-if="fullscreen"
        style="position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9999;
                display:flex;align-items:center;justify-content:center;cursor:zoom-out"
        @click="fullscreen = null">
      <img :src="fullscreen" style="max-width:95vw;max-height:95vh;border-radius:8px" />
    </div>
  </Teleport>
</template>
