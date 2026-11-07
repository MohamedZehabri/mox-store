"use strict";
// Public config for the browser: only the Pixel ID (it is public by design). Never returns the token.
module.exports = (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json({ pixel_id: process.env.META_PIXEL_ID || null });
};
