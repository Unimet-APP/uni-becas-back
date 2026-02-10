// src/routes/careersRoutes.js
const express = require("express");
const careersController = require("../controllers/careersController");
const { authenticate, optionalAuth } = require("../middleware/auth");
const { requireEspecialistaOrAdmin } = require("../middleware/roles");
const { validateCreateCareer, validateUpdateCareer } = require("../validators/careersValidators");

const router = express.Router();

// Público (para que tu /vocational-explorer cargue sin login). optionalAuth para que especialista pueda usar ?incluir_inactivas=1
router.get("/", optionalAuth, careersController.list);
router.get("/:id", optionalAuth, careersController.detail);

// Gestión de carreras (especialista/admin): crear, editar, desactivar
router.post("/", authenticate, requireEspecialistaOrAdmin, validateCreateCareer, careersController.create);
router.put("/:id", authenticate, requireEspecialistaOrAdmin, validateUpdateCareer, careersController.update);
router.delete("/:id", authenticate, requireEspecialistaOrAdmin, careersController.remove);

module.exports = router;