export async function sendEmail({ to, subject, body }) {
  try {
    console.log('📧 Email:', { to, subject, body });
    const { base44 } = await import('@/api/base44Client');
    await base44.entities.Notification?.create?.({ destinataire: to, sujet: subject, contenu: body, statut: 'a_envoyer', date_creation: new Date().toISOString() }).catch(() => {});
    return { success: true };
  } catch (e) { return { success: false }; }
}
export function buildLeadEmail(d) {
  return { subject: `Nouveau lead - ${d.client_nom}`, body: `Client: ${d.client_nom}\nEmail: ${d.client_courriel}\nTél: ${d.client_telephone}\nUrgence: ${d.priorite_urgence}\nBesoins: ${(d.besoins_principaux||[]).join(', ')}\nMessage: ${d.notes_client||'Aucun'}` };
}
