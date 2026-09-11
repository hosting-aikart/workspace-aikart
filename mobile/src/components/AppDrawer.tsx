import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useChatContext } from '../context/ChatContext';

interface AppDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 320);

export const AppDrawer: React.FC<AppDrawerProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { totalUnreadCount } = useChatContext();
  const insets = useSafeAreaInsets();

  const [modalVisible, setModalVisible] = useState(visible);
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.timing(animValue, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible, animValue]);

  const handleClose = () => {
    Animated.timing(animValue, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      onClose();
    });
  };

  const role = user?.role || 'EMPLOYEE';

  const navigateTo = (routePath: string) => {
    handleClose();
    router.push(routePath as any);
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
    router.replace('/(auth)/login');
  };

  const getNavSections = () => {
    const rolePrefix = role === 'ADMIN' ? '/(admin)' : role === 'MANAGER' ? '/(manager)' : '/(employee)';

    type NavItem = {
      id: string;
      label: string;
      icon: string;
      path: string;
      badge?: number;
    };

    const workspaceItems: NavItem[] = [
      { id: 'dashboard', label: 'Dashboard', icon: 'view-dashboard', path: `${rolePrefix}` },
      { id: 'directory', label: 'Directory', icon: 'account-group', path: `${rolePrefix}/directory` },
      { id: 'attendance', label: 'Attendance', icon: 'calendar-clock', path: `${rolePrefix}/attendance` },
      { id: 'tasks', label: 'My Tasks', icon: 'checkbox-marked-circle-outline', path: `${rolePrefix}/tasks` },
      { id: 'projects', label: 'Projects', icon: 'folder-outline', path: `${rolePrefix}/projects` },
      { id: 'meetings', label: 'Meetings', icon: 'video-outline', path: `${rolePrefix}/meetings` },
    ];

    const teamItems: NavItem[] = [];
    if (role === 'MANAGER') {
      teamItems.push({ id: 'team', label: 'Team Members', icon: 'account-supervisor', path: '/(manager)/team' });
    }
    if (role === 'ADMIN') {
      teamItems.push(
        { id: 'users', label: 'Employees', icon: 'account-supervisor', path: '/(admin)/users' },
        { id: 'departments', label: 'Departments', icon: 'office-building', path: '/(admin)/departments' },
        { id: 'reports', label: 'Reports & Analytics', icon: 'chart-bar', path: '/(admin)/reports' }
      );
    }

    const commItems: NavItem[] = [
      { id: 'chat', label: 'Team Chat', icon: 'forum-outline', path: `${rolePrefix}/chat`, badge: totalUnreadCount },
      { id: 'announcements', label: 'Announcements', icon: 'bullhorn-outline', path: `${rolePrefix}/announcements` },
      { id: 'email', label: 'Email', icon: 'email-outline', path: `${rolePrefix}/email` },
      { id: 'notifications', label: 'Notifications', icon: 'bell-outline', path: `${rolePrefix}/notifications` },
    ];

    const accountItems: NavItem[] = [
      { id: 'profile', label: 'Profile', icon: 'account-outline', path: `${rolePrefix}/profile` },
      { id: 'settings', label: 'Settings', icon: 'cog-outline', path: `${rolePrefix}/settings` },
    ];

    return [
      { title: 'WORKSPACE', items: workspaceItems },
      ...(teamItems.length > 0 ? [{ title: 'TEAM & WORKFORCE', items: teamItems }] : []),
      { title: 'COMMUNICATION', items: commItems },
      { title: 'ACCOUNT', items: accountItems },
    ];
  };

  const navSections = getNavSections();

  if (!modalVisible) return null;

  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.75],
  });

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  return (
    <Modal visible={modalVisible} transparent onRequestClose={handleClose} animationType="none">
      <View style={styles.modalRoot}>
        {/* Animated Dark Overlay Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
        </Animated.View>

        {/* Animated Left-Sliding Drawer Panel */}
        <Animated.View
          style={[
            styles.drawerContainer,
            {
              width: DRAWER_WIDTH,
              transform: [{ translateX }],
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          {/* Header & Branding */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/aikart-workspace-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View style={styles.logoTitleWrap}>
              <Text style={styles.brandTitle}>AIKart Workspace</Text>
              <Text style={styles.brandSubtitle}>MOBILE ENTERPRISE</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* User Badge */}
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name || 'User'}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user?.email || ''}
              </Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{role}</Text>
            </View>
          </View>

          {/* Navigation Sections */}
          <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
            {navSections.map((section, sIdx) => (
              <View key={sIdx} style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.items.map((item) => {
                  const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.menuItem, isActive && styles.activeMenuItem]}
                      onPress={() => navigateTo(item.path)}
                    >
                      <MaterialCommunityIcons
                        name={item.icon as any}
                        size={22}
                        color={isActive ? '#6366F1' : '#94A3B8'}
                      />
                      <Text style={[styles.menuItemText, isActive && styles.activeMenuItemText]}>
                        {item.label}
                      </Text>
                      {item.badge && item.badge > 0 ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Logout Option */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={22} color="#EF4444" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    position: 'relative',
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#090D16',
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#0F172A',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  logoImage: {
    width: 38,
    height: 38,
    borderRadius: 8,
  },
  logoTitleWrap: {
    marginLeft: 12,
    flex: 1,
  },
  brandTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  brandSubtitle: {
    color: '#6366F1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  closeBtn: {
    padding: 6,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginVertical: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '600',
  },
  userEmail: {
    color: '#94A3B8',
    fontSize: 12,
  },
  roleBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: '700',
  },
  menuScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionWrap: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
    paddingLeft: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  activeMenuItem: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  menuItemText: {
    color: '#CBD5E1',
    fontSize: 15,
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  activeMenuItemText: {
    color: '#818CF8',
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 10,
    marginBottom: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },
});
