/**
 * src/pages/AgentDebug.jsx
 * Page de debug pour les agents - affiche les informations de l'utilisateur courant
 */

import { useAuth } from "@/contexts/AuthContext";
import { getRoleEffectif, estAgent } from "@/lib/roles";
import { chargerAgents } from "@/lib/assignation";
import { useEffect, useState } from "react";

export default function AgentDebug() {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const roleEffectif = getRoleEffectif(user);
  const isAgent = estAgent(user);

  useEffect(() => {
    chargerAgentsDebug();
  }, []);

  const chargerAgentsDebug = async () => {
    try {
      setLoading(true);
      const agentsList = await chargerAgents();
      setAgents(agentsList);
      setError(null);
    } catch (err) {
      console.error("Erreur lors du chargement des agents:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🐛 Debug Agent</h1>

        {/* Utilisateur courant */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Utilisateur courant
          </h2>
          {user ? (
            <div className="space-y-3 font-mono text-sm">
              <div className="p-3 bg-gray-100 rounded">
                <div className="text-gray-600">Email:</div>
                <div className="text-gray-900">{user.email}</div>
              </div>
              <div className="p-3 bg-gray-100 rounded">
                <div className="text-gray-600">Nom complet:</div>
                <div className="text-gray-900">{user.full_name || "N/A"}</div>
              </div>
              <div className="p-3 bg-gray-100 rounded">
                <div className="text-gray-600">Rôle plateforme (user.role):</div>
                <div className="text-gray-900">{user.role || "N/A"}</div>
              </div>
              <div className="p-3 bg-gray-100 rounded">
                <div className="text-gray-600">Type compte (user.type_compte):</div>
                <div className="text-gray-900">{user.type_compte || "N/A"}</div>
              </div>
              <div className="p-3 bg-blue-100 rounded border-l-4 border-blue-500">
                <div className="text-gray-600">Rôle effectif:</div>
                <div className="text-blue-900 font-bold">{roleEffectif}</div>
              </div>
              <div className="p-3 bg-green-100 rounded border-l-4 border-green-500">
                <div className="text-gray-600">Est agent?</div>
                <div className="text-green-900 font-bold">
                  {isAgent ? "✅ OUI" : "❌ NON"}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-red-600">Aucun utilisateur connecté</div>
          )}
        </div>

        {/* Liste des agents */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Agents disponibles
          </h2>
          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
              {error}
            </div>
          )}
          {loading && (
            <div className="text-gray-600">Chargement...</div>
          )}
          {!loading && agents.length === 0 && (
            <div className="text-gray-600">Aucun agent trouvé</div>
          )}
          {!loading && agents.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Nom
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {agents.map((agent, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {agent.courriel}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {agent.nom}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          agent.type === "directeur"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {agent.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* JSON brut */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Données brutes (JSON)
          </h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify({ user, roleEffectif, isAgent }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
