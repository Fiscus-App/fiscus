import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Fiscus <onboarding@resend.dev>'
const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://fiscus-peach.vercel.app'

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const url = `${BASE_URL}/verify-email?token=${token}`

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Verify your Fiscus account',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07091a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07091a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0d1222;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:32px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:rgba(212,168,67,0.12);border:1px solid rgba(212,168,67,0.3);border-radius:12px;width:44px;height:44px;text-align:center;vertical-align:middle;">
                <span style="color:#d4a843;font-size:22px;line-height:44px;">⚡</span>
              </td>
              <td style="padding-left:12px;">
                <div style="color:#d4a843;font-size:20px;font-weight:600;">Fiscus</div>
                <div style="color:rgba(255,255,255,0.4);font-size:11px;font-family:monospace;letter-spacing:0.08em;">AUSTRALIAN FINANCIAL INTELLIGENCE</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;color:#eef2ff;font-size:22px;font-weight:600;">Welcome, ${name} 👋</h1>
          <p style="margin:0 0 24px;color:rgba(238,242,255,0.6);font-size:14px;line-height:1.6;">
            You're one step away from full access to Fiscus — AI-powered Australian financial briefings, live ASX data, and RBA insights.
          </p>
          <p style="margin:0 0 24px;color:rgba(238,242,255,0.6);font-size:14px;line-height:1.6;">
            Click the button below to verify your email address. This link expires in <strong style="color:#eef2ff;">1 hour</strong>.
          </p>

          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background:#d4a843;border-radius:12px;box-shadow:0 4px 20px rgba(212,168,67,0.3);">
              <a href="${url}" style="display:inline-block;padding:14px 32px;color:#07091a;font-size:14px;font-weight:700;text-decoration:none;border-radius:12px;">
                Verify Email Address
              </a>
            </td></tr>
          </table>

          <p style="margin:0;color:rgba(238,242,255,0.35);font-size:11px;font-family:monospace;">
            Or copy this link: <span style="color:rgba(238,242,255,0.5);">${url}</span>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;color:rgba(255,255,255,0.25);font-size:11px;text-align:center;">
            If you didn't create a Fiscus account, you can safely ignore this email.<br/>
            Fiscus is a financial news service — not financial advice.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${BASE_URL}/reset-password?token=${token}`

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your Fiscus password',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07091a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07091a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0d1222;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
        <tr><td style="padding:32px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:rgba(212,168,67,0.12);border:1px solid rgba(212,168,67,0.3);border-radius:12px;width:44px;height:44px;text-align:center;vertical-align:middle;">
              <span style="color:#d4a843;font-size:22px;line-height:44px;">⚡</span>
            </td>
            <td style="padding-left:12px;">
              <div style="color:#d4a843;font-size:20px;font-weight:600;">Fiscus</div>
              <div style="color:rgba(255,255,255,0.4);font-size:11px;font-family:monospace;letter-spacing:0.08em;">AUSTRALIAN FINANCIAL INTELLIGENCE</div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;color:#eef2ff;font-size:22px;font-weight:600;">Reset your password</h1>
          <p style="margin:0 0 24px;color:rgba(238,242,255,0.6);font-size:14px;line-height:1.6;">
            We received a request to reset your Fiscus password. Click the button below — this link expires in <strong style="color:#eef2ff;">1 hour</strong>.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background:#d4a843;border-radius:12px;box-shadow:0 4px 20px rgba(212,168,67,0.3);">
              <a href="${url}" style="display:inline-block;padding:14px 32px;color:#07091a;font-size:14px;font-weight:700;text-decoration:none;border-radius:12px;">
                Reset Password
              </a>
            </td></tr>
          </table>
          <p style="margin:0;color:rgba(238,242,255,0.35);font-size:11px;font-family:monospace;">
            If you didn't request this, you can safely ignore this email. Your password won't change.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;color:rgba(255,255,255,0.25);font-size:11px;text-align:center;">
            Fiscus is a financial news service — not financial advice.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
