<script setup>
import { ref, onMounted, computed } from 'vue'
import { importPositions } from '@/services/importService'
import api from '@/services/api'

const timeframes   = ref([])
const selectedTf   = ref('')
const isBacktest   = ref(true)   // coché par défaut
const rows         = ref([])
const selected     = ref([])
const importing    = ref(false)
const result       = ref(null)
const parseError   = ref('')

onMounted(async () => {
    try {
        const res = await api.get('/timeframes')
        timeframes.value = res.data
        if (res.data.length === 1) selectedTf.value = res.data[0].id
    } catch {}
})

function sanitizeSymbol(s) { return s.replace(/[\[\]#]/g, '').trim() }
function parseFrNumber(s) {
    if (!s?.toString().trim()) return null
    return parseFloat(s.toString().trim().replace(/\s/g, '').replace(',', '.'))
}
function parseMT5Date(s) { return s.trim().replace(/^(\d{4})\.(\d{2})\.(\d{2})/, '$1-$2-$3') }

function handleFile(event) {
    parseError.value = ''; rows.value = []; selected.value = []; result.value = null
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
        try {
            rows.value = parseTradesSection(e.target.result)
            selected.value = rows.value.map((_, i) => i)
            if (!rows.value.length) parseError.value = 'Aucun trade détecté.'
        } catch (err) { parseError.value = 'Erreur de parsing : ' + err.message }
    }
    reader.readAsText(file, 'UTF-8')
}

function splitCSVLine(line) { return line.split(';').map(c => c.trim().replace(/^"|"$/g, '')) }

function parseTradesSection(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    let headerIdx = -1
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i].toLowerCase()
        if (l.includes('profit') && l.includes('symbole') && l.includes('position')) { headerIdx = i; break }
    }
    if (headerIdx === -1) throw new Error('En-tête Trades introuvable.')
    const results = []
    for (let i = headerIdx + 1; i < lines.length; i++) {
        const cols = splitCSVLine(lines[i])
        if (cols.length < 13 || !/^\d{4}\.\d{2}\.\d{2}/.test(cols[0])) continue
        const symbol = sanitizeSymbol(cols[2])
        const ep = parseFrNumber(cols[5]), xp = parseFrNumber(cols[9]), pnl = parseFrNumber(cols[12])
        if (!symbol || ep === null || xp === null) continue
        results.push({
            openedAt: parseMT5Date(cols[0]), symbol, direction: cols[3].toLowerCase() === 'buy' ? 'long' : 'short',
            volume: cols[4].trim(), entryPrice: ep.toFixed(5),
            stopLoss: parseFrNumber(cols[6])?.toFixed(5) ?? null, takeProfit: parseFrNumber(cols[7])?.toFixed(5) ?? null,
            closedAt: parseMT5Date(cols[8]), exitPrice: xp.toFixed(5), pnl: pnl?.toFixed(2) ?? '0',
        })
    }
    return results
}

function toggleAll(v) { selected.value = v ? rows.value.map((_, i) => i) : [] }
function toggleRow(i) { const idx = selected.value.indexOf(i); if (idx === -1) selected.value.push(i); else selected.value.splice(idx, 1) }
const selectedRows = computed(() => selected.value.map(i => rows.value[i]))

async function handleImport() {
    if (!selectedTf.value) { alert('Sélectionnez un timeframe.'); return }
    if (!selectedRows.value.length) { alert('Sélectionnez au moins un trade.'); return }
    importing.value = true; result.value = null
    try {
        const res = await importPositions(parseInt(selectedTf.value), selectedRows.value, isBacktest.value)
        result.value = res.data
        if (res.data.created > 0) { rows.value = []; selected.value = [] }
    } catch (e) {
        result.value = { created: 0, skipped: 0, errors: [e.response?.data?.error ?? 'Erreur serveur'] }
    } finally { importing.value = false }
}

