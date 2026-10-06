const varCountInput = document.getElementById("varCount");
const constraintCountInput = document.getElementById("constraintCount");
const problemTypeSelect = document.getElementById("problemType");
const objectiveContainer = document.getElementById("objectiveContainer");
const constraintsContainer = document.getElementById("constraintsContainer");
const resultContainer = document.getElementById("result");
const problemSummaryContainer = document.getElementById("problemSummary");
const simplexTableContainer = document.getElementById("simplexTable");
const graphVerticesTableContainer = document.getElementById("graphVerticesTable");
const methodGraphicalCheckbox = document.getElementById("methodGraphical");
const methodSimplexCheckbox = document.getElementById("methodSimplex");
const methodsHint = document.getElementById("methodsHint");
const solveSelectedButton = document.getElementById("solveSelected");
const loadExampleButton = document.getElementById("loadExample");
const objectiveTitle = document.getElementById("objectiveTitle");
const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");

const EPS = 1e-8;

const graphState = {
  data: null,
  view: null,
  dragging: false,
  dragStart: null,
  hoveredPoint: null,
};

document.getElementById("buildForm").addEventListener("click", buildForm);
solveSelectedButton.addEventListener("click", solveSelectedMethods);
loadExampleButton.addEventListener("click", loadExampleData);

[varCountInput, constraintCountInput, problemTypeSelect].forEach((el) => {
  el.addEventListener("input", onProblemInputChange);
  el.addEventListener("change", onProblemInputChange);
});

objectiveContainer.addEventListener("input", onProblemInputChange);
constraintsContainer.addEventListener("input", onProblemInputChange);
constraintsContainer.addEventListener("change", onProblemInputChange);

canvas.addEventListener("wheel", onCanvasWheel, { passive: false });
canvas.addEventListener("mousedown", onCanvasMouseDown);
canvas.addEventListener("mousemove", onCanvasMouseMove);
canvas.addEventListener("mouseup", onCanvasMouseUp);
canvas.addEventListener("mouseleave", onCanvasMouseLeave);

buildForm();

function buildForm() {
  const n = Math.max(2, Number(varCountInput.value));
  const m = Math.max(1, Number(constraintCountInput.value));
  varCountInput.value = n;
  constraintCountInput.value = m;

  let objectiveHtml = "<table class='table table-sm align-middle'><thead><tr>";
  for (let i = 0; i < n; i++) {
    objectiveHtml += `<th>${formatVarHtml(i)}</th>`;
  }
  objectiveHtml += "</tr></thead><tbody><tr>";
  for (let i = 0; i < n; i++) {
    objectiveHtml += `<td><input type='number' step='any' class='form-control coeff-input objective-coeff' data-index='${i}' value='1'></td>`;
  }
  objectiveHtml += "</tr></tbody></table>";
  objectiveContainer.innerHTML = objectiveHtml;

  let constraintsHtml = "<table class='table table-sm align-middle'><thead><tr>";
  for (let j = 0; j < n; j++) {
    constraintsHtml += `<th>${formatVarHtml(j)}</th>`;
  }
  constraintsHtml += "<th>Operador</th><th>Valor</th></tr></thead><tbody>";

  for (let i = 0; i < m; i++) {
    constraintsHtml += "<tr>";
    for (let j = 0; j < n; j++) {
      constraintsHtml += `<td><input type='number' step='any' class='form-control coeff-input constraint-coeff' data-row='${i}' data-col='${j}' value='1'></td>`;
    }
    constraintsHtml += `<td>
      <select class='form-select constraint-sign' data-row='${i}'>
        <option value='<=' selected>&le;</option>
        <option value='>='>&ge;</option>
        <option value='='>=</option>
      </select>
    </td>`;
    constraintsHtml += `<td><input type='number' step='any' class='form-control coeff-input constraint-rhs' data-row='${i}' value='0'></td>`;
    constraintsHtml += "</tr>";
  }

  constraintsHtml += "</tbody></table>";
  constraintsContainer.innerHTML = constraintsHtml;

  methodGraphicalCheckbox.checked = true;
  methodSimplexCheckbox.checked = true;

  resetOutputs();
  updateObjectiveTitle();
  updateMethodAvailability();
}

