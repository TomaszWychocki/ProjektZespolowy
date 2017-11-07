angular.module('beerApp', []).controller('beerController', function($http, $scope) {
    var temp1Gauge = document.gauges.get('temp1');
    var temp2Gauge = document.gauges.get('temp2');
    var targetTempGauge = document.gauges.get('targetTemp');

	$scope.socket = io.connect();
	$scope.run = false;
	$scope.recipePosition = 0;
	
	$http.get('recipes.json').then(function (data){
		$scope.recipes = data;
	},function (error){ console.log(error)});
	
	$scope.socket.on('message', function (data) {
		//console.log(data);
		if(data.type == "TEMP1")
            temp1Gauge.value = parseFloat(data.value.substring(6, data.value.indexOf('}')));
		else if(data.type == "TEMP2")
            temp2Gauge.value = parseFloat(data.value.substring(6, data.value.indexOf('}')));
		else if(data.type == "HEAT")
			$scope.heat = data.value;	
		else if(data.type == "TIME")
			$scope.time = data.value;
		else if(data.type == "ACTION")
			$scope.action = data.value;
		$scope.$apply();
	});
	
	$scope.socket.on('state', function (data) {
		$scope.run = data.run;
        $scope.selectedBeer = data.selectedBeer;
        $scope.recipePosition = data.recipePosition;
        $scope.isNextButtonClickable = true;

        if($scope.run) {
            $scope.recipeText = getRecipeText($scope.selectedBeer.recipe[$scope.recipePosition]);
        }
        else {
            document.gauges.forEach(function (gauge) {
                gauge.value = 0;
            });
		}

        $scope.$apply();
	});
	
	$scope.start = function() {
		if(!$scope.run) {
			$scope.run = true;
			$scope.recipePosition = 0;
			$scope.recipeText = getRecipeText($scope.selectedBeer.recipe[$scope.recipePosition]);
			$scope.socket.emit('selectedBeer', { value: $scope.selectedBeer });
            $scope.socket.emit('recipePosition', { value: $scope.recipePosition });
		}
		else {
            $scope.run = false;
            document.gauges.forEach(function (gauge) {
                gauge.value = 0;
            });
        }
		$scope.socket.emit('start', { value: $scope.run });
	};
	
	$scope.send = function() {
		$scope.socket.emit('send', { value: $scope.command });
	};
	
	$scope.next = function() {
		$scope.recipePosition++;
		
		if($scope.selectedBeer.recipe[$scope.recipePosition] == null) {
			$scope.run = false;
			$scope.socket.emit('start', { value: $scope.run });
			alert("Koniec warzenia");
			return;
		}
		
		$scope.recipeText = $scope.selectedBeer.recipe[$scope.recipePosition];
		$scope.socket.emit('recipePosition', { value: $scope.recipePosition });
	};

	function getRecipeText(txt) {
		if(txt.includes("[setTEMP]")) {
            $scope.targetTemp = parseFloat(txt.substring(10, txt.indexOf('}')));
            targetTempGauge.value = $scope.targetTemp;
            $scope.isNextButtonClickable = false;
            if($scope.targetTemp > 5.0)
				return "Podgrzewanie do temperatury " + txt.substring(10, txt.indexOf('}')) + "°C...";
            else
            	return "Podgrzewanie wyłączone";
		}
        else if(txt.includes("[setTIME]")) {
            $scope.isNextButtonClickable = false;
            return "Utrzymywanie temperatury przez " + parseInt(txt.substring(10, txt.indexOf('}')))/60 + " minut...";
        }
		else {
            $scope.isNextButtonClickable = true;
            return txt;
        }
	}
});