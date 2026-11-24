import {
  applySelection,
  clearSelection,
  createEmptySpec,
  type CatalogRegistry,
  type ImageSpec,
  type SelectionValue,
} from "@/domain";

export type WorkspaceAction =
  | { type: "set"; attributeId: string; value: SelectionValue }
  | { type: "clear"; attributeId: string }
  | { type: "reset" }
  | { type: "replace"; spec: ImageSpec };

/**
 * Thin UI reducer over pure domain operations. Invalid actions leave the
 * spec untouched (the UI only offers valid values).
 */
export const createWorkspaceReducer =
  (registry: CatalogRegistry) =>
  (spec: ImageSpec, action: WorkspaceAction): ImageSpec => {
    switch (action.type) {
      case "set": {
        const result = applySelection(spec, registry, action.attributeId, action.value, "user");
        return result.ok ? result.value : spec;
      }
      case "clear":
        return clearSelection(spec, action.attributeId);
      case "reset":
        return createEmptySpec(registry);
      case "replace":
        return action.spec;
    }
  };