function loadExampleData() {
  varCountInput.value = 2;
  constraintCountInput.value = 3;
  problemTypeSelect.value = "max";
  buildForm();

  const objective = [3, 5];
  const constraints = [
    { coeffs: [1, 0], sign: "<=", rhs: 4 },
    { coeffs: [0, 2], sign: "<=", rhs: 12 },
    { coeffs: [3, 2], sign: "<=", rhs: 18 },
  ];

  objective.forEach((value, i) => {
    const input = document.querySelector(`.objective-coeff[data-index='${i}']`);
    if (input) input.value = value;
  });

  constraints.forEach((constraint, row) => {
    constraint.coeffs.forEach((value, col) => {
      const input = document.querySelector(`.constraint-coeff[data-row='${row}'][data-col='${col}']`);
      if (input) input.value = value;
    });
    const sign = document.querySelector(`.constraint-sign[data-row='${row}']`);
    const rhs = document.querySelector(`.constraint-rhs[data-row='${row}']`);
    if (sign) sign.value = constraint.sign;
    if (rhs) rhs.value = constraint.rhs;
  });

  updateMethodAvailability();
  solveSelectedMethods();
}

function onProblemInputChange() {
  updateObjectiveTitle();
  updateMethodAvailability();
}

function resetOutputs() {
  resultContainer.innerHTML = "";
  problemSummaryContainer.innerHTML = "";
  simplexTableContainer.innerHTML = "";
  graphVerticesTableContainer.innerHTML = "Resolva pelo Método Gráfico para visualizar os valores.";
  graphState.data = null;
  graphState.view = null;
  graphState.hoveredPoint = null;
  clearCanvas();
}

function updateObjectiveTitle() {
  const mode = problemTypeSelect.value;
  objectiveTitle.textContent = `Função objetivo (${mode === "min" ? "minimizar" : "maximizar"})`;
}

function readProblem() {
  const n = Number(varCountInput.value);
  const m = Number(constraintCountInput.value);

  const objective = Array.from(document.querySelectorAll(".objective-coeff"), (input) =>
    Number(input.value || 0)
  );

  const constraints = [];
  for (let i = 0; i < m; i++) {
    const coeffs = [];
    for (let j = 0; j < n; j++) {
      const el = document.querySelector(`.constraint-coeff[data-row='${i}'][data-col='${j}']`);
      coeffs.push(Number(el?.value || 0));
    }
    const sign = document.querySelector(`.constraint-sign[data-row='${i}']`)?.value || "<=";
    const rhs = Number(document.querySelector(`.constraint-rhs[data-row='${i}']`)?.value || 0);
    constraints.push({ coeffs, sign, rhs });
  }

  return { n, m, mode: problemTypeSelect.value, objective, constraints };
}

function updateMethodAvailability() {
  const problem = readProblem();

  const graphEnabled = problem.n === 2;
  const simplexPrepared = normalizeForSimplex(problem.constraints, problem.n);
  const simplexEnabled = simplexPrepared.ok;

  methodGraphicalCheckbox.disabled = !graphEnabled;
  methodSimplexCheckbox.disabled = !simplexEnabled;

  if (!graphEnabled) methodGraphicalCheckbox.checked = false;
  if (!simplexEnabled) methodSimplexCheckbox.checked = false;

  if (graphEnabled && simplexEnabled) {
    methodsHint.textContent = "Você pode resolver com um método ou os dois ao mesmo tempo.";
  } else {
    const reasons = [];
    if (!graphEnabled) reasons.push("Método Gráfico: exige exatamente 2 variáveis.");
    if (!simplexEnabled) reasons.push(`Simplex: ${simplexPrepared.error}`);
    methodsHint.textContent = reasons.join(" ");
  }
}

function solveSelectedMethods() {
  const problem = readProblem();
  updateMethodAvailability();

  const useGraph = methodGraphicalCheckbox.checked && !methodGraphicalCheckbox.disabled;
  const useSimplex = methodSimplexCheckbox.checked && !methodSimplexCheckbox.disabled;

  simplexTableContainer.innerHTML = "";
  renderProblemSummary(problem);

  if (!useGraph && !useSimplex) {
    clearCanvas();
    setResultMessages([
      { message: "Selecione ao menos um método disponível para resolver.", type: "warning" },
    ]);
    return;
  }

  const messages = [];

  if (useGraph) {
    const graphResult = solveGraphical(problem);
    messages.push({ message: graphResult.message, type: graphResult.type });
  } else {
    graphState.data = null;
    graphState.view = null;
    clearCanvas();
    graphVerticesTableContainer.innerHTML = "Método Gráfico desativado.";
  }

  if (useSimplex) {
    const simplexResult = solveSimplex(problem);
    messages.push({ message: simplexResult.message, type: simplexResult.type });
  } else {
    simplexTableContainer.innerHTML = "";
  }

  setResultMessages(messages);
}

