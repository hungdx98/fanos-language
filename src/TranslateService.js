import https from 'https'

const LANGUAGE_CODE_MAP = {
  'EN': 'en',
  'VI': 'vi',
  'CN': 'zh-CN',
  'JP': 'ja',
  'KO': 'ko',
  'RU': 'ru',
  'TH': 'th',
  'TR': 'tr',
  'ES': 'es',
  'FR': 'fr',
  'ID': 'id',
  'PT': 'pt'
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class TranslateService {

  static getLanguageCode(lang) {
    return LANGUAGE_CODE_MAP[lang] || lang.toLowerCase()
  }

  /**
   * Translate a single text string from English to target language.
   * Preserves template variables like {{variableName}}.
   */
  static translateText(text, toLang) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return Promise.resolve(text || '')
    }

    // Preserve template variables like {{variable}}
    const placeholders = []
    let preserved = text.replace(/\{\{([^}]+)\}\}/g, (match) => {
      const idx = placeholders.length
      placeholders.push(match)
      return `__PH${idx}__`
    })

    const langCode = TranslateService.getLanguageCode(toLang)

    return new Promise((resolve) => {
      const encodedText = encodeURIComponent(preserved)

      // If text is too long, return original
      if (encodedText.length > 5000) {
        resolve(text)
        return
      }

      const path = `/translate_a/t?client=dict-chrome-ex&sl=en&tl=${langCode}&q=${encodedText}`

      const req = https.get({
        hostname: 'clients5.google.com',
        path: path,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          try {
            const result = JSON.parse(data)
            let translated = ''

            // Response format: ["translated text"] or [["translated text",...]]
            if (Array.isArray(result)) {
              if (typeof result[0] === 'string') {
                translated = result[0]
              } else if (Array.isArray(result[0])) {
                translated = result[0][0]
              }
            }

            if (!translated) {
              resolve(text)
              return
            }

            // Restore placeholders
            for (let i = 0; i < placeholders.length; i++) {
              const regex = new RegExp(`__\\s*PH\\s*${i}\\s*__`, 'gi')
              translated = translated.replace(regex, placeholders[i])
            }

            resolve(translated)
          } catch (e) {
            resolve(text)
          }
        })
      })

      req.on('error', () => {
        resolve(text)
      })

      req.setTimeout(10000, () => {
        req.destroy()
        resolve(text)
      })
    })
  }

  /**
   * Translate an array of texts with concurrency control and rate limiting.
   * @param {string[]} texts - Array of texts to translate
   * @param {string} toLang - Target language code (e.g. 'VI', 'CN')
   * @param {number} batchSize - Number of concurrent translations
   * @param {number} delayMs - Delay between batches in ms
   * @returns {Promise<string[]>} Translated texts
   */
  static async translateBatch(texts, toLang, batchSize = 5, delayMs = 300) {
    const results = []
    const total = texts.length

    for (let i = 0; i < total; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const translations = await Promise.all(
        batch.map(text => TranslateService.translateText(text, toLang))
      )
      results.push(...translations)

      const progress = Math.min(i + batchSize, total)
      process.stdout.write(`\r  Progress: ${progress}/${total}`)

      if (i + batchSize < total) {
        await sleep(delayMs)
      }
    }

    return results
  }
}
