const width = window.innerWidth;
const height = window.innerHeight;


let view1Left = 0, view1Top = 0;
let view2Left = 450, view2Top = 0;
let view3Left = 0, view3Top = 420;

let margin = {top: 30, right: 30, bottom: 60, left: 60},
    innerWidth = 400 - margin.left - margin.right,
    innerHeight = 350 - margin.top - margin.bottom;

const svg = d3.select("svg");

d3.csv("data.csv").then(data => {
  // Convert to numeric values
  data.forEach(d => {
    d["Hours per day"] = +d["Hours per day"];
    d.Anxiety = +d.Anxiety;
    d.Depression = +d.Depression;
    d.Insomnia = +d.Insomnia;
  });

  // bar chart
  const g1 = svg.append("g")
    .attr("transform", `translate(${view1Left + margin.left}, ${view1Top + margin.top})`);

  const genreCounts = d3.rollup(data, v => v.length, d => d["Fav genre"]);
  const barData = Array.from(genreCounts, ([genre, count]) => ({ genre, count }));

  const x1 = d3.scaleBand()
    .domain(barData.map(d => d.genre))
    .range([0, innerWidth])
    .padding(0.2);

  const y1 = d3.scaleLinear()
    .domain([0, d3.max(barData, d => d.count)])
    .range([innerHeight, 0]);

  g1.selectAll("rect")
    .data(barData)
    .enter()
    .append("rect")
    .attr("x", d => x1(d.genre))
    .attr("y", d => y1(d.count))
    .attr("width", x1.bandwidth())
    .attr("height", d => innerHeight - y1(d.count))
    .attr("fill", "#4682b4");

  g1.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(x1))
    .selectAll("text")
    .attr("x", -5)
    .attr("y", 10)
    .attr("transform", "rotate(-40)")
    .style("text-anchor", "end");

  g1.append("g").call(d3.axisLeft(y1));

  g1.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Genre Frequency");

  // histogram
  const g2 = svg.append("g")
    .attr("transform", `translate(${view2Left + margin.left}, ${view2Top + margin.top})`);

  const hoursData = data
    .map(d => d["Hours per day"])
    .filter(d => !isNaN(d));

  const x2 = d3.scaleLinear()
    .domain([0, d3.max(hoursData)])
    .range([0, innerWidth]);

  const histogram = d3.histogram()
    .domain(x2.domain())
    .thresholds(x2.ticks(10));

  const bins = histogram(hoursData);

  const y2 = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)])
    .range([innerHeight, 0]);

  g2.selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", d => x2(d.x0))
    .attr("y", d => y2(d.length))
    .attr("width", d => x2(d.x1) - x2(d.x0) - 1)
    .attr("height", d => innerHeight - y2(d.length))
    .attr("fill", "#ff8c69");

  g2.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(x2));

  g2.append("g").call(d3.axisLeft(y2));

  g2.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Hours Listening Per Day");

  // parallel coordinates
  const g3 = svg.append("g")
    .attr("transform", `translate(${view3Left + margin.left}, ${view3Top + margin.top})`);

  const dimensions = ["Anxiety", "Depression", "Insomnia"];
  const topGenres = Array.from(d3.rollup(data, v => v.length, d => d["Fav genre"]).entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(d => d[0]);

  const color = d3.scaleOrdinal()
    .domain(topGenres)
    .range(d3.schemeCategory10);

  const validData = data.filter(d =>
    topGenres.includes(d["Fav genre"]) &&
    dimensions.every(dim => !isNaN(d[dim]))
  );

  const y = {};
  dimensions.forEach(dim => {
    y[dim] = d3.scaleLinear().domain([0, 10]).range([innerHeight, 0]);
  });

  const x3 = d3.scalePoint()
    .domain(dimensions)
    .range([0, innerWidth])
    .padding(1);

  function line(d) {
    return d3.line()(dimensions.map(p => [x3(p), y[p](d[p])]));
  }

  g3.selectAll("path")
    .data(validData)
    .enter()
    .append("path")
    .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", d => color(d["Fav genre"]))
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.5);

  dimensions.forEach(dim => {
    g3.append("g")
      .attr("transform", `translate(${x3(dim)}, 0)`)
      .call(d3.axisLeft(y[dim]));

    g3.append("text")
      .attr("x", x3(dim))
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text(dim);
  });

  g3.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Parallel Coordinates: Mental Health Scores");
});