function renderProblemSummary(problem) {
  const modeLabel = problem.mode === "min" ? "Minimização" : "Maximização";
  const objectiveLabel =
    problem.objective
      .map((coef, i) => `${formatNumber(coef)}${formatVarText(i)}`)
      .join(" + ") || "0";

  const constraintsLabel = problem.constraints
    .map((c) => {
      const expr = c.coeffs.map((coef, i) => `${formatNumber(coef)}${formatVarText(i)}`).join(" + ");
      return `<li>${expr} ${signToHtml(c.sign)} ${formatNumber(c.rhs)}</li>`;
    })
    .join("");

  problemSummaryContainer.innerHTML = `
    <div class='alert alert-light border mb-3'>
      <strong>Tipo do problema:</strong> ${modeLabel}<br>
      <strong>Função objetivo:</strong> ${problem.mode === "min" ? "Min Z =" : "Max Z ="} ${objectiveLabel}<br>
      <strong>Resumo das restrições:</strong>
      <ul class='mb-0 mt-1'>${constraintsLabel}</ul>
    </div>
  `;
}

function solveGraphical(problem) {
  const graphConstraints = [
    ...problem.constraints,
    { coeffs: [1, 0], sign: ">=", rhs: 0 },
    { coeffs: [0, 1], sign: ">=", rhs: 0 },
  ];

  const points = collectCandidatePoints(graphConstraints);
  const feasible = points.filter((p) => isFeasible(p, graphConstraints));
  const intersections = collectIntersections(graphConstraints);

  if (!feasible.length) {
    drawGraph(buildBoundaryLines(graphConstraints), [], [], null, intersections);
    graphVerticesTableContainer.innerHTML = "Não há vértices viáveis para exibir.";
    return {
      type: "danger",
      message: "Método Gráfico: não foi encontrada região viável para as restrições informadas.",
    };
  }

  let best = null;
  feasible.forEach((p) => {
    const value = problem.objective[0] * p.x + problem.objective[1] * p.y;
    const improve = problem.mode === "min" ? value < best?.value - EPS : value > (best?.value ?? -Infinity) + EPS;
    if (!best || improve) {
      best = { ...p, value };
    }
  });

  const hull = convexHull(feasible);
  const lines = buildBoundaryLines(graphConstraints);
  drawGraph(lines, hull, feasible, best, intersections);
  renderVerticesTable(hull, problem.objective, best);

  const verticesHtml = hull.map((p) => `(${p.x.toFixed(3)}, ${p.y.toFixed(3)})`).join(", ");
  return {
    type: "success",
    message: `Método Gráfico: solução ótima ${formatVarText(0)}=${best.x.toFixed(4)}, ${formatVarText(
      1
    )}=${best.y.toFixed(4)}, Z=${best.value.toFixed(4)}.<br>Vértices viáveis: ${verticesHtml || "-"}`,
  };
}

function solveSimplex(problem) {
  const prepared = normalizeForSimplex(problem.constraints, problem.n);
  if (!prepared.ok) {
    return { type: "danger", message: `Simplex: ${prepared.error}` };
  }

  const simplexObjective = problem.mode === "min" ? problem.objective.map((v) => -v) : problem.objective.slice();
  const simplex = runSimplex(simplexObjective, prepared.constraints);
  if (!simplex.ok) {
    return { type: "danger", message: `Simplex: ${simplex.error}` };
  }

  const realValue = problem.mode === "min" ? -simplex.value : simplex.value;
  const solutionHtml = simplex.solution
    .map((v, i) => `${formatVarText(i)}=${v.toFixed(4)}`)
    .join(", ");

  renderSimplexTable(simplex.steps, problem.n, prepared.constraints.length, simplex.solution, realValue);

  return {
    type: "success",
    message: `Simplex: solução ótima ${solutionHtml}, Z=${realValue.toFixed(4)}.`,
  };
}

