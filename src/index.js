import './scss/styles.scss';
import { diferir, limpiarDatos } from './utilidades/ayudas';
import { csv as fetchCSV } from 'd3-fetch';
import { scaleLinear, scaleTime } from 'd3-scale';
import { select } from 'd3-selection';
import { axisBottom, axisLeft } from 'd3-axis';
import { area, line } from 'd3-shape';
import { brushX } from 'd3-brush';
import { max } from 'd3-array';

const registroSemanal = [];
let muertesEstimado = [];
let muertesPrediccion = [];
let casosComprobados = [];
let casosPreliminares = [];
let fechaInicial;
let fechaFinal;
let ejeX;
let ejeY;

const muertesBtn = document.getElementById('muertes');
const dims = { superior: 100, derecha: 30, inferior: 150, izquierda: 60 };
dims.margenHorizontal = dims.derecha + dims.izquierda;
dims.margenVertical = dims.superior + dims.inferior;

const contenedorGrafica = document.getElementById('grafica');
const svg = select(contenedorGrafica).append('svg');
const grafica = svg.append('g');
const indicadorX = grafica.append('g');
const indicadorY = grafica.append('g');
const lineaIndicador = grafica.append('path').attr('fill', 'none').attr('stroke', 'red').attr('stroke-width', 1.5);

const rojoClaro = '#d6a09f';
const rojoMenosClaro = '#cc8785';
const rojoOscuro = '#c57876';

function actualizarDimensiones() {
  dims.ancho = contenedorGrafica.scrollWidth - dims.margenHorizontal;
  dims.alto = contenedorGrafica.scrollHeight - dims.margenVertical;

  svg.attr('width', dims.ancho + dims.margenHorizontal).attr('height', dims.alto + dims.margenVertical);
  grafica.attr('transform', `translate(${dims.izquierda},${dims.superior})`);
  indicadorX.attr('transform', `translate(0, ${dims.alto})`);

  console.log(dims);
}

function actualizarEjeX(dominio) {
  ejeX = scaleTime().domain(dominio).range([0, dims.ancho]);
  indicadorX.transition().duration(500).call(axisBottom(ejeX));
}

function actualizarEjeY(dominio) {
  ejeY = scaleLinear().domain(dominio).range([dims.alto, 0]);

  indicadorY.transition().duration(500).call(axisLeft(ejeY));
}

async function inicio() {
  const datosMuertes = await fetchCSV('/datos/deaths_df.csv');
  const datosCasos = await fetchCSV('/datos/cases.csv');
  const muertes = limpiarDatos(datosMuertes);
  const casos = limpiarDatos(datosCasos);

  let contador = 0;
  let contadorCasos = 0;
  let contadorMuertes = 0;
  let fechaInicio = casos[0].date;

  for (let i = 0; i < casos.length; i++) {
    const dia = casos[i];
    if (contador === 6) {
      registroSemanal.push({
        fechaInicial: fechaInicio,
        fechaFinal: dia.date,
        casos: contadorCasos,
        muertes: contadorMuertes,
      });
      contadorCasos = 0;
      contadorMuertes = 0;
      fechaInicio = dia.date;
    } else {
      contadorCasos += dia.num_cases;
      contadorMuertes += dia.num_diseased;
    }

    contador = (contador + 1) % 7;
  }

  muertesEstimado = muertes.filter((caso) => caso.type === 'estimate');
  muertesPrediccion = muertes.filter((caso) => caso.type === 'forecast');
  casosComprobados = casos.filter((caso) => caso.type === 'fitted');
  casosPreliminares = casos.filter((caso) => caso.type === 'preliminary');
  fechaInicial = muertes[0].date;
  fechaFinal = muertes[muertes.length - 1].date;

  actualizarEjeX([fechaInicial, fechaFinal]);
  actualizarEjeY([0, max(registroSemanal.map((obj) => obj.muertes))]);
  dibujar();
}

