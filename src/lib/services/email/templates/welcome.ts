interface WelcomeEmailProps {
  name: string;
  username: string;
  password?: string;
  loginUrl: string;
}

export function generateWelcomeEmailHtml({
  name,
  username,
  password,
  loginUrl,
}: WelcomeEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Personal Assistant Hub</title>
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
      color: #ff6b6b;
      text-decoration: none;
    }
    .card {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .welcome-text {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #111827;
    }
    .credentials-box {
      background-color: #f7f7f7;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
      border: 1px solid #e5e7eb;
    }
    .credential-row {
      margin-bottom: 10px;
    }
    .credential-row:last-child {
      margin-bottom: 0;
    }
    .credential-label {
      font-weight: 600;
      color: #666666;
      font-size: 14px;
      display: block;
      margin-bottom: 4px;
    }
    .credential-value {
      font-family: monospace;
      font-size: 16px;
      color: #333333;
      background: #ffffff;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
    }
    .button {
      display: inline-block;
      background-color: #ff6b6b;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin-top: 20px;
      text-align: center;
    }
    .button:hover {
      background-color: #ff5252;
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
      <div class="welcome-text">¡Bienvenido, ${name}!</div>
      
      <p>Tu cuenta ha sido creada exitosamente. Estamos emocionados de ayudarte a seguir el viaje de tu bebé hacia los alimentos sólidos.</p>
      
      <div class="credentials-box">
        <div class="credential-row">
          <span class="credential-label">Nombre de usuario</span>
          <span class="credential-value">${username}</span>
        </div>
        ${
          password
            ? `
        <div class="credential-row">
          <span class="credential-label">Contraseña Temporal</span>
          <span class="credential-value">${password}</span>
        </div>
        `
            : ""
        }
      </div>

      ${
        password
          ? `
      <div class="warning">
        Por favor cambia tu contraseña inmediatamente después de tu primer inicio de sesión por motivos de seguridad.
      </div>
      `
          : ""
      }

      <div style="text-align: center;">
        <a href="${loginUrl}" class="button" style="color: #ffffff !important;">Iniciar Sesión en tu Cuenta</a>
      </div>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} Personal Assistant Hub. Todos los derechos reservados.</p>
      <p>Si no solicitaste esta cuenta, por favor ignora este correo.</p>
    </div>
  </div>
</body>
</html>
  `;
}
