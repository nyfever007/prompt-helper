# Prompter — Catalog Design Standard

- Version: 0.3.0
- Status: Agreed design baseline; implementation changes require approval
- Parent specification: `PROMPTER_MASTER_PLAN.md`
- Applies to: Basic, Detailed, Precision and subsequent catalog extensions
- Implementation baseline: `49be933` (reported Sprint 2-A closure); first implemented by Sprint 2-B.1 (Person › Identity)
- Decision record: `docs/SPRINT_2B1_SPEC_REVIEW.md` (D0–D14, N1–N5, Q1–Q3)

## 1. Purpose

A catalog is a versioned visual vocabulary, not merely a list of prompt fragments. It must allow creators to express their intent without imposing arbitrary limits or unrequested visual assumptions. Progressive disclosure manages UI complexity independently from expressive depth.

## 2. Attribute contract

Every attribute definition documents:

| Field | Meaning |
|---|---|
| Stable ID | Persistent identity independent of display name |
| Domain / category / subcategory | Detailed navigation and grouping |
| Labels / descriptions / aliases | Korean and English names, definitions and searchable terms |
| Value type / control | Data representation and independent UI presentation |
| Semantic kind | Categorical, relative, interpretive; numeric semantics if relevant |
| Expression role | Direct, Context or Metadata (`expression.role`; semantic kind in `expression.kind`) |
| Options | Stable IDs, labels, definitions, English expressions, aliases |
| Applicability | Subject and other explicit conditions |
| Rules | Dependencies, conflicts, safety restrictions and actionable diagnostics |
| Visual examples | Asset metadata, comparison controls, provenance and rights |
| Tier / status | Basic, Detailed, Precision; draft or approved |
| Version / order | Migration and display management. `order` is the UI order only; the prompt output position is the catalog `promptOrder` (0.3.0, TD-08) |
| Suggested default | Optional suggestion, never an implicit selection |

## 3. Independence and semantic axes

Physical characteristics, visual impression, and presentation are independent. Nationality or ethnicity must not automatically set facial anatomy, skin tone, hair, clothing or cultural props. Occupation and narrative role do not automatically set wardrobe or expression. Changing one attribute must not silently alter another. Inapplicable values are preserved but not compiled, with a visible explanation. Conflicts do not silently rewrite the specification.

## 4. Selection and output states

- Unset: no selection; no output.
- Selected: explicit selection eligible for compilation.
- Excluded from prompt: selected value remains in the canonical ImageSpec but is not compiled.

These are distinct from applicability, safety restrictions and proposed defaults. Exclusion does not disable safety validation. Metadata never emits prompt text. Context selections must offer explicit inclusion/exclusion. Recommended default for new Context selections: included, with a visible toggle; this default concerns output only, not selection of a value, and requires approval. Direct selections may also be excluded. Existing selections must retain their prior compilation behavior after migration.

Representation (decided, D3): `AttributeSelection.excludedFromPrompt: true` inside the one canonical ImageSpec (absent = included; ImageSpec 0.3.0). It is a generic domain capability available to every attribute; a catalog opts an attribute into the UI toggle with `outputToggle`. Changing the value keeps the flag; clearing the selection removes it. Metadata is an expression role, not a selection state.

## 5. Expression roles and semantic kinds

| Role | Meaning | Example |
|---|---|---|
| Direct | Specifies what is visibly depicted | eye color, apparent age |
| Context | Supplies interpretation or story context | occupation, nationality |
| Metadata | Management only | internal character ID |

| Kind | Meaning | Evaluation |
|---|---|---|
| Categorical | Named feature or category | presence / correct category |
| Relative | Degree or proportion | ordinal or relative adherence |
| Interpretive | Qualitative visual impression | human judgment, comparison |

Relative numeric controls may use catalog-defined bands; physical units and meaningful ratios may retain numbers. Preserve original numeric values losslessly. Display-only slider defaults never create selections. Do not claim physical accuracy from prompt wording alone.

## 6. Custom options

Allow custom values wherever a closed vocabulary would constrain legitimate expression. Separate display label from visual description / English prompt expression. Preserve original language and text; do not silently translate. A name alone does not justify invented visual features. For unknown fictional terms, show a warning when no visual description is supplied. Custom values must undergo the same schema, applicability and safety checks as registered options. No arbitrary cap on vocabulary size.

Decided (D4): a custom value is a `CustomEntry { label (≤ 200), expression? (≤ 2,000) }` stored inside the selection value — single `{ kind: "single", custom }`, multi `{ kind: "multi", optionIds, custom[] }` (registered and custom values mix, no count limit). There is no fixed “custom” option id. Name and expression are edited independently and kept verbatim. Output: expression if present, otherwise the name verbatim. Duplicates are detected by normalized name within one value only; a custom value is never merged with or replaced by a registered option of the same or similar name (a notice may point to it). Attributes opt in with `custom`; `nameOnlyNotice` marks Direct roles that ask for a visual description. Safety checks read both name and expression.

## 7. UI and search

Use cards for visually meaningful comparisons; search for large vocabularies; multi-select only for genuinely combinable values; numeric controls for meaningful numeric dimensions. Support Korean/English labels and aliases, keyboard accessibility, explicit unset, attribute reset and category reset. Confirm destructive resets and preserve recovery behavior. Category reset (N5) targets every stored selection of the category subtree — independent of search, filters, visibility, output exclusion, applicability or mode exposure — lists the targets and count before confirmation, and can be undone (each value returns only if still unset; other categories and later unrelated edits are never changed). Keep selected values visible in filtered lists. Draft options must not appear as approved product features. Do not require visual examples for abstract narrative metadata.

## 8. Prompt compilation and provenance

