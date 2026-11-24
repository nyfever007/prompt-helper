/**
 * UI strings. Catalog content (attribute/option labels) is localized in the
 * catalog itself; this file covers application chrome only.
 * Add a locale by adding a dictionary with the same keys.
 */
const en = {
  appTitle: "Prompter",
  appTagline: "Visual prompt design — Sprint 0 foundation",
  language: "Language",
  modes: { basic: "Basic", detailed: "Detailed", precision: "Precision" },
  modeHint: "All modes edit the same image specification.",
  planned: {
    badge: "Planned",
    tabBadge: "Planned",
    detailedTitle: "Detailed mode is planned (Sprint 2)",
    detailedBody:
      "Domain-aware sections — face, skin, body, hair, expression, wardrobe, pose, camera, lighting — will appear here. Not implemented yet.",
    precisionTitle: "Precision mode is planned (Sprint 3)",
    precisionBody:
      "Exact counts and positions, region-specific attributes, priorities, preserve/exclude constraints and reference roles will appear here. Not implemented yet.",
    sharedSpec: "Current shared specification",
    sharedSpecHint: "These values come from the same ImageSpec you edit in Basic mode.",
  },
  field: {
    notSet: "Not set",
    set: "Set",
    clear: "Clear",
    useDefault: "Use suggested default",
    inactive: "Not applicable to the current selection — kept, but not used in the prompt.",
    chars: "characters",
  },
  preview: {
    title: "Prompt preview",
    empty: "Nothing selected yet. Choose a subject or style, or describe the image.",
    copy: "Copy prompt",
    copied: "Copied!",
    copyFailed: "Copy failed — select the text and copy manually.",
    sources: "Show where each sentence comes from",
    meta: "compiler",
    language: "Prompt output language: English",
  },
  toolbar: {
    exportJson: "Export JSON",
    importJson: "Import JSON",
    reset: "Reset all",
    resetConfirm: "Reset all settings? Every attribute will return to “Not set”.",
    importOk: "Imported specification.",
    importFailed: "Import failed. Your current settings were not changed.",
    resetDone: "All settings were reset.",
  },
  storage: {
    loading: "Loading saved settings…",
    savedAt: "Saved locally",
    restored: "Restored your last session.",
    invalid: "Saved settings could not be restored and were backed up; starting fresh.",
    saveFailed: "Could not save locally.",
  },
  diagnostics: { title: "Notes" },
  footer: "No image-generation or paid AI API is called in this build.",
} as const;

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Messages = Widen<typeof en>;

const ko: Messages = {
  appTitle: "Prompter",
  appTagline: "비주얼 프롬프트 디자인 — Sprint 0 기반 구조",
  language: "언어",
  modes: { basic: "Basic", detailed: "Detailed", precision: "Precision" },
  modeHint: "모든 모드는 동일한 이미지 명세(ImageSpec)를 편집합니다.",
  planned: {
    badge: "후속 개발 예정",
    tabBadge: "예정",
    detailedTitle: "Detailed 모드는 후속 개발 예정입니다 (Sprint 2)",
    detailedBody:
      "얼굴, 피부, 체형, 헤어, 표정, 의상, 포즈, 카메라, 조명 등 도메인별 세부 설정이 이곳에 추가됩니다. 아직 구현되지 않았습니다.",
    precisionTitle: "Precision 모드는 후속 개발 예정입니다 (Sprint 3)",
    precisionBody:
      "정확한 개수·위치, 부위별 속성, 중요도, 유지/제외 조건, 참조 이미지 역할 등이 이곳에 추가됩니다. 아직 구현되지 않았습니다.",
    sharedSpec: "현재 공유 명세",
    sharedSpecHint: "Basic 모드에서 편집한 동일한 ImageSpec의 값입니다.",
  },
  field: {
    notSet: "미설정",
    set: "설정됨",
    clear: "선택 해제",
    useDefault: "권장 기본값 사용",
    inactive: "현재 선택에는 적용되지 않습니다 — 값은 유지되지만 프롬프트에는 사용되지 않습니다.",
    chars: "자",
  },
  preview: {
    title: "프롬프트 미리보기",
    empty: "아직 선택한 항목이 없습니다. 피사체나 스타일을 선택하거나 이미지를 설명해 주세요.",
    copy: "프롬프트 복사",
    copied: "복사됨!",
    copyFailed: "복사에 실패했습니다. 텍스트를 직접 선택해 복사해 주세요.",
    sources: "각 문장의 출처 보기",
    meta: "컴파일러",
    language: "프롬프트 출력 언어: 영어",
  },
  toolbar: {
    exportJson: "JSON 내보내기",
    importJson: "JSON 가져오기",
    reset: "설정 초기화",
    resetConfirm: "모든 설정을 초기화할까요? 모든 항목이 ‘미설정’ 상태로 돌아갑니다.",
    importOk: "명세를 가져왔습니다.",
    importFailed: "가져오기에 실패했습니다. 현재 설정은 변경되지 않았습니다.",
    resetDone: "모든 설정을 초기화했습니다.",
  },
  storage: {
    loading: "저장된 설정을 불러오는 중…",
    savedAt: "로컬에 저장됨",
    restored: "마지막 작업을 복원했습니다.",
    invalid: "저장된 설정을 복원할 수 없어 백업한 뒤 새로 시작합니다.",
    saveFailed: "로컬 저장에 실패했습니다.",
  },
  diagnostics: { title: "참고 사항" },
  footer: "이 빌드는 이미지 생성 API나 유료 AI API를 호출하지 않습니다.",
};

export const MESSAGES: Record<string, Messages> = { en, ko };
export const SUPPORTED_LOCALES = [
  { id: "ko", label: "한국어" },
  { id: "en", label: "English" },
] as const;
export type UiLocale = (typeof SUPPORTED_LOCALES)[number]["id"];
export const DEFAULT_LOCALE: UiLocale = "ko";

export const getMessages = (locale: string): Messages => MESSAGES[locale] ?? en;

/** Localized text for known diagnostic codes; falls back to the domain message. */
const DIAGNOSTIC_TEXT: Record<string, Record<string, string>> = {
  ko: {
    "compiler.empty": "선택된 항목이 없어 프롬프트가 비어 있습니다.",
    "import.invalid_json": "올바른 JSON 파일이 아닙니다.",
    "import.too_large": "파일이 너무 큽니다.",
    "spec.not_object": "ImageSpec은 JSON 객체여야 합니다.",
    "spec.wrong_kind": "Prompter ImageSpec 파일이 아닙니다.",
    "spec.unsupported_version": "지원하지 않는 스키마 버전입니다.",
    "spec.catalog_mismatch": "다른 카탈로그로 만든 명세입니다.",
    "spec.catalog_version_mismatch": "다른 카탈로그 버전으로 만든 명세입니다.",
    "selection.unknown_attribute": "알 수 없는 속성이 포함되어 있습니다.",
    "value.unknown_option": "알 수 없는 선택지가 포함되어 있습니다.",
    "value.kind_mismatch": "속성 유형과 값의 형식이 맞지 않습니다.",
    "compiler.priority_unsupported": "현재 프롬프트 형식은 중요도를 표현할 수 없어 무시됩니다.",
  },
};

export const describeDiagnostic = (
  locale: string,
  d: { code: string; message: string; path?: string | undefined },
): string => {
  const localized = DIAGNOSTIC_TEXT[locale]?.[d.code];
  if (!localized) return d.message;
  return d.path ? `${localized} (${d.path})` : localized;
};
