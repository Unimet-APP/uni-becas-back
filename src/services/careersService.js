// src/services/careersService.js
const { Op } = require("sequelize");
const { Career } = require("../models");

function toInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

async function listCareers({ q, faculty, area, page, limit, includeInactive = false }) {
  const where = includeInactive ? {} : { is_active: true };

  if (q) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${q}%` } },
      { description: { [Op.iLike]: `%${q}%` } },
    ];
  }
  if (faculty) where.faculty = faculty;
  if (area) where.area = area;

  const pageNum = toInt(page, 1);
  const limitNum = Math.min(toInt(limit, 20), 200);
  const offset = (pageNum - 1) * limitNum;

  const { rows, count } = await Career.findAndCountAll({
    where,
    attributes: ["id", "code", "name", "faculty", "area", "description", "duration", "modality"],
    order: [["name", "ASC"]],
    limit: limitNum,
    offset,
  });

  return {
    data: rows,
    page: pageNum,
    limit: limitNum,
    total: count,
    totalPages: Math.ceil(count / limitNum) || 1,
  };
}

async function getCareerById(id) {
  return Career.findOne({
    where: { id, is_active: true },
    attributes: ["id", "code", "name", "faculty", "area", "description", "profile", "job_field", "duration", "modality"],
  });
}

async function getCareerByIdForEspecialista(id) {
  return Career.findByPk(id);
}

async function createCareer(payload) {
  const {
    code,
    name,
    faculty,
    area,
    description,
    profile,
    job_field,
    duration,
    modality,
  } = payload;
  return Career.create({
    code: code || null,
    name,
    faculty,
    area: area || null,
    description: description || null,
    profile: profile || null,
    job_field: job_field || null,
    duration: duration || null,
    modality: modality || null,
    is_active: true,
  });
}

async function updateCareer(id, payload) {
  const career = await Career.findByPk(id);
  if (!career) return null;
  const allowed = ["code", "name", "faculty", "area", "description", "profile", "job_field", "duration", "modality", "is_active"];
  const toUpdate = {};
  for (const key of allowed) {
    if (payload[key] !== undefined) toUpdate[key] = payload[key];
  }
  await career.update(toUpdate);
  return career;
}

async function deleteCareer(id) {
  const career = await Career.findByPk(id);
  if (!career) return false;
  await career.update({ is_active: false });
  return true;
}

module.exports = {
  listCareers,
  getCareerById,
  getCareerByIdForEspecialista,
  createCareer,
  updateCareer,
  deleteCareer,
};