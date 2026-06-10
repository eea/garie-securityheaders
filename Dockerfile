FROM node:20

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
        dumb-init && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN npm install --global @mdn/mdn-http-observatory

RUN mkdir -p /usr/src/garie-plugin/reports

WORKDIR /usr/src/garie-plugin

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force

RUN npx playwright install chromium && \
    npx playwright install-deps chromium && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/*

COPY . .

EXPOSE 3000

VOLUME ["/usr/src/garie-plugin/reports"]

ENTRYPOINT ["/usr/src/garie-plugin/docker-entrypoint.sh"]

CMD ["/usr/bin/dumb-init", "npm", "start"]
