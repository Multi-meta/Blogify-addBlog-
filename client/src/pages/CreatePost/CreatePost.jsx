// ============================================================
// CreatePost Page — posts real blog to MongoDB via Express
// Uses TipTap rich text editor for the body
// Route: /blog/add-new
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RichTextEditor from '../../components/RichTextEditor/RichTextEditor';
import CATEGORIES, { CATEGORY_LIST } from '../../data/categories';
import './CreatePost.css';

function CreatePost({ user }) {
  const navigate = useNavigate();
  const [title, setTitle]             = useState('');
  const [body, setBody]               = useState('');
  const [coverFile, setCoverFile]     = useState(null);
  const [previewURL, setPreviewURL]   = useState('');
  const [category, setCategory]       = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  const subcategories = category ? CATEGORIES[category] || [] : [];

  // Redirect unauthenticated users
  useEffect(() => {
    if (!user) navigate('/user/signin');
  }, [user, navigate]);

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
      // Use FormData so multer can handle the file upload on the backend
      const formData = new FormData();
      formData.append('title', title);
      formData.append('body', body);
      if (coverFile) formData.append('coverImage', coverFile);
      formData.append('category', category);
      formData.append('subcategory', subcategory);

      const res = await fetch('/blog', {
        method: 'POST',
        credentials: 'include',
        body: formData,            // Do NOT set Content-Type; browser sets it with boundary
      });

      const data = await res.json();

      if (res.ok && data.success) {
        navigate(`/blog/${data.blog._id}`);
      } else {
        setError(data.error || 'Failed to create blog.');
      }
    } catch {
      setError('Cannot reach server. Please start Express on port 8000.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="create-post">
      <h1 className="create-post__heading">Create New Post</h1>

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
              {coverFile ? coverFile.name : 'Click to upload a cover image'}
              <input
                type="file"
                accept="image/*"
                className="form-field__file-input"
                onChange={handleFileChange}
              />
            </label>
            {previewURL && (
              <img src={previewURL} alt="Preview" className="form-field__preview" />
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

        {/* Body — Rich Text Editor */}
        <div className="form-field">
          <label className="form-field__label">Body</label>
          <RichTextEditor content={body} onChange={setBody} />
        </div>

        <button type="submit" className="create-post__submit" disabled={submitting}>
          {submitting ? 'Publishing...' : 'Publish Post'}
        </button>

      </form>
    </div>
  );
}

export default CreatePost;
