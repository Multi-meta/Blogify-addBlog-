// ============================================================
// CategoryFilter Component
// Horizontal pill-style filter bar for categories & subcategories
// Props:
//   selectedCategory: string
//   selectedSubcategory: string
//   onFilterChange: (category, subcategory) => void
// ============================================================

import CATEGORIES, { CATEGORY_LIST } from '../../data/categories';
import './CategoryFilter.css';

function CategoryFilter({ selectedCategory, selectedSubcategory, onFilterChange }) {
  const subcategories = selectedCategory ? CATEGORIES[selectedCategory] || [] : [];

  function handleCategoryClick(cat) {
    if (cat === selectedCategory) {
      // Clicking same category again → deselect (show all)
      onFilterChange('', '');
    } else {
      onFilterChange(cat, '');
    }
  }

  function handleSubcategoryClick(sub) {
    if (sub === selectedSubcategory) {
      // Clicking same subcategory → deselect (show all in category)
      onFilterChange(selectedCategory, '');
    } else {
      onFilterChange(selectedCategory, sub);
    }
  }

  return (
    <section className="category-filter">
      <h2 className="category-filter__heading">Browse by Category</h2>

      {/* Main Categories */}
      <div className="category-filter__row">
        <button
          className={`category-filter__pill ${!selectedCategory ? 'category-filter__pill--active' : ''}`}
          onClick={() => onFilterChange('', '')}
        >
          All
        </button>
        {CATEGORY_LIST.map((cat) => (
          <button
            key={cat}
            className={`category-filter__pill ${selectedCategory === cat ? 'category-filter__pill--active' : ''}`}
            onClick={() => handleCategoryClick(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Subcategories — visible only when a main category is selected */}
      {selectedCategory && subcategories.length > 0 && (
        <div className="category-filter__row category-filter__row--sub">
          <button
            className={`category-filter__pill category-filter__pill--sub ${!selectedSubcategory ? 'category-filter__pill--active' : ''}`}
            onClick={() => onFilterChange(selectedCategory, '')}
          >
            All {selectedCategory}
          </button>
          {subcategories.map((sub) => (
            <button
              key={sub}
              className={`category-filter__pill category-filter__pill--sub ${selectedSubcategory === sub ? 'category-filter__pill--active' : ''}`}
              onClick={() => handleSubcategoryClick(sub)}
            >
              {sub}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default CategoryFilter;
