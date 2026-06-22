<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPosition, enrichPosition, deletePosition } from '@/services/positionService'
import { getTags } from '@/services/tagService'
import { createObservation, updateObservation, deleteObservation } from '@/services/observationService'
import { useScreenshotUrl } from '@/composables/useScreenshotUrl'

const route  = useRoute()
const router = useRouter()
const { blobUrls, loadings, getUrl } = useScreenshotUrl()

const position      = ref(null)
const tags          = ref([])
const loading       = ref(true)
const saving        = ref(false)
const saved         = ref(false)
const fullscreen    = ref(null)
const confirmDelete = ref(false)
const deleting      = ref(false)

// ── Tags groupés par type ─────────────────────────────────────────
const TYPE_META = {
    methode:   { label: 'Méthode',   icon: '🎯', color: 'var(--accent)',   bg: 'rgba(59,111,255,.2)' },
    condition: { label: 'Condition',  icon: '📊', color: '#14b8a6',        bg: 'rgba(20,184,166,.2)' },
    erreur:    { label: 'Erreur',     icon: '⚠️', color: 'var(--danger)',  bg: 'rgba(239,68,68,.2)'  },
    emotion:   { label: 'Émotion',   icon: '💭', color: 'var(--warning)', bg: 'rgba(245,158,11,.2)' },
}
const TYPE_ORDER = ['methode', 'condition', 'erreur', 'emotion']

const tagsByType = computed(() => {
    const g = {}
    for (const tag of tags.value) {
        const t = tag.type || 'autre'
        if (!g[t]) g[t] = []
        g[t].push(tag)
    }
    const ordered = {}
    for (const k of TYPE_ORDER) if (g[k]) ordered[k] = g[k]
    for (const k of Object.keys(g)) if (!ordered[k]) ordered[k] = g[k]
    return ordered
})

function typeMeta(type) {
    return TYPE_META[type] ?? { label: type, icon: '🏷️', color: 'var(--text-2)', bg: 'rgba(100,116,139,.2)' }
}

// ── Enrichissement ────────────────────────────────────────────────
const form = ref({
    planRespected: null, higherTfBias: '', entryTfBias: '',
    setupQuality: null, emotionScore: null, comment: '', tagIds: [],
})

// ── Edition observation ───────────────────────────────────────────
const editingObsId     = ref(null)
const editObsForm      = ref({ trend: '', comment: '' })
const savingObsEdit    = ref(false)
const confirmDeleteObs = ref(null)

function startEditObs(obs) {
    editingObsId.value = obs.id
    editObsForm.value  = { trend: obs.trend ?? '', comment: obs.comment ?? '' }
}

async function handleUpdateObs(obsId) {
    savingObsEdit.value = true
    try {
        await updateObservation(obsId, { trend: editObsForm.value.trend || null, comment: editObsForm.value.comment || null })
        editingObsId.value = null
        await reloadPosition()
    } finally { savingObsEdit.value = false }
}

async function handleDeleteObs(obsId) {
    if (confirmDeleteObs.value !== obsId) { confirmDeleteObs.value = obsId; return }
    try { await deleteObservation(obsId); confirmDeleteObs.value = null; await reloadPosition() }
    catch { confirmDeleteObs.value = null }
}

// ── Ajout observation ─────────────────────────────────────────────
const showObsForm = ref(false)
const savingObs   = ref(false)
const obsForm     = ref({ trend: '', observedAt: '', periodStart: '', periodEnd: '', comment: '', imageData: null, imageMime: null, imageName: null })

function nowLocal() {
    const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
}
function toApiDate(dt) { return dt ? dt.replace('T', ' ') + ':00' : null }

function resetObsForm() {
    const now = nowLocal()
    const h = new Date(new Date(now).getTime() - 3600000)
    h.setMinutes(h.getMinutes() - h.getTimezoneOffset())
    obsForm.value = { trend: '', observedAt: now, periodStart: h.toISOString().slice(0, 16), periodEnd: now, comment: '', imageData: null, imageMime: null, imageName: null }
}

function toggleObsForm() { if (!showObsForm.value) resetObsForm(); showObsForm.value = !showObsForm.value }

async function handleImageSelect(event) {
    const file = event.target.files[0]
    if (!file) return
    obsForm.value.imageName = file.name; obsForm.value.imageMime = file.type || 'image/png'
    const reader = new FileReader()
    reader.onload = (e) => { obsForm.value.imageData = e.target.result.split(',')[1] }
    reader.readAsDataURL(file)
}

