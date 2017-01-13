ko.extenders.numeric = function(target, precision) {
	var result = ko.dependentObservable({
		read: function() {
			return target().toFixed(precision);
		},
		write: target
	});
	result.raw = target;
	return result;
};

ko.extenders.dateUnits = function(target, units) {
	var result = ko.dependentObservable({
		read: function() {
			var result = target();
			switch (units) {
				case "years":
					return result / 365.25 / 24 / 60 / 60 / 1000;
				case "weeks":
					result /= 7;
				case "days":
					result /= 24;
				case "hours":
					result /= 60;
				case "minutes":
					result /= 60;
				case "seconds":
					result /= 1000;
			}
			return result;
		},
		write: target
	});
	result.raw = target;
	return result;
};
