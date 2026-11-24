import type { CatalogInput } from "../schema";

/**
 * prompter.core — Sprint 0 SAMPLE catalog.
 *
 * This is a minimal set of options to validate the architecture. It is NOT
 * the intended final scope; the expert option dictionary is built in later
 * sprints (see docs/ROADMAP.md).
 *
 * Phrasing rules:
 * - Prompt phrases describe only what the option means. They must not add
 *   appearance, nationality, body type, clothing or exposure details.
 * - Bump `version` whenever an id is removed/renamed or phrasing changes.
 */
export const coreCatalog = {
  formatVersion: "0.1.0",
  id: "prompter.core",
  version: "0.1.0",
  title: { en: "Prompter core catalog", ko: "Prompter 기본 카탈로그" },
  groups: [{ id: "essentials", label: { en: "Essentials", ko: "기본 항목" }, order: 0 }],
  attributes: [
    {
      id: "intent.description",
      domain: "intent",
      groupId: "essentials",
      type: "text",
      tier: "basic",
      order: 10,
      maxLength: 2000,
      label: { en: "Describe the image", ko: "이미지 설명 (자유 입력)" },
      description: {
        en: "In your own words: what should be pictured? Only what you write is used.",
        ko: "그리고 싶은 장면을 자유롭게 적어 주세요. 입력한 내용만 사용됩니다.",
      },
      placeholder: {
        en: "e.g. Someone reading a book by a rainy café window",
        ko: "예: 비 오는 카페 창가에서 책을 읽는 사람",
      },
      prompt: { template: "{value}" },
    },
    {
      id: "subject.kind",
      domain: "subject",
      groupId: "essentials",
      type: "single",
      tier: "basic",
      order: 20,
      label: { en: "Main subject", ko: "피사체" },
      description: {
        en: "What kind of subject the image is about. No appearance details are added.",
        ko: "이미지의 주된 대상 유형입니다. 외형 등 세부 사항은 추가되지 않습니다.",
      },
      prompt: { template: "Main subject: {value}." },
      options: [
        { id: "person", label: { en: "Person", ko: "인물 (1인)" }, prompt: { text: "a single person" } },
        { id: "group", label: { en: "Group of people", ko: "여러 사람" }, prompt: { text: "a group of people" } },
        { id: "animal", label: { en: "Animal", ko: "동물" }, prompt: { text: "an animal" } },
        { id: "object", label: { en: "Object / product", ko: "사물 / 제품" }, prompt: { text: "an object or product" } },
        { id: "vehicle", label: { en: "Vehicle", ko: "탈것" }, prompt: { text: "a vehicle" } },
        { id: "architecture", label: { en: "Architecture", ko: "건축물" }, prompt: { text: "an architectural structure" } },
        { id: "landscape", label: { en: "Landscape", ko: "풍경" }, prompt: { text: "a landscape" } },
        { id: "abstract", label: { en: "Abstract", ko: "추상" }, prompt: { text: "an abstract composition" } },
      ],
    },
    {
      id: "style.visual",
      domain: "style",
      groupId: "essentials",
      type: "single",
      tier: "basic",
      order: 30,
      label: { en: "Image style", ko: "이미지 스타일" },
      description: {
        en: "Overall rendering style. (Sample list — the full orthogonal style taxonomy comes later.)",
        ko: "전체적인 표현 방식입니다. (샘플 목록 — 세분화된 스타일 체계는 후속 개발 예정)",
      },
      prompt: { template: "Visual style: {value}." },
      options: [
        {
          id: "photography",
          label: { en: "Photography", ko: "사진" },
          prompt: { text: "photograph" },
          examples: [
            {
              id: "photography-sample",
              status: "placeholder",
              alt: { en: "Example photograph (placeholder)", ko: "사진 예시 (준비 중)" },
            },
          ],
        },
        { id: "digital_illustration", label: { en: "Digital illustration", ko: "디지털 일러스트" }, prompt: { text: "digital illustration" } },
        { id: "anime", label: { en: "Anime style", ko: "애니메이션풍" }, prompt: { text: "anime-style illustration" } },
        { id: "render_3d", label: { en: "3D render", ko: "3D 렌더" }, prompt: { text: "3D render" } },
        { id: "oil_painting", label: { en: "Oil painting", ko: "유화" }, prompt: { text: "oil painting" } },
        { id: "watercolor", label: { en: "Watercolor", ko: "수채화" }, prompt: { text: "watercolor painting" } },
        { id: "pixel_art", label: { en: "Pixel art", ko: "픽셀 아트" }, prompt: { text: "pixel art" } },
        { id: "ink_line_art", label: { en: "Ink line art", ko: "잉크 선화" }, prompt: { text: "ink line drawing" } },
      ],
    },
  ],
  rules: [],
} satisfies CatalogInput;
