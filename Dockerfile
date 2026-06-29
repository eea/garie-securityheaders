FROM node:20 AS builder

RUN npm install --global @mdn/mdn-http-observatory@1.6.2
RUN npx playwright install chromium

FROM node:20-bookworm-slim

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
        dumb-init && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/lib/node_modules/@mdn/mdn-http-observatory /usr/local/lib/node_modules/@mdn/mdn-http-observatory
COPY --from=builder /usr/local/bin/mdn-http-observatory-scan /usr/local/bin/mdn-http-observatory-scan

COPY --from=builder /root/.cache/ms-playwright /root/.cache/ms-playwright
RUN npx playwright install-deps chromium && \
    apt-get remove -y xvfb xserver-common && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/*

RUN mkdir -p /usr/src/garie-plugin/reports

WORKDIR /usr/src/garie-plugin

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force

COPY . .

EXPOSE 3000

VOLUME ["/usr/src/garie-plugin/reports"]

ENTRYPOINT ["/usr/src/garie-plugin/docker-entrypoint.sh"]

CMD ["/usr/bin/dumb-init", "npm", "start"]
