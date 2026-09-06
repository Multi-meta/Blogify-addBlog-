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

export default CATEGORIES;
