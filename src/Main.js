import { CREDENTIAL_PATH } from './Config'
import { FileSystem } from './FileSystem'
import { GoogleAuthentication } from './GoogleApiAuthentication'
import { GoogleSheetService } from './GoogleSheetService'
import { LanguageService } from './LanguageService'

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
      FileSystem.writeJsModuleToFile(mapping.destination, languageData[i].value)
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
