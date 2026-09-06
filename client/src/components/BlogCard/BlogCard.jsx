// ============================================================
// BlogCard Component
// Displays a single blog post as a card
// Props:
//   blog: { _id, title, body, coverImageURL, categories,
//            createdBy: { fullName, profileImageURL },
//            createdAt }
// ============================================================

import { Link } from 'react-router-dom';
import './BlogCard.css';

// Format date: "Nov 11, 2023"
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function BlogCard({ blog }) {
  const {
    _id,
    title,
    body,
    coverImageURL,
    categories = [],
    createdBy,
    createdAt,
  } = blog;

  return (
    <article className="blog-card">

      {/* Cover Image */}
      <div className="blog-card__image-wrap">
        <img
          src={coverImageURL}
          alt={title}
          className="blog-card__image"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = 'https://placehold.co/400x250?text=No+Image';
          }}
        />
      </div>

      {/* Card Body */}
      <div className="blog-card__body">

        {/* Category Tags */}
        {categories.length > 0 && (
          <div className="blog-card__tags">
            {categories.map((cat, i) => (
              <span key={i} className="blog-card__tag">
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="blog-card__title">{title}</h3>

        {/* Excerpt */}
        <p className="blog-card__excerpt">{body}</p>

        {/* Footer: Author + Read More */}
        <div className="blog-card__footer">
          <div className="blog-card__author">
            <img
              src={createdBy?.profileImageURL || 'https://placehold.co/32x32'}
              alt={createdBy?.fullName}
              className="blog-card__avatar"
              onError={(e) => {
                e.currentTarget.src = 'https://placehold.co/32x32';
              }}
            />
            <div className="blog-card__author-info">
              <span className="blog-card__author-name">
                {createdBy?.fullName}
              </span>
              <span className="blog-card__date">{formatDate(createdAt)}</span>
            </div>
          </div>

          <Link to={`/blog/${_id}`} className="blog-card__btn">
            Read More
          </Link>
        </div>

      </div>
    </article>
  );
}

export default BlogCard;
