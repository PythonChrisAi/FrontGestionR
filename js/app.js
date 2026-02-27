// Módulo principal que maneja la interfaz de usuario
const UI = {
    currentSection: 'cocina',
    alertas: [],
    user: null,
    badges: {
        cocina: 0,
        mesas: 0,
        alertas: 0
    },
    
    // Estado para órdenes
    ordenActual: {
        cuentaId: null,
        mesaId: null,
        mesaNumero: null,
        items: [], // { producto_id, nombre, cantidad, precio, cliente }
        clientes: ['General']
    },
    
    // Estado para fusión de mesas
    fusionState: {
        mesaPrincipal: null,
        mesasSeleccionadas: []
    },
    
    // Cache del menú
    menuCache: [],

    init() {
        console.log('🚀 Inicializando FrontGestionR v' + CONFIG.version);
        
        this.checkAuth();
        Sockets.init();
        this.setupNavigation();
        this.setupEventListeners();
        this.cargarDatosIniciales();
        this.setupRefreshIntervals();
        
        this.agregarAlerta(
            '🎉 Bienvenido',
            'FrontGestionR conectado al sistema',
            'info'
        );
    },

    checkAuth() {
        const token = localStorage.getItem('authToken');
        const userStr = localStorage.getItem('user');
        
        if (token && userStr) {
            try {
                this.user = JSON.parse(userStr);
                document.getElementById('user-menu').style.display = 'flex';
                document.getElementById('userName').textContent = this.user.nombre;
                document.getElementById('login-nav-btn').style.display = 'none';
            } catch (e) {
                this.mostrarLogin();
            }
        } else {
            this.mostrarLogin();
        }
    },

    mostrarLogin() {
        this.user = null;
        document.getElementById('user-menu').style.display = 'none';
        document.getElementById('login-nav-btn').style.display = 'flex';
        this.cambiarSeccion('login');
    },

    setupNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                this.cambiarSeccion(section);
            });
        });

        document.getElementById('btnLogout')?.addEventListener('click', () => {
            API.logout();
            this.mostrarLogin();
            this.agregarAlerta('👋 Sesión cerrada', 'Has cerrado sesión exitosamente', 'info');
        });

        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });
    },

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('login-error');
        
        try {
            errorEl.textContent = 'Iniciando sesión...';
            const result = await API.login(username, password);
            
            this.user = result.usuario;
            document.getElementById('user-menu').style.display = 'flex';
            document.getElementById('userName').textContent = this.user.nombre;
            document.getElementById('login-nav-btn').style.display = 'none';
            
            this.cambiarSeccion('cocina');
            this.agregarAlerta(
                '✅ Login exitoso',
                `Bienvenido ${this.user.nombre}`,
                'success'
            );
            
            errorEl.textContent = '';
        } catch (error) {
            errorEl.textContent = error.message;
        }
    },

    setupEventListeners() {
        document.querySelectorAll('.btn-refresh').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.currentSection === 'cocina') {
                    CargarDatos.cargarPedidosPendientes();
                } else if (this.currentSection === 'mesas') {
                    CargarDatos.cargarMesas();
                }
            });
        });
    },

    cargarDatosIniciales() {
        CargarDatos.cargarPedidosPendientes();
        CargarDatos.cargarMesas();
        CargarDatos.cargarMenu(); // Cargar menú para órdenes
    },

    setupRefreshIntervals() {
        setInterval(() => {
            if (this.currentSection === 'cocina') {
                CargarDatos.cargarPedidosPendientes();
            }
        }, CONFIG.refreshIntervals.pedidos);

        setInterval(() => {
            if (this.currentSection === 'mesas') {
                CargarDatos.cargarMesas();
            }
        }, CONFIG.refreshIntervals.mesas);
    },

    cambiarSeccion(sectionId) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === sectionId) {
                btn.classList.add('active');
            }
        });

        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(sectionId + '-section');
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionId;
        }
    },

    // ========== MODALES ==========
    abrirModal(tipo, datos = {}) {
        const modalId = tipo + '-modal';
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        const modalBody = document.getElementById(modalId.replace('modal', 'modal-body'));
        
        switch(tipo) {
            case 'mesa':
                this.renderModalMesa(modalBody, datos);
                break;
            case 'orden':
                this.renderModalOrden(modalBody, datos);
                break;
            case 'pago':
                this.renderModalPago(modalBody, datos);
                break;
        }
        
        modal.style.display = 'flex';
    },

    cerrarModal(tipo = null) {
        if (tipo) {
            document.getElementById(tipo + '-modal').style.display = 'none';
        } else {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    },

    // ========== RENDERIZADO DE MODALES ==========
    renderModalMesa(container, mesa) {
        const puedeCambiarEstado = this.user && [1,2,3].includes(this.user.rol_id);
        const puedeFusionar = this.user && [1,2].includes(this.user.rol_id);
        const puedeAbrirCuenta = this.user && [1,3].includes(this.user.rol_id);
        
        container.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <span class="mesa-numero" style="font-size: 3rem;">${mesa.numero}</span>
                <span class="mesa-estado" style="font-size: 1.2rem; display: block; margin-top: 10px;">
                    Estado actual: <strong>${mesa.estado}</strong>
                </span>
            </div>
            
            ${puedeCambiarEstado ? `
                <div class="form-group">
                    <label>Cambiar Estado:</label>
                    <select id="cambiar-estado-mesa" class="estado-select" onchange="UI.cambiarEstadoMesa(${mesa.id}, this.value)">
                        <option value="disponible" ${mesa.estado === 'disponible' ? 'selected' : ''}>🟢 Disponible</option>
                        <option value="ocupada" ${mesa.estado === 'ocupada' ? 'selected' : ''}>🔴 Ocupada</option>
                        <option value="reservada" ${mesa.estado === 'reservada' ? 'selected' : ''}>🟡 Reservada</option>
                    </select>
                </div>
            ` : ''}
            
            <div class="btn-group">
                ${mesa.estado === 'disponible' && puedeAbrirCuenta ? `
                    <button class="btn-success" onclick="UI.abrirCuentaMesa(${mesa.id}, ${mesa.numero})">
                        📝 Abrir Cuenta
                    </button>
                ` : mesa.estado === 'ocupada' ? `
                    <button class="btn-primary" onclick="UI.tomarOrdenMesa(${mesa.id}, ${mesa.numero})">
                        🍽️ Tomar Orden
                    </button>
                    <button class="btn-success" onclick="UI.verCuenta(${mesa.id})">
                        💰 Ver Cuenta / Pagar
                    </button>
                ` : ''}
                
                ${puedeFusionar && mesa.estado !== 'ocupada' ? `
                    <button class="btn-secondary" onclick="UI.iniciarFusionMesa(${mesa.id}, ${mesa.numero})">
                        🔗 Fusionar Mesas
                    </button>
                ` : ''}
                
                <button class="btn-secondary" onclick="UI.cerrarModal('mesa')">
                    ❌ Cerrar
                </button>
            </div>
            
            ${mesa.mesa_padre_id ? `
                <div style="margin-top: 20px; padding: 10px; background: rgba(99,102,241,0.2); border-radius: 10px;">
                    <small>Esta mesa está fusionada con la mesa principal ID: ${mesa.mesa_padre_id}</small>
                </div>
            ` : ''}
        `;
    },

    renderModalOrden(container, datos) {
        const { mesaId, mesaNumero } = datos;
        this.ordenActual.mesaId = mesaId;
        this.ordenActual.mesaNumero = mesaNumero;
        
        container.innerHTML = `
            <h3>Mesa ${mesaNumero} - Tomar Orden</h3>
            
            <div class="form-group">
                <label>Seleccionar Cliente:</label>
                <div class="cliente-tabs" id="cliente-tabs">
                    ${this.ordenActual.clientes.map((cliente, idx) => `
                        <span class="cliente-tab ${idx === 0 ? 'active' : ''}" 
                              onclick="UI.seleccionarCliente(${idx})">
                            ${cliente}
                            ${idx > 0 ? '<span class="badge" onclick="UI.eliminarCliente(event, ' + idx + ')">×</span>' : ''}
                        </span>
                    `).join('')}
                    <button class="btn-agregar-cliente" onclick="UI.agregarCliente()">+ Agregar</button>
                </div>
            </div>
            
            <div class="form-group">
                <label>Platillos:</label>
                <div class="platillos-lista" id="platillos-lista">
                    <div class="loading-spinner" style="padding: 20px;">Cargando menú...</div>
                </div>
            </div>
            
            <div class="form-group">
                <label>Orden Actual:</label>
                <div class="orden-actual-items" id="orden-actual-items">
                    ${this.renderOrdenActualItems()}
                </div>
            </div>
            
            <div class="btn-group">
                <button class="btn-success" onclick="UI.enviarOrden()" ${this.ordenActual.items.length === 0 ? 'disabled' : ''}>
                    ✅ Enviar a Cocina
                </button>
                <button class="btn-secondary" onclick="UI.cerrarModal('orden')">
                    ❌ Cancelar
                </button>
            </div>
        `;
        
        // Cargar menú
        this.cargarMenuEnModal();
    },

    renderModalPago(container, cuenta) {
        container.innerHTML = `
            <h3>Cuenta #${cuenta.cuenta_id} - Mesa ${cuenta.mesa_numero || 'N/A'}</h3>
            
            <div class="cuenta-detalle">
                <h4>Detalle por Cliente:</h4>
                ${cuenta.cuentas_separadas.map(cliente => `
                    <div style="margin: 15px 0; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 10px;">
                        <strong>${cliente.cliente_nombre}</strong>
                        <div style="margin-top: 5px;">
                            ${cliente.detalle.map(item => `
                                <div style="display: flex; justify-content: space-between; padding: 3px 0;">
                                    <span>${item.cantidad}× ${item.platillo}</span>
                                    <span>$${(item.precio_unitario * item.cantidad).toFixed(2)}</span>
                                </div>
                            `).join('')}
                            <div style="display: flex; justify-content: space-between; margin-top: 5px; font-weight: bold; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 5px;">
                                <span>Subtotal ${cliente.cliente_nombre}:</span>
                                <span>$${parseFloat(cliente.total_a_pagar).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
                
                <div class="cuenta-total">
                    TOTAL GENERAL: $${parseFloat(cuenta.gran_total).toFixed(2)}
                </div>
            </div>
            
            <div class="form-group">
                <label>Método de Pago:</label>
                <div class="metodo-pago-group">
                    <label class="metodo-pago-option selected">
                        <input type="radio" name="metodo_pago" value="efectivo" checked>
                        💵 Efectivo
                    </label>
                    <label class="metodo-pago-option">
                        <input type="radio" name="metodo_pago" value="terminal">
                        💳 Terminal
                    </label>
                </div>
            </div>
            
            <div class="btn-group">
                <button class="btn-success" onclick="UI.procesarPago(${cuenta.cuenta_id}, ${cuenta.gran_total})">
                    ✅ Procesar Pago Total
                </button>
                <button class="btn-secondary" onclick="UI.cerrarModal('pago')">
                    ❌ Cerrar
                </button>
            </div>
        `;
    },

    renderOrdenActualItems() {
        if (this.ordenActual.items.length === 0) {
            return '<div class="empty-state">No hay items en la orden</div>';
        }
        
        return this.ordenActual.items.map((item, idx) => `
            <div class="orden-item-row">
                <div class="orden-item-info">
                    <input type="number" class="orden-item-cantidad" 
                           value="${item.cantidad}" min="1" max="10"
                           onchange="UI.actualizarCantidadItem(${idx}, this.value)">
                    <span>${item.nombre}</span>
                    <small>$${item.precio}</small>
                    <small>(${item.cliente})</small>
                </div>
                <button class="btn-remove-item" onclick="UI.eliminarItem(${idx})">×</button>
            </div>
        `).join('');
    },

    // ========== ACCIONES DE MESAS ==========
    async cambiarEstadoMesa(mesaId, nuevoEstado) {
        try {
            // Nota: El backend no tiene un endpoint directo para cambiar estado de mesa
            // Por ahora usamos una simulación o podrías implementarlo en el backend
            this.agregarAlerta(
                'ℹ️ Información',
                `Cambiar estado a ${nuevoEstado} - Endpoint pendiente en backend`,
                'info'
            );
            
            // Temporal: Recargar mesas para simular cambio
            setTimeout(() => CargarDatos.cargarMesas(), 1000);
            
        } catch (error) {
            this.agregarAlerta('❌ Error', error.message, 'error');
        }
    },

    async abrirCuentaMesa(mesaId, mesaNumero) {
        try {
            const result = await API.abrirCuenta(mesaId);
            this.agregarAlerta(
                '✅ Cuenta abierta',
                `Mesa ${mesaNumero} - Cuenta #${result.cuenta.id}`,
                'success'
            );
            this.cerrarModal('mesa');
            CargarDatos.cargarMesas();
        } catch (error) {
            this.agregarAlerta('❌ Error', error.message, 'error');
        }
    },

    async tomarOrdenMesa(mesaId, mesaNumero) {
        this.ordenActual = {
            cuentaId: null,
            mesaId: mesaId,
            mesaNumero,
            items: [],
            clientes: ['General']
        };
        
        // Buscar cuenta activa para esta mesa
        await this.buscarCuentaActiva(mesaId);
        this.abrirModal('orden', { mesaId, mesaNumero });
    },

    async buscarCuentaActiva(mesaId) {
        // Por ahora no podemos obtener la cuenta activa directamente
        // En un futuro, el backend podría tener un endpoint para esto
        this.ordenActual.cuentaId = 1; // Temporal - NECESITAS IMPLEMENTAR EN BACKEND
    },

    async verCuenta(mesaId) {
        try {
            // Primero necesitamos obtener el ID de la cuenta activa para esta mesa
            // Por ahora usamos un ID fijo (1) como ejemplo
            const cuentaId = 1; // TEMPORAL - Debes obtenerlo del backend
            
            const cuenta = await API.getCuenta(cuentaId);
            
            // Agregar número de mesa para mostrar
            cuenta.mesa_numero = document.querySelector(`[data-mesa-id="${mesaId}"]`)?.dataset.mesaNumero || '?';
            
            this.abrirModal('pago', cuenta);
        } catch (error) {
            this.agregarAlerta('❌ Error', error.message, 'error');
        }
    },

    // ========== ACCIONES DE ORDEN ==========
    async cargarMenuEnModal() {
        const container = document.getElementById('platillos-lista');
        try {
            if (this.menuCache.length === 0) {
                this.menuCache = await API.getMenu();
            }
            
            // Agrupar por categoría
            const menuPorCategoria = this.menuCache.reduce((acc, item) => {
                if (!acc[item.categoria]) {
                    acc[item.categoria] = [];
                }
                acc[item.categoria].push(item);
                return acc;
            }, {});
            
            let html = '';
            for (const [categoria, items] of Object.entries(menuPorCategoria)) {
                html += `<h4 style="margin: 15px 0 5px; color: var(--primary);">${categoria}</h4>`;
                items.forEach(platillo => {
                    html += `
                        <div class="platillo-item" onclick="UI.agregarItemAOrden(${platillo.id}, '${platillo.nombre}', ${platillo.precio})">
                            <div class="platillo-info">
                                <h4>${platillo.nombre}</h4>
                                <p>${platillo.descripcion || ''}</p>
                            </div>
                            <span class="platillo-precio">$${platillo.precio}</span>
                        </div>
                    `;
                });
            }
            
            container.innerHTML = html;
        } catch (error) {
            container.innerHTML = '<div class="empty-state">Error cargando menú</div>';
        }
    },

    agregarItemAOrden(productoId, nombre, precio) {
        const clienteActual = document.querySelector('.cliente-tab.active')?.textContent || 'General';
        
        // Verificar si ya existe para aumentar cantidad
        const existingItem = this.ordenActual.items.find(
            item => item.producto_id === productoId && item.cliente === clienteActual
        );
        
        if (existingItem) {
            existingItem.cantidad++;
        } else {
            this.ordenActual.items.push({
                producto_id: productoId,
                nombre,
                precio,
                cantidad: 1,
                cliente: clienteActual
            });
        }
        
        document.getElementById('orden-actual-items').innerHTML = this.renderOrdenActualItems();
        this.actualizarBotonOrden();
    },

    actualizarCantidadItem(index, cantidad) {
        this.ordenActual.items[index].cantidad = parseInt(cantidad) || 1;
        document.getElementById('orden-actual-items').innerHTML = this.renderOrdenActualItems();
    },

    eliminarItem(index) {
        this.ordenActual.items.splice(index, 1);
        document.getElementById('orden-actual-items').innerHTML = this.renderOrdenActualItems();
        this.actualizarBotonOrden();
    },

    actualizarBotonOrden() {
        const btn = document.querySelector('#orden-modal .btn-success');
        if (btn) {
            btn.disabled = this.ordenActual.items.length === 0;
        }
    },

    seleccionarCliente(index) {
        document.querySelectorAll('.cliente-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.cliente-tab')[index].classList.add('active');
    },

    agregarCliente() {
        const nombre = prompt('Nombre del cliente:');
        if (nombre && nombre.trim()) {
            this.ordenActual.clientes.push(nombre.trim());
            this.renderModalOrden(document.getElementById('orden-modal-body'), {
                mesaId: this.ordenActual.mesaId,
                mesaNumero: this.ordenActual.mesaNumero
            });
        }
    },

    eliminarCliente(event, index) {
        event.stopPropagation();
        this.ordenActual.clientes.splice(index, 1);
        this.renderModalOrden(document.getElementById('orden-modal-body'), {
            mesaId: this.ordenActual.mesaId,
            mesaNumero: this.ordenActual.mesaNumero
        });
    },

    async enviarOrden() {
        if (!this.ordenActual.cuentaId) {
            this.agregarAlerta('❌ Error', 'No hay cuenta activa para esta mesa', 'error');
            return;
        }
        
        try {
            const platillos = this.ordenActual.items.map(item => ({
                producto_id: item.producto_id,
                cantidad: item.cantidad,
                cliente_nombre: item.cliente
            }));
            
            await API.tomarOrden(this.ordenActual.cuentaId, platillos);
            
            this.agregarAlerta(
                '✅ Orden enviada',
                `Mesa ${this.ordenActual.mesaNumero} - ${platillos.length} platillos enviados a cocina`,
                'success'
            );
            
            this.cerrarModal('orden');
            this.ordenActual.items = [];
            
            // Recargar pedidos en cocina
            CargarDatos.cargarPedidosPendientes();
            
        } catch (error) {
            this.agregarAlerta('❌ Error', error.message, 'error');
        }
    },

    // ========== ACCIONES DE PAGO ==========
    async procesarPago(cuentaId, totalGeneral) {
        const metodoPago = document.querySelector('input[name="metodo_pago"]:checked').value;
        
        try {
            // Crear array de pagos (uno por cliente)
            // Por simplicidad, pagamos todo como "General"
            const pagos = [{
                cliente_nombre: 'General',
                monto: totalGeneral,
                metodo_pago: metodoPago
            }];
            
            await API.procesarPago({
                cuenta_id: cuentaId,
                pagos: pagos
            });
            
            this.agregarAlerta(
                '✅ Pago procesado',
                'Cuenta cerrada y mesa liberada exitosamente',
                'success'
            );
            
            this.cerrarModal('pago');
            CargarDatos.cargarMesas();
            
        } catch (error) {
            this.agregarAlerta('❌ Error', error.message, 'error');
        }
    },

    // ========== ACCIONES DE FUSIÓN ==========
    iniciarFusionMesa(mesaId, mesaNumero) {
        this.fusionState = {
            mesaPrincipal: { id: mesaId, numero: mesaNumero },
            mesasSeleccionadas: []
        };
        
        this.abrirModalFusion();
    },

    async abrirModalFusion() {
        const modalBody = document.getElementById('modal-body');
        const mesas = await CargarDatos.obtenerMesas();
        
        modalBody.innerHTML = `
            <h3>Fusionar con Mesa ${this.fusionState.mesaPrincipal.numero}</h3>
            <p>Selecciona las mesas a fusionar (deben estar disponibles):</p>
            
            <div class="mesas-fusion-grid">
                ${mesas.filter(m => m.id !== this.fusionState.mesaPrincipal.id && m.estado === 'disponible')
                    .map(mesa => `
                        <div class="mesa-fusion-item disponible ${this.fusionState.mesasSeleccionadas.includes(mesa.id) ? 'selected' : ''}"
                             onclick="UI.toggleMesaFusion(${mesa.id})">
                            <span class="mesa-numero">${mesa.numero}</span>
                            <span class="mesa-estado">${mesa.estado}</span>
                        </div>
                    `).join('')}
            </div>
            
            <div class="btn-group">
                <button class="btn-primary" onclick="UI.confirmarFusion()" 
                        ${this.fusionState.mesasSeleccionadas.length === 0 ? 'disabled' : ''}>
                    🔗 Confirmar Fusión
                </button>
                <button class="btn-secondary" onclick="UI.cerrarModal()">
                    ❌ Cancelar
                </button>
            </div>
        `;
        
        document.getElementById('mesa-modal').style.display = 'flex';
    },

    toggleMesaFusion(mesaId) {
        const index = this.fusionState.mesasSeleccionadas.indexOf(mesaId);
        if (index === -1) {
            this.fusionState.mesasSeleccionadas.push(mesaId);
        } else {
            this.fusionState.mesasSeleccionadas.splice(index, 1);
        }
        this.abrirModalFusion(); // Re-render
    },

    async confirmarFusion() {
        try {
            await API.fusionarMesas(
                this.fusionState.mesaPrincipal.id,
                this.fusionState.mesasSeleccionadas
            );
            
            this.agregarAlerta(
                '✅ Mesas fusionadas',
                `Mesa ${this.fusionState.mesaPrincipal.numero} + ${this.fusionState.mesasSeleccionadas.length} mesas`,
                'success'
            );
            
            this.cerrarModal();
            CargarDatos.cargarMesas();
            
        } catch (error) {
            this.agregarAlerta('❌ Error', error.message, 'error');
        }
    },

    // ========== RENDERIZADO PRINCIPAL ==========
    renderizarOrdenes(ordenes) {
        const container = document.getElementById('cocina-ordenes');
        if (!container) return;

        if (!ordenes || ordenes.length === 0) {
            container.innerHTML = '<div class="empty-state">✨ No hay órdenes pendientes</div>';
            this.actualizarBadge('cocina', 0);
            return;
        }

        const ordenesPorMesa = ordenes.reduce((acc, orden) => {
            const mesaNum = orden.mesa_numero || 'Sin mesa';
            if (!acc[mesaNum]) {
                acc[mesaNum] = [];
            }
            acc[mesaNum].push(orden);
            return acc;
        }, {});

        this.actualizarBadge('cocina', ordenes.length);

        let html = '';
        for (const [mesa, pedidos] of Object.entries(ordenesPorMesa)) {
            const primerPedido = pedidos[0];
            const tiempo = new Date(primerPedido.creado_en).toLocaleTimeString();
            
            const tieneListos = pedidos.some(p => p.estado === 'listo');
            const claseEstado = tieneListos ? 'estado-listo' : '';

            html += `
                <div class="orden-item ${claseEstado}" data-mesa="${mesa}">
                    <div class="orden-header">
                        <span class="orden-mesa">🍽️ Mesa ${mesa}</span>
                        <span class="orden-tiempo">🕐 ${tiempo}</span>
                    </div>
                    <div class="orden-platillos">
                        ${pedidos.map(p => `
                            <span class="platillo-tag" data-pedido-id="${p.pedido_id}" data-estado="${p.estado}">
                                ${p.cantidad}× ${p.platillo}
                                <span class="estado-badge estado-${p.estado}">${p.estado}</span>
                                ${this.user && [1,4].includes(this.user.rol_id) ? `
                                    <select class="estado-select" onchange="UI.cambiarEstadoPedido(${p.pedido_id}, this.value)" style="margin-left: 5px;">
                                        <option value="pendiente" ${p.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                                        <option value="preparando" ${p.estado === 'preparando' ? 'selected' : ''}>Preparando</option>
                                        <option value="listo" ${p.estado === 'listo' ? 'selected' : ''}>Listo</option>
                                        <option value="entregado" ${p.estado === 'entregado' ? 'selected' : ''}>Entregado</option>
                                    </select>
                                ` : ''}
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    },

    renderizarMesas(mesas) {
        const container = document.getElementById('mesas-grid');
        if (!container) return;

        if (!mesas || mesas.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay mesas configuradas</div>';
            this.actualizarBadge('mesas', 0);
            return;
        }

        const ocupadas = mesas.filter(m => m.estado === 'ocupada').length;
        this.actualizarBadge('mesas', ocupadas);

        let html = '';
        mesas.forEach(mesa => {
            const estado = mesa.estado || 'disponible';
            const tienePadre = mesa.mesa_padre_id ? 'fusionada' : '';
            
            // Escapar para JSON
            const mesaData = encodeURIComponent(JSON.stringify(mesa));
            
            html += `
                <div class="mesa-item ${estado} ${tienePadre}" 
                     data-mesa-id="${mesa.id}"
                     data-mesa-numero="${mesa.numero}"
                     data-estado="${estado}"
                     onclick='UI.abrirModal("mesa", ${JSON.stringify(mesa).replace(/'/g, "\\'")})'>
                    <span class="mesa-numero">${mesa.numero}</span>
                    <span class="mesa-estado">${estado}</span>
                    ${mesa.mesa_padre_id ? '<span class="mesa-fusionada">🔗</span>' : ''}
                </div>
            `;
        });

        container.innerHTML = html;
    },

    async cambiarEstadoPedido(pedidoId, nuevoEstado) {
        try {
            await API.cambiarEstadoPedido(pedidoId, nuevoEstado);
            this.agregarAlerta(
                '✅ Estado actualizado',
                `Pedido #${pedidoId} ahora está ${nuevoEstado}`,
                'success'
            );
            CargarDatos.cargarPedidosPendientes();
        } catch (error) {
            this.agregarAlerta('❌ Error', error.message, 'error');
        }
    },

    // ========== ALERTAS ==========
    agregarAlerta(titulo, mensaje, tipo = 'info') {
        const container = document.getElementById('alertas-container');
        if (!container) return;

        const timestamp = new Date().toLocaleTimeString();
        const id = 'alerta-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const alerta = document.createElement('div');
        alerta.id = id;
        alerta.className = `alerta-item ${tipo}`;
        alerta.innerHTML = `
            <div class="alerta-header">
                <span class="alerta-titulo">${titulo}</span>
                <span class="alerta-timestamp">${timestamp}</span>
            </div>
            <div class="alerta-mensaje">${mensaje}</div>
        `;

        container.prepend(alerta);
        
        this.alertas.unshift({ id, titulo, mensaje, tipo, timestamp });
        this.actualizarBadge('alertas', this.alertas.length);

        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) {
                el.style.opacity = '0';
                el.style.transform = 'translateX(100px)';
                el.style.transition = 'all 0.5s';
                
                setTimeout(() => {
                    if (el.parentNode) {
                        el.remove();
                        this.alertas = this.alertas.filter(a => a.id !== id);
                        this.actualizarBadge('alertas', this.alertas.length);
                    }
                }, 500);
            }
        }, CONFIG.alertaDuration);

        if (container.children.length > CONFIG.maxAlertas) {
            container.removeChild(container.lastChild);
            this.alertas.pop();
        }
    },

    limpiarAlertas() {
        const container = document.getElementById('alertas-container');
        if (container) {
            container.innerHTML = '<div class="empty-state">No hay notificaciones nuevas</div>';
            this.alertas = [];
            this.actualizarBadge('alertas', 0);
        }
    },

    actualizarBadge(section, value) {
        const badge = document.getElementById(`${section}-badge`);
        if (!badge) return;

        if (typeof value === 'number') {
            this.badges[section] = value;
        } else if (value === 'increment') {
            this.badges[section]++;
        } else if (value === 'decrement') {
            this.badges[section] = Math.max(0, this.badges[section] - 1);
        }

        if (this.badges[section] > 0) {
            badge.textContent = this.badges[section];
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }
    }
};

