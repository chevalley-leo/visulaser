// Launches the Vite dev server, waits for it to print its actual URL (port can
// shift if 5173 is busy), then starts Electron pointed at that URL. Keeps
// `npm run electron:dev` a single command instead of needing two terminals.
const { spawn } = require("node:child_process");

const isWin = process.platform === "win32";
const npx = isWin ? "npx.cmd" : "npx";

const vite = spawn(npx, ["vite"], { shell: true });
let buffer = "";
let launched = false;

vite.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  if (launched) return;
  buffer += chunk.toString();
  const match = buffer.match(/Local:\s+(http:\/\/localhost:\d+)/);
  if (match) {
    launched = true;
    launchElectron(match[1]);
  }
});
vite.stderr.on("data", (chunk) => process.stderr.write(chunk));
vite.on("exit", (code) => process.exit(code ?? 0));

function launchElectron(url) {
  // Some terminals (e.g. VS Code's, itself Electron-based) leak this env var
  // to child processes, which makes a nested `electron` run as plain Node
  // instead of opening a window. Strip it so the real GUI launches.
  const env = { ...process.env, VITE_DEV_SERVER_URL: url };
  delete env.ELECTRON_RUN_AS_NODE;
  const electronProc = spawn(npx, ["electron", "."], { stdio: "inherit", shell: true, env });
  electronProc.on("exit", (code) => {
    vite.kill();
    process.exit(code ?? 0);
  });
}

process.on("SIGINT", () => {
  vite.kill();
  process.exit(0);
});
