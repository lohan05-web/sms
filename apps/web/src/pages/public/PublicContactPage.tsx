import { createContactMessageSchema } from '@smartschool/shared';
import { useState, type FormEvent } from 'react';
import { Icon } from '../../components/Icon';
import { ApiError, api } from '../../lib/api';
import { useForm } from '../../lib/form';
import { CONTACT_CHANNELS } from '../../lib/publicContent';
import { PageHero, Section } from './sections';

const INITIAL = { name: '', email: '', phone: '', subject: '', message: '' };

export function PublicContactPage() {
  const { values, errors, formError, setFormError, setValue, validate } = useForm(
    createContactMessageSchema,
    INITIAL,
  );
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
        <div className="site-contact">
          <div className="site-contact__aside">
            <h2>Talk to a human</h2>
            <p>
              Prefer to reach out directly? Use any of the channels below — or send us a note and we
              will get back to you shortly.
            </p>
            <ul className="site-channels">
              {CONTACT_CHANNELS.map((channel) => (
                <li key={channel.label}>
                  <span className="site-card__icon">
                    <Icon name={channel.icon} size={18} />
                  </span>
                  <div>
                    <small>{channel.label}</small>
                    {channel.href ? (
                      <a href={channel.href}>{channel.value}</a>
                    ) : (
                      <span>{channel.value}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <form className="site-card site-form" onSubmit={onSubmit} noValidate>
            {sent ? (
              <div className="site-form__success">
                <Icon name="check" size={20} />
                <div>
                  <strong>Thank you — your message is on its way.</strong>
                  <p>We will be in touch shortly.</p>
                </div>
              </div>
            ) : null}

            {formError ? <div className="alert alert--error">{formError}</div> : null}

            <div className="site-form__row">
              <label className="field">
                <span className="field__label">Full name</span>
                <input
                  className="field__input"
                  type="text"
                  autoComplete="name"
                  value={String(values.name ?? '')}
                  onChange={(event) => setValue('name', event.target.value)}
                  placeholder="Jordan Rivera"
                />
                {errors.name ? <span className="field__error">{errors.name}</span> : null}
              </label>

              <label className="field">
                <span className="field__label">Email</span>
                <input
                  className="field__input"
                  type="email"
                  autoComplete="email"
                  value={String(values.email ?? '')}
                  onChange={(event) => setValue('email', event.target.value)}
                  placeholder="you@school.edu"
                />
                {errors.email ? <span className="field__error">{errors.email}</span> : null}
              </label>
            </div>

            <div className="site-form__row">
              <label className="field">
                <span className="field__label">
                  Phone <span className="field__optional">optional</span>
                </span>
                <input
                  className="field__input"
                  type="tel"
                  autoComplete="tel"
                  value={String(values.phone ?? '')}
                  onChange={(event) => setValue('phone', event.target.value)}
                  placeholder="+1 (555) 010-2020"
                />
                {errors.phone ? <span className="field__error">{errors.phone}</span> : null}
              </label>

              <label className="field">
                <span className="field__label">
                  Subject <span className="field__optional">optional</span>
                </span>
                <input
                  className="field__input"
                  type="text"
                  value={String(values.subject ?? '')}
                  onChange={(event) => setValue('subject', event.target.value)}
                  placeholder="Book a demo"
                />
                {errors.subject ? <span className="field__error">{errors.subject}</span> : null}
              </label>
            </div>

            <label className="field">
              <span className="field__label">Message</span>
              <textarea
                className="field__input field__input--textarea"
                rows={5}
                value={String(values.message ?? '')}
                onChange={(event) => setValue('message', event.target.value)}
                placeholder="Tell us about your school and what you would like to achieve."
              />
              {errors.message ? <span className="field__error">{errors.message}</span> : null}
            </label>

            <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send message'}
            </button>
            <p className="site-fineprint">
              By sending this message you agree to be contacted about SmartSchool. We never share
              your details.
            </p>
          </form>
        </div>
      </Section>
    </>
  );
}
