import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { api } from '@/api/endpoints'
import type { Session } from '@/api/types'
import { FacebookLogo, GoogleLogo } from '@/components/layout/SocialIcons'
import { Field } from '@/components/shared/Field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { passwordSchema } from '@/features/account/schemas'
import { focusFirstInvalid, useFormErrors } from '@/hooks/use-form-errors'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { cn } from '@/lib/utils'
import { safeRedirect, withoutAuth } from './auth-search'
import { PasswordInput } from './PasswordInput'
import { completeLogin } from './session'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})

const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9._]{3,30}$/, 'Use de 3 a 30 letras minúsculas, números, ponto ou sublinhado.'),
    email: z.string().trim().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'As senhas não conferem.' })

/** Signed in: continue to the protected page that asked for it, or stay where the user was. */
function useFinish() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { redirect } = useSearch({ from: '__root__' })
  return async (session: Session) => {
    await completeLogin(session, queryClient)
    const target = safeRedirect(redirect)
    if (target) await navigate({ to: target, replace: true })
    else await navigate({ to: '.', search: (prev) => withoutAuth(prev), replace: true })
  }
}

/** Mobile frames use placeholder-only fields; labels stay available to assistive tech. */
function useFieldStyle() {
  const mobile = useIsMobile()
  return {
    mobile,
    hideLabel: mobile,
    input: mobile ? 'h-14 rounded-xl px-5 text-base' : 'h-11',
    button: mobile ? 'h-14 w-full rounded-xl text-base font-bold' : 'h-12 w-full font-bold',
  }
}

function LoginForm() {
  const finish = useFinish()
  const style = useFieldStyle()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState({ email: '', password: '' })
  const { errors, validate, fromApi } = useFormErrors<typeof values>()
  const login = useMutation({
    mutationFn: api.auth.login,
    onSuccess: finish,
    onError: (error) => {
      fromApi(error)
      focusFirstInvalid(formRef.current)
    },
  })

  return (
    <form
      ref={formRef}
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        const data = validate(loginSchema, values)
        if (data) login.mutate(data)
        else focusFirstInvalid(formRef.current)
      }}
    >
      <Field label="E-mail" hideLabel={style.hideLabel} error={errors.email}>
        {(a11y) => (
          <Input
            {...a11y}
            type="email"
            autoComplete="email"
            placeholder="contato@email.com"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            className={style.input}
          />
        )}
      </Field>
      <Field label="Senha" hideLabel={style.hideLabel} error={errors.password}>
        {(a11y) => (
          <PasswordInput
            {...a11y}
            autoComplete="current-password"
            placeholder={style.mobile ? 'Senha' : undefined}
            value={values.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
            className={style.input}
          />
        )}
      </Field>
      <p className="text-right text-sm">
        <span aria-disabled="true" title="Em breve" className="cursor-not-allowed text-primary/70">
          Esqueceu a senha? <span className="text-[10px] uppercase">(em breve)</span>
        </span>
      </p>
      {errors.form && (
        <p role="alert" className="text-sm text-destructive">
          {errors.form}
        </p>
      )}
      <Button type="submit" size="lg" className={cn(style.button, style.mobile && 'mt-6')} disabled={login.isPending}>
        {login.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}

function RegisterForm() {
  const finish = useFinish()
  const style = useFieldStyle()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState({ username: '', email: '', password: '', confirm: '' })
  const { errors, validate, fromApi } = useFormErrors<typeof values>()
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues({ ...values, [key]: e.target.value })
  const register = useMutation({
    mutationFn: api.auth.register,
    onSuccess: async (session) => {
      await finish(session)
      toast.success(`Bem-vindo à Kurio, ${session.user.username}!`)
    },
    onError: (error) => {
      fromApi(error)
      focusFirstInvalid(formRef.current)
    },
  })

  return (
    <form
      ref={formRef}
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        const data = validate(registerSchema, values)
        if (data) register.mutate({ username: data.username, email: data.email, password: data.password })
        else focusFirstInvalid(formRef.current)
      }}
    >
      <Field label="Nome de usuário" hideLabel={style.hideLabel} error={errors.username} hint={style.mobile ? undefined : 'Letras minúsculas, números, ponto ou sublinhado.'}>
        {(a11y) => (
          <Input
            {...a11y}
            autoComplete="username"
            autoCapitalize="none"
            placeholder={style.mobile ? 'Nome de usuário' : 'ex.: ana.coleciona'}
            value={values.username}
            onChange={set('username')}
            className={cn(style.input, style.mobile && 'text-center')}
          />
        )}
      </Field>
      <Field label="E-mail" hideLabel={style.hideLabel} error={errors.email}>
        {(a11y) => (
          <Input
            {...a11y}
            type="email"
            autoComplete="email"
            placeholder={style.mobile ? 'Digite seu e-mail' : 'contato@email.com'}
            value={values.email}
            onChange={set('email')}
            className={style.input}
          />
        )}
      </Field>
      <Field label="Senha" hideLabel={style.hideLabel} error={errors.password} hint={style.mobile ? undefined : 'Mínimo de 8 caracteres, com letras e números.'}>
        {(a11y) => (
          <PasswordInput {...a11y} autoComplete="new-password" placeholder={style.mobile ? 'Senha' : undefined} value={values.password} onChange={set('password')} className={style.input} />
        )}
      </Field>
      <Field label="Confirmar senha" hideLabel={style.hideLabel} error={errors.confirm}>
        {(a11y) => (
          <PasswordInput
            {...a11y}
            autoComplete="new-password"
            placeholder={style.mobile ? 'Confirmar senha' : undefined}
            value={values.confirm}
            onChange={set('confirm')}
            className={style.input}
          />
        )}
      </Field>
      {errors.form && (
        <p role="alert" className="text-sm text-destructive">
          {errors.form}
        </p>
      )}
      <Button type="submit" size="lg" className={cn(style.button, style.mobile && 'mt-6')} disabled={register.isPending}>
        {register.isPending ? 'Criando…' : style.mobile ? 'Criar perfil' : 'Criar conta'}
      </Button>
    </form>
  )
}

