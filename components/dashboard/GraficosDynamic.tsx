'use client'

import dynamic from 'next/dynamic'
import type {
  DadoPedidoStatusTempo,
  DadoFilamento,
  DadoTipoPedido,
  DadoReceita,
} from './Graficos'

const skeletonGrafico = <div className="skeleton" style={{ height: '260px', borderRadius: '10px' }} />

export const GraficioPedidosStatusDynamic = dynamic(
  () => import('./Graficos').then(m => m.GraficioPedidosStatus),
  { ssr: false, loading: () => skeletonGrafico }
)

export const GraficoReceitaDynamic = dynamic(
  () => import('./Graficos').then(m => m.GraficoReceita),
  { ssr: false, loading: () => skeletonGrafico }
)

export const GraficoFilamentosDynamic = dynamic(
  () => import('./Graficos').then(m => m.GraficoFilamentos),
  { ssr: false, loading: () => skeletonGrafico }
)

export const GraficoTipoPedidoDynamic = dynamic(
  () => import('./Graficos').then(m => m.GraficoTipoPedido),
  { ssr: false, loading: () => skeletonGrafico }
)

// Re-export types for convenience
export type { DadoPedidoStatusTempo, DadoFilamento, DadoTipoPedido, DadoReceita }
