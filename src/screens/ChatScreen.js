import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, Modal, StatusBar,
} from 'react-native';
import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, updateDoc, doc, getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import MessageBubble from '../components/MessageBubble';
import dayjs from 'dayjs';
import * as ScreenCapture from 'expo-screen-capture';

const EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🙏'];

export default function ChatScreen({ route }) {
  const { chatId, chat } = route.params;
  const { user, isAdmin } = useAuth();
  const { theme, isDark } = useTheme();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pinnedMsg, setPinnedMsg] = useState(null);
  const flatListRef = useRef(null);

  // Other user info
  const otherUid = chat.members?.find(m => m !== user?.uid);
  const [otherUser, setOtherUser] = useState(null);

  const s = styles(theme);

  useEffect(() => {
    // Screenshot detection — log to Firestore for admin review
    const sub = ScreenCapture.addScreenshotListener(() => {
      addDoc(collection(db, 'screenshotLogs'), {
        uid: user?.uid,
        userName: user?.name,
        chatId,
        chatName: chat?.displayNames?.[user?.uid] || 'Direct Chat',
        chatType: 'direct',
        timestamp: serverTimestamp(),
      });
    });

    // Fetch other user's profile
    if (otherUid) {
      getDoc(doc(db, 'users', otherUid)).then(snap => {
        if (snap.exists()) setOtherUser(snap.data());
      });
    }

    // Listen to chat doc for pinned message updates
    const unsubChat = onSnapshot(doc(db, 'chats', chatId), (snap) => {
      if (snap.exists()) {
        setPinnedMsg(snap.data().pinnedMessage || null);
      }
    });

    return () => {
      sub.remove();
      unsubChat();
    };
  }, [otherUid, chatId]);

  useEffect(() => {
    // Real-time message listener
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);

      // Admin ghost mode: skip marking messages as read
      if (isAdmin) return;

      // Mark unread messages as read
      msgs.forEach(async (msg) => {
        if (msg.senderId !== user?.uid && !msg.readBy?.includes(user?.uid)) {
          await updateDoc(doc(db, 'chats', chatId, 'messages', msg.id), {
            readBy: [...(msg.readBy || []), user?.uid],
            readAt: serverTimestamp(),
          });
          // Reset unread count
          await updateDoc(doc(db, 'chats', chatId), {
            [`unreadCount.${user?.uid}`]: 0,
          });
        }
      });
    });
    return unsub;
  }, [chatId]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (editMode && selectedMsg) {
      await updateDoc(doc(db, 'chats', chatId, 'messages', selectedMsg.id), {
        text: trimmed,
        edited: true,
      });
      setEditMode(false);
      setSelectedMsg(null);
    } else {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user?.uid,
        senderName: user?.name,
        text: trimmed,
        timestamp: serverTimestamp(),
        readBy: [user?.uid],
        readAt: null,
        reactions: {},
        edited: false,
        deleted: false,
      });
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: trimmed,
        lastMessageTime: serverTimestamp(),
        [`unreadCount.${otherUid}`]: (chat.unreadCount?.[otherUid] || 0) + 1,
      });
    }
    setText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };


  const onLongPress = (msg) => {
    if (msg.deleted) return;
    const isMine = msg.senderId === user?.uid;
    const isPinned = pinnedMsg?.id === msg.id;

    const options = [
      { text: '😊 React', onPress: () => { setSelectedMsg(msg); setShowEmojiPicker(true); } },
      { text: isPinned ? '📌 Unpin' : '📌 Pin', onPress: () => togglePin(msg) },
    ];
    if (isMine) {
      options.push({ text: '✏️ Edit', onPress: () => { setSelectedMsg(msg); setEditMode(true); setText(msg.text); } });
    }
    // Anyone can delete any message
    options.push({ text: '🗑️ Delete', style: 'destructive', onPress: () => deleteMessage(msg) });
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Message Actions', undefined, options);
  };

  const togglePin = async (msg) => {
    const isPinned = pinnedMsg?.id === msg.id;
    await updateDoc(doc(db, 'chats', chatId), {
      pinnedMessage: isPinned ? null : { id: msg.id, text: msg.text, senderName: msg.senderName || 'Someone' }
    });
  };

  const deleteMessage = async (msg) => {
    await updateDoc(doc(db, 'chats', chatId, 'messages', msg.id), {
      deleted: true,
      text: '',
    });
  };

  const onReact = async (msg, emoji) => {
    const reactions = { ...(msg.reactions || {}) };
    const uids = reactions[emoji] || [];
    if (uids.includes(user?.uid)) {
      reactions[emoji] = uids.filter(u => u !== user?.uid);
    } else {
      reactions[emoji] = [...uids, user?.uid];
    }
    await updateDoc(doc(db, 'chats', chatId, 'messages', msg.id), { reactions });
  };

  const isOnline = otherUser?.isOnline;
  const lastSeen = otherUser?.lastSeen
    ? `Last seen ${dayjs(otherUser.lastSeen.toDate()).fromNow()}`
    : '';

  return (
    <View style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{otherUser?.name?.charAt(0).toUpperCase() || '?'}</Text>
          </View>
          <View style={[s.onlineDot, { backgroundColor: isOnline ? theme.online : theme.offline }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerName}>{otherUser?.name || 'Loading...'}</Text>
          <Text style={s.headerStatus}>
            {isOnline ? '🟢 Online' : lastSeen}
          </Text>
        </View>
      </View>

      {/* Pinned Message Banner */}
      {pinnedMsg && (
        <View style={s.pinnedBanner}>
          <Text style={s.pinnedIcon}>📌</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.pinnedName}>{pinnedMsg.senderName}</Text>
            <Text style={s.pinnedText} numberOfLines={1}>{pinnedMsg.text}</Text>
          </View>
          <TouchableOpacity onPress={() => togglePin(pinnedMsg)}>
            <Text style={s.unpinIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={i => i.id}
        renderItem={({ item }) =>
          <MessageBubble
            msg={item}
            onLongPress={onLongPress}
            onReact={onReact}
            isGroup={false}
          />
        }
        contentContainerStyle={{ paddingVertical: 12 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Edit banner */}
      {editMode && (
        <View style={s.editBanner}>
          <Text style={s.editBannerText}>✏️ Editing message</Text>
          <TouchableOpacity onPress={() => { setEditMode(false); setSelectedMsg(null); setText(''); }}>
            <Text style={s.cancelEdit}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Type a message..."
            placeholderTextColor={theme.subText}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={s.sendBtn}
            onPress={() => sendMessage()}
          >
            <Text style={s.sendIcon}>{editMode ? '✅' : '📤'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Emoji picker modal */}
      <Modal visible={showEmojiPicker} transparent animationType="fade">
        <TouchableOpacity style={s.emojiOverlay} onPress={() => setShowEmojiPicker(false)}>
          <View style={s.emojiBox}>
            {EMOJIS.map(e => (
              <TouchableOpacity key={e} onPress={() => { onReact(selectedMsg, e); setShowEmojiPicker(false); }}>
                <Text style={s.emojiChoice}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderColor: theme.border,
    gap: 12,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.surface,
  },
  headerName: { fontSize: 16, fontWeight: '700', color: theme.text },
  headerStatus: { fontSize: 12, color: theme.subText, marginTop: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderColor: theme.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: theme.inputBg,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: theme.text,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  sendIcon: { fontSize: 20 },
  editBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: `${theme.primary}22`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: theme.primary,
  },
  editBannerText: { color: theme.primary, fontWeight: '600', fontSize: 13 },
  cancelEdit: { color: theme.primary, fontSize: 18, fontWeight: '700' },
  emojiOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiBox: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    elevation: 10,
  },
  emojiChoice: { fontSize: 32 },
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: theme.border,
    gap: 12,
  },
  pinnedIcon: { fontSize: 18 },
  pinnedName: { fontSize: 12, fontWeight: '700', color: theme.primary, marginBottom: 2 },
  pinnedText: { fontSize: 13, color: theme.subText },
  unpinIcon: { fontSize: 18, color: theme.subText, paddingHorizontal: 4 },
});
