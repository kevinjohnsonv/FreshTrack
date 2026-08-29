import { WebSocketServer } from "ws";
import { app, setWss, checkAnomalies, CHECK_INTERVAL_MS } from "./app.js";

const port = 1234;
const wss = new WebSocketServer({ port });
setWss(wss);

wss.on("connection", (ws) => {
  ws.send("Client connected!");
});

setInterval(checkAnomalies, CHECK_INTERVAL_MS);

app.listen(3000);