function normalizeForSimplex(constraints, n) {
  const normalized = [];

  for (const c of constraints) {
    let coeffs = c.coeffs.slice(0, n);
    let rhs = c.rhs;
    let sign = c.sign;

    if (sign === "=") {
      return { ok: false, error: "esta versão suporta apenas restrições com ≤ ou ≥." };
    }

    if (sign === ">=") {
      coeffs = coeffs.map((v) => -v);
      rhs = -rhs;
      sign = "<=";
    }

    if (rhs < 0) {
      coeffs = coeffs.map((v) => -v);
      rhs = -rhs;
      sign = sign === "<=" ? ">=" : "<=";
      if (sign !== "<=") {
        return { ok: false, error: "não foi possível normalizar as restrições para a forma padrão." };
      }
    }

    if (sign !== "<=") {
      return { ok: false, error: "as restrições precisam ser convertíveis para ≤." };
    }

    normalized.push({ coeffs, rhs });
  }

  return { ok: true, constraints: normalized };
}

function runSimplex(objective, constraints) {
  const m = constraints.length;
  const n = objective.length;
  const rows = m + 1;
  const cols = n + m + 1;

  const tableau = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      tableau[i][j] = constraints[i].coeffs[j] || 0;
    }
    tableau[i][n + i] = 1;
    tableau[i][cols - 1] = constraints[i].rhs;
  }

  for (let j = 0; j < n; j++) {
    tableau[m][j] = -(objective[j] || 0);
  }

  const steps = [
    {
      label: "Tabela inicial",
      tableau: cloneTableau(tableau),
      pivotRow: null,
      pivotCol: null,
      entering: null,
      leaving: null,
      value: tableau[m][cols - 1],
    },
  ];

  let guard = 0;
  while (guard < 1000) {
    guard++;
    const pivotCol = choosePivotColumn(tableau[m]);
    if (pivotCol === -1) break;

    const pivotRow = choosePivotRow(tableau, pivotCol, m, cols - 1);
    if (pivotRow === -1) {
      return { ok: false, error: "problema ilimitado (unbounded)." };
    }

    const entering = pivotCol < n ? formatVarText(pivotCol) : `s${pivotCol - n + 1}`;
    const leaving = `R${pivotRow + 1}`;

    pivot(tableau, pivotRow, pivotCol);

    steps.push({
      label: `Etapa ${steps.length}`,
      tableau: cloneTableau(tableau),
      pivotRow,
      pivotCol,
      entering,
      enteringIndex: pivotCol,
      leaving,
      leavingIndex: pivotRow,
      value: tableau[m][cols - 1],
    });
  }

  if (guard >= 1000) {
    return { ok: false, error: "excedeu o limite de iterações." };
  }

  const solution = Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    const basicRow = getBasicRow(tableau, j, m);
    if (basicRow !== -1) {
      solution[j] = tableau[basicRow][cols - 1];
    }
  }

  return { ok: true, solution, value: tableau[m][cols - 1], tableau, steps };
}

function choosePivotColumn(objectiveRow) {
  let min = 0;
  let index = -1;
  for (let j = 0; j < objectiveRow.length - 1; j++) {
    if (objectiveRow[j] < min - EPS) {
      min = objectiveRow[j];
      index = j;
    }
  }
  return index;
}

function choosePivotRow(tableau, pivotCol, m, rhsCol) {
  let row = -1;
  let bestRatio = Number.POSITIVE_INFINITY;
  for (let i = 0; i < m; i++) {
    const value = tableau[i][pivotCol];
    if (value > EPS) {
      const ratio = tableau[i][rhsCol] / value;
      if (ratio < bestRatio - EPS) {
        bestRatio = ratio;
        row = i;
      }
    }
  }
  return row;
}

function pivot(tableau, pivotRow, pivotCol) {
  const rows = tableau.length;
  const cols = tableau[0].length;
  const pivotValue = tableau[pivotRow][pivotCol];

  for (let j = 0; j < cols; j++) {
    tableau[pivotRow][j] /= pivotValue;
  }

  for (let i = 0; i < rows; i++) {
    if (i === pivotRow) continue;
    const factor = tableau[i][pivotCol];
    if (Math.abs(factor) < EPS) continue;
    for (let j = 0; j < cols; j++) {
      tableau[i][j] -= factor * tableau[pivotRow][j];
    }
  }
}

function getBasicRow(tableau, column, m) {
  let oneRow = -1;
  for (let i = 0; i < m; i++) {
    const val = tableau[i][column];
    if (Math.abs(val - 1) < EPS) {
      if (oneRow !== -1) return -1;
      oneRow = i;
    } else if (Math.abs(val) > EPS) {
      return -1;
    }
  }
  return oneRow;
}

