FROM node:8.10.0

RUN mkdir -p /usr/src/garie-securityheaders
RUN mkdir -p /usr/src/garie-securityheaders/reports

WORKDIR /usr/src/garie-securityheaders

COPY package.json config.json ./

COPY src/ ./src/

RUN npm install --only=production \ 
  && npm install -g observatory-cli

COPY docker-entrypoint.sh /

EXPOSE 3000

VOLUME ["/usr/src/garie-securityheaders/reports", "/usr/src/garie-securityheaders/logs"]

ENTRYPOINT ["/docker-entrypoint.sh"]

CMD ["npm", "start"]
