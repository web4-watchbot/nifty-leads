FROM node:24
WORKDIR /app
COPY apps/worker/package.json ./
RUN npm install
COPY apps/worker/ ./
EXPOSE 4000
CMD ["sh", "-c", "npx tsx src/index.ts"]
