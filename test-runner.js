// Import everything the same way mcp-app.ts does
import Highcharts from "/node_modules/highcharts/es-modules/masters/highcharts.src.js";
import "/node_modules/highcharts/es-modules/masters/highcharts-more.src.js";
import "/node_modules/highcharts/es-modules/masters/highcharts-3d.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/exporting.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/accessibility.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/no-data-to-display.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/stock.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/map.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/gantt.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/heatmap.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/treemap.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/sankey.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/dependency-wheel.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/networkgraph.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/sunburst.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/wordcloud.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/timeline.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/variable-pie.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/variwide.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/xrange.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/dumbbell.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/solid-gauge.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/funnel.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/bullet.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/organization.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/venn.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/tilemap.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/item-series.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/drilldown.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/cylinder.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/coloraxis.src.js";
import "/node_modules/highcharts/es-modules/masters/modules/solid-gauge.src.js";
import Dashboards from "/node_modules/@highcharts/dashboards/es-modules/masters/dashboards.src.js";
import "/node_modules/@highcharts/dashboards/es-modules/masters/modules/layout.src.js";
import GridLite from "/node_modules/@highcharts/grid-lite/es-modules/masters/grid-lite.src.js";

// Connect plugins
Dashboards.HighchartsPlugin.custom.connectHighcharts(Highcharts);
Dashboards.PluginHandler.addPlugin(Dashboards.HighchartsPlugin);
Dashboards.GridPlugin.custom.connectGrid(GridLite);
Dashboards.PluginHandler.addPlugin(Dashboards.GridPlugin);

window.Highcharts = Highcharts;
window.Dashboards = Dashboards;
window.GridLite = GridLite;

const log = (msg) => {
  const el = document.getElementById("log");
  el.textContent += msg + "\n";
  el.scrollTop = el.scrollHeight;
  console.log(msg);
};

log(`✅ Highcharts ${Highcharts.version}`);
log(`✅ Dashboards ${Dashboards.version}`);
log(`✅ mapChart: ${typeof Highcharts.mapChart}`);
log(`✅ stockChart: ${typeof Highcharts.stockChart}`);
log(`✅ ganttChart: ${typeof Highcharts.ganttChart}`);

// ── Test definitions ──────────────────────────────────────────────

