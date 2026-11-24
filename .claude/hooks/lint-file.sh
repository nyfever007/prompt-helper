#!/bin/bash
# PostToolUse(Edit|Write|MultiEdit): 방금 수정한 파일 하나만 ESLint로 검사.
# 실패하면 exit 2 → 에러(마지막 30줄)가 Claude에게 전달되어 바로 고침. 통과하면 아무것도 출력하지 않음(토큰 0).
input=$(cat)
file=$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).tool_input?.file_path??"")}catch{}})')
proj="${CLAUDE_PROJECT_DIR:-$PWD}"
case "$file" in
  "$proj"/*) ;;            # 프로젝트 밖 파일은 무시
  *) exit 0 ;;
esac
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.mts|*.cjs) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0
cd "$proj" || exit 0
out=$(./node_modules/.bin/eslint --max-warnings=0 --no-warn-ignored "$file" 2>&1)
if [ $? -ne 0 ]; then
  { echo "ESLint 실패: ${file#$proj/}"; echo "$out" | tail -n 30; } >&2
  exit 2
fi
exit 0
