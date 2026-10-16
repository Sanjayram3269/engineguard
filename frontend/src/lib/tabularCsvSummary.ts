/**
 * TabularCsvSummary.ts
 *
 * Computes descriptive statistics and data preview from uploaded CSV telemetry
 * or manual 14-sensor inputs for Part 3 of the EnginePulse Master Specification.
 */

export interface ColumnStat {
  name: string;
  dataType: 'numeric' | 'string';
  count: number;
  missingCount: number;
  mean?: number;
  stdDev?: number;
  min?: number;
  max?: number;
  median?: number;
}

export interface TabularDataSummary {
  sourceType: 'csv' | 'manual';
  fileName?: string;
  totalRows: number;
  totalColumns: number;
  headers: string[];
  columns: ColumnStat[];
  previewRows: Record<string, string | number>[];
  totalMissingValues: number;
  isSingleObservation: boolean;
  manualRecord?: Record<string, number>;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
}

/**
 * Computes descriptive statistics from raw CSV text.
 */
export function summarizeTabularCsv(csvContent: string, fileName = 'telemetry.csv'): TabularDataSummary {
  const lines = csvContent.trim().split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length === 0) {
    return {
      sourceType: 'csv',
      fileName,
      totalRows: 0,
      totalColumns: 0,
      headers: [],
      columns: [],
      previewRows: [],
      totalMissingValues: 0,
      isSingleObservation: false,
    };
  }

  const rawHeaders = parseCsvLine(lines[0]);
  // Handle empty or duplicate headers cleanly
  const seenHeaders = new Set<string>();
  const headers = rawHeaders.map((h, idx) => {
    let name = h || `Column_${idx + 1}`;
    let counter = 1;
    while (seenHeaders.has(name)) {
      name = `${h || 'Column'}_${counter++}`;
    }
    seenHeaders.add(name);
    return name;
  });

  const rowLines = lines.slice(1);
  const totalRows = rowLines.length;

  const columnValues: { numeric: number[]; raw: string[]; missing: number }[] = headers.map(() => ({
    numeric: [],
    raw: [],
    missing: 0,
  }));

  const previewRows: Record<string, string | number>[] = [];

  for (let r = 0; r < rowLines.length; r++) {
    const parsedRow = parseCsvLine(rowLines[r]);
    const rowObj: Record<string, string | number> = {};

    for (let c = 0; c < headers.length; c++) {
      const valStr = parsedRow[c] !== undefined ? parsedRow[c].trim() : '';
      if (valStr === '' || valStr.toLowerCase() === 'nan' || valStr.toLowerCase() === 'null') {
        columnValues[c].missing++;
        columnValues[c].raw.push('');
        rowObj[headers[c]] = '—';
      } else {
        const num = parseFloat(valStr);
        if (Number.isFinite(num) && /^-?\d*(\.\d+)?$/.test(valStr)) {
          columnValues[c].numeric.push(num);
          columnValues[c].raw.push(valStr);
          rowObj[headers[c]] = num;
        } else {
          columnValues[c].raw.push(valStr);
          rowObj[headers[c]] = valStr;
        }
      }
    }

    if (r < 5) {
      previewRows.push(rowObj);
    }
  }

  let totalMissing = 0;

  const columns: ColumnStat[] = headers.map((name, idx) => {
    const colData = columnValues[idx];
    totalMissing += colData.missing;
    const isNumeric = colData.numeric.length > 0 && colData.numeric.length >= (totalRows - colData.missing) * 0.7;

    if (!isNumeric || colData.numeric.length === 0) {
      return {
        name,
        dataType: 'string',
        count: totalRows,
        missingCount: colData.missing,
      };
    }

    const nums = colData.numeric;
    const n = nums.length;
    const sum = nums.reduce((acc, v) => acc + v, 0);
    const mean = sum / n;

    // Variance & StdDev
    const variance = n > 1 ? nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1) : 0;
    const stdDev = Math.sqrt(variance);

    const min = Math.min(...nums);
    const max = Math.max(...nums);

    // Median
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(n / 2);
    const median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    return {
      name,
      dataType: 'numeric',
      count: totalRows,
      missingCount: colData.missing,
      mean,
      stdDev,
      min,
      max,
      median,
    };
  });

  return {
    sourceType: 'csv',
    fileName,
    totalRows,
    totalColumns: headers.length,
    headers,
    columns,
    previewRows,
    totalMissingValues: totalMissing,
    isSingleObservation: totalRows === 1,
  };
}

/**
 * Creates a truthful summary for a single-record manual telemetry input.
 * (Explicitly reports it as single observation, not averages).
 */
export function summarizeManualTabularData(data: Record<string, number>): TabularDataSummary {
  const headers = Object.keys(data);
  const columns: ColumnStat[] = headers.map(name => ({
    name,
    dataType: 'numeric',
    count: 1,
    missingCount: 0,
    mean: data[name],
    min: data[name],
    max: data[name],
    median: data[name],
    stdDev: 0,
  }));

  return {
    sourceType: 'manual',
    fileName: 'Manual 14-Sensor Input',
    totalRows: 1,
    totalColumns: headers.length,
    headers,
    columns,
    previewRows: [data],
    totalMissingValues: 0,
    isSingleObservation: true,
    manualRecord: data,
  };
}
