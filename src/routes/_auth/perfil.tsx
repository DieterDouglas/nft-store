import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError } from '@/api/client'
import { api, qk } from '@/api/endpoints'
import { sessionStore } from '@/api/session-store'
import type { User } from '@/api/types'
import { Field } from '@/components/shared/Field'
import { QueryError } from '@/components/shared/StateMessage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AccountLayout } from '@/features/account/AccountLayout'
import { changePasswordSchema, profileSchema } from '@/features/account/schemas'
import { PasswordInput } from '@/features/auth/PasswordInput'
import { focusFirstInvalid, useFormErrors } from '@/hooks/use-form-errors'
import { useSession } from '@/hooks/use-session'

export const Route = createFileRoute('/_auth/perfil')({
  component: ProfilePage,
})

/** Downscales to a 256px WebP so avatars stay small (mock DB lives in localStorage). */
async function toAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const scale = Math.max(size / bitmap.width, size / bitmap.height)
  const w = bitmap.width * scale
  const h = bitmap.height * scale
  canvas.getContext('2d')!.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h)
  return canvas.toDataURL('image/webp', 0.85)
}

function useWriteUser() {
  const userId = useSession()!.user.id
  const queryClient = useQueryClient()
  return (user: User) => {
    queryClient.setQueryData(qk.profile(userId), user)
    sessionStore.updateUser(user)
  }
}

function AvatarField({ user }: { user: User }) {
  const write = useWriteUser()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>()
  const upload = useMutation({
    mutationFn: api.profile.avatar,
    onSuccess: (u) => {
      write(u)
      setError(undefined)
      toast.success(u.avatarUrl ? 'Avatar atualizado.' : 'Avatar removido.')
    },
    onError: (e) => setError(toApiError(e).fields.avatar ?? toApiError(e).message),
  })

  return (
    <div className="space-y-2">
      <p id="avatar-label" className="text-sm">
        Avatar
      </p>
      <div className="flex flex-wrap items-center gap-6" role="group" aria-labelledby="avatar-label">
        <span className="grid size-16 place-items-center overflow-hidden rounded-full bg-muted">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="Seu avatar" className="size-full object-cover" /> : <ImageIcon aria-hidden className="size-7 text-primary" />}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Escolher imagem de avatar"
          aria-describedby="avatar-help"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setError('Envie uma imagem PNG, JPG ou WebP.')
            if (file.size > 5 * 1024 * 1024) return setError('A imagem deve ter até 5 MB.')
            try {
              upload.mutate(await toAvatarDataUrl(file))
            } catch {
              setError('Não foi possível ler esta imagem.')
            }
          }}
        />
        <Button type="button" className="h-11 px-8 font-bold" disabled={upload.isPending} onClick={() => inputRef.current?.click()}>
          {upload.isPending ? 'Enviando…' : 'Alterar'}
        </Button>
        <Button type="button" variant="ghost" disabled={upload.isPending || !user.avatarUrl} onClick={() => upload.mutate(null)}>
          Remover
        </Button>
      </div>
      <p id="avatar-help" className="text-xs text-muted-foreground">
        PNG, JPG ou WebP até 5 MB, recortada em formato quadrado.
      </p>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

const EMPTY_PASSWORD = { currentPassword: '', newPassword: '', confirm: '' }

