import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  NotificationItem
} from '../services/notificationService';

interface NotificationCenterScreenProps {
  onNavigateBack: () => void;
}

export default function NotificationCenterScreen({ onNavigateBack }: NotificationCenterScreenProps) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err: any) {
      console.error('[NotificationCenter] Error loading notifications:', err);
      setError(err.message || 'Failed to fetch notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkAsRead = async (item: NotificationItem) => {
    if (item.isRead) return;
    try {
      await markAsRead(item.notificationId);
      // Update local state without refetching
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === item.notificationId ? { ...n, isRead: true } : n
        )
      );
    } catch (err) {
      console.error('[NotificationCenter] Error marking single read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (notifications.every((n) => n.isRead)) return;
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      Alert.alert('Success', 'All notifications marked as read.');
    } catch (err) {
      console.error('[NotificationCenter] Error marking all read:', err);
      Alert.alert('Error', 'Failed to mark all as read.');
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.notificationId !== notificationId));
    } catch (err) {
      console.error('[NotificationCenter] Error deleting notification:', err);
      Alert.alert('Error', 'Failed to delete notification.');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SOS_ALERT':
        return { name: 'alert-triangle', color: '#FF5252', bg: 'rgba(255, 82, 82, 0.1)' };
      case 'GEOFENCE_EVENT':
        return { name: 'map-pin', color: '#0A84FF', bg: 'rgba(10, 132, 255, 0.1)' };
      case 'MONITORING_EVENT':
        return { name: 'shield', color: '#4CD964', bg: 'rgba(76, 217, 100, 0.1)' };
      case 'CONTACT_EVENT':
        return { name: 'users', color: '#FFCC00', bg: 'rgba(255, 204, 0, 0.1)' };
      case 'SYSTEM_EVENT':
      default:
        return { name: 'info', color: '#8E8E93', bg: 'rgba(142, 142, 147, 0.1)' };
    }
  };

  const formatNotificationDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    } catch (err) {
      return '';
    }
  };

  // Grouping logic
  const groupNotificationsByDate = (items: NotificationItem[]) => {
    const today: NotificationItem[] = [];
    const yesterday: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    items.forEach((item) => {
      const itemDate = new Date(item.createdAt).getTime();
      if (itemDate >= todayStart) {
        today.push(item);
      } else if (itemDate >= yesterdayStart) {
        yesterday.push(item);
      } else {
        earlier.push(item);
      }
    });

    return { today, yesterday, earlier };
  };

  const { today, yesterday, earlier } = groupNotificationsByDate(notifications);

  const renderCard = (item: NotificationItem) => {
    const iconInfo = getNotificationIcon(item.notificationType);

    return (
      <TouchableOpacity
        key={item.notificationId}
        style={[styles.card, !item.isRead ? styles.cardUnread : styles.cardRead]}
        activeOpacity={0.8}
        onPress={() => handleMarkAsRead(item)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: iconInfo.bg }]}>
            <Feather name={iconInfo.name as any} size={18} color={iconInfo.color} />
          </View>
          <View style={styles.contentCol}>
            <View style={styles.titleRow}>
              <Text style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]}>
                {item.title}
              </Text>
              {!item.isRead && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.cardMessage}>{item.message}</Text>
            <Text style={styles.cardTime}>{formatNotificationDateTime(item.createdAt)}</Text>
          </View>

          {/* Delete Action button */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.notificationId)}
            activeOpacity={0.6}
          >
            <Feather name="trash-2" size={16} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
        <TouchableOpacity onPress={handleMarkAllRead} style={styles.markReadBtn} activeOpacity={0.8}>
          <Text style={styles.markReadBtnText}>Mark All Read</Text>
        </TouchableOpacity>
      </View>

      {/* Main content list */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF5252" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color="#FF5252" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchNotifications()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>You're all caught up!</Text>
          <Text style={styles.emptySubtitle}>No notifications available.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} tintColor="#FF5252" />
          }
          showsVerticalScrollIndicator={false}
        >
          {today.length > 0 && (
            <View>
              <Text style={styles.sectionHeader}>TODAY</Text>
              {today.map(renderCard)}
            </View>
          )}

          {yesterday.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.sectionHeader}>YESTERDAY</Text>
              {yesterday.map(renderCard)}
            </View>
          )}

          {earlier.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.sectionHeader}>EARLIER</Text>
              {earlier.map(renderCard)}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F11',
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    backgroundColor: '#1C1C1E',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },
  markReadBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
  },
  markReadBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
  errorText: {
    color: '#FF5252',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#FF5252',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardUnread: {
    backgroundColor: '#1E1E22',
    borderColor: 'rgba(255, 82, 82, 0.2)',
  },
  cardRead: {
    backgroundColor: '#151517',
    borderColor: '#2C2C2E',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentCol: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
  },
  cardTitleUnread: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF5252',
  },
  cardMessage: {
    fontSize: 12,
    color: '#D1D1D6',
    lineHeight: 18,
    marginBottom: 6,
    fontWeight: '500',
  },
  cardTime: {
    fontSize: 9,
    fontWeight: '500',
    color: '#8E8E93',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
