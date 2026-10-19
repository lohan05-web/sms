import { Pressable, Text, TextInput, View } from 'react-native';

import { colors, radius } from '../../theme';

/**
 * Form controls for the Teacher portal.
 *
 * They mirror the mobile auth/admin inputs — white surface, soft border, 10px
 * radius — and add the two shapes the teacher screens need that the shared
 * `DataList` chips don't cover: a labelled text field and a labelled single
 * choice rendered as wrapping chips (a native picker would be heavier and less
 * legible for short option sets like lesson status or a subject).
 */

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType = 'default',
  required,
  maxLength,
  hint,
  invalid,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  required?: boolean;
  maxLength?: number;
  hint?: string;
  invalid?: boolean;
  editable?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        style={[
          styles.input,
          multiline ? styles.inputMultiline : null,
          invalid ? styles.inputInvalid : null,
          editable ? null : styles.inputDisabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        multiline={multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        editable={editable}
        accessibilityLabel={label}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function ChoiceField<T extends string>({
  label,
  options,
  value,
  onChange,
  required,
  hint,
  disabled,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | '';
  onChange: (value: T) => void;
  required?: boolean;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View style={styles.chips}>
        {options.length === 0 ? (
          <Text style={styles.hint}>Nothing available to choose.</Text>
        ) : (
          options.map((option) => {
            const active = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => (disabled ? undefined : onChange(option.value))}
                disabled={disabled}
                style={[
                  styles.chip,
                  active ? styles.chipActive : null,
                  disabled ? styles.chipDisabled : null,
                ]}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: active, disabled: Boolean(disabled) }}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = {
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: colors.textMuted,
  },
  required: {
    color: colors.danger,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top' as const,
  },
  inputInvalid: {
    borderColor: colors.danger,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  hint: {
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textFaint,
  },
  chips: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '700' as const,
  },
} as const;
