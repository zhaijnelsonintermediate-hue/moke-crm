const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.resolve(__dirname, "..", "public");
const port = Number(process.env.PORT || 8765);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  const safePath = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
  const filePath = path.normalize(path.join(root, safePath));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const finalPath = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()
    ? path.join(filePath, "index.html")
    : filePath;

  if (!fs.existsSync(finalPath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  res.writeHead(200, { "Content-Type": mime[path.extname(finalPath)] || "application/octet-stream" });
  fs.createReadStream(finalPath).pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`MOKE CRM is running at http://127.0.0.1:${port}`);
});
