angular.module('beerApp', []).controller('beerController', function($http, $scope) {
	$scope.socket = io.connect();
	$scope.run = false;
	$scope.recipePosition = 0;
	
	$http.get('recipes.json').then(function (data){
		$scope.recipes = data;
	},function (error){ console.log(error)});
	
	$scope.socket.on('message', function (data) {
		//console.log(data);
		if(data.type == "TEMP1")
			$scope.temp1 = data.value;
		else if(data.type == "TEMP2")
			$scope.temp2 = data.value;
		else if(data.type == "HEAT")
			$scope.heat = data.value;	
		else if(data.type == "TIME")
			$scope.time = data.value;
		else if(data.type == "ACTION")
			$scope.action = data.value;
		else if(data.type == "END")
			$scope.end = data.value;
		$scope.$apply();
	});
	
	$scope.socket.on('state', function (data) {
		if(data.value)
			$scope.run = true;
		else
			$scope.run = false;
	});
	
	$scope.start = function() {
		if($scope.run == 0) {
			$scope.run = true;
			$scope.recipePosition = 0;
			$scope.recipeText = $scope.selectedBeer.recipe[$scope.recipePosition];
			if($scope.recipeText.includes("["))
				$scope.recipeText = "Komenda";
			$scope.socket.emit('selectedBeer', { value: $scope.selectedBeer.name });
		}
		else 
			$scope.run = false;
		$scope.socket.emit('start', { value: $scope.run });
	}
	
	$scope.send = function() {
		$scope.socket.emit('send', { value: $scope.command });
	}
	
	$scope.next = function() {
		$scope.recipePosition++;
		
		if($scope.selectedBeer.recipe[$scope.recipePosition] == null) {
			$scope.run = false;
			$scope.socket.emit('start', { value: $scope.run });
			alert("Koniec warzenia");
			return;
		}
		
		$scope.recipeText = $scope.selectedBeer.recipe[$scope.recipePosition];
		if($scope.recipeText.includes("["))
			$scope.recipeText = "Komenda";
		$scope.socket.emit('recipePosition', { value: $scope.recipePosition });
	}
});