import { escapeHtml } from './utils';

export type NameAttributeRow = { productTitle: string; value: string };

const escapeCsv = (field: string) => {
  if (/[",\n]/.test(field)) {
    return `"${field.replaceAll('"', '""')}"`;
  }
  return field;
};

export const buildNameAttributesCsv = (rows: NameAttributeRow[]) => {
  const lines = ['Product Title,Name'];
  for (const row of rows) {
    lines.push(`${escapeCsv(row.productTitle)},${escapeCsv(row.value)}`);
  }
  return lines.join('\r\n');
};

export const downloadCsv = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const buildNameAttributesDocument = (rows: NameAttributeRow[]) => `
  <!doctype html>
  <html>
    <head>
      <title>Name Attributes</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 24px; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 13px; }
        h1 { font-size: 16px; margin: 0 0 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #ddd; overflow-wrap: anywhere; }
        th { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #555; border-bottom: 2px solid #111; }
        @media print { @page { margin: 16mm; } }
      </style>
    </head>
    <body>
      <h1>Name Attributes (${rows.length})</h1>
      <table>
        <thead>
          <tr><th>Product Title</th><th>Name</th></tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr><td>${escapeHtml(row.productTitle)}</td><td>${escapeHtml(row.value)}</td></tr>`).join('')}
        </tbody>
      </table>
    </body>
  </html>
`;
