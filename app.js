const fechaInput = document.getElementById("fecha");
const inputsNumeros = ["n1", "n2", "n3", "n4", "n5"].map(id => document.getElementById(id));
const superInput = document.getElementById("superbalota");

const guardarBtn = document.getElementById("guardar");
const actualizarOficialBtn = document.getElementById("actualizarOficial");
const generarBtn = document.getElementById("generar");

const mensaje = document.getElementById("mensaje");
const historialDiv = document.getElementById("historial");
const combinacionDiv = document.getElementById("combinacion");

const totalResultados = document.getElementById("totalResultados");
const masFrecuentes = document.getElementById("masFrecuentes");
const menosFrecuentes = document.getElementById("menosFrecuentes");
const superFrecuente = document.getElementById("superFrecuente");
const paresImpares = document.getElementById("paresImpares");
const bajosAltos = document.getElementById("bajosAltos");
const sumaPromedio = document.getElementById("sumaPromedio");

const numeroTop = document.getElementById("numeroTop");
const numeroFrio = document.getElementById("numeroFrio");
const superTop = document.getElementById("superTop");
const graficoFrecuenciaCanvas = document.getElementById("graficoFrecuencia");

let graficoFrecuencia = null;
let resultados = JSON.parse(localStorage.getItem("resultadosBaloto")) || [];

fechaInput.value = new Date().toISOString().slice(0, 10);

guardarBtn.addEventListener("click", guardarResultado);
generarBtn.addEventListener("click", generarCombinacion);
actualizarOficialBtn.addEventListener("click", actualizarDesdeBaloto);

actualizarApp();

function guardarResultado() {
  const fecha = fechaInput.value;
  const numeros = inputsNumeros.map(input => Number(input.value));
  const superbalota = Number(superInput.value);

  if (!fecha || numeros.some(n => !n) || !superbalota) {
    mostrarMensaje("Completa todos los campos.", "error");
    return;
  }

  if (numeros.some(n => n < 1 || n > 43)) {
    mostrarMensaje("Los números deben estar entre 1 y 43.", "error");
    return;
  }

  if (superbalota < 1 || superbalota > 16) {
    mostrarMensaje("La superbalota debe estar entre 1 y 16.", "error");
    return;
  }

  if (new Set(numeros).size !== numeros.length) {
    mostrarMensaje("No repitas números principales.", "error");
    return;
  }

  numeros.sort((a, b) => a - b);
  resultados.unshift({ fecha, numeros, superbalota });

  guardarDatos();
  limpiarFormulario();
  mostrarMensaje("Resultado guardado correctamente.", "ok");
  actualizarApp();
}

async function actualizarDesdeBaloto() {
  try {
    mostrarMensaje("Consultando Baloto oficial...", "ok");

    const response = await fetch("/.netlify/functions/resultados");
    const data = await response.json();

    if (!data.resultados || data.resultados.length === 0) {
      mostrarMensaje("No se encontraron resultados oficiales.", "error");
      return;
    }

    let nuevos = 0;

    data.resultados.forEach(item => {
      const existe = resultados.some(r =>
        r.fecha === item.fecha &&
        r.numeros.join("-") === item.numeros.join("-") &&
        r.superbalota === item.superbalota
      );

      if (!existe) {
        resultados.unshift(item);
        nuevos++;
      }
    });

    guardarDatos();
    actualizarApp();

    mostrarMensaje(`Actualización lista. Nuevos resultados: ${nuevos}`, "ok");

  } catch (error) {
    console.error(error);
    mostrarMensaje("No se pudo conectar con Baloto oficial.", "error");
  }
}

function actualizarApp() {
  mostrarHistorial();
  calcularEstadisticas();
}

function mostrarHistorial() {
  if (resultados.length === 0) {
    historialDiv.innerHTML = "<p>No hay resultados guardados.</p>";
    return;
  }

  historialDiv.innerHTML = resultados.slice(0, 30).map(r => `
    <div class="resultado">
      <strong>${r.fecha}</strong><br>
      Números: ${r.numeros.join(" - ")}<br>
      Superbalota: ${r.superbalota}
    </div>
  `).join("");
}

