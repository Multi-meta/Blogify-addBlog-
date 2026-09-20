// ============================================================
// Categories — single source of truth
// Used by CategoryFilter, CreatePost, and EditPost
// ============================================================

const CATEGORIES = {
  Sports: ['Cricket', 'Football', 'Basketball', 'Tennis', 'Other'],
  Travel: ['Adventure', 'Beach & Islands', 'City Breaks', 'Road Trips', 'Other'],
  Technology: ['AI & Machine Learning', 'Web Development', 'Mobile Apps', 'Gadgets & Reviews', 'Other'],
  Food: ['Recipes', 'Restaurant Reviews', 'Street Food', 'Healthy Eating', 'Other'],
  Entertainment: ['Movies & TV', 'Music', 'Gaming', 'Books & Literature', 'Other'],
  Lifestyle: ['Fashion & Beauty', 'Health & Fitness', 'Home & Decor', 'Relationships', 'Other'],
  Education: ['Study Tips', 'Career Guidance', 'Online Courses', 'Science & Research', 'Other'],
  Business: ['Startups', 'Marketing', 'Finance & Investing', 'Freelancing', 'Other'],
};

export const CATEGORY_LIST = Object.keys(CATEGORIES);

// Accent color per top-level category — used for the fallback cover image
// shown when a blog has no cover image (or its URL is broken)
const CATEGORY_COLORS = {
  Sports: '2563eb',
  Travel: '059669',
  Technology: '7c3aed',
  Food: 'ea580c',
  Entertainment: 'db2777',
  Lifestyle: '0891b2',
  Education: 'ca8a04',
  Business: '475569',
};
const DEFAULT_COLOR = '64748b';

// A stable, always-available placeholder labeled with the blog's own
// category/subcategory, so a missing cover image never looks generic
// or broken — unlike a hotlinked stock photo, this can't 404.
export function getFallbackCoverImage(category, subcategory) {
  const color = CATEGORY_COLORS[category] || DEFAULT_COLOR;
  const label = subcategory || category || 'Blogify';
  return `https://placehold.co/700x420/${color}/ffffff?text=${encodeURIComponent(label)}`;
}

export default CATEGORIES;
