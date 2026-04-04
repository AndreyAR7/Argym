import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';

export default function Index() {
  const { session, user } = useAuthStore();

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  const role = user?.primaryRole;
  if (role === 'admin') return <Redirect href="/(admin)" />;
  if (role === 'coach') return <Redirect href="/(coach)" />;
  return <Redirect href="/(client)" />;
}
