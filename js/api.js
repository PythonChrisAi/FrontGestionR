const API = {
    baseURL: 'https://restaurant-api-production-3a92.up.railway.app/api',

    async request(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        // Agregar token de autenticación si existe
        const token = localStorage.getItem('authToken');
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        if (body) {
            options.body = JSON.stringify(body);
            console.log('📦 Body:', body);
        }

        try {
            console.log(`📡 API Request: ${method} ${this.baseURL}${endpoint}`);
            const res = await fetch(this.baseURL + endpoint, options);

            if (!res.ok) {
                const errorText = await res.text();
                console.error(`❌ API Error (${endpoint}):`, errorText);
                throw new Error(errorText || 'Error desconocido');
            }

            const data = await res.json();
            return data;
        } catch (error) {
            console.error(`❌ API Request failed (${endpoint}):`, error);
            throw error;
        }
    },

    async login(username, password) {
        try {
            const response = await this.request('/auth/login', 'POST', { username, password });
            
            // Guardar token y usuario en localStorage si existen
            if (response.token) {
                localStorage.setItem('authToken', response.token);
                console.log('✅ Token guardado en localStorage');
            }
            
            if (response.usuario) {
                localStorage.setItem('user', JSON.stringify(response.usuario));
                console.log('✅ Usuario guardado en localStorage');
            }
            
            return response;
        } catch (error) {
            console.error('❌ Error en login:', error);
            throw error;
        }
    },

    async logout() {
        try {
            const response = await this.request('/auth/logout', 'POST');
            
            // Limpiar localStorage al cerrar sesión
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            console.log('✅ Token y usuario eliminados de localStorage');
            
            return response;
        } catch (error) {
            console.error('❌ Error en logout:', error);
            
            // Aún así limpiar localStorage aunque falle el logout
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            
            throw error;
        }
    },

    // Función auxiliar para verificar si hay sesión activa
    isAuthenticated() {
        return !!localStorage.getItem('authToken');
    },

    // Función auxiliar para obtener el usuario actual
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch {
                return null;
            }
        }
        return null;
    },

    // Función auxiliar para limpiar sesión manualmente
    clearSession() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        console.log('✅ Sesión limpiada manualmente');
    },

    async getMesas() {
        return await this.request('/mesas');
    },

    async abrirCuenta(mesaId) {
        return await this.request(`/mesas/${mesaId}/abrir-cuenta`, 'POST');
    },

    async tomarOrden(cuentaId, platillos) {
        // platillos: [{ producto_id, cantidad, cliente_nombre }]
        return await this.request(`/ordenes/${cuentaId}/tomar`, 'POST', { platillos });
    },

    async getPedidosPendientes() {
        return await this.request('/ordenes/pendientes');
    },

    async getMenu() {
        return await this.request('/menu');
    },

    async getCuenta(cuentaId) {
        return await this.request(`/pagos/cuenta/${cuentaId}`);
    },

    async procesarPago({ cuenta_id, pagos }) {
        // Asegurarse de que cada pago tenga los campos obligatorios
        const pagosCorregidos = pagos.map(pago => ({
            cuenta_id: pago.cuenta_id,
            cliente_nombre: pago.cliente_nombre,
            monto: parseFloat(pago.monto),
            metodo_pago: pago.metodo_pago,
            creado_en: pago.creado_en || new Date().toISOString()
        }));

        console.log('💳 Procesando pago:', { cuenta_id, pagos: pagosCorregidos });

        return await this.request('/pagos/pagar', 'POST', { cuenta_id, pagos: pagosCorregidos });
    },

    async fusionarMesas(mesaPrincipalId, mesasSeleccionadas) {
        return await this.request('/mesas/fusionar', 'POST', {
            mesa_principal: mesaPrincipalId,
            mesas: mesasSeleccionadas
        });
    },

    async checkHealth() {
        try {
            const res = await fetch(this.baseURL + '/health');
            return res.ok;
        } catch {
            return false;
        }
    }
};