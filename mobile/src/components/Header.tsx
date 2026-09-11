import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppDrawer } from './AppDrawer';
import { useChatContext } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = false }) => {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { totalUnreadCount } = useChatContext();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const rolePrefix = user?.role === 'ADMIN' ? '/(admin)' : user?.role === 'MANAGER' ? '/(manager)' : '/(employee)';

  return (
    <>
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.left}>
            {showBack ? (
              <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#F8FAFC" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.iconBtn}>
                <MaterialCommunityIcons name="menu" size={26} color="#F8FAFC" />
              </TouchableOpacity>
            )}
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>

          <View style={styles.right}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push(`${rolePrefix}/chat` as any)}
            >
              <MaterialCommunityIcons name="forum-outline" size={22} color="#CBD5E1" />
              {totalUnreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push(`${rolePrefix}/notifications` as any)}
            >
              <MaterialCommunityIcons name="bell-outline" size={22} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 52,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 8,
    position: 'relative',
    marginRight: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginLeft: 8,
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
