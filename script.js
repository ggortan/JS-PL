const varCountInput = document.getElementById("varCount");
const constraintCountInput = document.getElementById("constraintCount");
const objectiveContainer = document.getElementById("objectiveContainer");
const constraintsContainer = document.getElementById("constraintsContainer");
const resultContainer = document.getElementById("result");
const simplexTableContainer = document.getElementById("simplexTable");
const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");

const EPS = 1e-8;

document.getElementById("buildForm").addEventListener("click", buildForm);
document.getElementById("solveGraphical").addEventListener("click", solveGraphical);
document.getElementById("solveSimplex").addEventListener("click", solveSimplex);

buildForm();

function buildForm() {
  const n = Math.max(2, Number(varCountInput.value));
  const m = Math.max(1, Number(constraintCountInput.value));
  varCountInput.value = n;
  constraintCountInput.value = m;

  let objectiveHtml = "<table class='table table-sm align-middle'><thead><tr>";
  for (let i = 0; i < n; i++) {
    objectiveHtml += `<th>x${i + 1}</th>`;
  }
  objectiveHtml += "</tr></thead><tbody><tr>";
  for (let i = 0; i < n; i++) {
    objectiveHtml += `<td><input type='number' step='any' class='form-control coeff-input objective-coeff' data-index='${i}' value='0'></td>`;
  }
  objectiveHtml += "</tr></tbody></table>";
  objectiveContainer.innerHTML = objectiveHtml;

  let constraintsHtml = "<table class='table table-sm align-middle'><thead><tr>";
  for (let j = 0; j < n; j++) {
    constraintsHtml += `<th>x${j + 1}</th>`;
  }
  constraintsHtml += "<th>Operador</th><th>Valor</th></tr></thead><tbody>";

  for (let i = 0; i < m; i++) {
    constraintsHtml += "<tr>";
    for (let j = 0; j < n; j++) {
      constraintsHtml += `<td><input type='number' step='any' class='form-control coeff-input constraint-coeff' data-row='${i}' data-col='${j}' value='0'></td>`;
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

  resultContainer.innerHTML = "";
  simplexTableContainer.innerHTML = "";
  clearCanvas();
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

  return { n, m, objective, constraints };
}

function solveGraphical() {
  clearCanvas();
  simplexTableContainer.innerHTML = "";

  const problem = readProblem();
  if (problem.n !== 2) {
    setResult("O método gráfico exige exatamente 2 variáveis de decisão.", "warning");
    return;
  }

  const graphConstraints = [...problem.constraints, { coeffs: [1, 0], sign: ">=", rhs: 0 }, { coeffs: [0, 1], sign: ">=", rhs: 0 }];

  const points = collectCandidatePoints(graphConstraints);
  const feasible = points.filter((p) => isFeasible(p, graphConstraints));

  if (!feasible.length) {
    setResult("Não foi encontrada região viável para as restrições informadas.", "danger");
    drawGraph(graphConstraints, [], [], null);
    return;
  }

  let best = null;
  feasible.forEach((p) => {
    const value = problem.objective[0] * p.x + problem.objective[1] * p.y;
    if (!best || value > best.value + EPS) {
      best = { ...p, value };
    }
  });

  const hull = convexHull(feasible);
  const lines = buildBoundaryLines(graphConstraints);
  drawGraph(lines, hull, feasible, best);

  const verticesHtml = hull
    .map((p) => `(${p.x.toFixed(3)}, ${p.y.toFixed(3)})`)
    .join(", ");

  setResult(
    `Solução ótima (gráfico): x1=${best.x.toFixed(4)}, x2=${best.y.toFixed(4)}, Z=${best.value.toFixed(4)}<br>Vértices viáveis: ${verticesHtml}`,
    "success"
  );
}

function solveSimplex() {
  clearCanvas();
  simplexTableContainer.innerHTML = "";

  const problem = readProblem();
  if (problem.n < 2) {
    setResult("Informe ao menos 2 variáveis de decisão.", "warning");
    return;
  }

  const prepared = normalizeForSimplex(problem.constraints, problem.n);
  if (!prepared.ok) {
    setResult(prepared.error, "danger");
    return;
  }

  const simplex = runSimplex(problem.objective, prepared.constraints);
  if (!simplex.ok) {
    setResult(simplex.error, "danger");
    return;
  }

  const solutionHtml = simplex.solution
    .map((v, i) => `x${i + 1}=${v.toFixed(4)}`)
    .join(", ");

  setResult(`Solução ótima (Simplex): ${solutionHtml}, Z=${simplex.value.toFixed(4)}`, "success");
  renderSimplexTable(simplex.tableau, problem.n, prepared.constraints.length);
}

function normalizeForSimplex(constraints, n) {
  const normalized = [];

  for (const c of constraints) {
    let coeffs = c.coeffs.slice(0, n);
    let rhs = c.rhs;
    let sign = c.sign;

    if (sign === "=") {
      return { ok: false, error: "Para o Simplex desta versão, use apenas restrições com ≤ ou ≥." };
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
        return { ok: false, error: "Não foi possível normalizar as restrições para a forma padrão do Simplex." };
      }
    }

    if (sign !== "<=") {
      return { ok: false, error: "Para o Simplex desta versão, use apenas restrições que possam ser convertidas para ≤." };
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

  let guard = 0;
  while (guard < 1000) {
    guard++;
    const pivotCol = choosePivotColumn(tableau[m]);
    if (pivotCol === -1) break;

    const pivotRow = choosePivotRow(tableau, pivotCol, m, cols - 1);
    if (pivotRow === -1) {
      return { ok: false, error: "Problema ilimitado (unbounded) para o método Simplex." };
    }

    pivot(tableau, pivotRow, pivotCol);
  }

  if (guard >= 1000) {
    return { ok: false, error: "Simplex excedeu o limite de iterações." };
  }

  const solution = Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    const basicRow = getBasicRow(tableau, j, m);
    if (basicRow !== -1) {
      solution[j] = tableau[basicRow][cols - 1];
    }
  }

  return { ok: true, solution, value: tableau[m][cols - 1], tableau };
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

function renderSimplexTable(tableau, n, m) {
  const cols = tableau[0].length;
  let html = "<h3 class='h6'>Tabela final do Simplex</h3><table class='table table-bordered table-sm'><thead><tr><th></th>";

  for (let i = 0; i < n; i++) html += `<th>x${i + 1}</th>`;
  for (let i = 0; i < m; i++) html += `<th>s${i + 1}</th>`;
  html += "<th>b</th></tr></thead><tbody>";

  for (let i = 0; i < tableau.length; i++) {
    html += `<tr><th>${i === tableau.length - 1 ? "Z" : `R${i + 1}`}</th>`;
    for (let j = 0; j < cols; j++) {
      html += `<td>${tableau[i][j].toFixed(4)}</td>`;
    }
    html += "</tr>";
  }

  html += "</tbody></table>";
  simplexTableContainer.innerHTML = html;
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

  const sorted = points
    .slice()
    .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

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

function drawGraph(lines, hull, feasible, best) {
  clearCanvas();

  const allPoints = [...feasible, ...(best ? [best] : [])];
  let maxX = 10;
  let maxY = 10;

  lines.forEach((line) => {
    const [a, b] = line.coeffs;
    if (Math.abs(a) > EPS) maxX = Math.max(maxX, Math.abs(line.rhs / a));
    if (Math.abs(b) > EPS) maxY = Math.max(maxY, Math.abs(line.rhs / b));
  });

  allPoints.forEach((p) => {
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });

  maxX = Math.max(1, maxX * 1.2);
  maxY = Math.max(1, maxY * 1.2);

  const pad = 40;
  const w = canvas.width;
  const h = canvas.height;

  const toCanvas = (x, y) => {
    const px = pad + (x / maxX) * (w - 2 * pad);
    const py = h - pad - (y / maxY) * (h - 2 * pad);
    return { px, py };
  };

  ctx.strokeStyle = "#6c757d";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, h - pad);
  ctx.lineTo(w - pad, h - pad);
  ctx.moveTo(pad, h - pad);
  ctx.lineTo(pad, pad);
  ctx.stroke();

  ctx.fillStyle = "#6c757d";
  ctx.fillText("x", w - pad + 8, h - pad + 4);
  ctx.fillText("y", pad - 8, pad - 8);

  const colors = ["#0d6efd", "#198754", "#dc3545", "#fd7e14", "#6f42c1", "#20c997"];
  lines.forEach((line, idx) => {
    const [a, b] = line.coeffs;
    const color = colors[idx % colors.length];

    let p1;
    let p2;
    if (Math.abs(b) > EPS) {
      p1 = { x: 0, y: line.rhs / b };
      p2 = { x: maxX, y: (line.rhs - a * maxX) / b };
    } else if (Math.abs(a) > EPS) {
      p1 = { x: line.rhs / a, y: 0 };
      p2 = { x: line.rhs / a, y: maxY };
    } else {
      return;
    }

    const c1 = toCanvas(p1.x, p1.y);
    const c2 = toCanvas(p2.x, p2.y);

    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(c1.px, c1.py);
    ctx.lineTo(c2.px, c2.py);
    ctx.stroke();
  });

  if (hull.length >= 3) {
    ctx.fillStyle = "rgba(13, 110, 253, 0.2)";
    ctx.beginPath();
    hull.forEach((p, i) => {
      const c = toCanvas(p.x, p.y);
      if (i === 0) ctx.moveTo(c.px, c.py);
      else ctx.lineTo(c.px, c.py);
    });
    ctx.closePath();
    ctx.fill();
  }

  feasible.forEach((p) => {
    const c = toCanvas(p.x, p.y);
    ctx.fillStyle = "#0d6efd";
    ctx.beginPath();
    ctx.arc(c.px, c.py, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  if (best) {
    const c = toCanvas(best.x, best.y);
    ctx.fillStyle = "#dc3545";
    ctx.beginPath();
    ctx.arc(c.px, c.py, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#212529";
    ctx.fillText(`Ótimo (${best.x.toFixed(2)}, ${best.y.toFixed(2)})`, c.px + 8, c.py - 8);
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function setResult(message, type) {
  resultContainer.innerHTML = `<div class='alert alert-${type} mb-0'>${message}</div>`;
}
