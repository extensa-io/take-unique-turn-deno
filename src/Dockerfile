FROM denoland/deno as install
WORKDIR /src

COPY ./src/ ./
COPY ./src/deno.* ./src/tsconfig.json ./

FROM install as build
WORKDIR /src

ENTRYPOINT ["deno", "task", "start"]