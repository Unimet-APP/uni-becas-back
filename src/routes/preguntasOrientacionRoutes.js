const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireEspecialistaOrAdmin } = require('../middleware/roles');
const preguntasOrientacionController = require('../controllers/preguntasOrientacionController');
const {
  validateCreatePregunta,
  validateUpdatePregunta,
  validatePreguntaIdParam,
} = require('../validators/orientacionVocacionalValidators');

const router = express.Router();

router.use(authenticate);
router.use(requireEspecialistaOrAdmin);

router.get('/', preguntasOrientacionController.list);
router.get('/:id', validatePreguntaIdParam, preguntasOrientacionController.getById);
router.post('/', validateCreatePregunta, preguntasOrientacionController.create);
router.put('/:id', validatePreguntaIdParam, validateUpdatePregunta, preguntasOrientacionController.update);
router.delete('/:id', validatePreguntaIdParam, preguntasOrientacionController.remove);

module.exports = router;
