import { View, ActivityIndicator } from 'react-native';

// This screen is only shown briefly while the AuthGuard in _layout.tsx
// determines where to redirect the user. It must NOT contain any redirect
// logic — _layout.tsx is the single source of truth for navigation.
export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}
