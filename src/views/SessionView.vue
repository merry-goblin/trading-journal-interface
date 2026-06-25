<script setup>
import { ref, computed, onMounted } from 'vue'
import { getSession, updateSession } from '@/services/sessionService'
import api from '@/services/api'

// ── Date courante ─────────────────────────────────────────────────
function todayStr() {
    return new Date().toISOString().slice(0, 10)
}

const currentDate = ref(todayStr())
const session     = ref(null)
const assets      = ref([])
const loading     = ref(true)

// État de sauvegarde par section
const saving = ref({ pre: false, intra: false, post: false })
const saved  = ref({ pre: false, intra: false, post: false })

// Formulaires par section
const pre   = ref({ bias: null, keyLevels: '', analysis: '', assetId: '' })
const intra = ref({ notes: '' })
const post  = ref({ review: '', emotionScore: null, discipline: null })

// Sections dépliables
const open = ref({ pre: true, intra: false, post: false })

// ── Navigation dates ──────────────────────────────────────────────
const dateLabel = computed(() => {
    const d   = new Date(currentDate.value + 'T12:00:00')
    const now = new Date()
    now.setHours(12, 0, 0, 0)
    const diff = Math.round((d - now) / 86400000)
    if (diff === 0)  return "Aujourd'hui"
    if (diff === -1) return 'Hier'
    if (diff === 1)  return 'Demain'
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
})

const isToday = computed(() => currentDate.value === todayStr())

function prevDay() { shiftDay(-1) }
function nextDay() { shiftDay(+1) }
function goToday() { currentDate.value = todayStr(); load() }

function shiftDay(n) {
    const d = new Date(currentDate.value + 'T12:00:00')
    d.setDate(d.getDate() + n)
    currentDate.value = d.toISOString().slice(0, 10)
    load()
}

// ── Chargement ────────────────────────────────────────────────────
onMounted(async () => {
    const [assetsRes] = await Promise.all([api.get('/assets')])
    assets.value = assetsRes.data
    await load()
})

async function load() {
    loading.value = true
    try {
        const res = await getSession(currentDate.value)
        session.value = res.data
        fillForms(res.data)
    } finally { loading.value = false }
}

function fillForms(s) {
    pre.value   = {
        bias:      s.preBias ?? null,
        keyLevels: s.preKeyLevels ?? '',
        analysis:  s.preAnalysis  ?? '',
        assetId:   s.assetId      ?? '',
    }
    intra.value = { notes: s.intraNotes ?? '' }
    post.value  = {
        review:       s.postReview        ?? '',
        emotionScore: s.postEmotionScore  ?? null,
        discipline:   s.postDiscipline    ?? null,
    }
}

// ── Sauvegarde par section ────────────────────────────────────────
async function savePre() {
    saving.value.pre = true
    try {
        const res = await updateSession(currentDate.value, {
            preBias:      pre.value.bias,
            preKeyLevels: pre.value.keyLevels || null,
            preAnalysis:  pre.value.analysis  || null,
            assetId:      pre.value.assetId   || null,
        })
        session.value = res.data
        flash('pre')
    } finally { saving.value.pre = false }
}

async function saveIntra() {
    saving.value.intra = true
    try {
        const res = await updateSession(currentDate.value, {
            intraNotes: intra.value.notes || null,
        })
        session.value = res.data
        flash('intra')
    } finally { saving.value.intra = false }
}

async function savePost() {
    saving.value.post = true
    try {
        const res = await updateSession(currentDate.value, {
            postReview:        post.value.review       || null,
            postEmotionScore:  post.value.emotionScore,
            postDiscipline:    post.value.discipline,
        })
        session.value = res.data
        flash('post')
    } finally { saving.value.post = false }
}

function flash(section) {
    saved.value[section] = true
    setTimeout(() => { saved.value[section] = false }, 2000)
}

function setBias(val) { pre.value.bias = pre.value.bias === val ? null : val }
function setDiscipline(val) { post.value.discipline = post.value.discipline === val ? null : val }

