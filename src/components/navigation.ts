"use client";

import { createContext, type RefObject } from "react";

/**
 * “Go to this attribute” (Sprint 2-C.3): opens the attribute in the Detailed editor (switching from
 * Basic if needed) and focuses it. Used by notices that point to related settings — e.g. the age
 * settings a withheld sexual-appeal expression needs. It only navigates; it never sets a value.
 */
export const GoToAttribute = createContext<((attributeId: string) => void) | null>(null);

/** The mounted Detailed editor's own navigation (category + attribute), registered by the editor. */
export type DetailedNavigator = RefObject<((categoryId: string, attributeId?: string) => void) | null>;