/**
 * Remembers the last focused element outside any dialog, so closing the URL-driven modal
 * puts keyboard users back where they were (falls back to the main content).
 */
function useReturnFocus() {
  const last = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const track = (e: FocusEvent) => {
      const el = e.target as HTMLElement
      if (!el.closest('[role="dialog"]')) last.current = el
    }
    document.addEventListener('focusin', track)
    return () => document.removeEventListener('focusin', track)
  }, [])
  return () => {
    const target = last.current?.isConnected ? last.current : document.getElementById('conteudo')
    target?.focus()
  }
}

function SocialButtons({ mobile }: { mobile: boolean }) {
  return (
    <div className="mt-8 space-y-3">
      <p className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">Ou continue com</p>
      {/* Social login is out of scope: rendered as clearly unavailable. */}
      {[
        { name: 'Google', Logo: GoogleLogo },
        { name: 'Facebook', Logo: FacebookLogo },
      ].map(({ name, Logo }) => (
        <Button key={name} variant="outline" className={cn('w-full gap-3', mobile && 'h-12 rounded-md')} disabled>
          <Logo className="size-5" aria-hidden />
          Continuar com {name} <span className="text-[10px] uppercase">(em breve)</span>
        </Button>
      ))}
    </div>
  )
}

/**
 * Login/register, opened by ?auth= on any page. Desktop: modal over the page (Figma
 * "home com login"). Mobile: full-screen frames ("Entrar" / "Criar perfil de colecionador").
 */
export function AuthDialog() {
  const { auth, motivo } = useSearch({ from: '__root__' })
  const navigate = useNavigate()
  const mobile = useIsMobile()
  const mode = auth ?? 'entrar'
  const tab = 'text-lg transition-colors'
  const contentRef = useRef<HTMLDivElement>(null)
  const returnFocus = useReturnFocus()
  const switchTo = (next: 'entrar' | 'cadastro') => ({ to: '.' as const, search: (prev: Record<string, unknown>) => ({ ...prev, auth: next }), replace: true })

  return (
    <Dialog
      open={Boolean(auth)}
      onOpenChange={(open) => {
        if (!open) void navigate({ to: '.', search: (prev) => withoutAuth(prev), replace: true })
      }}
    >
      <DialogContent
        ref={contentRef}
        // Start on the first field instead of the tab links.
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          contentRef.current?.querySelector<HTMLElement>('input')?.focus()
        }}
        // Opened through the URL (not a DialogTrigger), so restore focus ourselves.
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          returnFocus()
        }}
        className={cn(
          'max-h-[92dvh] gap-0 overflow-y-auto bg-card px-6 py-10 sm:max-w-lg sm:px-14 [&>button]:text-primary',
          'rounded-none border-0 border-b-8 border-b-primary',
          // Mobile: full-screen page instead of a floating card.
          'max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-h-dvh max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:border-b-0 max-md:bg-background max-md:px-7 max-md:pt-16',
        )}
      >
        {mobile && (
          <p aria-hidden className="mb-14 text-center font-display text-5xl font-bold tracking-[0.15em]">
            KURIO
          </p>
        )}
        {mobile ? (
          <p aria-hidden className="mb-8 text-center text-xl font-bold">
            {mode === 'entrar' ? 'Entrar' : 'Criar perfil de colecionador'}
          </p>
        ) : (
          <nav aria-label="Acesso à conta" className="mb-6 flex justify-center gap-3">
            <Link {...switchTo('entrar')} aria-current={mode === 'entrar' ? 'page' : undefined} className={cn(tab, mode === 'entrar' ? 'text-primary' : 'hover:text-primary')}>
              Entrar
            </Link>
            <span aria-hidden className="w-px bg-primary" />
            <Link {...switchTo('cadastro')} aria-current={mode === 'cadastro' ? 'page' : undefined} className={cn(tab, mode === 'cadastro' ? 'text-primary' : 'hover:text-primary')}>
              Criar conta
            </Link>
          </nav>
        )}
        <DialogTitle className="sr-only">{mode === 'entrar' ? 'Entrar na Kurio' : 'Criar conta na Kurio'}</DialogTitle>
        {motivo === 'expirada' && (
          <p role="alert" className="mb-4 rounded-md border border-primary/50 bg-secondary p-3 text-sm">
            Sua sessão expirou. Entre novamente para continuar de onde parou.
          </p>
        )}
        <DialogDescription className={cn('mb-6 text-center text-sm text-foreground', mobile && 'sr-only')}>
          {mode === 'entrar' ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.' : 'Crie sua conta para colecionar, favoritar e comprar NFTs.'}
        </DialogDescription>

        {mode === 'entrar' ? <LoginForm /> : <RegisterForm />}

        <SocialButtons mobile={mobile} />

        {mobile && (
          <p className="mt-10 text-center text-muted-foreground">
            {mode === 'entrar' ? 'Novo na Kurio? ' : 'Já tem uma conta? '}
            <Link {...switchTo(mode === 'entrar' ? 'cadastro' : 'entrar')} className="text-foreground underline-offset-4 hover:underline">
              {mode === 'entrar' ? 'Crie uma conta' : 'Entre'}
            </Link>
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
