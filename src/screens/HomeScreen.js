import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator,
} from 'react-native';
import {
  collection, query, where, onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

export default function HomeScreen({ navigation }) {
  const { user, canStartDirectChat, canCreateGroup, logout, isAdmin } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    let q;
    if (isAdmin) {
      // Admin ghost mode: see ALL chats in the app
      q = query(collection(db, 'chats'));
    } else {
      // Regular users: only chats they're a member of
      q = query(
        collection(db, 'chats'),
        where('members', 'array-contains', user.uid),
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const aTime = a.lastMessageTime?.toMillis?.() || 0;
          const bTime = b.lastMessageTime?.toMillis?.() || 0;
          return bTime - aTime;
        });
      setChats(sorted);
      setLoading(false);
    });
    return unsub;
  }, [user, isAdmin]);

  // Listen for pending friend requests (non-admin only)
  useEffect(() => {
    if (!user?.uid || isAdmin) return;
    const q = query(
      collection(db, 'friendRequests'),
      where('toUid', '==', user.uid),
      where('status', '==', 'pending'),
    );
    const unsub = onSnapshot(q, snap => setPendingCount(snap.size));
    return unsub;
  }, [user, isAdmin]);

  const s = styles(theme);

  const renderChat = ({ item }) => {
    const isGroup = item.type === 'group';
    const unread = isAdmin ? 0 : (item.unreadCount?.[user.uid] || 0);
    const time = item.lastMessageTime
      ? dayjs(item.lastMessageTime.toDate()).fromNow()
      : '';

    // For admin viewing others' direct chats, show both names
    let chatName;
    if (isGroup) {
      chatName = item.groupName;
    } else if (isAdmin) {
      // Show member names for admin monitoring
      chatName = item.memberNames ? item.memberNames.join(' & ') : 'Direct Chat';
    } else {
      chatName = item.displayNames?.[user.uid] || 'Unknown';
    }

    return (
      <TouchableOpacity
        style={s.chatItem}
        onPress={() => navigation.navigate(
          isGroup ? 'GroupChat' : 'Chat',
          { chatId: item.id, chat: item }
        )}
        activeOpacity={0.7}
      >
        <View style={[s.avatar, { backgroundColor: isGroup ? theme.accent : theme.primary }]}>
          <Text style={s.avatarText}>
            {isGroup ? '👥' : (isAdmin ? '👁️' : '👤')}
          </Text>
        </View>

        <View style={s.chatInfo}>
          <Text style={s.chatName}>{chatName}</Text>
          <Text style={s.lastMsg} numberOfLines={1}>
            {item.lastMessage || 'No messages yet'}
          </Text>
        </View>

        <View style={s.chatRight}>
          <Text style={s.chatTime}>{time}</Text>
          {unread > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>💬 PrivateChats</Text>
          <Text style={s.headerSub}>
            {user?.name}
            {isAdmin && ' 👑'}
          </Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity onPress={toggleTheme} style={s.iconBtn}>
            <Text style={{ fontSize: 22 }}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity onPress={() => navigation.navigate('AdminPanel')} style={s.iconBtn}>
              <Text style={{ fontSize: 22 }}>⚙️</Text>
            </TouchableOpacity>
          )}
          {!isAdmin && (
            <>
              {/* Add Friend button */}
              <TouchableOpacity onPress={() => navigation.navigate('AddFriend')} style={s.iconBtn}>
                <Text style={{ fontSize: 22 }}>👤➕</Text>
              </TouchableOpacity>
              {/* Friend Requests button with badge */}
              <TouchableOpacity onPress={() => navigation.navigate('FriendRequests')} style={s.iconBtn}>
                <Text style={{ fontSize: 22 }}>🔔</Text>
                {pendingCount > 0 && (
                  <View style={s.notifBadge}>
                    <Text style={s.notifBadgeText}>{pendingCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={logout} style={s.iconBtn}>
            <Text style={{ fontSize: 22 }}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat List */}
      {loading
        ? <ActivityIndicator color={theme.primary} size="large" style={{ marginTop: 60 }} />
        : <FlatList
            data={chats}
            keyExtractor={(i) => i.id}
            renderItem={renderChat}
            contentContainerStyle={chats.length === 0 && s.emptyContainer}
            ListEmptyComponent={
              <View style={s.emptyView}>
                <Text style={s.emptyEmoji}>🔒</Text>
                <Text style={s.emptyTitle}>No Chats Yet</Text>
                <Text style={s.emptySub}>
                  {canStartDirectChat
                    ? 'Add friends and start chatting!'
                    : 'The admin will start a conversation with you'}
                </Text>
              </View>
            }
          />
      }

      {/* FABs */}
      {(canStartDirectChat || canCreateGroup) && (
        <View style={s.fabGroup}>
          {canCreateGroup && (
            <TouchableOpacity
              style={[s.fab, s.fabSecondary]}
              onPress={() => navigation.navigate('CreateGroup')}
            >
              <Text style={s.fabText}>👥 New Group</Text>
            </TouchableOpacity>
          )}
          {canStartDirectChat && (
            <TouchableOpacity
              style={s.fab}
              onPress={() => navigation.navigate('NewChat')}
            >
              <Text style={s.fabText}>✉️ New Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: theme.text },
  headerSub: { fontSize: 13, color: theme.subText, marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  iconBtn: { padding: 8, position: 'relative' },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 22 },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 16, fontWeight: '700', color: theme.text },
  lastMsg: { fontSize: 13, color: theme.subText, marginTop: 3 },
  chatRight: { alignItems: 'flex-end', gap: 6 },
  chatTime: { fontSize: 11, color: theme.subText },
  badge: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  emptyContainer: { flex: 1 },
  emptyView: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.text },
  emptySub: {
    fontSize: 14, color: theme.subText, textAlign: 'center',
    marginTop: 8, paddingHorizontal: 32, lineHeight: 22,
  },
  fabGroup: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    gap: 12,
    alignItems: 'flex-end',
  },
  fab: {
    backgroundColor: theme.primary,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    elevation: 8,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  fabSecondary: { backgroundColor: theme.accent },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
