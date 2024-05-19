import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { Application, Context, isHttpError, Router } from "https://deno.land/x/oak@v16.0.0/mod.ts";

import { TurnService } from "../../shared/services/TurnService.ts";
import { Message, MessageType } from "../../shared/Types.ts";

const env = await load();

const service = new TurnService();

// server
const port =  Number(env["PORT"]) || 8000;
const serverURL = env["SERVER_URL"] || '/';

const app = new Application({ logErrors: false });
const router = new Router();

// socket
const connectedClients = new Map<number, WebSocket>();
let clientId = 0;

router.get("/wss", (ctx) => {
  if (!ctx.isUpgradable) {
    ctx.throw(501);
  }
  const ws = ctx.upgrade();
  ws.onopen = () => {
    connectedClients.set(clientId, ws);
    clientId++;

    const message = buildMessage();
    ws.send(JSON.stringify(message));
  };
});

// routes
router.get('/', (ctx) => {
  ctx.response.body = "take-unique-api API OK";
});

router.get('/getTurn/:id', (ctx) => {
  const userName = 'anonymous';
  const assignedTurn = service.assignTurn(ctx.params.id, userName);

  ctx.response.redirect(`/thanks.html?name=${userName}&turn=${assignedTurn}`);
});

router.post('/getTurn/:id', async (ctx) => {
    const id = ctx.params.id;
    const body = await ctx.request.body.form();
    
    let userName = 'anonymous'
    for (const [key, value] of body) {
      if (key === 'user_name') {
        userName = value;
      }
    }
  
    const assignedTurn = service.assignTurn(id, userName);
  
    ctx.response.redirect(`/thanks.html?name=${userName}&turn=${assignedTurn}`);
});

router.get('/assign/:id', (ctx) => {
    const id = ctx.params.id;
    createAndEmit(ctx);

    ctx.response.redirect(`/assign.html?id=${id}`);
});

// Error handler
app.use(async (context, next) => {
  try {
    await next();
  } catch (err) {
    if (isHttpError(err)) {
      context.response.status = err.status;
      const { message, status, stack } = err;
      if (context.request.accepts("json")) {
        context.response.body = { message, status, stack };
        context.response.type = "json";
      } else {
        context.response.body = `${status} ${message}\n\n${stack ?? ""}`;
        context.response.type = "text/plain";
      }
    } else {
      console.log(err);
      throw err;
    }
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

// static content
app.use(async (context, next) => {
  const root = `${Deno.cwd()}/content`
  try {
      await context.send({ root })
  } catch {
      next()
  }
});

app.addEventListener("listen", ({ port }) => {
  console.log(`Server running on ${serverURL}:${port}`);
});

await app.listen({ port });

// miscellaneous
function createAndEmit(ctx: Context): void {
  service.createNextTurn();

  for (const ws of connectedClients.values()) {
    ws.send(JSON.stringify(buildMessage()));
  }
}

function buildMessage(): Message {
  return {
    server_url: serverURL,
    next_available_turn: service.nextAvailableTurn,
  };
}