const chartTests = [
  { id: "line", name: "Line", opts: { chart: { type: "line" }, title: { text: "Line Chart" }, xAxis: { categories: ["Jan","Feb","Mar","Apr","May","Jun"] }, series: [{ name: "Sales", data: [29,71,106,129,144,176] }] }},
  { id: "area", name: "Area", opts: { chart: { type: "area" }, title: { text: "Area Chart" }, xAxis: { categories: ["Mon","Tue","Wed","Thu","Fri"] }, series: [{ name: "Views", data: [502,635,809,947,1402] }] }},
  { id: "column", name: "Column", opts: { chart: { type: "column" }, title: { text: "Column Chart" }, xAxis: { categories: ["Q1","Q2","Q3","Q4"] }, series: [{ name: "Revenue", data: [49,71,106,129] }] }},
  { id: "bar", name: "Bar", opts: { chart: { type: "bar" }, title: { text: "Bar Chart" }, xAxis: { categories: ["Apples","Oranges","Bananas","Grapes"] }, series: [{ name: "Count", data: [5,3,4,7] }] }},
  { id: "pie", name: "Pie", opts: { chart: { type: "pie" }, title: { text: "Pie Chart" }, series: [{ name: "Share", data: [{ name: "Chrome", y: 63 },{ name: "Safari", y: 19 },{ name: "Firefox", y: 10 },{ name: "Edge", y: 8 }] }] }},
  { id: "scatter", name: "Scatter", opts: { chart: { type: "scatter" }, title: { text: "Scatter Plot" }, xAxis: { title: { text: "Height (cm)" } }, yAxis: { title: { text: "Weight (kg)" } }, series: [{ name: "Male", data: [[174,65],[175,71],[193,80],[186,72],[167,62]] },{ name: "Female", data: [[161,56],[167,59],[159,50],[157,55],[163,58]] }] }},
  { id: "spline", name: "Spline", opts: { chart: { type: "spline" }, title: { text: "Spline Chart" }, xAxis: { categories: ["Jan","Feb","Mar","Apr","May"] }, series: [{ name: "Temp", data: [7,6.9,9.5,14.5,18.2] }] }},
  { id: "areaspline", name: "Area Spline", opts: { chart: { type: "areaspline" }, title: { text: "Area Spline" }, xAxis: { categories: ["Mon","Tue","Wed","Thu","Fri"] }, series: [{ name: "John", data: [3,4,3,5,4] },{ name: "Jane", data: [2,3,2,4,3] }] }},
  { id: "heatmap", name: "Heatmap", opts: { chart: { type: "heatmap" }, title: { text: "Heatmap" }, xAxis: { categories: ["Mon","Tue","Wed","Thu","Fri"] }, yAxis: { categories: ["Morning","Afternoon","Evening"] }, colorAxis: { min: 0, minColor: "#FFFFFF", maxColor: "#FF0000" }, series: [{ name: "Sales", data: [[0,0,10],[0,1,19],[0,2,8],[1,0,92],[1,1,58],[1,2,78],[2,0,35],[2,1,15],[2,2,123],[3,0,72],[3,1,132],[3,2,52],[4,0,38],[4,1,59],[4,2,88]] }] }},
  { id: "treemap", name: "Treemap", opts: { chart: { type: "treemap" }, title: { text: "Treemap" }, series: [{ type: "treemap", layoutAlgorithm: "squarified", data: [{ name: "A", value: 6 },{ name: "B", value: 6 },{ name: "C", value: 4 },{ name: "D", value: 3 },{ name: "E", value: 2 },{ name: "F", value: 2 },{ name: "G", value: 1 }] }] }},
  { id: "waterfall", name: "Waterfall", opts: { chart: { type: "waterfall" }, title: { text: "Waterfall" }, xAxis: { categories: ["Start","Product","Service","Fixed","Variable","Total"] }, series: [{ data: [{ y: 120000 },{ y: 569000 },{ y: 231000 },{ y: -342000, color: "#f44" },{ y: -233000, color: "#f44" },{ isSum: true, color: "#4caf50" }] }] }},
  { id: "gauge", name: "Gauge", opts: { chart: { type: "gauge" }, title: { text: "Speedometer" }, pane: { startAngle: -150, endAngle: 150, background: [{ backgroundColor: "#DDD", borderWidth: 0, outerRadius: "109%" }] }, yAxis: { min: 0, max: 200, title: { text: "km/h" } }, series: [{ name: "Speed", data: [80] }] }},
  { id: "solidgauge", name: "Solid Gauge", opts: { chart: { type: "solidgauge" }, title: { text: "Fuel Level" }, pane: { center: ["50%","85%"], size: "140%", startAngle: -90, endAngle: 90, background: { backgroundColor: "#EEE", innerRadius: "60%", outerRadius: "100%", shape: "arc" } }, yAxis: { min: 0, max: 100, stops: [[0.1,"#55BF3B"],[0.5,"#DDDF0D"],[0.9,"#DF5353"]], lineWidth: 0, tickWidth: 0, minorTickInterval: null, title: { y: -70, text: "Fuel %" } }, series: [{ name: "Fuel", data: [72], innerRadius: "60%", outerRadius: "100%" }] }},
  { id: "bubble", name: "Bubble", opts: { chart: { type: "bubble" }, title: { text: "Bubble Chart" }, series: [{ data: [[9,81,63],[98,5,89],[51,50,73],[41,22,14],[58,24,20]] }] }},
  { id: "packedbubble", name: "Packed Bubble", opts: { chart: { type: "packedbubble" }, title: { text: "Packed Bubble" }, series: [{ name: "Europe", data: [{ name: "Germany", value: 83 },{ name: "France", value: 67 }] },{ name: "Asia", data: [{ name: "China", value: 1412 },{ name: "India", value: 1408 }] }] }},
  { id: "boxplot", name: "Box Plot", opts: { chart: { type: "boxplot" }, title: { text: "Box Plot" }, xAxis: { categories: ["Exp 1","Exp 2","Exp 3"] }, series: [{ name: "Observations", data: [[760,801,848,895,965],[733,853,939,980,1080],[714,762,817,870,918]] }] }},
  { id: "funnel", name: "Funnel", opts: { chart: { type: "funnel" }, title: { text: "Sales Funnel" }, plotOptions: { series: { neckWidth: "30%", neckHeight: "25%", width: "80%" } }, series: [{ name: "Users", data: [["Visits",15654],["Downloads",4064],["Signups",1987],["Purchases",976]] }] }},
  { id: "pyramid", name: "Pyramid", opts: { chart: { type: "pyramid" }, title: { text: "Pyramid" }, series: [{ name: "Users", data: [["Base",5000],["Middle",3000],["Top",1000]] }] }},
  { id: "sankey", name: "Sankey", opts: { title: { text: "Sankey Diagram" }, series: [{ type: "sankey", keys: ["from","to","weight"], data: [["Brazil","Portugal",5],["Brazil","France",1],["Brazil","Spain",1],["Canada","Portugal",1],["Canada","France",5],["Mexico","Portugal",1]] }] }},
  { id: "depwheel", name: "Dependency Wheel", opts: { title: { text: "Dependency Wheel" }, series: [{ type: "dependencywheel", keys: ["from","to","weight"], data: [["A","B",5],["A","C",2],["B","C",3],["B","D",4],["C","D",1],["D","A",2]] }] }},
  { id: "networkgraph", name: "Network Graph", opts: { title: { text: "Network Graph" }, series: [{ type: "networkgraph", data: [["A","B"],["A","C"],["B","D"],["C","D"],["D","E"]] }] }},
  { id: "sunburst", name: "Sunburst", opts: { title: { text: "Sunburst" }, series: [{ type: "sunburst", data: [{ id: "0", parent: "", name: "Root" },{ id: "1", parent: "0", name: "A", value: 5 },{ id: "2", parent: "0", name: "B", value: 3 },{ id: "3", parent: "1", name: "A1", value: 2 },{ id: "4", parent: "1", name: "A2", value: 3 },{ id: "5", parent: "2", name: "B1", value: 3 }], allowDrillToNode: true }] }},
  { id: "wordcloud", name: "Word Cloud", opts: { title: { text: "Word Cloud" }, series: [{ type: "wordcloud", data: [{ name: "JavaScript", weight: 10 },{ name: "Python", weight: 8 },{ name: "TypeScript", weight: 7 },{ name: "Rust", weight: 5 },{ name: "Go", weight: 4 },{ name: "Java", weight: 6 },{ name: "C++", weight: 3 }] }] }},
  { id: "timeline", name: "Timeline", opts: { chart: { type: "timeline" }, title: { text: "Timeline" }, xAxis: { visible: false }, yAxis: { visible: false }, series: [{ data: [{ name: "Founded", label: "2010" },{ name: "IPO", label: "2015" },{ name: "Acquisition", label: "2020" }] }] }},
  { id: "variablepie", name: "Variable Pie", opts: { chart: { type: "variablepie" }, title: { text: "Variable Pie" }, series: [{ minPointSize: 10, innerSize: "20%", zMin: 0, data: [{ name: "Spain", y: 505, z: 92 },{ name: "France", y: 551, z: 119 },{ name: "Poland", y: 312, z: 121 }] }] }},
  { id: "variwide", name: "Variwide", opts: { chart: { type: "variwide" }, title: { text: "Variwide" }, xAxis: { type: "category" }, series: [{ name: "GDP", data: [["US",59800,327],["China",8827,1390],["Japan",38440,126],["Germany",44470,82]] }] }},
  { id: "xrange", name: "X-Range", opts: { chart: { type: "xrange" }, title: { text: "X-Range" }, xAxis: { type: "datetime" }, yAxis: { categories: ["Dev","Test","Deploy"], title: { text: "" } }, series: [{ name: "Tasks", data: [{ x: Date.UTC(2026,0,1), x2: Date.UTC(2026,0,15), y: 0 },{ x: Date.UTC(2026,0,10), x2: Date.UTC(2026,0,25), y: 1 },{ x: Date.UTC(2026,0,20), x2: Date.UTC(2026,1,1), y: 2 }] }] }},
  { id: "columnrange", name: "Column Range", opts: { chart: { type: "columnrange", inverted: true }, title: { text: "Temperature Range" }, xAxis: { categories: ["Jan","Feb","Mar","Apr","May"] }, yAxis: { title: { text: "°C" } }, series: [{ name: "Temp", data: [[-9,9],[-8,11],[-5,16],[0,22],[3,25]] }] }},
  { id: "arearange", name: "Area Range", opts: { chart: { type: "arearange" }, title: { text: "Area Range" }, xAxis: { type: "datetime" }, series: [{ name: "Temp", data: Array.from({length:7},(_, i)=>[Date.UTC(2026,0,i+1),-5+i,5+i]) }] }},
  { id: "dumbbell", name: "Dumbbell", opts: { chart: { type: "dumbbell", inverted: true }, title: { text: "Dumbbell" }, xAxis: { type: "category" }, yAxis: { title: { text: "Value" } }, series: [{ name: "Range", data: [{ name: "A", low: 10, high: 40 },{ name: "B", low: 20, high: 55 },{ name: "C", low: 5, high: 30 }] }] }},
  { id: "bullet", name: "Bullet", opts: { chart: { type: "bullet", inverted: true }, title: { text: "Revenue 2026" }, xAxis: { categories: ["Revenue"] }, yAxis: { plotBands: [{ from: 0, to: 150, color: "#666" },{ from: 150, to: 225, color: "#999" },{ from: 225, to: 9e9, color: "#bbb" }], title: null }, series: [{ data: [{ y: 275, target: 250 }] }] }},
  { id: "organization", name: "Organization", opts: { title: { text: "Org Chart" }, series: [{ type: "organization", keys: ["from","to"], data: [["CEO","CTO"],["CEO","CFO"],["CTO","Dev Lead"],["CTO","QA Lead"]] }] }},
  { id: "venn", name: "Venn", opts: { title: { text: "Venn Diagram" }, series: [{ type: "venn", data: [{ sets: ["A"], value: 10 },{ sets: ["B"], value: 10 },{ sets: ["A","B"], value: 4 }] }] }},
  { id: "item", name: "Item (Parliament)", opts: { title: { text: "Parliament" }, series: [{ type: "item", name: "Seats", keys: ["name","y","color"], data: [["Party A",60,"#4caf50"],["Party B",45,"#2196f3"],["Party C",30,"#f44336"],["Party D",15,"#ff9800"]], center: ["50%","88%"], size: "170%", startAngle: -100, endAngle: 100 }] }},
  // ── NEW: 3D Column ──
  { id: "column3d", name: "3D Column", opts: { chart: { type: "column", options3d: { enabled: true, alpha: 15, beta: 15, depth: 50, viewDistance: 25 } }, title: { text: "3D Column Chart" }, plotOptions: { column: { depth: 40 } }, xAxis: { categories: ["Apples","Oranges","Pears","Grapes","Bananas"] }, series: [{ name: "Sales", data: [29,71,106,129,144] }] }},
  // ── NEW: Polar / Spider ──
  { id: "polar", name: "Polar / Spider", opts: { chart: { polar: true, type: "line" }, title: { text: "Spider Web Chart" }, pane: { size: "80%" }, xAxis: { categories: ["Speed","Strength","Defense","Magic","Stamina","Luck"], tickmarkPlacement: "on", lineWidth: 0 }, yAxis: { gridLineInterpolation: "polygon", lineWidth: 0, min: 0, max: 100 }, series: [{ name: "Warrior", data: [80,90,70,20,60,50], pointPlacement: "on" },{ name: "Mage", data: [30,20,40,95,50,70], pointPlacement: "on" }] }},
  // ── NEW: Drilldown ──
  {
    id: "drilldown", name: "Drilldown", render: (el) => {
      return Highcharts.chart(el, {
        chart: { type: "column" },
        title: { text: "Drilldown Chart" },
        xAxis: { type: "category" },
        series: [{ name: "Browsers", colorByPoint: true, data: [
          { name: "Chrome", y: 63, drilldown: "chrome" },
          { name: "Safari", y: 19, drilldown: "safari" },
          { name: "Firefox", y: 10, drilldown: "firefox" }
        ]}],
        drilldown: { series: [
          { id: "chrome", name: "Chrome", data: [["v120",20],["v119",18],["v118",15],["v117",10]] },
          { id: "safari", name: "Safari", data: [["v17",10],["v16",6],["v15",3]] },
          { id: "firefox", name: "Firefox", data: [["v121",4],["v120",3],["v119",3]] }
        ]}
      });
    }
  },
];