async function handleCreateObs() {
    savingObs.value = true
    try {
        const payload = { positionId: position.value.id, observedAt: toApiDate(obsForm.value.observedAt), trend: obsForm.value.trend || null, comment: obsForm.value.comment || null, periodStart: toApiDate(obsForm.value.periodStart), periodEnd: toApiDate(obsForm.value.periodEnd) }
        if (obsForm.value.imageData) payload.image = { data: obsForm.value.imageData, mime: obsForm.value.imageMime }
        await createObservation(payload)
        showObsForm.value = false; await reloadPosition()
    } finally { savingObs.value = false }
}

async function reloadPosition() {
    const res = await getPosition(route.params.id)
    position.value = res.data; loadScreenshots()
}

function loadScreenshots() {
    for (const obs of position.value.observations ?? [])
        for (const sc of obs.screenshots ?? []) getUrl(sc.id)
}

onMounted(async () => {
    const [posRes, tagRes] = await Promise.all([getPosition(route.params.id), getTags()])
    position.value = posRes.data; tags.value = tagRes.data
    const p = posRes.data
    form.value.planRespected = p.planRespected
    form.value.higherTfBias  = p.higherTfBias  ?? ''
    form.value.entryTfBias   = p.entryTfBias   ?? ''
    form.value.setupQuality  = p.setupQuality
    form.value.emotionScore  = p.emotionScore
    form.value.comment       = p.comment       ?? ''
    form.value.tagIds        = (p.tags || []).map(t => t.id)
    loading.value = false; loadScreenshots()
})

function toggleTag(id) {
    const idx = form.value.tagIds.indexOf(id)
    if (idx === -1) form.value.tagIds.push(id); else form.value.tagIds.splice(idx, 1)
}

function setPlan(val)  { form.value.planRespected = val }
function setQuality(n) { form.value.setupQuality = form.value.setupQuality === n ? null : n }

async function handleSave() {
    saving.value = true; saved.value = false
    try {
        const payload = { planRespected: form.value.planRespected }
        if (form.value.higherTfBias !== '') payload.higherTfBias = form.value.higherTfBias || null
        if (form.value.entryTfBias  !== '') payload.entryTfBias  = form.value.entryTfBias  || null
        payload.setupQuality = form.value.setupQuality
        payload.emotionScore = form.value.emotionScore
        payload.comment      = form.value.comment || null
        payload.tagIds       = form.value.tagIds
        const res = await enrichPosition(route.params.id, payload)
        position.value = res.data; saved.value = true
        setTimeout(() => { saved.value = false }, 2500)
    } finally { saving.value = false }
}

async function handleDelete() {
    if (!confirmDelete.value) { confirmDelete.value = true; return }
    deleting.value = true
    try { await deletePosition(route.params.id); router.push('/journal') }
    finally { deleting.value = false }
}

function formatPnl(pnl) {
    if (!pnl) return '—'; const v = parseFloat(pnl)
    return (v >= 0 ? '+' : '') + v.toFixed(2) + ' €'
}
function pnlClass(pnl) { if (!pnl) return 'pnl-zero'; return parseFloat(pnl) >= 0 ? 'pnl-pos' : 'pnl-neg' }
function trendDot(t) { return t === 'bull' ? 'bull' : t === 'bear' ? 'bear' : !t ? 'auto' : 'neutral' }
</script>

