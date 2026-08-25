FROM node:20.20.2-alpine3.23

ENV NODE_ENV=production
WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --chown=node:node app.js config.js db.js migrate.js server.js companionSafety.js legacyImportPolicy.js ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node middleware ./middleware
COPY --chown=node:node routes ./routes
COPY --chown=node:node services ./services
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node docker-entrypoint.sh /usr/local/bin/schema-flo-entrypoint
RUN chmod 0555 /usr/local/bin/schema-flo-entrypoint

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3001/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

ENTRYPOINT ["/usr/local/bin/schema-flo-entrypoint"]
