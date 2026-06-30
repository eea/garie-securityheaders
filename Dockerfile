FROM node:20-bookworm-slim

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
        dumb-init && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN npm install --global @mdn/mdn-http-observatory@1.6.2 && \
    npm cache clean --force

RUN mkdir -p /usr/src/garie-plugin/reports

WORKDIR /usr/src/garie-plugin

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force

# Download chromium with the project's locked playwright version, install system deps
RUN npx playwright install chromium && \
    npx playwright install-deps chromium && \
    apt-get remove -y xvfb xserver-common && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/*

COPY . .

EXPOSE 3000

VOLUME ["/usr/src/garie-plugin/reports"]

ENTRYPOINT ["/usr/src/garie-plugin/docker-entrypoint.sh"]

CMD ["/usr/bin/dumb-init", "npm", "start"]