function dibujar(indicador) {
  indicador = indicador || 'muertes';
  // const clip = grafica
  //   .append('defs')
  //   .append('svg:clipPath')
  //   .attr('id', 'clip')
  //   .append('svg:rect')
  //   .attr('width', width)
  //   .attr('height', height)
  //   .attr('x', 0)
  //   .attr('y', 0);

  // const brush = brushX // Add the brush feature using the d3.brush function
  //   .extent([
  //     [0, 0],
  //     [width, height],
  //   ]) // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
  //   .on('end', updateChart);

  // grafica
  //   .append('path')
  //   .datum(muertesEstimado)
  //   .attr('fill', '#cce5df')
  //   .attr('stroke', 'none')
  //   .attr(
  //     'd',
  //     area()
  //       .x((d) => x(d.date))
  //       .y0((d) => y(d.low_95))
  //       .y1((d) => y(d.high_95))
  //   );

  // grafica
  //   .append('path')
  //   .datum(muertesEstimado)
  //   .attr('fill', 'none')
  //   .attr('stroke', 'steelblue')
  //   .attr('stroke-width', 1.5)
  //   .attr(
  //     'd',
  //     line()
  //       .x((d) => x(d.date))
  //       .y((d) => y(d.median))
  //   );

  /**
   * Linea de muertes
   */

  lineaIndicador
    .datum(registroSemanal)
    .transition()
    .duration(500)
    .attr(
      'd',
      line()
        .x((d) => ejeX(d.fechaInicial))
        .y((d) => ejeY(indicador === 'muertes' ? d.muertes : d.casos))
    );

  // grafica
  //   .selectAll('casos')
  //   .data(casosComprobados)
  //   .enter()
  //   .append('circle')
  //   .attr('class', 'puntoCasoComprobado')
  //   .attr('r', 2)
  //   .attr('cx', (d) => ejeX(d.date))
  //   .attr('cy', (d) => ejeY(d.num_diseased));

  // grafica
  //   .append('path')
  //   .datum(muertesPrediccion)
  //   .attr('fill', rojoClaro)
  //   .attr('stroke', 'none')
  //   .attr(
  //     'd',
  //     area()
  //       .x((d) => x(d.date))
  //       .y0((d) => y(d.low_95))
  //       .y1((d) => y(d.high_95))
  //   );

  // grafica
  //   .append('path')
  //   .datum(muertesPrediccion)
  //   .attr('fill', rojoMenosClaro)
  //   .attr('stroke', 'none')
  //   .attr(
  //     'd',
  //     area()
  //       .x((d) => x(d.date))
  //       .y0((d) => y(d.low_80))
  //       .y1((d) => y(d.high_80))
  //   );

  // grafica
  //   .append('path')
  //   .datum(muertesPrediccion)
  //   .attr('fill', rojoOscuro)
  //   .attr('stroke', 'none')
  //   .attr(
  //     'd',
  //     area()
  //       .x((d) => x(d.date))
  //       .y0((d) => y(d.low_50))
  //       .y1((d) => y(d.high_50))
  //   );

  // grafica
  //   .selectAll('prediccion')
  //   .data(casosPreliminares)
  //   .enter()
  //   .append('circle')
  //   .attr('fill', 'red')
  //   .attr('r', 2)
  //   .attr('cx', (d) => x(d.date))
  //   .attr('cy', (d) => y(d.num_diseased));
}

actualizarDimensiones();
inicio();
let bo = false;

const opcionCasos = document.getElementById('opcionCasos');
const opcionMuertes = document.getElementById('opcionMuertes');
const indicadorBtn = document.getElementById('indicador');

opcionCasos.onclick = () => {
  if (!indicadorBtn.checked) return;
  indicadorBtn.click();
};

opcionMuertes.onclick = () => {
  if (indicadorBtn.checked) return;
  indicadorBtn.click();
};

indicadorBtn.onchange = () => {
  if (bo) {
    actualizarEjeY([0, max(registroSemanal.map((obj) => obj.muertes))]);
    dibujar('muertes');
  } else {
    actualizarEjeY([0, max(registroSemanal.map((obj) => obj.casos))]);
    dibujar('casos');
  }
  bo = !bo;
};

window.addEventListener('resize', diferir(actualizarDimensiones, 150));
