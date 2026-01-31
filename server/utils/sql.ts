export function buildValuesPlaceholders(rows: unknown[][], startIndex = 1) {
  const values: unknown[] = [];
  const placeholders = rows.map((row, rowIndex) => {
    const p = row.map(
      (_, colIndex) => `$${startIndex + rowIndex * row.length + colIndex}`,
    );
    values.push(...row);
    return `(${p.join(", ")})`;
  });
  return { placeholders: placeholders.join(", "), values };
}
