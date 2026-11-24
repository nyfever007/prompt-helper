# Prompter — Product & Engineering Master Plan

- Version: 0.2 (0.1 initial working specification; 0.2 — 2026-11-25, Roadmap Update & Sprint 2-C.1 directive: visual image-design direction, Sprint 2-C split, new Sprint 2-D)
- Status: Proposed architecture; product direction agreed, technical choices pending validation
- Project: **Prompter** (independent of WHY; do not modify WHY)
- Purpose: Help creators translate a precisely imagined image into an explicit, reusable, testable image specification and model-adapted prompt.

## 1. Product philosophy

**Depth is a feature, not a defect.** A creator may spend an hour specifying one image. Never arbitrarily cap detail to simplify the interface. Instead, use progressive disclosure: Basic → Detailed → Precision.

1. User intent wins. Do not invent anatomy, sexualization, exposure, ethnicity, clothing, or other unselected attributes.
2. All optional attributes have an explicit `unset` state. Distinguish `unset` from a chosen neutral/default value.
3. Basic, Detailed, and Precision are views of **one canonical specification**, not three separate prompt systems.
4. Users can mix structured selections, numeric adjustments, visual examples, free text, and references.
5. Show conflicts, dependencies, and model limitations without silently rewriting intent.
6. A detailed prompt does not guarantee the model will comply. Measure outcomes.
7. Prioritize safety: non-explicit adult fashion and body characteristics may be specified; disallow explicit sexual content and sexualization of minors. Enforce the image provider's applicable policy too.
8. Keep prompts and specifications editable, exportable, versioned, and reproducible.

## 2. Scope and product boundaries

**In scope:** image prompt composition; structured image specification; presets; reference-image metadata; preview/copy/export; optional image-generation API integration; result review and comparison.

**Not initially in scope:** video generation, model training, autonomous WHY research engine, marketplace, billing, collaborative editing.

Target users: individual image creators, designers, illustrators, character designers, game asset makers, marketing creators. Primary workflow: precise one-image design; later workflows: character sheets, turnarounds, architectural elevations, asset sets.

## 3. Progressive interaction model

### Basic mode (initial proposal, validate with users)
- Subject / scene type: person, multiple people, animal, object/product, vehicle, architecture, landscape, abstract.
- Free-text intent: what should be pictured, in natural language.
- Visual style preset: photography, illustration, animation, 3D, traditional art, etc.; searchable catalog rather than a closed 4-item list.
- Framing / composition: portrait, upper body, full body, wide scene, etc., context-aware.
- Setting / background.
- Output aspect ratio.
- Optional mood/lighting quick presets.
- Live prompt preview and copy.

Do not require all fields. Avoid auto-inserting attractive/sexy anatomy, revealing clothing, a particular nationality, etc.

### Detailed mode
Domain-aware sections. A person has face, skin, body, hair, expression, clothes, pose, etc.; a landscape has terrain, vegetation, geography, weather; architecture has structure, materials, elevation/projection. Shared sections include style, camera, lighting, palette, output and constraints.

### Recommended, Visual and Detailed editing (direction added in 0.2)
Prompter grows from a text-based prompt designer into a **visual image design tool**: a user should be able to design the image they want without knowing professional appearance, camera or lighting terms. Three editing directions are added; all of them edit the **same ImageSpec** (principle 3):
- **Recommended Mode** — concept-based recommended settings (hand-designed recommendation presets first, no AI).
- **Visual Mode** — choosing by sketches and visual examples (line art, SVG, silhouettes, diagrams).
- **Detailed Mode** — the existing detailed attribute editing.

The existing Basic Editor and Detailed Editor stay. The final screen structure of Visual and Recommended modes is decided in Sprint 2-D. Design principles: [docs/VISUAL_EDITOR_PRINCIPLES.md](docs/VISUAL_EDITOR_PRINCIPLES.md) (summary in §8).

### Precision mode
Sub-part attributes, exact positions and counts (e.g. one beauty mark under the left eye), emphasis/priority, negative constraints, per-region specifications, reference-image roles, technical camera cues, repeatability/seed when supported, model-specific limitations, and overrides.

