// Módulo de comunicación con la API REST
const API = {
    // URL base desde configuración
    baseUrl: CONFIG.backendUrl,

    // Método genérico para peticiones
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
                console.log('📦 Body:', JSON.parse(options.body));
            }
            
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include',
                mode: 'cors'
            });

            // Manejar errores HTTP
            if (!response.ok) {
                if (response.status === 401) {
                    // Token expirado o no válido
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
                    // Si no se puede parsear el JSON, usar el texto de la respuesta
                    const text = await response.text();
                    if (text) errorMessage = text;
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error(`❌ API Error (${endpoint}):`, error.message);
            throw error;
        }
    },

    // ========== AUTENTICACIÓN ==========
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

    // ========== COCINA ==========
    getPedidosPendientes() {
        return this.request('/api/cocina/pendientes');
    },

    cambiarEstadoPedido(pedidoId, nuevoEstado) {
        return this.request(`/api/cocina/pedidos/${pedidoId}/estado`, {
            method: 'PATCH',
            body: JSON.stringify({ nuevo_estado })
        });
    },

    // ========== MESAS ==========
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

    // ========== PEDIDOS ==========
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
                cuenta_id: cuentaId,
                platillos: platillos
            })
        });
    },

    // ========== PAGOS ==========
    getCuenta(cuentaId) {
        return this.request(`/api/pagos/cuenta/${cuentaId}`);
    },

    /**
     * Procesa el pago de una cuenta
     * @param {Object} pagoData - Datos del pago
     * @param {number} pagoData.cuenta_id - ID de la cuenta
     * @param {Array} pagoData.pagos - Array de pagos por cliente
     * @param {string} pagoData.pagos[].cliente_nombre - Nombre del cliente
     * @param {number} pagoData.pagos[].monto - Monto a pagar
     * @param {string} pagoData.pagos[].metodo_pago - Método de pago (efectivo/terminal)
     */
    procesarPago(pagoData) {
        return this.request('/api/pagos/pagar', {
            method: 'POST',
            body: JSON.stringify(pagoData)
        });
    },

    // ========== UTILIDADES ==========
    async checkHealth() {
        try {
            const data = await this.request('/api/health');
            return data.status === 'API funcionando';
        } catch {
            return false;
        }
    }
};