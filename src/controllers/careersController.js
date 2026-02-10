// src/controllers/careersController.js
const careersService = require("../services/careersService");
const { sendSuccess, sendError } = require("../config/responses");

async function list(req, res, next) {
  try {
    const { q, faculty, area, page, limit, incluir_inactivas } = req.query;
    const includeInactive = req.user && ['especialista', 'admin'].includes(req.user.role) && incluir_inactivas === '1';

    const result = await careersService.listCareers({
      q: q?.trim() || undefined,
      faculty: faculty?.trim() || undefined,
      area: area?.trim() || undefined,
      page,
      limit,
      includeInactive,
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

    const includeInactive = req.user && ['especialista', 'admin'].includes(req.user.role);
    const career = includeInactive
      ? await careersService.getCareerByIdForEspecialista(id)
      : await careersService.getCareerById(id);
    if (!career) return res.status(404).json({ message: "Career not found" });

    return res.json(career);
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const career = await careersService.createCareer(req.body);
    return sendSuccess(res, career, "Carrera creada correctamente", 201);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return sendError(res, "ID de carrera inválido", 400);
    const career = await careersService.updateCareer(id, req.body);
    if (!career) return sendError(res, "Carrera no encontrada", 404);
    return sendSuccess(res, career, "Carrera actualizada correctamente");
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return sendError(res, "ID de carrera inválido", 400);
    const ok = await careersService.deleteCareer(id);
    if (!ok) return sendError(res, "Carrera no encontrada", 404);
    return sendSuccess(res, null, "Carrera desactivada correctamente");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
};