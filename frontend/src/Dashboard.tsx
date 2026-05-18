// frontend/src/Dashboard.tsx
// App principal — integra login, sidebar, views e modais

import { useState, useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";

// ── Views ────────────────────────────────────────────────────────────────────
import BoardView from "./views/BoardView";
import BacklogView from "./views/BacklogView";
import SprintHistoryView from "./views/SprintHistoryView";
import AdminProjectsView from "./views/AdminProjectsView";

// ── Modais ───────────────────────────────────────────────────────────────────
import CardDetailModal from "./modals/CardDetailModal";
import CreateCardModal from "./modals/CreateCardModal";

// ── Tipos ────────────────────────────────────────────────────────────────────
import type { Cargo, Projeto, Sprint, Task, Usuario, AdminStats } from "./types";
import {
  CARGO_COLOR,
  STATUS_COLOR,
  PRIORIDADE_COLOR,
  TASK_STATUS_LABEL,
  PRIORIDADE_LABEL,
} from "./types";

const API_BASE = "http://localhost:8000/api";

// ─── API helper ───────────────────────────────────────────────────────────────

function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = localStorage.getItem("access_token");
  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) ?? {}),
    },
  }).then(async (res) => {
    if (!res.ok) throw await res.json();
    return res.json();
  });
}

// ─── Tipos locais ─────────────────────────────────────────────────────────────

interface UserProfile {
  id: number;
  username: string;
  email: string;
  cargo: Cargo;
}

// Navegação disponível por cargo
type NavItem =
  | "dashboard"
  | "board"
  | "backlog"
  | "sprints"
  | "projetos"
  | "usuarios";

interface NavEntry {
  id: NavItem;
  label: string;
  icon: string;
  cargos: Cargo[];
}

const NAV_ITEMS: NavEntry[] = [
  { id: "dashboard",  label: "Dashboard",  icon: "🏠", cargos: ["ADMIN", "GERENTE", "DEV", "QA"] },
  { id: "board",      label: "Quadro",     icon: "🗂️", cargos: ["ADMIN", "GERENTE", "DEV", "QA"] },
  { id: "backlog",    label: "Backlog",    icon: "📋", cargos: ["ADMIN", "GERENTE", "DEV", "QA"] },
  { id: "sprints",    label: "Sprints",    icon: "🏃", cargos: ["ADMIN", "GERENTE", "DEV", "QA"] },
  { id: "projetos",   label: "Projetos",   icon: "📁", cargos: ["ADMIN", "GERENTE"] },
  { id: "usuarios",   label: "Usuários",   icon: "👥", cargos: ["ADMIN"] },
];

// ─── Componentes de UI ────────────────────────────────────────────────────────

function Badge({ label, colors, size = "sm" }: {
  label: string;
  colors?: { bg: string; text: string };
  size?: "sm" | "md";
}) {
  const style: CSSProperties = {
    display: "inline-flex", alignItems: "center",
    padding: size === "sm" ? "2px 8px" : "4px 12px",
    borderRadius: 20,
    fontSize: size === "sm" ? 11 : 12,
    fontWeight: 600,
    background: colors?.bg ?? "#F3F4F6",
    color: colors?.text ?? "#374151",
    letterSpacing: 0.3,
    whiteSpace: "nowrap",
  };
  return <span style={style}>{label}</span>;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const bgColors  = ["#BFDBFE", "#A7F3D0", "#FDE68A", "#FBCFE8", "#DDD6FE"];
  const txtColors = ["#1E40AF", "#065F46", "#92400E", "#9D174D", "#5B21B6"];
  const idx = (name.charCodeAt(0) || 0) % bgColors.length;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bgColors[idx], color: txtColors[idx],
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  );
}

