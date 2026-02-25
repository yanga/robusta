import Papa from "papaparse";
import * as XLSX from "xlsx";
import { readFile, stat } from "fs/promises";
import type { ColumnInfo, ColumnType, SessionSchema } from "@datachat/shared-types";

function inferType(values: unknown[]): ColumnType {
  const sample = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (sample.length === 0) return "string";

  let numCount = 0;
  let boolCount = 0;
  let dateCount = 0;

  for (const val of sample.slice(0, 100)) {
    const str = String(val).trim();
    if (str === "true" || str === "false") {
      boolCount++;
    } else if (!isNaN(Number(str)) && str !== "") {
      numCount++;
    } else if (!isNaN(Date.parse(str)) && str.length > 4) {
      dateCount++;
    }
  }

  const threshold = sample.slice(0, 100).length * 0.7;
  if (numCount >= threshold) return "number";
  if (boolCount >= threshold) return "boolean";
  if (dateCount >= threshold) return "date";
  return "string";
}

function buildSchema(
  filename: string,
  data: Record<string, unknown>[]
): SessionSchema {
  if (data.length === 0) {
    return { filename, rowCount: 0, columns: [] };
  }

  const columnNames = Object.keys(data[0]);
  const columns: ColumnInfo[] = columnNames.map((name) => {
    const values = data.map((row) => row[name]);
    const type = inferType(values);
    const samples = values
      .filter((v) => v !== null && v !== undefined && v !== "")
      .slice(0, 5)
      .map(String);
    return { name, type, samples };
  });

  return { filename, rowCount: data.length, columns };
}

export async function parseFile(
  filepath: string,
  originalName: string
): Promise<{ data: Record<string, unknown>[]; schema: SessionSchema }> {
  const ext = originalName.toLowerCase().split(".").pop();

  // Check file exists and is not empty
  const fileStat = await stat(filepath).catch(() => null);
  if (!fileStat || fileStat.size === 0) {
    throw new Error("File is empty or could not be read");
  }

  if (ext === "csv") {
    let content: string;
    try {
      content = await readFile(filepath, "utf-8");
    } catch {
      throw new Error("Could not read the uploaded file");
    }

    // Check for non-text / binary content
    const nonPrintable = content.slice(0, 1000).replace(/[\r\n\t]/g, "");
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x08\x0E-\x1F]/.test(nonPrintable)) {
      throw new Error("File appears to be corrupted or is not a valid CSV");
    }

    const trimmed = content.trim();
    if (trimmed.length === 0) {
      throw new Error("CSV file is empty");
    }

    // Must have at least a header row
    const lines = trimmed.split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error("CSV file must contain a header row and at least one data row");
    }

    const result = Papa.parse<Record<string, unknown>>(content, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    // Check for critical parse errors
    const criticalErrors = result.errors.filter(
      (e) => e.type === "Delimiter" || e.type === "FieldMismatch"
    );

    if (result.data.length === 0) {
      const errorMsg = result.errors.length > 0
        ? result.errors[0].message
        : "No data rows found";
      throw new Error(`Failed to parse CSV: ${errorMsg}`);
    }

    if (criticalErrors.length > result.data.length * 0.5) {
      throw new Error(
        "CSV file appears to be malformed — too many rows have inconsistent column counts"
      );
    }

    // Validate columns
    const columns = Object.keys(result.data[0]);
    if (columns.length === 0) {
      throw new Error("CSV file has no columns");
    }

    if (columns.length === 1 && columns[0] === "") {
      throw new Error("CSV file could not be parsed — check the delimiter and formatting");
    }

    const schema = buildSchema(originalName, result.data);
    return { data: result.data, schema };
  }

  if (ext === "xlsx" || ext === "xls") {
    let buffer: Buffer;
    try {
      buffer = await readFile(filepath);
    } catch {
      throw new Error("Could not read the uploaded file");
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: "buffer" });
    } catch {
      throw new Error("File is corrupted or is not a valid Excel file");
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("Excel file contains no sheets");
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error("Excel sheet is empty");
    }

    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (data.length === 0) {
      throw new Error("Excel sheet contains no data rows");
    }

    const columns = Object.keys(data[0]);
    if (columns.length === 0) {
      throw new Error("Excel sheet has no columns");
    }

    const schema = buildSchema(originalName, data);
    return { data, schema };
  }

  throw new Error(`Unsupported file type: .${ext}`);
}
