// src/controllers/careersController.js
const careersService = require("../services/careersService");

async function list(req, res, next) {
  try {
    const { q, faculty, area, page, limit } = req.query;

    const result = await careersService.listCareers({
      q: q?.trim() || undefined,
      faculty: faculty?.trim() || undefined,
      area: area?.trim() || undefined,
      page,
      limit,
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function detail(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const career = await careersService.getCareerById(id);
    if (!career) return res.status(404).json({ message: "Career not found" });

    return res.json(career);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list,
  detail,
};