function StatCard({ icon, value, label, accent }: {
  icon: string; value: number | string; label: string; accent: string;
}) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14,
      padding: "1.25rem", display: "flex", flexDirection: "column", gap: 4,
      borderTop: `3px solid ${accent}`,
    }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 28, fontWeight: 700, color: "#111827", lineHeight: 1.1 }}>{value}</span>
      <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function SectionCard({ title, children, action }: {
  title: string; children: ReactNode; action?: ReactNode;
}) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", padding: "1.25rem", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#111827" }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "3rem" }}>
      <div style={{
        width: 32, height: 32,
        border: "3px solid #E5E7EB", borderTop: "3px solid #3B82F6",
        borderRadius: "50%", animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "2rem", color: "#9CA3AF", fontSize: 13 }}>{message}</div>
  );
}

// ─── Dashboard de conteúdo por cargo ─────────────────────────────────────────

function DashboardHome({ profile, onNavigate }: {
  profile: UserProfile;
  onNavigate: (view: NavItem) => void;
}) {
  const cargo = profile.cargo;
  const [stats,    setStats]    = useState<AdminStats | null>(null);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [sprints,  setSprints]  = useState<Sprint[]>([]);
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const calls: Promise<any>[] = [
      apiFetch("/projetos/").catch(() => []),
      apiFetch("/sprints/").catch(() => []),
      apiFetch("/tasks/").catch(() => []),
    ];
    if (cargo === "ADMIN") {
      calls.push(apiFetch("/admin/stats/").catch(() => null));
      calls.push(apiFetch("/admin/usuarios/").catch(() => []));
    }

    Promise.all(calls).then(([p, s, t, st, u]) => {
      setProjetos(p ?? []);
      setSprints(s ?? []);
      setTasks(t ?? []);
      if (cargo === "ADMIN") { setStats(st); setUsuarios(u ?? []); }
      setLoading(false);
    });
  }, [cargo]);

  if (loading) return <LoadingSpinner />;

  const sprintsAtivas = sprints.filter((s) => s.status === "ATIVA");

  // ── ADMIN ──────────────────────────────────────────────────────────────────
  if (cargo === "ADMIN") {
    return (
      <div>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Painel Admin</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>Visão geral do sistema</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
          <StatCard icon="👥" value={stats?.total_usuarios ?? usuarios.length}    label="Usuários ativos"    accent="#3B82F6" />
          <StatCard icon="📁" value={stats?.total_projetos ?? projetos.length}     label="Projetos"           accent="#10B981" />
          <StatCard icon="✉️" value={stats?.convites_pendentes ?? "—"}            label="Convites pendentes" accent="#F59E0B" />
          <StatCard icon="🏃" value={stats?.sprints_ativas ?? sprintsAtivas.length} label="Sprints ativas"   accent="#8B5CF6" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          <SectionCard title="Usuários recentes">
            {usuarios.length === 0 ? <EmptyState message="Nenhum usuário" /> : usuarios.slice(0, 5).map((u) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F3F4F6" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={u.nome} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{u.nome}</div>
                    <Badge label={u.cargo} colors={CARGO_COLOR[u.cargo] ?? CARGO_COLOR.DEV} />
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: u.ativo ? "#10B981" : "#EF4444" }}>
                  {u.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
            ))}
          </SectionCard>

          <SectionCard title="Ações rápidas">
            {([
              { label: "Ver quadro",     nav: "board"    as NavItem },
              { label: "Gerenciar projetos", nav: "projetos" as NavItem },
              { label: "Histórico de sprints", nav: "sprints" as NavItem },
              { label: "Gerenciar usuários",   nav: "usuarios" as NavItem },
            ]).map(({ label, nav }) => (
              <button key={label} onClick={() => onNavigate(nav)} style={{
                display: "block", width: "100%", textAlign: "left",
                background: "none", border: "1px solid #E5E7EB", borderRadius: 8,
                padding: "10px 14px", marginBottom: 8, cursor: "pointer",
                fontSize: 14, fontWeight: 500, color: "#374151",
              }}>
                {label} →
              </button>
            ))}
          </SectionCard>
        </div>
      </div>
    );
  }

  // ── GERENTE ────────────────────────────────────────────────────────────────
  if (cargo === "GERENTE") {
    return (
      <div>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Painel Gerente</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>Acompanhamento de sprints e equipe</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 20 }}>
          <StatCard icon="📁" value={projetos.length}                                            label="Projetos"       accent="#3B82F6" />
          <StatCard icon="🏃" value={sprintsAtivas.length}                                       label="Sprints ativas" accent="#10B981" />
          <StatCard icon="📋" value={tasks.length}                                                label="Total tasks"    accent="#F59E0B" />
          <StatCard icon="✅" value={tasks.filter((t) => t.status === "CONCLUIDO").length}       label="Concluídas"     accent="#8B5CF6" />
        </div>

        {sprintsAtivas.length > 0 && (
          <SectionCard title="Sprints ativas">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {sprintsAtivas.map((s) => {
                const pct = s.progresso ?? 0;
                return (
                  <div key={s.id} style={{ background: "#F9FAFB", borderRadius: 12, border: "1px solid #E5E7EB", padding: "1rem 1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{s.nome}</span>
                      <Badge label="ATIVA" colors={{ bg: "#D1FAE5", text: "#065F46" }} />
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>{s.total_tasks ?? "—"} tasks</div>
                    <div style={{ background: "#E5E7EB", borderRadius: 99, height: 6 }}>
                      <div style={{ background: "#3B82F6", borderRadius: 99, height: 6, width: `${pct}%`, transition: "width 0.6s ease" }} />
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>{Math.round(pct)}% concluído</div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        <SectionCard title="Tasks recentes da equipe">
          {tasks.length === 0 ? <EmptyState message="Nenhuma task" /> : tasks.filter((t) => t.status !== "BACKLOG").slice(0, 8).map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid #F3F4F6" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.titulo}</div>
                {t.responsavel_nome && <div style={{ fontSize: 12, color: "#9CA3AF" }}>{t.responsavel_nome}</div>}
              </div>
              <div style={{ display: "flex", gap: 6, marginLeft: 12, flexShrink: 0 }}>
                <Badge label={PRIORIDADE_LABEL[t.prioridade]} colors={PRIORIDADE_COLOR[t.prioridade]} />
                <Badge label={TASK_STATUS_LABEL[t.status]}    colors={STATUS_COLOR[t.status]} />
              </div>
            </div>
          ))}
        </SectionCard>
      </div>
    );
  }

  // ── DEV ───────────────────────────────────────────────────────────────────
  if (cargo === "DEV") {
    const minhas     = tasks; // /tasks/minhas/ já é chamada pela view; aqui usamos todas como fallback
    const emAndamento = minhas.filter((t) => t.status === "EM_ANDAMENTO");
    const todo        = minhas.filter((t) => t.status === "TODO");
    const bloqueadas  = minhas.filter((t) => t.status === "BLOQUEADO");
    const concluidas  = minhas.filter((t) => t.status === "CONCLUIDO");

    return (
      <div>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Meu Painel</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>Suas tasks e atividades</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 20 }}>
          <StatCard icon="⚡" value={emAndamento.length} label="Em andamento" accent="#F59E0B" />
          <StatCard icon="📋" value={todo.length}        label="A fazer"      accent="#3B82F6" />
          <StatCard icon="🚫" value={bloqueadas.length}  label="Bloqueadas"   accent="#EF4444" />
          <StatCard icon="✅" value={concluidas.length}  label="Concluídas"   accent="#10B981" />
        </div>

        <SectionCard
          title="Minhas tasks"
          action={
            <button onClick={() => onNavigate("board")} style={{
              fontSize: 12, padding: "5px 12px", borderRadius: 8,
              border: "1px solid #DBEAFE", background: "#EFF6FF",
              color: "#1D4ED8", cursor: "pointer", fontWeight: 500,
            }}>Ver quadro →</button>
          }
        >
          {minhas.length === 0 ? <EmptyState message="Nenhuma task atribuída" /> : minhas.slice(0, 10).map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid #F3F4F6" }}>
              <div style={{ fontWeight: 500, fontSize: 14, color: "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.titulo}</div>
              <div style={{ display: "flex", gap: 6, marginLeft: 12, flexShrink: 0 }}>
                <Badge label={PRIORIDADE_LABEL[t.prioridade]} colors={PRIORIDADE_COLOR[t.prioridade]} />
                <Badge label={TASK_STATUS_LABEL[t.status]}    colors={STATUS_COLOR[t.status]} />
              </div>
            </div>
          ))}
        </SectionCard>
      </div>
    );
  }

  // ── QA ────────────────────────────────────────────────────────────────────
  const paraRevisar = tasks.filter((t) => t.status === "REVISAO");
  const [feedback, setFeedback] = useState<Record<number, "ok" | "nok" | "err">>({});

  const handleAprovar = (id: number) => {
    apiFetch(`/tasks/${id}/`, { method: "PATCH", body: JSON.stringify({ status: "CONCLUIDO" }) })
      .then(() => setFeedback((f) => ({ ...f, [id]: "ok" })))
      .catch(() => setFeedback((f) => ({ ...f, [id]: "err" })));
  };
  const handleReprovar = (id: number) => {
    apiFetch(`/tasks/${id}/`, { method: "PATCH", body: JSON.stringify({ status: "EM_ANDAMENTO" }) })
      .then(() => setFeedback((f) => ({ ...f, [id]: "nok" })))
      .catch(() => setFeedback((f) => ({ ...f, [id]: "err" })));
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Painel QA</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>Tasks aguardando revisão</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard icon="🔍" value={paraRevisar.length} label="Para revisar" accent="#F59E0B" />
        <StatCard icon="✅" value={Object.values(feedback).filter((v) => v === "ok").length}  label="Aprovadas"  accent="#10B981" />
        <StatCard icon="↩️" value={Object.values(feedback).filter((v) => v === "nok").length} label="Reprovadas" accent="#EF4444" />
      </div>

      <SectionCard title="Aguardando revisão">
        {paraRevisar.length === 0 ? <EmptyState message="Nenhuma task aguardando revisão 🎉" /> : paraRevisar.map((t) => {
          const fb = feedback[t.id];
          return (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F3F4F6", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: "#111827" }}>{t.titulo}</div>
                {t.responsavel_nome && <div style={{ fontSize: 12, color: "#9CA3AF" }}>{t.responsavel_nome}</div>}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                <Badge label={PRIORIDADE_LABEL[t.prioridade]} colors={PRIORIDADE_COLOR[t.prioridade]} />
                {fb === "ok"  && <Badge label="Aprovado ✓"  colors={{ bg: "#D1FAE5", text: "#065F46" }} />}
                {fb === "nok" && <Badge label="Reprovado ✗" colors={{ bg: "#FEE2E2", text: "#991B1B" }} />}
                {fb === "err" && <Badge label="Erro"        colors={{ bg: "#FEE2E2", text: "#991B1B" }} />}
                {!fb && (
                  <>
                    <button onClick={() => handleAprovar(t.id)}  style={{ fontSize: 12, padding: "4px 12px", borderRadius: 8, border: "none", background: "#D1FAE5", color: "#065F46", cursor: "pointer", fontWeight: 600 }}>✓ Aprovar</button>
                    <button onClick={() => handleReprovar(t.id)} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 8, border: "none", background: "#FEE2E2", color: "#991B1B", cursor: "pointer", fontWeight: 600 }}>✗ Reprovar</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </SectionCard>
    </div>
  );
}

// ─── Painel de usuários (Admin) ───────────────────────────────────────────────

function UsuariosView() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");

  useEffect(() => {
    apiFetch("/admin/usuarios/")
      .then((data) => { setUsuarios(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = usuarios.filter((u) =>
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Usuários</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>Todos os usuários do sistema</p>
        </div>
        <input
          type="text"
          placeholder="Buscar usuário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "8px 14px", borderRadius: 8, border: "1px solid #D1D5DB",
            fontSize: 13, width: 220, outline: "none",
          }}
        />
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
              {["Usuário", "Email", "Cargo", "Status", "Desde"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={u.nome} size={32} />
                    <span style={{ fontWeight: 500, fontSize: 14, color: "#111827" }}>{u.nome}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: "#6B7280" }}>{u.email}</td>
                <td style={{ padding: "12px 16px" }}>
                  <Badge label={u.cargo} colors={CARGO_COLOR[u.cargo] ?? CARGO_COLOR.DEV} />
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: u.ativo ? "#10B981" : "#EF4444" }}>
                    {u.ativo ? "● Ativo" : "○ Inativo"}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "#9CA3AF" }}>
                  {u.criado_em ? new Date(u.criado_em).toLocaleDateString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Nenhum usuário encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Seletor de projeto/sprint para views contextuais ────────────────────────

function ContextSelector({ projetos, sprints, projetoId, sprintId, onProjeto, onSprint }: {
  projetos: Projeto[];
  sprints: Sprint[];
  projetoId: number | null;
  sprintId: number | null;
  onProjeto: (id: number) => void;
  onSprint: (id: number) => void;
}) {
  const sprintsDoProjeto = sprints.filter((s) => s.projeto_id === projetoId);

  const selectStyle: CSSProperties = {
    padding: "7px 12px", borderRadius: 8, border: "1px solid #D1D5DB",
    fontSize: 13, color: "#374151", background: "#fff", cursor: "pointer", outline: "none",
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 24px", background: "#F9FAFB",
      borderBottom: "1px solid #E5E7EB",
    }}>
      <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>Projeto:</span>
      <select style={selectStyle} value={projetoId ?? ""} onChange={(e) => onProjeto(Number(e.target.value))}>
        <option value="">Selecione um projeto</option>
        {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
      </select>

      {sprintsDoProjeto.length > 0 && (
        <>
          <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500, marginLeft: 8 }}>Sprint:</span>
          <select style={selectStyle} value={sprintId ?? ""} onChange={(e) => onSprint(Number(e.target.value))}>
            <option value="">Selecione uma sprint</option>
            {sprintsDoProjeto.map((s) => <option key={s.id} value={s.id}>{s.nome} ({s.status})</option>)}
          </select>
        </>
      )}
    </div>
  );
}

// ─── App principal ────────────────────────────────────────────────────────────

interface FormState {
  email: string;
  password: string;
  nome: string;
  regEmail: string;
}

export default function App() {
  // Auth state
  const [view,        setView]        = useState<"login" | "app">("login");
  const [form,        setForm]        = useState<FormState>({ email: "", password: "", nome: "", regEmail: "" });
  const [profile,     setProfile]     = useState<UserProfile | null>(null);
  const [error,       setError]       = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [isRegister,  setIsRegister]  = useState(false);

  // App state
  const [activeNav,  setActiveNav]  = useState<NavItem>("dashboard");
  const [projetos,   setProjetos]   = useState<Projeto[]>([]);
  const [sprints,    setSprints]    = useState<Sprint[]>([]);
  const [projetoId,  setProjetoId]  = useState<number | null>(null);
  const [sprintId,   setSprintId]   = useState<number | null>(null);

  // Modais
  const [openCardId,    setOpenCardId]    = useState<number | null>(null);
  const [showCreateCard, setShowCreateCard] = useState(false);

  // Verificar token salvo
  useEffect(() => {
    if (localStorage.getItem("access_token")) fetchProfile();
  }, []);

  // Carregar projetos e sprints após login
  useEffect(() => {
    if (view !== "app") return;
    Promise.all([
      apiFetch("/projetos/").catch(() => []),
      apiFetch("/sprints/").catch(() => []),
    ]).then(([p, s]) => {
      setProjetos(p);
      setSprints(s);
      // Pré-selecionar primeiro projeto e sprint ativa, se existirem
      if (p.length > 0 && !projetoId) {
        const pid = p[0].id;
        setProjetoId(pid);
        const ativa = (s as Sprint[]).find((sp) => sp.projeto_id === pid && sp.status === "ATIVA");
        if (ativa) setSprintId(ativa.id);
      }
    });
  }, [view]);

  const fetchProfile = async () => {
    try {
      const p = await apiFetch("/profile/") as UserProfile;
      setProfile(p);
      setView("app");
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  };

  const handleLogin = async () => {
    setError(""); setAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json() as { access?: string; refresh?: string; detail?: string; error?: string };
      if (!res.ok) throw data;
      localStorage.setItem("access_token", data.access!);
      localStorage.setItem("refresh_token", data.refresh!);
      await fetchProfile();
    } catch (err: unknown) {
      const e = err as { detail?: string; error?: string };
      setError(e?.detail ?? e?.error ?? "Credenciais inválidas.");
    } finally { setAuthLoading(false); }
  };

  const handleRegister = async () => {
    setError(""); setAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.regEmail, password: form.password, nome: form.nome, cargo: "DEV" }),
      });
      const data = await res.json() as { error?: string; detail?: string };
      if (!res.ok) throw data;
      setIsRegister(false);
      setError("✅ Conta criada! Faça login.");
    } catch (err: unknown) {
      const e = err as { detail?: string; error?: string };
      setError(e?.error ?? e?.detail ?? "Erro ao registrar.");
    } finally { setAuthLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setProfile(null);
    setView("login");
    setActiveNav("dashboard");
    setForm({ email: "", password: "", nome: "", regEmail: "" });
  };

  const handleProjetoChange = (pid: number) => {
    setProjetoId(pid);
    const ativa = sprints.find((s) => s.projeto_id === pid && s.status === "ATIVA");
    setSprintId(ativa?.id ?? (sprints.find((s) => s.projeto_id === pid)?.id ?? null));
  };

  const handleCardCreated = () => {
    // Força rerender da view ativa ao fechar o modal de criação
    setShowCreateCard(false);
    setActiveNav((prev) => prev); // trigger re-render
  };

  // ── Tela de login/registro ────────────────────────────────────────────────

  if (view === "login" || !profile) {
    const inputStyle: CSSProperties = {
      padding: "11px 14px", borderRadius: 10, border: "1px solid #D1D5DB",
      fontSize: 14, color: "#111827", outline: "none", width: "100%", boxSizing: "border-box",
    };

    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)",
        fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "1rem",
      }}>
        <div style={{
          background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB",
          padding: "2.5rem", width: "100%", maxWidth: 380,
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "2rem" }}>
            <div style={{ width: 36, height: 36, background: "#2563EB", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 20, color: "#111827" }}>Lazuli</span>
          </div>

          <h2 style={{ margin: "0 0 1.5rem", fontSize: 18, fontWeight: 700, color: "#111827" }}>
            {isRegister ? "Criar conta" : "Entrar"}
          </h2>

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16,
              background: error.startsWith("✅") ? "#D1FAE5" : "#FEE2E2",
              color:      error.startsWith("✅") ? "#065F46"  : "#991B1B",
            }}>{error}</div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {isRegister && (
              <input placeholder="Nome completo" value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                style={inputStyle} />
            )}
            <input placeholder="Email" type="email"
              value={isRegister ? form.regEmail : form.email}
              onChange={(e) => setForm(isRegister ? { ...form, regEmail: e.target.value } : { ...form, email: e.target.value })}
              style={inputStyle} />
            <input placeholder="Senha" type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") isRegister ? handleRegister() : handleLogin(); }}
              style={inputStyle} />
            <button
              onClick={isRegister ? handleRegister : handleLogin}
              disabled={authLoading}
              style={{
                padding: "12px", background: authLoading ? "#93C5FD" : "#2563EB",
                color: "#fff", border: "none", borderRadius: 10,
                fontSize: 14, fontWeight: 600, cursor: authLoading ? "not-allowed" : "pointer", marginTop: 4,
              }}
            >
              {authLoading ? "Aguarde..." : isRegister ? "Criar conta" : "Entrar"}
            </button>
          </div>

          <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: 13, color: "#6B7280" }}>
            {isRegister ? "Já tem conta? " : "Não tem conta? "}
            <span onClick={() => { setIsRegister(!isRegister); setError(""); }}
              style={{ color: "#2563EB", cursor: "pointer", fontWeight: 500 }}>
              {isRegister ? "Fazer login" : "Cadastre-se"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // ── App autenticado ───────────────────────────────────────────────────────

  const cargo   = profile.cargo;
  const navItems = NAV_ITEMS.filter((n) => n.cargos.includes(cargo));

  // Views que precisam do seletor de projeto/sprint na barra superior
  const needsContext = ["board", "backlog"].includes(activeNav);

  const renderContent = () => {
    switch (activeNav) {
      case "dashboard":
        return <DashboardHome profile={profile} onNavigate={setActiveNav} />;

      case "board":
        return (
          <BoardView
            sprintId={sprintId}
            projetoId={projetoId}
            onOpenCard={(id) => setOpenCardId(id)}
            onNewCard={() => setShowCreateCard(true)}
            isAdmin={cargo === "ADMIN"}
          />
        );

      case "backlog":
        return (
          <BacklogView
            projetoId={projetoId}
            onNewCard={() => setShowCreateCard(true)}
            onOpenCard={(id) => setOpenCardId(id)}
          />
        );

      case "sprints":
        return <SprintHistoryView />;

      case "projetos":
        return <AdminProjectsView />;

      case "usuarios":
        return <UsuariosView />;

      default:
        return null;
    }
  };

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: "#F9FAFB",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside style={{
        width: 220, background: "#fff", borderRight: "1px solid #E5E7EB",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        position: "sticky", top: 0, height: "100vh", flexShrink: 0,
      }}>
        {/* Logo */}
        <div>
          <div style={{ padding: "1.25rem 1rem", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "#2563EB", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 17, color: "#111827" }}>Lazuli</span>
          </div>

          {/* Nav */}
          <nav style={{ padding: "1rem 0.75rem" }}>
            {navItems.map((item) => {
              const active = activeNav === item.id;
              return (
                <div key={item.id} onClick={() => setActiveNav(item.id)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 8, cursor: "pointer",
                  fontSize: 14, fontWeight: active ? 600 : 500,
                  color: active ? "#1D4ED8" : "#374151",
                  background: active ? "#EFF6FF" : "transparent",
                  marginBottom: 2, transition: "all 0.15s",
                }}>
                  <span>{item.icon}</span>
                  {item.label}
                </div>
              );
            })}
          </nav>
        </div>

        {/* User footer */}
        <div style={{ padding: "1rem", borderTop: "1px solid #E5E7EB" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Avatar name={profile.username} size={34} />
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile.username}
              </div>
              <Badge label={cargo} colors={CARGO_COLOR[cargo]} />
            </div>
          </div>
          <button onClick={handleLogout} style={{
            width: "100%", background: "none", border: "1px solid #FCA5A5",
            borderRadius: 8, padding: "8px 0", color: "#EF4444",
            cursor: "pointer", fontSize: 13, fontWeight: 500,
          }}>Sair</button>
        </div>
      </aside>

      {/* ── Conteúdo principal ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Seletor de contexto (projeto/sprint) para views que precisam */}
        {needsContext && (
          <ContextSelector
            projetos={projetos}
            sprints={sprints}
            projetoId={projetoId}
            sprintId={sprintId}
            onProjeto={handleProjetoChange}
            onSprint={setSprintId}
          />
        )}

        <main style={{
          flex: 1,
          overflowY: "auto",
          ...(activeNav === "dashboard" ? { padding: "2rem", maxWidth: 1000, width: "100%", margin: "0 auto", boxSizing: "border-box" as const } : {}),
        }}>
          {renderContent()}
        </main>
      </div>

      {/* ── Modais ─────────────────────────────────────────────────────────── */}
      {openCardId !== null && (
        <CardDetailModal
          cardId={openCardId}
          onClose={() => setOpenCardId(null)}
        />
      )}

      {showCreateCard && (
        <CreateCardModal
          projetoId={projetoId}
          onClose={() => setShowCreateCard(false)}
          onSuccess={handleCardCreated}
        />
      )}
    </div>
  );
}