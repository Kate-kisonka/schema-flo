import nodemailer from "nodemailer";

const CODE_SUBJECT = "Код входа в Schema Flo";

function buildCodeText(code, ttlMinutes) {
  return `Ваш код подтверждения Schema Flo: ${code}. Он действует ${ttlMinutes} минут.`;
}

async function sendViaResend(email, code, ttlMinutes) {
  const from = process.env.EMAIL_FROM || "Schema Flo <noreply@schema-flo.app>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: CODE_SUBJECT,
      text: buildCodeText(code, ttlMinutes),
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Resend failed: ${response.status} ${message}`);
  }
}

function getSmtpConfig() {
  const user = process.env.SMTP_USER || process.env.YANDEX_SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.YANDEX_SMTP_PASS;
  if (!user || !pass) return null;

  const host = process.env.SMTP_HOST || "smtp.yandex.ru";
  const port = Number(process.env.SMTP_PORT || (host.includes("yandex") ? 465 : 587));
  const secure = process.env.SMTP_SECURE !== "false" && port === 465;

  return {
    host,
    port,
    secure,
    auth: { user, pass },
    from: process.env.EMAIL_FROM || `Schema Flo <${user}>`,
  };
}

async function sendViaSmtp(email, code, ttlMinutes) {
  const smtp = getSmtpConfig();
  if (!smtp) return false;

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
  });

  await transporter.sendMail({
    from: smtp.from,
    to: email,
    subject: CODE_SUBJECT,
    text: buildCodeText(code, ttlMinutes),
  });
  return true;
}

export async function sendVerificationEmail(email, code, ttlMinutes) {
  if (process.env.RESEND_API_KEY) {
    await sendViaResend(email, code, ttlMinutes);
    return;
  }

  if (await sendViaSmtp(email, code, ttlMinutes)) {
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[auth] verification code for ${email}: ${code}`);
    return;
  }

  throw new Error(
    "Email provider is not configured. Set RESEND_API_KEY or YANDEX_SMTP_USER + YANDEX_SMTP_PASS (or SMTP_*)."
  );
}
