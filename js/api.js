const API = {
    baseURL: 'https://restaurant-api-production-3a92.up.railway.app/api',

    async request(endpoint, method = 'GET', body = null) {
        const token = localStorage.getItem('token'); // Obtener token JWT del almacenamiento local
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const options = {
            method,
            headers,
        };

        if (body) {
            options.body = JSON.stringify(body);
            console.log('📦 Body:', body);
        }

        try {
            console.log(`📡 API Request: ${method} ${this.baseURL}${endpoint}`);
            const res = await fetch(this.baseURL + endpoint, options);

            if (!res.ok) {
                let errorText;
                try {
                    errorText = await res.text();
                } catch { 
                    errorText = 'Error desconocido';
                }
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

    // ----- AUTENTICACIÓN -----
    async login(username, password) {
        return await this.request('/auth/login', 'POST', { username, password });
    },

    async logout() {
        return await this.request('/auth/logout', 'POST');
    },

    // ----- MESAS -----
    async getMesas() {
        return await this.request('/mesas');
    },

    async getMesa(id) {
        return await this.request(`/mesas/${id}`);
    },

    async abrirCuenta(mesaId) {
        return await this.request(`/mesas/${mesaId}/abrir-cuenta`, 'POST');
    },

    async fusionarMesas(mesaPrincipalId, mesasSeleccionadas) {
        return await this.request('/mesas/fusionar', 'POST', {
            mesa_principal: mesaPrincipalId,
            mesas: mesasSeleccionadas
        });
    },

    // ----- ORDENES -----
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

    // ----- PAGOS -----
    async procesarPago({ cuenta_id, pagos }) {
        // Cada pago debe tener: cuenta_id, monto, metodo_pago, cliente_nombre, creado_en
        const pagosCorregidos = pagos.map(pago => ({
            cuenta_id: cuenta_id, // todos los pagos pertenecen a la misma cuenta
            monto: parseFloat(pago.monto),
            metodo_pago: pago.metodo_pago,
            cliente_nombre: pago.cliente_nombre,
            creado_en: pago.creado_en || new Date().toISOString()
        }));

        console.log('💳 Procesando pago:', pagosCorregidos);

        // Enviar array de pagos directamente
        return await this.request('/pagos/pagar', 'POST', pagosCorregidos);
    },

    // ----- SALUD DEL SERVIDOR -----
    async checkHealth() {
        try {
            const res = await fetch(this.baseURL + '/health');
            return res.ok;
        } catch {
            return false;
        }
    }
};