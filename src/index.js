import { INSIGHT_SPREADSHEET_ID } from './Config'
import {
  importAppModule,
  importAndTranslateModule,
  exportAllLanguagesFromSheet
} from './Main'

const TARGET_LANGUAGES = [
  'VI'
  // , 'CN', 'JP', 'KO', 'RU', 'TH', 'TR', 'ES', 'FR', 'ID', 'PT'
]

// 1. Import only EN to sheet
async function importEnToSheet() {
  await importAppModule(
    [
      '../import/en', 'EN'
    ],
    INSIGHT_SPREADSHEET_ID,
    'Sheet1'
  )
}

// Import only VI to sheet
async function importViToSheet() {
  await importAppModule(
    [
      '../import/vi', 'VI'
    ],
    INSIGHT_SPREADSHEET_ID,
    'Sheet1'
  )
}

// 2. Translate EN to target languages and write to sheet
async function translateEnToSheet() {
  await importAndTranslateModule(
    '../import/en',
    INSIGHT_SPREADSHEET_ID,
    'Sheet1',
    TARGET_LANGUAGES
  )
}

// 3. Read all data from sheet and export each language to ./export/<lang>.js following import/en.js
async function exportSheetToFiles() {
  await exportAllLanguagesFromSheet(
    INSIGHT_SPREADSHEET_ID,
    'Sheet1',
    './export'
  )
}

async function main() {
  // await importViToSheet()
  // await importEnToSheet()
  await exportSheetToFiles()
  // await translateEnToSheet()
}

main()
