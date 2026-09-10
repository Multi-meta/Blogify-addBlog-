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
import { useRef } from 'react';
import './RichTextEditor.css';

function RichTextEditor({ content = '', onChange }) {
  const fileRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit, // includes Underline since TipTap v3
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
