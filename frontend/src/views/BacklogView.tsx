import React, { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical } from 'lucide-react';
import api from '../api';
import type { Task } from '../types';
import { PRIORIDADE_LABEL } from '../types';

interface BacklogViewProps {
  projetoId: number | null;
  onNewCard: () => void;
  onOpenCard: (id: number) => void;
}

export default function BacklogView({ projetoId, onNewCard, onOpenCard }: BacklogViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!projetoId) return;
    setLoading(true);
    api.get<Task[]>(`/tasks/?projeto_id=${projetoId}&status=BACKLOG`)
      .then(res => setTasks(res.data))
      .finally(() => setLoading(false));
  }, [projetoId]);

  const filteredTasks = tasks.filter(t => t.titulo.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Backlog de Tasks</h1>
          <p className="text-gray-500 text-sm">Gestão de tasks não atribuídas à sprint.</p>
        </div>
        <button onClick={onNewCard} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center shadow-sm">
          <Plus size={18} className="mr-2" /> Nova Task
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="relative w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Buscar no backlog..." 
            />
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridade</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onOpenCard(task.id)}>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">#{task.id}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-800">{task.titulo}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      task.prioridade === 'ALTA' || task.prioridade === 'CRITICA' ? 'bg-red-100 text-red-800' : 
                      task.prioridade === 'MEDIA' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {PRIORIDADE_LABEL[task.prioridade]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button className="text-gray-400 hover:text-blue-600"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && !loading && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Backlog vazio</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}