import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  Alert, StatusBar, ActivityIndicator,
} from 'react-native';
import {
  collection, getDocs, addDoc, serverTimestamp, query, where, doc, getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

export default function CreateGroupScreen() {
  const { user, isAdmin } = useAuth();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const s = styles(theme);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    if (isAdmin) {
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== user?.uid));
    } else {
      const [sentSnap, recvSnap] = await Promise.all([
        getDocs(query(collection(db, 'friendRequests'), where('fromUid', '==', user?.uid), where('status', '==', 'accepted'))),
        getDocs(query(collection(db, 'friendRequests'), where('toUid', '==', user?.uid), where('status', '==', 'accepted'))),
      ]);
      const friendUids = [
        ...sentSnap.docs.map(d => d.data().toUid),
        ...recvSnap.docs.map(d => d.data().fromUid),
      ];
      if (friendUids.length === 0) { setUsers([]); setLoading(false); return; }
      const friendDocs = await Promise.all(friendUids.map(uid => getDoc(doc(db, 'users', uid))));
      setUsers(friendDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() })));
    }
    setLoading(false);
  };

  const toggle = (uid) => {
    setSelected(prev => prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]);
  };

  const createGroup = async () => {
    if (!groupName.trim()) { Alert.alert('Missing name', 'Please enter a group name.'); return; }
    if (selected.length < 1) { Alert.alert('No members', 'Select at least 1 member.'); return; }
    setCreating(true);
    try {
      const members = [user.uid, ...selected];
      const unreadCount = {};
      members.forEach(uid => { unreadCount[uid] = 0; });

      const chatRef = await addDoc(collection(db, 'chats'), {
        type: 'group',
        groupName: groupName.trim(),
        members,
        adminUid: user.uid,
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        unreadCount,
        disappearingMessages: false,
        createdAt: serverTimestamp(),
      });

      navigation.replace('GroupChat', {
        chatId: chatRef.id,
        chat: { id: chatRef.id, groupName: groupName.trim(), members, type: 'group', disappearingMessages: false },
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>New Group</Text>
        <TouchableOpacity onPress={createGroup} disabled={creating}>
          {creating
            ? <ActivityIndicator color={theme.primary} size="small" />
            : <Text style={s.createText}>Create</Text>
          }
        </TouchableOpacity>
      </View>

      <View style={s.nameSection}>
        <View style={s.groupIcon}><Text style={{ fontSize: 28 }}>👥</Text></View>
        <TextInput
          style={s.nameInput}
          placeholder="Group name..."
          placeholderTextColor={theme.subText}
          value={groupName}
          onChangeText={setGroupName}
          maxLength={40}
        />
      </View>

      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>SELECT MEMBERS</Text>
        <Text style={s.selectedCount}>{selected.length} selected</Text>
      </View>

      {loading
        ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        : <FlatList
            data={users}
            keyExtractor={i => i.id}
            renderItem={({ item }) => {
              const isSelected = selected.includes(item.id);
              return (
                <TouchableOpacity
                  style={[s.userRow, isSelected && s.userRowSelected]}
                  onPress={() => toggle(item.id)}
                >
                  <View style={[s.avatar, { backgroundColor: isSelected ? theme.primary : theme.surface }]}>
                    <Text style={[s.avatarText, { color: isSelected ? '#fff' : theme.text }]}>
                      {isSelected ? '✓' : item.name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.userName}>{item.name}</Text>
                    <Text style={s.userRole}>
                      {item.role === 'apostle' ? '⭐ Apostle' : '👤 Member'}
                      {' · '}{item.isOnline ? '🟢 Online' : '⚫ Offline'}
                    </Text>
                  </View>
                  <View style={[s.checkbox, isSelected && s.checkboxSelected]}>
                    {isSelected && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>👥</Text>
                <Text style={{ color: theme.subText, fontSize: 15 }}>Add friends first to create a group</Text>
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
  createText: { color: theme.primary, fontSize: 16, fontWeight: '700', width: 60, textAlign: 'right' },
  nameSection: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderColor: theme.border,
  },
  groupIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: theme.accent + '33',
    justifyContent: 'center', alignItems: 'center',
  },
  nameInput: {
    flex: 1, fontSize: 18, fontWeight: '600', color: theme.text,
    borderBottomWidth: 1, borderColor: theme.primary, paddingBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: theme.subText, letterSpacing: 0.5 },
  selectedCount: { fontSize: 12, fontWeight: '600', color: theme.primary },
  userRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, gap: 14,
  },
  userRowSelected: { backgroundColor: `${theme.primary}10` },
  avatar: {
    width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: theme.border,
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  userName: { fontSize: 15, fontWeight: '600', color: theme.text },
  userRole: { fontSize: 12, color: theme.subText, marginTop: 2 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: theme.border,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
});
