document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-link');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (button.classList.contains('active')) {
                return;
            }

            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });

            tabPanels.forEach(panel => panel.classList.remove('active'));

            button.classList.add('active');
            button.setAttribute('aria-selected', 'true');
            const target = document.getElementById(button.dataset.target);
            if (target) {
                target.classList.add('active');
            }
        });
    });

    document.querySelectorAll('[data-choice-group]').forEach(group => {
        const buttons = group.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                group.dataset.value = button.dataset.value;
            });
        });
    });

    // Conditional display logic for tables
    const muestraDropdown = document.getElementById('muestra-dropdown');
    const tipoMuestreoDropdown = document.getElementById('tipo-muestreo-dropdown');
    const conditionalTables = document.getElementById('conditional-tables');

    function checkConditions() {
        const muestraValue = muestraDropdown.value;
        const tipoMuestreoValue = tipoMuestreoDropdown.value;

        // Show tables only if "Unidades monetarias" AND "Estadístico" are selected
        if (muestraValue === 'unidades_monetarias' && tipoMuestreoValue === 'Estadístico') {
            conditionalTables.style.display = 'block';
        } else {
            conditionalTables.style.display = 'none';
        }
    }

    // Function to update table values based on Otras pruebas sustantivas selection
    function updateTableValues(selectElement) {
        const row = selectElement.closest('tr');
        const selectedValue = selectElement.value;

        const factorRiesgoFiabilidadInput = row.cells[6].querySelector('input');
        const factorResidualDeteccionInput = row.cells[7].querySelector('input');
        const factorIncorreccionEsperadaInput = row.cells[8].querySelector('input');
        const factorMuestraSustantivaInput = row.cells[9].querySelector('input');
        const tamanoMuestraInput = row.cells[10].querySelector('input');
        const intervaloMuestralInput = row.cells[11].querySelector('input');

        switch (selectedValue) {
            case 'Persuasivo':
                factorRiesgoFiabilidadInput.value = '1.6';
                factorResidualDeteccionInput.value = '1.4';
                factorIncorreccionEsperadaInput.value = '0';
                factorMuestraSustantivaInput.value = '1.4';
                tamanoMuestraInput.value = '0';
                intervaloMuestralInput.value = '0';
                break;
            case 'Corroborativo':
                factorRiesgoFiabilidadInput.value = '0.5';
                factorResidualDeteccionInput.value = '2.5';
                factorIncorreccionEsperadaInput.value = '0';
                factorMuestraSustantivaInput.value = '2.5';
                tamanoMuestraInput.value = '0';
                intervaloMuestralInput.value = '0';
                break;
            case 'Mínimo':
                factorRiesgoFiabilidadInput.value = '0.2';
                factorResidualDeteccionInput.value = '2.8';
                factorIncorreccionEsperadaInput.value = '0';
                factorMuestraSustantivaInput.value = '2.8';
                tamanoMuestraInput.value = '0';
                intervaloMuestralInput.value = '0';
                break;
            case 'Ninguno':
            default:
                factorRiesgoFiabilidadInput.value = '0';
                factorResidualDeteccionInput.value = '3.0';
                factorIncorreccionEsperadaInput.value = '0';
                factorMuestraSustantivaInput.value = '3.0';
                tamanoMuestraInput.value = '0';
                intervaloMuestralInput.value = '0';
                break;
        }
    }

    // Add event listeners to both dropdowns
    if (muestraDropdown && tipoMuestreoDropdown && conditionalTables) {
        muestraDropdown.addEventListener('change', checkConditions);
        tipoMuestreoDropdown.addEventListener('change', checkConditions);
        
        // Check conditions on page load
        checkConditions();
        
        // Add event listeners to Otras pruebas sustantivas dropdowns
        const otrasPruebasDropdowns = document.querySelectorAll('.assertions-table select');
        otrasPruebasDropdowns.forEach(dropdown => {
            // Check if this is the "Otras pruebas sustantivas" dropdown (6th cell in each row)
            const cell = dropdown.closest('td');
            const row = cell.closest('tr');
            if (row && Array.from(row.cells).indexOf(cell) === 6) {
                dropdown.addEventListener('change', function() {
                    updateTableValues(this);
                });
            }
        });

        // Add event listeners for Yes/No buttons in checklist tables
        const buttonGroups = document.querySelectorAll('.btn-group');
        buttonGroups.forEach(group => {
            const buttons = group.querySelectorAll('.btn');
            buttons.forEach(button => {
                button.addEventListener('click', function() {
                    // Remove active class from all buttons in this group
                    buttons.forEach(btn => btn.classList.remove('active'));
                    // Add active class to clicked button
                    this.classList.add('active');
                });
            });
        });
    }
});
