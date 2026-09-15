import 'dotenv/config'
import nodemailer from 'nodemailer'

const user = process.env.BREVO_SMTP_USER
const pass = process.env.BREVO_SMTP_PASS
const from = process.env.EMAIL_FROM
const to = process.argv[2] || 'areeshasattar127@gmail.com'

console.log('SMTP host:', process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com')
console.log('SMTP user:', user)
console.log('From:', from)
console.log('To:', to)
console.log('---')

const port = Number(process.env.BREVO_SMTP_PORT || 587)
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  port,
  secure: port === 465,
  auth: { user, pass },
})

try {
  await transporter.verify()
  console.log('✅ SMTP connection + auth OK')
} catch (e) {
  console.error('❌ SMTP verify failed:', e.message)
  process.exit(1)
}

try {
  const info = await transporter.sendMail({
    from,
    to,
    subject: 'SmartSchool SMTP test',
    html: '<p>If you received this, Brevo SMTP sending works.</p>',
  })
  console.log('✅ SEND ACCEPTED:', info.messageId, '|', info.response)
} catch (e) {
  console.error('❌ SEND FAILED:', e.message)
  if (e.response) console.error('SMTP server response:', e.response)
  if (e.rejected?.length) console.error('Rejected recipients:', e.rejected)
  process.exit(1)
}
