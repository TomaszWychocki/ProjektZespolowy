angular.module('beerApp', [])
    .controller('beerController', function($log, $scope, apiService) {
        $scope.run = false;

        $scope.getData = function(cmd) {
            if(!$scope.run) {
                $scope.run = true;
                setInterval(function () {
                        var promise = apiService.getJson('[TEMP1]');
                        promise.then(
                            function (response) {
                                $scope.resp = response.data;
                            },
                            function (errorResponse) {
                                $log.error('ERROR: ', errorResponse);
                            })
                    }
                    , 1000);
            }
        };
    })
    .factory('apiService', function($http) {
        return {
            getJson: function(cmd) {
                return $http.get('/api.php?cmd=' + cmd);
            }
        }
    });