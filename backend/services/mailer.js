/**
 * Pro Market Algérie — Service d'envoi d'emails (SMTP via nodemailer)
 *
 * En production, configure les variables SMTP_* dans .env.
 * En développement, si le SMTP n'est pas configuré, les emails ne sont pas
 * envoyés : le contenu (et le lien de reset) est simplement loggué en console.
 */
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM      = process.env.SMTP_FROM || 'Pro Market Algérie <promarketalgerie@gmail.com>';

// Le SMTP est considéré « configuré » seulement si hôte + identifiants sont
// présents ET que le mot de passe n'est pas une valeur placeholder.
const PLACEHOLDER_PASS = ['your_smtp_password', 'COLLE_ICI_TON_MOT_DE_PASSE_APPLICATION'];
const isConfigured = Boolean(
  SMTP_HOST && SMTP_USER && SMTP_PASS && !PLACEHOLDER_PASS.includes(SMTP_PASS)
);

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      // 465 => connexion TLS implicite ; 587/25 => STARTTLS
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

/**
 * Envoie un email. Retourne true si réellement envoyé, false si simulé (dev).
 */
async function sendMail({ to, subject, text, html }) {
  if (!isConfigured) {
    console.log('\n📭  [mailer] SMTP non configuré — email simulé (non envoyé)');
    console.log('    To:', to);
    console.log('    Subject:', subject);
    console.log('    ' + (text || '').replace(/\n/g, '\n    '));
    console.log('');
    return false;
  }
  await getTransporter().sendMail({ from: FROM, to, subject, text, html });
  return true;
}

/**
 * Email de réinitialisation de mot de passe.
 * @returns {boolean} true si envoyé via SMTP, false si simulé (dev).
 */
async function sendPasswordResetEmail(to, resetUrl) {
  const subject = 'Réinitialisation de votre mot de passe — Pro Market Algérie';
  const text =
    `Bonjour,\n\n` +
    `Vous avez demandé la réinitialisation de votre mot de passe sur Pro Market Algérie.\n` +
    `Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe (valable 1 heure) :\n\n` +
    `${resetUrl}\n\n` +
    `Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : ` +
    `votre mot de passe restera inchangé.\n\n` +
    `— L'équipe Pro Market Algérie`;
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
      <h2 style="color:#ea580c">Réinitialisation du mot de passe</h2>
      <p>Bonjour,</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe sur
         <strong>Pro Market Algérie</strong>. Ce lien est valable <strong>1 heure</strong>.</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${resetUrl}" style="background:#ea580c;color:#fff;text-decoration:none;
           padding:12px 28px;border-radius:8px;display:inline-block;font-weight:600">
          Réinitialiser mon mot de passe
        </a>
      </p>
      <p style="font-size:13px;color:#6b7280">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        <a href="${resetUrl}">${resetUrl}</a></p>
      <p style="font-size:13px;color:#6b7280">Si vous n'êtes pas à l'origine de cette demande,
         ignorez cet email : votre mot de passe restera inchangé.</p>
      <p style="margin-top:24px">— L'équipe Pro Market Algérie</p>
    </div>`;
  return sendMail({ to, subject, text, html });
}

module.exports = { sendMail, sendPasswordResetEmail, isConfigured };
