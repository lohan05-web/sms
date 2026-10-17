import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { createContactMessageSchema } from '@smartschool/shared';
import { ApiError, api } from '../../lib/api';
import { useForm } from '../../lib/form';
import { CONTACT_CHANNELS } from '../../lib/publicContent';
import { Icon } from '../../components/Icon';
import { PageHero, Section } from './sections';

const INITIAL = { name: '', email: '', phone: '', subject: '', message: '' };

export function PublicContactScreen() {
  const { values, errors, formError, setFormError, setValue, validate } = useForm(
    createContactMessageSchema,
    INITIAL,
  );
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setSent(false);
    const payload = validate();
    if (!payload) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/contact', payload);
      setSent(true);
      for (const key of Object.keys(INITIAL)) setValue(key, '');
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Could not send your message. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's talk about your school"
        description="Book a demo, ask a question or request a quote. Our team usually replies within one working day."
      />
      <Section>
        <View style={styles.split}>
          <View style={styles.aside}>
            <Text style={styles.asideTitle}>Talk to a human</Text>
            <Text style={styles.asideText}>
              Prefer to reach out directly? Use any of the channels below — or send us a note and we
              will get back to you shortly.
            </Text>
            <View>
              {CONTACT_CHANNELS.map((channel) => (
                <View key={channel.label} style={styles.channelRow}>
                  <Icon name={channel.icon} size={18} />
                  <View>
                    <Text style={styles.channelLabel}>{channel.label}</Text>
                    <Text style={styles.channelValue}>{channel.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.formCard}>
            {sent ? (
              <View style={styles.success}>
                <Icon name="check" size={20} />
                <View>
                  <Text style={styles.successTitle}>Thank you — your message is on its way.</Text>
                  <Text style={styles.successText}>We will be in touch shortly.</Text>
                </View>
              </View>
            ) : null}

            {formError ? (
              <Text style={styles.formError}>{formError}</Text>
            ) : null}

            <TextField
              label="Full name"
              value={String(values.name ?? '')}
              onChange={(value) => setValue('name', value)}
              placeholder="Jordan Rivera"
              error={errors.name}
            />
            <TextField
              label="Email"
              value={String(values.email ?? '')}
              onChange={(value) => setValue('email', value)}
              placeholder="you@school.edu"
              keyboardType="email-address"
              error={errors.email}
            />
            <View style={styles.formRow}>
              <TextField
                label="Phone (optional)"
                value={String(values.phone ?? '')}
                onChange={(value) => setValue('phone', value)}
                placeholder="+1 (555) 010-2020"
                keyboardType="phone-pad"
                error={errors.phone}
              />
              <TextField
                label="Subject (optional)"
                value={String(values.subject ?? '')}
                onChange={(value) => setValue('subject', value)}
                placeholder="Book a demo"
              />
            </View>
            <TextField
              label="Message"
              value={String(values.message ?? '')}
              onChange={(value) => setValue('message', value)}
              placeholder="Tell us about your school and what you would like to achieve."
              multiline
            />
            <Pressable style={styles.submit} onPress={onSubmit} disabled={submitting}>
              <Text style={styles.submitText}>
                {submitting ? 'Sending…' : 'Send message'}
              </Text>
            </Pressable>
            <Text style={styles.fineprint}>
              By sending this message you agree to be contacted about SmartSchool. We never share
              your details.
            </Text>
          </View>
        </View>
      </Section>
    </>
  );
}

function TextField({
  label,
  value,
  onChange,
  error,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  multiline?: boolean;
}) {
  const [text, setText] = useState(value);
  // Keep the local input in sync when the parent resets the value programmatically.
  const sync = (next: string) => {
    setText(next);
    onChange(next);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={sync}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = {
  split: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  aside: {
    flexGrow: 1,
    minWidth: 240,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  asideTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  asideText: {
    fontSize: 14,
    color: '#475569',
    marginTop: 6,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  channelLabel: {
    fontSize: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    color: '#64748b',
  },
  channelValue: {
    fontSize: 14,
    color: '#1e293b',
  },
  formCard: {
    flexGrow: 2,
    minWidth: 300,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  success: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    padding: 12,
  },
  successTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065f46',
  },
  successText: {
    fontSize: 14,
    color: '#047857',
  },
  formError: {
    color: '#b91c1c',
    fontSize: 14,
  },
  field: {
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  fieldError: {
    color: '#b91c1c',
    fontSize: 12,
    marginTop: 2,
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  submit: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  submitText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  fineprint: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
  },
} as const;
