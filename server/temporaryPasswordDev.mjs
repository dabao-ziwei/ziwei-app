import handler from './temporaryPassword.mjs';

// Development-only adapter; never forwards the service-role key to the browser.
export function temporaryPasswordDev(env) {
  for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TEMP_PASSWORD_RESET_ENABLED']) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }
  return {
    name: 'temporary-password-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/temporary-password', async (req, res) => {
        res.status = code => { res.statusCode = code; return res; };
        res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
        try {
          let body = '';
          for await (const chunk of req) {
            body += chunk.toString();
            if (Buffer.byteLength(body) > 4096) {
              res.setHeader('Cache-Control', 'no-store');
              return res.status(413).json({ error: '請求過大' });
            }
          }
          req.body = body;
          await handler(req, res);
        } catch {
          res.setHeader('Cache-Control', 'no-store');
          res.status(400).json({ error: '請求格式不正確' });
        }
      });
    },
  };
}
