import { Pressable, Text, TextInput, View } from 'react-native';

import { Icon } from './Icon';
import type { ListMeta } from '../lib/api';
import { colors, radius, shadow } from '../theme';

export function SearchField({
  value,
  onChange,
  placeholder,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}) {
  return (
    <View style={[styles.search, shadow]}>
      <Icon name="search" size={16} color={colors.textMuted} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        accessibilityLabel={placeholder ?? 'Search'}
      />
      {value ? (
        <Pressable onPress={() => onChange('')} hitSlop={8} accessibilityLabel="Clear search">
          <Icon name="close" size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export interface CardRow {
  label: string;
  value: string;
}

export function RecordCard({ title, rows }: { title: string; rows: CardRow[] }) {
  const visible = rows.filter((row) => row.value.trim().length > 0);
  return (
    <View style={[styles.card, shadow]}>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {title || '—'}
      </Text>
      {visible.map((row) => (
        <View key={row.label} style={styles.cardRow}>
          <Text style={styles.cardRowLabel}>{row.label}</Text>
          <Text style={styles.cardRowValue} numberOfLines={2}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.chip, active ? styles.chipActive : null]}
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Pager({
  meta,
  onPrev,
  onNext,
}: {
  meta: ListMeta;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (meta.totalPages <= 1) return null;
  return (
    <View style={styles.pager}>
      <Pressable
        onPress={onPrev}
        disabled={meta.page <= 1}
        style={[styles.pageButton, meta.page <= 1 ? styles.disabled : null]}
        accessibilityLabel="Previous page"
      >
        <Text style={styles.pageButtonText}>Previous</Text>
      </Pressable>
      <Text style={styles.pagerLabel}>
        Page {meta.page} of {meta.totalPages}
      </Text>
      <Pressable
        onPress={onNext}
        disabled={meta.page >= meta.totalPages}
        style={[styles.pageButton, meta.page >= meta.totalPages ? styles.disabled : null]}
        accessibilityLabel="Next page"
      >
        <Text style={styles.pageButtonText}>Next</Text>
      </Pressable>
    </View>
  );
}

const styles = {
  search: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 2,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text,
  },
  cardRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
  },
  cardRowLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  cardRowValue: {
    fontSize: 13,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right' as const,
  },
  chips: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '600' as const,
  },
  pager: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 12,
  },
  pagerLabel: {
    fontSize: 12,
    color: colors.textFaint,
  },
  pageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pageButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text,
  },
  disabled: {
    opacity: 0.4,
  },
} as const;
