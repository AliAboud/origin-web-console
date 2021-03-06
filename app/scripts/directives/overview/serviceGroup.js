'use strict';

angular.module('openshiftConsole')
  .directive('overviewServiceGroup', function($filter,
                                              $uibModal,
                                              RoutesService,
                                              ServicesService) {
    return {
      restrict: 'E',
      // Inherit scope from OverviewController. This directive is only used for the overview.
      // We want to do all of the grouping of resources once in the overview controller watch callbacks.
      scope: true,
      templateUrl: 'views/overview/_service-group.html',
      link: function($scope) {
        // Collapse infrastructure services like Jenkins by default on page load.
        if (ServicesService.isInfrastructure($scope.service)) {
          $scope.collapse = true;
        }

        $scope.toggleCollapse = function(e) {
          // Don't collapse when clicking on the route link.
          if (e && e.target && e.target.tagName ==='A') {
            return;
          }

          $scope.collapse = !$scope.collapse;
        };

        $scope.linkService = function() {
          var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'views/modals/link-service.html',
            controller: 'LinkServiceModalController',
            scope: $scope
          });
          modalInstance.result.then(function(child) {
            ServicesService.linkService($scope.service, child).then(
              // success
              _.noop,
              // failure
              function(result) {
                $scope.alerts = $scope.alerts || {};
                $scope.alerts["link-service"] =
                  {
                    type: "error",
                    message: "Could not link services.",
                    details: $filter('getErrorDetails')(result)
                  };
              });
          });
        };

        $scope.$watch('service.metadata.labels.app', function(appName) {
          $scope.appName = appName;
        });

        $scope.$watch(function() {
          var serviceName = _.get($scope, 'service.metadata.name');
          return _.get($scope, ['routesByService', serviceName]);
        }, function(routes) {
          var displayRoute;
          _.each(routes, function(candidate) {
            if (!displayRoute) {
              displayRoute = candidate;
              return;
            }

            // Is candidate better than the current display route?
            displayRoute = RoutesService.getPreferredDisplayRoute(displayRoute, candidate);
          });

          $scope.displayRoute = displayRoute;
        });

        $scope.$watchGroup(['service', 'childServicesByParent'], function() {
          if (!$scope.service) {
            return;
          }
          $scope.childServices = _.get($scope, ['childServicesByParent', $scope.service.metadata.name], []);
          $scope.groupedServices = [$scope.service].concat($scope.childServices);
        });
      }
    };
  });
