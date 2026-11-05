import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function consultationExportDev(environment) {
  return { name:'consultation-export-dev-api', apply:'serve', async configureServer(server) {
    // Vite bundles its config before the first build. Import only while serving:
    // the renderer does not exist until after that first frontend build.
    const { productionHandler } = await import(pathToFileURL(resolve(process.cwd(), 'server/consultationCharts.mjs')).href);
    for (const [route, resource] of [['/api/consultation-charts','charts'],['/api/consultation-chart-export','export']]) {
      const handler = productionHandler(resource, environment);
      server.middlewares.use(route, async (req, res) => {
        res.status = code => { res.statusCode = code; return res; };
        res.json = data => { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(data)); };
        res.send = bytes => res.end(bytes);
        let body = '';
        try {
          for await (const chunk of req) {
            body += chunk.toString();
            if (Buffer.byteLength(body) > 4096) {
              res.setHeader('Cache-Control','private, no-store');
              return res.status(413).json({error:{code:'REQUEST_TOO_LARGE',message:'請求內容過大'}});
            }
          }
          req.body = body;
          await handler(req, res);
        } catch {
          res.setHeader('Cache-Control','private, no-store');
          res.status(503).json({error:{code:'EXPORT_UNAVAILABLE',message:'串接服務暫時無法使用'}});
        }
      });
    }
  } };
}