const stockTests = [
  { id: "stock-basic", name: "Stock Basic", render: (el) => Highcharts.stockChart(el, { title: { text: "AAPL Stock" }, rangeSelector: { selected: 1 }, series: [{ name: "AAPL", data: Array.from({length:100},(_,i)=>[Date.now()-(100-i)*864e5, 150+Math.random()*50]) }] }) },
  { id: "stock-ohlc", name: "Stock OHLC", render: (el) => Highcharts.stockChart(el, { title: { text: "OHLC" }, series: [{ type: "ohlc", name: "Price", data: Array.from({length:30},(_,i)=>{ const d=Date.now()-(30-i)*864e5, o=100+Math.random()*20, h=o+Math.random()*10, l=o-Math.random()*10, c=l+Math.random()*(h-l); return [d,+o.toFixed(2),+h.toFixed(2),+l.toFixed(2),+c.toFixed(2)]; }) }] }) },
  { id: "stock-candlestick", name: "Stock Candlestick", render: (el) => Highcharts.stockChart(el, { title: { text: "Candlestick" }, series: [{ type: "candlestick", name: "Price", data: Array.from({length:30},(_,i)=>{ const d=Date.now()-(30-i)*864e5, o=100+Math.random()*20, h=o+Math.random()*10, l=o-Math.random()*10, c=l+Math.random()*(h-l); return [d,+o.toFixed(2),+h.toFixed(2),+l.toFixed(2),+c.toFixed(2)]; }) }] }) },
  // ── NEW: Candlestick + Volume (two y-axes) ──
  {
    id: "stock-candlestick-volume", name: "Candlestick + Volume", render: (el) => {
      const ohlcv = Array.from({length:60},(_,i)=>{
        const d = Date.now()-(60-i)*864e5;
        const o = 150+Math.sin(i/5)*20+Math.random()*10;
        const h = o+Math.random()*8;
        const l = o-Math.random()*8;
        const c = l+Math.random()*(h-l);
        const v = Math.round(1e6+Math.random()*5e6);
        return { d, o: +o.toFixed(2), h: +h.toFixed(2), l: +l.toFixed(2), c: +c.toFixed(2), v };
      });
      return Highcharts.stockChart(el, {
        yAxis: [{ labels: { align: "right", x: -3 }, title: { text: "OHLC" }, height: "60%", lineWidth: 2, resize: { enabled: true } },
                { labels: { align: "right", x: -3 }, title: { text: "Volume" }, top: "65%", height: "35%", offset: 0, lineWidth: 2 }],
        title: { text: "Candlestick + Volume" },
        series: [
          { type: "candlestick", name: "Price", data: ohlcv.map(p=>[p.d,p.o,p.h,p.l,p.c]) },
          { type: "column", name: "Volume", data: ohlcv.map(p=>[p.d,p.v]), yAxis: 1 }
        ]
      });
    }
  },
  // ── NEW: Flags on stock chart ──
  {
    id: "stock-flags", name: "Flags on Stock", render: (el) => {
      const base = Date.now()-100*864e5;
      const prices = Array.from({length:100},(_,i)=>[base+i*864e5, 100+Math.sin(i/8)*15+Math.random()*5]);
      return Highcharts.stockChart(el, {
        title: { text: "Stock with Flags" },
        series: [
          { name: "Price", data: prices, id: "price" },
          { type: "flags", data: [
            { x: base+10*864e5, title: "E", text: "Earnings Report" },
            { x: base+30*864e5, title: "D", text: "Dividend Payout" },
            { x: base+55*864e5, title: "S", text: "Stock Split" },
            { x: base+80*864e5, title: "A", text: "Acquisition" }
          ], onSeries: "price", shape: "squarepin", width: 16 }
        ]
      });
    }
  },
];

