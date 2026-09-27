document.addEventListener("DOMContentLoaded", () => {
    // Éléments du DOM
    const numVarsInput = document.getElementById("num-vars");
    const numConstraintsInput = document.getElementById("num-constraints");
    const btnGenerate = document.getElementById("btn-generate");
    const btnSolve = document.getElementById("btn-solve");

    const objectiveContainer = document.getElementById("objective-container");
    const constraintsContainer = document.getElementById("constraints-container");
    const resultsSection = document.getElementById("results-section");
    const summaryCard = document.getElementById("summary-card");
    const stepsContainer = document.getElementById("steps-container");

    // ==============================================================
    // 1. GÉNÉRATION DYNAMIQUE DES CHAMPS SELON LE CHOIX UTILISATEUR
    // ==============================================================
    function generateFields() {
        const nbVars = parseInt(numVarsInput.value, 10);
        const nbConstraints = parseInt(numConstraintsInput.value, 10);

        // Validation des valeurs saisies
        if (isNaN(nbVars) || nbVars < 1 || isNaN(nbConstraints) || nbConstraints < 1) {
            objectiveContainer.innerHTML = "<p style='color: #dc2626;'>Veuillez entrer au moins 1 variable et 1 contrainte.</p>";
            constraintsContainer.innerHTML = "";
            return;
        }

        // Réinitialisation de l'affichage
        objectiveContainer.innerHTML = "<strong>Z =&nbsp;</strong>";
        constraintsContainer.innerHTML = "";
        resultsSection.classList.add("hidden");
        summaryCard.innerHTML = "";
        stepsContainer.innerHTML = "";

        // Génération des champs de la fonction objectif (c_j)
        for (let j = 0; j < nbVars; j++) {
            const input = document.createElement("input");
            input.type = "number";
            input.step = "any";
            input.id = `c-${j}`;
            input.value = "0";
            input.className = "input-coeff";

            const label = document.createElement("span");
            label.innerHTML = ` x<sub>${j + 1}</sub> ${j < nbVars - 1 ? "+ " : ""}`;

            objectiveContainer.appendChild(input);
            objectiveContainer.appendChild(label);
        }

        // Génération dynamique des lignes de contraintes choisies par l'utilisateur
        for (let i = 0; i < nbConstraints; i++) {
            const rowDiv = document.createElement("div");
            rowDiv.className = "equation-row";

            // Coefficients a_ij
            for (let j = 0; j < nbVars; j++) {
                const inputA = document.createElement("input");
                inputA.type = "number";
                inputA.step = "any";
                inputA.id = `a-${i}-${j}`;
                inputA.value = "0";
                inputA.className = "input-coeff";

                const labelA = document.createElement("span");
                labelA.innerHTML = ` x<sub>${j + 1}</sub> ${j < nbVars - 1 ? "+ " : ""}`;

                rowDiv.appendChild(inputA);
                rowDiv.appendChild(labelA);
            }

            // Symbole <=
            const ineqLabel = document.createElement("span");
            ineqLabel.innerHTML = " &le; ";
            rowDiv.appendChild(ineqLabel);

            // Membre de droite (b_i / RHS)
            const inputB = document.createElement("input");
            inputB.type = "number";
            inputB.step = "any";
            inputB.id = `b-${i}`;
            inputB.value = "0";
            inputB.className = "input-coeff input-rhs";
            rowDiv.appendChild(inputB);

            constraintsContainer.appendChild(rowDiv);
        }
    }

    // ==============================================================
    // 2. RENDU HTML DES TABLEAUX DU SIMPLEXE
    // ==============================================================
    function renderTableauHTML(tableau, base, nomsVars, titre, pivotInfo = null) {
        let html = `<div class="card">
            <h4>${titre}</h4>
            <div class="table-responsive">
                <table class="simplex-table">
                    <thead>
                        <tr>
                            <th>Base</th>
                            ${nomsVars.map(v => `<th>${v}</th>`).join("")}
                            <th>RHS</th>
                        </tr>
                    </thead>
                    <tbody>`;

        // Lignes des contraintes
        for (let i = 0; i < base.length; i++) {
            html += `<tr><td><strong>${base[i]}</strong></td>`;
            for (let j = 0; j < tableau[i].length; j++) {
                const isPivot = pivotInfo && pivotInfo.ligne === i && pivotInfo.colonne === j;
                const cellClass = isPivot ? "class='pivot-cell'" : "";
                html += `<td ${cellClass}>${Number(tableau[i][j].toFixed(2))}</td>`;
            }
            html += `</tr>`;
        }

        // Ligne Z
        html += `<tr class="z-row"><td><strong>Z</strong></td>`;
        const lastRow = tableau[tableau.length - 1];
        for (let j = 0; j < lastRow.length; j++) {
            html += `<td>${Number(lastRow[j].toFixed(2))}</td>`;
        }
        html += `</tr></tbody></table></div>`;

        if (pivotInfo) {
            html += `<p style="font-size: 0.9rem; color: #475569; margin-top: 8px;">
                Pivot : <strong>${Number(pivotInfo.valeur.toFixed(4))}</strong> | 
                Variable entrante : <strong>${pivotInfo.varEntrante}</strong> | 
                Variable sortante : <strong>${pivotInfo.varSortante}</strong>
            </p>`;
        }

        html += `</div>`;
        return html;
    }

    // ==============================================================
    // 3. ALGORITHME DE RÉSOLUTION DU SIMPLEXE
    // ==============================================================
    function solveSimplex() {
        const nbVars = parseInt(numVarsInput.value, 10);
        const nbConstraints = parseInt(numConstraintsInput.value, 10);

        // Lecture des coefficients de la fonction objectif
        const c = [];
        for (let j = 0; j < nbVars; j++) {
            const inputVal = document.getElementById(`c-${j}`);
            c.push(inputVal ? parseFloat(inputVal.value) || 0 : 0);
        }

        // Lecture des contraintes et termes constants
        const A = [];
        const b = [];
        for (let i = 0; i < nbConstraints; i++) {
            const row = [];
            for (let j = 0; j < nbVars; j++) {
                const inputVal = document.getElementById(`a-${i}-${j}`);
                row.push(inputVal ? parseFloat(inputVal.value) || 0 : 0);
            }
            A.push(row);
            const inputB = document.getElementById(`b-${i}`);
            b.push(inputB ? parseFloat(inputB.value) || 0 : 0);
        }

        // Construction du tableau initial
        const tableau = [];
        for (let i = 0; i < nbConstraints; i++) {
            const ligne = [...A[i]];
            // Ajout des variables d'écart (matrice identité)
            const ecarts = Array.from({ length: nbConstraints }, (_, k) => (i === k ? 1.0 : 0.0));
            ligne.push(...ecarts);
            ligne.push(b[i]); // RHS
            tableau.push(ligne);
        }

        // Ligne Z initiale
        tableau.push([...c, ...Array(nbConstraints).fill(0.0), 0.0]);

        const nomsVars = [
            ...Array.from({ length: nbVars }, (_, i) => `x${i + 1}`),
            ...Array.from({ length: nbConstraints }, (_, i) => `e${i + 1}`)
        ];
        const base = Array.from({ length: nbConstraints }, (_, i) => `e${i + 1}`);

        stepsContainer.innerHTML = "";
        summaryCard.innerHTML = "";

        // Affichage de l'état initial
        stepsContainer.innerHTML += renderTableauHTML(
            tableau,
            base,
            nomsVars,
            "Tableau Initial (Itération 0)"
        );

        let iteration = 0;
        const maxIterations = 50;

        // Boucle du Simplexe
        while (iteration < maxIterations) {
            const derniereLigne = tableau[tableau.length - 1].slice(0, -1);
            const valeurMax = Math.max(...derniereLigne);

            // Critère d'arrêt : plus aucun coefficient strictement positif
            if (valeurMax <= 1e-9) {
                break;
            }

            // Variable entrante (colonne pivot)
            const colonnePivot = derniereLigne.indexOf(valeurMax);

            // Calcul des ratios pour la variable sortante
            const ratios = [];
            for (let i = 0; i < nbConstraints; i++) {
                const elem = tableau[i][colonnePivot];
                const rhs = tableau[i][tableau[i].length - 1];
                ratios.push(elem > 1e-9 ? rhs / elem : Infinity);
            }

            // Détection du domaine non borné
            if (ratios.every(r => r === Infinity)) {
                summaryCard.innerHTML = `<h3 class="error-text">Erreur : Solution non bornée (le problème tend vers l'infini).</h3>`;
                resultsSection.classList.remove("hidden");
                return;
            }

            // Choix du ratio minimal (ligne pivot)
            const minRatio = Math.min(...ratios);
            const lignePivot = ratios.indexOf(minRatio);
            const valeurPivot = tableau[lignePivot][colonnePivot];

            const pivotMeta = {
                ligne: lignePivot,
                colonne: colonnePivot,
                valeur: valeurPivot,
                varEntrante: nomsVars[colonnePivot],
                varSortante: base[lignePivot]
            };

            // Mise à jour de la base
            base[lignePivot] = nomsVars[colonnePivot];

            // Normalisation de la ligne pivot
            tableau[lignePivot] = tableau[lignePivot].map(val => val / valeurPivot);

            // Élimination de Gauss-Jordan sur les autres lignes
            const nbRows = tableau.length;
            const nbCols = tableau[0].length;
            for (let i = 0; i < nbRows; i++) {
                if (i !== lignePivot) {
                    const facteur = tableau[i][colonnePivot];
                    for (let j = 0; j < nbCols; j++) {
                        tableau[i][j] -= facteur * tableau[lignePivot][j];
                    }
                }
            }

            iteration++;
            stepsContainer.innerHTML += renderTableauHTML(
                tableau,
                base,
                nomsVars,
                `Tableau après l'Itération ${iteration}`,
                pivotMeta
            );
        }

        // Récupération de la solution optimale
        const solution = {};
        nomsVars.forEach(v => (solution[v] = 0.0));
        base.forEach((v, i) => {
            solution[v] = parseFloat(tableau[i][tableau[i].length - 1].toFixed(4));
        });

        const valeurOptimaleZ = parseFloat((-tableau[tableau.length - 1][tableau[0].length - 1]).toFixed(4));

        // Affichage du récapitulatif final
        let summaryHTML = `<h2>Résultat Optimal</h2>
            <p class="optimum-value">Valeur maximale : Z = ${valeurOptimaleZ}</p>
            <div style="margin-top: 10px;">`;

        for (const v of nomsVars) {
            summaryHTML += `<span class="badge-var"><strong>${v}</strong> = ${solution[v]}</span> `;
        }
        summaryHTML += `</div>`;

        summaryCard.innerHTML = summaryHTML;
        resultsSection.classList.remove("hidden");
        resultsSection.scrollIntoView({ behavior: "smooth" });
    }

    // ==============================================================
    // 4. ÉCOUTEURS D'ÉVÉNEMENTS
    // ==============================================================
    // Recalcule et réadapte l'affichage dès que l'utilisateur modifie les inputs
    numVarsInput.addEventListener("input", generateFields);
    numConstraintsInput.addEventListener("input", generateFields);

    btnGenerate.addEventListener("click", generateFields);
    btnSolve.addEventListener("click", solveSimplex);

    // Initialisation au chargement de la page
    generateFields();
});