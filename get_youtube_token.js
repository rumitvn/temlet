const { google } = require("googleapis");
const http = require("http");
const destroyer = require("server-destroy");
const open = require('open');

// Replace these with your actual credentials from Google Cloud Console
const CLIENT_ID = "YOUR_CLIENT_ID";
const CLIENT_SECRET = "YOUR_CLIENT_SECRET";
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
open(authorizeUrl);

const server = http
  .createServer(async (req, res) => {
    try {
      if (req.url.indexOf("/oauth2callback") > -1) {
        const qs = new URL(req.url, "http://localhost:5173").searchParams;
        const code = qs.get("code");
        console.log(`Code is ${code}`);
        res.end("Authentication successful! Please return to the console.");
        server.destroy();

        const { tokens } = await oauth2Client.getToken(code);
        console.log("🎉 Success! Here are your tokens:");
        console.log(JSON.stringify(tokens, null, 2));
        
        // Save tokens to .env.local format
        console.log("\n📝 Add these to your .env.local file:");
        console.log(`YOUTUBE_TOKEN_JSON='${JSON.stringify(tokens)}'`);
        console.log(`YOUTUBE_CLIENT_ID='${CLIENT_ID}'`);
        console.log(`YOUTUBE_CLIENT_SECRET='${CLIENT_SECRET}'`);
        console.log(`YOUTUBE_REDIRECT='${REDIRECT_URI}'`);
      }
    } catch (e) {
      console.error(e);
    }
  })
  .listen(5173, () => {
    console.log("🚀 Server is running on http://localhost:5173");
  });

destroyer(server);
