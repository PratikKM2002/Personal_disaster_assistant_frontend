const http = require("http");
const { createServer } = require("../server");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function request(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, path, method: "GET" },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

describe("Health endpoint", () => {
  let server;
  let port;

  beforeAll(async () => {
    server = createServer();
    port = await listen(server);
  });

  afterAll(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  test("GET /health returns 200 and ok:true", async () => {
    const res = await request(port, "/health");
    expect(res.status).toBe(200);

    const json = JSON.parse(res.body);
    expect(json.ok).toBe(true);
  });
});
