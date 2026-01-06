// src/routes/careersRoutes.js
const express = require("express");
const careersController = require("../controllers/careersController");

const router = express.Router();

// Público (para que tu /vocational-explorer cargue sin login)
router.get("/", careersController.list);
router.get("/:id", careersController.detail);

module.exports = router;