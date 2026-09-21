// ============================================================
// GuideForm — title + a list of sections (how to reach, hotels, itinerary…).
// Used by users writing their own guide and by the admin editing one.
// `children` are extra fields (admin: plan level, status) shown above the buttons.
// ============================================================

import { useState } from 'react';
import './GuideForm.css';

const blankSection = (category) => ({ category, title: '', body: '', contact: '' });

function GuideForm({ initial, categories, submitLabel = 'Submit', onSubmit, onCancel, children }) {
  const [title, setTitle]       = useState(initial?.title ?? '');
  const [sections, setSections] = useState(
    initial?.sections?.length
      ? initial.sections.map((s) => ({ category: s.category, title: s.title, body: s.body || '', contact: s.contact || '' }))
      : [blankSection(categories[0]?.key || 'overview')]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const setSection = (i, key) => (e) =>
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: e.target.value } : s)));

  const addSection = () => setSections((prev) => [...prev, blankSection(prev[prev.length - 1]?.category || categories[0]?.key)]);
  const removeSection = (i) => setSections((prev) => prev.filter((_, idx) => idx !== i));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit({ title, sections });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="gf" onSubmit={submit}>
      {error && <div className="gf__error">{error}</div>}

      <label className="gf__label" htmlFor="gf-title">Guide title</label>
      <input
        id="gf-title" className="gf__input" type="text" maxLength={160} required
        placeholder="e.g. Warangal in a weekend on a budget"
        value={title} onChange={(e) => setTitle(e.target.value)}
      />

      {sections.map((s, i) => (
        <div key={i} className="gf__section">
          <div className="gf__section-head">
            <select className="gf__input" value={s.category} onChange={setSection(i, 'category')} aria-label="Section type">
              {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            {sections.length > 1 && (
              <button type="button" className="gf__link" onClick={() => removeSection(i)}>Remove</button>
            )}
          </div>
          <input
            className="gf__input" type="text" maxLength={160} required placeholder="Title (e.g. Hotel Kakatiya)"
            value={s.title} onChange={setSection(i, 'title')}
          />
          <textarea
            className="gf__input" rows={4} maxLength={8000} placeholder="Details — timings, prices, tips…"
            value={s.body} onChange={setSection(i, 'body')}
          />
          <input
            className="gf__input" type="text" maxLength={500} placeholder="Phone / link / booking info (optional)"
            value={s.contact} onChange={setSection(i, 'contact')}
          />
        </div>
      ))}

      {sections.length < 30 && (
        <button type="button" className="gf__add" onClick={addSection}>+ Add another section</button>
      )}

      {children}

      <div className="gf__actions">
        <button type="submit" className="gf__btn gf__btn--primary" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        {onCancel && <button type="button" className="gf__btn" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

export default GuideForm;
