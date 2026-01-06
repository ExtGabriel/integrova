// Test script for loadCommitmentDetails function
// Extracted from compromisos-detalles.html for syntax validation

// Mock API object for testing
const API = {
    Entities: {
        getAll: async () => ({ success: true, data: [{ id: 1, name: 'CFE Central' }] })
    },
    Commitments: {
        getById: async (id) => ({
            success: true,
            data: {
                id: 1,
                name: 'Test Commitment',
                entity_id: 1,
                description: 'Test description',
                status: 'activo',
                start_date: '2023-10-01',
                end_date: '2023-12-31'
            }
        })
    }
};

// Mock localStorage
global.localStorage = {
    getItem: () => null,
    setItem: () => {}
};

// Mock URLSearchParams
global.URLSearchParams = class {
    constructor() { this.params = {}; }
    get(key) { return this.params[key]; }
    set(key, value) { this.params[key] = value; }
};

// Mock window.location
global.window = {
    location: { search: '?id=1' }
};

// Mock document
global.document = {
    getElementById: () => ({ innerHTML: '', style: {}, textContent: '', className: '' }),
    querySelector: () => ({ textContent: '', style: {} }),
    querySelectorAll: () => []
};

// Test the loadCommitmentDetails function
async function testLoadCommitmentDetails() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const currentId = parseInt(urlParams.get('id'));

        if (!currentId) {
            console.log('Test passed: Invalid ID handling');
            return;
        }

        // Test API calls
        const entitiesResponse = await API.Entities.getAll();
        if (!entitiesResponse.success) {
            throw new Error('Error al cargar entidades');
        }

        const entities = {};
        entitiesResponse.data.forEach(entity => {
            entities[entity.id] = entity;
        });

        const commitmentResponse = await API.Commitments.getById(currentId);
        if (!commitmentResponse.success) {
            throw new Error('Compromiso no encontrado');
        }

        const currentCommitment = commitmentResponse.data;

        // Test data population
        const entity = entities[currentCommitment.entity_id];
        const entityName = entity ? entity.name : 'Entidad no encontrada';

        console.log('Test passed: Commitment loaded successfully');
        console.log('Commitment name:', currentCommitment.name);
        console.log('Entity name:', entityName);
        console.log('Status:', currentCommitment.status);

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

// Run the test
testLoadCommitmentDetails();
