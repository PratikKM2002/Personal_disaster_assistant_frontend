function send(res, status, data, headers = {}) {
  const payload = data === null || data === undefined ? '' : JSON.stringify(data);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(payload);
  return true;
}
module.exports = { send };
