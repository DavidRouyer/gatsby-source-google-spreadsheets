import {
  GoogleSpreadsheetWorksheet,
  ServiceAccountCredentials,
} from 'google-spreadsheet';
import { cleanRows } from './fetchSheet/cleanRows';
import { getSpreadsheet } from './fetchSheet/get';
import { hash } from './fetchSheet/hash';

export type Dictionary<T> = { [key: string]: T };
interface WorksheetOption {
  limit: number;
}

export default async (
  spreadsheetId: string,
  includedWorksheets: string[],
  worksheetOptions?: Dictionary<WorksheetOption>,
  credentials?: ServiceAccountCredentials,
  apiKey?: string,
) => {
  const spreadsheet = await getSpreadsheet(spreadsheetId, credentials, apiKey);
  const sheets: { [title: string]: object }[] = await Promise.all(
    spreadsheet.sheetsByIndex
      .filter(worksheet => includedWorksheets.includes(worksheet.title))
      .map(async (worksheet: GoogleSpreadsheetWorksheet) => {
        const worksheetLimit = worksheetOptions?.[worksheet.title]?.limit;
        const rows = await worksheet.getRows(
          worksheetLimit !== null
            ? { limit: worksheetLimit, offset: 0 }
            : undefined,
        );
        return {
          [worksheet.title]: cleanRows(rows).map((row, id) =>
            Object.assign(row, {
              id: hash(`${worksheet.sheetId}-${id}`),
            }),
          ),
        };
      }),
  );
  return Object.assign({}, ...sheets, {
    id: hash(spreadsheetId),
  });
};
