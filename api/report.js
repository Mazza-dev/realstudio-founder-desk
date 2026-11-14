import { generateReport } from '../lib/report.js';

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const url = `${protocol}://${host}${req.url}`;
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body
  });
  const response = await generateReport(request, process.env);
  for (const [key, value] of response.headers) res.setHeader(key, value);
  res.status(response.status).send(await response.text());
}
