/**
 * `{{ caseStudyPreview }}` -- true when this build is a case-study preview.
 *
 * It reads the flag through `builds.js` rather than testing `process.env`
 * itself, so the Netlify interlock guards every consumer and there is exactly
 * one definition of what "preview" means. A second `process.env.CASE_STUDY_PREVIEW === "1"`
 * written anywhere would be a second gate to keep in step with the first.
 */

const builds = require("./builds.js");

module.exports = () => builds.previewFlag(process.env);
