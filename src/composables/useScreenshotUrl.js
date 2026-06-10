/**
 * useScreenshotUrl
 *
 * Fetche une image protégée (JWT) et retourne une URL blob utilisable
 * comme attribut src d'une balise <img>.
 *
 * Usage :
 *   const { getUrl, blobUrls } = useScreenshotUrl()
 *   await getUrl(screenshotId)
 *   <img :src="blobUrls[screenshotId]" />
 *
 * Les URLs blob sont révoquées automatiquement quand le composant est
 * démonté (onUnmounted).
 */
import { ref, onUnmounted } from 'vue'
import api from '@/services/api'

export function useScreenshotUrl() {
    const blobUrls  = ref({})
    const loadings  = ref({})
    const errors    = ref({})

    async function getUrl(screenshotId) {
        if (blobUrls.value[screenshotId]) return  // déjà chargé
        if (loadings.value[screenshotId]) return  // déjà en cours

        loadings.value[screenshotId] = true
        errors.value[screenshotId]   = null

        try {
            const res = await api.get(`/screenshot/${screenshotId}/image`, {
                responseType: 'blob'
            })
            blobUrls.value[screenshotId] = URL.createObjectURL(res.data)
        } catch {
            errors.value[screenshotId] = 'Image indisponible'
        } finally {
            loadings.value[screenshotId] = false
        }
    }

    // Libérer les URLs blob quand le composant est démonté
    onUnmounted(() => {
        Object.values(blobUrls.value).forEach(url => URL.revokeObjectURL(url))
    })

    return { blobUrls, loadings, errors, getUrl }
}
