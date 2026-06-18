// =============================================================================
//  AntonLiner System — API server entrypoint (Deno + Oak, latest/JSR).
// =============================================================================
import { Application, green, yellow } from "./deps.ts";
import { SERVER } from "./config/config.ts";
import { logger, responseTime } from "./middlewares/logger.ts";
import errorHandler from "./middlewares/errorHandler.ts";
import cors from "./middlewares/cors.ts";
import notFound from "./middlewares/notFound.ts";
import userRouter from "./routes/user.route.ts";
import healthRouter from "./routes/connect.route.ts";
import trackRouter from "./routes/track.route.ts";
import v1Router from "./routes/v1.route.ts";

const app = new Application();

// Cross-cutting middleware (order matters).
app.use(errorHandler);
app.use(cors);
app.use(responseTime);
app.use(logger);

// Feature routes.
// v1 — the redesigned, secured API.
app.use(v1Router.routes());
app.use(v1Router.allowedMethods());
// Legacy routes (kept mounted during client migration; will be retired).
app.use(userRouter.routes());
app.use(userRouter.allowedMethods());
app.use(healthRouter.routes());
app.use(healthRouter.allowedMethods());
app.use(trackRouter.routes());
app.use(trackRouter.allowedMethods());

// Fallback.
app.use(notFound);

app.addEventListener("listen", ({ hostname, port, secure }) => {
  const protocol = secure ? "https" : "http";
  console.log(`${yellow("Listening on:")} ${green(`${protocol}://${hostname ?? "localhost"}:${port}`)}`);
});

await app.listen({ port: SERVER.PORT });
