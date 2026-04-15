/**
 * Agent local d’impression : écoute les jobs `printJob` sur le namespace Socket.IO `/realtime`
 * (room `tenant:{id}:print`). En production, envoyer les octets ESC/POS vers l’imprimante USB/réseau.
 */
import { io, type Socket } from "socket.io-client";

const apiUrl = process.env.API_URL ?? "http://localhost:3001";
const tenantSlug = process.env.TENANT_SLUG ?? "taj-poulet-demo";
const printSecret = process.env.PRINT_AGENT_SECRET ?? "";

if (!printSecret) {
  console.error("PRINT_AGENT_SECRET requis (identique à l’API)");
  process.exit(1);
}

const url = new URL("/realtime", apiUrl).toString();

const socket: Socket = io(url, {
  path: "/socket.io",
  transports: ["websocket"],
  auth: { printSecret },
  query: { tenantSlug },
});

socket.on("connect", () => {
  console.log("Print agent connecté —", tenantSlug);
});

socket.on("printJob", (payload: unknown) => {
  const esc = buildEscPosTicket(payload);
  process.stdout.write(esc);
  console.log("\n--- fin ticket ---\n");
});

socket.on("connect_error", (err) => {
  console.error("Erreur WS:", err.message);
});

function buildEscPosTicket(payload: unknown): Buffer {
  const text =
    typeof payload === "object" && payload !== null
      ? JSON.stringify(payload, null, 2)
      : String(payload);
  const init = Buffer.from([0x1b, 0x40]);
  const body = Buffer.from(text + "\n\n", "utf8");
  const cut = Buffer.from([0x1d, 0x56, 0x00]);
  return Buffer.concat([init, body, cut]);
}
