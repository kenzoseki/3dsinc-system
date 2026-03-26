import { Cargo } from '@prisma/client'

export const Permissoes = {
  podeGerenciarEquipe:   (cargo: Cargo) => cargo === 'ADMIN',
  podeAcessarSistema:    (cargo: Cargo) => (['ADMIN', 'SOCIO'] as Cargo[]).includes(cargo),
  podeVerRelatorios:     (cargo: Cargo) => (['ADMIN', 'SOCIO'] as Cargo[]).includes(cargo),
  podeEscreverPedidos:   (cargo: Cargo) => (['ADMIN', 'SOCIO', 'GERENTE', 'OPERADOR'] as Cargo[]).includes(cargo),
  podeEscreverEstoque:   (cargo: Cargo) => (['ADMIN', 'SOCIO', 'GERENTE', 'OPERADOR'] as Cargo[]).includes(cargo),
  podeEscreverClientes:  (cargo: Cargo) => (['ADMIN', 'SOCIO', 'GERENTE', 'OPERADOR'] as Cargo[]).includes(cargo),
  podeUsarIA:            (cargo: Cargo) => (['ADMIN', 'SOCIO', 'GERENTE', 'OPERADOR'] as Cargo[]).includes(cargo),
  podeVerEquipe:         (cargo: Cargo) => (['ADMIN', 'SOCIO', 'GERENTE'] as Cargo[]).includes(cargo),
  podeVerCRM:            (cargo: Cargo) => (['ADMIN', 'SOCIO', 'GERENTE', 'OPERADOR'] as Cargo[]).includes(cargo),
  podeVerProducao:       (cargo: Cargo) => (['ADMIN', 'SOCIO', 'GERENTE', 'OPERADOR'] as Cargo[]).includes(cargo),
  podeVerSugestoes:      (cargo: Cargo) => (['ADMIN', 'SOCIO'] as Cargo[]).includes(cargo),
}