function pnlClass(pnl) { const v = parseFloat(pnl); return v > 0 ? 'pnl-pos' : v < 0 ? 'pnl-neg' : 'pnl-zero' }
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">Import MT5</div>
      <div class="page-subtitle">Importer des trades depuis un rapport CSV MetaTrader 5</div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-title">Comment préparer le fichier</div>
      <ol style="color:var(--text-2);font-size:13px;line-height:2;padding-left:20px;margin-top:8px">
        <li>MT5 : <strong style="color:var(--text)">Historique → Rapport</strong> → Enregistrer en XLS(X)</li>
        <li>Excel : <strong style="color:var(--text)">Enregistrer sous → CSV (point-virgule)</strong></li>
        <li>Seule la section <strong style="color:var(--text)">Trades</strong> est importée</li>
      </ol>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="flex:1;min-width:200px">
          <label class="form-label">Fichier CSV</label>
          <input type="file" accept=".csv,.txt" class="form-control" style="padding:6px" @change="handleFile" />
        </div>
        <div class="form-group" style="min-width:180px">
          <label class="form-label">Timeframe</label>
          <select v-model="selectedTf" class="form-control">
            <option value="">— Choisir —</option>
            <option v-for="tf in timeframes" :key="tf.id" :value="tf.id">{{ tf.label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Type de données</label>
          <div style="display:flex;gap:4px">
            <button v-for="(bt, label) in { Backtest: true, Live: false }" :key="label"
                    class="btn btn-sm"
                    :style="{ background: isBacktest === bt ? 'rgba(59,111,255,.25)' : 'var(--card)', color: isBacktest === bt ? 'var(--accent)' : 'var(--text-2)', border: '1px solid var(--border)' }"
                    @click="isBacktest = bt">
              {{ label }}
            </button>
          </div>
        </div>
      </div>
      <div v-if="parseError" class="error-msg" style="margin-top:10px">{{ parseError }}</div>
    </div>

    <div v-if="rows.length" class="card" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px">
        <div class="card-title" style="margin-bottom:0">{{ rows.length }} trade(s) — {{ selected.length }} sélectionné(s)</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" @click="toggleAll(true)">Tout</button>
          <button class="btn btn-ghost btn-sm" @click="toggleAll(false)">Aucun</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th style="width:32px"></th><th>Symbole</th><th>Dir.</th><th>Ouverture</th><th>Entrée</th><th>Clôture</th><th>Sortie</th><th>Vol.</th><th>P&L</th></tr></thead>
          <tbody>
            <tr v-for="(row, i) in rows" :key="i" :style="{ opacity: selected.includes(i) ? 1 : 0.4 }" style="cursor:pointer" @click="toggleRow(i)">
              <td><input type="checkbox" :checked="selected.includes(i)" @click.stop="toggleRow(i)" /></td>
              <td>{{ row.symbol }}</td>
              <td><span class="badge" :class="row.direction === 'long' ? 'badge-long' : 'badge-short'">{{ row.direction.toUpperCase() }}</span></td>
              <td style="font-size:12px;color:var(--text-2)">{{ row.openedAt }}</td>
              <td>{{ row.entryPrice }}</td>
              <td style="font-size:12px;color:var(--text-2)">{{ row.closedAt }}</td>
              <td>{{ row.exitPrice }}</td>
              <td style="color:var(--text-2)">{{ row.volume }}</td>
              <td :class="pnlClass(row.pnl)">{{ parseFloat(row.pnl) >= 0 ? '+' : '' }}{{ parseFloat(row.pnl).toFixed(2) }} €</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="margin-top:16px">
        <button class="btn btn-primary" @click="handleImport" :disabled="importing || !selected.length || !selectedTf">
          {{ importing ? 'Import…' : `Importer ${selected.length} trade(s) (${isBacktest ? 'backtest' : 'live'})` }}
        </button>
      </div>
    </div>

    <div v-if="result" class="card">
      <div v-if="result.created > 0" style="color:var(--success);font-size:15px;font-weight:700;margin-bottom:6px">✓ {{ result.created }} position(s) importée(s).</div>
      <div v-if="result.skipped > 0" style="color:var(--warning);font-size:13px;margin-bottom:6px">⚠ {{ result.skipped }} doublon(s) ignoré(s)</div>
      <div v-if="result.created === 0 && result.skipped > 0 && !result.errors?.length" style="color:var(--text-2);font-size:13px">Tous les trades existent déjà.</div>
      <div v-if="result.errors?.length" style="margin-top:8px">
        <div style="color:var(--danger);font-weight:600;margin-bottom:4px">{{ result.errors.length }} erreur(s) :</div>
        <div v-for="e in result.errors" :key="e" style="font-size:12px;color:var(--danger);padding:2px 0">{{ e }}</div>
      </div>
    </div>
  </div>
</template>
