import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, FolderOpen } from 'lucide-react';
import api from '../api';
import type { Projeto } from '../types';

// ─── Modal de criação ─────────────────────────────────────────────────────────

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: (projeto: Projeto) => void;
}

function CreateProjectModal({ onClose, onSuccess }: CreateProjectModalProps) {
  const [nome,     setNome]     = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async () => {
    if (!nome.trim()) { setError('Nome é obrigatório.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.post<Projeto>('/projetos/', { nome: nome.trim(), descricao: descricao.trim() });
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao criar projeto.');
    } finally {
      setLoading(false);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 50, padding: '1rem',
  };

  const modalStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 16,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    width: '100%', maxWidth: 480,
    display: 'flex', flexDirection: 'column',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    border: '1px solid #D1D5DB', borderRadius: 8,
    fontSize: 14, color: '#111827', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #F3F4F6',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FolderOpen size={18} color="#2563EB" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Novo Projeto</h2>
              <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>Preencha os dados do projeto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, borderRadius: 6 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: 13,
              background: '#FEE2E2', color: '#991B1B',
            }}>{error}</div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Nome do projeto <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              style={inputStyle}
              placeholder="Ex: Sistema de Gestão"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Descrição <span style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF' }}>(opcional)</span>
            </label>
            <textarea
              style={{ ...inputStyle, height: 90, resize: 'none', lineHeight: 1.5 }}
              placeholder="Descreva o objetivo do projeto..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '1rem 1.5rem',
          borderTop: '1px solid #F3F4F6',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px', borderRadius: 8,
              border: '1px solid #E5E7EB', background: '#fff',
              color: '#374151', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '9px 18px', borderRadius: 8,
              border: 'none',
              background: loading ? '#93C5FD' : '#2563EB',
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)',
                  borderTop: '2px solid #fff', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite', display: 'inline-block',
                }} />
                Criando...
              </>
            ) : (
              <><Plus size={15} /> Criar projeto</>
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Modal de edição ──────────────────────────────────────────────────────────

interface EditProjectModalProps {
  projeto: Projeto;
  onClose: () => void;
  onSuccess: (projeto: Projeto) => void;
}

function EditProjectModal({ projeto, onClose, onSuccess }: EditProjectModalProps) {
  const [nome,     setNome]     = useState(projeto.nome);
  const [descricao, setDescricao] = useState(projeto.descricao ?? '');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async () => {
    if (!nome.trim()) { setError('Nome é obrigatório.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.patch<Projeto>(`/projetos/${projeto.id}/`, {
        nome: nome.trim(),
        descricao: descricao.trim(),
      });
      onSuccess({ ...projeto, ...res.data, nome: nome.trim(), descricao: descricao.trim() });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao editar projeto.');
    } finally {
      setLoading(false);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 50, padding: '1rem',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    border: '1px solid #D1D5DB', borderRadius: 8,
    fontSize: 14, color: '#111827', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid #F3F4F6' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Editar Projeto</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, background: '#FEE2E2', color: '#991B1B' }}>{error}</div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Nome <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input style={inputStyle} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Descrição</label>
            <textarea style={{ ...inputStyle, height: 80, resize: 'none', lineHeight: 1.5 }} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '1rem 1.5rem', borderTop: '1px solid #F3F4F6' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: loading ? '#93C5FD' : '#2563EB', color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirmação de exclusão ──────────────────────────────────────────────────

interface DeleteConfirmProps {
  projeto: Projeto;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function DeleteConfirm({ projeto, onClose, onConfirm, loading }: DeleteConfirmProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: '1rem',
    }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: 400, padding: '1.75rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
          <Trash2 size={20} color="#EF4444" />
        </div>
        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#111827' }}>Excluir projeto?</h3>
        <p style={{ margin: '0 0 1.5rem', fontSize: 14, color: '#6B7280', lineHeight: 1.5 }}>
          O projeto <strong style={{ color: '#111827' }}>{projeto.nome}</strong> e todas as suas sprints e tasks serão excluídos permanentemente. Essa ação não pode ser desfeita.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: loading ? '#FCA5A5' : '#EF4444', color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Excluindo...' : 'Sim, excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View principal ───────────────────────────────────────────────────────────

export default function AdminProjectsView() {
  const [projects,    setProjects]    = useState<Projeto[]>([]);
  const [searchTerm,  setSearchTerm]  = useState('');
  const [loading,     setLoading]     = useState(true);

  const [showCreate,  setShowCreate]  = useState(false);
  const [editingProj, setEditingProj] = useState<Projeto | null>(null);
  const [deletingProj, setDeletingProj] = useState<Projeto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    api.get<Projeto[]>('/projetos/')
      .then(res => { setProjects(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filteredProjects = projects.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.descricao ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreated = (novo: Projeto) => {
    setProjects((prev) => [novo, ...prev]);
  };

  const handleEdited = (atualizado: Projeto) => {
    setProjects((prev) => prev.map((p) => p.id === atualizado.id ? atualizado : p));
  };

  const handleDelete = async () => {
    if (!deletingProj) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/projetos/${deletingProj.id}/`);
      setProjects((prev) => prev.filter((p) => p.id !== deletingProj.id));
      setDeletingProj(null);
    } catch {
      alert('Erro ao excluir projeto.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>Projetos</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>
            {projects.length} projeto{projects.length !== 1 ? 's' : ''} no sistema
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
            <input
              type="text"
              style={{
                paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                border: '1px solid #D1D5DB', borderRadius: 8,
                fontSize: 13, color: '#111827', outline: 'none', width: 220,
                fontFamily: 'inherit',
              }}
              placeholder="Buscar projetos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: '#2563EB', color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={16} /> Novo Projeto
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #E5E7EB', borderTop: '3px solid #3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {['Nome do Projeto', 'Descrição', 'Criado em', 'Ações'].map((h, i) => (
                  <th key={h} style={{
                    padding: '12px 20px', textAlign: i === 3 ? 'right' : 'left',
                    fontSize: 11, fontWeight: 600, color: '#6B7280',
                    textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 3, height: 28, borderRadius: 99, background: '#3B82F6', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{project.nome}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#6B7280', maxWidth: 260 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {project.descricao || <span style={{ color: '#D1D5DB', fontStyle: 'italic' }}>Sem descrição</span>}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                    {project.criado_em
                      ? new Date(project.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                      <button
                        onClick={() => setEditingProj(project)}
                        title="Editar"
                        style={{ background: 'none', border: '1px solid transparent', borderRadius: 6, padding: 6, cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#DBEAFE'; e.currentTarget.style.background = '#EFF6FF'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'none'; }}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => setDeletingProj(project)}
                        title="Excluir"
                        style={{ background: 'none', border: '1px solid transparent', borderRadius: 6, padding: 6, cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#FEE2E2'; e.currentTarget.style.background = '#FFF5F5'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'none'; }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredProjects.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center' }}>
                    <div style={{ color: '#9CA3AF', fontSize: 13 }}>
                      {searchTerm ? `Nenhum projeto encontrado para "${searchTerm}"` : 'Nenhum projeto cadastrado ainda.'}
                    </div>
                    {!searchTerm && (
                      <button
                        onClick={() => setShowCreate(true)}
                        style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#EFF6FF', color: '#2563EB', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                      >
                        + Criar primeiro projeto
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modais */}
      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onSuccess={handleCreated}
        />
      )}

      {editingProj && (
        <EditProjectModal
          projeto={editingProj}
          onClose={() => setEditingProj(null)}
          onSuccess={handleEdited}
        />
      )}

      {deletingProj && (
        <DeleteConfirm
          projeto={deletingProj}
          onClose={() => setDeletingProj(null)}
          onConfirm={handleDelete}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}