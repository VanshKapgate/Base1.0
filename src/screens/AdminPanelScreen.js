import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Alert, Modal, ActivityIndicator, ScrollView, StatusBar,
} from 'react-native';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy, onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth, ADMIN_PASSKEY } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import dayjs from 'dayjs';

// Generates a random passkey like: X7K-M2P-9QR
const generatePasskey = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${seg(3)}-${seg(3)}-${seg(3)}`;
};

export default function AdminPanelScreen({ navigation }) {
  const { logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'screenshots'
  const [screenshotLogs, setScreenshotLogs] = useState([]);

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPasskey, setNewPasskey] = useState(generatePasskey());
  const [newRole, setNewRole] = useState('member');
  const [creating, setCreating] = useState(false);

  // Rename user modal
  const [showRename, setShowRename] = useState(false);
  const [renameUserId, setRenameUserId] = useState(null);
  const [renameUserName, setRenameUserName] = useState('');
  const [renaming, setRenaming] = useState(false);

  const s = styles(theme);

  useEffect(() => {
    fetchUsers();
    // Real-time screenshot log listener
    const q = query(collection(db, 'screenshotLogs'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setScreenshotLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter a name.');
      return;
    }
    setCreating(true);
    try {
      await addDoc(collection(db, 'users'), {
        name: newName.trim(),
        passkey: newPasskey,
        role: newRole, // 'apostle' | 'member'
        isOnline: false,
        lastSeen: null,
        avatarUrl: null,
        createdAt: serverTimestamp(),
      });
      Alert.alert(
        '✅ User Created!',
        `Name: ${newName}\nPasskey: ${newPasskey}\nRole: ${newRole}\n\nShare these credentials ONLY with this person.`,
      );
      setShowCreate(false);
      setNewName('');
      setNewPasskey(generatePasskey());
      setNewRole('member');
      fetchUsers();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async () => {
    if (!renameUserName.trim()) {
      Alert.alert('Error', 'Please enter a name.');
      return;
    }
    setRenaming(true);
    try {
      await updateDoc(doc(db, 'users', renameUserId), { name: renameUserName.trim() });
      setShowRename(false);
      fetchUsers();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setRenaming(false);
    }
  };

  const toggleRole = async (uid, currentRole) => {
    const newRole = currentRole === 'apostle' ? 'member' : 'apostle';
    Alert.alert(
      'Change Role',
      `Make this user an ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            await updateDoc(doc(db, 'users', uid), { role: newRole });
            fetchUsers();
          },
        },
      ],
    );
  };

  const deleteUser = (uid, name) => {
    Alert.alert(
      '⚠️ Delete User',
      `Remove ${name}? They will no longer be able to log in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDoc(doc(db, 'users', uid));
            fetchUsers();
          },
        },
      ],
    );
  };

  const renderUser = ({ item }) => (
    <View style={s.userCard}>
      <View style={s.userInfo}>
        <View style={s.userAvatar}>
          <Text style={s.userAvatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.userName}>{item.name}</Text>
          <Text style={s.userPasskey}>🔑 {item.passkey}</Text>
          <View style={[s.roleBadge,
            item.role === 'apostle' ? s.apostleBadge : s.memberBadge
          ]}>
            <Text style={s.roleText}>
              {item.role === 'apostle' ? '⭐ Apostle' : '👤 Member'}
            </Text>
          </View>
        </View>
      </View>
      <View style={s.userActions}>
        <TouchableOpacity
          style={[s.actionBtn, s.editBtn]}
          onPress={() => {
            setRenameUserId(item.id);
            setRenameUserName(item.name);
            setShowRename(true);
          }}
        >
          <Text style={s.actionBtnText}>Rename</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, s.roleBtn]}
          onPress={() => toggleRole(item.id, item.role)}
        >
          <Text style={s.actionBtnText}>
            {item.role === 'apostle' ? 'Demote' : 'Apostle'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, s.deleteBtn]}
          onPress={() => deleteUser(item.id, item.name)}
        >
          <Text style={s.actionBtnText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>👑 Admin Panel</Text>
          <Text style={s.headerSub}>{users.length} registered users</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity onPress={toggleTheme} style={s.iconBtn}>
            <Text style={{ fontSize: 20 }}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={s.iconBtn}>
            <Text style={s.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'users' && s.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[s.tabText, activeTab === 'users' && s.tabTextActive]}>👥 Users</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === 'screenshots' && s.tabActive]}
          onPress={() => setActiveTab('screenshots')}
        >
          <Text style={[s.tabText, activeTab === 'screenshots' && s.tabTextActive]}>
            📸 Screenshots {screenshotLogs.length > 0 ? `(${screenshotLogs.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'users' ? (
        <>
          {loading
            ? <ActivityIndicator color={theme.primary} size="large" style={{ marginTop: 40 }} />
            : <FlatList
                data={users}
                keyExtractor={(i) => i.id}
                renderItem={renderUser}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={
                  <Text style={s.emptyText}>No users yet. Create the first one! 👇</Text>
                }
              />
          }
          {/* FAB: Create User */}
          <TouchableOpacity style={s.fab} onPress={() => setShowCreate(true)}>
            <Text style={s.fabText}>+ New User</Text>
          </TouchableOpacity>
        </>
      ) : (
        /* Screenshot Logs */
        <FlatList
          data={screenshotLogs}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={s.ssRow}>
              <Text style={s.ssEmoji}>📸</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.ssUser}>{item.userName} took a screenshot</Text>
                <Text style={s.ssChat}>
                  {item.chatType === 'group' ? '👥' : '💬'} {item.chatName}
                </Text>
                <Text style={s.ssTime}>
                  {item.timestamp ? dayjs(item.timestamp.toDate()).format('MMM D, h:mm A') : '...'}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🛡️</Text>
              <Text style={s.emptyText}>No screenshots yet</Text>
            </View>
          }
        />
      )}

      {/* Create User Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Create New User</Text>

            <Text style={s.label}>Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Gabriel"
              placeholderTextColor={theme.subText}
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={s.label}>Passkey (auto-generated)</Text>
            <View style={s.passkeyRow}>
              <Text style={s.passkeyText}>{newPasskey}</Text>
              <TouchableOpacity onPress={() => setNewPasskey(generatePasskey())}>
                <Text style={s.refreshText}>🔄 New</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Role</Text>
            <View style={s.roleRow}>
              {['member', 'apostle'].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[s.roleChoice, newRole === r && s.roleChoiceActive]}
                  onPress={() => setNewRole(r)}
                >
                  <Text style={[s.roleChoiceText, newRole === r && s.roleChoiceTextActive]}>
                    {r === 'apostle' ? '⭐ Apostle' : '👤 Member'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[s.createBtn, creating && { opacity: 0.7 }]}
              onPress={createUser}
              disabled={creating}
            >
              {creating
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.createBtnText}>Create User</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowCreate(false)} style={s.cancelBtn}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rename User Modal */}
      <Modal visible={showRename} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Rename User</Text>

            <Text style={s.label}>New Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Gabriel"
              placeholderTextColor={theme.subText}
              value={renameUserName}
              onChangeText={setRenameUserName}
            />

            <TouchableOpacity
              style={[s.createBtn, renaming && { opacity: 0.7 }]}
              onPress={handleRename}
              disabled={renaming}
            >
              {renaming
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.createBtnText}>Save Name</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowRename(false)} style={s.cancelBtn}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: theme.text },
  headerSub: { fontSize: 13, color: theme.subText, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 8 },
  logoutText: { color: theme.danger, fontWeight: '600' },
  userCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  userInfo: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  userName: { fontSize: 16, fontWeight: '700', color: theme.text },
  userPasskey: { fontSize: 13, color: theme.subText, marginTop: 2, fontFamily: 'monospace' },
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  apostleBadge: { backgroundColor: '#4A4000' },
  memberBadge: { backgroundColor: theme.inputBg },
  roleText: { fontSize: 11, fontWeight: '600', color: theme.text },
  userActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: { backgroundColor: theme.primaryDark },
  roleBtn: { backgroundColor: theme.primary },
  deleteBtn: { backgroundColor: theme.danger },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  emptyText: {
    textAlign: 'center',
    color: theme.subText,
    fontSize: 15,
    marginTop: 60,
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    backgroundColor: theme.primary,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 14,
    elevation: 8,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: theme.subText, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    backgroundColor: theme.inputBg,
    borderRadius: 12,
    padding: 14,
    color: theme.text,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  passkeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.border,
  },
  passkeyText: { color: theme.text, fontSize: 18, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 2 },
  refreshText: { color: theme.primary, fontWeight: '600' },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleChoice: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    backgroundColor: theme.inputBg,
    borderWidth: 2,
    borderColor: theme.border,
  },
  roleChoiceActive: { borderColor: theme.primary, backgroundColor: `${theme.primary}22` },
  roleChoiceText: { color: theme.subText, fontWeight: '600' },
  roleChoiceTextActive: { color: theme.primary },
  createBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelText: { color: theme.subText, fontSize: 14 },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: theme.primary },
  tabText: { color: theme.subText, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: theme.primary },
  // Screenshot log rows
  ssRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: theme.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  ssEmoji: { fontSize: 26, marginTop: 2 },
  ssUser: { fontSize: 15, fontWeight: '700', color: theme.text },
  ssChat: { fontSize: 13, color: theme.subText, marginTop: 3 },
  ssTime: { fontSize: 11, color: theme.subText, marginTop: 4 },
});
