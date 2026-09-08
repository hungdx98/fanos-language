import path from 'path'
import { CREDENTIAL_PATH } from './Config'
import { FileSystem } from './FileSystem'
import { GoogleAuthentication } from './GoogleApiAuthentication'
import { GoogleSheetService } from './GoogleSheetService'
import { LanguageService } from './LanguageService'
import { TranslateService } from './TranslateService'

export async function exportAppModule(sheetId, sheetName, destinationFormat, languages) {
  await exportAppData(sheetId, sheetName, destinationFormat, languages, 'MODULE')
}

export async function exportAppJson(sheetId, sheetName, destinationFormat, languages) {
  await exportAppData(sheetId, sheetName, destinationFormat, languages, 'JSON')
}

async function exportAppData(sheetId, sheetName, destinationFormat, languages, type) {
  const sheetData = await readFromSpreadsheet(sheetId, sheetName)
  if (!sheetData)return
  const languageData = LanguageService.processLanguageSheet(sheetData)

  const destinationMappings = []
  for(let i = 0; i < languages.length; i++) {
    const destination = destinationFormat.replace('{lang}', languages[i])
    destinationMappings.push({
      language: languages[i],
      destination: destination
    })
  }
  for(let i = 0; i < languageData.length; i++) {
    const language = languageData[i].language
    const mapping = destinationMappings.find(map => map.language === language)
    if (!mapping) {
      continue
    }
    if (type === 'JSON') {
      FileSystem.writJsonToFile(mapping.destination, languageData[i].value)
    }
    if (type === 'MODULE') {
      FileSystem.writeJsModuleToFile(mapping.destination, languageData[i].value, language.toLowerCase())
    }
    console.log(`Written ${languageData[i].valueCount} values into ${mapping.destination}`)
  }
}

export async function importAppModule(sources, sheetId, sheetName) {
  await importAppData(sources, sheetId, sheetName, 'MODULE')
}

export async function importAppJson(sources, sheetId, sheetName) {
  await importAppData(sources, sheetId, sheetName, 'JSON')
}

async function importAppData(sources, sheetId, sheetName, sourceType) {
  console.log(`Importing ${sheetName} data`)
  const sourceCount = Math.floor(sources.length / 2)
  const jsonSources = []
  for(let i = 0; i < sourceCount; i++) {
    const jsonSource = {
      language: sources[i*2+1],
      dict: [],
    }
    if (sourceType === 'JSON') {
      jsonSource.dict = LanguageService.processLanguageJson(sources[i*2])
    }
    if (sourceType === 'MODULE') {
      jsonSource.dict = LanguageService.processLanguageModule(sources[i*2])
    }
    jsonSources.push(jsonSource)
  }
  // Check if spreadsheet already has existing data
  const existingSheetData = await readFromSpreadsheet(sheetId, sheetName)
  if (existingSheetData && existingSheetData.length > 0) {
    const credentials = FileSystem.readJsonFromFile(CREDENTIAL_PATH)
    if (!credentials) {
      return console.log('Credential for Google Cloud API not supplied')
    }
    const gAuth = await GoogleAuthentication.authorize(credentials)
    const spreadsheet = await GoogleSheetService.getSpreadsheet(gAuth, sheetId)

    const headers = [...existingSheetData[0]]
    const existingKeys = existingSheetData.slice(1).map(row => row[0])

    for (let i = 0; i < jsonSources.length; i++) {
      const jsonSource = jsonSources[i]
      const dictMap = new Map(jsonSource.dict)

      let colIndex = headers.findIndex(h => h && h.toUpperCase() === jsonSource.language.toUpperCase())
      if (colIndex === -1) {
        colIndex = headers.length
        headers.push(jsonSource.language)
      }

      // Check for any new keys in imported module not present in sheet
      const newKeyEntries = jsonSource.dict.filter(([k]) => !existingKeys.includes(k))
      if (newKeyEntries.length > 0) {
        const startRow = existingKeys.length + 2
        const endRow = existingKeys.length + 1 + newKeyEntries.length
        const keyRange = `${sheetName}!A${startRow}:A${endRow}`
        const newKeyRows = newKeyEntries.map(([k]) => [k])
        await GoogleSheetService.updateRange(gAuth, spreadsheet.spreadsheetId, keyRange, newKeyRows)
        newKeyEntries.forEach(([k]) => existingKeys.push(k))
      }

      const colLetter = GoogleSheetService.numberToColumn(colIndex)
      const colValues = [[jsonSource.language]]
      for (let r = 0; r < existingKeys.length; r++) {
        const key = existingKeys[r]
        const val = dictMap.has(key) ? dictMap.get(key) : ''
        colValues.push([val])
      }

      const range = `${sheetName}!${colLetter}1:${colLetter}${colValues.length}`
      console.log(`Writing ${jsonSource.language} to range: ${range}`)
      const response = await GoogleSheetService.updateRange(gAuth, spreadsheet.spreadsheetId, range, colValues)
      console.log(response)
    }
    return
  }

  const mergedSources = mergeLanguageSources(jsonSources)
  await writeToSpreadsheet(sheetId, sheetName, mergedSources)
}

function mergeLanguageSources(sources) {
  const headers = new Array(sources.length + 1)
  headers[0] = 'Key'
  for(let i = 0; i < sources.length; i++) {
    const language = sources[i].language
    headers[i+1] = language
  }
  console.log(headers)
  const values = []
  for(let i = 0; i < sources.length; i++) {
    const dict = sources[i].dict
    for(let j = 0; j < dict.length; j++) {
      const key = dict[j][0]
      const value = dict[j][1]
      let mapping = values.find(value => value[0] === key)
      if (!mapping) {
        mapping = new Array(headers.length)
        mapping[0] = key
        for(let k = 1; k < headers.length; k++) {
          mapping[k] = ''
        }
        values.push(mapping)
      }
      mapping[i+1] = value
    }
  }
  return [headers, ...values]
}

