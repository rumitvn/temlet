const { google } = require("googleapis");
const http = require("http");
const destroyer = require("server-destroy");

const open = (...args) => import('open').then(mod => mod.default(...args));

const CLIENT_ID = "";
const CLIENT_SECRET = "";
const REDIRECT_URI = "http://localhost:5173";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const scopes = ["https://www.googleapis.com/auth/youtube.upload"];
const authorizeUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: scopes,
  prompt: "consent",
});

console.log("🌐 Opening browser...");
open(authorizeUrl, { wait: false });

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "", REDIRECT_URI);
    const code = url.searchParams.get("code");

    if (!code) {
      res.end("No code received.");
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    res.end("✅ Authorization complete. You can close this window.");
    console.log("\n✅ YOUTUBE_TOKEN_JSON:\n", JSON.stringify(tokens, null, 2));
    server.destroy();
  } catch (err) {
    console.error("❌ Error:", err);
    res.end("Error during auth.");
  }
});

server.listen(5173, () => {
  console.log("📡 Waiting for authorization on http://localhost:5173 ...");
});

destroyer(server);
