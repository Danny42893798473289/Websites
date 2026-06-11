import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import httpProxy from 'http-proxy';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GATEWAY_PORT = Number(process.env.GATEWAY_PORT || 5500);
const GATEWAY_HOST = process.env.GATEWAY_HOST || '0.0.0.0';
const WEREWOLF_TARGET = process.env.WEREWOLF_TARGET || 'http://127.0.0.1:5501';
const REMOTE_TARGET = process.env.REMOTE_TARGET || 'http://127.0.0.1:5502';
const BILLION_TARGET = process.env.BILLION_TARGET || 'http://127.0.0.1:5503';

const chooserHtml = path.join(__dirname, 'index.html');

const werewolfProxy = httpProxy.createProxyServer({
  target: WEREWOLF_TARGET,
  ws: true,
  changeOrigin: true,
  proxyTimeout: 120000
});

const remoteProxy = httpProxy.createProxyServer({
  target: REMOTE_TARGET,
  ws: true,
  changeOrigin: true,
  proxyTimeout: 120000
});

const billionProxy = httpProxy.createProxyServer({
  target: BILLION_TARGET,
  ws: true,
  changeOrigin: true,
  proxyTimeout: 120000
});

function sendError(res, message, code = 502) {
  if (res.headersSent) return;
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

function serveChooser(res) {
  fs.readFile(chooserHtml, (err, data) => {
    if (err) {
      sendError(res, 'Chooser page not found.');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

function attachProxyError(proxy, label) {
  proxy.on('error', (err, _req, res) => {
    console.warn(`${label} proxy error:`, err.message);
    if (res && !res.headersSent) {
      sendError(res, `${label} is not running yet. Wait a few seconds and refresh.`);
    }
  });
}

attachProxyError(werewolfProxy, 'Werewolf');
attachProxyError(remoteProxy, 'Little Remote');
attachProxyError(billionProxy, '1 in a Billion');

const server = http.createServer((req, res) => {
  const url = req.url?.split('?')[0] || '/';

  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, service: 'all-gateway' }));
    return;
  }

  if (url === '/' || url === '/index.html') {
    serveChooser(res);
    return;
  }

  if (url === '/werewolf') {
    res.writeHead(302, { Location: '/werewolf/' });
    res.end();
    return;
  }

  if (url.startsWith('/werewolf/')) {
    req.url = url.replace(/^\/werewolf/, '') || '/';
    werewolfProxy.web(req, res);
    return;
  }

  if (url === '/remote') {
    res.writeHead(302, { Location: '/remote/' });
    res.end();
    return;
  }

  if (url.startsWith('/remote/')) {
    req.url = url.replace(/^\/remote/, '') || '/';
    remoteProxy.web(req, res);
    return;
  }

  if (url === '/billion') {
    res.writeHead(302, { Location: '/billion/' });
    res.end();
    return;
  }

  if (url.startsWith('/billion/')) {
    req.url = url.replace(/^\/billion/, '') || '/';
    billionProxy.web(req, res);
    return;
  }

  if (url.startsWith('/api/')) {
    billionProxy.web(req, res);
    return;
  }

  if (url.startsWith('/assets/')) {
    remoteProxy.web(req, res);
    return;
  }

  sendError(res, 'Not found', 404);
});

server.on('upgrade', (req, socket, head) => {
  const url = req.url || '';

  if (url.startsWith('/werewolf/socket.io')) {
    req.url = url.replace(/^\/werewolf/, '');
    werewolfProxy.ws(req, socket, head);
    return;
  }

  if (url.startsWith('/remote/') || url.startsWith('/assets/')) {
    remoteProxy.ws(req, socket, head);
    return;
  }

  socket.destroy();
});

server.on('error', (err) => {
  console.error('Gateway server error:', err.message);
});

process.on('uncaughtException', (err) => {
  console.error('Gateway uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Gateway unhandled rejection:', err);
});

function getLanIpv4Addresses() {
  const addresses = [];
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const entry of iface || []) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      const ip = entry.address;
      if (/^(127\.|169\.254\.|198\.18\.)/.test(ip)) continue;
      if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(ip)) {
        addresses.push(ip);
      }
    }
  }
  return [...new Set(addresses)];
}

server.listen(GATEWAY_PORT, GATEWAY_HOST, () => {
  console.log(`Unified gateway ready: http://localhost:${GATEWAY_PORT}`);
  console.log(`Health check: http://localhost:${GATEWAY_PORT}/health`);
  const lanIps = getLanIpv4Addresses();
  if (lanIps.length) {
    console.log('Phone URL (same WiFi, do NOT use localhost on phone):');
    for (const ip of lanIps) {
      console.log(`  http://${ip}:${GATEWAY_PORT}/`);
    }
  } else {
    console.log('Phone URL: use this PC LAN IP with port 5500 (not localhost).');
  }
  console.log(`Werewolf:       http://localhost:${GATEWAY_PORT}/werewolf/`);
  console.log(`Little Remote:  http://localhost:${GATEWAY_PORT}/remote/`);
  console.log(`1 in a Billion: http://localhost:${GATEWAY_PORT}/billion/`);
  console.log('This is only the router on 5500. The backends must also be running:');
  console.log('  - Werewolf Kill on 5501');
  console.log('  - Little Remote on 5502');
  console.log('  - 1 in a Billion on 5503 (required for chooser cards + login)');
  console.log('Use All\\start-chooser.bat for the full orchestrated startup with waits.');
});
