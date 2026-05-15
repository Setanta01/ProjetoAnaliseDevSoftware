import AdminDashboard from './Admindashboard'
import GerenteDashboard from './Gerentedashboard'
import DevDashboard from './Devdashboard'
import QADashboard from './Qadashboard'
import type { JSX } from 'react'

export type Cargo = 'ADMIN' | 'GERENTE' | 'DEV' | 'QA'

interface Props {
  cargo: string
}

const dashboards: Record<Cargo, JSX.Element> = {
  ADMIN:   <AdminDashboard />,
  GERENTE: <GerenteDashboard />,
  DEV:     <DevDashboard />,
  QA:      <QADashboard />,
}

// Função auxiliar para verificar se a string é um Cargo válido
function isCargo(value: string): value is Cargo {
  return ['ADMIN', 'GERENTE', 'DEV', 'QA'].includes(value)
}

export default function DashboardRouter({ cargo }: Props) {
  // Se for um cargo válido, busca no objeto. Se não, mostra erro.
  return isCargo(cargo) 
    ? dashboards[cargo] 
    : <p style={{ padding: '2rem', color: '#dc2626' }}>Cargo desconhecido: {cargo}</p>
}