// Lien journal filtré par date
const journalLink = computed(() =>
    `/journal?dateFrom=${currentDate.value}&dateTo=${currentDate.value}&isBacktest=false`
)
</script>

<template>
  <div>
    <!-- En-tête + navigation -->
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div>
        <div class="page-title">Session du jour</div>
        <div class="page-subtitle">Analyse pré-session, notes en live et bilan</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <button class="btn btn-ghost btn-sm" @click="prevDay">‹</button>
        <div style="min-width:220px;text-align:center">
          <div style="font-size:15px;font-weight:700;color:var(--text)">{{ dateLabel }}</div>
          <div style="font-size:11px;color:var(--text-muted)">{{ currentDate }}</div>
        </div>
        <button class="btn btn-ghost btn-sm" @click="nextDay">›</button>
        <button v-if="!isToday" class="btn btn-ghost btn-sm" @click="goToday"
                style="margin-left:4px">Aujourd'hui</button>
        <input type="date" v-model="currentDate" @change="load"
               class="form-control" style="width:auto;margin-left:4px" />
      </div>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <template v-else>

      <!-- ── PRÉ-SESSION ──────────────────────────────────────────── -->
      <div class="card" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer"
             @click="open.pre = !open.pre">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:18px">🌅</span>
            <span class="card-title" style="margin-bottom:0">Pré-session</span>
            <span v-if="session?.preBias" class="badge"
                  :style="{ background: session.preBias==='bull'?'rgba(34,197,94,.2)':session.preBias==='bear'?'rgba(239,68,68,.2)':'rgba(100,116,139,.2)', color: session.preBias==='bull'?'var(--success)':session.preBias==='bear'?'var(--danger)':'var(--text-2)' }">
              {{ session.preBias.toUpperCase() }}
            </span>
          </div>
          <span style="color:var(--text-muted)">{{ open.pre ? '▲' : '▼' }}</span>
        </div>

        <div v-show="open.pre" style="margin-top:16px">
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;align-items:flex-end">
            <!-- Instrument -->
            <div class="form-group" style="min-width:160px">
              <label class="form-label">Instrument</label>
              <select v-model="pre.assetId" class="form-control">
                <option value="">— Tous —</option>
                <option v-for="a in assets" :key="a.id" :value="a.id">{{ a.symbol }}</option>
              </select>
            </div>
            <!-- Biais -->
            <div class="form-group">
              <label class="form-label">Biais HTF</label>
              <div style="display:flex;gap:6px">
                <button v-for="b in ['bull','neutral','bear']" :key="b"
                        class="btn btn-sm"
                        :style="{
                          background: pre.bias===b ? (b==='bull'?'rgba(34,197,94,.25)':b==='bear'?'rgba(239,68,68,.25)':'rgba(100,116,139,.25)') : 'var(--card)',
                          color: b==='bull'?'var(--success)':b==='bear'?'var(--danger)':'var(--text-2)',
                          border: '1px solid var(--border)'
                        }"
                        @click="setBias(b)">
                  {{ b==='bull' ? '▲ BULL' : b==='bear' ? '▼ BEAR' : '◆ NEU' }}
                </button>
              </div>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Niveaux clés</label>
            <input v-model="pre.keyLevels" class="form-control"
                   placeholder="ex: 30200 (résistance), 30100 (support), 29980 (PDL)…" />
          </div>

          <div class="form-group" style="margin-bottom:14px">
            <label class="form-label">Analyse pré-session</label>
            <textarea v-model="pre.analysis" class="form-control" rows="4"
                      placeholder="Structure du marché, contexte HTF, scénarios envisagés…"></textarea>
          </div>

          <div style="display:flex;align-items:center;gap:10px">
            <button class="btn btn-primary" @click="savePre" :disabled="saving.pre">
              {{ saving.pre ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
            <span v-if="saved.pre" style="color:var(--success);font-size:13px">✓ Sauvegardé</span>
          </div>
        </div>
      </div>

      <!-- ── PENDANT LA SESSION ───────────────────────────────────── -->
      <div class="card" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer"
             @click="open.intra = !open.intra">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:18px">⚡</span>
            <span class="card-title" style="margin-bottom:0">Pendant la session</span>
            <span v-if="session?.intraNotes"
                  style="font-size:11px;color:var(--text-muted)">Renseigné</span>
          </div>
          <span style="color:var(--text-muted)">{{ open.intra ? '▲' : '▼' }}</span>
        </div>

        <div v-show="open.intra" style="margin-top:16px">
          <div class="form-group" style="margin-bottom:14px">
            <label class="form-label">Notes en cours de session</label>
            <textarea v-model="intra.notes" class="form-control" rows="5"
                      placeholder="Observations en temps réel, changements de structure, raisons de ne pas trader…"></textarea>
          </div>

          <div style="display:flex;align-items:center;gap:10px">
            <button class="btn btn-primary" @click="saveIntra" :disabled="saving.intra">
              {{ saving.intra ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
            <span v-if="saved.intra" style="color:var(--success);font-size:13px">✓ Sauvegardé</span>
          </div>
        </div>
      </div>

      <!-- ── BILAN FIN DE JOURNÉE ─────────────────────────────────── -->
      <div class="card" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer"
             @click="open.post = !open.post">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:18px">🌙</span>
            <span class="card-title" style="margin-bottom:0">Bilan journée</span>
            <span v-if="session?.postDiscipline !== null"
                  :style="{ color: session.postDiscipline ? 'var(--success)' : 'var(--danger)', fontSize: '12px' }">
              {{ session.postDiscipline ? '✓ Plan respecté' : '✗ Plan non respecté' }}
            </span>
          </div>
          <span style="color:var(--text-muted)">{{ open.post ? '▲' : '▼' }}</span>
        </div>

        <div v-show="open.post" style="margin-top:16px">
          <div class="form-group" style="margin-bottom:14px">
            <label class="form-label">Revue de session</label>
            <textarea v-model="post.review" class="form-control" rows="4"
                      placeholder="Ce qui a bien fonctionné, ce qui n'a pas fonctionné, leçons apprises…"></textarea>
          </div>

          <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:14px">
            <div class="form-group">
              <label class="form-label">
                Score émotionnel ({{ post.emotionScore ?? 0 }} / 5)
              </label>
              <input type="range" min="0" max="5"
                     v-model.number="post.emotionScore"
                     style="width:180px;accent-color:var(--accent)" />
              <div style="display:flex;justify-content:space-between;width:180px;font-size:10px;color:var(--text-muted);margin-top:2px">
                <span>Très mal</span><span>Parfait</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Plan globalement respecté ?</label>
              <div style="display:flex;gap:8px;margin-top:4px">
                <button class="btn btn-sm"
                        :style="{ background: post.discipline===true?'rgba(34,197,94,.25)':'var(--card)', color: post.discipline===true?'var(--success)':'var(--text-2)', border:'1px solid var(--border)' }"
                        @click="setDiscipline(true)">✓ Oui</button>
                <button class="btn btn-sm"
                        :style="{ background: post.discipline===false?'rgba(239,68,68,.25)':'var(--card)', color: post.discipline===false?'var(--danger)':'var(--text-2)', border:'1px solid var(--border)' }"
                        @click="setDiscipline(false)">✗ Non</button>
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:10px">
            <button class="btn btn-primary" @click="savePost" :disabled="saving.post">
              {{ saving.post ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
            <span v-if="saved.post" style="color:var(--success);font-size:13px">✓ Sauvegardé</span>
          </div>
        </div>
      </div>

      <!-- ── Trades du jour ──────────────────────────────────────── -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:16px">📋</span>
            <span class="card-title" style="margin-bottom:0">Trades du jour</span>
          </div>
          <router-link :to="journalLink" class="btn btn-ghost btn-sm">
            Voir dans le journal →
          </router-link>
        </div>
        <p style="color:var(--text-muted);font-size:12px;margin-top:8px">
          Cliquez sur "Voir dans le journal" pour afficher les positions live du {{ currentDate }}.
        </p>
      </div>

    </template>
  </div>
</template>