function renderSimplexTable(steps, n, m, solution, value) {
  const header = [
    ...Array.from({ length: n }, (_, i) => formatVarHtml(i)),
    ...Array.from({ length: m }, (_, i) => `s${i + 1}`),
    "b",
  ];

  const stepsHtml = steps
    .map((step, index) => {
      const rowsHtml = step.tableau
        .map((row, rowIndex) => {
          const rowLabel = rowIndex === step.tableau.length - 1 ? "Z" : `R${rowIndex + 1}`;
          const cells = row
            .map((valueCell, colIndex) => {
              const isPivotCell = step.pivotRow === rowIndex && step.pivotCol === colIndex;
              const isPivotRow = step.pivotRow === rowIndex;
              const isPivotCol = step.pivotCol === colIndex;
              const isFinalStep = index === steps.length - 1;
              const isFinalZCell = isFinalStep && rowLabel === "Z" && colIndex === row.length - 1;
              const classes = [
                isPivotCell ? "pivot-cell" : "",
                isPivotRow ? "pivot-row-cell" : "",
                isPivotCol ? "pivot-col-cell" : "",
                rowLabel === "Z" ? "z-row-cell" : "",
                isFinalZCell ? "final-result-cell" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return `<td class='${classes}'>${valueCell.toFixed(4)}</td>`;
            })
            .join("");
          const rowClass = index === steps.length - 1 && rowLabel === "Z" ? "final-z-row" : "";
          return `<tr class='${rowClass}'><th>${rowLabel}</th>${cells}</tr>`;
        })
        .join("");

      const stepResult =
        index === 0
          ? ""
          : `<div class='small text-muted mb-2'>Entrou: <strong>${step.entering}</strong> | Saiu: <strong>${step.leaving}</strong> | Z parcial: <strong>${step.value.toFixed(4)}</strong></div>`;

      return `
        <div class='simplex-step mb-3 p-2 border rounded'>
          <div class='d-flex justify-content-between align-items-center mb-2'>
            <h3 class='h6 mb-0'>${step.label}</h3>
            ${index === steps.length - 1 ? "<span class='badge text-bg-success'>Resultado final</span>" : ""}
          </div>
          ${stepResult}
          <table class='table table-bordered table-sm mb-0'>
            <thead><tr><th></th>${header.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      `;
    })
    .join("");

  const finalVars = solution.map((v, i) => `${formatVarText(i)}=${v.toFixed(4)}`).join(", ");
  simplexTableContainer.innerHTML = `
    <h3 class='h6'>Evolução do Simplex</h3>
    ${stepsHtml}
    <div class='alert alert-success mb-0'>
      <strong>Resultado final:</strong> ${finalVars} | <strong>Z=${value.toFixed(4)}</strong>
    </div>
  `;
}

function cloneTableau(tableau) {
  return tableau.map((row) => row.slice());
}

function collectCandidatePoints(constraints) {
  const points = [{ x: 0, y: 0 }];

  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      const p = intersection(constraints[i], constraints[j]);
      if (p) points.push(p);
    }
  }

  constraints.forEach((c) => {
    const [a, b] = c.coeffs;
    if (Math.abs(a) > EPS) points.push({ x: c.rhs / a, y: 0 });
    if (Math.abs(b) > EPS) points.push({ x: 0, y: c.rhs / b });
  });

  return uniquePoints(points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
}

function collectIntersections(constraints) {
  const points = [];
  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      const p = intersection(constraints[i], constraints[j]);
      if (p && p.x >= -EPS && p.y >= -EPS) {
        points.push({ x: Math.max(0, p.x), y: Math.max(0, p.y) });
      }
    }
  }
  return uniquePoints(points);
}

function intersection(c1, c2) {
  const [a1, b1] = c1.coeffs;
  const [a2, b2] = c2.coeffs;
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < EPS) return null;

  const x = (c1.rhs * b2 - c2.rhs * b1) / det;
  const y = (a1 * c2.rhs - a2 * c1.rhs) / det;
  return { x, y };
}

function isFeasible(point, constraints) {
  return constraints.every((c) => {
    const value = c.coeffs[0] * point.x + c.coeffs[1] * point.y;
    if (c.sign === "<=") return value <= c.rhs + EPS;
    if (c.sign === ">=") return value >= c.rhs - EPS;
    return Math.abs(value - c.rhs) <= EPS;
  });
}

function uniquePoints(points) {
  const unique = [];
  points.forEach((p) => {
    if (!unique.some((u) => Math.abs(u.x - p.x) < 1e-6 && Math.abs(u.y - p.y) < 1e-6)) {
      unique.push(p);
    }
  });
  return unique;
}

