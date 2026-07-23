#!/usr/bin/env bash
# auth 게이트웨이용 RS256 키 페어 생성.
# 개인키는 auth 컨테이너에만, 공개키는 검증하는 모든 컨테이너에 배포한다.
set -euo pipefail

openssl genrsa -out jwt_private.pem 2048
openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem

echo
echo "생성 완료. 아래 값을 .env 에 넣으세요 (개행 문제 방지를 위해 base64 인코딩):"
echo
echo "JWT_PRIVATE_KEY=$(base64 -w0 jwt_private.pem)"
echo
echo "JWT_PUBLIC_KEY=$(base64 -w0 jwt_public.pem)"
echo
echo "주의: *.pem 은 .gitignore 대상입니다. 저장소에 커밋하지 마세요."
