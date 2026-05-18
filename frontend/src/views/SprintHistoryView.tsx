import React, { useState, useEffect } from 'react';
import { Archive } from 'lucide-react';
import api from '../api';
import type { Sprint } from '../types';

export default function SprintHistoryView() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Buscando sprints. Filtramos no frontend se necessário, ou passamos ?status=CONCLUIDA
    api.get<Sprint[]>('/sprints/')
      .then(res => {
        // Filtra para mostrar histórico (concluídas) ou todas
        setSprints(res.data); 
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Carregando histórico...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Histórico de Sprints</h1>
          <p className="text-gray-500 text-sm">Acompanhe as entregas realizadas.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto flex-1 p-2">
          <table className="min-w-full">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sprint</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Período</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Progresso</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sprints.map((sprint) => (
                <tr key={sprint.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                    <div className="flex items-center">
                      <Archive size={16} className="text-gray-400 mr-2" />
                      {sprint.nome}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {sprint.data_inicio && new Date(sprint.data_inicio).toLocaleDateString()} - {sprint.data_fim && new Date(sprint.data_fim).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${sprint.progresso || 0}%` }}></div>
                      </div>
                      <span>{Math.round(sprint.progresso || 0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      sprint.status === 'ATIVA' ? 'bg-green-100 text-green-800' : 
                      sprint.status === 'CONCLUIDA' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sprint.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}