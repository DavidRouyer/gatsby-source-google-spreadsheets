import { GoogleSpreadsheet, ServiceAccountCredentials } from 'google-spreadsheet';

export async function getSpreadsheet(
  spreadsheetId: string,
  credentials?: ServiceAccountCredentials,
  apiKey?: string,
): Promise<GoogleSpreadsheet> {
  const doc = new GoogleSpreadsheet(spreadsheetId);
  if (credentials) {
    await doc.useServiceAccountAuth(credentials);
  } else if (apiKey) {
    doc.useApiKey(apiKey);
  } else {
    throw new Error(
      'Authentication not provided. Either provided google service account credentials or an APIKey',
    );
  }
  await doc.loadInfo();
  return doc;
}
