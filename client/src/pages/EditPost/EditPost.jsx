// ============================================================
// EditPost Page — edit an existing blog
// Uses TipTap rich text editor for the body
// Route: /blog/edit/:id
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RichTextEditor from '../../components/RichTextEditor/RichTextEditor';
import CATEGORIES, { CATEGORY_LIST } from '../../data/categories';
import '../CreatePost/CreatePost.css';

function EditPost({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle]                 = useState('');
  const [body, setBody]                   = useState('');
  const [coverFile, setCoverFile]         = useState(null);
  const [previewURL, setPreviewURL]       = useState('');
  const [existingCover, setExistingCover] = useState('');
  const [category, setCategory]           = useState('');
  const [subcategory, setSubcategory]     = useState('');
  const [loading, setLoading]             = useState(true);
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState('');

  const subcategories = category ? CATEGORIES[category] || [] : [];

  // Redirect if not signed in
  useEffect(() => {
    if (!user) navigate('/user/signin');
  }, [user, navigate]);

  // Fetch existing blog data
  useEffect(() => {
    if (!user) return;
    fetch(`/blog/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const blog = data.blog;
          // Check ownership (or admin)
          if (
            String(blog.createdBy?._id) !== String(user._id) &&
            user.role !== 'ADMIN'
          ) {
            navigate('/');
            return;
          }
          setTitle(blog.title);
          setBody(blog.body);
          setExistingCover(blog.coverImageURL || '');
          setCategory(blog.category || '');
          setSubcategory(blog.subcategory || '');
        } else {
          setError('Blog not found.');
        }
      })
      .catch(() => setError('Could not connect to server.'))
      .finally(() => setLoading(false));
  }, [id, user, navigate]);

  function handleCategoryChange(e) {
    setCategory(e.target.value);
    setSubcategory(''); // reset subcategory when category changes
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setPreviewURL(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('body', body);
      if (coverFile) formData.append('coverImage', coverFile);
      formData.append('category', category);
      formData.append('subcategory', subcategory);

      const res = await fetch(`/blog/${id}`, {
        method: 'PUT',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        navigate(`/blog/${id}`);
      } else {
        setError(data.error || 'Failed to update blog.');
      }
    } catch {
      setError('Cannot reach server. Please start Express on port 8000.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="create-post">
        <p style={{ color: 'var(--color-text-muted)', marginTop: '2rem' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="create-post">
      <h1 className="create-post__heading">Edit Post</h1>

      <form className="create-post__form" onSubmit={handleSubmit}>

        {error && (
          <div style={{
            background: '#fef2f2', color: '#ef4444',
            border: '1px solid #fecaca', borderRadius: '8px',
            padding: '0.75rem 1rem', fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {/* Cover Image */}
        <div className="form-field">
          <label className="form-field__label">Cover Image</label>
          <div className="form-field__file-wrap">
            <label className="form-field__file-label">
              📷&nbsp;
              {coverFile ? coverFile.name : 'Click to replace cover image (optional)'}
              <input
                type="file"
                accept="image/*"
                className="form-field__file-input"
                onChange={handleFileChange}
              />
            </label>
            {(previewURL || existingCover) && (
              <img
                src={previewURL || existingCover}
                alt="Cover preview"
                className="form-field__preview"
              />
            )}
          </div>
        </div>

        {/* Category & Subcategory */}
        <div className="form-field__row">
          <div className="form-field">
            <label className="form-field__label" htmlFor="category">Category</label>
            <select
              id="category"
              className="form-field__select"
              value={category}
              onChange={handleCategoryChange}
            >
              <option value="">Select a category</option>
              {CATEGORY_LIST.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="form-field__label" htmlFor="subcategory">Subcategory</label>
            <select
              id="subcategory"
              className="form-field__select"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              disabled={!category}
            >
              <option value="">
                {category ? 'Select a subcategory' : 'Choose category first'}
              </option>
              {subcategories.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Title */}
        <div className="form-field">
          <label className="form-field__label" htmlFor="title">Title</label>
          <input
            id="title" name="title" type="text"
            className="form-field__input"
            placeholder="Enter blog title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Body — Rich Text Editor (pre-filled) */}
        <div className="form-field">
          <label className="form-field__label">Body</label>
          <RichTextEditor content={body} onChange={setBody} />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" className="create-post__submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            className="create-post__submit"
            style={{ background: '#6b7280' }}
            onClick={() => navigate(`/blog/${id}`)}
          >
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
}

export default EditPost;
