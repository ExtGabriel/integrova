const request = require('supertest');
const app = require('../server');

describe('CFE INSIGHT API Tests', () => {
    describe('Health Check', () => {
        test('GET /api/health should return OK status', async () => {
            const response = await request(app).get('/api/health');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'OK');
            expect(response.body).toHaveProperty('timestamp');
        });
    });

    describe('User Endpoints', () => {
        const testUser = {
            username: 'testuser',
            password: 'password123',
            name: 'Test User',
            email: 'test@example.com',
            phone: '+1234567890',
            role: 'auditor'
        };

        let createdUserId;

        test('POST /api/usuarios should create a new user', async () => {
            const response = await request(app)
                .post('/api/usuarios')
                .send(testUser);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('username', testUser.username);
            expect(response.body).toHaveProperty('email', testUser.email);
            expect(response.body).toHaveProperty('name', testUser.name);
            expect(response.body).not.toHaveProperty('password'); // Password should not be returned

            createdUserId = response.body.id;
        });

        test('GET /api/usuarios should return users array', async () => {
            const response = await request(app).get('/api/usuarios');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        test('GET /api/usuarios/:id should return specific user', async () => {
            const response = await request(app).get(`/api/usuarios/${createdUserId}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id', createdUserId);
            expect(response.body).toHaveProperty('username', testUser.username);
        });

        test('PUT /api/usuarios/:id should update user', async () => {
            const updateData = {
                name: 'Updated Test User',
                phone: '+0987654321'
            };

            const response = await request(app)
                .put(`/api/usuarios/${createdUserId}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('name', updateData.name);
            expect(response.body).toHaveProperty('phone', updateData.phone);
        });

        test('DELETE /api/usuarios/:id should delete user', async () => {
            const response = await request(app).delete(`/api/usuarios/${createdUserId}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Usuario eliminado correctamente');
        });
    });

    describe('Validation Tests', () => {
        test('POST /api/usuarios with invalid email should return 400', async () => {
            const invalidUser = {
                username: 'test',
                password: '123',
                name: 'Test',
                email: 'invalid-email',
                phone: '123',
                role: 'user'
            };

            const response = await request(app)
                .post('/api/usuarios')
                .send(invalidUser);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Datos inválidos');
        });

        test('POST /api/usuarios with short password should return 400', async () => {
            const invalidUser = {
                username: 'test',
                password: '123', // Too short
                name: 'Test',
                email: 'test@example.com',
                phone: '1234567890',
                role: 'user'
            };

            const response = await request(app)
                .post('/api/usuarios')
                .send(invalidUser);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Datos inválidos');
        });

        test('POST /api/usuarios with missing required fields should return 400', async () => {
            const incompleteUser = {
                username: 'test',
                // Missing other required fields
            };

            const response = await request(app)
                .post('/api/usuarios')
                .send(incompleteUser);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Datos inválidos');
        });
    });

    describe('AI Endpoints', () => {
        test('POST /api/ai/call without prompt should return 400', async () => {
            const response = await request(app)
                .post('/api/ai/call')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Prompt es requerido');
        });

        test('POST /api/ai/call with valid prompt should return response', async () => {
            const response = await request(app)
                .post('/api/ai/call')
                .send({
                    prompt: 'Hola, ¿cómo estás?',
                    context: 'chat'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('response');
            expect(typeof response.body.response).toBe('string');
        });
    });

    describe('Error Handling', () => {
        test('GET /api/usuarios/:id with invalid ID should return 500', async () => {
            const response = await request(app).get('/api/usuarios/invalid-id');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Error interno del servidor');
        });

        test('DELETE /api/usuarios/:id with non-existent ID should return 500', async () => {
            const response = await request(app).delete('/api/usuarios/99999');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Error interno del servidor');
        });
    });
});
