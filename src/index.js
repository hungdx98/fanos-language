import { INSIGHT_SPREADSHEET_ID, WALLET_SPREADSHEET_ID } from './Config'
import { importAppModule } from './Main'

async function importEnToSheet() {
  await importAppModule(
    [
      '../import/en', 'EN'
    ],
    INSIGHT_SPREADSHEET_ID, 'Sheet1'
  )
}

async function main() {
  await importEnToSheet()
}

main()
