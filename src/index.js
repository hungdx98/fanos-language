import { INSIGHT_SPREADSHEET_ID, INSIGHT_SUPPORTED_LANGUAGES, TEST_SPREADSHEET_ID, WALLET_SPREADSHEET_ID, WALLET_SUPPORTED_LANGUAGES } from './Config'
import { exportAppJson, exportAppModule, importAppJson, importAppModule } from './Main'

async function main() {
  await exportAppModule(WALLET_SPREADSHEET_ID, 'Coin98Wallet', './dist/wallet/app/Translations{lang}.js', WALLET_SUPPORTED_LANGUAGES)
}

async function alt() {
  await importAppModule(
    [
      '../res/app/TranslationsEN', 'EN'
    ],
    TEST_SPREADSHEET_ID, 'App'
  )
  await importAppJson(
    [
      './res/server/en.json', 'EN'
    ],
    TEST_SPREADSHEET_ID, 'Server'
  )
  await importAppModule(
    [
      '../res/web/EN-web', 'EN'
    ],
    TEST_SPREADSHEET_ID, 'Web'
  )
}

main()
