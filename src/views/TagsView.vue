<script setup>
import { ref, onMounted, computed } from 'vue'
import { getTags, createTag, deleteTag } from '@/services/tagService'

const tags     = ref([])
const loading  = ref(false)
const saving   = ref(false)
const error    = ref(null)
const showForm = ref(false)
const form     = ref({ label: '', type: 'methode', description: '' })
const confirmDeleteId = ref(null)

const TYPE_META = {
    methode:   { label: 'Méthode',   icon: '🎯', bg: 'rgba(59,111,255,.15)',  color: 'var(--accent)' },
    condition: { label: 'Condition',  icon: '📊', bg: 'rgba(20,184,166,.15)',  color: '#14b8a6' },
    erreur:    { label: 'Erreur',     icon: '⚠️', bg: 'rgba(239,68,68,.15)',   color: 'var(--danger)' },
    emotion:   { label: 'Émotion',   icon: '💭', bg: 'rgba(245,158,11,.15)',  color: 'var(--warning)' },
}

const TYPE_ORDER = ['methode', 'condition', 'erreur', 'emotion']

const grouped = computed(() => {
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
    return TYPE_META[type] ?? { label: type, icon: '🏷️', bg: 'rgba(100,116,139,.2)', color: 'var(--text-2)' }
}

onMounted(() => load())

async function load() {
    loading.value = true
    try { tags.value = (await getTags()).data }
    finally { loading.value = false }
}

async function handleCreate() {
    if (!form.value.label.trim()) return
    saving.value = true; error.value = null
    try {
        await createTag(form.value)
        form.value = { label: '', type: 'methode', description: '' }
        showForm.value = false
        await load()
    } catch (e) {
        error.value = e.response?.data?.message ?? 'Erreur lors de la création.'
    } finally { saving.value = false }
}

async function handleDelete(id) {
    if (confirmDeleteId.value !== id) { confirmDeleteId.value = id; return }
    try { await deleteTag(id); confirmDeleteId.value = null; await load() }
    catch { confirmDeleteId.value = null }
}
</script>

<template>
  <div>
    <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between">
      <div>
        <div class="page-title">Tags</div>
        <div class="page-subtitle">Organisez vos analyses par méthode et par condition</div>
      </div>
      <button class="btn btn-primary" @click="showForm = !showForm">
        {{ showForm ? 'Annuler' : '+ Nouveau tag' }}
      </button>
    </div>

    <!-- Formulaire -->
    <div v-if="showForm" class="card" style="margin-bottom:20px">
      <div class="card-title" style="margin-bottom:16px">Nouveau tag</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="flex:1;min-width:140px">
          <label class="form-label">Label</label>
          <input v-model="form.label" class="form-control"
                 placeholder="ex: FVG, SMA200 support…"
                 @keyup.enter="handleCreate" />
        </div>
        <div class="form-group" style="min-width:160px">
          <label class="form-label">Type</label>
          <select v-model="form.type" class="form-control">
            <option v-for="(meta, key) in TYPE_META" :key="key" :value="key">
              {{ meta.icon }} {{ meta.label }}
            </option>
          </select>
        </div>
        <div class="form-group" style="flex:2;min-width:180px">
          <label class="form-label">Description (optionnel)</label>
          <input v-model="form.description" class="form-control"
                 placeholder="ex: Fair Value Gap haussier" />
        </div>
        <button class="btn btn-primary" :disabled="saving || !form.label.trim()"
                @click="handleCreate" style="margin-bottom:1px">
          {{ saving ? 'Création…' : 'Créer' }}
        </button>
      </div>
      <div v-if="error" class="error-msg" style="margin-top:10px">{{ error }}</div>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <div v-else-if="!tags.length" class="empty-state">
      <div class="icon">🏷️</div>
      <p>Aucun tag créé.</p>
      <p style="margin-top:8px;font-size:12px">Créez des tags de méthode (FVG, OB…) et de condition (SMA200 support, Trend day…).</p>
    </div>

    <template v-else>
      <div v-for="(items, type) in grouped" :key="type" class="card" style="margin-bottom:16px">
        <!-- En-tête du groupe -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <span style="font-size:18px">{{ typeMeta(type).icon }}</span>
          <span :style="{ color: typeMeta(type).color, fontWeight: 700, fontSize: '14px' }">
            {{ typeMeta(type).label }}
          </span>
          <span style="color:var(--text-muted);font-size:12px">({{ items.length }})</span>
        </div>

        <div style="display:flex;flex-direction:column;gap:0">
          <div v-for="tag in items" :key="tag.id"
               style="display:flex;align-items:center;padding:9px 0;border-bottom:1px solid rgba(30,48,96,.4)">
            <div style="flex:1;display:flex;align-items:center;gap:10px">
              <span class="badge"
                    :style="{ background: typeMeta(tag.type).bg, color: typeMeta(tag.type).color }">
                {{ tag.label }}
              </span>
              <span style="color:var(--text-muted);font-size:12px">{{ tag.description || '—' }}</span>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <template v-if="confirmDeleteId === tag.id">
                <span style="font-size:12px;color:var(--danger)">Supprimer ?</span>
                <button class="btn btn-danger btn-sm" @click="handleDelete(tag.id)">Oui</button>
                <button class="btn btn-ghost btn-sm" @click="confirmDeleteId = null">Non</button>
              </template>
              <button v-else class="btn btn-ghost btn-sm" @click="handleDelete(tag.id)">Supprimer</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
