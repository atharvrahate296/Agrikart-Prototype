import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(__filename)

const otpStore = new Map<string, { code: string; expiresAt: Date }>()

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

function loadTemplate(templateName: string, vars: Record<string, string>): string {
  const templatePath = path.join(__dirname, 'templates', `${templateName}.html`)
  let html: string
  try {
    html = fs.readFileSync(templatePath, 'utf-8')
  } catch {
    return Object.entries(vars).reduce((acc, [k, v]) => acc + `\n${k}: ${v}`, `AgriKart — ${templateName}\n`)
  }
  for (const [key, value] of Object.entries(vars)) {
    html = html.split(`{{${key}}}`).join(value)
    html = html.split(`{{ .${key} }}`).join(value)
    html = html.split(`{{.${key}}}`).join(value)
    html = html.split(`{{ .ConfirmationURL }}`).join(value)
    html = html.split(`{{.ConfirmationURL}}`).join(value)
  }
  return html
}

async function sendMail(to: string, subject: string, text: string, html: string): Promise<void> {
  const mailOptions = {
    from: process.env.SMTP_FROM || `"AgriKart" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  }
  try {
    await transporter.sendMail(mailOptions)
  } catch (err) {
    console.error('[emailService] sendMail failed:', err)
    throw new Error('Failed to send email. Please check SMTP configuration.')
  }
}

export const emailService = {
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  },

  async sendOTP(email: string): Promise<void> {
    const otp = this.generateOTP()
    otpStore.set(email, { code: otp, expiresAt: new Date(Date.now() + 5 * 60 * 1000) })
    const html = loadTemplate('password-reset', { OTP_CODE: otp })
    await sendMail(
      email, 
      '🔐 Your AgriKart Password Reset Code',
      `Your password reset code is: ${otp}\nExpires in 5 minutes.`,
      html
    )
  },

  async sendVerificationEmail(email: string, confirmationUrl: string): Promise<void> {
    try {
      const html = loadTemplate('verification', { CONFIRMATION_URL: confirmationUrl, ConfirmationURL: confirmationUrl })
      await sendMail(
        email, 
        '✅ Verify your AgriKart account',
        `Please verify your AgriKart account by visiting: ${confirmationUrl}`,
        html
      )
    } catch (err) {
      console.error('[emailService] sendVerificationEmail caught error:', err)
      // Log error without breaking signup registration flow
    }
  },

  async verifyOTP(email: string, code: string): Promise<boolean> {
    const stored = otpStore.get(email)
    if (!stored) return false
    if (stored.code !== code.trim()) return false
    if (new Date() > stored.expiresAt) {
      otpStore.delete(email)
      return false
    }
    return true
  },

  async clearOTP(email: string): Promise<void> {
    otpStore.delete(email)
  },
}
