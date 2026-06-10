<script setup>
import { ref, onMounted, computed } from 'vue'
import { importPositions } from '@/services/importService'
import api from '@/services/api'

const timeframes  = ref([])
const selectedTf  = ref('')
const rows        = ref([])
const selected    = ref([])
const importing   = ref(false)
const result      = ref(null)
const parseError  = ref('')

onMounted(async () => {
    try {
        const res = await api.get('/timeframes')
        timeframes.value = res.data
        if (res.data.length === 1) selectedTf.value = res.data[0].id
    } catch {}
})

// ── Parsing CSV ───────────────────────────────────────────────────

function sanitizeSymbol(s) {
    return s.replace(/[\[\]#]/g, '').trim()
}

function parseFrNumber(s) {
    if (s === null || s === undefined || s.toString().trim() === '') return null
    return parseFloat(s.toString().trim().replace(/\s/g, '').replace(',', '.'))
}

function parseMT5Date(s) {
    // "2026.06.10 14:50:05" → "2026-06-10 14:50:05"
    return s.trim()
        .replace(/^(\d{4})\.(\d{2})\.(\d{2})/, '$1-$2-$3')
}

function handleFile(event) {
    parseError.value = ''
    rows.value       = []
    selected.value   = []
    result.value     = null

    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
        try {
            rows.value = parseTradesSection(e.target.result)
            selected.value = rows.value.map((_, i) => i)
            if (rows.value.length === 0)
                parseError.value = 'Aucun trade détecté. Vérifiez que le fichier contient la section Trades.'
        } catch (err) {
            parseError.value = 'Erreur de parsing : ' + err.message
        }
    }
    reader.readAsText(file, 'UTF-8')
}

function splitCSVLine(line) {
    return line.split(';').map(c => c.trim().replace(/^"|"$/g, ''))
}

function parseTradesSection(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const results = []

    let headerIdx = -1
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i].toLowerCase()
        if (l.includes('profit') && l.includes('symbole') && l.includes('position')) {
            headerIdx = i
            break
        }
    }
    if (headerIdx === -1) throw new Error('En-tête de la section Trades introuvable.')

    for (let i = headerIdx + 1; i < lines.length; i++) {
        const line = lines[i]
        if (!line) continue

        const cols = splitCSVLine(line)
        if (cols.length < 13) continue
        if (!/^\d{4}\.\d{2}\.\d{2}/.test(cols[0])) continue

        const symbol     = sanitizeSymbol(cols[2])
        const entryPrice = parseFrNumber(cols[5])
        const exitPrice  = parseFrNumber(cols[9])
        const pnl        = parseFrNumber(cols[12])

        if (!symbol || entryPrice === null || exitPrice === null) continue

        results.push({
            openedAt:   parseMT5Date(cols[0]),
            symbol,
            direction:  cols[3].toLowerCase() === 'buy' ? 'long' : 'short',
            volume:     cols[4].toString().trim(),
            entryPrice: entryPrice.toFixed(5),
            stopLoss:   parseFrNumber(cols[6])?.toFixed(5) ?? null,
            takeProfit: parseFrNumber(cols[7])?.toFixed(5) ?? null,
            closedAt:   parseMT5Date(cols[8]),
            exitPrice:  exitPrice.toFixed(5),
            pnl:        pnl?.toFixed(2) ?? '0',
        })
    }
    return results
}

// ── Sélection ─────────────────────────────────────────────────────

function toggleAll(checked) {
    selected.value = checked ? rows.value.map((_, i) => i) : []
}

function toggleRow(i) {
    const idx = selected.value.indexOf(i)
    if (idx === -1) selected.value.push(i)
    else selected.value.splice(idx, 1)
}

const selectedRows = computed(() => selected.value.map(i => rows.value[i]))

// ── Import ────────────────────────────────────────────────────────

async function handleImport() {
    if (!selectedTf.value)            { alert('Sélectionnez un timeframe.'); return }
    if (selectedRows.value.length === 0) { alert('Sélectionnez au moins un trade.'); return }

    importing.value = true
    result.value    = null
    try {
        const res = await importPositions(parseInt(selectedTf.value), selectedRows.value)
        result.value = res.data
        if (res.data.created > 0) { rows.value = []; selected.value = [] }
    } catch (e) {
        result.value = { created: 0, errors: [e.response?.data?.error ?? 'Erreur serveur'] }
    } finally {
        importing.value = false
    }
}

