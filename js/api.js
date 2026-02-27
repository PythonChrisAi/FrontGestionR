const API = {
    baseURL: 'https://restaurant-api-production-3a92.up.railway.app/api',

    async request(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

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
        return await this.request('/auth/login', 'POST', { username, password });
    },

    async logout() {
        return await this.request('/auth/logout', 'POST');
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