function convexHull(points) {
  if (points.length <= 1) return points.slice();

  const sorted = points.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= EPS) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= EPS) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function buildBoundaryLines(constraints) {
  return constraints.map((c) => ({ coeffs: c.coeffs, rhs: c.rhs }));
}

function drawGraph(lines, hull, feasible, best, intersections) {
  const bounds = computeBounds(lines, feasible, best, intersections);

  graphState.data = { lines, hull, feasible, best, intersections, bounds };
  graphState.view = { ...bounds };
  graphState.hoveredPoint = null;

  drawGraphFromState();
}

function computeBounds(lines, feasible, best, intersections) {
  let maxX = 10;
  let maxY = 10;

  lines.forEach((line) => {
    const [a, b] = line.coeffs;
    if (Math.abs(a) > EPS) maxX = Math.max(maxX, Math.abs(line.rhs / a));
    if (Math.abs(b) > EPS) maxY = Math.max(maxY, Math.abs(line.rhs / b));
  });

  [...feasible, ...intersections, ...(best ? [best] : [])].forEach((p) => {
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });

  return {
    minX: 0,
    maxX: Math.max(1, maxX * 1.2),
    minY: 0,
    maxY: Math.max(1, maxY * 1.2),
  };
}

function drawGraphFromState() {
  clearCanvas();
  if (!graphState.data || !graphState.view) return;

  const { lines, hull, feasible, best, intersections } = graphState.data;
  const pad = 55;
  const w = canvas.width;
  const h = canvas.height;

  const toCanvas = (x, y) => {
    const { minX, maxX, minY, maxY } = graphState.view;
    const px = pad + ((x - minX) / (maxX - minX)) * (w - 2 * pad);
    const py = h - pad - ((y - minY) / (maxY - minY)) * (h - 2 * pad);
    return { px, py };
  };

  drawAxes(toCanvas, pad, w, h);

  const colors = ["#0d6efd", "#198754", "#dc3545", "#fd7e14", "#6f42c1", "#20c997"];
  lines.forEach((line, idx) => {
    const [a, b] = line.coeffs;
    const color = colors[idx % colors.length];

    let p1;
    let p2;
    const { minX, maxX, minY, maxY } = graphState.view;

    if (Math.abs(b) > EPS) {
      p1 = { x: minX, y: (line.rhs - a * minX) / b };
      p2 = { x: maxX, y: (line.rhs - a * maxX) / b };
    } else if (Math.abs(a) > EPS) {
      p1 = { x: line.rhs / a, y: minY };
      p2 = { x: line.rhs / a, y: maxY };
    } else {
      return;
    }

    const c1 = toCanvas(p1.x, p1.y);
    const c2 = toCanvas(p2.x, p2.y);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(c1.px, c1.py);
    ctx.lineTo(c2.px, c2.py);
    ctx.stroke();
  });

  if (hull.length >= 3) {
    ctx.fillStyle = "rgba(13, 110, 253, 0.15)";
    ctx.beginPath();
    hull.forEach((p, i) => {
      const c = toCanvas(p.x, p.y);
      if (i === 0) ctx.moveTo(c.px, c.py);
      else ctx.lineTo(c.px, c.py);
    });
    ctx.closePath();
    ctx.fill();
  }

  intersections.forEach((p) => drawPointWithLabel(p, toCanvas, "#6c757d", 3, true));
  feasible.forEach((p) => drawPointWithLabel(p, toCanvas, "#0d6efd", 4, false));

  if (best) {
    drawPointWithLabel(
      best,
      toCanvas,
      "#dc3545",
      6,
      true,
      `Ótimo Z=${best.value.toFixed(2)}`,
      { x: 10, y: -14 }
    );
  }

  if (graphState.hoveredPoint) {
    const c = toCanvas(graphState.hoveredPoint.x, graphState.hoveredPoint.y);
    ctx.fillStyle = "#212529";
    ctx.fillText(`(${graphState.hoveredPoint.x.toFixed(3)}, ${graphState.hoveredPoint.y.toFixed(3)})`, c.px + 8, c.py - 12);
  }
}

