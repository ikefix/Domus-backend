import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { apiReference } from '@scalar/nestjs-api-reference';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);


  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true
  }));

  // Serve the OpenAPI YAML spec at /openapi.yaml (separate from /docs to avoid route conflicts)
  app.use('/openapi.yaml', (_req, res) => {
    const spec = readFileSync(join(process.cwd(), 'docs', 'openapi.yaml'), 'utf8');
    res.setHeader('Content-Type', 'application/yaml');
    res.send(spec);
  });

  // Serve logo.png
  app.use('/logo.png', (_req, res) => {
    const logo = readFileSync(join(process.cwd(), 'assets', 'logo.png'));
    res.setHeader('Content-Type', 'image/png');
    res.send(logo);
  });

  // Mount password protection middleware for /docs
  app.use('/docs', (req: any, res: any, next: any) => {
    const cookies: Record<string, string> = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      cookieHeader.split(';').forEach((cookie: string) => {
        const parts = cookie.split('=');
        if (parts[0]) {
          cookies[parts[0].trim()] = parts[1]?.trim() || '';
        }
      });
    }

    const expectedPassword = process.env.DOCS_PASSWORD || 'admin';
    const queryPass = req.query.pass;
    const cookiePass = cookies['docs_password'];
    const hasQuery = 'pass' in req.query;

    if (queryPass === expectedPassword || cookiePass === expectedPassword) {
      if (queryPass === expectedPassword) {
        res.setHeader('Set-Cookie', `docs_password=${expectedPassword}; Path=/docs; Max-Age=86400; HttpOnly; SameSite=Lax`);
        return res.redirect('/docs');
      }
      return next();
    }

    const logoBase64 = readFileSync(join(process.cwd(), 'assets', 'logo-full.png')).toString('base64');
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Domus API Documentation - Lock Screen</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            background-color: #ffffff;
            color: #09090b;
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .lock-card {
            width: 100%;
            max-width: 360px;
            text-align: center;
            padding: 2rem 1.5rem;
          }
          .logo {
            max-width: 160px;
            margin-bottom: 2rem;
            display: inline-block;
          }
          h1 {
            font-size: 1.35rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            letter-spacing: -0.01em;
          }
          p {
            font-size: 0.875rem;
            color: #71717a;
            margin-bottom: 2rem;
            line-height: 1.4;
          }
          .form-group {
            margin-bottom: 1.25rem;
            text-align: left;
          }
          label {
            display: block;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #71717a;
            margin-bottom: 0.375rem;
          }
          input {
            width: 100%;
            padding: 0.75rem 0.875rem;
            background-color: transparent;
            border: 1px solid #e4e4e7;
            border-radius: 8px;
            color: #09090b;
            font-size: 0.95rem;
            font-family: inherit;
            transition: border-color 0.2s ease;
          }
          input:focus {
            outline: none;
            border-color: #09090b;
          }
          .error-msg {
            color: #ef4444;
            font-size: 0.8rem;
            margin-top: 0.5rem;
            font-weight: 500;
          }
          button {
            width: 100%;
            padding: 0.75rem;
            background-color: #09090b;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            transition: opacity 0.2s ease;
          }
          button:hover {
            opacity: 0.9;
          }
          button:active {
            transform: scale(0.98);
          }
        </style>
      </head>
      <body>
        <div class="lock-card">
          <img class="logo" src="data:image/png;base64,${logoBase64}" alt="Domus Logo">
          <h1>Documentation Locked</h1>
          <p>Please enter the authorization password to view the API reference.</p>
          <form method="GET" action="/docs">
            <div class="form-group">
              <label for="pass">Password</label>
              <input type="password" id="pass" name="pass" placeholder="••••••••" required autofocus>
              ${hasQuery && queryPass !== expectedPassword ? '<div class="error-msg">Incorrect password. Please try again.</div>' : ''}
            </div>
            <button type="submit">Unlock Access</button>
          </form>
        </div>
      </body>
      </html>
    `);
  });

  // Mount Scalar API reference UI at /docs
  app.use(
    '/docs',
    apiReference({
      url: '/openapi.yaml',
      customCss: `
        .sidebar::before {
          content: "";
          display: block;
          height: 45px;
          margin: 20px 20px 10px 24px;
          background-image: url('/logo.png');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: left center;
        }
      `,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Application running at http://localhost:${port}`);
  console.log(`API docs available at http://localhost:${port}/docs`);
}
bootstrap();
