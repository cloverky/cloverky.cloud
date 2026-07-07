# 1. 노드 가벼운 버전 선택
FROM node:24.15.0-alpine

# 2. 컨테이너 내부 작업 디렉토리 설정
WORKDIR /app

# 3. 패키지 파일 복사 및 설치
COPY package.json package-lock.json* ./
RUN npm install

# 4. 소스 코드 복사 및 빌드
COPY . .
RUN npm run build

# 5. Next.js 실행 (3000 포트 개방)
EXPOSE 3000
CMD ["npm", "run", "start"]
