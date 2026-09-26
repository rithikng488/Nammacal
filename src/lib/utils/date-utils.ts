/**
 * Normalizes a date or date string into YYYY-MM-DD format.
 */
export function normalizeDateString(dateInput: Date | string): string {
  if (typeof dateInput === "string") {
    const match = dateInput.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
