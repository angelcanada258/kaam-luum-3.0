const express = require('express');
const { createPosCoreService } = require('../services/pos-core-service');

function createPosRouter(repository) {
  const router = express.Router();
  const service = createPosCoreService(repository);
  if (!service) return router;

  router.get('/tickets', async (_req, res, next) => {
    try {
      res.json({ success: true, tickets: await service.listarTickets() });
    } catch (error) {
      next(error);
    }
  });

  router.get('/catalogo-pos', async (_req, res, next) => {
    try {
      res.json({ success: true, ...(await service.obtenerCatalogo()) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/dashboard', async (_req, res, next) => {
    try {
      res.json(await service.obtenerDashboard());
    } catch (error) {
      next(error);
    }
  });

  router.get('/turnos/activo', async (_req, res, next) => {
    try {
      res.json({ success: true, turno: await service.obtenerTurnoActivo() });
    } catch (error) {
      next(error);
    }
  });

  router.post('/turnos/abrir', async (req, res, next) => {
    try {
      const turno = await service.abrirTurno(req.body);
      res.status(201).json({ success: true, turno });
    } catch (error) {
      next(error);
    }
  });

  router.post('/ventas', async (req, res, next) => {
    try {
      const result = await service.crearVenta(req.body);
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  });

  router.post('/adicionales', async (req, res, next) => {
    try {
      const result = await service.agregarAdicionales(req.body);
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  });

  router.get('/brazaletes/:folio', async (req, res, next) => {
    try {
      const brazalete = await service.buscarBrazalete(req.params.folio);
      if (!brazalete) {
        const error = new Error(`Folio ${req.params.folio} no registrado en Caja.`);
        error.status = 404;
        throw error;
      }
      res.json({ success: true, brazalete });
    } catch (error) {
      next(error);
    }
  });

  router.post('/entrada', async (req, res, next) => {
    try {
      const brazalete = await service.registrarEntrada(req.body);
      res.json({ success: true, folio: brazalete.folio, brazalete });
    } catch (error) {
      next(error);
    }
  });

  router.post('/salida', async (req, res, next) => {
    try {
      const result = await service.registrarSalida(req.body);
      const brazalete = result.brazalete;
      const duration = brazalete.entrada_en
        ? Math.max(0, Math.round((brazalete.salida_en - brazalete.entrada_en) / 60000))
        : 0;
      res.json({
        success: true,
        folio: brazalete.folio,
        duracion_minutos: duration,
        brazalete,
        rentas_liberadas: Number(result.rentas_liberadas) || 0
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/adentro-pos', async (_req, res, next) => {
    try {
      const rows = await service.listarAdentro();
      res.json(rows.map((row) => ({
        folio: row.folio,
        tipo: row.tipo_visitante,
        entrada_timestamp: row.entrada_en,
        ticket_id: row.ticket_id,
        color: row.color
      })));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createPosRouter };
