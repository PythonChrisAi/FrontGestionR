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
                    UI.mostrarLogin();
                    throw new Error('Sesión expirada. Inicia sesión nuevamente.');
                }
                
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.message || `Error ${response.status}`);
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

    procesarPago(cuentaId, pagos) {
        return this.request('/api/pagos/pagar', {
            method: 'POST',
            body: JSON.stringify({
                cuenta_id: cuentaId,
                pagos: pagos
            })
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