const MAX = 1 * 1024 * 1024; // 1MB
const BODY_TIMEOUT_MS = 10000; // 10 seconds

async function parseJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let chunks = [];
    const timeout = setTimeout(() => {
      reject(Object.assign(new Error('Request body timeout'), { status: 408 }));
      req.destroy();
    }, BODY_TIMEOUT_MS);
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX) {
        clearTimeout(timeout);
        reject(Object.assign(new Error('Payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      clearTimeout(timeout);
      if (chunks.length === 0) return resolve(null);
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(body);
      } catch (e) {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }));
      }
    });
    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

module.exports = { parseJson };
