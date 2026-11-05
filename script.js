const entradaQuantidadeVariaveis = document.getElementById("quantidadeVariaveis");
const entradaQuantidadeRestricoes = document.getElementById("quantidadeRestricoes");
const seletorTipoProblema = document.getElementById("tipoProblema");
const containerObjetivo = document.getElementById("containerObjetivo");
const containerRestricoes = document.getElementById("containerRestricoes");
const containerResultado = document.getElementById("resultado");
const containerResumoProblema = document.getElementById("resumoProblema");
const containerTabelaSimplex = document.getElementById("tabelaSimplex");
const containerTabelaVerticesGrafico = document.getElementById("tabelaVerticesGrafico");
const checkboxMetodoGrafico = document.getElementById("metodoGrafico");
const checkboxMetodoSimplex = document.getElementById("metodoSimplex");
const dicaMetodos = document.getElementById("dicaMetodos");
const botaoResolverSelecionados = document.getElementById("resolverSelecionados");
const botaoCarregarExemplo = document.getElementById("carregarExemplo");
const tituloObjetivo = document.getElementById("tituloObjetivo");
const canvasGrafico = document.getElementById("graficoCanvas");
const contexto = canvasGrafico.getContext("2d");

const EPSILON = 1e-8;

const estadoGrafico = {
  data: null,
  view: null,
  dragging: false,
  dragStart: null,
  hoveredPoint: null,
};

document.getElementById("construirFormulario").addEventListener("click", construirFormulario);
botaoResolverSelecionados.addEventListener("click", resolverMetodosSelecionados);
botaoCarregarExemplo.addEventListener("click", carregarDadosExemplo);

[entradaQuantidadeVariaveis, entradaQuantidadeRestricoes, seletorTipoProblema].forEach((el) => {
  el.addEventListener("input", aoAlterarEntradaProblema);
  el.addEventListener("change", aoAlterarEntradaProblema);
});

containerObjetivo.addEventListener("input", aoAlterarEntradaProblema);
containerRestricoes.addEventListener("input", aoAlterarEntradaProblema);
containerRestricoes.addEventListener("change", aoAlterarEntradaProblema);

canvasGrafico.addEventListener("wheel", aoRolarCanvas, { passive: false });
canvasGrafico.addEventListener("mousedown", aoPressionarMouseCanvas);
canvasGrafico.addEventListener("mousemove", aoMoverMouseCanvas);
canvasGrafico.addEventListener("mouseup", aoSoltarMouseCanvas);
canvasGrafico.addEventListener("mouseleave", aoSairMouseCanvas);

construirFormulario();