Compile only explicit eligible selections. Keep the source ImageSpec independent of prompt prose. Preserve deterministic compilation, fragment provenance and version metadata. Deduplicate equivalent semantics; direct choices override preset-derived values on the same semantic axis. Retain independent axes and diagnose genuine contradictions. Distinguish (D10): semantic duplicates (`covers` — output once with provenance), same-axis overrides (direct > preset), independent axes (all output), genuine conflicts (rule diagnostics, nothing rewritten) and atypical but valid creative combinations (non-blocking notice only). Conditional wording (`prompt.variants`) may depend on derived facts such as the age assessment; the stored selection never changes. Do not use arbitrary string deletion as the semantic mechanism. **Output order (0.3.0, TD-08):** the catalog `promptOrder` lists output groups and, inside each, attribute ids in output order; every attribute appears exactly once (integrity error otherwise). It is independent of the UI `order`, categories and subcategories: a new attribute is placed by inserting its id where its sentence belongs, without renumbering anything. **Conflict classes (0.3.0, TD-10):** a `conflict` rule states its `basis` — `contradiction` (opposite meanings, warning) or `convention` (unusual against common practice but legitimate, info). Physical realism or photographic convention is never enforced; fantasy and stylization stay possible. Choice ↔ slider rules use `numberIn` and hold only for a slider value the user set (no inference). Never infer a visual stereotype from context. Preserve free text verbatim and show mixed-language notices when applicable. Provider limitations must be disclosed rather than silently changing intent.

## 9. Presets and reset

Presets are explicit partial patches. Preview additions, changes, unchanged values, inapplicable/restricted patches and expected conflicts. Require confirmation before overwriting explicit values. Preserve unrelated selections and record preset provenance. Undo restores only affected values not subsequently edited by the user, even if the edited value later equals the preset value. Current session-level undo remains the baseline. **Category reset history (0.3.0, TD-09):** the most recent category resets of the session (up to 5) can each be restored independently; a restore brings back only that reset's values whose attribute is still unset and was not changed after the reset (a later edit — including clearing — wins); stored values come back exactly (exclusion, custom entries, preset origin, inactive values) and remain subject to the safety policy. User-defined permanent presets and extended history remain future work.

## 10. Visual example production (TD-03)

1. Define the exact attribute or option being compared and the visible feature to assess.
2. Hold subject identity, framing, lighting, medium, background and other relevant variables constant where practical. For attributes such as age or species that necessarily change identity-related appearance, use a controlled base design and document the unavoidable differences.
3. Choose framing in which the attribute can actually be seen. Avoid unrelated styling, expressions or demographic stereotypes.
4. Record asset ID, catalog/option ID and version, source, rights, generation method, prompt/spec, model/version and settings where available, review status, and limitations.
5. Review against a checklist: target feature visible; no misleading changes; consistent presentation; policy compliance; rights documented.
6. Mark absent or failed assets honestly. Do not substitute unrelated stock imagery as a controlled comparison.
7. Do not claim a visual example proves general model adherence. Live empirical validation belongs to Sprint 5.

## 11. Safety

Retain the approved local safety policy and apply restrictions consistently across UI, imported specifications, validation and all prompt output paths. Preserve original JSON according to the existing data policy. Age-related checks consider both actual and apparent age, including ambiguous or conflicting values; omission from prompt does not bypass restrictions. Values excluded from the prompt or currently inapplicable, custom names and expressions are all checked, and diagnostics name such hidden sources. A structured age assessment (normalized units; minor / ambiguous / adult / unknown; minor never offset; adulthood inferred from actual age only when the being is classified human — see `docs/catalogs/person/identity.md` §6.4) feeds the policy as structured signals. Normal non-explicit adult appearance and fashion remain supported. **Policy 0.3.0 (Sprint 2-C.3, `docs/SAFETY_POLICY.md`):** unknown age is not adult — sexual-appeal wording requires a structured adult age (otherwise output is withheld with a pointer to the age settings); intimate apparel is a garment classification (`garment.intimate`), never sexual appeal by itself, and is blocked with a minor or ambiguous age for every intimate garment alike; registered options use structured tags so that equivalent wording gets the same result. Document limitations of local keyword-based checks. Provider-specific policy and contextual review are deferred to Sprint 5; do not relax existing restrictions in catalog implementation.

## 12. Versioning and quality gates

Stable IDs must not change merely because labels change. Use explicit migrations for renamed IDs; preserve original data and report unknown or unrecoverable fields. Require schema, round-trip, independence, unset, exclusion, custom option, search, conflict, safety and regression tests as applicable. Use controlled real image evaluations later; distinguish prompt correctness from image fidelity.

Workflow: draft → product review → approved catalog specification → implementation review → implementation → tests → acceptance. No unapproved product options. Record changes and open questions in each catalog.

## 13. Deferred feature: attribute locking (Sprint 3)

A lock protects selected specification values against presets, bulk reset and future AI refinement. It is not a guarantee of generated-image identity. Exact lock granularity, persistence, explicit unlock/edit behavior and interactions with imports/undo will be designed in Sprint 3. No implementation in Sprint 2-B unless separately approved.

## 14. Change log

- 0.3.0 (2026-11-25, Sprint 2-C.2): explicit prompt output order separate from UI order (TD-08); category reset history (TD-09); contradiction / convention conflict classes and slider conditions (TD-10).
- 0.2.0 (2026-11-24, Sprint 2-B.1 approval): output inclusion default (included) and representation decided; expression role fields; custom value schema and rules; category reset scope; semantic relation classes and conditional wording; safety over non-output values and structured age assessment.
- 0.1.0: Consolidated agreed catalog principles, output exclusion, custom values, visual examples, and future locking. Output default and technical representation remain review items.