function drawAxes(toCanvas, pad, w, h) {
  const { minX, maxX, minY, maxY } = graphState.view;

  const axisX = minY <= 0 && maxY >= 0 ? toCanvas(0, 0).py : h - pad;
  const axisY = minX <= 0 && maxX >= 0 ? toCanvas(0, 0).px : pad;

  const xStep = niceStep((maxX - minX) / 8);
  const yStep = niceStep((maxY - minY) / 8);

  ctx.strokeStyle = "#e9ecef";
  ctx.fillStyle = "#6c757d";
  ctx.lineWidth = 1;

  for (let x = Math.ceil(minX / xStep) * xStep; x <= maxX + EPS; x += xStep) {
    const p = toCanvas(x, minY);
    ctx.beginPath();
    ctx.moveTo(p.px, pad);
    ctx.lineTo(p.px, h - pad);
    ctx.stroke();

    ctx.fillStyle = "#6c757d";
    ctx.fillText(x.toFixed(2), p.px - 10, axisX + 16);
  }

  for (let y = Math.ceil(minY / yStep) * yStep; y <= maxY + EPS; y += yStep) {
    const p = toCanvas(minX, y);
    ctx.beginPath();
    ctx.moveTo(pad, p.py);
    ctx.lineTo(w - pad, p.py);
    ctx.stroke();

    ctx.fillStyle = "#6c757d";
    ctx.fillText(y.toFixed(2), axisY - 35, p.py + 4);
  }

  ctx.strokeStyle = "#343a40";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, axisX);
  ctx.lineTo(w - pad, axisX);
  ctx.moveTo(axisY, h - pad);
  ctx.lineTo(axisY, pad);
  ctx.stroke();

  ctx.fillStyle = "#212529";
  ctx.fillText(formatVarText(0), w - pad + 8, axisX + 4);
  ctx.fillText(formatVarText(1), axisY - 8, pad - 8);
}

