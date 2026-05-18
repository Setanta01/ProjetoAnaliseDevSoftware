import React, { useState, useEffect } from 'react';
import { X, ChevronUp, AlertCircle } from 'lucide-react';
import api from '../api';
// 1. Importe os tipos específicos
import type { Task, TaskStatus, Prioridade } from '../types';

interface CardDetailModalProps {
  cardId: number | null;
  onClose: () => void;
}

export default function CardDetailModal({ cardId, onClose }: CardDetailModalProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // 2. Altere a tipagem dos estados. Eles podem ser o tipo específico OU uma string vazia inicialmente.
  const [editStatus, setEditStatus] = useState<TaskStatus | ''>('');
  const [editPrioridade, setEditPrioridade] = useState<Prioridade | ''>('');

  useEffect(() => {
    if (!cardId) return;
    setLoading(true);
    api.get<Task>(`/tasks/${cardId}/`)
      .then(res => {
        setTask(res.data);
        setEditStatus(res.data.status);
        setEditPrioridade(res.data.prioridade);
      })
      .finally(() => setLoading(false));
  }, [cardId]);

  const handleUpdate = async () => {
    if (!task) return;
    setUpdating(true);
    try {
      await api.patch(`/tasks/${task.id}/`, {
        // 3. O axios envia como string, o backend aceita string, então aqui está ok.
        // Mas para o setTask local, precisamos garantir o tipo.
        status: editStatus,
        prioridade: editPrioridade
      });

      // 4. Aqui o TypeScript reclama se tentarmos passar uma string vazia para Task.status.
      // Usamos "as TaskStatus" para garantir que o tipo está correto, pois sabemos que o select só envia valores válidos.
      setTask({ 
        ...task, 
        status: editStatus as TaskStatus, 
        prioridade: editPrioridade as Prioridade 
      });
      
      alert("Atualizado com sucesso!");
    } catch (error) {
      alert("Erro ao atualizar");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full">Carregando...</div>;
  if (!task) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <span className="font-mono text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">#{task.id}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">{task.titulo}</h1>
          
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label>
              <select 
                className="w-full p-2 border rounded text-sm"
                value={editStatus}
                // 5. Fazemos o cast aqui no onChange também
                onChange={e => setEditStatus(e.target.value as TaskStatus)}
              >
                <option value="BACKLOG">Backlog</option>
                <option value="TODO">A Fazer</option>
                <option value="EM_ANDAMENTO">Em Progresso</option>
                <option value="REVISAO">Revisão</option>
                <option value="CONCLUIDO">Concluído</option>
                <option value="BLOQUEADO">Bloqueado</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Prioridade</label>
              <select 
                className="w-full p-2 border rounded text-sm"
                value={editPrioridade}
                // 6. E aqui também
                onChange={e => setEditPrioridade(e.target.value as Prioridade)}
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-800 mb-2 border-b pb-2">Descrição</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{task.descricao || "Sem descrição."}</p>
          </div>
          
          {task.responsavel_nome && (
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">Responsável</h3>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm mr-2">
                  {task.responsavel_nome.substring(0,2).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700">{task.responsavel_nome}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={handleUpdate} 
            disabled={updating}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium shadow-sm disabled:opacity-50"
          >
            {updating ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}