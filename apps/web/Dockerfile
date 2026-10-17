FROM node:24
WORKDIR /app
COPY apps/web/package.json ./
RUN npm install
COPY apps/web/ ./
EXPOSE 3000
CMD ["sh", "-c", "npx next dev -H 0.0.0.0"]