function drawPointWithLabel(
  point,
  toCanvas,
  color,
  radius,
  showCoords,
  customLabel = null,
  labelOffset = { x: 6, y: -6 }
) {
  const c = toCanvas(point.x, point.y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(c.px, c.py, radius, 0, Math.PI * 2);
  ctx.fill();

  if (showCoords) {
    ctx.fillStyle = "#212529";
    ctx.fillText(
      customLabel || `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`,
      c.px + labelOffset.x,
      c.py + labelOffset.y
    );
  }
}

function onCanvasWheel(event) {
  if (!graphState.data || !graphState.view) return;
  event.preventDefault();

  const zoomFactor = event.deltaY < 0 ? 0.9 : 1.1;
  const mouse = canvasPointToLogical(event.offsetX, event.offsetY);
  const { minX, maxX, minY, maxY } = graphState.view;

  graphState.view = {
    minX: mouse.x - (mouse.x - minX) * zoomFactor,
    maxX: mouse.x + (maxX - mouse.x) * zoomFactor,
    minY: mouse.y - (mouse.y - minY) * zoomFactor,
    maxY: mouse.y + (maxY - mouse.y) * zoomFactor,
  };

  clampGraphView();
  drawGraphFromState();
}

function onCanvasMouseDown(event) {
  if (!graphState.data || !graphState.view) return;
  graphState.dragging = true;
  graphState.dragStart = {
    x: event.offsetX,
    y: event.offsetY,
    view: { ...graphState.view },
  };
}

function onCanvasMouseMove(event) {
  if (!graphState.data || !graphState.view) return;

  if (graphState.dragging && graphState.dragStart) {
    const dx = event.offsetX - graphState.dragStart.x;
    const dy = event.offsetY - graphState.dragStart.y;

    const { minX, maxX, minY, maxY } = graphState.dragStart.view;
    const scaleX = (maxX - minX) / (canvas.width - 110);
    const scaleY = (maxY - minY) / (canvas.height - 110);

    graphState.view = {
      minX: minX - dx * scaleX,
      maxX: maxX - dx * scaleX,
      minY: minY + dy * scaleY,
      maxY: maxY + dy * scaleY,
    };
    clampGraphView();
    drawGraphFromState();
    return;
  }

  const points = [...graphState.data.intersections, ...graphState.data.feasible, ...(graphState.data.best ? [graphState.data.best] : [])];
  graphState.hoveredPoint = findNearbyPoint(event.offsetX, event.offsetY, points);
  drawGraphFromState();
}

function onCanvasMouseUp() {
  graphState.dragging = false;
  graphState.dragStart = null;
}

function onCanvasMouseLeave() {
  graphState.dragging = false;
  graphState.dragStart = null;
  graphState.hoveredPoint = null;
  drawGraphFromState();
}

function findNearbyPoint(px, py, points) {
  let nearest = null;
  let bestDist = Infinity;

  points.forEach((p) => {
    const c = logicalToCanvasPoint(p.x, p.y);
    const dist = Math.hypot(c.px - px, c.py - py);
    if (dist < 10 && dist < bestDist) {
      bestDist = dist;
      nearest = p;
    }
  });

  return nearest;
}

function logicalToCanvasPoint(x, y) {
  const { minX, maxX, minY, maxY } = graphState.view;
  const pad = 55;
  const px = pad + ((x - minX) / (maxX - minX)) * (canvas.width - 2 * pad);
  const py = canvas.height - pad - ((y - minY) / (maxY - minY)) * (canvas.height - 2 * pad);
  return { px, py };
}

function canvasPointToLogical(px, py) {
  const { minX, maxX, minY, maxY } = graphState.view;
  const pad = 55;
  const x = minX + ((px - pad) / (canvas.width - 2 * pad)) * (maxX - minX);
  const y = minY + ((canvas.height - pad - py) / (canvas.height - 2 * pad)) * (maxY - minY);
  return { x, y };
}

function clampGraphView() {
  if (!graphState.data || !graphState.view) return;
  const bounds = graphState.data.bounds;

  if (graphState.view.maxX - graphState.view.minX < 0.2) {
    const midX = (graphState.view.maxX + graphState.view.minX) / 2;
    graphState.view.minX = midX - 0.1;
    graphState.view.maxX = midX + 0.1;
  }

  if (graphState.view.maxY - graphState.view.minY < 0.2) {
    const midY = (graphState.view.maxY + graphState.view.minY) / 2;
    graphState.view.minY = midY - 0.1;
    graphState.view.maxY = midY + 0.1;
  }

  if (graphState.view.minX < -bounds.maxX * 0.25) {
    const shift = -bounds.maxX * 0.25 - graphState.view.minX;
    graphState.view.minX += shift;
    graphState.view.maxX += shift;
  }
  if (graphState.view.minY < -bounds.maxY * 0.25) {
    const shift = -bounds.maxY * 0.25 - graphState.view.minY;
    graphState.view.minY += shift;
    graphState.view.maxY += shift;
  }
}

function niceStep(roughStep) {
  const power = Math.pow(10, Math.floor(Math.log10(roughStep || 1)));
  const fraction = roughStep / power;
  if (fraction <= 1) return 1 * power;
  if (fraction <= 2) return 2 * power;
  if (fraction <= 5) return 5 * power;
  return 10 * power;
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function setResultMessages(messages) {
  resultContainer.innerHTML = messages
    .map((entry) => `<div class='alert alert-${entry.type} mb-2'>${entry.message}</div>`)
    .join("");
}

function renderVerticesTable(vertices, objective, best) {
  if (!vertices.length) {
    graphVerticesTableContainer.innerHTML = "Não há vértices viáveis para exibir.";
    return;
  }

  const rows = vertices
    .map((point) => {
      const value = objective[0] * point.x + objective[1] * point.y;
      const isBest = best && Math.abs(best.x - point.x) < 1e-6 && Math.abs(best.y - point.y) < 1e-6;
      return `
        <tr class='${isBest ? "table-success best-vertex-row" : ""}'>
          <td>${point.x.toFixed(3)}</td>
          <td>${point.y.toFixed(3)}</td>
          <td>${value.toFixed(3)}</td>
          <td>${isBest ? "Ótimo" : "Viável"}</td>
        </tr>
      `;
    })
    .join("");

  graphVerticesTableContainer.innerHTML = `
    <table class='table table-sm table-bordered align-middle mb-0'>
      <thead>
        <tr>
          <th>${formatVarHtml(0)}</th>
          <th>${formatVarHtml(1)}</th>
          <th>Z</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function signToHtml(sign) {
  if (sign === "<=") return "&le;";
  if (sign === ">=") return "&ge;";
  return "=";
}

function formatVarHtml(index) {
  return `X<sub>${index + 1}</sub>`;
}

function formatVarText(index) {
  const subscripts = "₀₁₂₃₄₅₆₇₈₉";
  const digits = String(index + 1)
    .split("")
    .map((digit) => subscripts[Number(digit)] || digit)
    .join("");
  return `X${digits}`;
}

function formatNumber(value) {
  if (Number.isInteger(value)) return String(value);
  return Number(value).toFixed(2).replace(/\.00$/, "");
}
