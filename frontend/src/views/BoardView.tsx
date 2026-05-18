import React, { useState, useEffect } from 'react';
import { Filter, MoreHorizontal, MessageSquare, Plus, CheckSquare, List, Users } from 'lucide-react';
import api from '../api';
import type { Task, Usuario } from '../types';
import { Avatar } from '../components/ui'; // Usando o avatar existente

// Mapeamento de Status Backend -> Frontend
const STATUS_MAP: Record<string, string> = {
  'TODO': 'A Fazer',
  'EM_ANDAMENTO': 'Em Progresso',
  'REVISAO': 'Revisão',
  'CONCLUIDO': 'Concluído',
  'BACKLOG': 'Backlog',
  'BLOQUEADO': 'Bloqueado'
};

// Mapeamento Reverso (Frontend -> Backend)
const REVERSE_STATUS_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_MAP).map(([k, v]) => [v, k])
);

interface BoardViewProps {
  sprintId: number | null;
  projetoId: number | null;
  onOpenCard: (id: number) => void;
  onNewCard: () => void;
  isAdmin: boolean;
}

export default function BoardView({ sprintId, projetoId, onOpenCard, onNewCard, isAdmin }: BoardViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  useEffect(() => {
    if (!sprintId) return;
    setLoading(true);
    api.get<Task[]>(`/tasks/?sprint_id=${sprintId}`)
      .then(res => setTasks(res.data))
      .catch(err => console.error("Erro ao carregar tasks:", err))
      .finally(() => setLoading(false));
  }, [sprintId]);

  const columns = [
    { id: 'A Fazer', title: 'A Fazer' },
    { id: 'Em Progresso', title: 'Em Progresso' },
    { id: 'Revisão', title: 'Revisão' },
    { id: 'Concluído', title: 'Concluído' },
  ];

  const getPriorityWeight = (priority: string) => {
    switch (priority) {
      case 'CRITICA': return 4;
      case 'ALTA': return 3;
      case 'MEDIA': return 2;
      case 'BAIXA': return 1;
      default: return 0;
    }
  };

  const sortCards = (cards: Task[]) => {
    return [...cards].sort((a, b) => {
      const pA = getPriorityWeight(a.prioridade);
      const pB = getPriorityWeight(b.prioridade);
      if (pA !== pB) return pB - pA;
      // Fallback sort por data de criação se não houver due_date
      return new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime();
    });
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando quadro...</div>;
  if (!sprintId) return <div className="p-8 text-center text-gray-500">Selecione uma sprint ativa.</div>;

  return (
    <div className="h-full flex flex-col pt-6 px-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">Sprint Ativa</span>
            <span className="text-gray-500 text-sm">ID: {sprintId}</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Quadro da Sprint</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-100 p-1 rounded-md mr-2">
            <button onClick={() => setViewMode('kanban')} className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-sm transition ${viewMode === 'kanban' ? 'bg-white shadow-sm text-slate-800' : 'text-gray-500'}`}>
              <CheckSquare size={16} className="mr-2" /> Kanban
            </button>
            <button onClick={() => setViewMode('list')} className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-sm transition ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-gray-500'}`}>
              <List size={16} className="mr-2" /> Lista
            </button>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded shadow-sm text-sm font-medium flex items-center" onClick={onNewCard}>
            <Plus size={16} className="mr-2" /> Nova Task
          </button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <div className="flex flex-1 space-x-6 overflow-x-auto pb-6">
          {columns.map(col => {
            const colStatus = REVERSE_STATUS_MAP[col.id];
            const colCards = sortCards(tasks.filter(t => t.status === colStatus));
            
            return (
              <div key={col.id} className="w-80 flex flex-col shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-slate-800 text-lg">{col.title} <span className="text-gray-400 text-sm ml-2">({colCards.length})</span></h2>
                  <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal size={20} /></button>
                </div>
                <div className="flex-1 bg-gray-100 rounded-lg p-3 overflow-y-auto space-y-3 border border-gray-200">
                  {colCards.map(card => (
                    <div key={card.id} onClick={() => onOpenCard(card.id)} className="bg-white p-4 rounded-md shadow-sm border border-gray-200 cursor-pointer hover:shadow hover:border-blue-300 transition group relative">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${card.prioridade === 'ALTA' || card.prioridade === 'CRITICA' ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                          {card.prioridade}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800 leading-tight mb-4 group-hover:text-blue-600">
                        {card.titulo}
                      </h3>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-xs text-gray-500 font-mono">#{card.id}</span>
                        {card.responsavel_nome && <Avatar name={card.responsavel_nome} size={24} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-white rounded-lg border border-gray-200 mb-6">
           {/* Implementação simplificada da lista para não extender demais o código, 
               segue a mesma lógica de filtro do Kanban acima */}
           <div className="p-4 text-center text-gray-500">Modo lista não implementado nesta demo.</div>
        </div>
      )}
    </div>
  );
}