async function readFromSpreadsheet(sheetId, sheetName) {
  const credentials = FileSystem.readJsonFromFile(CREDENTIAL_PATH)
  if (!credentials) {
    return console.log('Credential for Google Cloud API not supplied')
  }
  const gAuth = await GoogleAuthentication.authorize(credentials)
  const spreadsheet = await GoogleSheetService.getSpreadsheet(gAuth, sheetId)
  const sheetMeta = spreadsheet.sheets.find(s => s.properties.title === sheetName)
  if (!sheetMeta) {
    return null
  }
  const { columnCount, rowCount } = sheetMeta.properties.gridProperties
  const properties = {
    columnCount,
    rowCount,
    title: sheetMeta.properties.title
  }
  const sheet = await GoogleSheetService.getSheet(gAuth, spreadsheet.spreadsheetId, properties)
  return sheet.values
}

async function writeToSpreadsheet(sheetId, sheetName, sources) {
  const credentials = FileSystem.readJsonFromFile(CREDENTIAL_PATH)
  if (!credentials) {
    return console.log('Credential for Google Cloud API not supplied')
  }
  const gAuth = await GoogleAuthentication.authorize(credentials)
  const spreadsheet = await GoogleSheetService.getSpreadsheet(gAuth, sheetId)
  const properties = {
    columnCount: sources[0].length,
    rowCount: sources.length,
    title: sheetName
  }
  const response = await GoogleSheetService.writeSheet(gAuth, spreadsheet.spreadsheetId, properties, sources)
  console.log(response)
}

/**
 * Read EN source module, auto-translate to target languages, and write all to spreadsheet.
 * @param {string} sourceModule - Path to EN module (e.g. '../import/en')
 * @param {string} sheetId - Google Spreadsheet ID
 * @param {string} sheetName - Sheet tab name
 * @param {string[]} targetLanguages - Array of language codes to translate to (e.g. ['VI', 'CN', 'JP'])
 */
export async function importAndTranslateModule(sourceModule, sheetId, sheetName, targetLanguages) {
  console.log(`Importing and translating to sheet: ${sheetName}`)

  // 1. Read EN source and flatten to key-value pairs
  const enDict = LanguageService.processLanguageModule(sourceModule)
  const keys = enDict.map(pair => pair[0])
  const enValues = enDict.map(pair => pair[1])
  console.log(`Found ${keys.length} keys`)

  // 2. Build headers: [Key, EN, ...targetLanguages]
  const headers = ['Key', 'EN', ...targetLanguages]

  // 3. Initialize rows with Key and EN values
  const rows = keys.map((key, i) => {
    const row = new Array(headers.length).fill('')
    row[0] = key
    row[1] = enValues[i]
    return row
  })

  // 4. Translate to each target language
  for (let langIdx = 0; langIdx < targetLanguages.length; langIdx++) {
    const lang = targetLanguages[langIdx]
    const colIdx = langIdx + 2 // offset for Key and EN columns

    console.log(`\nTranslating to ${lang}...`)
    const translations = await TranslateService.translateBatch(enValues, lang)

    for (let i = 0; i < translations.length; i++) {
      rows[i][colIdx] = translations[i]
    }
    console.log(' ✓')
  }

  // 5. Write all data to spreadsheet
  const sources = [headers, ...rows]
  console.log(`\nWriting ${sources.length} rows x ${headers.length} columns to sheet...`)
  await writeToSpreadsheet(sheetId, sheetName, sources)
  console.log('Done! All translations written to sheet.')
}

/**
 * Read all data from sheet and export each language column to a JS file in outputDir (default './export'),
 * following the format of import/en.js (const <lang> = { ... }; export default <lang>).
 * @param {string} sheetId - Google Spreadsheet ID
 * @param {string} sheetName - Sheet tab name (e.g. 'Sheet1')
 * @param {string} [outputDir='./export'] - Destination directory
 * @param {string[]} [languages] - Optional list of languages to export. If omitted, exports all languages found in sheet with values.
 */
export async function exportAllLanguagesFromSheet(sheetId, sheetName, outputDir = './export', languages = null) {
  console.log(`Exporting data from sheet: ${sheetName}`)
  const sheetData = await readFromSpreadsheet(sheetId, sheetName)
  if (!sheetData || sheetData.length === 0) {
    console.log('No data found in spreadsheet')
    return
  }

  const languageData = LanguageService.processLanguageSheet(sheetData)
  console.log(`Found ${languageData.length} language columns in sheet`)

  let exportedCount = 0
  for (let i = 0; i < languageData.length; i++) {
    const lang = languageData[i].language
    if (!lang) continue

    // If explicit language list provided, check if lang is in it
    if (languages && languages.length > 0) {
      const isIncluded = languages.some(l => l.toUpperCase() === lang.toUpperCase())
      if (!isIncluded) continue
    }

    // Skip columns that have no values
    if (languageData[i].valueCount === 0) {
      console.log(`Skipping ${lang} (0 values in sheet)`)
      continue
    }

    const fileName = `${lang.toLowerCase()}.js`
    const filePath = path.join(outputDir, fileName)
    const varName = lang.toLowerCase().replace(/[^a-zA-Z0-9_$]/g, '_')

    FileSystem.writeJsModuleToFile(filePath, languageData[i].value, varName)
    console.log(`✓ Exported ${languageData[i].valueCount} keys to ${filePath} (var: ${varName})`)
    exportedCount++
  }

  console.log(`\nDone! Exported ${exportedCount} language files to ${outputDir}`)
}

export const exportSheetToJs = exportAllLanguagesFromSheet

