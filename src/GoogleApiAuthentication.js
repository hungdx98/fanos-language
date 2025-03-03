import { google } from 'googleapis'
import readline from 'readline-promise'
import { GAPIS_TOKEN_PATH } from './Config'
import { GoogleSheetScopes } from './constants/GoogleServiceScopes'
import { FileSystem } from './FileSystem'

const SCOPES = [GoogleSheetScopes.READ_WRITE]; // If modifying these scopes, delete token.json.

export class GoogleAuthentication {
  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   * @param {Object} credentials The authorization client credentials.
   * @param {function} callback The callback to call with the authorized client.
   */
  static async authorize(credentials) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    const savedToken = FileSystem.readJsonFromFile(GAPIS_TOKEN_PATH)
    if (savedToken) {
      oAuth2Client.setCredentials(savedToken)
    }
    else {
      const newToken = await GoogleAuthentication.getNewToken(oAuth2Client, SCOPES)
      oAuth2Client.setCredentials(newToken)
    }

    return oAuth2Client;
  }

  /**
   * Get and store new token after prompting for user authorization, and then
   * execute the given callback with the authorized OAuth2 client.
   * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
   * @param {getEventsCallback} callback The callback for the authorized client.
   */
  static async getNewToken(oAuth2Client, scopes) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes
    });
    console.log('Authorize this app by visiting this url:', authUrl)
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    })
    const authCode = await rl.questionAsync('Enter the code from that page here: ')
    try {
      const getTokenResponse = await oAuth2Client.getToken(authCode)
      if (getTokenResponse.res.status === 200) {
        FileSystem.writJsonToFile(GAPIS_TOKEN_PATH, getTokenResponse.tokens)
        console.log('Token stored to', GAPIS_TOKEN_PATH)
      }
      return getTokenResponse.tokens
    }
    catch (err) {
      console.error('Error while trying to retrieve access token', err.toString())
    }
    return null
  }
}
