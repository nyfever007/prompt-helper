#!/bin/bash
# 사용법: verify.sh start  (SessionStart: 세션 시작 시점의 커밋 기록)
#         verify.sh stop   (Stop: 끝내기 전에 typecheck + lint + unit test, 실패하면 exit 2로 종료를 막음)
# 토큰 보호 장치
#   1) 이번 세션에서 코드(src/tests/e2e/설정)가 안 바뀌었으면 검사하지 않음
#   2) 같은 세션에서 최대 3번까지만 막음 → 못 고치면 사람에게 넘김 (무한 루프 방지)
#   3) 실패 출력은 마지막 40줄만 전달
# e2e(Playwright)는 빌드+서버 기동이라 느려서 여기서는 돌리지 않음 → 필요할 때 pnpm test:e2e / CI에서.
input=$(cat)
sid=$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s).session_id??"default"))}catch{process.stdout.write("default")}})')
proj="${CLAUDE_PROJECT_DIR:-$PWD}"
cd "$proj" || exit 0
state="${TMPDIR:-/tmp}/promptmaker-claude-hooks"
mkdir -p "$state"
headfile="$state/$sid.head"; countfile="$state/$sid.blocks"
MAX_BLOCKS=3
WATCH="src tests e2e package.json pnpm-lock.yaml tsconfig.json eslint.config.mjs vitest.config.mts next.config.ts"

if [ "$1" = "start" ]; then
  # resume/compact 때는 기존 기준점을 유지. stdout은 컨텍스트에 들어가므로 아무것도 출력하지 않음.
  [ -f "$headfile" ] || git rev-parse HEAD > "$headfile" 2>/dev/null
  exit 0
fi

# --- stop ---
base=$(cat "$headfile" 2>/dev/null)
changed=$(git status --porcelain -- $WATCH 2>/dev/null)
if [ -z "$changed" ] && [ -n "$base" ]; then
  changed=$(git diff --name-only "$base" HEAD -- $WATCH 2>/dev/null)
fi
[ -z "$changed" ] && exit 0      # 코드 변경 없음 → 검사 생략

out=$( { ./node_modules/.bin/tsc --noEmit \
      && ./node_modules/.bin/eslint . --max-warnings=0 \
      && ./node_modules/.bin/vitest run --reporter=dot; } 2>&1 )
if [ $? -eq 0 ]; then
  rm -f "$countfile"
  exit 0
fi

n=$(( $(cat "$countfile" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "$countfile"
if [ "$n" -gt "$MAX_BLOCKS" ]; then
  # 더 막지 않고 사용자에게만 알림
  printf '{"systemMessage":"⚠️ typecheck/lint/test가 %s번 연속 실패해서 자동 재시도를 멈췄습니다. 직접 확인이 필요합니다."}\n' "$MAX_BLOCKS"
  exit 0
fi
{ echo "끝내기 전 검사 실패 ($n/$MAX_BLOCKS). typecheck → lint → unit test 순서로 돌렸고, 아래 오류를 고친 뒤 다시 마무리해 줘."
  echo "$out" | tail -n 40; } >&2
exit 2
