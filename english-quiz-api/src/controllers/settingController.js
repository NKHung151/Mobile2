const Setting = require('../models/Setting');

const getMySetting = async (req, res, next) => {
  try {
    let setting = await Setting.findOne({ user: req.user.id });

    // Create default setting on first access.
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

const updateMySetting = async (req, res, next) => {
  try {
    const updateData = {};

    if (req.body.theme !== undefined) {
      updateData.theme = req.body.theme;
    }

    if (req.body.front_side !== undefined) {
      updateData.front_side = req.body.front_side;
    }

    const setting = await Setting.findOneAndUpdate(
      { user: req.user.id },
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

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
