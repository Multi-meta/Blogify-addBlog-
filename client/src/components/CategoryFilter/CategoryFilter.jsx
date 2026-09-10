// ============================================================
// CategoryFilter Component
// Vertical pill-style filter — subcategories appear inline
// immediately below the selected main category
// ============================================================

import CATEGORIES, { CATEGORY_LIST } from '../../data/categories';
import './CategoryFilter.css';

function CategoryFilter({ selectedCategory, selectedSubcategory, onFilterChange }) {
  const subcategories = selectedCategory ? CATEGORIES[selectedCategory] || [] : [];

  function handleCategoryClick(cat) {
    if (cat === selectedCategory) {
      onFilterChange('', '');
    } else {
      onFilterChange(cat, '');
    }
  }

  function handleSubcategoryClick(sub) {
    if (sub === selectedSubcategory) {
      onFilterChange(selectedCategory, '');
    } else {
      onFilterChange(selectedCategory, sub);
    }
  }

  return (
    <section className="category-filter">
      <h2 className="category-filter__heading">Browse by Category</h2>

      <div className="category-filter__row">
        {/* All pill */}
        <button
          className={`category-filter__pill ${!selectedCategory ? 'category-filter__pill--active' : ''}`}
          onClick={() => onFilterChange('', '')}
        >
          All
        </button>

        {/* Render each category, inject subcategories inline after the selected one */}
        {CATEGORY_LIST.map((cat) => (
          <div key={cat} className="category-filter__group">
            {/* Main category pill */}
            <button
              className={`category-filter__pill ${selectedCategory === cat ? 'category-filter__pill--active' : ''}`}
              onClick={() => handleCategoryClick(cat)}
            >
              {cat}
            </button>

            {/* Subcategory pills — only shown directly below the selected category */}
            {selectedCategory === cat && subcategories.length > 0 && (
              <div className="category-filter__sub-group">
                <button
                  className={`category-filter__pill category-filter__pill--sub ${!selectedSubcategory ? 'category-filter__pill--active' : ''}`}
                  onClick={() => onFilterChange(cat, '')}
                >
                  All {cat}
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
          </div>
        ))}
      </div>
    </section>
  );
}

export default CategoryFilter;