function pnlClass(pnl) {
    const v = parseFloat(pnl)
    return v > 0 ? 'pnl-pos' : v < 0 ? 'pnl-neg' : 'pnl-zero'
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">Import MT5</div>
      <div class="page-subtitle">Importer des trades depuis un rapport CSV MetaTrader 5</div>
    </div>

    <!-- Instructions -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-title">Comment préparer le fichier</div>
      <ol style="color:var(--text-2);font-size:13px;line-height:2;padding-left:20px;margin-top:8px">
        <li>Dans MT5 : <strong style="color:var(--text)">Historique → Rapport</strong> → clic droit → Enregistrer en XLS(X)</li>
        <li>Ouvrir dans Excel, <strong style="color:var(--text)">Fichier → Enregistrer sous → CSV (séparateur : point-virgule)</strong></li>
        <li>Charger le fichier ci-dessous — seule la section <strong style="color:var(--text)">Trades</strong> est importée</li>
      </ol>
    </div>

    <!-- Configuration -->
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="flex:1;min-width:200px">
          <label class="form-label">Fichier CSV</label>
          <input type="file" accept=".csv,.txt" class="form-control"
                 style="padding:6px" @change="handleFile" />
        </div>
        <div class="form-group" style="min-width:180px">
          <label class="form-label">Timeframe des trades</label>
          <select v-model="selectedTf" class="form-control">
            <option value="">— Choisir —</option>
            <option v-for="tf in timeframes" :key="tf.id" :value="tf.id">
              {{ tf.label }}
            </option>
          </select>
        </div>
      </div>
      <div v-if="parseError" class="error-msg" style="margin-top:10px">{{ parseError }}</div>
    </div>

    <!-- Prévisualisation -->
    <div v-if="rows.length > 0" class="card" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px">
        <div class="card-title" style="margin-bottom:0">
          {{ rows.length }} trade(s) détecté(s) — {{ selected.length }} sélectionné(s)
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" @click="toggleAll(true)">Tout sélectionner</button>
          <button class="btn btn-ghost btn-sm" @click="toggleAll(false)">Tout désélectionner</button>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:32px"></th>
              <th>Symbole</th>
              <th>Dir.</th>
              <th>Ouverture</th>
              <th>Entrée</th>
              <th>Clôture</th>
              <th>Sortie</th>
              <th>Volume</th>
              <th>P&L</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in rows" :key="i"
                :style="{ opacity: selected.includes(i) ? 1 : 0.4 }"
                style="cursor:pointer" @click="toggleRow(i)">
              <td><input type="checkbox" :checked="selected.includes(i)" @click.stop="toggleRow(i)" /></td>
              <td>{{ row.symbol }}</td>
              <td>
                <span class="badge" :class="row.direction === 'long' ? 'badge-long' : 'badge-short'">
                  {{ row.direction.toUpperCase() }}
                </span>
              </td>
              <td style="font-size:12px;color:var(--text-2)">{{ row.openedAt }}</td>
              <td>{{ row.entryPrice }}</td>
              <td style="font-size:12px;color:var(--text-2)">{{ row.closedAt }}</td>
              <td>{{ row.exitPrice }}</td>
              <td style="color:var(--text-2)">{{ row.volume }}</td>
              <td :class="pnlClass(row.pnl)">
                {{ parseFloat(row.pnl) >= 0 ? '+' : '' }}{{ parseFloat(row.pnl).toFixed(2) }} €
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top:16px">
        <button class="btn btn-primary" @click="handleImport"
                :disabled="importing || selected.length === 0 || !selectedTf">
          {{ importing ? 'Import en cours…' : `Importer ${selected.length} trade(s)` }}
        </button>
      </div>
    </div>

    <!-- Résultat -->
    <div v-if="result" class="card">
      <div v-if="result.created > 0"
           style="color:var(--success);font-size:15px;font-weight:700;margin-bottom:8px">
        ✓ {{ result.created }} position(s) importée(s) avec succès.
      </div>
      <div v-if="result.errors?.length">
        <div style="color:var(--danger);font-weight:600;margin-bottom:6px">
          {{ result.errors.length }} erreur(s) :
        </div>
        <div v-for="e in result.errors" :key="e"
             style="font-size:12px;color:var(--danger);padding:3px 0">{{ e }}</div>
      </div>
    </div>
  </div>
</template>
