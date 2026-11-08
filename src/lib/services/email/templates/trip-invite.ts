import { escapeHtml } from "./escape-html";

interface TripInviteEmailProps {
  displayName: string;
  tripName: string;
  inviteUrl: string;
}

export function generateTripInviteEmailHtml({
  displayName,
  tripName,
  inviteUrl,
}: TripInviteEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited: ${escapeHtml(tripName)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #2d3748;
      margin: 0;
      padding: 0;
      background-color: #f7f7f7;
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
      color: #3b82f6;
      text-decoration: none;
    }
    .card {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .title-text {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #111827;
    }
    .button {
      display: inline-block;
      background-color: #3b82f6;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin-top: 20px;
      text-align: center;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #9ca3af;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">Personal Assistant Hub</h1>
    </div>

    <div class="card">
      <div class="title-text">Hola, ${escapeHtml(displayName)}</div>
      <p>Te han invitado al viaje <strong>${escapeHtml(tripName)}</strong>. Entra para ver la lista de cosas que preparar.</p>
      <div style="text-align: center;">
        <a href="${escapeHtml(inviteUrl)}" class="button" style="color: #ffffff !important;">Ver mi viaje</a>
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