<template>
  <div>
    <!-- En-tête -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" @click="router.push('/journal')">← Journal</button>
      <div class="page-title" v-if="position" style="flex:1">
        {{ position.assetSymbol }} {{ position.timeframeLabel }}
        <span class="badge" :class="position.direction === 'long' ? 'badge-long' : 'badge-short'">{{ position.direction?.toUpperCase() }}</span>
        <span v-if="position.isBacktest" class="badge" style="background:rgba(245,158,11,.15);color:var(--warning);margin-left:6px">BACKTEST</span>
      </div>
      <div v-if="position" style="display:flex;gap:8px;align-items:center">
        <template v-if="confirmDelete">
          <span style="font-size:13px;color:var(--danger)">Supprimer ce trade ?</span>
          <button class="btn btn-danger btn-sm" @click="handleDelete" :disabled="deleting">{{ deleting ? '…' : 'Confirmer' }}</button>
          <button class="btn btn-ghost btn-sm" @click="confirmDelete = false">Annuler</button>
        </template>
        <button v-else class="btn btn-ghost btn-sm" style="color:var(--danger)" @click="handleDelete">Supprimer</button>
      </div>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <template v-else-if="position">
      <!-- Données trade -->
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
          <!-- Tags actifs -->
          <div v-if="position.tags?.length" style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(30,48,96,.4)">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">TAGS</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              <span v-for="t in position.tags" :key="t.id" class="badge"
                    :style="{ background: typeMeta(t.type).bg, color: typeMeta(t.type).color }">
                {{ t.label }}
              </span>
            </div>
          </div>
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
                <button class="plan-btn" :class="form.planRespected === true  ? 'active-yes'  : ''" @click="setPlan(true)">✓ Oui</button>
                <button class="plan-btn" :class="form.planRespected === false ? 'active-no'   : ''" @click="setPlan(false)">✗ Non</button>
                <button class="plan-btn" :class="form.planRespected === null  ? 'active-null' : ''" @click="setPlan(null)">? N/A</button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Biais TF supérieur</label>
              <select v-model="form.higherTfBias" class="form-control">
                <option value="">—</option><option value="bull">Haussier</option>
                <option value="bear">Baissier</option><option value="neutral">Neutre</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Biais TF d'entrée</label>
              <select v-model="form.entryTfBias" class="form-control">
                <option value="">—</option><option value="bull">Haussier</option>
                <option value="bear">Baissier</option><option value="neutral">Neutre</option>
              </select>
            </div>
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
          </div>

          <!-- Tags groupés par type -->
          <div class="form-group">
            <label class="form-label" style="margin-bottom:12px">Tags</label>
            <div v-for="(groupTags, type) in tagsByType" :key="type" style="margin-bottom:14px">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                <span>{{ typeMeta(type).icon }}</span>
                <span :style="{ color: typeMeta(type).color, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }">
                  {{ typeMeta(type).label }}
                </span>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                <span v-for="tag in groupTags" :key="tag.id"
                      class="tag-chip"
                      :class="form.tagIds.includes(tag.id) ? 'selected' : ''"
                      :style="form.tagIds.includes(tag.id)
                        ? { background: typeMeta(type).bg, color: typeMeta(type).color, borderColor: typeMeta(type).color }
                        : {}"
                      @click="toggleTag(tag.id)">
                  {{ tag.label }}
                </span>
              </div>
            </div>
            <div v-if="!tags.length" style="color:var(--text-muted);font-size:12px">
              Aucun tag — <router-link to="/tags" style="color:var(--accent)">créer des tags</router-link>
            </div>
          </div>
        </div>

        <div class="form-group" style="margin-top:16px">
          <label class="form-label">Notes</label>
          <textarea v-model="form.comment" class="form-control" placeholder="Commentaire libre…"></textarea>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:16px">
          <button class="btn btn-primary" @click="handleSave" :disabled="saving">{{ saving ? 'Enregistrement…' : 'Enregistrer' }}</button>
          <span v-if="saved" style="color:var(--success);font-size:13px">✓ Sauvegardé</span>
        </div>
      </div>

      <!-- Observations -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div class="card-title" style="margin-bottom:0">Observations ({{ position.observations?.length ?? 0 }})</div>
          <button class="btn btn-ghost btn-sm" @click="toggleObsForm">{{ showObsForm ? 'Annuler' : '+ Ajouter' }}</button>
        </div>

        <!-- Formulaire ajout -->
        <div v-if="showObsForm" class="card" style="margin-bottom:16px;background:var(--surface)">
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px">
            <div class="form-group">
              <label class="form-label">Sentiment</label>
              <div style="display:flex;gap:6px">
                <button v-for="t in ['bull','neutral','bear']" :key="t" class="btn btn-sm"
                        :style="{ background: obsForm.trend===t ? (t==='bull'?'rgba(34,197,94,.25)':t==='bear'?'rgba(239,68,68,.25)':'rgba(100,116,139,.25)') : 'var(--card)', color: t==='bull'?'var(--success)':t==='bear'?'var(--danger)':'var(--text-2)', border:'1px solid var(--border)' }"
                        @click="obsForm.trend = obsForm.trend===t?'':t">
                  {{ t==='bull'?'▲ BULL':t==='bear'?'▼ BEAR':'◆ NEU' }}
                </button>
              </div>
            </div>
            <div class="form-group"><label class="form-label">Date / heure</label><input v-model="obsForm.observedAt" type="datetime-local" class="form-control" /></div>
            <div class="form-group"><label class="form-label">Période début</label><input v-model="obsForm.periodStart" type="datetime-local" class="form-control" /></div>
            <div class="form-group"><label class="form-label">Période fin</label><input v-model="obsForm.periodEnd" type="datetime-local" class="form-control" /></div>
          </div>
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Commentaire</label>
            <textarea v-model="obsForm.comment" class="form-control" rows="2"></textarea>
          </div>
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Screenshot (optionnel)</label>
            <div style="display:flex;align-items:center;gap:10px">
              <label style="cursor:pointer">
                <span class="btn btn-ghost btn-sm">📎 Choisir</span>
                <input type="file" accept="image/*" style="display:none" @change="handleImageSelect" />
              </label>
              <span v-if="obsForm.imageName" style="font-size:12px;color:var(--success)">✓ {{ obsForm.imageName }}</span>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" @click="handleCreateObs" :disabled="savingObs">
            {{ savingObs ? 'Enregistrement…' : 'Ajouter une observation' }}
          </button>
        </div>

        <!-- Timeline -->
        <div v-if="!position.observations?.length && !showObsForm" class="empty-state" style="padding:24px">
          <p>Aucune observation enregistrée.</p>
        </div>
        <div v-else-if="position.observations?.length" class="timeline">
          <div v-for="obs in position.observations" :key="obs.id" class="timeline-item">
            <div class="timeline-dot" :class="trendDot(obs.trend)"></div>
            <div class="timeline-content" style="flex:1">
              <template v-if="editingObsId !== obs.id">
                <div class="timeline-meta" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                  <span>{{ obs.observedAt }}</span>
                  <span v-if="obs.trend" class="badge" :class="'badge-' + obs.trend">{{ obs.trend.toUpperCase() }}</span>
                  <span v-else class="badge badge-neutral">AUTO</span>
                  <span v-if="obs.screenshots?.length" style="color:var(--text-muted)">📷 {{ obs.screenshots.length }}</span>
                  <div style="margin-left:auto;display:flex;gap:6px">
                    <button class="btn btn-ghost btn-sm" style="font-size:11px" @click="startEditObs(obs)">✏ Modifier</button>
                    <template v-if="confirmDeleteObs === obs.id">
                      <span style="font-size:11px;color:var(--danger)">Supprimer ?</span>
                      <button class="btn btn-danger btn-sm" style="font-size:11px" @click="handleDeleteObs(obs.id)">Oui</button>
                      <button class="btn btn-ghost btn-sm" style="font-size:11px" @click="confirmDeleteObs = null">Non</button>
                    </template>
                    <button v-else class="btn btn-ghost btn-sm" style="font-size:11px;color:var(--danger)" @click="handleDeleteObs(obs.id)">✕</button>
                  </div>
                </div>
                <div v-if="obs.comment" class="timeline-comment">{{ obs.comment }}</div>
                <div v-if="obs.screenshots?.length" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
                  <div v-for="sc in obs.screenshots" :key="sc.id"
                       style="width:160px;height:90px;background:var(--border);border-radius:4px;overflow:hidden">
                    <img v-if="blobUrls[sc.id]" :src="blobUrls[sc.id]"
                         style="width:100%;height:100%;object-fit:cover;cursor:zoom-in"
                         @click="fullscreen = blobUrls[sc.id]" />
                    <div v-else style="display:flex;align-items:center;justify-content:center;height:100%;font-size:11px;color:var(--text-muted)">
                      {{ loadings[sc.id] ? 'Chargement…' : '📷' }}
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div style="background:var(--surface);border-radius:6px;padding:12px">
                  <div style="display:flex;gap:6px;margin-bottom:10px">
                    <button v-for="t in ['bull','neutral','bear']" :key="t" class="btn btn-sm"
                            :style="{ background: editObsForm.trend===t?(t==='bull'?'rgba(34,197,94,.25)':t==='bear'?'rgba(239,68,68,.25)':'rgba(100,116,139,.25)'):'var(--card)', color: t==='bull'?'var(--success)':t==='bear'?'var(--danger)':'var(--text-2)', border:'1px solid var(--border)' }"
                            @click="editObsForm.trend = editObsForm.trend===t?'':t">
                      {{ t==='bull'?'▲ BULL':t==='bear'?'▼ BEAR':'◆ NEU' }}
                    </button>
                    <button class="btn btn-ghost btn-sm" style="margin-left:auto" @click="editingObsId = null">Annuler</button>
                  </div>
                  <textarea v-model="editObsForm.comment" class="form-control" rows="2" style="margin-bottom:10px"></textarea>
                  <button class="btn btn-primary btn-sm" @click="handleUpdateObs(obs.id)" :disabled="savingObsEdit">
                    {{ savingObsEdit ? '…' : 'Enregistrer' }}
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="fullscreen"
           style="position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out"
           @click="fullscreen = null">
        <img :src="fullscreen" style="max-width:95vw;max-height:95vh;border-radius:8px" />
      </div>
    </Teleport>
  </div>
</template>