const mapTests = [
  {
    id: "map-world", name: "World Map", render: async (el) => {
      const topology = await fetch("/node_modules/@highcharts/map-collection/custom/world.topo.json").then(r => r.json());
      return Highcharts.mapChart(el, {
        chart: { map: topology }, title: { text: "World Population" },
        mapNavigation: { enabled: true, buttonOptions: { verticalAlign: "bottom" } },
        colorAxis: { min: 1, max: 1000, type: "logarithmic" },
        series: [{ type: "map", name: "Population", data: [["us",334],["cn",1412],["in",1408],["br",214],["ru",144],["jp",125],["de",84],["gb",67],["fr",65],["au",26]], joinBy: ["hc-key",0], states: { hover: { color: "#a4edba" } } }]
      });
    }
  },
  // ── NEW: US State Choropleth ──
  {
    id: "map-us-states", name: "US State Choropleth", render: async (el) => {
      const topology = await fetch("/node_modules/@highcharts/map-collection/countries/us/us-all.topo.json").then(r => r.json());
      const data = [
        ["us-ca",39538],["us-tx",29146],["us-fl",21538],["us-ny",20201],["us-pa",13002],
        ["us-il",12812],["us-oh",11799],["us-ga",10711],["us-nc",10439],["us-mi",10077],
        ["us-nj",9289],["us-va",8631],["us-wa",7614],["us-az",7278],["us-ma",7029],
        ["us-tn",6910],["us-in",6785],["us-md",6177],["us-mo",6154],["us-wi",5893],
        ["us-co",5773],["us-mn",5706],["us-sc",5118],["us-al",5024],["us-la",4657],
        ["us-ky",4505],["us-or",4237],["us-ok",3959],["us-ct",3605],["us-ut",3271],
        ["us-ia",3190],["us-nv",3104],["us-ar",3011],["us-ms",2961],["us-ks",2937],
        ["us-nm",2117],["us-ne",1961],["us-id",1868],["us-wv",1793],["us-hi",1455],
        ["us-nh",1377],["us-me",1362],["us-mt",1084],["us-ri",1097],["us-de",989],
        ["us-sd",886],["us-nd",779],["us-ak",733],["us-vt",643],["us-wy",577]
      ];
      return Highcharts.mapChart(el, {
        chart: { map: topology },
        title: { text: "US Population by State (thousands)" },
        colorAxis: { min: 500, max: 40000, type: "logarithmic", minColor: "#e6f2ff", maxColor: "#003d80" },
        mapNavigation: { enabled: true },
        series: [{ type: "map", name: "Population (k)", data, joinBy: ["hc-key",0], states: { hover: { color: "#a4edba" } }, tooltip: { valueSuffix: "k" } }]
      });
    }
  },
];