function ProfileForm({ user }: { user: User }) {
  const write = useWriteUser()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState({ name: user.name, username: user.username, email: user.email, ensName: user.ensName ?? '', walletNickname: user.walletNickname })
  const [password, setPassword] = useState(EMPTY_PASSWORD)
  const profileErrors = useFormErrors<typeof values>()
  const passwordErrors = useFormErrors<typeof password>()
  const [saving, setSaving] = useState(false)

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues({ ...values, [key]: e.target.value })
  const setPw = (key: keyof typeof password) => (e: React.ChangeEvent<HTMLInputElement>) => setPassword({ ...password, [key]: e.target.value })
  const changingPassword = Object.values(password).some(Boolean)

  // One "Salvar" for both blocks, as in the layout; the password only changes when filled in.
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const profile = profileErrors.validate(profileSchema, values)
    const pw = changingPassword ? passwordErrors.validate(changePasswordSchema, password) : (passwordErrors.clear(), null)
    if (!profile || (changingPassword && !pw)) return focusFirstInvalid(formRef.current)

    setSaving(true)
    try {
      try {
        write(await api.profile.update(profile))
      } catch (error) {
        profileErrors.fromApi(error)
        return focusFirstInvalid(formRef.current)
      }
      if (pw) {
        try {
          await api.profile.password({ currentPassword: pw.currentPassword, newPassword: pw.newPassword })
          setPassword(EMPTY_PASSWORD)
        } catch (error) {
          passwordErrors.fromApi(error)
          toast.success('Dados do perfil salvos.')
          return focusFirstInvalid(formRef.current)
        }
      }
      toast.success(pw ? 'Perfil e senha atualizados. Outras sessões foram encerradas.' : 'Perfil atualizado.')
    } finally {
      setSaving(false)
    }
  }

  const pe = profileErrors.errors
  const pwe = passwordErrors.errors
  return (
    <form ref={formRef} noValidate onSubmit={submit} aria-labelledby="perfil-titulo" className="space-y-8">
      <h1 id="perfil-titulo" className="font-bold">
        Perfil do colecionador
      </h1>
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
        <Field label="Nome de exibição" required error={pe.name}>
          {(a11y) => <Input {...a11y} autoComplete="name" value={values.name} onChange={set('name')} className="h-12" />}
        </Field>
        <Field label="Nome de usuário" required error={pe.username}>
          {(a11y) => <Input {...a11y} autoComplete="username" value={values.username} onChange={set('username')} className="h-12" />}
        </Field>
        <Field label="E-mail" required error={pe.email}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="email" value={values.email} onChange={set('email')} className="h-12" />}
        </Field>
        <Field label="Nome ENS" hint="Opcional. Sem o sufixo .eth." error={pe.ensName}>
          {(a11y) => (
            <div className="flex gap-3">
              <span className="grid h-12 place-items-center rounded-md border border-input px-4 text-sm" aria-hidden>
                .eth
              </span>
              <Input {...a11y} value={values.ensName} onChange={set('ensName')} className="h-12" placeholder="seunome" />
            </div>
          )}
        </Field>
        <Field label="Apelido da carteira" required error={pe.walletNickname}>
          {(a11y) => <Input {...a11y} value={values.walletNickname} onChange={set('walletNickname')} className="h-12" />}
        </Field>
        <AvatarField user={user} />
      </div>

      <fieldset className="max-w-xl space-y-5">
        <legend className="mb-5 font-bold">Alterar senha</legend>
        <p className="text-xs text-muted-foreground">Preencha apenas se quiser trocar a senha.</p>
        <Field label="Senha atual" error={pwe.currentPassword}>
          {(a11y) => <PasswordInput {...a11y} autoComplete="current-password" value={password.currentPassword} onChange={setPw('currentPassword')} className="h-12" />}
        </Field>
        <Field label="Nova senha" hint="Mínimo de 8 caracteres, com letras e números." error={pwe.newPassword}>
          {(a11y) => <PasswordInput {...a11y} autoComplete="new-password" value={password.newPassword} onChange={setPw('newPassword')} className="h-12" />}
        </Field>
        <Field label="Confirmar nova senha" error={pwe.confirm}>
          {(a11y) => <PasswordInput {...a11y} autoComplete="new-password" value={password.confirm} onChange={setPw('confirm')} className="h-12" />}
        </Field>
      </fieldset>

      {(pe.form || pwe.form) && (
        <p role="alert" className="text-sm text-destructive">
          {pe.form ?? pwe.form}
        </p>
      )}
      <Button type="submit" size="lg" className="h-12 min-w-44 font-bold" disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  )
}

function ProfilePage() {
  const userId = useSession()!.user.id
  const profile = useQuery({ queryKey: qk.profile(userId), queryFn: ({ signal }) => api.profile.get({ signal }) })

  return (
    <AccountLayout>
      {profile.isPending ? (
        <div className="grid gap-6 md:grid-cols-2" aria-busy="true" aria-label="Carregando perfil">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="shimmer h-20 rounded-md" />
          ))}
        </div>
      ) : profile.isError ? (
        <QueryError error={profile.error} onRetry={() => void profile.refetch()} />
      ) : (
        <ProfileForm key={profile.data.id} user={profile.data} />
      )}
    </AccountLayout>
  )
}