// Módulo para cargar datos
const CargarDatos = {
    async cargarPedidosPendientes() {
        const container = document.getElementById('cocina-ordenes');
        if (!container) return;

        try {
            container.innerHTML = '<div class="loading-spinner">Cargando órdenes...</div>';
            const pedidos = await API.getPedidosPendientes();
            UI.renderizarOrdenes(pedidos);
        } catch (error) {
            console.error('Error cargando pedidos:', error);
            container.innerHTML = '<div class="empty-state">Error al cargar órdenes</div>';
            UI.agregarAlerta('❌ Error', 'No se pudieron cargar los pedidos: ' + error.message, 'error');
        }
    },

    async cargarMesas() {
        const container = document.getElementById('mesas-grid');
        if (!container) return;

        try {
            container.innerHTML = '<div class="loading-spinner">Cargando mesas...</div>';
            const mesas = await API.getMesas();
            UI.renderizarMesas(mesas);
        } catch (error) {
            console.error('Error cargando mesas:', error);
            container.innerHTML = '<div class="empty-state">Error al cargar mesas</div>';
            UI.agregarAlerta('❌ Error', 'No se pudieron cargar las mesas: ' + error.message, 'error');
        }
    },

    async obtenerMesas() {
        try {
            return await API.getMesas();
        } catch (error) {
            console.error('Error obteniendo mesas:', error);
            return [];
        }
    },

    async cargarMenu() {
        try {
            UI.menuCache = await API.getMenu();
            return UI.menuCache;
        } catch (error) {
            console.error('Error cargando menú:', error);
            return [];
        }
    },

    async verificarSalud() {
        const isHealthy = await API.checkHealth();
        if (!isHealthy) {
            UI.agregarAlerta(
                '⚠️ Problema de conexión',
                'No se puede conectar con el backend',
                'error'
            );
        }
        return isHealthy;
    }
};

// Iniciar todo cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
    setTimeout(() => CargarDatos.verificarSalud(), 2000);
});

// Manejar errores globales
window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
    UI.agregarAlerta('❌ Error', 'Ha ocurrido un error inesperado', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesa rechazada:', event.reason);
    UI.agregarAlerta('❌ Error', 'Error en operación asíncrona', 'error');
});