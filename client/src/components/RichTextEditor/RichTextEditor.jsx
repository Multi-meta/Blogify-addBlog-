// ============================================================
// RichTextEditor — TipTap-based rich text editor
// Features: Bold, Italic, Underline, Headings, Lists,
//           Blockquote, HR, and Inline Image upload
// Props:
//   content  — initial HTML string
//   onChange — (html: string) => void
// ============================================================

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useRef, useState } from 'react';
import './RichTextEditor.css';

function RichTextEditor({ content = '', onChange }) {
  const fileRef = useRef(null);
  const [tripOpen, setTripOpen] = useState(false);
  const [destinations, setDestinations] = useState(null); // null = not loaded yet

  const editor = useEditor({
    extensions: [
      // Includes Underline and Link since TipTap v3. Clicking a link while writing
      // shouldn't navigate away from the editor.
      StarterKit.configure({ link: { openOnClick: false } }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: 'Write your blog content here...' }),
    ],
    content,
    onUpdate({ editor }) {
      if (onChange) onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  // Upload image to server and insert into editor
  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/blog/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        editor.chain().focus().setImage({ src: data.url }).run();
      } else {
        alert(data.error || 'Image upload failed.');
      }
    } catch {
      alert('Could not upload image. Make sure the server is running.');
    }

    // Reset input so the same file can be re-selected
    e.target.value = '';
  }

  // Insert a "Travel Guide" button (a link to /travel/<slug>) at the cursor
  function toggleTripMenu() {
    const opening = !tripOpen;
    setTripOpen(opening);
    if (opening && destinations === null) {
      fetch('/api/travel')
        .then((r) => r.json())
        .then((d) => setDestinations(d.destinations || []))
        .catch(() => setDestinations([]));
    }
  }

  function insertTripButton(slug) {
    editor.chain().focus()
      .insertContent(`<p><a href="/travel/${slug}">Travel Guide</a></p>`)
      .run();
    setTripOpen(false);
  }

  function Btn({ onClick, active, title, children }) {
    return (
      <button
        type="button"
        className={`rich-editor__btn ${active ? 'rich-editor__btn--active' : ''}`}
        onClick={onClick}
        title={title}
      >
        {children}
      </button>
    );
  }

  function Divider() {
    return <span className="rich-editor__toolbar-divider" />;
  }

  return (
    <div className="rich-editor">
      {/* Toolbar */}
      <div className="rich-editor__toolbar">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()}
             active={editor.isActive('bold')} title="Bold">
          <b>B</b>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()}
             active={editor.isActive('italic')} title="Italic">
          <i>I</i>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()}
             active={editor.isActive('underline')} title="Underline">
          <u>U</u>
        </Btn>

        <Divider />

        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
             active={editor.isActive('heading', { level: 1 })} title="Heading 1">
          H1
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
             active={editor.isActive('heading', { level: 2 })} title="Heading 2">
          H2
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
             active={editor.isActive('heading', { level: 3 })} title="Heading 3">
          H3
        </Btn>

        <Divider />

        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()}
             active={editor.isActive('bulletList')} title="Bullet List">
          •
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()}
             active={editor.isActive('orderedList')} title="Numbered List">
          1.
        </Btn>

        <Divider />

        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()}
             active={editor.isActive('blockquote')} title="Quote">
          ❝
        </Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()}
             title="Horizontal Rule">
          ─
        </Btn>

        <Divider />

        {/* Image upload button */}
        <Btn onClick={() => fileRef.current?.click()} title="Insert Image">
          🖼️
        </Btn>

        {/* Travel Guide button */}
        <div className="rich-editor__trip">
          <Btn onClick={toggleTripMenu} active={tripOpen} title="Insert a Travel Guide button">
            🧳
          </Btn>
          {tripOpen && (
            <div className="rich-editor__trip-menu">
              <div className="rich-editor__trip-title">Travel Guide button for…</div>
              {destinations === null ? (
                <div className="rich-editor__trip-empty">Loading…</div>
              ) : destinations.length === 0 ? (
                <div className="rich-editor__trip-empty">No destinations yet. An admin can add them in Admin → Travel &amp; Plans.</div>
              ) : destinations.map((d) => (
                <button key={d._id} type="button" className="rich-editor__trip-item" onClick={() => insertTripButton(d.slug)}>
                  {d.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}

export default RichTextEditor;
