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

    init() {
        console.log('🚀 Inicializando FrontGestionR v' + CONFIG.version);
        
        // Verificar si hay sesión activa
        this.checkAuth();
        
        // Inicializar sockets
        Sockets.init();
        
        // Configurar navegación
        this.setupNavigation();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Cargar datos iniciales
        this.cargarDatosIniciales();
        
        // Configurar recargas periódicas
        this.setupRefreshIntervals();
        
        // Mostrar mensaje de bienvenida
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

        // Botón de logout
        document.getElementById('btnLogout')?.addEventListener('click', () => {
            API.logout();
            this.mostrarLogin();
            this.agregarAlerta('👋 Sesión cerrada', 'Has cerrado sesión exitosamente', 'info');
        });

        // Formulario de login
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
        // Botones de refresh
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
    },

    setupRefreshIntervals() {
        // Recargar pedidos cada 30 segundos
        setInterval(() => {
            if (this.currentSection === 'cocina') {
                CargarDatos.cargarPedidosPendientes();
            }
        }, CONFIG.refreshIntervals.pedidos);

        // Recargar mesas cada 60 segundos
        setInterval(() => {
            if (this.currentSection === 'mesas') {
                CargarDatos.cargarMesas();
            }
        }, CONFIG.refreshIntervals.mesas);
    },

    cambiarSeccion(sectionId) {
        // Actualizar botones
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === sectionId) {
                btn.classList.add('active');
            }
        });

        // Actualizar secciones
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(sectionId + '-section');
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionId;
        }
    },

    // ========== RENDERIZADO ==========

    renderizarOrdenes(ordenes) {
        const container = document.getElementById('cocina-ordenes');
        if (!container) return;

        if (!ordenes || ordenes.length === 0) {
            container.innerHTML = '<div class="empty-state">✨ No hay órdenes pendientes</div>';
            this.actualizarBadge('cocina', 0);
            return;
        }

        // Agrupar por mesa
        const ordenesPorMesa = ordenes.reduce((acc, orden) => {
            const mesaNum = orden.mesa_numero || 'Sin mesa';
            if (!acc[mesaNum]) {
                acc[mesaNum] = [];
            }
            acc[mesaNum].push(orden);
            return acc;
        }, {});

        // Actualizar badge
        this.actualizarBadge('cocina', ordenes.length);

        let html = '';
        for (const [mesa, pedidos] of Object.entries(ordenesPorMesa)) {
            const primerPedido = pedidos[0];
            const tiempo = new Date(primerPedido.creado_en).toLocaleTimeString();
            
            // Determinar estado general de la mesa
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
                            <span class="platillo-tag" data-pedido-id="${p.pedido_id}">
                                ${p.cantidad}× ${p.platillo}
                                <span class="estado-badge estado-${p.estado}">${p.estado}</span>
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;

        // Agregar eventos a los platillos para cambiar estado (opcional)
        container.querySelectorAll('.platillo-tag').forEach(tag => {
            tag.addEventListener('dblclick', async (e) => {
                const pedidoId = tag.dataset.pedidoId;
                if (pedidoId && this.user && [1,4].includes(this.user.rol_id)) {
                    const nuevoEstado = prompt('Cambiar estado a: (preparando/listo/entregado)');
                    if (nuevoEstado && ['preparando', 'listo', 'entregado'].includes(nuevoEstado)) {
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
                    }
                }
            });
        });
    },

    renderizarMesas(mesas) {
        const container = document.getElementById('mesas-grid');
        if (!container) return;

        if (!mesas || mesas.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay mesas configuradas</div>';
            this.actualizarBadge('mesas', 0);
            return;
        }

        // Contar mesas ocupadas para el badge
        const ocupadas = mesas.filter(m => m.estado === 'ocupada').length;
        this.actualizarBadge('mesas', ocupadas);

        let html = '';
        mesas.forEach(mesa => {
            const estado = mesa.estado || 'disponible';
            const tienePadre = mesa.mesa_padre_id ? 'fusionada' : '';
            
            html += `
                <div class="mesa-item ${estado} ${tienePadre}" 
                     data-mesa-id="${mesa.id}"
                     data-mesa-numero="${mesa.numero}"
                     data-estado="${estado}">
                    <span class="mesa-numero">${mesa.numero}</span>
                    <span class="mesa-estado">${estado}</span>
                    ${mesa.mesa_padre_id ? '<span class="mesa-fusionada">🔗</span>' : ''}
                </div>
            `;
        });

        container.innerHTML = html;

        // Eventos para mesas
        container.querySelectorAll('.mesa-item').forEach(mesa => {
            mesa.addEventListener('click', () => {
                const id = mesa.dataset.mesaId;
                const numero = mesa.dataset.mesaNumero;
                const estado = mesa.dataset.estado;
                
                this.agregarAlerta(
                    '🪑 Mesa seleccionada',
                    `Mesa ${numero} - ${estado}`,
                    'info'
                );
                
                // Aquí puedes abrir un modal con detalles de la mesa
                console.log('Mesa click:', { id, numero, estado });
            });
        });
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
        
        // Actualizar badge de alertas
        this.alertas.unshift({ id, titulo, mensaje, tipo, timestamp });
        this.actualizarBadge('alertas', this.alertas.length);

        // Auto-eliminar después de un tiempo
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

        // Limitar número de alertas
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
    
    // Verificar salud del backend al inicio
    setTimeout(() => CargarDatos.verificarSalud(), 2000);
});

// Manejar errores no capturados
window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
    UI.agregarAlerta('❌ Error', 'Ha ocurrido un error inesperado', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesa rechazada:', event.reason);
    UI.agregarAlerta('❌ Error', 'Error en operación asíncrona', 'error');
});