const ganttTests = [
  { id: "gantt-basic", name: "Gantt Basic", render: (el) => Highcharts.ganttChart(el, { title: { text: "Project Timeline" }, series: [{ name: "Project", data: [{ name: "Design", start: Date.UTC(2026,0,1), end: Date.UTC(2026,1,1) },{ name: "Develop", start: Date.UTC(2026,1,1), end: Date.UTC(2026,3,1) },{ name: "Test", start: Date.UTC(2026,3,1), end: Date.UTC(2026,4,1) }] }] }) },
  // ── NEW: Gantt with progress indicators ──
  {
    id: "gantt-progress", name: "Gantt with Progress", render: (el) => {
      return Highcharts.ganttChart(el, {
        title: { text: "Sprint Progress" },
        xAxis: { currentDateIndicator: true },
        series: [{
          name: "Sprint 1",
          data: [
            { name: "Research", start: Date.UTC(2026,0,1), end: Date.UTC(2026,0,15), completed: { amount: 1.0 }, color: "#4caf50" },
            { name: "Design", start: Date.UTC(2026,0,10), end: Date.UTC(2026,1,1), completed: { amount: 0.85 }, color: "#2196f3" },
            { name: "Frontend", start: Date.UTC(2026,0,20), end: Date.UTC(2026,1,15), completed: { amount: 0.6 }, color: "#ff9800" },
            { name: "Backend", start: Date.UTC(2026,1,1), end: Date.UTC(2026,1,20), completed: { amount: 0.35 }, color: "#9c27b0" },
            { name: "Testing", start: Date.UTC(2026,1,10), end: Date.UTC(2026,2,1), completed: { amount: 0.1 }, color: "#f44336" },
            { name: "Deploy", start: Date.UTC(2026,1,25), end: Date.UTC(2026,2,5), completed: { amount: 0 }, color: "#607d8b" }
          ]
        }]
      });
    }
  },
];

