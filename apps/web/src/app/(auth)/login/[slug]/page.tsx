import { LoginForm } from '../_components/login-form'

export default async function LoginSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <LoginForm slug={slug} />
}
