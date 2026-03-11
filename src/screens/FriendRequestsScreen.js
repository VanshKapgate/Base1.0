import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import {
  collection, query, where, onSnapshot,
  updateDoc, deleteDoc, doc, getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

export default function FriendRequestsScreen() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const s = styles(theme);

  useEffect(() => {
    const q = query(
      collection(db, 'friendRequests'),
      where('toUid', '==', user?.uid),
      where('status', '==', 'pending'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const accept = async (req) => {
    setActing(req.id);
    try {
      await updateDoc(doc(db, 'friendRequests', req.id), { status: 'accepted' });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setActing(null);
    }
  };

  const reject = async (req) => {
    setActing(req.id);
    try {
      await deleteDoc(doc(db, 'friendRequests', req.id));
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setActing(null);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Friend Requests</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading
        ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        : <FlatList
            data={requests}
            keyExtractor={i => i.id}
            renderItem={({ item }) => {
              const isActing = acting === item.id;
              return (
                <View style={s.reqRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{item.fromName?.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{item.fromName}</Text>
                    <Text style={s.sub}>Wants to be your friend</Text>
                  </View>
                  {isActing
                    ? <ActivityIndicator color={theme.primary} />
                    : <View style={s.actions}>
                        <TouchableOpacity style={s.acceptBtn} onPress={() => accept(item)}>
                          <Text style={s.acceptText}>✓ Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.rejectBtn} onPress={() => reject(item)}>
                          <Text style={s.rejectText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                  }
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={s.emptyView}>
                <Text style={s.emptyEmoji}>🤝</Text>
                <Text style={s.emptyTitle}>No Pending Requests</Text>
                <Text style={s.emptySub}>Friend requests will appear here</Text>
              </View>
            }
          />
      }
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  back: { color: theme.primary, fontSize: 16, fontWeight: '600', width: 60 },
  title: { fontSize: 17, fontWeight: '700', color: theme.text },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    gap: 14,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: theme.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 20 },
  name: { fontSize: 16, fontWeight: '600', color: theme.text },
  sub: { fontSize: 12, color: theme.subText, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rejectBtn: {
    backgroundColor: theme.inputBg,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  rejectText: { color: theme.subText, fontWeight: '700', fontSize: 13 },
  emptyView: { flex: 1, alignItems: 'center', paddingTop: 100 },
  emptyEmoji: { fontSize: 56, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
  emptySub: { fontSize: 14, color: theme.subText, marginTop: 6 },
});
