function createPosCoreService(repository) {
  if (!repository) return null;

  return {
    listarTickets() {
      return repository.listarTickets();
    },

    async obtenerCatalogo() {
      const [tickets, servicios, inventario] = await Promise.all([
        repository.listarTickets(),
        repository.listarServicios(),
        repository.listarInventario()
      ]);
      return { tickets, servicios, inventario };
    },

    obtenerTurnoActivo() {
      return repository.obtenerTurnoAbierto();
    },

    abrirTurno(payload) {
      return repository.abrirTurno({
        operador: payload?.operador,
        deposito_inicial: payload?.deposito_inicial
      });
    },

    crearVenta(payload) {
      return repository.crearVenta({
        operador: payload?.operador,
        metodo_pago: payload?.metodo_pago,
        motivo_cortesia: payload?.motivo_cortesia,
        items: payload?.items,
        extras: payload?.extras
      });
    },

    agregarAdicionales(payload) {
      return repository.agregarAdicionales({
        folio: payload?.folio,
        operador: payload?.operador,
        metodo_pago: payload?.metodo_pago,
        motivo_cortesia: payload?.motivo_cortesia,
        items: payload?.items
      });
    },

    buscarBrazalete(folio) {
      return repository.buscarBrazalete(folio);
    },

    registrarEntrada(payload) {
      return repository.registrarEntrada({
        folio: payload?.folio,
        operador: payload?.operador
      });
    },

    registrarSalida(payload) {
      return repository.registrarSalida({
        folio: payload?.folio,
        operador: payload?.operador
      });
    },

    listarAdentro() {
      return repository.listarAdentro();
    },

    obtenerDashboard() {
      return repository.obtenerDashboard();
    }
  };
}

module.exports = { createPosCoreService };
