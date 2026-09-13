/**
 * Registration helpers shared by the registration form and its tests.
 *
 * Kept in a component-free module so it can be imported without pulling in React
 * (satisfies react-refresh's "only export components" rule).
 */

/**
 * Split a comma/newline-separated string into cleaned, de-duplicated supply
 * categories. The backend `VendorRegistrationRequest.supply_categories` is a
 * non-empty `list[str]` (each entry 2–255 chars), so the UI's single text field
 * is normalised into that list shape here.
 */
export function parseSupplyCategories(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,\n]/)) {
    const item = part.trim();
    if (item.length === 0 || seen.has(item.toLowerCase())) continue;
    seen.add(item.toLowerCase());
    out.push(item);
  }
  return out;
}
