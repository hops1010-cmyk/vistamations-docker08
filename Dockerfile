# VISTAMATIONS docker08 — Perchance Portfolio generator grid
#
# Reproducibility: the base image is pinned to an exact content digest so that
# a rebuild with identical source yields a byte-identical image. To move this
# image forward, update BOTH the digest and the "Base:" line below, then bump
# the build tag (docker08:v9 -> docker08:v10) and the Deployment image.
#
# Base:    node:24-alpine  (Node.js v24.22.0)
# Pinned:  sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f
FROM node:24-alpine@sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f

# Apply alpine security updates and shed the package manager / npm cruft that
# nothing in this image needs (server.js uses only node:builtins - no npm deps).
RUN apk upgrade --no-cache && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /root/.npm

WORKDIR /app

# package.json carries the run contract (start script, engines) but declares no
# dependencies, so no `npm install` / node_modules layer is required.
COPY package.json ./

# Bake the server logic and the landing page plus every static embed page into
# the read-only image. Nothing is written under /app at runtime.
COPY index.html embed.html xqvwmk521g.html vis-character.html server.js ./

# Drop privileges: node:24-alpine ships a non-root 'node' user (uid 1000).
USER node

ENV NODE_ENV=production
ENV PORT=3006

EXPOSE 3006

# Probe the real /healthz route on the configured port.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get({host:'127.0.0.1',port:process.env.PORT||3006,path:'/healthz'},r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
