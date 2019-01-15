FROM node:8.10.0

RUN mkdir -p /usr/src/garie-securityheaders
RUN mkdir -p /usr/src/garie-securityheaders/reports

WORKDIR /usr/src/garie-securityheaders

COPY package.json .

RUN npm install

COPY . .

EXPOSE 3000

VOLUME ["/usr/src/garie-securityheaders/reports", "/usr/src/garie-securityheaders/logs"]

ENTRYPOINT ["/usr/src/garie-securityheaders/docker-entrypoint.sh"]

CMD ["npm", "start"]
