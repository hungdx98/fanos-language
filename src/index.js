import { INSIGHT_SPREADSHEET_ID } from './Config'
import { importAppModule, importAndTranslateModule } from './Main'

const TARGET_LANGUAGES = ['VI'
  // ,'CN', 'JP', 'KO', 'RU', 'TH', 'TR', 'ES', 'FR', 'ID', 'PT'
  ]

// Import only EN to sheet
async function importEnToSheet() {
  await importAppModule(
    [
      '../import/en', 'EN'
    ],
    INSIGHT_SPREADSHEET_ID, 'Sheet1'
  )
}

// Translate EN to all languages and write to sheet
async function translateEnToSheet() {
  await importAndTranslateModule(
    '../import/en',
    INSIGHT_SPREADSHEET_ID,
    'Sheet1',
    TARGET_LANGUAGES
  )
}

async function main() {
  await translateEnToSheet()
}

main()
