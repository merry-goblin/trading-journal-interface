<script setup>
import { ref, onMounted, computed } from 'vue'
import { getTags, createTag, deleteTag } from '@/services/tagService'

const tags    = ref([])
const loading = ref(false)
const saving  = ref(false)
const error   = ref(null)

// Formulaire de création
const form = ref({ label: '', type: 'setup', description: '' })
const showForm = ref(false)

// Tag à confirmer pour suppression
const confirmDeleteId = ref(null)

onMounted(() => load())

async function load() {
    loading.value = true
    try {
        const res = await getTags()
        tags.value = res.data
    } finally {
        loading.value = false
    }
}

async function handleCreate() {
    if (!form.value.label.trim() || !form.value.type.trim()) return
    saving.value = true
    error.value  = null
    try {
        await createTag(form.value)
        form.value  = { label: '', type: 'setup', description: '' }
        showForm.value = false
        await load()
    } catch (e) {
        error.value = e.response?.data?.message ?? 'Erreur lors de la création.'
    } finally {
        saving.value = false
    }
}

async function handleDelete(id) {
    if (confirmDeleteId.value !== id) {
        confirmDeleteId.value = id
        return
    }
    try {
        await deleteTag(id)
        confirmDeleteId.value = null
        await load()
    } catch {
        error.value = 'Erreur lors de la suppression.'
    }
}

function cancelDelete() {
    confirmDeleteId.value = null
}

// Tags groupés par type
const grouped = computed(() => {
    const groups = {}
    for (const tag of tags.value) {
        if (!groups[tag.type]) groups[tag.type] = []
        groups[tag.type].push(tag)
    }
    return groups
})

const typeColors = {
    setup:  { bg: 'rgba(59,111,255,.15)',  text: 'var(--accent)' },
    erreur: { bg: 'rgba(239,68,68,.15)',   text: 'var(--danger)' },
    emotion:{ bg: 'rgba(245,158,11,.15)',  text: 'var(--warning)' },
}

function typeStyle(type) {
    return typeColors[type] ?? { bg: 'rgba(100,116,139,.2)', text: 'var(--text-2)' }
}
</script>

<template>
  <div>
    <div class="page-header" style="display:flex;align-items:flex-start;justify-content:space-between">
      <div>
        <div class="page-title">Tags</div>
        <div class="page-subtitle">Étiquetez vos trades pour analyser vos setups</div>
      </div>
      <button class="btn btn-primary" @click="showForm = !showForm">
        {{ showForm ? 'Annuler' : '+ Nouveau tag' }}
      </button>
    </div>

    <!-- Formulaire de création -->
    <div v-if="showForm" class="card" style="margin-bottom:20px">
      <div class="card-title" style="margin-bottom:16px">Nouveau tag</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="flex:1;min-width:140px">
          <label class="form-label">Label</label>
          <input
            v-model="form.label"
            class="form-control"
            placeholder="ex: FVG, OB, CHoCH…"
            @keyup.enter="handleCreate"
          />
        </div>
        <div class="form-group" style="min-width:140px">
          <label class="form-label">Type</label>
          <select v-model="form.type" class="form-control">
            <option value="setup">Setup</option>
            <option value="erreur">Erreur</option>
            <option value="emotion">Émotion</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div class="form-group" style="flex:2;min-width:180px">
          <label class="form-label">Description (optionnel)</label>
          <input v-model="form.description" class="form-control" placeholder="ex: Fair Value Gap" />
        </div>
        <button
          class="btn btn-primary"
          :disabled="saving || !form.label.trim()"
          @click="handleCreate"
          style="margin-bottom:1px"
        >
          {{ saving ? 'Création…' : 'Créer' }}
        </button>
      </div>
      <div v-if="error" class="error-msg" style="margin-top:10px">{{ error }}</div>
    </div>

    <!-- Chargement -->
    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <!-- Aucun tag -->
    <div v-else-if="tags.length === 0" class="empty-state">
      <div class="icon">🏷️</div>
      <p>Aucun tag créé.</p>
      <p style="margin-top:8px;font-size:12px">
        Créez des tags pour étiqueter vos trades (setups, erreurs, émotions…).
      </p>
    </div>

    <!-- Tags groupés par type -->
    <template v-else>
      <div v-for="(items, type) in grouped" :key="type" class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:14px">
          <span
            :style="{
              background: typeStyle(type).bg,
              color: typeStyle(type).text,
              padding: '2px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.05em'
            }"
          >{{ type }}</span>
        </div>

        <div style="display:flex;flex-direction:column;gap:0">
          <div
            v-for="tag in items"
            :key="tag.id"
            style="display:flex;align-items:center;padding:10px 0;border-bottom:1px solid rgba(30,48,96,.4)"
          >
            <!-- Badge + description -->
            <div style="flex:1;display:flex;align-items:center;gap:12px">
              <span
                class="badge"
                :style="{ background: typeStyle(tag.type).bg, color: typeStyle(tag.type).text }"
              >{{ tag.label }}</span>
              <span style="color:var(--text-muted);font-size:12px">
                {{ tag.description || '—' }}
              </span>
            </div>

            <!-- Actions -->
            <div style="display:flex;gap:8px;align-items:center">
              <template v-if="confirmDeleteId === tag.id">
                <span style="font-size:12px;color:var(--danger)">Confirmer ?</span>
                <button class="btn btn-danger btn-sm" @click="handleDelete(tag.id)">Oui</button>
                <button class="btn btn-ghost btn-sm" @click="cancelDelete">Non</button>
              </template>
              <button v-else class="btn btn-ghost btn-sm" @click="handleDelete(tag.id)">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
