const http = require("http");
const fs = require("fs");
const path = require("path");

const server = {
  srv: null,
  createServer(staticFolder) {
    const server = http.createServer((req, res) => {
      let filePath = path.join(
        staticFolder,
        req.url === "/" ? "index.html" : req.url
      );
      const extname = path.extname(filePath);
      let contentType = "text/html";

      // Set content type based on file extension
      switch (extname) {
        case ".js":
          contentType = "application/javascript";
          break;
        case ".css":
          contentType = "text/css";
          break;
        case ".json":
          contentType = "application/json";
          break;
        case ".png":
          contentType = "image/png";
          break;
        case ".jpg":
        case ".jpeg":
          contentType = "image/jpeg";
          break;
        case ".svg":
          contentType = "image/svg+xml";
          break;
        case ".log":
          contentType = "text/plain";
          break;
        default:
          contentType = "text/html";
      }
      if (req.url === "/version") {
        const { version } = require("../../package.json");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ version }), "utf-8");
        return;
      }

      fs.readFile(filePath, (err, content) => {
        if (err) {
          if (err.code === "ENOENT") {
            // File not found
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end("<h1>404 Not Found</h1>", "utf-8");
          } else {
            // Server error
            res.writeHead(500);
            res.end(`Server Error: ${err.code}`);
          }
        } else {
          // Serve the file
          res.writeHead(200, { "Content-Type": contentType });
          res.end(content, "utf-8");
          console.log(`Served: ${filePath}`);
        }
      });
    });
    this.srv = server;
    return server;
  },
  listen(port, callback) {
    if (!this.srv) {
      throw new Error("Server not created. Call createServer first.");
    }
    this.srv.listen(port, callback);
  },
};

module.exports = server;