function calcularEstadisticas() {
  if (resultados.length === 0) {
    totalResultados.textContent = 0;
    masFrecuentes.textContent = "Sin datos";
    menosFrecuentes.textContent = "Sin datos";
    superFrecuente.textContent = "Sin datos";
    paresImpares.textContent = "Sin datos";
    bajosAltos.textContent = "Sin datos";
    sumaPromedio.textContent = "Sin datos";
    numeroTop.textContent = "--";
    numeroFrio.textContent = "--";
    superTop.textContent = "--";
    dibujarGraficoFrecuencia(crearConteo(1, 43));
    return;
  }

  totalResultados.textContent = resultados.length;

  const conteo = crearConteo(1, 43);
  const conteoSuper = crearConteo(1, 16);

  let totalPares = 0;
  let totalImpares = 0;
  let totalBajos = 0;
  let totalAltos = 0;
  let sumaTotal = 0;

  resultados.forEach(r => {
    r.numeros.forEach(n => {
      conteo[n]++;

      if (n % 2 === 0) totalPares++;
      else totalImpares++;

      if (n <= 21) totalBajos++;
      else totalAltos++;
    });

    conteoSuper[r.superbalota]++;
    sumaTotal += r.numeros.reduce((a, b) => a + b, 0);
  });

  const top = obtenerTop(conteo, "desc");
  const frio = obtenerTop(conteo, "asc");
  const topSuper = obtenerTop(conteoSuper, "desc");

  masFrecuentes.textContent = topNumeros(conteo, 5, "desc");
  menosFrecuentes.textContent = topNumeros(conteo, 5, "asc");
  superFrecuente.textContent = topNumeros(conteoSuper, 3, "desc");
  paresImpares.textContent = `${totalPares} pares / ${totalImpares} impares`;
  bajosAltos.textContent = `${totalBajos} bajos / ${totalAltos} altos`;
  sumaPromedio.textContent = Math.round(sumaTotal / resultados.length);

  numeroTop.textContent = `${top.numero} (${top.veces})`;
  numeroFrio.textContent = `${frio.numero} (${frio.veces})`;
  superTop.textContent = `${topSuper.numero} (${topSuper.veces})`;

  dibujarGraficoFrecuencia(conteo);
}

function dibujarGraficoFrecuencia(conteo) {
  if (!graficoFrecuenciaCanvas) return;

  const labels = Object.keys(conteo);
  const datos = Object.values(conteo);

  if (graficoFrecuencia) {
    graficoFrecuencia.destroy();
  }

  graficoFrecuencia = new Chart(graficoFrecuenciaCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Frecuencia",
        data: datos,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: "Frecuencia de números principales"
        }
      },
      scales: {
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 90,
            minRotation: 90
          }
        },
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function generarCombinacion() {
  let numeros = [];

  if (resultados.length >= 3) {
    const conteo = crearConteo(1, 43);

    resultados.forEach(r => {
      r.numeros.forEach(n => conteo[n]++);
    });

    const ordenados = Object.entries(conteo)
      .sort((a, b) => b[1] - a[1])
      .map(item => Number(item[0]));

    while (numeros.length < 3) {
      const candidato = ordenados[Math.floor(Math.random() * 15)];
      if (!numeros.includes(candidato)) numeros.push(candidato);
    }
  }

  while (numeros.length < 5) {
    const n = numeroAleatorio(1, 43);
    if (!numeros.includes(n)) numeros.push(n);
  }

  numeros.sort((a, b) => a - b);
  const superbalota = numeroAleatorio(1, 16);

  combinacionDiv.innerHTML = `
    ${numeros.map(n => `<span class="ball">${n}</span>`).join("")}
    <span class="ball super">${superbalota}</span>
  `;
}

function crearConteo(inicio, fin) {
  const conteo = {};
  for (let i = inicio; i <= fin; i++) {
    conteo[i] = 0;
  }
  return conteo;
}

function obtenerTop(conteo, orden) {
  const item = Object.entries(conteo)
    .sort((a, b) => orden === "desc" ? b[1] - a[1] : a[1] - b[1])[0];

  return {
    numero: item[0],
    veces: item[1]
  };
}

function topNumeros(conteo, cantidad, orden) {
  return Object.entries(conteo)
    .sort((a, b) => orden === "desc" ? b[1] - a[1] : a[1] - b[1])
    .slice(0, cantidad)
    .map(([numero, veces]) => `${numero} (${veces})`)
    .join(", ");
}

function numeroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function guardarDatos() {
  localStorage.setItem("resultadosBaloto", JSON.stringify(resultados));
}

function limpiarFormulario() {
  inputsNumeros.forEach(input => input.value = "");
  superInput.value = "";
}

function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.style.color = tipo === "ok" ? "green" : "red";

  setTimeout(() => {
    mensaje.textContent = "";
  }, 4000);
}