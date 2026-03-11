import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, StatusBar, ActivityIndicator,
} from 'react-native';
import {
  collection, getDocs, addDoc, serverTimestamp,
  query, where, getDocs as _getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

export default function AddFriendScreen() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const [allUsers, setAllUsers] = useState([]);
  const [relations, setRelations] = useState({}); // uid -> 'pending'|'accepted'|'incoming'
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(null);

  const s = styles(theme);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    // Fetch all users (excluding self)
    const usersSnap = await getDocs(collection(db, 'users'));
    const users = usersSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(u => u.id !== user?.uid);

    // Fetch all friend requests involving me
    const [sentSnap, recvSnap] = await Promise.all([
      getDocs(query(collection(db, 'friendRequests'), where('fromUid', '==', user?.uid))),
      getDocs(query(collection(db, 'friendRequests'), where('toUid', '==', user?.uid))),
    ]);

    const rel = {};
    sentSnap.docs.forEach(d => {
      const data = d.data();
      rel[data.toUid] = data.status === 'accepted' ? 'accepted' : 'pending';
    });
    recvSnap.docs.forEach(d => {
      const data = d.data();
      if (data.status === 'accepted') rel[data.fromUid] = 'accepted';
      else if (!rel[data.fromUid]) rel[data.fromUid] = 'incoming';
    });

    setRelations(rel);
    setAllUsers(users);
    setLoading(false);
  };

  const sendRequest = async (targetUid) => {
    setSending(targetUid);
    try {
      await addDoc(collection(db, 'friendRequests'), {
        fromUid: user?.uid,
        fromName: user?.name,
        toUid: targetUid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setRelations(prev => ({ ...prev, [targetUid]: 'pending' }));
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSending(null);
    }
  };

  const filtered = allUsers.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getRelLabel = (uid) => {
    const r = relations[uid];
    if (r === 'accepted') return { label: '✓ Friends', color: theme.online };
    if (r === 'pending') return { label: '⏳ Pending', color: theme.subText };
    if (r === 'incoming') return { label: '📩 Accept?', color: theme.primary };
    return null;
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Add Friend</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.searchRow}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Search by name..."
          placeholderTextColor={theme.subText}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading
        ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        : <FlatList
            data={filtered}
            keyExtractor={i => i.id}
            renderItem={({ item }) => {
              const rel = getRelLabel(item.id);
              const isSending = sending === item.id;
              const canSend = !relations[item.id];
              const isIncoming = relations[item.id] === 'incoming';

              return (
                <View style={s.userRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.userName}>{item.name}</Text>
                    <Text style={s.userRole}>
                      {item.role === 'apostle' ? '⭐ Apostle' : '👤 Member'}
                    </Text>
                  </View>
                  {rel ? (
                    <View style={[s.statusBadge, isIncoming && { backgroundColor: `${theme.primary}22` }]}>
                      <Text style={[s.statusText, { color: rel.color }]}>{rel.label}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={s.addBtn}
                      onPress={() => sendRequest(item.id)}
                      disabled={isSending}
                    >
                      {isSending
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={s.addBtnText}>+ Add</Text>
                      }
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={s.emptyText}>No users found</Text>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: theme.inputBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchIcon: { fontSize: 18, marginRight: 8 },
  searchInput: { flex: 1, height: 46, color: theme.text, fontSize: 15 },
  userRow: {
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
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: theme.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  userName: { fontSize: 15, fontWeight: '600', color: theme.text },
  userRole: { fontSize: 12, color: theme.subText, marginTop: 2 },
  addBtn: {
    backgroundColor: theme.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.inputBg,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: theme.subText, marginTop: 60, fontSize: 15 },
});
