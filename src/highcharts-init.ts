/**
 * This module MUST be imported before @highcharts/dashboards.
 * It exposes Highcharts on window so the Dashboards CJS bundle auto-connects.
 */
import Highcharts from "highcharts";
(window as any).Highcharts = Highcharts;
export default Highcharts;
