import { coreCatalog } from "./catalogs/core";
import { CatalogRegistry } from "./registry";

let cached: CatalogRegistry | undefined;

/** The bundled core catalog registry (validated once, then cached). */
export const getCoreRegistry = (): CatalogRegistry => (cached ??= CatalogRegistry.createOrThrow(coreCatalog));

export { CatalogRegistry } from "./registry";
export { coreCatalog } from "./catalogs/core";
export * from "./schema";
export { evaluateCondition, evaluateAll } from "./conditions";