**Precision note:** numeric strengths are UI priorities, not physically calibrated model controls unless a provider explicitly supports them.

## 4. Extensible image-spec taxonomy (initial registry)

Treat these as orthogonal axes, not one giant exclusive dropdown.

| Domain | Subdomains / examples |
|---|---|
| Subject | person, group, animal, flora, architecture, product, vehicle, environment, abstract |
| Person identity/background | adult age range, gender presentation, nationality/cultural setting (optional; not an automatic facial phenotype), user-defined features |
| Face | proportions, silhouette, forehead, cheeks, jaw, chin, eyes, eyelids, lashes, brows, nose, lips, ears, teeth, gaze |
| Skin | tone, undertone, texture, pores, gloss, freckles, moles (count/position/size), scars, wrinkles, blush, localized features |
| Body | height impression, silhouette, shoulders, chest/bust, waist, hips, glutes, arms, legs, muscularity, proportions, natural/stylized anatomy |
| Hair & grooming | length, cut, texture, part, volume, color, styling, makeup, nails |
| Expression & appeal | cute, elegant, aloof, confident, sensual/non-explicit, playful, etc.; independent from anatomy and clothing coverage |
| Wardrobe | garment types, neckline, coverage by body region, fit, layers, fabric, color, accessories; exposure separate from tightness |
| Pose & action | stance, body orientation, hands, fingers, gesture, movement, eye line, interactions |
| Camera & composition | shot size, crop, view (front/side/back/3/4), angle, elevation, distance, lens cues, depth of field, perspective, orthographic/isometric |
| Environment | indoor/outdoor, place, era, geography, landscape, terrain, architecture, props, season, weather, time of day |
| Light & color | source, direction, hardness, intensity, temperature, contrast, palette, grading, saturation |
| Realism | photographic, semi-realistic, stylized; anatomy realism, material realism, texture realism, shape abstraction independently |
| Medium | photograph, film, digital painting, oil, watercolor, ink wash, pencil, printmaking, pixel, vector, 3D, clay, etc. |
| Technique | cel shading, PBR/NPR, low-poly, voxel, brushwork, halftone, film grain, canvas texture, etc. |
| Art movement | impressionism, expressionism, surrealism, art nouveau, art deco, pop art, etc. |
| Aesthetic/genre | cyberpunk, solarpunk, dark fantasy, Y2K, cottagecore, editorial, documentary, etc. |
| Production intent | cover, advertisement, character sheet, turnaround, game asset, architectural visualization, concept art |
| Output | aspect ratio, background transparency, subject margins, negative space, text policy, format/provider limits |
| Reference & constraints | reference roles, preserve/change directives, excluded elements, priority, per-region constraints |

This is **a starting registry, not an exhaustive list**. Expand each category through separate versioned catalogs, examples, aliases, and quality tests. Avoid conflating camera projection with art style or nationality with physical appearance.

## 5. Canonical data architecture

Store structured state independent of prompt prose. Recommended conceptual entities:

- `Project`: owner, title, timestamps, selected target model.
- `ImageSpec`: versioned JSON, subject type, global settings, subject instances, scene, style axes, camera, output, constraints.
- `AttributeDefinition`: stable ID, domain, type (enum/multi-select/number/text/position/reference), labels, examples, validation, applicability, conflict rules.
- `AttributeSelection`: path, explicit value, source (user/preset/import), priority, whether explicitly selected.
- `Preset`: partial spec patch, version, provenance; applying a preset must show which fields it changes.
- `PromptCompilation`: spec version, adapter, generated positive prompt, exclusion instructions, warnings, compiler version.
- `GenerationRun`: provider/model/version, input prompt/spec hash, settings, cost estimate/actual if available, status, output asset IDs.
- `Evaluation`: human ratings and checks against specified constraints.

Suggested spec excerpt (illustrative, not final schema):

