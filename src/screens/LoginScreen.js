import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  StatusBar, Image, ImageBackground,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function LoginScreen({ navigation }) {
  const { loginWithPasskey } = useAuth();
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [passkey, setPasskey] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);

  const handleLogin = async () => {
    if (!name.trim() || !passkey.trim()) {
      Alert.alert('Missing Fields', 'Please enter both your name and passkey.');
      return;
    }
    setLoading(true);
    try {
      await loginWithPasskey(name, passkey);
    } catch (err) {
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const s = styles(theme);

  return (
    <ImageBackground
      source={require('../../assets/login_bg.png')}
      style={s.bg}
      imageStyle={{ opacity: 0.12 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.container}
      >
        <StatusBar
          barStyle={theme.dark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        {/* Header */}
        <View style={s.header}>
          <Image
            source={require('../../assets/wizard_logo.png')}
            style={[s.logo, { tintColor: theme.primary }]}
            resizeMode="contain"
          />
          <Text style={s.appName}>PrivateChats</Text>
          <Text style={s.tagline}>Private. Exclusive. Yours.</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Welcome Back</Text>
          <Text style={s.cardSub}>Enter your credentials provided by the admin</Text>

          {/* Name Field */}
          <Text style={s.label}>Your Name</Text>
          <View style={s.inputRow}>
            <Text style={s.inputIcon}>👤</Text>
            <TextInput
              style={s.input}
              placeholder="Enter your name..."
              placeholderTextColor={theme.subText}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* Passkey Field */}
          <Text style={s.label}>Secret Passkey</Text>
          <View style={s.inputRow}>
            <Text style={s.inputIcon}>🔑</Text>
            <TextInput
              style={s.input}
              placeholder="Enter your passkey..."
              placeholderTextColor={theme.subText}
              value={passkey}
              onChangeText={setPasskey}
              secureTextEntry={!showPasskey}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPasskey(!showPasskey)}>
              <Text style={s.eyeIcon}>{showPasskey ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[s.loginBtn, loading && s.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.loginBtnText}>Enter PrivateChats 🚀</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = (theme) => StyleSheet.create({
  bg: { flex: 1, backgroundColor: theme.background },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: theme.subText,
    marginTop: 4,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: theme.subText,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.subText,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: {
    flex: 1,
    height: 52,
    color: theme.text,
    fontSize: 16,
  },
  eyeIcon: { fontSize: 18, padding: 4 },
  loginBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
