import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'mail.monplanfin.ca',
  port: 465,
  secure: true,
  auth: {
    user: 'notification@monplanfin.ca',
    pass: import.meta.env.VITE_EMAIL_PASS || '',
  },
});

export async function sendEmail({ to, subject, body }) {
  try {
    await transporter.sendMail({
      from: '"MonPlanFin" <notification@monplanfin.ca>',
      to,
      subject,
      text: body,
    });
    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error };
  }
}

export function buildLeadEmail(d) {
  return {
    subject: `Nouveau lead - ${d.client_nom}`,
    body: `Nouveau lead MonPlanFin:\n\nClient: ${d.client_nom}\nEmail: ${d.client_courriel}\nTél: ${d.client_telephone}\nUrgence: ${d.priorite_urgence}\nBesoins: ${(d.besoins_principaux || []).join(', ')}\nMessage: ${d.notes_client || 'Aucun'}\n\nhttps://mon-plan-fia.base44.app/admin-dossiers`,
    to: 'votre-email@monplanfin.ca',
  };
}
