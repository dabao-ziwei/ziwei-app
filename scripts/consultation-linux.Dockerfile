# Amazon Linux 2023 / Node 24, matching Chromium's serverless Linux target.
# Build SSR assets on the host first with npm run build.
FROM public.ecr.aws/lambda/nodejs:24
WORKDIR /opt/consultation-test
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY server/ ./server/
COPY tests/consultation-png.integration.test.mjs ./tests/
ENV CONSULTATION_TEST_LINUX=true
# Triggers Sparticuz's AL2023 library extraction just as Vercel does.
ENV VERCEL=1
ENTRYPOINT ["node", "--test", "tests/consultation-png.integration.test.mjs"]
