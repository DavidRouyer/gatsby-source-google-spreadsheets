import {
  GoogleSpreadsheetWorksheet, ServiceAccountCredentials,
} from 'google-spreadsheet';
import { cleanRows } from './fetchSheet/cleanRows';
import { getSpreadsheet } from './fetchSheet/get';
import { hash } from './fetchSheet/hash';

export default async (
  spreadsheetId: string,
  includedWorksheets: string[],
  credentials?: ServiceAccountCredentials,
  apiKey?: string,
) => {
  const spreadsheet = await getSpreadsheet(spreadsheetId, credentials, apiKey);
  const sheets: { [title: string]: object }[] = await Promise.all(
    spreadsheet.sheetsByIndex.filter(worksheet => includedWorksheets.includes(worksheet.title)).map(
      async (worksheet: GoogleSpreadsheetWorksheet) => {
        const rows = await worksheet.getRows();
        return {
          [worksheet.title]: cleanRows(rows).map((row, id) =>
            Object.assign(row, {
              id: hash(`${worksheet.sheetId}-${id}`),
            }),
          ),
        };
      },
    ),
  );
  return Object.assign({}, ...sheets, {
    id: hash(spreadsheetId),
  });
};