```json
{
  "schemaVersion": "0.1.0",
  "subject": { "kind": "person", "ageGroup": "adult" },
  "person": {
    "body": { "bust": { "state": "set", "value": "small" } },
    "skin": { "moles": [{ "count": 1, "region": "below_left_eye", "size": "small" }] },
    "presentation": { "mood": ["confident", "aloof"] },
    "wardrobe": { "coverage": { "state": "unset" } }
  },
  "camera": { "framing": "full_body", "view": "three_quarter" },
  "style": { "medium": "photography", "realism": "photorealistic" },
  "constraints": { "preserve": [], "exclude": ["unrequested_anatomical_exaggeration"] }
}
```

**Important:** the explicit `exclude` in this example is a user-selectable or product-level anti-exaggeration rule; it should not accidentally prohibit a user-requested body shape. Validate how each provider interprets negative wording.

## 6. Prompt compiler

Pipeline: input → normalized ImageSpec → validate → conflict/dependency diagnostics → semantic plan → target-model adapter → final prompt → preview/export.

- Deterministic compilation for a given spec and compiler version.
- Do not add unselected appearance details; only include sensible, transparent structural language where required.
- Preserve exact counts, locations, reference roles, and priorities where possible.
- Explain unsupported provider-specific controls rather than pretending they work.
- Allow manual text override and retain structured spec.
- Support copy, JSON export/import, prompt export, and change history.
- Initial adapter: generic image prompt. Add OpenAI-specific adapter after API validation; other adapters later.

## 7. Conflict and dependency examples

- Face close-up + full-body visibility: conflicting framing.
- Pure front elevation + visible roof top: conflicting projection.
- Strict orthographic + strong wide-angle distortion: conflicting projection/lens cues.
- A single visible beauty mark on a tiny full-body face: detail visibility warning, not an error.
- Sensual mood + conservative wardrobe: valid combination; never auto-increase exposure.
- Slim body + large bust: valid combination; do not link body measurements implicitly.
- Nationality + physical features: no forced mapping.
- Style tags from distinct axes: usually compatible, but inspect concrete rendering instructions.

Warnings must be actionable: show conflicting fields and let the user choose a resolution.

## 8. Reference-image UX (later milestone)

Reference roles: identity, face, outfit, pose, composition, color palette, style, background, object design. A reference can have a role and an importance level. Avoid assuming that an identity reference is also a pose template. Uploaded media requires permission-aware storage and deletion. Do not promise exact character consistency across generations without validation.

Visual option examples should use controlled comparisons: same subject, framing and lighting, changing only the intended attribute when practical. Track catalog provenance, rights, and version.

### Visual selection and recommendation principles (Sprint 2-D, added in 0.2)
Full text: [docs/VISUAL_EDITOR_PRINCIPLES.md](docs/VISUAL_EDITOR_PRINCIPLES.md). In short:
- Visual examples explain the difference between options; photorealistic images are not a requirement — simple line art, SVG, silhouettes and diagrams come first.
- Within one attribute, the reference figure/object, viewpoint, size, scale, composition, background, line weight and style are kept identical; only the attribute being explained changes. Examples never rank beauty or worth. Placeholder images that do not match the catalog meaning are never shipped as finished examples.
- Relative sliders (eye size, eye spacing, brow thickness, nose length, lip thickness, face width, body proportions …) may get dynamic SVG previews instead of many images.
- A combined face sketch (face shape, eyes, brows, nose, lips) explains the user's settings; it never claims to predict or reproduce a model's output. Preview-only renderings of unset attributes are never stored in the ImageSpec or added to the prompt. Attributes that cannot be drawn stay editable as text.
- Recommendations start as hand-designed presets (no AI) on the existing preset system with provenance and undo. Choosing a recommendation never overwrites existing settings by itself: the values to apply and the changes are shown first; explicit user choices are never removed or changed silently; recommendations do not infer age, gender, nationality, skin color, body features or sexual expression.

## 9. API integration and testing

Integrate image-generation APIs **after** the prompt engine works locally; use an adapter boundary from day one.

### Provider architecture
- Server-side API key only; never expose secrets in browser/client logs.
- `ImageProvider` interface: capabilities, validate request, generate, estimate/report cost if available, normalize results.
- Start with an OpenAI image-generation adapter. Check current official model names, endpoint requirements, image-input format, sizes, supported controls, pricing, rate limits, content rules, and retention **at integration time**; do not hardcode assumed availability.
- Async job status, retries with bounded backoff, timeout, idempotency where supported, failure diagnostics.
- Daily/monthly spend caps and explicit approval before paid calls; cost ledger and per-run metadata.
- Store image assets separately from structured specs; implement retention and delete flows.

