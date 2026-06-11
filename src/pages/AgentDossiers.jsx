/**
 * src/pages/AgentDossiers.jsx
 * Page de gestion des dossiers pour les agents
 */

import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { estAgent } from "@/lib/roles";
import { useAuth } from "@/lib/AuthContext";

export default function AgentDossiers() {
  const { user } = useAuth();
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !estAgent(user)) {
      setError("Accès non autorisé");
      setLoading(false);
      return;
    }

    chargerDossiers();
  }, [user]);

  const chargerDossiers = async () => {
    try {
      setLoading(true);
      // Récupère les dossiers assignés à cet agent
      const allDossiers = await base44.entities.LeadDossier.list();
      const mesDossiers = allDossiers.filter(
        d => d.agent_assigne_courriel === user.email
      );
      setDossiers(mesDossiers);
      setError(null);
    } catch (err) {
      console.error("Erreur lors du chargement des dossiers:", err);
      setError("Impossible de charger les dossiers");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mes Dossiers</h1>

        {dossiers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">Aucun dossier assigné</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    ID Dossier
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Date d'assignation
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dossiers.map(dossier => (
                  <tr key={dossier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {dossier.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {dossier.client_nom || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {dossier.statut || "Non démarré"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {dossier.date_assignation
                        ? new Date(dossier.date_assignation).toLocaleDateString("fr-FR")
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <a
                        href={`/dossier/${dossier.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Voir détails
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
