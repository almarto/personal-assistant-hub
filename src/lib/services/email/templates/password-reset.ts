import { escapeHtml } from "./escape-html";

interface PasswordResetEmailProps {
  name: string;
  token: string;
}

export function generatePasswordResetEmailHtml({
  name,
  token,
}: PasswordResetEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer Contraseña - Personal Assistant Hub</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f9fafb;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #6366f1;
      text-decoration: none;
    }
    .card {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .greeting-text {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #111827;
    }
    .token-box {
      background-color: #f3f4f6;
      border-radius: 6px;
      padding: 24px;
      margin: 24px 0;
      border: 1px dashed #d1d5db;
      text-align: center;
    }
    .token-value {
      font-family: monospace;
      font-size: 32px;
      letter-spacing: 4px;
      font-weight: bold;
      color: #1f2937;
      display: inline-block;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #9ca3af;
      font-size: 14px;
    }
    .warning {
      margin-top: 20px;
      font-size: 14px;
      color: #b45309;
      background-color: #fffbeb;
      padding: 10px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">Personal Assistant Hub</h1>
    </div>
    
    <div class="card">
      <div class="greeting-text">Hola, ${escapeHtml(name)}</div>
      
      <p>Hemos recibido una solicitud para restablecer tu contraseña. Si fuiste tú, por favor utiliza el siguiente código de verificación de 6 dígitos.</p>
      
      <div class="token-box">
        <span class="token-value">${escapeHtml(token)}</span>
      </div>

      <div class="warning">
        Este código es válido por los próximos 5 minutos. Si no solicitaste este cambio, por favor ignora este correo y asegúrate de que tu cuenta esté protegida.
      </div>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} Personal Assistant Hub. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
  `;
}
