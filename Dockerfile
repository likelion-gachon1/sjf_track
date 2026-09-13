# ---- build stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# 빌드시점에 API 주소를 굽습니다(NEXT_PUBLIC_ 변수는 빌드 타임에 박힘)
ARG NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
# StepHandoff.tsx 는 클라이언트 컴포넌트라 이 값도 빌드 타임에 박혀야 합니다.
# 런타임 -e 로 넣으면 브라우저 번들에는 반영되지 않습니다.
ARG NEXT_PUBLIC_PORTAL_HOST
ENV NEXT_PUBLIC_PORTAL_HOST=$NEXT_PUBLIC_PORTAL_HOST
RUN npm run build

# ---- run stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 런타임 환경변수 (실제 값은 docker run -e 또는 배포 플랫폼에서 주입)
# OPENAI_API_KEY 는 서버 라우트에서만 읽으므로 런타임 주입이 맞습니다.
ENV OPENAI_API_KEY=""

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs
EXPOSE 3000
CMD ["npm", "run", "start"]
