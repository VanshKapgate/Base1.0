import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, StatusBar, ActivityIndicator,
} from 'react-native';
import {
  collection, getDocs, addDoc, serverTimestamp, query, where,
  doc, getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

export default function NewChatScreen() {
  const { user, isAdmin } = useAuth();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const s = styles(theme);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    if (isAdmin) {
      // Admin sees everyone
      const snap = await getDocs(collection(db, 'users'));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(all);
    } else {
      // Regular users: only accepted friends
      const [sentSnap, recvSnap] = await Promise.all([
        getDocs(query(collection(db, 'friendRequests'),
          where('fromUid', '==', user?.uid),
          where('status', '==', 'accepted'))),
        getDocs(query(collection(db, 'friendRequests'),
          where('toUid', '==', user?.uid),
          where('status', '==', 'accepted'))),
      ]);

      const friendUids = [
        ...sentSnap.docs.map(d => d.data().toUid),
        ...recvSnap.docs.map(d => d.data().fromUid),
      ];

      if (friendUids.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Fetch user docs for each friend uid
      const friendDocs = await Promise.all(
        friendUids.map(uid => getDoc(doc(db, 'users', uid)))
      );
      const friends = friendDocs
        .filter(d => d.exists())
        .map(d => ({ id: d.id, ...d.data() }));
      setUsers(friends);
    }
    setLoading(false);
  };

  const startChat = async (otherUser) => {
    const q = query(
      collection(db, 'chats'),
      where('type', '==', 'direct'),
      where('members', 'array-contains', user.uid),
    );
    const snap = await getDocs(q);
    const existing = snap.docs.find(d => {
      const m = d.data().members;
      return m.includes(otherUser.id);
    });

    if (existing) {
      navigation.replace('Chat', {
        chatId: existing.id,
        chat: { id: existing.id, ...existing.data() },
      });
      return;
    }

    const chatRef = await addDoc(collection(db, 'chats'), {
      type: 'direct',
      members: [user.uid, otherUser.id],
      memberNames: [user.name, otherUser.name],
      displayNames: {
        [user.uid]: otherUser.name,
        [otherUser.id]: user.name,
      },
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      unreadCount: { [user.uid]: 0, [otherUser.id]: 0 },
      createdAt: serverTimestamp(),
    });

    navigation.replace('Chat', {
      chatId: chatRef.id,
      chat: { id: chatRef.id, type: 'direct', members: [user.uid, otherUser.id] },
    });
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>New Message</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.searchRow}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Search..."
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
            renderItem={({ item }) => (
              <TouchableOpacity style={s.userRow} onPress={() => startChat(item)}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
                  <View style={[s.dot, { backgroundColor: item.isOnline ? theme.online : theme.offline }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.userName}>{item.name}</Text>
                  <Text style={s.userRole}>
                    {item.role === 'apostle' ? '⭐ Apostle' : '👤 Member'}
                    {' · '}
                    {item.isOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>
                <Text style={s.arrow}>→</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={s.emptyView}>
                <Text style={s.emptyEmoji}>👥</Text>
                <Text style={s.emptyTitle}>No Friends Yet</Text>
                <Text style={s.emptySub}>Add friends from the home screen to start chatting</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 14,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderColor: theme.border,
  },
  back: { color: theme.primary, fontSize: 16, fontWeight: '600', width: 60 },
  title: { fontSize: 17, fontWeight: '700', color: theme.text },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', margin: 16,
    backgroundColor: theme.inputBg, borderRadius: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: theme.border,
  },
  searchIcon: { fontSize: 18, marginRight: 8 },
  searchInput: { flex: 1, height: 46, color: theme.text, fontSize: 15 },
  userRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 14, borderBottomWidth: 1, borderColor: theme.border,
    backgroundColor: theme.surface, gap: 14,
  },
  avatar: { position: 'relative', width: 48, height: 48 },
  avatarText: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: theme.primary,
    color: '#fff', fontWeight: '700', fontSize: 20, textAlign: 'center', lineHeight: 48,
  },
  dot: {
    position: 'absolute', bottom: 1, right: 1, width: 12, height: 12,
    borderRadius: 6, borderWidth: 2, borderColor: theme.surface,
  },
  userName: { fontSize: 16, fontWeight: '600', color: theme.text },
  userRole: { fontSize: 12, color: theme.subText, marginTop: 2 },
  arrow: { color: theme.subText, fontSize: 18 },
  emptyView: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
  emptySub: { fontSize: 14, color: theme.subText, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
});
