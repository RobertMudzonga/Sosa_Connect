import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Calendar, MapPin, Users } from 'lucide-react-native';
import { Typography } from '../common/Typography';
import { Card } from '../common/Card';
import { theme, palette } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';

const EVENTS = [
  { 
    id: '1', 
    title: 'Avondale Farmers Market', 
    date: 'Sat, 12 Oct', 
    time: '08:00 AM', 
    location: 'Avondale Shops',
    fee: 'Free',
    attendees: 124
  },
  { 
    id: '2', 
    title: 'Community Town Hall', 
    date: 'Sun, 13 Oct', 
    time: '02:00 PM', 
    location: 'Greendale Hall',
    fee: 'ZiG 50',
    attendees: 45
  },
];

export const CommunityHub: React.FC = () => {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h3" weight="bold">Community Events</Typography>
        <TouchableOpacity>
          <Typography variant="bodySm" weight="semibold" color={activeTheme.primary}>View All</Typography>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {EVENTS.map(event => (
          <Card key={event.id} variant="elevated" style={styles.eventCard}>
            <View style={styles.dateBadge}>
              <Typography variant="caption" weight="bold" style={{ color: activeTheme.primary }}>
                {event.date.split(',')[1].trim().toUpperCase()}
              </Typography>
            </View>
            
            <Typography variant="body" weight="bold" style={styles.title}>{event.title}</Typography>
            
            <View style={styles.infoRow}>
              <Calendar size={14} color={activeTheme.textSecondary} />
              <Typography variant="caption" color={activeTheme.textSecondary}>{event.date} • {event.time}</Typography>
            </View>
            
            <View style={styles.infoRow}>
              <MapPin size={14} color={activeTheme.textSecondary} />
              <Typography variant="caption" color={activeTheme.textSecondary}>{event.location}</Typography>
            </View>

            <View style={styles.footer}>
              <View style={styles.attendees}>
                <Users size={14} color={activeTheme.textSecondary} />
                <Typography variant="caption" weight="semibold">{event.attendees} interested</Typography>
              </View>
              <Typography variant="caption" weight="bold" color={activeTheme.primary}>{event.fee}</Typography>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  eventCard: {
    width: 260,
    padding: spacing.md,
  },
  dateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.xs,
    marginBottom: spacing.sm,
  },
  title: {
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  attendees: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  }
});