### Test layers
1. Unit: schema validation, defaults/unset behavior, serialization, preset merging, deterministic compilation.
2. Property/invariant: changes to a mole must not alter wardrobe; changing camera must not silently change body type; safe combinations remain permitted.
3. Conflict tests: mutually exclusive choices, provider unsupported options, exact-count/detail visibility warnings.
4. UI/E2E: Basic → Detailed → Precision transitions, save/reopen, copy/export, mobile layout, keyboard accessibility.
5. API mock: requests, retries, failures, billing guards, no secret leakage.
6. Live image evaluation: blind A/B comparison of naive prompt vs Prompter, attribute adherence checklist, time-to-satisfactory-image, iteration count, cost per acceptable result.

Create a fixed evaluation set including portraits, full-body figures, skin marks, non-exaggerated body proportions, non-revealing clothing, landscapes, architectural elevations and stylized game assets. A generated prompt is not considered validated until outputs are reviewed.

## 10. Stepwise roadmap and exit criteria

### Sprint 0 — Foundation (start here)
- New standalone repository and app skeleton; WHY untouched.
- Agree initial stack; recommendation: Next.js + TypeScript + strict validation (e.g. Zod) for a browser-first tool. Persistence can start with local JSON or browser-local storage; database choice deferred until needed.
- Create versioned spec schema and catalog loader, basic navigation, preview area, mock prompt compiler.
- Tests + lint/typecheck + README + architecture decision records.
- **Exit:** app starts locally; one minimal spec can be edited, compiled, exported/imported and reproduced; tests pass. No paid API calls.

### Sprint 1 — Basic composer
- Context-aware subject, style preset, framing, environment, aspect ratio, free text, preview/copy.
- Proper `unset`, no implicit anatomy or exposure changes.
- **Exit:** a beginner can complete a prompt without visiting detailed settings; save/reload is lossless.

### Sprint 2 — Detailed person editor
- Face, skin, body, hair, expression, wardrobe, pose, camera, lighting; independent body shape / clothing coverage / appeal.
- Versioned option registry, search, grouped visual examples (initially placeholders with metadata), conflict warnings.
- **Exit:** independent settings persist; coverage, anatomy and mood do not cross-modify each other; automated tests prove it.

### Sprint 2-C — Integration & Usability (added in 0.2)
- 2-C.1 UI, UX, accessibility: collapsed color palettes (TD-13), camera and lighting subcategories, common editing screen, category keyboard navigation (TD-01), modal and popover focus (TD-02).
- 2-C.2 Architecture, state management & diagnostics.
- 2-C.3 Safety consistency (TD-12, TD-14, TD-15 — policy changes need separate approval).
- 2-C.4 Performance & integration validation (TD-11; real screen reader — VoiceOver, NVDA — and dark-mode verification, TD-16).
- **Exit:** the 348-attribute Detailed editor is navigable and editable by mouse, keyboard and on mobile without hiding features; IDs, stored values and prompt output are unchanged.

### Sprint 2-D — Visual Editor & Recommendation (added in 0.2)
- 2-D.1 Shared visual-choice components and asset standard (connects TD-03).
- 2-D.2 Face and facial-feature visual choices; combined face preview.
- 2-D.3 Hair, body and clothing visual choices.
- 2-D.4 Pose, camera and lighting visual choices.
- 2-D.5 Recommended mode and recommendation presets.
- 2-D.6 Visual editing integration and usability validation.
- **Exit:** a user without professional terms can set face, hair, body, clothing, pose, camera and lighting by visual choice or recommendation, editing the same ImageSpec as Basic/Detailed; recommendations apply only after confirmation and can be undone; text editing remains available for everything.

### Sprint 3 — Precision editor
- Localized skin marks (count, side, size), region-specific attributes, priorities, preserve/exclude constraints, reference roles (metadata first), advanced camera cues.
- **Exit:** exact user specifications survive round-trip serialization and appear accurately in prompt text; limitations are surfaced.

