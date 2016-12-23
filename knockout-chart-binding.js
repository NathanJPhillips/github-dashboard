function createChart(element, valueAccessor, allBindings, viewModel, bindingContext) {
  var chart = $(element)[0];
  function destroyChart() {
    if (chart.chart) {
      chart.chart.destroy();
      delete chart.chart;
    }
  }
  destroyChart();
  chart.chart = new Chart(chart, {
    type: ko.unwrap(allBindings.get('chartType')),
    data: ko.unwrap(allBindings.get('chartData')),
    options: ko.unwrap(allBindings.get('chartOptions')) || {}
  });
  ko.utils.domNodeDisposal.addDisposeCallback(element, destroyChart);
}

ko.bindingHandlers.chartType = {
  init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    if (!allBindings.has('chartData')) {
      throw Error('chartType must be used in conjunction with chartData and (optionally) chartOptions');
    }
  },
  update: createChart
};

ko.bindingHandlers.chartData = {
  init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    if (!allBindings.has('chartType')) {
      throw Error('chartData must be used in conjunction with chartType and (optionally) chartOptions');
    }
  },
  update: createChart
};

ko.bindingHandlers.chartOptions = {
  init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    if (!allBindings.has('chartData') || !allBindings.has('chartType')) {
      throw Error('chartOptions must be used in conjunction with chartType and chartData');
    }
  },
  update: createChart
};