const gridTests = [
  { id: "grid-basic", name: "Grid Lite", render: (el) => GridLite.grid(el, { columns: [{ id: "name", header: { text: "Name" } },{ id: "age", header: { text: "Age" } },{ id: "city", header: { text: "City" } }], dataTable: { columns: { name: ["Alice","Bob","Charlie","Diana","Eve"], age: [28,34,45,31,27], city: ["NYC","London","Tokyo","Berlin","Sydney"] } } }) },
];

const dashboardTests = [
  {
    id: "dash-kpi", name: "Dashboard KPI + Charts", containerClass: "dashboard-container",
    render: (el) => Dashboards.board(el, {
      gui: { enabled: true, layouts: [{ rows: [{ cells: [{ id: "kpi-1" },{ id: "kpi-2" },{ id: "kpi-3" }] },{ cells: [{ id: "chart-1" },{ id: "chart-2" }] }] }] },
      components: [
        { renderTo: "kpi-1", type: "KPI", title: "Revenue", value: "$1.42M", subtitle: "+12.5%" },
        { renderTo: "kpi-2", type: "KPI", title: "Users", value: "84,230", subtitle: "+8.3%" },
        { renderTo: "kpi-3", type: "KPI", title: "Orders", value: "12,847", subtitle: "+5.1%" },
        { renderTo: "chart-1", type: "Highcharts", chartOptions: { chart: { type: "areaspline" }, title: { text: "Monthly Revenue" }, xAxis: { categories: ["Jan","Feb","Mar","Apr","May","Jun"] }, series: [{ name: "2025", data: [980,1050,1120,1200,1350,1420] },{ name: "2024", data: [850,900,940,1010,1100,1180] }] } },
        { renderTo: "chart-2", type: "Highcharts", chartOptions: { chart: { type: "pie" }, title: { text: "Sales by Category" }, series: [{ name: "Sales", data: [{ name: "Electronics", y: 45 },{ name: "Clothing", y: 25 },{ name: "Food", y: 20 },{ name: "Other", y: 10 }] }] } }
      ]
    }, true)
  },
  // ── NEW: Dashboard with dataPool connector ──
  {
    id: "dash-datapool", name: "Dashboard DataPool", containerClass: "dashboard-container",
    render: (el) => {
      return Dashboards.board(el, {
        dataPool: {
          connectors: [{
            id: "sales-data",
            type: "JSON",
            data: [
              ["month", "revenue", "cost"],
              ["Jan", 4200, 3100],
              ["Feb", 5100, 3400],
              ["Mar", 6200, 3900],
              ["Apr", 5800, 3700],
              ["May", 7100, 4200],
              ["Jun", 8300, 4800]
            ],
            firstRowAsNames: true
          }]
        },
        gui: { enabled: true, layouts: [{ rows: [{ cells: [{ id: "dp-chart" },{ id: "dp-grid" }] }] }] },
        components: [
          { renderTo: "dp-chart", type: "Highcharts", connector: { id: "sales-data" }, chartOptions: { chart: { type: "column" }, title: { text: "Revenue vs Cost" }, xAxis: { type: "category" } }, sync: { visibility: true, highlight: true } },
          { renderTo: "dp-grid", type: "Grid", connector: { id: "sales-data" }, sync: { visibility: true, highlight: true } }
        ]
      }, true);
    }
  },
  // ── NEW: Dashboard with nested layouts ──
  {
    id: "dash-nested", name: "Dashboard Nested Layouts", containerClass: "dashboard-container",
    render: (el) => {
      return Dashboards.board(el, {
        gui: { enabled: true, layouts: [{
          rows: [{
            cells: [{
              id: "nest-left",
              layout: {
                rows: [
                  { cells: [{ id: "nest-kpi-1" }, { id: "nest-kpi-2" }] },
                  { cells: [{ id: "nest-chart-bottom" }] }
                ]
              }
            }, {
              id: "nest-right"
            }]
          }]
        }] },
        components: [
          { renderTo: "nest-kpi-1", type: "KPI", title: "Active Users", value: "12,345" },
          { renderTo: "nest-kpi-2", type: "KPI", title: "Conversion", value: "3.2%" },
          { renderTo: "nest-chart-bottom", type: "Highcharts", chartOptions: { chart: { type: "spline" }, title: { text: "Daily Trend" }, series: [{ name: "Users", data: [120,132,145,155,170,162,180] }] } },
          { renderTo: "nest-right", type: "Highcharts", chartOptions: { chart: { type: "bar" }, title: { text: "Top Pages" }, xAxis: { categories: ["Home","Products","About","Blog","Contact"] }, series: [{ name: "Views", data: [1500,1200,800,600,400] }] } }
        ]
      }, true);
    }
  },
];

