import { RETENTION_NOTICE } from '@estim8/shared';
import { env } from '../config/env.js';
import { sendMail } from '../config/mailer.js';

export async function sendVerificationEmail(email: string, rawToken: string, code: string) {
  const link = `${env.clientOrigin}/verify-email?token=${rawToken}`;
  const subject = 'Verify your estim8.com account';
  const text = `Welcome to estim8.com!\n\nVerify your email by clicking this link:\n${link}\n\nOr enter this 6-digit code on the verification screen: ${code}\n\nThis link/code expires in 24 hours.`;
  const html = `
    <p>Welcome to estim8.com!</p>
    <p><a href="${link}">Click here to verify your email</a></p>
    <p>Or enter this 6-digit code on the verification screen: <strong>${code}</strong></p>
    <p>This link/code expires in 24 hours.</p>
  `;
  await sendMail(email, subject, html, text);
}

export async function sendInviteEmail(email: string, sessionName: string, joinCode: string) {
  const link = `${env.clientOrigin}/join/${joinCode}`;
  const subject = `You're invited to a Planning Poker® session: ${sessionName}`;
  const text = `You've been invited to join the Planning Poker® session "${sessionName}".\n\nJoin here: ${link}\n\n${RETENTION_NOTICE}`;
  const html = `
    <p>You've been invited to join the Planning Poker® session <strong>${sessionName}</strong>.</p>
    <p><a href="${link}">Click here to join</a></p>
    <p style="color:#666;font-size:0.9em;">${RETENTION_NOTICE}</p>
  `;
  await sendMail(email, subject, html, text);
}