### Sprint 4 — Style taxonomy and non-person subjects
- Orthogonal style axes, catalog expansion, landscapes, architecture, products, game assets.
- **Exit:** adding a catalog entry does not require changes to core compiler or UI layout; tests cover several subject types.

### Sprint 5 — Image API and live validation
- OpenAI provider adapter, secure key configuration, cost/usage guardrails, run history, result gallery, evaluation forms.
- **Exit:** user-authorized paid calls work; errors and costs are visible; results can be compared to original specs; no secrets in client.

### Sprint 6 — Product validation
- Recruit target creators; measure successful first result, time, iterations, repeat usage, willingness to pay.
- Explore paid precision workflows, reusable character specifications, version history and model adapters only if evidence supports value.

Sprint numbering is a proposed sequence, not a fixed duration. Every sprint includes tests and documentation updates.

## 11. Initial repo structure (proposal)

```text
prompter/
  docs/
    MASTER_PLAN.md
    decisions/
    catalogs/
    test-plans/
  src/
    app/
    components/
      composer/
      controls/
    domain/
      spec/
      catalogs/
      compiler/
      validation/
    providers/
      image/
    lib/
  tests/
  README.md
  .env.example
```

Keep domain logic free of UI/framework dependencies; do not build provider-specific rules into core catalog definitions.

## 12. Decision log

### Agreed
- Separate Prompter project; WHY remains unchanged.
- Deep, optional expert controls are a primary value proposition.
- Basic, Detailed, Precision modes; staged implementation and verification.
- Image API integration and empirical result tests are part of the roadmap.
- Adult body proportions, garment coverage and visual appeal must be independently controllable.
- Broad style taxonomy with orthogonal dimensions; not a tiny exclusive style list.
- (0.2) Visual image-design direction: Recommended, Visual and Detailed editing share one ImageSpec; Basic and Detailed editors stay; Sprint 2-C (integration & usability) and Sprint 2-D (visual editor & recommendation) precede Sprint 3, whose plan is unchanged.

### Proposed / pending validation
- Next.js / TypeScript / Zod.
- Local-first persistence for early sprints.
- Exact Basic mode fields and catalog taxonomy.
- Final screen structure of Visual and Recommended modes (decided in Sprint 2-D).
- OpenAI as first image provider, subject to current API validation.
- Subscription tiers, pricing and business model.

## 13. Definition of Done (all sprints)

- User-facing behavior implemented and documented.
- Unit + relevant integration/E2E tests passing.
- No silent modification of unrelated spec fields.
- Errors, unsupported settings and costs visible where applicable.
- Lint and TypeScript checks passing.
- README/ADR/changelog updated; unresolved issues listed explicitly.

## 14. First coding-agent task

**Assigned agent: Fable**

> Create a NEW, standalone `prompter` project from this master plan. Do not open, modify, refactor or reuse the existing WHY repository. Implement **Sprint 0 only**. Use Next.js + TypeScript and a strict, versioned schema (Zod is recommended), unless there is a concrete technical obstacle, in which case explain and propose an ADR before substituting. Build a simple functional shell with Basic / Detailed / Precision navigation, one shared ImageSpec, JSON export/import, and a deterministic generic prompt preview. Create an extensible catalog registry and tests proving that unset values remain unset and that editing one attribute does not mutate unrelated attributes. Keep detailed and precision screens as honest placeholders; do not claim they are complete. Do not connect paid APIs or create API charges. Include README with exact local setup/run/test commands, architecture notes, and a short implementation report with changed files, test results, open issues and next recommended tasks. Ask before making material architecture changes.

## 15. Immediate local acceptance checklist

- [ ] Fresh `prompter` repo; WHY untouched
- [ ] `npm install` / `npm run dev` work (or documented equivalent)
- [ ] Basic / Detailed / Precision tabs render
- [ ] A subject and style can be selected
- [ ] Preview updates from the same structured spec
- [ ] JSON export and import round-trip
- [ ] Unset stays unset; no implicit sexualization or body-shape assumptions
- [ ] `npm run test`, `npm run lint`, and `npm run typecheck` pass
- [ ] No live API key required; no paid API calls