function construirFormulario() {
  const n = Math.max(2, Number(entradaQuantidadeVariaveis.value));
  const m = Math.max(1, Number(entradaQuantidadeRestricoes.value));
  entradaQuantidadeVariaveis.value = n;
  entradaQuantidadeRestricoes.value = m;

  let objectiveHtml = "<table class='table table-sm align-middle'><thead><tr>";
  for (let i = 0; i < n; i++) {
    objectiveHtml += `<th>${formatarVariavelHtml(i)}</th>`;
  }
  objectiveHtml += "</tr></thead><tbody><tr>";
  for (let i = 0; i < n; i++) {
    objectiveHtml += `<td><input type='number' step='any' class='form-control coeff-input objective-coeff' data-index='${i}' value='1'></td>`;
  }
  objectiveHtml += "</tr></tbody></table>";
  containerObjetivo.innerHTML = objectiveHtml;

  let constraintsHtml = "<table class='table table-sm align-middle'><thead><tr>";
  for (let j = 0; j < n; j++) {
    constraintsHtml += `<th>${formatarVariavelHtml(j)}</th>`;
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
  containerRestricoes.innerHTML = constraintsHtml;

  checkboxMetodoGrafico.checked = true;
  checkboxMetodoSimplex.checked = true;

  resetarSaidas();
  atualizarTituloObjetivo();
  atualizarDisponibilidadeMetodo();
}

function carregarDadosExemplo() {
  entradaQuantidadeVariaveis.value = 2;
  entradaQuantidadeRestricoes.value = 3;
  seletorTipoProblema.value = "max";
  construirFormulario();

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

  atualizarDisponibilidadeMetodo();
  resolverMetodosSelecionados();
}

function aoAlterarEntradaProblema() {
  atualizarTituloObjetivo();
  atualizarDisponibilidadeMetodo();
}

function resetarSaidas() {
  containerResultado.innerHTML = "";
  containerResumoProblema.innerHTML = "";
  containerTabelaSimplex.innerHTML = "";
  containerTabelaVerticesGrafico.innerHTML = "Resolva pelo Método Gráfico para visualizar os valores.";
  estadoGrafico.data = null;
  estadoGrafico.view = null;
  estadoGrafico.hoveredPoint = null;
  limparCanvas();
}

function atualizarTituloObjetivo() {
  const mode = seletorTipoProblema.value;
  tituloObjetivo.textContent = `Função objetivo (${mode === "min" ? "minimizar" : "maximizar"})`;
}

function lerProblema() {
  const n = Number(entradaQuantidadeVariaveis.value);
  const m = Number(entradaQuantidadeRestricoes.value);

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

  return { n, m, mode: seletorTipoProblema.value, objective, constraints };
}

function atualizarDisponibilidadeMetodo() {
  const problem = lerProblema();

  const graphEnabled = problem.n === 2;
  const simplexPrepared = normalizarParaSimplex(problem.constraints, problem.n);
  const simplexEnabled = simplexPrepared.ok;

  checkboxMetodoGrafico.disabled = !graphEnabled;
  checkboxMetodoSimplex.disabled = !simplexEnabled;

  if (!graphEnabled) checkboxMetodoGrafico.checked = false;
  if (!simplexEnabled) checkboxMetodoSimplex.checked = false;

  if (graphEnabled && simplexEnabled) {
    dicaMetodos.textContent = "Você pode resolver com um método ou os dois ao mesmo tempo.";
  } else {
    const reasons = [];
    if (!graphEnabled) reasons.push("Método Gráfico: exige exatamente 2 variáveis.");
    if (!simplexEnabled) reasons.push(`Simplex: ${simplexPrepared.error}`);
    dicaMetodos.textContent = reasons.join(" ");
  }
}

function resolverMetodosSelecionados() {
  const problem = lerProblema();
  atualizarDisponibilidadeMetodo();

  const useGraph = checkboxMetodoGrafico.checked && !checkboxMetodoGrafico.disabled;
  const useSimplex = checkboxMetodoSimplex.checked && !checkboxMetodoSimplex.disabled;

  containerTabelaSimplex.innerHTML = "";
  renderizarResumoProblema(problem);

  if (!useGraph && !useSimplex) {
    limparCanvas();
    definirMensagensResultado([
      { message: "Selecione ao menos um método disponível para resolver.", type: "warning" },
    ]);
    return;
  }

  const messages = [];

  if (useGraph) {
    const graphResult = resolverGrafico(problem);
    messages.push({ message: graphResult.message, type: graphResult.type });
  } else {
    estadoGrafico.data = null;
    estadoGrafico.view = null;
    limparCanvas();
    containerTabelaVerticesGrafico.innerHTML = "Método Gráfico desativado.";
  }

  if (useSimplex) {
    const simplexResult = resolverSimplex(problem);
    messages.push({ message: simplexResult.message, type: simplexResult.type });
  } else {
    containerTabelaSimplex.innerHTML = "";
  }

  definirMensagensResultado(messages);
}

function renderizarResumoProblema(problem) {
  const modeLabel = problem.mode === "min" ? "Minimização" : "Maximização";
  const objectiveLabel =
    problem.objective
      .map((coef, i) => `${formatarNumero(coef)}${formatarVariavelTexto(i)}`)
      .join(" + ") || "0";

  const constraintsLabel = problem.constraints
    .map((c) => {
      const expr = c.coeffs.map((coef, i) => `${formatarNumero(coef)}${formatarVariavelTexto(i)}`).join(" + ");
      return `<li>${expr} ${sinalParaHtml(c.sign)} ${formatarNumero(c.rhs)}</li>`;
    })
    .join("");

  containerResumoProblema.innerHTML = `
    <div class='alert alert-light border mb-3'>
      <strong>Tipo do problema:</strong> ${modeLabel}<br>
      <strong>Função objetivo:</strong> ${problem.mode === "min" ? "Min Z =" : "Max Z ="} ${objectiveLabel}<br>
      <strong>Resumo das restrições:</strong>
      <ul class='mb-0 mt-1'>${constraintsLabel}</ul>
    </div>
  `;
}

function resolverGrafico(problem) {
  const graphConstraints = [
    ...problem.constraints,
    { coeffs: [1, 0], sign: ">=", rhs: 0 },
    { coeffs: [0, 1], sign: ">=", rhs: 0 },
  ];

  const points = coletarPontosCandidatos(graphConstraints);
  const feasible = points.filter((p) => eViavel(p, graphConstraints));
  const intersections = coletarIntersecoes(graphConstraints);

  if (!feasible.length) {
    desenharGrafico(construirLinhasFronteira(graphConstraints), [], [], null, intersections);
    containerTabelaVerticesGrafico.innerHTML = "Não há vértices viáveis para exibir.";
    return {
      type: "danger",
      message: "Método Gráfico: não foi encontrada região viável para as restrições informadas.",
    };
  }

  let best = null;
  feasible.forEach((p) => {
    const value = problem.objective[0] * p.x + problem.objective[1] * p.y;
    const improve = problem.mode === "min" ? value < best?.value - EPSILON : value > (best?.value ?? -Infinity) + EPSILON;
    if (!best || improve) {
      best = { ...p, value };
    }
  });

  const hull = envoltoriaConvexa(feasible);
  const lines = construirLinhasFronteira(graphConstraints);
  desenharGrafico(lines, hull, feasible, best, intersections);
  renderizarTabelaVertices(hull, problem.objective, best);

  const verticesHtml = hull.map((p) => `(${p.x.toFixed(3)}, ${p.y.toFixed(3)})`).join(", ");
  return {
    type: "success",
    message: `Método Gráfico: solução ótima ${formatarVariavelTexto(0)}=${best.x.toFixed(4)}, ${formatarVariavelTexto(
      1
    )}=${best.y.toFixed(4)}, Z=${best.value.toFixed(4)}.<br>Vértices viáveis: ${verticesHtml || "-"}`,
  };
}

function resolverSimplex(problem) {
  const prepared = normalizarParaSimplex(problem.constraints, problem.n);
  if (!prepared.ok) {
    return { type: "danger", message: `Simplex: ${prepared.error}` };
  }

  const simplexObjective = problem.mode === "min" ? problem.objective.map((v) => -v) : problem.objective.slice();
  const simplex = executarSimplex(simplexObjective, prepared.constraints);
  if (!simplex.ok) {
    return { type: "danger", message: `Simplex: ${simplex.error}` };
  }

  const realValue = problem.mode === "min" ? -simplex.value : simplex.value;
  const solutionHtml = simplex.solution
    .map((v, i) => `${formatarVariavelTexto(i)}=${v.toFixed(4)}`)
    .join(", ");

  renderizarTabelaSimplex(simplex.steps, problem.n, prepared.constraints.length, simplex.solution, realValue);

  return {
    type: "success",
    message: `Simplex: solução ótima ${solutionHtml}, Z=${realValue.toFixed(4)}.`,
  };
}

function normalizarParaSimplex(constraints, n) {
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

function executarSimplex(objective, constraints) {
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
      tableau: clonarTableau(tableau),
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
    const pivotCol = escolherColunaPivo(tableau[m]);
    if (pivotCol === -1) break;

    const pivotRow = escolherLinhaPivo(tableau, pivotCol, m, cols - 1);
    if (pivotRow === -1) {
      return { ok: false, error: "problema ilimitado (unbounded)." };
    }

    const entering = pivotCol < n ? formatarVariavelTexto(pivotCol) : `s${pivotCol - n + 1}`;
    const leaving = `R${pivotRow + 1}`;

    pivot(tableau, pivotRow, pivotCol);

    steps.push({
      label: `Etapa ${steps.length}`,
      tableau: clonarTableau(tableau),
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
    const basicRow = obterLinhaBasica(tableau, j, m);
    if (basicRow !== -1) {
      solution[j] = tableau[basicRow][cols - 1];
    }
  }

  return { ok: true, solution, value: tableau[m][cols - 1], tableau, steps };
}

function escolherColunaPivo(objectiveRow) {
  let min = 0;
  let index = -1;
  for (let j = 0; j < objectiveRow.length - 1; j++) {
    if (objectiveRow[j] < min - EPSILON) {
      min = objectiveRow[j];
      index = j;
    }
  }
  return index;
}

function escolherLinhaPivo(tableau, pivotCol, m, rhsCol) {
  let row = -1;
  let bestRatio = Number.POSITIVE_INFINITY;
  for (let i = 0; i < m; i++) {
    const value = tableau[i][pivotCol];
    if (value > EPSILON) {
      const ratio = tableau[i][rhsCol] / value;
      if (ratio < bestRatio - EPSILON) {
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
    if (Math.abs(factor) < EPSILON) continue;
    for (let j = 0; j < cols; j++) {
      tableau[i][j] -= factor * tableau[pivotRow][j];
    }
  }
}

function obterLinhaBasica(tableau, column, m) {
  let oneRow = -1;
  for (let i = 0; i < m; i++) {
    const val = tableau[i][column];
    if (Math.abs(val - 1) < EPSILON) {
      if (oneRow !== -1) return -1;
      oneRow = i;
    } else if (Math.abs(val) > EPSILON) {
      return -1;
    }
  }
  return oneRow;
}

function renderizarTabelaSimplex(steps, n, m, solution, value) {
  const header = [
    ...Array.from({ length: n }, (_, i) => formatarVariavelHtml(i)),
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
                isFinalZCell ? "final-resultado-cell" : "",
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

  const finalVars = solution.map((v, i) => `${formatarVariavelTexto(i)}=${v.toFixed(4)}`).join(", ");
  containerTabelaSimplex.innerHTML = `
    <h3 class='h6'>Evolução do Simplex</h3>
    ${stepsHtml}
    <div class='alert alert-success mb-0'>
      <strong>Resultado final:</strong> ${finalVars} | <strong>Z=${value.toFixed(4)}</strong>
    </div>
  `;
}

function clonarTableau(tableau) {
  return tableau.map((row) => row.slice());
}

function coletarPontosCandidatos(constraints) {
  const points = [{ x: 0, y: 0 }];

  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      const p = intersecao(constraints[i], constraints[j]);
      if (p) points.push(p);
    }
  }

  constraints.forEach((c) => {
    const [a, b] = c.coeffs;
    if (Math.abs(a) > EPSILON) points.push({ x: c.rhs / a, y: 0 });
    if (Math.abs(b) > EPSILON) points.push({ x: 0, y: c.rhs / b });
  });

  return pontosUnicos(points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
}

function coletarIntersecoes(constraints) {
  const points = [];
  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      const p = intersecao(constraints[i], constraints[j]);
      if (p && p.x >= -EPSILON && p.y >= -EPSILON) {
        points.push({ x: Math.max(0, p.x), y: Math.max(0, p.y) });
      }
    }
  }
  return pontosUnicos(points);
}

function intersecao(c1, c2) {
  const [a1, b1] = c1.coeffs;
  const [a2, b2] = c2.coeffs;
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < EPSILON) return null;

  const x = (c1.rhs * b2 - c2.rhs * b1) / det;
  const y = (a1 * c2.rhs - a2 * c1.rhs) / det;
  return { x, y };
}

function eViavel(point, constraints) {
  return constraints.every((c) => {
    const value = c.coeffs[0] * point.x + c.coeffs[1] * point.y;
    if (c.sign === "<=") return value <= c.rhs + EPSILON;
    if (c.sign === ">=") return value >= c.rhs - EPSILON;
    return Math.abs(value - c.rhs) <= EPSILON;
  });
}

function pontosUnicos(points) {
  const unique = [];
  points.forEach((p) => {
    if (!unique.some((u) => Math.abs(u.x - p.x) < 1e-6 && Math.abs(u.y - p.y) < 1e-6)) {
      unique.push(p);
    }
  });
  return unique;
}

function envoltoriaConvexa(points) {
  if (points.length <= 1) return points.slice();

  const sorted = points.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= EPSILON) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= EPSILON) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function construirLinhasFronteira(constraints) {
  return constraints.map((c) => ({ coeffs: c.coeffs, rhs: c.rhs }));
}

function desenharGrafico(lines, hull, feasible, best, intersections) {
  const bounds = calcularLimites(lines, feasible, best, intersections);

  estadoGrafico.data = { lines, hull, feasible, best, intersections, bounds };
  estadoGrafico.view = { ...bounds };
  estadoGrafico.hoveredPoint = null;

  desenharGraficoDoEstado();
}

function calcularLimites(lines, feasible, best, intersections) {
  let maxX = 10;
  let maxY = 10;

  lines.forEach((line) => {
    const [a, b] = line.coeffs;
    if (Math.abs(a) > EPSILON) maxX = Math.max(maxX, Math.abs(line.rhs / a));
    if (Math.abs(b) > EPSILON) maxY = Math.max(maxY, Math.abs(line.rhs / b));
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

function desenharGraficoDoEstado() {
  limparCanvas();
  if (!estadoGrafico.data || !estadoGrafico.view) return;

  const { lines, hull, feasible, best, intersections } = estadoGrafico.data;
  const pad = 55;
  const w = canvasGrafico.width;
  const h = canvasGrafico.height;

  const toCanvas = (x, y) => {
    const { minX, maxX, minY, maxY } = estadoGrafico.view;
    const px = pad + ((x - minX) / (maxX - minX)) * (w - 2 * pad);
    const py = h - pad - ((y - minY) / (maxY - minY)) * (h - 2 * pad);
    return { px, py };
  };

  desenharEixos(toCanvas, pad, w, h);

  const colors = ["#0d6efd", "#198754", "#dc3545", "#fd7e14", "#6f42c1", "#20c997"];
  lines.forEach((line, idx) => {
    const [a, b] = line.coeffs;
    const color = colors[idx % colors.length];

    let p1;
    let p2;
    const { minX, maxX, minY, maxY } = estadoGrafico.view;

    if (Math.abs(b) > EPSILON) {
      p1 = { x: minX, y: (line.rhs - a * minX) / b };
      p2 = { x: maxX, y: (line.rhs - a * maxX) / b };
    } else if (Math.abs(a) > EPSILON) {
      p1 = { x: line.rhs / a, y: minY };
      p2 = { x: line.rhs / a, y: maxY };
    } else {
      return;
    }

    const c1 = toCanvas(p1.x, p1.y);
    const c2 = toCanvas(p2.x, p2.y);

    contexto.strokeStyle = color;
    contexto.lineWidth = 1.5;
    contexto.beginPath();
    contexto.moveTo(c1.px, c1.py);
    contexto.lineTo(c2.px, c2.py);
    contexto.stroke();
  });

  if (hull.length >= 3) {
    contexto.fillStyle = "rgba(13, 110, 253, 0.15)";
    contexto.beginPath();
    hull.forEach((p, i) => {
      const c = toCanvas(p.x, p.y);
      if (i === 0) contexto.moveTo(c.px, c.py);
      else contexto.lineTo(c.px, c.py);
    });
    contexto.closePath();
    contexto.fill();
  }

  intersections.forEach((p) => desenharPontoComRotulo(p, toCanvas, "#6c757d", 3, true));
  feasible.forEach((p) => desenharPontoComRotulo(p, toCanvas, "#0d6efd", 4, false));

  if (best) {
    desenharPontoComRotulo(
      best,
      toCanvas,
      "#dc3545",
      6,
      true,
      `Ótimo Z=${best.value.toFixed(2)}`,
      { x: 10, y: -14 }
    );
  }

  if (estadoGrafico.hoveredPoint) {
    const c = toCanvas(estadoGrafico.hoveredPoint.x, estadoGrafico.hoveredPoint.y);
    contexto.fillStyle = "#212529";
    contexto.fillText(`(${estadoGrafico.hoveredPoint.x.toFixed(3)}, ${estadoGrafico.hoveredPoint.y.toFixed(3)})`, c.px + 8, c.py - 12);
  }
}

function desenharEixos(toCanvas, pad, w, h) {
  const { minX, maxX, minY, maxY } = estadoGrafico.view;

  const axisX = minY <= 0 && maxY >= 0 ? toCanvas(0, 0).py : h - pad;
  const axisY = minX <= 0 && maxX >= 0 ? toCanvas(0, 0).px : pad;

  const xStep = calcularPassoGrade((maxX - minX) / 8);
  const yStep = calcularPassoGrade((maxY - minY) / 8);

  contexto.strokeStyle = "#e9ecef";
  contexto.fillStyle = "#6c757d";
  contexto.lineWidth = 1;

  for (let x = Math.ceil(minX / xStep) * xStep; x <= maxX + EPSILON; x += xStep) {
    const p = toCanvas(x, minY);
    contexto.beginPath();
    contexto.moveTo(p.px, pad);
    contexto.lineTo(p.px, h - pad);
    contexto.stroke();

    contexto.fillStyle = "#6c757d";
    contexto.fillText(x.toFixed(2), p.px - 10, axisX + 16);
  }

  for (let y = Math.ceil(minY / yStep) * yStep; y <= maxY + EPSILON; y += yStep) {
    const p = toCanvas(minX, y);
    contexto.beginPath();
    contexto.moveTo(pad, p.py);
    contexto.lineTo(w - pad, p.py);
    contexto.stroke();

    contexto.fillStyle = "#6c757d";
    contexto.fillText(y.toFixed(2), axisY - 35, p.py + 4);
  }

  contexto.strokeStyle = "#343a40";
  contexto.lineWidth = 1.5;
  contexto.beginPath();
  contexto.moveTo(pad, axisX);
  contexto.lineTo(w - pad, axisX);
  contexto.moveTo(axisY, h - pad);
  contexto.lineTo(axisY, pad);
  contexto.stroke();

  contexto.fillStyle = "#212529";
  contexto.fillText(formatarVariavelTexto(0), w - pad + 8, axisX + 4);
  contexto.fillText(formatarVariavelTexto(1), axisY - 8, pad - 8);
}

function desenharPontoComRotulo(
  point,
  toCanvas,
  color,
  radius,
  showCoords,
  customLabel = null,
  labelOffset = { x: 6, y: -6 }
) {
  const c = toCanvas(point.x, point.y);
  contexto.fillStyle = color;
  contexto.beginPath();
  contexto.arc(c.px, c.py, radius, 0, Math.PI * 2);
  contexto.fill();

  if (showCoords) {
    contexto.fillStyle = "#212529";
    contexto.fillText(
      customLabel || `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`,
      c.px + labelOffset.x,
      c.py + labelOffset.y
    );
  }
}

function aoRolarCanvas(event) {
  if (!estadoGrafico.data || !estadoGrafico.view) return;
  event.preventDefault();

  const zoomFactor = event.deltaY < 0 ? 0.9 : 1.1;
  const mouse = pontoCanvasParaLogico(event.offsetX, event.offsetY);
  const { minX, maxX, minY, maxY } = estadoGrafico.view;

  estadoGrafico.view = {
    minX: mouse.x - (mouse.x - minX) * zoomFactor,
    maxX: mouse.x + (maxX - mouse.x) * zoomFactor,
    minY: mouse.y - (mouse.y - minY) * zoomFactor,
    maxY: mouse.y + (maxY - mouse.y) * zoomFactor,
  };

  limitarVisualizacaoGrafico();
  desenharGraficoDoEstado();
}

function aoPressionarMouseCanvas(event) {
  if (!estadoGrafico.data || !estadoGrafico.view) return;
  estadoGrafico.dragging = true;
  estadoGrafico.dragStart = {
    x: event.offsetX,
    y: event.offsetY,
    view: { ...estadoGrafico.view },
  };
}

function aoMoverMouseCanvas(event) {
  if (!estadoGrafico.data || !estadoGrafico.view) return;

  if (estadoGrafico.dragging && estadoGrafico.dragStart) {
    const dx = event.offsetX - estadoGrafico.dragStart.x;
    const dy = event.offsetY - estadoGrafico.dragStart.y;

    const { minX, maxX, minY, maxY } = estadoGrafico.dragStart.view;
    const scaleX = (maxX - minX) / (canvasGrafico.width - 110);
    const scaleY = (maxY - minY) / (canvasGrafico.height - 110);

    estadoGrafico.view = {
      minX: minX - dx * scaleX,
      maxX: maxX - dx * scaleX,
      minY: minY + dy * scaleY,
      maxY: maxY + dy * scaleY,
    };
    limitarVisualizacaoGrafico();
    desenharGraficoDoEstado();
    return;
  }

  const points = [...estadoGrafico.data.intersections, ...estadoGrafico.data.feasible, ...(estadoGrafico.data.best ? [estadoGrafico.data.best] : [])];
  estadoGrafico.hoveredPoint = encontrarPontoProximo(event.offsetX, event.offsetY, points);
  desenharGraficoDoEstado();
}

function aoSoltarMouseCanvas() {
  estadoGrafico.dragging = false;
  estadoGrafico.dragStart = null;
}

function aoSairMouseCanvas() {
  estadoGrafico.dragging = false;
  estadoGrafico.dragStart = null;
  estadoGrafico.hoveredPoint = null;
  desenharGraficoDoEstado();
}

function encontrarPontoProximo(px, py, points) {
  let nearest = null;
  let bestDist = Infinity;

  points.forEach((p) => {
    const c = pontoLogicoParaCanvas(p.x, p.y);
    const dist = Math.hypot(c.px - px, c.py - py);
    if (dist < 10 && dist < bestDist) {
      bestDist = dist;
      nearest = p;
    }
  });

  return nearest;
}

function pontoLogicoParaCanvas(x, y) {
  const { minX, maxX, minY, maxY } = estadoGrafico.view;
  const pad = 55;
  const px = pad + ((x - minX) / (maxX - minX)) * (canvasGrafico.width - 2 * pad);
  const py = canvasGrafico.height - pad - ((y - minY) / (maxY - minY)) * (canvasGrafico.height - 2 * pad);
  return { px, py };
}

function pontoCanvasParaLogico(px, py) {
  const { minX, maxX, minY, maxY } = estadoGrafico.view;
  const pad = 55;
  const x = minX + ((px - pad) / (canvasGrafico.width - 2 * pad)) * (maxX - minX);
  const y = minY + ((canvasGrafico.height - pad - py) / (canvasGrafico.height - 2 * pad)) * (maxY - minY);
  return { x, y };
}

function limitarVisualizacaoGrafico() {
  if (!estadoGrafico.data || !estadoGrafico.view) return;
  const bounds = estadoGrafico.data.bounds;

  if (estadoGrafico.view.maxX - estadoGrafico.view.minX < 0.2) {
    const midX = (estadoGrafico.view.maxX + estadoGrafico.view.minX) / 2;
    estadoGrafico.view.minX = midX - 0.1;
    estadoGrafico.view.maxX = midX + 0.1;
  }

  if (estadoGrafico.view.maxY - estadoGrafico.view.minY < 0.2) {
    const midY = (estadoGrafico.view.maxY + estadoGrafico.view.minY) / 2;
    estadoGrafico.view.minY = midY - 0.1;
    estadoGrafico.view.maxY = midY + 0.1;
  }

  if (estadoGrafico.view.minX < -bounds.maxX * 0.25) {
    const shift = -bounds.maxX * 0.25 - estadoGrafico.view.minX;
    estadoGrafico.view.minX += shift;
    estadoGrafico.view.maxX += shift;
  }
  if (estadoGrafico.view.minY < -bounds.maxY * 0.25) {
    const shift = -bounds.maxY * 0.25 - estadoGrafico.view.minY;
    estadoGrafico.view.minY += shift;
    estadoGrafico.view.maxY += shift;
  }
}

function calcularPassoGrade(roughStep) {
  const power = Math.pow(10, Math.floor(Math.log10(roughStep || 1)));
  const fraction = roughStep / power;
  if (fraction <= 1) return 1 * power;
  if (fraction <= 2) return 2 * power;
  if (fraction <= 5) return 5 * power;
  return 10 * power;
}

function limparCanvas() {
  contexto.clearRect(0, 0, canvasGrafico.width, canvasGrafico.height);
}

function definirMensagensResultado(messages) {
  containerResultado.innerHTML = messages
    .map((entry) => `<div class='alert alert-${entry.type} mb-2'>${entry.message}</div>`)
    .join("");
}

function renderizarTabelaVertices(vertices, objective, best) {
  if (!vertices.length) {
    containerTabelaVerticesGrafico.innerHTML = "Não há vértices viáveis para exibir.";
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

  containerTabelaVerticesGrafico.innerHTML = `
    <table class='table table-sm table-bordered align-middle mb-0'>
      <thead>
        <tr>
          <th>${formatarVariavelHtml(0)}</th>
          <th>${formatarVariavelHtml(1)}</th>
          <th>Z</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function sinalParaHtml(sign) {
  if (sign === "<=") return "&le;";
  if (sign === ">=") return "&ge;";
  return "=";
}

function formatarVariavelHtml(index) {
  return `X<sub>${index + 1}</sub>`;
}

function formatarVariavelTexto(index) {
  const subscripts = "₀₁₂₃₄₅₆₇₈₉";
  const digits = String(index + 1)
    .split("")
    .map((digit) => subscripts[Number(digit)] || digit)
    .join("");
  return `X${digits}`;
}

function formatarNumero(value) {
  if (Number.isInteger(value)) return String(value);
  return Number(value).toFixed(2).replace(/\.00$/, "");
}
