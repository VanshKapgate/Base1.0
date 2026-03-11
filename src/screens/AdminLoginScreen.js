import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useAuth, ADMIN_PASSKEY } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function AdminLoginScreen({ navigation }) {
  const { loginAsAdmin } = useAuth();
  const { theme } = useTheme();
  const [masterKey, setMasterKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleAdminLogin = async () => {
    if (!masterKey.trim()) return;
    setLoading(true);
    try {
      await loginAsAdmin(masterKey.trim());
    } catch (e) {
      Alert.alert('Access Denied', 'Wrong master passkey.');
    } finally {
      setLoading(false);
    }
  };

  const s = styles(theme);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.container}
    >
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>
      <View style={s.center}>
        <Text style={s.crown}>👑</Text>
        <Text style={s.title}>Admin Access</Text>
        <Text style={s.sub}>For authorized personnel only</Text>

        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Master passkey..."
            placeholderTextColor={theme.subText}
            value={masterKey}
            onChangeText={setMasterKey}
            secureTextEntry={!show}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShow(!show)}>
            <Text style={s.eye}>{show ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.btn} onPress={handleAdminLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Access Admin Panel</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  backBtn: { padding: 20, paddingTop: 50 },
  backText: { color: theme.primary, fontSize: 16, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  crown: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: theme.text, marginBottom: 6 },
  sub: { fontSize: 14, color: theme.subText, marginBottom: 36, textAlign: 'center' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.border,
  },
  input: {
    flex: 1,
    height: 52,
    color: theme.text,
    fontSize: 16,
  },
  eye: { fontSize: 20, padding: 4 },
  btn: {
    width: '100%',
    backgroundColor: theme.adminBadge,
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.adminBadge,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  btnText: { color: '#1A1A00', fontWeight: '800', fontSize: 16 },
});