// ── Test runner ──────────────────────────────────────────────────

const categories = { chart: chartTests, stock: stockTests, map: mapTests, gantt: ganttTests, grid: gridTests, dashboard: dashboardTests };

function getAllTests() {
  const all = [];
  for (const [cat, tests] of Object.entries(categories)) {
    for (const t of tests) all.push({ ...t, category: cat });
  }
  return all;
}

window.runCategory = async (name) => {
  const results = document.getElementById("results");
  const logEl = document.getElementById("log");
  logEl.textContent = "";
  results.innerHTML = "";

  document.querySelectorAll("#controls button").forEach(b => b.classList.remove("active"));
  if (event && event.target) event.target.classList.add("active");

  const tests = name === "all" ? getAllTests() : (categories[name] || []).map(t => ({ ...t, category: name }));
  let pass = 0, fail = 0;

  for (const test of tests) {
    const uid = `test-${test.id}`;
    const wrapper = document.createElement("div");
    wrapper.className = "test";
    const isDash = test.containerClass === "dashboard-container";
    wrapper.innerHTML = `<div class="test-header"><span>${test.name}</span><span class="status" id="status-${test.id}">⏳</span></div><div id="${uid}" class="${isDash ? 'dashboard-container' : 'test-container'}"></div>`;
    results.appendChild(wrapper);

    try {
      log(`⏳ ${test.name}...`);
      if (test.render) {
        await test.render(document.getElementById(uid));
      } else if (test.opts) {
        const chartType = test.opts.chart?.type;
        if (test.category === "stock") {
          Highcharts.stockChart(document.getElementById(uid), test.opts);
        } else if (test.category === "gantt") {
          Highcharts.ganttChart(document.getElementById(uid), test.opts);
        } else if (test.category === "map") {
          Highcharts.mapChart(document.getElementById(uid), test.opts);
        } else {
          Highcharts.chart(document.getElementById(uid), test.opts);
        }
      }
      log(`✅ ${test.name}`);
      document.getElementById(`status-${test.id}`).textContent = "✅ PASS";
      document.getElementById(`status-${test.id}`).className = "status pass";
      pass++;
    } catch (e) {
      log(`❌ ${test.name}: ${e.message}`);
      document.getElementById(`status-${test.id}`).textContent = "❌ FAIL";
      document.getElementById(`status-${test.id}`).className = "status fail";
      fail++;
      console.error(e);
    }
  }

  const summary = document.getElementById("summary");
  summary.innerHTML = `<span class="pass">${pass} passed</span> · <span class="fail">${fail} failed</span> · ${pass + fail} total`;
  // Expose for Playwright
  window.__testResults = { pass, fail, total: pass + fail };
};

window.toggleTheme = () => document.body.classList.toggle("light");

// Auto-run all
runCategory("all");
