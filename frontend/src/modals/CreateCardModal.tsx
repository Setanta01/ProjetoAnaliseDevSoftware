import React, { useState } from 'react';
import { X } from 'lucide-react';
import api from '../api';

interface CreateCardModalProps {
  projetoId: number | null;
  onClose: () => void;
  onSuccess: () => void; // Callback para atualizar a lista
}

export default function CreateCardModal({ projetoId, onClose, onSuccess }: CreateCardModalProps) {
  const [form, setForm] = useState({ titulo: '', descricao: '', prioridade: 'MEDIA' as any });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projetoId) return alert("Selecione um projeto primeiro");
    if (!form.titulo) return alert("Título obrigatório");

    setLoading(true);
    try {
      // O backend espera: titulo, descricao, prioridade, projeto_id
      await api.post('/tasks/', {
        titulo: form.titulo,
        descricao: form.descricao,
        prioridade: form.prioridade,
        projeto_id: projetoId,
        // O status padrão no backend é BACKLOG
      });
      onSuccess();
      onClose();
    } catch (error) {
      alert("Erro ao criar task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-slate-800">Criar Nova Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Título *</label>
            <input 
              type="text" 
              className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 outline-none" 
              value={form.titulo}
              onChange={e => setForm({ ...form, titulo: e.target.value })}
              placeholder="Título da task"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
            <textarea 
              className="w-full p-2.5 border border-gray-300 rounded-md h-24 resize-none text-sm focus:ring-blue-500 outline-none" 
              value={form.descricao}
              onChange={e => setForm({ ...form, descricao: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Prioridade</label>
            <select 
              className="w-full p-2.5 border border-gray-300 rounded-md bg-white text-sm outline-none"
              value={form.prioridade}
              onChange={e => setForm({ ...form, prioridade: e.target.value })}
            >
              <option value="BAIXA">Baixa</option>
              <option value="MEDIA">Média</option>
              <option value="ALTA">Alta</option>
              <option value="CRITICA">Crítica</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border text-gray-700 rounded-md hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Criando...' : 'Criar Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}