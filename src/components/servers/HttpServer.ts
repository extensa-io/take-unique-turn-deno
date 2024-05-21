import { Application, Context, isHttpError, Router } from "https://deno.land/x/oak@v16.0.0/mod.ts";

import { TurnService } from "../../shared/services/TurnService.ts";
import { DBSettings, Message } from "../../shared/Types.ts";
import { TurnRepository } from "../../shared/repositories/TurnRepository.ts";

// env variables
const port =  Number(Deno.env.get("PORT")) || 8000;
const serverURL = Deno.env.get("SERVER_URL") || '';
const dbSettings: DBSettings = {
  dbCollection: Deno.env.get("MONGO_DB_COLLECTION") || '',
  dbServer: Deno.env.get("MONGO_DB_SERVER_URL") || '',
  dbUser: Deno.env.get("MONGO_DB_USER") || '',
  dbPassword: Deno.env.get("MONGO_DB_PASSWORD")  || '',
};

// components
const repository = new TurnRepository();
await repository.connect(dbSettings);
const service = new TurnService(repository);
await service.createNextTurn();

// server

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
  ctx.response.body = "take-unique-turn-deno API OK";
});

router.get('/presentation', async (ctx) => {
  const fileBuffer = await Deno.readFile(`${Deno.cwd()}/assets/FromNodeToDeno.pdf`);
  ctx.response.body = fileBuffer;
  ctx.response.headers.set('Content-Type', 'application/pdf');
});

router.get('/all', async (ctx) => {
  ctx.response.body = await service.getTurns();
});

router.get('/assign/:id', async (ctx) => {
    const turnID = ctx.params.id;
    await service.reserveTurn(turnID)
    await createAndEmit(ctx);

    ctx.response.redirect(`/assign.html?id=${turnID}`);
});

router.get('/getTurn/:id', async (ctx) => {
  const userName = 'anonymous';
  const turnId = ctx.params.id;
  const assignedTurn = await service.assignTurn(turnId, userName);

  ctx.response.redirect(`/thanks.html?name=${assignedTurn.user_name}&turn=${assignedTurn.turn}`);
});

router.post('/getTurn/:id', async (ctx) => {
    const turnId = ctx.params.id;
    const body = await ctx.request.body.form();
    
    let userName = 'anonymous'
    for (const [key, value] of body) {
      if (key === 'user_name') {
        userName = value;
      }
    }
  
    const assignedTurn = await service.assignTurn(turnId, userName);

    ctx.response.redirect(`/thanks.html?name=${assignedTurn.user_name}&turn=${assignedTurn.turn}`);
});

router.post('/reset', async (ctx) => {
  await service.resetDB();
  await createAndEmit(ctx);

  ctx.response.body = `turns cleared, next turn is [${service.nextAvailableTurn}]`;
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
async function createAndEmit(ctx: Context): Promise<void> {
  await service.createNextTurn();

  const message = buildMessage();
  console.log(`emitting message for turn [${message.next_available_turn}]`);

  for (const ws of connectedClients.values()) {
    ws.send(JSON.stringify(message));
  }
}

function buildMessage(): Message {
  return {
    server_url: serverURL,
    next_available_turn: service.nextAvailableTurn,
  };
}
