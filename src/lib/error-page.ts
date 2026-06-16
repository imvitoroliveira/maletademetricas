// NOTE: This page is sent to end users. It MUST NOT include raw error messages
// or stack traces, which can leak internal file paths, dependency names, and
// credential fragments (and could enable reflected XSS if interpolated unescaped).
// Full error details are logged server-side only.
export function renderErrorPage(_error?: unknown): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; background: #fff; border-radius: 1rem; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .error-details { text-align: left; background: #fef2f2; border: 1px solid #fee2e2; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem; font-family: monospace; font-size: 12px; overflow: auto; max-height: 200px; color: #991b1b; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      
      ${errorMessage ? `
        <div class="error-details">
          <strong>Error:</strong> ${errorMessage}
          ${errorStack ? `<br><br><strong>Stack:</strong><br>${errorStack}` : ''}
        </div>
      ` : ''}

      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
