/**
 * ============================================================================
 * SETTING CONTROLLER
 * ============================================================================
 * Manages user application preferences/settings.
 *
 * Supported Settings:
 * 1. theme (string): UI theme preference ("light", "dark", etc.)
 * 2. front_side (string): Which side of flashcard shows first in practice:
 *    - "term" = Show English term first, then Vietnamese definition
 *    - "definition" = Show Vietnamese definition first, then English term
 *
 * Pattern: Lazy Creation
 *   - First GET creates Setting record with defaults if not exists
 *   - Subsequent updates use upsert (create if missing)
 *   - User always has a Setting record after first access
 *
 * Storage:
 *   - One Setting document per user
 *   - Key: user._id
 *   - Persists across app restarts
 * ============================================================================
 */

const Setting = require("../models/Setting");

/**
 * GET USER SETTINGS
 * GET /api/settings
 *
 * Fetches user's application settings.
 * Creates default Setting record on first access (lazy initialization).
 *
 * Process:
 *   1. Query Setting by user ID
 *   2. If not found: Create new Setting with defaults
 *   3. Return user's Setting record
 *
 * Response: 200 OK
 *   - user: User ID
 *   - theme: UI theme preference
 *   - front_side: Flashcard side preference
 *
 * Defaults (created on first access):
 *   - theme: Application's default theme
 *   - front_side: Application's default flashcard view
 */
const getMySetting = async (req, res, next) => {
  try {
    // Query user's setting
    let setting = await Setting.findOne({ user: req.user.id });

    // Lazy create: If first access, create default setting
    if (!setting) {
      setting = await Setting.create({ user: req.user.id });
    }

    return res.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * UPDATE USER SETTINGS
 * PATCH /api/settings
 *
 * Updates user's application settings. Supports partial updates.
 * Auto-creates Setting record if not exists (upsert pattern).
 *
 * Request Body (partial update - only provide fields to change):
 *   - theme (string, optional): New theme preference
 *   - front_side (string, optional): New flashcard side preference
 *
 * Process:
 *   1. Build updateData object with only provided fields
 *   2. Use findOneAndUpdate with upsert to update or create
 *   3. Return updated Setting record
 *
 * Upsert Behavior:
 *   - If Setting exists: Apply changes and return updated record
 *   - If not exists: Create new Setting with provided values + defaults
 *
 * Response: 200 OK
 *   - Updated Setting record with all fields
 *
 * Example Requests:
 *   PATCH /api/settings
 *   { "theme": "dark" }
 *   → Only theme updated, front_side unchanged
 *
 *   PATCH /api/settings
 *   { "front_side": "definition" }
 *   → Only front_side updated, theme unchanged
 */
const updateMySetting = async (req, res, next) => {
  try {
    // Build update data with only provided fields
    const updateData = {};

    // Only add theme if provided in request
    if (req.body.theme !== undefined) {
      updateData.theme = req.body.theme;
    }

    // Only add front_side if provided in request
    if (req.body.front_side !== undefined) {
      updateData.front_side = req.body.front_side;
    }

    // Upsert: Update existing or create new with defaults
    // new: true → return updated document
    // upsert: true → create if not exists
    // setDefaultsOnInsert: true → apply model defaults when creating
    const setting = await Setting.findOneAndUpdate({ user: req.user.id }, { $set: updateData }, { new: true, upsert: true, setDefaultsOnInsert: true });

    return res.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMySetting,
  updateMySetting,
};
