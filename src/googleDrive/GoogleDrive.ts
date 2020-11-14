import { JWT } from 'google-auth-library';
import * as fs from 'fs';
import * as https from 'https';

const GOOGLE_AUTH_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
];

const AUTH_MODES = {
  JWT: 'JWT',
  API_KEY: 'API_KEY',
  RAW_ACCESS_TOKEN: 'RAW_ACCESS_TOKEN',
};

export class GoogleDrive {
  authMode: string;
  jwtClient: JWT;

  constructor() {
    this.authMode = null;
  }

  // creds should be an object obtained by loading the json file google gives you
  // impersonateAs is an email of any user in the G Suite domain
  // (only works if service account has domain-wide delegation enabled)
  async useServiceAccountAuth(creds, impersonateAs = null) {
    this.jwtClient = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: GOOGLE_AUTH_SCOPES,
      subject: impersonateAs,
    });
    await this.renewJwtAuth();
  }

  async renewJwtAuth() {
    this.authMode = AUTH_MODES.JWT;
    try {
      await this.jwtClient.authorize();
    } catch (e) {
      console.log(`Can't authorize : `, e);
    }
  }

  getBearerToken() {
    return `Bearer ${this.jwtClient.credentials.access_token}`;
  }

  getFile(fileId: string, filePath: string) {
    var file = fs.createWriteStream(filePath);
    try {
      https.get(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: this.getBearerToken(),
          },
        },
        response => {
          response.pipe(file);
        },
      );
    } catch (e) {
      console.log('getFile error : ', e);
    }
  }
}
