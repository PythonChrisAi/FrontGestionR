// Módulo de comunicación con la API REST
const API = {
    // URL base desde configuración
    baseUrl: CONFIG.backendUrl,

    // ==============================
    // Método genérico para peticiones
    // ==============================
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('authToken');

        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const url = `${this.baseUrl}${endpoint}`;
            console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);

            if (options.body) {
                try {
                    console.log('📦 Body:', JSON.parse(options.body));
                } catch {
                    console.log('📦 Body (no JSON):', options.body);
                }
            }

            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include',
                mode: 'cors'
            });

            if (!response.ok) {

                if (response.status === 401) {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');

                    if (typeof UI !== 'undefined' && UI.mostrarLogin) {
                        UI.mostrarLogin();
                    }

                    throw new Error('Sesión expirada. Inicia sesión nuevamente.');
                }

                let errorMessage = `Error ${response.status}`;

                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    const text = await response.text();
                    if (text) errorMessage = text;
                }

                throw new Error(errorMessage);
            }

            return await response.json();

        } catch (error) {
            console.error(`❌ API Error (${endpoint}):`, error.message);
            throw error;
        }
    },

    // ==============================
    // AUTENTICACIÓN
    // ==============================
    async login(username, password) {
        const data = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (data.token) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.usuario));
        }

        return data;
    },

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    },

    // ==============================
    // COCINA
    // ==============================
    getPedidosPendientes() {
        return this.request('/api/cocina/pendientes');
    },

    cambiarEstadoPedido(pedidoId, nuevoEstado) {
        return this.request(`/api/cocina/pedidos/${pedidoId}/estado`, {
            method: 'PATCH',
            body: JSON.stringify({ nuevo_estado: nuevoEstado })
        });
    },

    // ==============================
    // MESAS
    // ==============================
    getMesas() {
        return this.request('/api/mesas');
    },

    fusionarMesas(mesaPrincipalId, mesasAFusionar) {
        return this.request('/api/mesas/fusionar', {
            method: 'POST',
            body: JSON.stringify({
                mesa_principal_id: mesaPrincipalId,
                mesas_a_fusionar: mesasAFusionar
            })
        });
    },

    // ==============================
    // PEDIDOS
    // ==============================
    getMenu() {
        return this.request('/api/pedidos/menu');
    },

    abrirCuenta(mesaId) {
        return this.request('/api/pedidos/abrir-cuenta', {
            method: 'POST',
            body: JSON.stringify({ mesa_id: mesaId })
        });
    },

    tomarOrden(cuentaId, platillos) {
        return this.request('/api/pedidos/ordenar', {
            method: 'POST',
            body: JSON.stringify({
                cuenta_id: Number(cuentaId),
                platillos: platillos
            })
        });
    },

    // ==============================
    // PAGOS (CORREGIDO PARA PAGOS POR CLIENTE)
    // ==============================
    procesarPago(pagoData) {
        if (!pagoData || !pagoData.cuenta_id || !pagoData.pagos || !Array.isArray(pagoData.pagos)) {
            throw new Error("Datos incompletos para procesar el pago. Se requiere { cuenta_id, pagos: [...] }");
        }

        console.log("💳 Procesando pago:", pagoData);

        return this.request('/api/pagos/pagar', {
            method: 'POST',
            body: JSON.stringify(pagoData)
        });
    },

    getCuenta(cuentaId) {
        return this.request(`/api/pagos/cuenta/${cuentaId}`);
    },

    // ==============================
    // UTILIDADES
    // ==============================
    async checkHealth() {
        try {
            const data = await this.request('/api/health');
            return data.status === 'API funcionando';
        } catch {
            return false;
        }
    }
};