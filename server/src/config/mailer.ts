import nodemailer from 'nodemailer';
import { env } from './env.js';

export const mailer = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
});

export async function sendMail(to: string, subject: string, html: string, text: string) {
  if (!env.smtp.host) {
    console.log(`[mailer] SMTP not configured — would send to ${to}: ${subject}\n${text}`);
    return;
  }
  await mailer.sendMail({ from: env.smtp.fromAddress, to, subject, html, text });
}
