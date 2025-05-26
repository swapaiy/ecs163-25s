
// main SVG and  canvas dimensions
const svg = d3.select("svg");
const width = window.innerWidth;
const height = window.innerHeight;

// margins and inner dimensions 
const margin = { top: 40, right: 30, bottom: 50, left: 60 };
const innerWidth = 400 - margin.left - margin.right;
const innerHeight = 350 - margin.top - margin.bottom;

//position offsets for each view
let view1Left = 0, view1Top = 0;
let view2Left = 450, view2Top = 0;
let view3Left = 0, view3Top = 420;

//color scale for genres
const genreColor = d3.scaleOrdinal(d3.schemeCategory10);
// Sequential color scale for mental health line encoding
const healthColor = d3.scaleSequential(d3.interpolatePurples).domain([0, 10]);

//load and parse dataset and initialize views
function loadData() {
  d3.csv("data.csv").then(data => {
    data.forEach(d => {
      d["Hours per day"] = +d["Hours per day"];
      d.Anxiety = +d.Anxiety;
      d.Depression = +d.Depression;
      d.Insomnia = +d.Insomnia;
    });
    drawBarChart(data);  //overviewchart
    drawHistogram(data);        //interaction
    drawParallelCoordinates(data); //advanced view with pan and zoom
  });
}

// bar chart
function drawBarChart(data) {
  const g = svg.append("g")
    .attr("transform", `translate(${view1Left + margin.left}, ${view1Top + margin.top})`);

  const counts = d3.rollup(data, v => v.length, d => d["Fav genre"]);
  const bars = Array.from(counts, ([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count).slice(0, 6);
  genreColor.domain(bars.map(d => d.genre));

  const x = d3.scaleBand().domain(bars.map(d => d.genre)).range([0, innerWidth]).padding(0.2);
  const y = d3.scaleLinear().domain([0, d3.max(bars, d => d.count)]).range([innerHeight, 0]);

  //axes
  g.append("g").attr("transform", `translate(0, ${innerHeight})`).call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y));
  g.append("text").attr("x", innerWidth / 2).attr("y", -10).attr("text-anchor", "middle").attr("font-size", "14px").text("Top Genres");

  //click selection interaction
  g.selectAll("rect")
    .data(bars).enter().append("rect")
    .attr("x", d => x(d.genre))
    .attr("width", x.bandwidth())
    .attr("y", innerHeight)
    .attr("height", 0)
    .attr("fill", d => genreColor(d.genre))
    .transition().duration(1000).ease(d3.easeCubicOut)
    .attr("y", d => y(d.count))
    .attr("height", d => innerHeight - y(d.count));

  g.selectAll("rect")
    .on("click", (event, d) => updateParallel(d.genre, null, null))
    .style("cursor", "pointer");
}

// Histogram 
function drawHistogram(data) {
  const g = svg.append("g")
    .attr("transform", `translate(${view2Left + margin.left}, ${view2Top + margin.top})`);

  const x = d3.scaleLinear().domain([0, d3.max(data, d => d["Hours per day"])]).range([0, innerWidth]);
  const histogram = d3.histogram().domain(x.domain()).thresholds(x.ticks(15));
  const bins = histogram(data.map(d => d["Hours per day"]));
  const y = d3.scaleLinear().domain([0, d3.max(bins, d => d.length)]).range([innerHeight, 0]);

  // Axes and label
  g.append("g").attr("transform", `translate(0, ${innerHeight})`).call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y));
  g.append("text").attr("x", innerWidth / 2).attr("y", -10).attr("text-anchor", "middle").attr("font-size", "14px").text("Listening Hours (Brush to Filter)");

  //animationnbars
  g.selectAll("rect")
    .data(bins).enter().append("rect")
    .attr("x", d => x(d.x0))
    .attr("width", d => x(d.x1) - x(d.x0) - 1)
    .attr("y", innerHeight)
    .attr("height", 0)
    .attr("fill", "#ff8c69")
    .transition().duration(800).ease(d3.easeCubicOut)
    .attr("y", d => y(d.length))
    .attr("height", d => innerHeight - y(d.length));

  //brishing
  const brush = d3.brushX().extent([[0, 0], [innerWidth, innerHeight]])
    .on("brush end", function (event) {
      if (event.selection) {
        const [x0, x1] = event.selection.map(x.invert);
        updateParallel(null, x0, x1);
      }
    });
  g.append("g").call(brush);
}

// Parallel Coordinates View (Advanced)
function drawParallelCoordinates(data) {
  const dimensions = ["Anxiety", "Depression", "Insomnia"];
  const yScales = {};
  dimensions.forEach(dim => {
    yScales[dim] = d3.scaleLinear().domain([0, 10]).range([innerHeight, 0]);
  });

  const x = d3.scalePoint().domain(dimensions).range([0, innerWidth]).padding(1);

  const group = svg.append("g")
    .attr("transform", `translate(${view3Left + margin.left}, ${view3Top + margin.top})`);

  const container = group.append("g").attr("class", "parallel-container");

  svg.call(d3.zoom().scaleExtent([1, 5]).on("zoom", event => {
    container.attr("transform", event.transform);
  }));

  // Draw axes and labels
  dimensions.forEach(dim => {
    const axisGroup = container.append("g")
      .attr("transform", `translate(${x(dim)}, 0)`);
    axisGroup.call(d3.axisLeft(yScales[dim]));
    axisGroup.append("text")
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .text(dim);
  });

  container.append("text")
    .attr("x", innerWidth / 2).attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .text("Mental Health Indicators");

  const line = d3.line()
    .curve(d3.curveMonotoneX)
    .x(d => x(d.dimension))
    .y(d => yScales[d.dimension](d.value));

  const pathData = data.map(d => dimensions.map(dim => ({ dimension: dim, value: d[dim] })));

  container.selectAll("path")
    .data(pathData)
    .enter()
    .append("path")
    .attr("fill", "none")
    .attr("stroke", d => healthColor((d[0].value + d[1].value + d[2].value) / 3))
    .attr("stroke-width", 1.5)
    .attr("d", d => line(d))
    .style("opacity", 0)
    .transition()
    .duration(600)
    .ease(d3.easeCubicOut)
    .style("opacity", 0.7);
}

// Run visualization
loadData();