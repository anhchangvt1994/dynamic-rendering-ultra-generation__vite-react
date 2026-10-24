# NOTE - A CentOS VPS for benchmarking (see scripts/vps-lab/run.mjs)
# Only the base OS, node and the project are installed here. Lightpanda, redis
# and the chromium libraries are NOT preinstalled: the start scripts'
# preflight installs them, the same way it would on a fresh VPS.
# NOTE - CentOS Stream 10 (glibc 2.39): uWebSockets.js v20.56 needs glibc 2.38,
# so the uws servers (every start script) can not run on CentOS Stream 9 (2.34)
ARG CENTOS_VERSION=stream10
FROM quay.io/centos/centos:${CENTOS_VERSION}

RUN dnf -y install --allowerasing \
    tar xz git procps-ng iproute-tc which findutils ca-certificates \
  && dnf clean all

ARG NODE_VERSION=22.13.0
RUN arch="$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/')" \
  && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${arch}.tar.xz" \
    | tar -xJ -C /usr/local --strip-components=1 \
  && node -v

WORKDIR /app
COPY . .

# NOTE - The prepare script (husky) needs a git repository, like a cloned project
RUN git init -q \
  && node .yarn/releases/yarn-1.22.22.cjs install --frozen-lockfile --network-timeout 600000 \
  && npm run build

CMD ["sleep", "infinity"]
