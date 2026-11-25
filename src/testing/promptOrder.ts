import type { CatalogInput } from "@/domain";

/**
 * TEST/FIXTURE helper (TD-08). Catalogs built from core for tests add attributes without
 * an explicit prompt position; this places every unlisted attribute right after the listed
 * attribute that precedes it in (order, id) — i.e. where the pre-0.11.0 order-based output put
 * it — so fixture outputs stay identical. Product catalogs list every attribute explicitly.
 */
export const placeUnlistedByOrder = (c: CatalogInput): CatalogInput => {
  if (!c.promptOrder) return c;
  const groups = c.promptOrder.map((g) => ({ ...g, attributes: [...g.attributes] }));
  const listed = new Set(groups.flatMap((g) => g.attributes));
  const byOrder = [...c.attributes].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (let i = 0; i < byOrder.length; i++) {
    const a = byOrder[i]!;
    if (listed.has(a.id)) continue;
    let prev: string | undefined;
    for (let j = i - 1; j >= 0 && !prev; j--) if (listed.has(byOrder[j]!.id)) prev = byOrder[j]!.id;
    const g = prev ? groups.find((x) => x.attributes.includes(prev!))! : groups[0]!;
    g.attributes.splice(prev ? g.attributes.indexOf(prev) + 1 : 0, 0, a.id);
    listed.add(a.id);
  }
  c.promptOrder = groups;
  return c;
};
