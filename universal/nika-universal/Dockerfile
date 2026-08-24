FROM node:22-alpine
WORKDIR /app
COPY . .
RUN mkdir -p /app/data && chown -R node:node /app
USER node
ENV NIKA_PORT=8787 NIKA_DATA_DIR=/app/data
EXPOSE 8787
CMD ["node", "server.mjs"]
