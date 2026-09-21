// Validation shared by the user-facing and admin routes for community guides.

const { CATEGORY_KEYS } = require("../data/travelCategories");
const { HttpError, str } = require("./route");

const REPORT_REASONS = ["incorrect", "outdated", "misleading", "incomplete", "other"];

// Title + sections from a request body, trimmed and length-capped.
// Text is stored as plain text and only ever rendered as text.
function guideFields(body) {
  const title = str(body.title, 160);
  if (!title) throw new HttpError(400, "Give your guide a title.");

  const raw = Array.isArray(body.sections) ? body.sections : [];
  if (raw.length === 0) throw new HttpError(400, "Add at least one section.");
  if (raw.length > 30) throw new HttpError(400, "A guide can have at most 30 sections.");

  const sections = raw.map((s, i) => {
    const category = str(s && s.category, 40);
    if (!CATEGORY_KEYS.includes(category)) throw new HttpError(400, `Section ${i + 1}: choose a valid type.`);
    const sectionTitle = str(s.title, 160);
    if (!sectionTitle) throw new HttpError(400, `Section ${i + 1}: add a title.`);
    return { category, title: sectionTitle, body: str(s.body, 8000), contact: str(s.contact, 500) };
  });

  return { title, sections };
}

module.exports = { REPORT_REASONS, guideFields };
