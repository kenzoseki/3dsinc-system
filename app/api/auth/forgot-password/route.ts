import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createHmac } from 'crypto'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'alertas@3dsinc.com.br'

function gerarToken(email: string, expiraEm: number): string {
  const payload = `${email}:${expiraEm}`
  if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET não configurado')
  const hmac = createHmac('sha256', process.env.NEXTAUTH_SECRET)
    .update(payload)
    .digest('hex')
  return Buffer.from(`${payload}:${hmac}`).toString('base64url')
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ erro: 'Email obrigatório' }, { status: 400 })
    }

    // Sempre retorna sucesso para não expor se o email existe
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, nome: true, email: true, ativo: true },
    })

    if (usuario && usuario.ativo) {
      const expiraEm = Date.now() + 60 * 60 * 1000 // 1 hora
      const token = gerarToken(usuario.email, expiraEm)
      const link = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`

      try {
        await resend.emails.send({
          from: FROM,
          to: usuario.email,
          subject: '3D Sinc — Redefinir senha',
          html: `
            <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px">
              <h2 style="font-family:Nunito,sans-serif;color:#5B47C8;margin-bottom:16px">Redefinir senha</h2>
              <p style="color:#2C2A26;font-size:14px;line-height:1.6">
                Olá ${usuario.nome},<br><br>
                Recebemos uma solicitação para redefinir sua senha no sistema 3D Sinc.
                Clique no botão abaixo para criar uma nova senha:
              </p>
              <div style="text-align:center;margin:28px 0">
                <a href="${link}" style="display:inline-block;padding:12px 32px;background:#5B47C8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
                  Redefinir minha senha
                </a>
              </div>
              <p style="color:#6B6860;font-size:12px;line-height:1.5">
                Este link expira em 1 hora. Se você não solicitou a redefinição, ignore este email.
              </p>
            </div>
          `,
        })
      } catch (erroEmail) {
        console.error('Erro ao enviar email de reset:', erroEmail)
      }
    }

    // Sempre retorna sucesso (segurança — não expõe se email existe)
    return NextResponse.json({ mensagem: 'Se o email estiver cadastrado, você receberá um link para redefinir a senha.' })
  } catch (erro) {
    console.error('Erro no forgot-password:', erro)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
