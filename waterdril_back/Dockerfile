FROM denoland/deno:latest

EXPOSE 5002

WORKDIR /app

# Prefer not to run as root.
USER deno

# COPY ./deps.ts .

# RUN deno cache --unstable deps.ts

ADD . .

RUN deno cache --unstable server.ts

CMD [ "run", "--unstable", "--allow-net", "--allow-env", "--watch", "--allow-read", "server.ts" ]


# FROM hayd/deno:latest

# EXPOSE 8090

# WORKDIR /app

# ADD . /app


# ENTRYPOINT deno cache server.ts


# # RUN deno cache server.ts

# CMD [ "run", "--reload", "--allow-net", "--watch", "--unstable", "server.ts"]