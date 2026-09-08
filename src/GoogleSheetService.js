import { google } from 'googleapis'

export class GoogleSheetService {

  static async getSpreadsheet(gAuth, spreadsheetId) {
    const gSheet = google.sheets({ version: 'v4', auth: gAuth });
    const response = await gSheet.spreadsheets.get({
      spreadsheetId
    })
    return response.data
  }

  static async getSheet(gAuth, spreadsheetId, sheetProperties) {
    const gSheet = google.sheets({ version: 'v4', auth: gAuth });
    const { columnCount, rowCount, title } = sheetProperties
    const range = GoogleSheetService.buildRange(title, rowCount, columnCount)
    const response = await gSheet.spreadsheets.values.get({
      spreadsheetId,
      range
    })
    return response.data
  }

  static buildRange(sheetTitle, rowCount, columnCount) {
    const columnName = numberToColumn(columnCount)
    return `${sheetTitle}!A1:${columnName}${rowCount}`
  }

  static async writeSheet(gAuth, spreadsheetId, sheetProperties, values) {
    const gSheet = google.sheets({ version: 'v4', auth: gAuth });
    const { columnCount, rowCount, title } = sheetProperties
    const range = GoogleSheetService.buildRange(title, rowCount, columnCount)
    const response = await gSheet.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values
      }
    })
    return response.data
  }
}

function numberToColumn(number) {
  let letters = ''
  while (number >= 0) {
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[number % 26] + letters
    number = Math.floor(number / 26) - 1
  }
  return letters
}
