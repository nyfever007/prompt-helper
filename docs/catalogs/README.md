# 카탈로그 설계 문서

Prompter의 속성 카탈로그는 **데이터**(`src/domain/catalog/catalogs/core.ts`)와 **설계 문서**(이 폴더)로 나뉩니다.

- 공통 설계 규격: [CATALOG_DESIGN_STANDARD.md](CATALOG_DESIGN_STANDARD.md) (모든 카탈로그에 적용, 0.2.0)
- 설계 문서는 [ATTRIBUTE_TEMPLATE.md](ATTRIBUTE_TEMPLATE.md)를 따릅니다.
- 설계 상태가 `APPROVED`가 된 항목만 카탈로그 데이터에 `status: "approved"`로 추가하고, 제품 UI에 노출합니다.
- 기술적으로 표현할 수 있다는 이유만으로는 노출하지 않습니다. `draft`·`deferred` 데이터는 제품 UI에서 편집할 수 없습니다.
- 개발 검증용 샘플은 제품 카탈로그가 아니라 테스트 전용 카탈로그(`src/testing/fixtureCatalog.ts`)에만 둡니다.

## 영역 (Detailed 정보 구조, 초기안)

| 영역 | 문서 | 상태 |
|---|---|---|
| 인물 › 인물 기본 정보 (Identity) | [person/identity.md](person/identity.md) | **APPROVED** (Sprint 2-B.1, 1.0.0 — 16개 속성 구현) |
| 인물 › 얼굴 (Face) | [person/face.md](person/face.md) | **APPROVED** (Sprint 2-B.2, 10개 속성) |
| 인물 › 눈 (Eyes) | [person/eyes.md](person/eyes.md) | **APPROVED** (Sprint 2-B.2, 13개 속성) |
| 인물 › 눈썹 (Eyebrows) | [person/eyebrows.md](person/eyebrows.md) | **APPROVED** (Sprint 2-B.2, 8개 속성) |
| 인물 › 코 (Nose) | [person/nose.md](person/nose.md) | **APPROVED** (Sprint 2-B.2, 8개 속성) |
| 인물 › 입술 (Lips) | [person/lips.md](person/lips.md) | **APPROVED** (Sprint 2-B.2, 8개 속성) |
| 인물 › 피부 (Skin) | [person/skin.md](person/skin.md) | **APPROVED** (Sprint 2-B.3, 16개 속성) |
| 인물 › 헤어 (Hair) | [person/hair.md](person/hair.md) | **APPROVED** (Sprint 2-B.3, 23개 속성) |
| 인물 › 수염 (Facial hair) | [person/facial-hair.md](person/facial-hair.md) | **APPROVED** (Sprint 2-B.3, 6개 속성, 새 영역) |
| 인물 › 신체 (Body) | [person/body.md](person/body.md) | **APPROVED** (Sprint 2-B.4, 45개 속성, 하위 분류 7개) |
| 인물 › 표정 및 시각적 인상 (Expression & Appeal) | [person/expression.md](person/expression.md) | **APPROVED** (Sprint 2-B.5, 18개 속성, 하위 분류 2개) |
| 인물 › 메이크업 (Makeup) | [person/makeup.md](person/makeup.md) | **APPROVED** (Sprint 2-B.5, 16개 속성) |
| 인물 › 의상 (Wardrobe) | [person/wardrobe.md](person/wardrobe.md) | **APPROVED** (Sprint 2-B.5, 72개 속성, 하위 분류 8개) |
| 인물 › 액세서리 (Accessories) | [person/accessories.md](person/accessories.md) | **APPROVED** (Sprint 2-B.5, 18개 속성) |
| 인물 › 자세 및 행동 (Pose & Action) | [person/pose.md](person/pose.md) | DRAFT |
| 공통 › 카메라 (Camera) | [shared/camera.md](shared/camera.md) | DRAFT (Sprint 1 승인 속성 존재) |
| 공통 › 조명 (Lighting) | [shared/lighting.md](shared/lighting.md) | DRAFT (Sprint 1·2-A 승인 속성 존재) |

이 목록은 최종 분류 체계가 아닙니다. 영역과 하위 분류는 카탈로그 `categories` 데이터로 추가하거나 재구성할 수 있습니다.
