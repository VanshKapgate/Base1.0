import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const EMOJI_LIST = ['❤️', '😂', '😮', '😢', '👍', '🙏'];

export default function MessageBubble({ msg, onLongPress, onReact, isGroup }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isSent = msg.senderId === user?.uid;
  const s = styles(theme, isSent);

  const readTime = msg.readAt
    ? `Read at ${dayjs(msg.readAt.toDate()).format('h:mm A')}`
    : null;

  return (
    <View style={s.wrapper}>
      {isGroup && !isSent && (
        <Text style={s.senderName}>{msg.senderName}</Text>
      )}

      <TouchableOpacity
        onLongPress={() => onLongPress(msg)}
        activeOpacity={0.85}
        style={s.bubbleWrap}
      >
        <View style={s.bubble}>
          {msg.deleted ? (
            <Text style={s.deletedText}>🚫 This message was deleted</Text>
          ) : (
            <>
              <Text style={s.msgText}>{msg.text}</Text>
              {msg.edited && <Text style={s.editedLabel}>(edited)</Text>}
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* Emoji reactions */}
      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
        <View style={s.reactionsRow}>
          {Object.entries(msg.reactions).map(([emoji, uids]) =>
            uids.length > 0 ? (
              <TouchableOpacity
                key={emoji}
                style={s.reactionChip}
                onPress={() => onReact(msg, emoji)}
              >
                <Text style={s.reactionText}>{emoji} {uids.length}</Text>
              </TouchableOpacity>
            ) : null
          )}
        </View>
      )}

      {/* Time + read receipt */}
      <View style={s.meta}>
        <Text style={s.timeText}>
          {msg.timestamp ? dayjs(msg.timestamp.toDate()).format('h:mm A') : ''}
        </Text>
        {isSent && (
          readTime
            ? <Text style={s.readText}>✓✓ {readTime}</Text>
            : <Text style={s.sentText}>✓ Sent</Text>
        )}
      </View>
    </View>
  );
}

const styles = (theme, isSent) => StyleSheet.create({
  wrapper: {
    alignItems: isSent ? 'flex-end' : 'flex-start',
    marginVertical: 3,
    marginHorizontal: 12,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary,
    marginBottom: 3,
    marginLeft: 4,
  },
  bubbleWrap: {
    maxWidth: '80%',
  },
  bubble: {
    backgroundColor: isSent ? theme.bubble.sent : theme.bubble.received,
    borderRadius: 18,
    borderBottomRightRadius: isSent ? 4 : 18,
    borderBottomLeftRadius: isSent ? 18 : 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: isSent ? 'transparent' : theme.border,
  },
  msgText: {
    color: isSent ? theme.bubble.sentText : theme.bubble.receivedText,
    fontSize: 15,
    lineHeight: 22,
  },
  deletedText: {
    color: theme.subText,
    fontSize: 14,
    fontStyle: 'italic',
  },
  editedLabel: {
    color: isSent ? 'rgba(255,255,255,0.6)' : theme.subText,
    fontSize: 11,
    marginTop: 2,
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    marginHorizontal: 4,
  },
  reactionChip: {
    backgroundColor: theme.inputBg,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: theme.border,
  },
  reactionText: { fontSize: 13 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    marginHorizontal: 4,
  },
  timeText: { fontSize: 11, color: theme.subText },
  sentText: { fontSize: 11, color: theme.subText },
  readText: { fontSize: 11, color: theme.primary, fontWeight: '600' },
});
